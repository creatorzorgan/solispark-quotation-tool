import React, { useMemo, useState } from 'react';
import { EQUIPMENT_CATALOG, EQUIPMENT_INDEX, suggestAttachments } from '../data/equipmentCatalog.js';
import { Paperclip, Sparkles, ChevronDown, ChevronRight, X } from 'lucide-react';

// Grouped, collapsible datasheet picker. Persists selection to draft.attachedDocs.
// `panel` / `inverter` are the resolved config entries (used by suggestAttachments
// for the auto-suggest button).
const EquipmentSelector = ({ draft, setAttachedDocs, panel, inverter }) => {
  const selected = draft.attachedDocs || [];
  const [openCats, setOpenCats] = useState(() => ({ Panels: true, Inverters: true, Battery: true }));
  const [filter, setFilter] = useState('');

  const toggle = (path) => {
    const next = selected.includes(path) ? selected.filter((p) => p !== path) : [...selected, path];
    setAttachedDocs(next);
  };

  const toggleCat = (cat) => setOpenCats((o) => ({ ...o, [cat]: !o[cat] }));

  const runSuggest = () => {
    const picks = suggestAttachments({
      panel,
      inverter,
      batteryOption: draft.system?.batteryOption,
      systemSizeKw: draft.system?.systemSizeKw,
    });
    // Merge with existing selection, don't clobber manual additions
    const merged = Array.from(new Set([...(draft.attachedDocs || []), ...picks]));
    setAttachedDocs(merged);
  };

  const clearAll = () => setAttachedDocs([]);

  // Apply filter across all categories
  const filteredCatalog = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return EQUIPMENT_CATALOG;
    const out = {};
    Object.entries(EQUIPMENT_CATALOG).forEach(([cat, items]) => {
      const hits = items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          (it.brand || '').toLowerCase().includes(q)
      );
      if (hits.length) out[cat] = hits;
    });
    return out;
  }, [filter]);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-heading text-base font-semibold text-navy-dark flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-gold-primary" /> Attach Datasheets
          </h3>
          <p className="text-xs text-cream-600 mt-1">
            Selected PDFs are merged into the final proposal after the quotation pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={runSuggest} className="btn-outline text-xs py-1.5 px-3">
            <Sparkles className="w-3.5 h-3.5 text-gold-primary" /> Auto-suggest
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-cream-600 hover:text-navy-dark"
            >
              Clear ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        className="input mb-4"
        placeholder="Search datasheets by brand or label..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-4 p-3 bg-gold-light/20 rounded-md">
          <div className="text-xs font-semibold text-gold-dark uppercase tracking-wide mb-2">
            {selected.length} attached
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.map((path) => {
              const meta = EQUIPMENT_INDEX[path];
              return (
                <span
                  key={path}
                  className="inline-flex items-center gap-1.5 bg-white text-navy-dark text-xs px-2.5 py-1 rounded border border-cream-100"
                >
                  {meta?.label || path}
                  <button
                    type="button"
                    onClick={() => toggle(path)}
                    className="text-cream-600 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorised lists */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {Object.entries(filteredCatalog).map(([cat, items]) => {
          const open = filter.trim() ? true : !!openCats[cat];
          const selectedInCat = items.filter((it) => selected.includes(it.path)).length;
          return (
            <div key={cat} className="border border-cream-100 rounded-md">
              <button
                type="button"
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-navy-dark hover:bg-cream-50"
              >
                <span className="flex items-center gap-2">
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {cat}
                </span>
                <span className="text-xs text-cream-600">
                  {selectedInCat > 0 ? `${selectedInCat}/` : ''}{items.length}
                </span>
              </button>
              {open && (
                <div className="border-t border-cream-100 divide-y divide-cream-50">
                  {items.map((it) => {
                    const isSelected = selected.includes(it.path);
                    return (
                      <label
                        key={it.path}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-cream-50 ${
                          isSelected ? 'bg-gold-light/10' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-gold-primary"
                          checked={isSelected}
                          onChange={() => toggle(it.path)}
                        />
                        <span className="flex-1 text-navy-dark">{it.label}</span>
                        {it.brand && (
                          <span className="text-xs text-cream-600">{it.brand}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(filteredCatalog).length === 0 && (
          <div className="text-center text-sm text-cream-600 py-6">No datasheets match "{filter}".</div>
        )}
      </div>
    </div>
  );
};

export default EquipmentSelector;
