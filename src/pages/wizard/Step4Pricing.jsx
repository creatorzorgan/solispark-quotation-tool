import React from 'react';
import { Field } from '../../components/ui.jsx';
import { formatINR } from '../../utils/format.js';
import { RotateCcw } from 'lucide-react';

// Pricing step — simplified to two editable fields:
//   • System Cost (pre-GST)            — auto-calculated from panels + inverter
//     + mounting + electrical + labor + transport + battery; user can override.
//   • {DISCOM} Charges                  — auto-filled from the liaisoning fee;
//     user can override. Label uses the DISCOM picked on Step 2.
// Subsidy, GST, and grand total are computed live from these two inputs.
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

  const { subsidy, totals, systemPrice, discomCharges, discomName, autoSystemPrice } = computed;
  const gstPercent = config.pricing_defaults.tax.gst_rate_percent;

  // Two editable fields — shown from the override if set, else the calc.
  const systemCostShown = p.systemCostOverride != null ? p.systemCostOverride : systemPrice;
  const discomShown = p.discomChargesOverride != null ? p.discomChargesOverride : discomCharges;
  const systemIsOverride = p.systemCostOverride != null;
  const discomIsOverride = p.discomChargesOverride != null;

  // Subsidy: user can override just like before.
  const subsidyShown = p.subsidyOverride != null ? p.subsidyOverride : subsidy;
  const subsidyIsOverride = p.subsidyOverride != null;

  const autoDiscom = draft.system.netMetering ? (p.netMeteringFlat || 0) : 0;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">Pricing & Payment</h2>
      <p className="text-cream-600 mb-8">
        Two numbers drive the whole proposal. Auto-calculated by default — edit either to override.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Editable inputs */}
        <div className="lg:col-span-3 space-y-5">
          <Field
            label={
              <span className="flex items-center justify-between gap-2">
                <span>
                  System Cost (pre-GST){' '}
                  <span className={systemIsOverride ? 'text-gold-dark' : 'text-cream-500'}>
                    ({systemIsOverride ? 'manual' : 'auto'})
                  </span>
                </span>
                {systemIsOverride && (
                  <button
                    type="button"
                    onClick={() => updatePricing({ systemCostOverride: null })}
                    className="text-xs text-navy-mid hover:text-gold-dark flex items-center gap-1"
                    title="Reset to auto-calculated"
                  >
                    <RotateCcw className="w-3 h-3" /> reset
                  </button>
                )}
              </span>
            }
            hint={
              systemIsOverride
                ? `Manual override. Auto-calc would be ${formatINR(autoSystemPrice)}.`
                : `Panels + inverter + mounting + electrical + labor + transport + battery. Edit to override.`
            }
          >
            <input
              type="number"
              min="0"
              className="input"
              value={systemCostShown}
              onChange={(e) => updatePricing({ systemCostOverride: Number(e.target.value) })}
            />
          </Field>

          <Field
            label={
              <span className="flex items-center justify-between gap-2">
                <span>
                  {discomName} Charges{' '}
                  <span className={discomIsOverride ? 'text-gold-dark' : 'text-cream-500'}>
                    ({discomIsOverride ? 'manual' : 'auto'})
                  </span>
                </span>
                {discomIsOverride && (
                  <button
                    type="button"
                    onClick={() => updatePricing({ discomChargesOverride: null })}
                    className="text-xs text-navy-mid hover:text-gold-dark flex items-center gap-1"
                    title="Reset to auto-calculated"
                  >
                    <RotateCcw className="w-3 h-3" /> reset
                  </button>
                )}
              </span>
            }
            hint={
              discomIsOverride
                ? `Manual override. Auto-calc would be ${formatINR(autoDiscom)}.`
                : `Liasoning with ${discomName} (Registration, PPA, Bi-directional Meter & Synchronization). Edit to override.`
            }
          >
            <input
              type="number"
              min="0"
              className="input"
              value={discomShown}
              onChange={(e) => updatePricing({ discomChargesOverride: Number(e.target.value) })}
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
                    Liasoning with {discomName} (Registration, PPA, Bi-directional Meter & Synchronization)
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-white font-semibold">
                  <span className="text-white/70 font-normal">Subtotal</span>
                  <span>{formatINR(discomCharges)}</span>
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
