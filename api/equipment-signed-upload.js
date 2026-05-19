/**
 * Vercel Serverless: issue a Supabase Storage signed upload (service role).
 * Client completes upload with supabase.storage.from(bucket).uploadToSignedUrl(...)
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.EQUIPMENT_STORAGE_BUCKET || 'equipment-datasheets';

function checkUploadKey(req) {
  const expected = process.env.EQUIPMENT_UPLOAD_API_KEY;
  if (!expected) return true;
  const got = req.headers['x-equipment-upload-key'];
  return typeof got === 'string' && got === expected;
}

function safePdfName(name) {
  const base = (name || 'document.pdf').split(/[/\\]/).pop() || 'document.pdf';
  if (!/\.pdf$/i.test(base)) return null;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return cleaned || 'document.pdf';
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!checkUploadKey(req)) {
    res.status(401).json({ error: 'Invalid or missing upload key' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(503).json({ error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const safe = safePdfName(body.filename || body.name);
  if (!safe) {
    res.status(400).json({ error: 'filename must end with .pdf' });
    return;
  }

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const objectPath = `datasheets/${id}_${safe}`;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(objectPath, { upsert: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[equipment-signed-upload]', error);
    res.status(500).json({ error: error.message || 'createSignedUploadUrl failed' });
    return;
  }

  res.status(200).json({
    bucket: BUCKET,
    path: data.path,
    token: data.token,
  });
}
