// Browser-local storage for uploaded equipment PDFs (IndexedDB).
// Paths use the equipment-blob:// prefix (see equipmentCatalog.js).

import { BLOB_PATH_PREFIX } from '../data/equipmentCatalog.js';

const DB_NAME = 'solispark_equipment_v1';
const STORE = 'blobs';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbPut(id, bytes) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(bytes, id);
  });
}

async function idbGet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

export function isBlobPath(path) {
  return typeof path === 'string' && path.startsWith(BLOB_PATH_PREFIX);
}

export function blobIdFromPath(path) {
  return path.slice(BLOB_PATH_PREFIX.length);
}

/** Save a File and return its catalog path (equipment-blob://…). */
export async function saveEquipmentBlob(file) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const bytes = await file.arrayBuffer();
  await idbPut(id, bytes);
  return `${BLOB_PATH_PREFIX}${id}`;
}

export async function getEquipmentBlobBytes(path) {
  if (!isBlobPath(path)) return null;
  return idbGet(blobIdFromPath(path));
}

export async function deleteEquipmentBlob(path) {
  if (!isBlobPath(path)) return;
  await idbDelete(blobIdFromPath(path));
}
