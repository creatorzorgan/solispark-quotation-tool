import React, { useEffect } from 'react';
import { Combobox, Field } from '../../components/ui.jsx';
import { ROOF_TYPES, SHADING_OPTIONS } from '../../data/defaultConfig.js';
import { estimateDailyConsumptionKwh } from '../../utils/calculations.js';
import { formatINR } from '../../utils/format.js';

const Step2Energy = ({ draft, updateEnergy, config }) => {
  const e = draft.energy;
  const providers = config.electricity_providers;

  // Current display name in the combobox — custom typing wins.
  const providerDisplay = e.customProviderName || providers[e.provider]?.name || '';

  const handleProviderChange = (typed) => {
    // If the typed string matches a preset name exactly, snap to that preset
    // (clears any custom name and pulls in the default rate).
    const matched = Object.values(providers).find((p) => p.name === typed);
    if (matched) {
      updateEnergy({
        provider: matched.key,
        customProviderName: null,
        perUnitRate: matched.rate,
      });
    } else {
      // Custom DISCOM name. Keep rate as-is (the user can edit it separately).
      updateEnergy({
        provider: 'other',
        customProviderName: typed,
      });
    }
  };

  // Keep daily kWh in sync when bill or rate changes (user can still edit it)
  useEffect(() => {
    updateEnergy({
      dailyConsumptionKwh: estimateDailyConsumptionKwh(e.monthlyBill, e.perUnitRate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.monthlyBill, e.perUnitRate]);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">Energy Assessment</h2>
      <p className="text-cream-600 mb-8">
        Understand how much power the client uses today so we size the system correctly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={`Current Monthly Electricity Bill — ${formatINR(e.monthlyBill)}`} className="md:col-span-2">
          <input
            type="range"
            min="1000"
            max="500000"
            step="500"
            value={e.monthlyBill}
            onChange={(ev) => updateEnergy({ monthlyBill: Number(ev.target.value) })}
          />
          <div className="flex items-center gap-3 mt-3">
            <input
              type="number"
              className="input max-w-xs"
              value={e.monthlyBill}
              onChange={(ev) => updateEnergy({ monthlyBill: Number(ev.target.value) })}
            />
            <span className="text-xs text-cream-600">₹1,000 – ₹5,00,000</span>
          </div>
        </Field>

        <Field label="Average Daily Power Consumption (kWh)" hint="Auto-calculated, editable.">
          <input
            type="number"
            className="input"
            value={e.dailyConsumptionKwh}
            onChange={(ev) => updateEnergy({ dailyConsumptionKwh: Number(ev.target.value) })}
          />
        </Field>

        <Field label="Electricity Provider / DISCOM" hint="Choose a preset or type a custom name (e.g. TNEB, APSPDCL).">
          <Combobox
            id="discom-combobox"
            value={providerDisplay}
            onChange={handleProviderChange}
            options={Object.values(providers).map((p) => ({ value: p.name }))}
            placeholder="Type or pick a DISCOM"
          />
        </Field>

        <Field label="Current Per-Unit Rate (₹)" hint="Auto-filled from provider, editable.">
          <input
            type="number"
            step="0.1"
            className="input"
            value={e.perUnitRate}
            onChange={(ev) => updateEnergy({ perUnitRate: Number(ev.target.value) })}
          />
        </Field>

        <Field label="Available Roof Area (sq.ft)">
          <input
            type="number"
            className="input"
            value={e.roofAreaSqft}
            onChange={(ev) => updateEnergy({ roofAreaSqft: Number(ev.target.value) })}
          />
        </Field>

        <Field label="Roof Type">
          <select
            className="input"
            value={e.roofType}
            onChange={(ev) => updateEnergy({ roofType: ev.target.value })}
          >
            {ROOF_TYPES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Shading Issues">
          <select
            className="input"
            value={e.shading}
            onChange={(ev) => updateEnergy({ shading: ev.target.value })}
          >
            {SHADING_OPTIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Number of Floors">
          <select
            className="input"
            value={e.floors}
            onChange={(ev) => updateEnergy({ floors: ev.target.value })}
          >
            {['1', '2', '3', '4+'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 p-4 bg-gold-light/20 border border-gold-primary/30 rounded-md">
        <p className="text-sm text-navy-dark">
          <strong>Annual electricity spend:</strong>{' '}
          {formatINR(e.monthlyBill * 12)} · <strong>Annual consumption:</strong>{' '}
          {Math.round(e.dailyConsumptionKwh * 365)} kWh
        </p>
      </div>
    </div>
  );
};

export default Step2Energy;
