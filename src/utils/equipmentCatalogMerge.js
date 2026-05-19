import { EQUIPMENT_CATALOG, equipmentPath, BLOB_PATH_PREFIX } from '../data/equipmentCatalog.js';

export { BLOB_PATH_PREFIX };

const EMPTY = { hidden: [], custom: [] };

export function getEquipmentOverrides(config) {
  const raw = config?.equipment_catalog;
  if (!raw) return { ...EMPTY };
  return {
    hidden: Array.isArray(raw.hidden) ? raw.hidden : [],
    custom: Array.isArray(raw.custom) ? raw.custom : [],
  };
}

/** Resolve a stored path (relative file, blob URL, or absolute public URL). */
export function resolveCatalogPath(entryPath) {
  if (!entryPath) return '';
  if (entryPath.startsWith(BLOB_PATH_PREFIX) || /^https?:\/\//i.test(entryPath)) {
    return entryPath;
  }
  const rel = entryPath.replace(/^\//, '');
  if (rel.startsWith('SYSTEM EQUIPMENTS/')) {
    return encodeURI(`/${rel}`);
  }
  return equipmentPath(rel);
}

function normalizeCustomEntry(entry) {
  const path = resolveCatalogPath(entry.path);
  return {
    label: entry.label || 'Untitled',
    brand: entry.brand || '',
    path,
    category: entry.category || 'Panels',
    storageObjectPath:
      typeof entry.storageObjectPath === 'string' && entry.storageObjectPath.startsWith('datasheets/')
        ? entry.storageObjectPath
        : null,
  };
}

/** Merge shipped catalog with config overrides (custom entries + hidden built-ins). */
export function buildEquipmentCatalog(config) {
  const { hidden, custom } = getEquipmentOverrides(config);
  const hiddenSet = new Set(hidden);
  const catalog = {};

  Object.entries(EQUIPMENT_CATALOG).forEach(([cat, items]) => {
    const kept = items.filter((it) => !hiddenSet.has(it.path));
    if (kept.length) catalog[cat] = [...kept];
  });

  custom.forEach((raw) => {
    const entry = normalizeCustomEntry(raw);
    if (hiddenSet.has(entry.path)) return;
    if (!catalog[entry.category]) catalog[entry.category] = [];
    const exists = catalog[entry.category].some((it) => it.path === entry.path);
    if (!exists) {
      catalog[entry.category].push({
        label: entry.label,
        brand: entry.brand,
        path: entry.path,
        ...(entry.storageObjectPath ? { storageObjectPath: entry.storageObjectPath } : {}),
      });
    }
  });

  return catalog;
}

export function buildEquipmentIndex(catalog) {
  return Object.entries(catalog).reduce((acc, [category, items]) => {
    items.forEach((it) => {
      acc[it.path] = { ...it, category };
    });
    return acc;
  }, {});
}

export function isBlobPath(path) {
  return typeof path === 'string' && path.startsWith(BLOB_PATH_PREFIX);
}
