import React from 'react';
import { Field } from '../../components/ui.jsx';
import { formatINR } from '../../utils/format.js';
import { RotateCcw } from 'lucide-react';

const Step4Pricing = ({ draft, updatePricing, computed, config }) => {
  const p = draft.pricing;
  const s = draft.system;

  if (!computed) {
    return (
      <div className="text-center text-cream-600 py-12">
        Please complete Step 3 (system configuration) first.
      </div>
    );
  }

  const { costs, subsidy, totals } = computed;

  // "System price" in the commercial offer bundles every internal cost except
  // the BESCOM liaisoning fee (which shows as its own line).
  const systemPrice =
    (costs.panelsCost || 0) +
    (costs.inverter || 0) +
    (costs.mounting || 0) +
    (costs.electrical || 0) +
    (costs.labor || 0) +
    (costs.transport || 0) +
    (costs.battery || 0);
  const bescomFee = costs.netMetering || 0;

  const gstPercent = config.pricing_defaults.tax.gst_rate_percent;

  // Subsidy input shows the override if set, else the calculated amount.
  const subsidyShown = p.subsidyOverride != null ? p.subsidyOverride : subsidy;
  const subsidyIsOverride = p.subsidyOverride != null;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">Pricing & Payment</h2>
      <p className="text-cream-600 mb-8">
        Edit any per-unit rate to customise this quote. Totals update live.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Editable inputs */}
        <div className="lg:col-span-3">
          <h3 className="font-heading text-base font-semibold text-navy-dark mb-4">Unit Rates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={`Per Panel Cost (${s.panelCount} panels)`}>
              <input
                type="number"
                className="input"
                value={p.pricePerPanel}
                onChange={(e) => updatePricing({ pricePerPanel: Number(e.target.value) })}
              />
            </Field>
            <Field label="Inverter Total">
              <input
                type="number"
                className="input"
                value={p.inverterPrice}
                onChange={(e) => updatePricing({ inverterPrice: Number(e.target.value) })}
              />
            </Field>
            <Field label="Mounting Structure (₹/kW)">
              <input
                type="number"
                className="input"
                value={p.mountingPerKw}
                onChange={(e) => updatePricing({ mountingPerKw: Number(e.target.value) })}
              />
            </Field>
            <Field label="Electrical & Wiring (₹/kW)">
              <input
                type="number"
                className="input"
                value={p.electricalPerKw}
                onChange={(e) => updatePricing({ electricalPerKw: Number(e.target.value) })}
              />
            </Field>
            <Field label="BESCOM Liaisoning Fee">
              <input
                type="number"
                className="input"
                value={p.netMeteringFlat}
                onChange={(e) => updatePricing({ netMeteringFlat: Number(e.target.value) })}
              />
            </Field>
            <Field label="Installation Labor (₹/kW)">
              <input
                type="number"
                className="input"
                value={p.installationLaborPerKw}
                onChange={(e) => updatePricing({ installationLaborPerKw: Number(e.target.value) })}
              />
            </Field>
            <Field label="Transportation & Logistics">
              <input
                type="number"
                className="input"
                value={p.transportFlat}
                onChange={(e) => updatePricing({ transportFlat: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Government Subsidy{' '}
                    <span className={subsidyIsOverride ? 'text-gold-dark' : 'text-cream-500'}>
                      ({subsidyIsOverride ? 'manual' : 'auto'})
                    </span>
                  </span>
                  {subsidyIsOverride && (
                    <button
                      type="button"
                      onClick={() => updatePricing({ subsidyOverride: null })}
                      className="text-xs text-navy-mid hover:text-gold-dark flex items-center gap-1"
                      title="Reset to auto-calculated"
                    >
                      <RotateCcw className="w-3 h-3" /> reset
                    </button>
                  )}
                </span>
              }
              hint={
                subsidyIsOverride
                  ? 'Manual override. Will show on the PDF.'
                  : 'Auto-calculated from PM Surya Ghar slabs (≤5 kW residential). Edit to override.'
              }
            >
              <input
                type="number"
                min="0"
                className="input"
                value={subsidyShown}
                onChange={(e) => updatePricing({ subsidyOverride: Number(e.target.value) })}
              />
            </Field>
          </div>
        </div>

        {/* Commercial Offer summary (mirrors the PDF layout) */}
        <div className="lg:col-span-2">
          <div className="bg-navy-dark text-white rounded-md p-6 sticky top-6">
            <div className="text-xs uppercase tracking-wider text-gold-light/80">Commercial Offer</div>
            <div className="mt-1 mb-5 font-heading text-3xl font-bold">
              {formatINR(totals.grandTotal)}
            </div>

            <div className="text-sm">
              <div className="py-3 border-b border-white/10">
                <div className="flex justify-between gap-3">
                  <span className="text-white/70 leading-snug">
                    {s.systemSizeKw} kW capacity Roof Top Solar PV Grid Connect System for Design, Supply and Installation.
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-white font-semibold">
                  <span className="text-white/70 font-normal">Subtotal</span>
                  <span>{formatINR(systemPrice)}</span>
                </div>
              </div>

              <div className="py-3 border-b border-white/10">
                <div className="flex justify-between gap-3">
                  <span className="text-white/70 leading-snug">
                    Liasoning with BESCOM (Registration, PPA, Bi-directional Meter & Synchronization)
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-white font-semibold">
                  <span className="text-white/70 font-normal">Subtotal</span>
                  <span>{formatINR(bescomFee)}</span>
                </div>
              </div>

              <div className="flex justify-between py-3 border-b border-white/10 font-bold text-white">
                <span>Total Basic Price</span>
                <span>{formatINR(totals.subtotal)}</span>
              </div>

              {subsidy > 0 && (
                <div className="flex justify-between py-2 text-gold-light">
                  <span>Govt. Subsidy {subsidyIsOverride && <em className="not-italic opacity-70">(manual)</em>}</span>
                  <span>−{formatINR(subsidy)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-white/80">
                <span>GST @ {gstPercent}%</span>
                <span>{formatINR(totals.gst)}</span>
              </div>
              <div className="flex justify-between py-3 border-t border-white/10 font-heading text-xl text-gold-primary">
                <span>Grand Total</span>
                <span>{formatINR(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Pricing;
