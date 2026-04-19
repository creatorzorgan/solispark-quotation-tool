import React from 'react';
import { Field } from '../../components/ui.jsx';
import { MOUNTING_OPTIONS, BATTERY_OPTIONS } from '../../data/defaultConfig.js';
import { panelCountFor, fitsOnRoof } from '../../utils/calculations.js';
import { formatKw, formatNumber } from '../../utils/format.js';
import { Zap, AlertTriangle, Sparkles } from 'lucide-react';

const BATTERY_COSTS = { None: 0, 'Deye 5.3kWh': 280000, 'PowerOne 5.3kWh': 260000, Custom: 0 };

const Step3System = ({ draft, updateSystem, updatePricing, config, suggestSystem }) => {
  const s = draft.system;
  const panels = config.pricing_defaults.panels;
  const inverters = config.pricing_defaults.inverters;
  const roofFits = fitsOnRoof(s.systemSizeKw, draft.energy.roofAreaSqft, config.calculation_constants.sqft_per_kw_rooftop);

  const setSystemSize = (val) => {
    const size = Number(val) || 0;
    updateSystem({
      systemSizeKw: size,
      panelCount: panelCountFor(size, s.panelWattage),
    });
  };

  const setPanelKey = (key) => {
    const p = panels[key];
    updateSystem({
      panelKey: key,
      panelWattage: p.wattage,
      panelCount: panelCountFor(s.systemSizeKw, p.wattage),
    });
    updatePricing({ pricePerPanel: p.price_per_panel });
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

        <Field label="Panel Brand">
          <select className="input" value={s.panelKey} onChange={(e) => setPanelKey(e.target.value)}>
            {Object.values(panels).map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} — {p.brand}
              </option>
            ))}
          </select>
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

      <div className="mt-6 p-5 bg-navy-dark text-white rounded-md flex items-center gap-4 flex-wrap">
        <Zap className="w-8 h-8 text-gold-primary" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs uppercase tracking-wide text-gold-light/80">
            System Summary
          </div>
          <div className="font-heading text-xl font-bold">
            {formatKw(s.systemSizeKw)} · {s.panelCount}× {panels[s.panelKey]?.brand} panels · {s.inverterCapacityKw} kW inverter
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3System;
