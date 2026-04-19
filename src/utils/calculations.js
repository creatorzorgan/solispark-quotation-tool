// Solar sizing, pricing, ROI calculations. Pure functions — no React, no storage.

const roundTo = (n, step) => Math.round(n / step) * step;
const ceilTo = (n, step) => Math.ceil(n / step) * step;

// Recommended system size in kW from a monthly bill (₹) and per-unit rate.
// Formula per spec: monthly_bill / per_unit_rate / 30 / 4 peak sun hours.
export const recommendSystemSize = (monthlyBill, perUnitRate, peakSunHours = 4) => {
  if (!monthlyBill || !perUnitRate || !peakSunHours) return 0;
  const raw = monthlyBill / perUnitRate / 30 / peakSunHours;
  // Round up to nearest 0.5 kW for a clean quoteable number.
  return Math.max(1, ceilTo(raw, 0.5));
};

export const estimateDailyConsumptionKwh = (monthlyBill, perUnitRate) => {
  if (!monthlyBill || !perUnitRate) return 0;
  return +(monthlyBill / perUnitRate / 30).toFixed(1);
};

export const panelCountFor = (systemSizeKw, panelWattage) => {
  if (!systemSizeKw || !panelWattage) return 0;
  return Math.ceil((systemSizeKw * 1000) / panelWattage);
};

// Pick the best-fitting inverter(s) from the price list for a given size.
export const pickInverter = (systemSizeKw, inverters) => {
  const list = Object.values(inverters);
  // prefer a single unit that covers system size; else scale from 10kW unit
  const single = list
    .filter((i) => i.capacity_kw >= systemSizeKw)
    .sort((a, b) => a.capacity_kw - b.capacity_kw)[0];
  if (single) return single;
  // fall back to largest 10kW unit
  return list.sort((a, b) => b.capacity_kw - a.capacity_kw)[0];
};

// Government subsidy (PM Surya Ghar Muft Bijli Yojana) — residential systems up to 5kW only.
export const calculateSubsidy = (systemSizeKw, clientCategory, subsidyConfig) => {
  if (clientCategory !== 'Residential') return 0;
  if (systemSizeKw <= 0) return 0;
  // Subsidy only applies to systems up to 5 kW. Larger systems get nothing.
  if (systemSizeKw > 5) return 0;
  const { residential_up_to_3kw, residential_3kw_to_10kw_per_kw, max_subsidy_amount } = subsidyConfig;
  let subsidy = 0;
  if (systemSizeKw <= 2) {
    subsidy = residential_up_to_3kw * (systemSizeKw / 2);
  } else if (systemSizeKw <= 3) {
    subsidy = residential_up_to_3kw * (systemSizeKw / 2);
  } else {
    // 3 kW < systemSizeKw ≤ 5 kW
    subsidy = residential_up_to_3kw * 1.5 + residential_3kw_to_10kw_per_kw * (systemSizeKw - 3);
  }
  return Math.min(Math.round(subsidy), max_subsidy_amount || subsidy);
};

// Full cost breakdown. Accepts already-resolved panel/inverter prices so the
// wizard can override defaults.
export const calculateCosts = ({
  systemSizeKw,
  panelCount,
  pricePerPanel,
  inverterPrice,
  mountingPerKw,
  electricalPerKw,
  netMeteringFlat,
  installationLaborPerKw,
  transportFlat,
  batteryCost = 0,
}) => {
  const panelsCost = panelCount * pricePerPanel;
  const inverter = inverterPrice;
  const mounting = systemSizeKw * mountingPerKw;
  const electrical = systemSizeKw * electricalPerKw;
  const netMetering = netMeteringFlat;
  const labor = systemSizeKw * installationLaborPerKw;
  const transport = transportFlat;
  const battery = batteryCost;
  const subtotal = panelsCost + inverter + mounting + electrical + netMetering + labor + transport + battery;
  return {
    panelsCost: Math.round(panelsCost),
    inverter: Math.round(inverter),
    mounting: Math.round(mounting),
    electrical: Math.round(electrical),
    netMetering: Math.round(netMetering),
    labor: Math.round(labor),
    transport: Math.round(transport),
    battery: Math.round(battery),
    subtotal: Math.round(subtotal),
  };
};

export const calculateTotals = (costs, subsidy, gstRatePercent) => {
  const subtotal = costs.subtotal;
  const afterSubsidy = Math.max(0, subtotal - subsidy);
  const gst = Math.round((afterSubsidy * gstRatePercent) / 100);
  const grandTotal = afterSubsidy + gst;
  return { subtotal, subsidy, afterSubsidy, gst, grandTotal };
};

export const paymentSchedule = (grandTotal, terms) => {
  const advance = Math.round((grandTotal * terms.advance_percent) / 100);
  const beforeDispatch = Math.round((grandTotal * terms.before_dispatch_percent) / 100);
  const postInstallation = grandTotal - advance - beforeDispatch;
  return {
    advance,
    beforeDispatch,
    postInstallation,
    advancePercent: terms.advance_percent,
    beforeDispatchPercent: terms.before_dispatch_percent,
    postInstallationPercent: terms.post_installation_percent,
  };
};

// Monthly generation (kWh) for a given system size.
export const monthlyGenerationKwh = (systemSizeKw, peakSunHours = 4, days = 30) =>
  Math.round(systemSizeKw * peakSunHours * days);

// ROI calculation with compounding tariff escalation and panel degradation.
// `netCost` is used for ROI% (typically grand total incl. GST). `paybackBasis`
// optionally overrides the figure used for the payback-years calc — pass the
// base price (ex-GST) to compute payback against the pre-tax investment.
export const calculateROI = ({
  systemSizeKw,
  perUnitRate,
  netCost,
  paybackBasis,
  years = 25,
  peakSunHours = 4,
  annualEscalationPercent = 5,
  degradationPercent = 0.5,
  co2PerKwh = 0.82,
}) => {
  const monthlyGen = monthlyGenerationKwh(systemSizeKw, peakSunHours);
  const annualGenYear1 = monthlyGen * 12;
  const monthlySavings = Math.round(monthlyGen * perUnitRate);
  const annualSavings = monthlySavings * 12;

  let cumulativeSavings = 0;
  const yearly = [];
  for (let y = 1; y <= years; y++) {
    const rate = perUnitRate * Math.pow(1 + annualEscalationPercent / 100, y - 1);
    const genFactor = Math.pow(1 - degradationPercent / 100, y - 1);
    const yearSavings = Math.round(monthlyGen * 12 * rate * genFactor);
    cumulativeSavings += yearSavings;
    yearly.push({ year: y, savings: yearSavings, cumulative: cumulativeSavings });
  }

  const totalSavings = cumulativeSavings;
  const paybackFigure = paybackBasis ?? netCost;
  const paybackYears = annualSavings > 0 ? +(paybackFigure / annualSavings).toFixed(1) : 0;
  const roiPercent = netCost > 0 ? Math.round(((totalSavings - netCost) / netCost) * 100) : 0;
  const co2PerYear = Math.round(annualGenYear1 * co2PerKwh);
  const co2Lifetime = Math.round(co2PerYear * years);

  return {
    monthlyGenKwh: monthlyGen,
    annualGenKwh: annualGenYear1,
    monthlySavings,
    annualSavings,
    totalSavings,
    paybackYears,
    roiPercent,
    co2PerYear,
    co2Lifetime,
    yearlyBreakdown: yearly,
  };
};

// Roof area check — warn if selected size is bigger than roof can fit.
export const fitsOnRoof = (systemSizeKw, roofSqft, sqftPerKw = 100) =>
  !roofSqft || roofSqft >= systemSizeKw * sqftPerKw;
