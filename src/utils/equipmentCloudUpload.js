import { supabase } from '../lib/supabase.js';

const DEFAULT_BUCKET = import.meta.env.VITE_EQUIPMENT_STORAGE_BUCKET || 'equipment-datasheets';

/** Base URL for Vercel `/api/*` routes (same origin in prod; override in local dev). */
function equipmentApiBase() {
  const origin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
  if (origin) return origin;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

function uploadHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = import.meta.env.VITE_EQUIPMENT_UPLOAD_API_KEY;
  if (key) headers['x-equipment-upload-key'] = key;
  return headers;
}

async function postEquipmentApi(path, jsonBody) {
  const base = equipmentApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: uploadHeaders(),
    body: JSON.stringify(jsonBody),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

/** True when the SPA can talk to Supabase Storage for signed uploads. */
export function isSharedEquipmentUploadAvailable() {
  return Boolean(supabase && import.meta.env.VITE_SUPABASE_URL);
}

/**
 * Upload a PDF to Supabase Storage (shared for all users) via signed URL.
 * @returns {{ publicUrl: string, storageObjectPath: string }}
 */
export async function uploadEquipmentPdfShared(file) {
  if (!supabase) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  if (!file || file.type !== 'application/pdf') throw new Error('File must be a PDF.');

  const meta = await postEquipmentApi('/api/equipment-signed-upload', { filename: file.name });
  const bucket = meta.bucket || DEFAULT_BUCKET;

  const { data, error } = await supabase.storage.from(bucket).uploadToSignedUrl(meta.path, meta.token, file, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    publicUrl: pub.publicUrl,
    storageObjectPath: data.path,
  };
}

/**
 * Parse a Supabase public object URL; returns object path inside the bucket or null.
 */
export function extractSupabaseStorageObjectPath(publicUrl, bucketName = DEFAULT_BUCKET) {
  try {
    const u = new URL(publicUrl);
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = m[1];
    const objectPath = decodeURIComponent(m[2]);
    if (bucket !== bucketName) return null;
    if (!objectPath.startsWith('datasheets/')) return null;
    return objectPath;
  } catch {
    return null;
  }
}

/** Delete a shared-storage PDF (best-effort). Returns true if a delete API call was made. */
export async function deleteSharedEquipmentPdf(publicUrl, storageObjectPath) {
  const path =
    (typeof storageObjectPath === 'string' && storageObjectPath.startsWith('datasheets/')
      ? storageObjectPath
      : null) || extractSupabaseStorageObjectPath(publicUrl);
  if (!path) return false;
  await postEquipmentApi('/api/equipment-storage-delete', { objectPath: path });
  return true;
}
