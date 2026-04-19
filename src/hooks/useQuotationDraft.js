// Draft-state hook for the wizard. Centralises defaults and derived calculations
// so each step just reads/writes the relevant slice of state.

import { useMemo, useState } from 'react';
import {
  calculateCosts,
  calculateROI,
  calculateSubsidy,
  calculateTotals,
  estimateDailyConsumptionKwh,
  panelCountFor,
  paymentSchedule,
  pickInverter,
  recommendSystemSize,
} from '../utils/calculations.js';

export const createEmptyQuotation = (config) => ({
  id: null,
  referenceNumber: null,
  status: 'Draft',
  createdAt: null,
  updatedAt: null,
  client: {
    fullName: '',
    phone: '+91 ',
    email: '',
    address: '',
    propertyType: 'Independent House',
    category: 'Residential',
  },
  energy: {
    monthlyBill: 10000,
    dailyConsumptionKwh: estimateDailyConsumptionKwh(10000, config.electricity_providers.bescom.rate),
    provider: 'bescom',
    perUnitRate: config.electricity_providers.bescom.rate,
    roofAreaSqft: 600,
    roofType: 'RCC Flat Roof',
    shading: 'No Shading',
    floors: '2',
  },
  system: {
    systemSizeKw: 0,
    panelCount: 0,
    panelKey: 'axitec_545w',
    panelWattage: config.pricing_defaults.panels.axitec_545w.wattage,
    inverterKey: 'solis_5kw',
    inverterCapacityKw: 5,
    mounting: 'Standard Elevated',
    batteryOption: 'None',
    batteryCost: 0,
    netMetering: true,
  },
  pricing: {
    pricePerPanel: config.pricing_defaults.panels.axitec_545w.price_per_panel,
    inverterPrice: config.pricing_defaults.inverters.solis_5kw.price,
    mountingPerKw: config.pricing_defaults.other_costs_per_kw.mounting_structure,
    electricalPerKw: config.pricing_defaults.other_costs_per_kw.electrical_wiring,
    netMeteringFlat: config.pricing_defaults.flat_costs.net_metering_fees,
    installationLaborPerKw: config.pricing_defaults.other_costs_per_kw.installation_labor,
    transportFlat: config.pricing_defaults.flat_costs.transportation,
    // Manual subsidy override — null ⇒ use the calculated value. Set any number
    // (including 0) to override the PM Surya Ghar slab calc for this quote.
    subsidyOverride: null,
    costs: null,
    subsidy: 0,
    afterSubsidy: 0,
    gst: 0,
    grandTotal: 0,
  },
  // Datasheets to merge into the final PDF. Each entry is a path relative to
  // the /public root (see src/data/equipmentCatalog.js).
  attachedDocs: [],
});

export const useQuotationDraft = (config, initial) => {
  const [draft, setDraft] = useState(initial || createEmptyQuotation(config));

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updateClient = (patch) => setDraft((d) => ({ ...d, client: { ...d.client, ...patch } }));
  const updateEnergy = (patch) => setDraft((d) => ({ ...d, energy: { ...d.energy, ...patch } }));
  const updateSystem = (patch) => setDraft((d) => ({ ...d, system: { ...d.system, ...patch } }));
  const updatePricing = (patch) => setDraft((d) => ({ ...d, pricing: { ...d.pricing, ...patch } }));
  const setAttachedDocs = (docs) => setDraft((d) => ({ ...d, attachedDocs: Array.isArray(docs) ? docs : [] }));

  // Auto-calc helpers used between steps
  const suggestSystem = () => {
    const size = recommendSystemSize(
      draft.energy.monthlyBill,
      draft.energy.perUnitRate,
      config.calculation_constants.peak_sun_hours
    );
    const panel = config.pricing_defaults.panels[draft.system.panelKey];
    const count = panelCountFor(size, panel.wattage);
    const inverter = pickInverter(size, config.pricing_defaults.inverters);
    updateSystem({
      systemSizeKw: size,
      panelCount: count,
      panelWattage: panel.wattage,
      inverterKey: inverter.key,
      inverterCapacityKw: inverter.capacity_kw,
    });
    updatePricing({
      pricePerPanel: panel.price_per_panel,
      inverterPrice: inverter.price,
    });
    return size;
  };

  // Derived pricing for preview — read-only; step 4 commits to draft.pricing
  const computed = useMemo(() => {
    const { system, pricing, energy, client } = draft;
    if (!system.systemSizeKw) return null;
    const costs = calculateCosts({
      systemSizeKw: system.systemSizeKw,
      panelCount: system.panelCount,
      pricePerPanel: pricing.pricePerPanel,
      inverterPrice: pricing.inverterPrice,
      mountingPerKw: pricing.mountingPerKw,
      electricalPerKw: pricing.electricalPerKw,
      netMeteringFlat: system.netMetering ? pricing.netMeteringFlat : 0,
      installationLaborPerKw: pricing.installationLaborPerKw,
      transportFlat: pricing.transportFlat,
      batteryCost: system.batteryCost,
    });
    const autoSubsidy = calculateSubsidy(
      system.systemSizeKw,
      client.category,
      config.pricing_defaults.government_subsidy
    );
    // Manual override takes precedence when the user has set one.
    const subsidy = pricing.subsidyOverride != null ? Math.max(0, pricing.subsidyOverride) : autoSubsidy;
    const totals = calculateTotals(costs, subsidy, config.pricing_defaults.tax.gst_rate_percent);
    const schedule = paymentSchedule(totals.grandTotal, config.payment_terms);
    const roi = calculateROI({
      systemSizeKw: system.systemSizeKw,
      perUnitRate: energy.perUnitRate,
      netCost: totals.afterSubsidy + totals.gst,
      paybackBasis: totals.afterSubsidy, // payback calc uses base price ex-GST
      years: 25,
      peakSunHours: config.calculation_constants.peak_sun_hours,
      annualEscalationPercent: config.calculation_constants.annual_tariff_escalation_percent,
      degradationPercent: config.calculation_constants.system_degradation_per_year_percent,
      co2PerKwh: config.calculation_constants.co2_offset_kg_per_kwh,
    });
    return { costs, subsidy, totals, schedule, roi };
  }, [draft, config]);

  // Commit computed pricing into the draft (called before save)
  const commitPricing = () => {
    if (!computed) return;
    updatePricing({
      costs: computed.costs,
      subsidy: computed.subsidy,
      afterSubsidy: computed.totals.afterSubsidy,
      gst: computed.totals.gst,
      grandTotal: computed.totals.grandTotal,
    });
  };

  return {
    draft,
    setDraft,
    update,
    updateClient,
    updateEnergy,
    updateSystem,
    updatePricing,
    setAttachedDocs,
    suggestSystem,
    computed,
    commitPricing,
  };
};
