import React, { useState } from 'react';
import { getEquipmentOverrides, resolveCatalogPath } from '../utils/equipmentCatalogMerge.js';
import { saveEquipmentBlob, deleteEquipmentBlob } from '../utils/equipmentBlobStore.js';
import { Plus, Trash2, Settings2 } from 'lucide-react';

const CATEGORIES = [
  'Panels',
  'Inverters',
  'Battery',
  'Cable',
  'Solar Pump & Water',
  'BIS & Certificates',
  'Warranty',
];

const EquipmentCatalogManager = ({ config, saveConfig, showToast, equipmentIndex, onRemovedPath }) => {
  const [open, setOpen] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addBrand, setAddBrand] = useState('');
  const [addCategory, setAddCategory] = useState('Panels');
  const [addPath, setAddPath] = useState('');
  const [addFile, setAddFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const overrides = getEquipmentOverrides(config);

  const persist = (next) => saveConfig({ ...config, equipment_catalog: next });

  const handleAdd = async () => {
    if (!addLabel.trim()) {
      showToast?.('Enter a label for the datasheet', 'error');
      return;
    }
    setBusy(true);
    try {
      let path;
      if (addFile) {
        if (addFile.type !== 'application/pdf') {
          showToast?.('Please choose a PDF file', 'error');
          return;
        }
        path = await saveEquipmentBlob(addFile);
      } else if (addPath.trim()) {
        path = resolveCatalogPath(addPath.trim());
      } else {
        showToast?.('Upload a PDF or enter a path (e.g. panels/Tata 540 DCR.pdf)', 'error');
        return;
      }
      persist({
        ...overrides,
        custom: [
          ...overrides.custom,
          { label: addLabel.trim(), brand: addBrand.trim(), category: addCategory, path },
        ],
      });
      setAddLabel('');
      setAddBrand('');
      setAddPath('');
      setAddFile(null);
      showToast?.('Datasheet added to catalog');
    } catch (err) {
      console.error(err);
      showToast?.('Could not add datasheet', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async (path) => {
    if (path.startsWith('equipment-blob://')) await deleteEquipmentBlob(path);
    persist({
      ...overrides,
      custom: overrides.custom.filter((c) => resolveCatalogPath(c.path) !== path),
    });
    onRemovedPath?.(path);
    showToast?.('Custom datasheet removed');
  };

  const restoreBuiltIn = (path) => {
    persist({ ...overrides, hidden: overrides.hidden.filter((p) => p !== path) });
    showToast?.('Datasheet restored');
  };

  return (
    <div className="mb-4">
      <button type="button" className="btn-ghost text-xs py-1.5 px-2 mb-2" onClick={() => setOpen((o) => !o)}>
        <Settings2 className="w-3.5 h-3.5" /> {open ? 'Hide' : 'Manage'} datasheet catalog
      </button>
      {open && (
        <div className="p-4 bg-cream-50 border border-cream-200 rounded-md space-y-4">
          <p className="text-xs text-cream-600">
            Add PDFs by uploading (this browser only) or by path under{' '}
            <code className="text-[11px]">public/SYSTEM EQUIPMENTS/</code>. Path-based entries work for all users
            after deploy. Custom/hidden lists sync with Settings when Supabase is on.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              className="input text-sm"
              placeholder="Label"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
            />
            <input
              className="input text-sm"
              placeholder="Brand (optional)"
              value={addBrand}
              onChange={(e) => setAddBrand(e.target.value)}
            />
            <select className="input text-sm" value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="input text-sm"
              placeholder="Path e.g. panels/Tata 540 DCR.pdf"
              value={addPath}
              onChange={(e) => setAddPath(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="application/pdf" className="text-sm" onChange={(e) => setAddFile(e.target.files?.[0] || null)} />
            <button type="button" className="btn-outline text-xs" disabled={busy} onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5" /> Add to catalog
            </button>
          </div>
          {overrides.custom.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-navy-dark mb-2">Custom entries</p>
              <ul className="space-y-1">
                {overrides.custom.map((c) => {
                  const path = resolveCatalogPath(c.path);
                  return (
                    <li key={path} className="flex items-center justify-between text-sm gap-2">
                      <span>
                        {c.label} <span className="text-cream-600">({c.category})</span>
                      </span>
                      <button type="button" className="text-rose-600" onClick={() => removeCustom(path)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {overrides.hidden.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-navy-dark mb-2">Hidden built-in PDFs</p>
              <ul className="space-y-1">
                {overrides.hidden.map((path) => (
                  <li key={path} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-cream-600 truncate">{equipmentIndex[path]?.label || path}</span>
                    <button type="button" className="text-xs text-gold-dark hover:underline" onClick={() => restoreBuiltIn(path)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EquipmentCatalogManager;
