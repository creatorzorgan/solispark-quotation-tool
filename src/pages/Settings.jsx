import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { SectionTitle, Field } from '../components/ui.jsx';
import { Save, RotateCcw, Building2, IndianRupee, Receipt, Timer } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
  <div className="card p-6 mb-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-md bg-gold-light/30 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gold-dark" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-navy-dark">{title}</h3>
    </div>
    {children}
  </div>
);

const Settings = () => {
  const { config, saveConfig, resetConfig, showToast } = useApp();
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(config)));

  const set = (path, value) => {
    setLocal((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    saveConfig(local);
    showToast('Settings saved');
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to factory defaults?')) {
      const fresh = resetConfig();
      setLocal(JSON.parse(JSON.stringify(fresh)));
      showToast('Settings reset to defaults');
    }
  };

  const p = local.pricing_defaults;
  const co = local.company;

  return (
    <div>
      <SectionTitle
        title="Settings"
        subtitle="Manage default pricing, company details, and tax rates."
        right={
          <div className="flex gap-2">
            <button className="btn-outline text-sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" /> Reset Defaults
            </button>
            <button className="btn-primary text-sm" onClick={handleSave}>
              <Save className="w-4 h-4" /> Save Settings
            </button>
          </div>
        }
      />

      <Section icon={Building2} title="Company Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name">
            <input className="input" value={co.name} onChange={(e) => set('company.name', e.target.value)} />
          </Field>
          <Field label="Tagline">
            <input className="input" value={co.tagline} onChange={(e) => set('company.tagline', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" value={co.email} onChange={(e) => set('company.email', e.target.value)} />
          </Field>
          <Field label="Website">
            <input className="input" value={co.website} onChange={(e) => set('company.website', e.target.value)} />
          </Field>
          <Field label="Phone 1">
            <input className="input" value={co.phone_1} onChange={(e) => set('company.phone_1', e.target.value)} />
          </Field>
          <Field label="Phone 2">
            <input className="input" value={co.phone_2} onChange={(e) => set('company.phone_2', e.target.value)} />
          </Field>
          <Field label="GSTIN">
            <input className="input" value={co.gstin} onChange={(e) => set('company.gstin', e.target.value)} />
          </Field>
          <Field label="Address Line 1">
            <input className="input" value={co.address.line_1} onChange={(e) => set('company.address.line_1', e.target.value)} />
          </Field>
          <Field label="Address Line 2">
            <input className="input" value={co.address.line_2} onChange={(e) => set('company.address.line_2', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section icon={IndianRupee} title="Panel Pricing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(p.panels).map(([key, panel]) => (
            <Field key={key} label={`${panel.brand} ${panel.wattage}W — Price per Panel`}>
              <input
                type="number"
                className="input"
                value={panel.price_per_panel}
                onChange={(e) => set(`pricing_defaults.panels.${key}.price_per_panel`, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section icon={IndianRupee} title="Inverter Pricing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(p.inverters).map(([key, inv]) => (
            <Field key={key} label={`${inv.brand} ${inv.capacity_kw}kW`}>
              <input
                type="number"
                className="input"
                value={inv.price}
                onChange={(e) => set(`pricing_defaults.inverters.${key}.price`, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section icon={IndianRupee} title="Other Costs (per kW)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Mounting Structure (₹/kW)">
            <input type="number" className="input" value={p.other_costs_per_kw.mounting_structure} onChange={(e) => set('pricing_defaults.other_costs_per_kw.mounting_structure', Number(e.target.value))} />
          </Field>
          <Field label="Electrical & Wiring (₹/kW)">
            <input type="number" className="input" value={p.other_costs_per_kw.electrical_wiring} onChange={(e) => set('pricing_defaults.other_costs_per_kw.electrical_wiring', Number(e.target.value))} />
          </Field>
          <Field label="Installation Labor (₹/kW)">
            <input type="number" className="input" value={p.other_costs_per_kw.installation_labor} onChange={(e) => set('pricing_defaults.other_costs_per_kw.installation_labor', Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section icon={IndianRupee} title="Flat Costs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Net Metering Fees">
            <input type="number" className="input" value={p.flat_costs.net_metering_fees} onChange={(e) => set('pricing_defaults.flat_costs.net_metering_fees', Number(e.target.value))} />
          </Field>
          <Field label="Transportation">
            <input type="number" className="input" value={p.flat_costs.transportation} onChange={(e) => set('pricing_defaults.flat_costs.transportation', Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section icon={Receipt} title="Tax & Subsidy">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="GST Rate (%)">
            <input type="number" step="0.1" className="input" value={p.tax.gst_rate_percent} onChange={(e) => set('pricing_defaults.tax.gst_rate_percent', Number(e.target.value))} />
          </Field>
          <Field label="Subsidy ≤ 3kW (total ₹)">
            <input type="number" className="input" value={p.government_subsidy.residential_up_to_3kw} onChange={(e) => set('pricing_defaults.government_subsidy.residential_up_to_3kw', Number(e.target.value))} />
          </Field>
          <Field label="Subsidy 3–10kW (₹/kW)">
            <input type="number" className="input" value={p.government_subsidy.residential_3kw_to_10kw_per_kw} onChange={(e) => set('pricing_defaults.government_subsidy.residential_3kw_to_10kw_per_kw', Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section icon={Timer} title="Payment Terms">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Advance (%)">
            <input type="number" className="input" value={local.payment_terms.advance_percent} onChange={(e) => set('payment_terms.advance_percent', Number(e.target.value))} />
          </Field>
          <Field label="Before Dispatch (%)">
            <input type="number" className="input" value={local.payment_terms.before_dispatch_percent} onChange={(e) => set('payment_terms.before_dispatch_percent', Number(e.target.value))} />
          </Field>
          <Field label="Post-Installation (%)">
            <input type="number" className="input" value={local.payment_terms.post_installation_percent} onChange={(e) => set('payment_terms.post_installation_percent', Number(e.target.value))} />
          </Field>
          <Field label="Proposal Validity (days)">
            <input type="number" className="input" value={local.payment_terms.proposal_validity_days} onChange={(e) => set('payment_terms.proposal_validity_days', Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end gap-3 mt-2">
        <button className="btn-outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" /> Reset to Defaults
        </button>
        <button className="btn-primary" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save All Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
