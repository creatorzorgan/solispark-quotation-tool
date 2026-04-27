import React from 'react';
import { Combobox, Field } from '../../components/ui.jsx';
import {
  MOUNTING_OPTIONS,
  BATTERY_OPTIONS,
  DEFAULT_BOQ_ITEMS,
  BOQ_SECTION_OPTIONS,
  BOQ_UOM_OPTIONS,
  BOQ_MAKE_OPTIONS,
} from '../../data/defaultConfig.js';
import { panelCountFor, fitsOnRoof } from '../../utils/calculations.js';
import { formatKw, formatNumber } from '../../utils/format.js';
import { Zap, AlertTriangle, Sparkles, Plus, Trash2, RotateCcw } from 'lucide-react';

const BATTERY_COSTS = { None: 0, 'Deye 5.3kWh': 280000, 'PowerOne 5.3kWh': 260000, Custom: 0 };

// Label for each panel preset in the combobox dropdown. Matching back to a
// preset on change uses strict equality against this string.
const panelLabel = (p) => `${p.label} — ${p.brand}`;

const Step3System = ({ draft, updateSystem, updatePricing, config, suggestSystem }) => {
  const s = draft.system;
  const panels = config.pricing_defaults.panels;
  const inverters = config.pricing_defaults.inverters;
  const roofFits = fitsOnRoof(s.systemSizeKw, draft.energy.roofAreaSqft, config.calculation_constants.sqft_per_kw_rooftop);

  // Display value for the panel-brand combobox. Custom-typed names win; if a
  // preset is selected we render its canonical "Label — Brand" string.
  const panelDisplay =
    s.customPanelBrand != null && s.customPanelBrand !== ''
      ? s.customPanelBrand
      : panels[s.panelKey]
      ? panelLabel(panels[s.panelKey])
      : '';

  const setSystemSize = (val) => {
    const size = Number(val) || 0;
    updateSystem({
      systemSizeKw: size,
      panelCount: panelCountFor(size, s.panelWattage),
    });
  };

  const handlePanelChange = (typed) => {
    // Snap to preset if the typed string matches a preset "Label — Brand".
    const matched = Object.values(panels).find((p) => panelLabel(p) === typed);
    if (matched) {
      updateSystem({
        panelKey: matched.key,
        customPanelBrand: null,
        panelWattage: matched.wattage,
        panelCount: panelCountFor(s.systemSizeKw, matched.wattage),
      });
      updatePricing({ pricePerPanel: matched.price_per_panel });
    } else {
      // Custom brand typed — preserve the current wattage; user can edit it.
      updateSystem({
        panelKey: null,
        customPanelBrand: typed,
      });
    }
  };

  const setInverterKey = (key) => {
    const inv = inverters[key];
    // Scale multiple units if system size exceeds single inverter capacity
    const units = Math.max(1, Math.ceil(s.systemSizeKw / inv.capacity_kw));
    updateSystem({
      inverterKey: key,
      inverterCapacityKw: inv.capacity_kw * units,
    });
    updatePricing({ inverterPrice: inv.price * units });
  };

  const setBattery = (opt) => {
    updateSystem({ batteryOption: opt, batteryCost: BATTERY_COSTS[opt] || 0 });
  };

  // ── Bill of Quantities helpers ──────────────────────────────────────────
  // Older drafts loaded from storage may not have boqItems; fall back to the
  // factory defaults so the table is never empty for existing quotations.
  const boqItems = Array.isArray(s.boqItems) && s.boqItems.length > 0
    ? s.boqItems
    : DEFAULT_BOQ_ITEMS.map((it) => ({ ...it }));

  const setBoqItems = (next) => updateSystem({ boqItems: next });

  const updateBoqRow = (idx, patch) => {
    const next = boqItems.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    setBoqItems(next);
  };

  const addBoqRow = () => {
    setBoqItems([
      ...boqItems,
      { description: '', section: 'General', qty: '1', uom: 'L/s', make: 'Standard' },
    ]);
  };

  const removeBoqRow = (idx) => {
    setBoqItems(boqItems.filter((_, i) => i !== idx));
  };

  const resetBoq = () => {
    setBoqItems(DEFAULT_BOQ_ITEMS.map((it) => ({ ...it })));
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h2 className="font-heading text-2xl font-bold text-navy-dark">System Configuration</h2>
        <button onClick={suggestSystem} className="btn-outline text-sm">
          <Sparkles className="w-4 h-4 text-gold-primary" /> Re-suggest from Bill
        </button>
      </div>
      <p className="text-cream-600 mb-8">
        Auto-sized from Step 2. Override any field for custom designs.
      </p>

      {!roofFits && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            This system needs ~{formatNumber(s.systemSizeKw * 100)} sq.ft but only{' '}
            {formatNumber(draft.energy.roofAreaSqft)} sq.ft is available.
            Consider a smaller size or a ground-mount structure.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Recommended System Size (kW)" hint="Auto-sized; nudge up or down as needed.">
          <input
            type="number"
            step="0.5"
            className="input"
            value={s.systemSizeKw}
            onChange={(e) => setSystemSize(e.target.value)}
          />
        </Field>

        <Field label="Number of Panels" hint="Auto-calculated from system size ÷ panel wattage.">
          <input
            type="number"
            className="input"
            value={s.panelCount}
            onChange={(e) => updateSystem({ panelCount: Number(e.target.value) })}
          />
        </Field>

        <Field
          label="Panel Brand"
          hint={
            s.panelKey
              ? 'Preset selected — wattage & price auto-filled. Type anything else for a custom brand.'
              : 'Custom brand. Wattage/price below are kept as-is; edit if needed.'
          }
        >
          <Combobox
            id="panel-combobox"
            value={panelDisplay}
            onChange={handlePanelChange}
            options={Object.values(panels).map((p) => ({ value: panelLabel(p) }))}
            placeholder="Type or pick a panel (e.g. Panasonic 540W)"
          />
        </Field>

        <Field label="Panel Wattage (W)">
          <input
            type="number"
            className="input"
            value={s.panelWattage}
            onChange={(e) => updateSystem({ panelWattage: Number(e.target.value) })}
          />
        </Field>

        <Field label="Inverter Brand">
          <select
            className="input"
            value={s.inverterKey}
            onChange={(e) => setInverterKey(e.target.value)}
          >
            {Object.values(inverters).map((i) => (
              <option key={i.key} value={i.key}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Inverter Capacity (kW)">
          <input
            type="number"
            className="input"
            value={s.inverterCapacityKw}
            onChange={(e) => updateSystem({ inverterCapacityKw: Number(e.target.value) })}
          />
        </Field>

        <Field label="Mounting Structure">
          <select className="input" value={s.mounting} onChange={(e) => updateSystem({ mounting: e.target.value })}>
            {MOUNTING_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>

        <Field label="Battery Backup">
          <select className="input" value={s.batteryOption} onChange={(e) => setBattery(e.target.value)}>
            {BATTERY_OPTIONS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>

        <Field label="Net Metering" className="md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={s.netMetering}
              onChange={(e) => updateSystem({ netMetering: e.target.checked })}
              className="w-5 h-5 accent-gold-primary"
            />
            <span className="text-sm text-navy-dark font-medium">
              Include net metering (BESCOM application filed by Solispark)
            </span>
          </label>
        </Field>
      </div>

      {/* ─── SRTPV System BoQ & Scope of Work ───────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h3 className="font-heading text-xl font-bold text-navy-dark">
            SRTPV System BoQ &amp; Scope of Work
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetBoq}
              className="btn-ghost text-xs"
              title="Restore the standard 14-item BoQ"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
            <button
              type="button"
              onClick={addBoqRow}
              className="btn-outline text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
        </div>
        <p className="text-cream-600 text-sm mb-4">
          Editable equipment schedule that prints on the System Specifications page of the proposal. Pick from the dropdowns or type your own.
        </p>

        <div className="overflow-x-auto border border-cream-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-navy-dark text-white">
              <tr>
                <th className="px-2 py-2 text-left w-10">Sl.</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-left w-44">Section</th>
                <th className="px-2 py-2 text-left w-32">Qty</th>
                <th className="px-2 py-2 text-left w-24">UOM</th>
                <th className="px-2 py-2 text-left w-40">Make</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {boqItems.map((row, idx) => (
                <tr key={idx} className={idx % 2 ? 'bg-cream-50' : 'bg-white'}>
                  <td className="px-2 py-1 text-cream-600 font-bold">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className="input text-xs py-1.5"
                      value={row.description}
                      onChange={(e) => updateBoqRow(idx, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Combobox
                      id={`boq-section-${idx}`}
                      value={row.section}
                      onChange={(v) => updateBoqRow(idx, { section: v })}
                      options={BOQ_SECTION_OPTIONS}
                      className="input text-xs py-1.5"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className="input text-xs py-1.5"
                      value={row.qty}
                      onChange={(e) => updateBoqRow(idx, { qty: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Combobox
                      id={`boq-uom-${idx}`}
                      value={row.uom}
                      onChange={(v) => updateBoqRow(idx, { uom: v })}
                      options={BOQ_UOM_OPTIONS}
                      className="input text-xs py-1.5"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Combobox
                      id={`boq-make-${idx}`}
                      value={row.make}
                      onChange={(v) => updateBoqRow(idx, { make: v })}
                      options={BOQ_MAKE_OPTIONS}
                      className="input text-xs py-1.5"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeBoqRow(idx)}
                      className="text-rose-600 hover:text-rose-800"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-5 bg-navy-dark text-white rounded-md flex items-center gap-4 flex-wrap">
        <Zap className="w-8 h-8 text-gold-primary" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs uppercase tracking-wide text-gold-light/80">
            System Summary
          </div>
          <div className="font-heading text-xl font-bold">
            {formatKw(s.systemSizeKw)} · {s.panelCount}× {panels[s.panelKey]?.brand || s.customPanelBrand || 'Custom'} panels · {s.inverterCapacityKw} kW inverter
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3System;
