import React from 'react';
import { formatINR, formatKw } from '../../utils/format.js';
import { Download, FileText, Save, Send } from 'lucide-react';
import { generatePdf } from '../../utils/pdfGenerator.js';
import { generateDocx } from '../../utils/docxGenerator.js';
import EquipmentSelector from '../../components/EquipmentSelector.jsx';

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-cream-100 last:border-0 text-sm">
    <span className="text-cream-600">{label}</span>
    <span className="font-semibold text-navy-dark text-right">{value}</span>
  </div>
);

const Step6Preview = ({ draft, computed, config, setAttachedDocs, onFinalize }) => {
  if (!computed) {
    return (
      <div className="text-center text-cream-600 py-12">
        Please complete all previous steps.
      </div>
    );
  }
  const { costs, subsidy, totals, schedule, roi } = computed;
  const c = draft.client;
  const s = draft.system;
  const e = draft.energy;
  const panel = config.pricing_defaults.panels[s.panelKey];
  const inverter = config.pricing_defaults.inverters[s.inverterKey];

  const handleDownload = async () => {
    await generatePdf({ quotation: draft, computed, config });
  };

  const handleDownloadWord = async () => {
    await generateDocx({ quotation: draft, computed, config });
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">Preview & Generate</h2>
      <p className="text-cream-600 mb-8">
        Final check before you generate the branded PDF proposal.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-heading text-base font-semibold text-navy-dark mb-4">
            Client
          </h3>
          <Row label="Name" value={c.fullName || '—'} />
          <Row label="Phone" value={c.phone} />
          <Row label="Email" value={c.email || '—'} />
          <Row label="Category" value={c.category} />
          <Row label="Property" value={c.propertyType} />
          <Row label="Address" value={c.address || '—'} />
        </div>

        <div className="card p-6">
          <h3 className="font-heading text-base font-semibold text-navy-dark mb-4">Energy</h3>
          <Row label="Monthly Bill" value={formatINR(e.monthlyBill)} />
          <Row label="Provider" value={config.electricity_providers[e.provider]?.name} />
          <Row label="Per-Unit Rate" value={`₹${e.perUnitRate}/kWh`} />
          <Row label="Daily Consumption" value={`${e.dailyConsumptionKwh} kWh`} />
          <Row label="Roof Area" value={`${e.roofAreaSqft} sq.ft`} />
          <Row label="Roof Type" value={e.roofType} />
        </div>

        <div className="card p-6">
          <h3 className="font-heading text-base font-semibold text-navy-dark mb-4">System</h3>
          <Row label="Size" value={formatKw(s.systemSizeKw)} />
          <Row label="Panels" value={`${s.panelCount} × ${panel?.brand} ${panel?.wattage}W`} />
          <Row label="Inverter" value={`${s.inverterCapacityKw} kW`} />
          <Row label="Mounting" value={s.mounting} />
          <Row label="Battery" value={s.batteryOption} />
          <Row label="Net Metering" value={s.netMetering ? 'Included' : 'Excluded'} />
        </div>

        <div className="card p-6 bg-navy-dark text-white">
          <h3 className="font-heading text-base font-semibold text-gold-light mb-4">Investment</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="opacity-75">Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
            {subsidy > 0 && <div className="flex justify-between text-gold-light"><span>Govt. Subsidy</span><span>−{formatINR(subsidy)}</span></div>}
            <div className="flex justify-between"><span className="opacity-75">GST</span><span>{formatINR(totals.gst)}</span></div>
            <div className="flex justify-between font-heading text-xl font-bold text-gold-primary pt-3 border-t border-white/10 mt-3">
              <span>Grand Total</span><span>{formatINR(totals.grandTotal)}</span>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10 text-xs space-y-1 opacity-90">
            <div className="flex justify-between"><span>Monthly Savings</span><span className="font-bold text-white">{formatINR(roi.monthlySavings)}</span></div>
            <div className="flex justify-between"><span>Payback</span><span className="font-bold text-white">{roi.paybackYears} years</span></div>
            <div className="flex justify-between"><span>25-yr ROI</span><span className="font-bold text-gold-light">{roi.roiPercent}%</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <EquipmentSelector
          draft={draft}
          setAttachedDocs={setAttachedDocs}
          panel={panel}
          inverter={inverter}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3 justify-end">
        <button className="btn-outline" onClick={handleDownload}>
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button className="btn-outline" onClick={handleDownloadWord}>
          <FileText className="w-4 h-4" /> Download Word
        </button>
        <button className="btn-secondary" onClick={() => onFinalize('Draft')}>
          <Save className="w-4 h-4" /> Save as Draft
        </button>
        <button className="btn-primary" onClick={() => onFinalize('Sent')}>
          <Send className="w-4 h-4" /> Generate & Mark Sent
        </button>
      </div>
    </div>
  );
};

export default Step6Preview;
