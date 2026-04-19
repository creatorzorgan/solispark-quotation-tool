import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { StatusChip, SectionTitle } from '../components/ui.jsx';
import { formatINR, formatKw, formatDate, formatNumber, formatKwh } from '../utils/format.js';
import { calculateROI, calculateCosts, calculateSubsidy, calculateTotals, paymentSchedule, monthlyGenerationKwh } from '../utils/calculations.js';
import { generatePdf } from '../utils/pdfGenerator.js';
import { generateDocx } from '../utils/docxGenerator.js';
import EquipmentSelector from '../components/EquipmentSelector.jsx';
import {
  Download, FileText, Edit3, Copy, Trash2, Send, MessageCircle, ChevronLeft,
  Leaf, TrendingUp, Clock, IndianRupee,
} from 'lucide-react';

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-cream-100 last:border-0 text-sm">
    <span className="text-cream-600">{label}</span>
    <span className="font-semibold text-navy-dark text-right">{value}</span>
  </div>
);

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotations, deleteQuotation, duplicateQuotation, saveQuotation, showToast, config } = useApp();
  const q = quotations.find((x) => x.id === id);

  const computed = useMemo(() => {
    if (!q || !q.system?.systemSizeKw) return null;
    const costs = calculateCosts({
      systemSizeKw: q.system.systemSizeKw,
      panelCount: q.system.panelCount,
      pricePerPanel: q.pricing.pricePerPanel,
      inverterPrice: q.pricing.inverterPrice,
      mountingPerKw: q.pricing.mountingPerKw,
      electricalPerKw: q.pricing.electricalPerKw,
      netMeteringFlat: q.system.netMetering ? q.pricing.netMeteringFlat : 0,
      installationLaborPerKw: q.pricing.installationLaborPerKw,
      transportFlat: q.pricing.transportFlat,
      batteryCost: q.system.batteryCost,
    });
    const autoSubsidy = calculateSubsidy(q.system.systemSizeKw, q.client.category, config.pricing_defaults.government_subsidy);
    const subsidy = q.pricing?.subsidyOverride != null ? Math.max(0, q.pricing.subsidyOverride) : autoSubsidy;
    const totals = calculateTotals(costs, subsidy, config.pricing_defaults.tax.gst_rate_percent);
    const schedule = paymentSchedule(totals.grandTotal, config.payment_terms);
    const roi = calculateROI({
      systemSizeKw: q.system.systemSizeKw,
      perUnitRate: q.energy.perUnitRate,
      netCost: totals.grandTotal,
      paybackBasis: totals.afterSubsidy, // payback calc uses base price ex-GST
      years: 25,
      peakSunHours: config.calculation_constants.peak_sun_hours,
      annualEscalationPercent: config.calculation_constants.annual_tariff_escalation_percent,
      degradationPercent: config.calculation_constants.system_degradation_per_year_percent,
      co2PerKwh: config.calculation_constants.co2_offset_kg_per_kwh,
    });
    return { costs, subsidy, totals, schedule, roi };
  }, [q, config]);

  if (!q) {
    return (
      <div className="text-center py-20">
        <h2 className="font-heading text-2xl font-bold text-navy-dark mb-2">Quotation not found</h2>
        <Link to="/quotations" className="text-gold-dark font-semibold hover:underline">
          ← Back to All Quotations
        </Link>
      </div>
    );
  }

  const c = q.client;
  const s = q.system;
  const e = q.energy;
  const panel = config.pricing_defaults.panels[s.panelKey];

  const handleDownload = async () => {
    await generatePdf({ quotation: q, computed, config });
  };

  const handleDownloadWord = async () => {
    await generateDocx({ quotation: q, computed, config });
  };

  // Persist attachment selection back to the saved quotation so subsequent
  // downloads and edits remember the picks.
  const setAttachedDocs = (docs) => {
    saveQuotation({ ...q, attachedDocs: Array.isArray(docs) ? docs : [] });
  };

  const handleDuplicate = () => {
    const copy = duplicateQuotation(q.id);
    if (copy) {
      showToast('Quotation duplicated');
      navigate(`/quotations/${copy.id}/edit`);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this quotation permanently?')) {
      deleteQuotation(q.id);
      showToast('Deleted');
      navigate('/quotations');
    }
  };

  const handleStatusChange = (status) => {
    saveQuotation({ ...q, status });
    showToast(`Status updated to ${status}`);
  };

  const whatsappLink = () => {
    const phone = c.phone.replace(/[\s+\-]/g, '');
    const msg = encodeURIComponent(
      `Hi ${c.fullName},\n\nThank you for considering Solispark Energy for your solar installation!\n\nWe've prepared a detailed proposal for a ${s.systemSizeKw} kW system at your property. The total investment is ${formatINR(q.pricing?.grandTotal || 0)} with an estimated payback of ${computed?.roi?.paybackYears || '—'} years.\n\nPlease find the proposal PDF attached. Feel free to reach out with any questions!\n\nWarm regards,\nSolispark Energy\n${config.company.phone_1}`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  };

  return (
    <div>
      <button className="flex items-center gap-1 text-sm text-cream-600 hover:text-navy-dark mb-4" onClick={() => navigate('/quotations')}>
        <ChevronLeft className="w-4 h-4" /> All Quotations
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-3xl font-bold text-navy-dark">{c.fullName}</h1>
            <StatusChip status={q.status} />
          </div>
          <p className="text-cream-600 text-sm">
            {q.referenceNumber} · Created {formatDate(q.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline text-sm" onClick={handleDownload}><Download className="w-4 h-4" /> PDF</button>
          <button className="btn-outline text-sm" onClick={handleDownloadWord}><FileText className="w-4 h-4" /> Word</button>
          <button className="btn-outline text-sm" onClick={() => navigate(`/quotations/${q.id}/edit`)}><Edit3 className="w-4 h-4" /> Edit</button>
          <button className="btn-outline text-sm" onClick={handleDuplicate}><Copy className="w-4 h-4" /> Duplicate</button>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          {q.status === 'Draft' && (
            <button className="btn-primary text-sm" onClick={() => handleStatusChange('Sent')}>
              <Send className="w-4 h-4" /> Mark Sent
            </button>
          )}
          {q.status === 'Sent' && (
            <button className="btn-primary text-sm" onClick={() => handleStatusChange('Accepted')}>
              Accepted
            </button>
          )}
          <button className="btn-ghost text-sm text-rose-500 hover:bg-rose-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {computed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <div className="text-xs text-cream-600 uppercase tracking-wider mb-1">Grand Total</div>
            <div className="font-heading text-xl font-bold text-navy-dark">{formatINR(computed.totals.grandTotal)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-cream-600 uppercase tracking-wider mb-1">Monthly Savings</div>
            <div className="font-heading text-xl font-bold text-navy-dark">{formatINR(computed.roi.monthlySavings)}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-cream-600 uppercase tracking-wider mb-1">Payback</div>
            <div className="font-heading text-xl font-bold text-navy-dark">{computed.roi.paybackYears} yrs</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-cream-600 uppercase tracking-wider mb-1">CO₂ / Year</div>
            <div className="font-heading text-xl font-bold text-emerald-600">{formatNumber(computed.roi.co2PerYear)} kg</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-heading font-semibold text-navy-dark mb-4">Client Details</h3>
          <Row label="Name" value={c.fullName} />
          <Row label="Phone" value={c.phone} />
          <Row label="Email" value={c.email || '—'} />
          <Row label="Category" value={c.category} />
          <Row label="Property" value={c.propertyType} />
          <Row label="Address" value={c.address} />
        </div>

        <div className="card p-6">
          <h3 className="font-heading font-semibold text-navy-dark mb-4">Energy Assessment</h3>
          <Row label="Monthly Bill" value={formatINR(e.monthlyBill)} />
          <Row label="Provider" value={config.electricity_providers[e.provider]?.name || e.provider} />
          <Row label="Per-Unit Rate" value={`₹${e.perUnitRate}`} />
          <Row label="Daily Consumption" value={`${e.dailyConsumptionKwh} kWh`} />
          <Row label="Roof Area" value={`${e.roofAreaSqft} sq.ft`} />
          <Row label="Roof Type" value={e.roofType} />
          <Row label="Shading" value={e.shading} />
        </div>

        <div className="card p-6">
          <h3 className="font-heading font-semibold text-navy-dark mb-4">System Configuration</h3>
          <Row label="System Size" value={formatKw(s.systemSizeKw)} />
          <Row label="Panels" value={`${s.panelCount} × ${panel?.brand || ''} ${s.panelWattage}W`} />
          <Row label="Inverter" value={`${s.inverterCapacityKw} kW`} />
          <Row label="Mounting" value={s.mounting} />
          <Row label="Battery" value={s.batteryOption} />
          <Row label="Net Metering" value={s.netMetering ? 'Yes' : 'No'} />
        </div>

        <div className="lg:col-span-2">
          <EquipmentSelector
            draft={q}
            setAttachedDocs={setAttachedDocs}
            panel={panel}
            inverter={config.pricing_defaults.inverters[s.inverterKey]}
          />
        </div>

        {computed && (
          <div className="card p-6 bg-navy-dark text-white">
            <h3 className="font-heading font-semibold text-gold-light mb-4">Investment Summary</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="opacity-70">Panels</span><span>{formatINR(computed.costs.panelsCost)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Inverter</span><span>{formatINR(computed.costs.inverter)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Mounting</span><span>{formatINR(computed.costs.mounting)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Electrical</span><span>{formatINR(computed.costs.electrical)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Net Metering</span><span>{formatINR(computed.costs.netMetering)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Labor</span><span>{formatINR(computed.costs.labor)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Transport</span><span>{formatINR(computed.costs.transport)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-2 mt-2 font-bold"><span>Subtotal</span><span>{formatINR(computed.totals.subtotal)}</span></div>
              {computed.subsidy > 0 && <div className="flex justify-between text-gold-light"><span>Subsidy</span><span>−{formatINR(computed.subsidy)}</span></div>}
              <div className="flex justify-between"><span className="opacity-70">GST</span><span>{formatINR(computed.totals.gst)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-3 mt-2 font-heading text-xl font-bold text-gold-primary">
                <span>Grand Total</span><span>{formatINR(computed.totals.grandTotal)}</span>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-white/10 text-sm space-y-1 opacity-90">
              <div className="flex justify-between"><span>Advance ({computed.schedule.advancePercent}%)</span><span>{formatINR(computed.schedule.advance)}</span></div>
              <div className="flex justify-between"><span>Before Dispatch ({computed.schedule.beforeDispatchPercent}%)</span><span>{formatINR(computed.schedule.beforeDispatch)}</span></div>
              <div className="flex justify-between"><span>Post-Install ({computed.schedule.postInstallationPercent}%)</span><span>{formatINR(computed.schedule.postInstallation)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationDetail;
