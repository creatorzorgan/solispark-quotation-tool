/**
 * Vercel Serverless: delete one object from the equipment bucket (service role).
 * Only paths under datasheets/ are allowed.
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.EQUIPMENT_STORAGE_BUCKET || 'equipment-datasheets';

function checkUploadKey(req) {
  const expected = process.env.EQUIPMENT_UPLOAD_API_KEY;
  if (!expected) return true;
  const got = req.headers['x-equipment-upload-key'];
  return typeof got === 'string' && got === expected;
}

function isAllowedPath(p) {
  if (typeof p !== 'string' || !p) return false;
  if (p.includes('..') || p.startsWith('/')) return false;
  return p.startsWith('datasheets/');
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
    res.status(503).json({ error: 'Server missing Supabase server env' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const objectPath = body.objectPath || body.path;
  if (!isAllowedPath(objectPath)) {
    res.status(400).json({ error: 'Invalid objectPath' });
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[equipment-storage-delete]', error);
    res.status(500).json({ error: error.message || 'remove failed' });
    return;
  }

  res.status(200).json({ ok: true });
}
