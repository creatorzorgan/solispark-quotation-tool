// localStorage wrapper for quotations + config.

import { DEFAULT_CONFIG } from '../data/defaultConfig.js';
import { SAMPLE_QUOTATIONS } from '../data/sampleData.js';

const K_QUOTATIONS = 'solispark_quotations_v1';
const K_CONFIG = 'solispark_config_v1';
const K_COUNTER = 'solispark_ref_counter_v1';
const K_SEEDED = 'solispark_seeded_v1';

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Config ----------------------------------------------------------------
export const getConfig = () => {
  const stored = readJSON(K_CONFIG, null);
  return stored || DEFAULT_CONFIG;
};
export const saveConfig = (config) => writeJSON(K_CONFIG, config);
export const resetConfig = () => {
  localStorage.removeItem(K_CONFIG);
  return DEFAULT_CONFIG;
};

// --- Quotations ------------------------------------------------------------
export const getAllQuotations = () => {
  seedIfEmpty();
  return readJSON(K_QUOTATIONS, []);
};
export const getQuotation = (id) => getAllQuotations().find((q) => q.id === id);
export const saveQuotation = (quotation) => {
  const all = readJSON(K_QUOTATIONS, []);
  const existing = all.findIndex((q) => q.id === quotation.id);
  const now = new Date().toISOString();
  const updated = { ...quotation, updatedAt: now };
  if (existing >= 0) {
    all[existing] = updated;
  } else {
    updated.createdAt = updated.createdAt || now;
    all.unshift(updated);
  }
  writeJSON(K_QUOTATIONS, all);
  return updated;
};
export const deleteQuotation = (id) => {
  const all = readJSON(K_QUOTATIONS, []).filter((q) => q.id !== id);
  writeJSON(K_QUOTATIONS, all);
};
export const duplicateQuotation = (id) => {
  const original = getQuotation(id);
  if (!original) return null;
  const copy = {
    ...original,
    id: newId(),
    referenceNumber: generateReferenceNumber(),
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: { ...original.client, fullName: original.client.fullName + ' (Copy)' },
  };
  return saveQuotation(copy);
};

// --- IDs & reference numbers ----------------------------------------------
export const newId = () =>
  'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

export const generateReferenceNumber = () => {
  const year = new Date().getFullYear();
  const counter = (readJSON(K_COUNTER, 1000) || 1000) + 1;
  writeJSON(K_COUNTER, counter);
  return `SP-${year}-${counter}`;
};

// --- Seed with sample data on first run -----------------------------------
const seedIfEmpty = () => {
  if (readJSON(K_SEEDED, false)) return;
  writeJSON(K_QUOTATIONS, SAMPLE_QUOTATIONS);
  writeJSON(K_SEEDED, true);
};

// --- Expiry sweep ---------------------------------------------------------
export const sweepExpired = (validityDays = 15) => {
  const all = readJSON(K_QUOTATIONS, []);
  const now = Date.now();
  let changed = false;
  const updated = all.map((q) => {
    if (q.status !== 'Sent' && q.status !== 'Draft') return q;
    const created = new Date(q.createdAt).getTime();
    const ageDays = (now - created) / (1000 * 60 * 60 * 24);
    if (ageDays > validityDays && q.status === 'Sent') {
      changed = true;
      return { ...q, status: 'Expired' };
    }
    return q;
  });
  if (changed) writeJSON(K_QUOTATIONS, updated);
  return updated;
};
