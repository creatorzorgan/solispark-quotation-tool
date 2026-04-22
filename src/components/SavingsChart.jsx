// 25-year cumulative savings chart — the "money shot" of the proposal.
//
// Two stacked insights on one canvas:
//   1. Cost of Grid Electricity  (red/navy line)  — what the client would pay
//      over 25 years if they stayed on the grid, assuming a 3% annual tariff
//      escalation (the "do-nothing" scenario).
//   2. Net Solar Savings         (gold area)      — cumulative solar savings
//      minus the upfront system cost. Starts negative, crosses zero at the
//      payback year, then becomes pure profit.
//
// The component is used in two places:
//   - The Step 5 ROI UI so the sales team sees the narrative live.
//   - An off-screen render by captureChart.js that gets html2canvas-grabbed
//     and embedded as a large central visual on the PDF ROI page.
//
// It's intentionally self-contained and takes plain numbers — no context, no
// store — so the off-screen path can instantiate it anywhere without side
// effects.

import React, { forwardRef } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { calculate25YearComparison } from '../utils/calculations.js';
import { formatINR } from '../utils/format.js';

// Brand palette — must match the rest of the app.
const NAVY = '#0F1A2E';
const GOLD = '#F5A623';
const GOLD_DARK = '#D4891A';
const RED = '#DC2626';
const GRAY = '#6B6560';
const CREAM = '#F8F6F1';

// Compact INR ticks so the Y-axis stays readable at 25-year scale.
const tickINR = (v) => formatINR(v, { compact: true });

const tooltipFormatter = (value, name) => [formatINR(value), name];
const tooltipLabelFormatter = (year) => `Year ${year}`;

/**
 * @param {object}  props
 * @param {number}  props.monthlyBill        Current ₹/month electricity bill
 * @param {number}  props.netCost            Upfront system cost (grand total incl. GST, minus subsidy)
 * @param {number}  props.systemSizeKw
 * @param {number}  props.perUnitRate        ₹/kWh tariff the client pays today
 * @param {number}  [props.peakSunHours=4]
 * @param {number}  [props.gridEscalationPercent=3]
 * @param {number}  [props.height=360]
 * @param {boolean} [props.forCapture=false] When true, disable recharts
 *                                           animations and lock dimensions so
 *                                           html2canvas gets a stable frame.
 * @param {number}  [props.width]            Explicit pixel width (forCapture mode)
 */
const SavingsChart = forwardRef(function SavingsChart(
  {
    monthlyBill,
    netCost,
    systemSizeKw,
    perUnitRate,
    peakSunHours = 4,
    gridEscalationPercent = 3,
    height = 360,
    forCapture = false,
    width,
  },
  ref
) {
  const data = calculate25YearComparison({
    monthlyBill,
    netCost,
    systemSizeKw,
    perUnitRate,
    peakSunHours,
    gridEscalationPercent,
  });

  // Find the payback crossover so we can drop a vertical reference line.
  const paybackYear = (() => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].netSavings >= 0) return data[i].year;
    }
    return null;
  })();

  const ChartInner = (
    <ComposedChart
      data={data}
      margin={{ top: 20, right: 36, left: 12, bottom: 20 }}
    >
      <defs>
        <linearGradient id="netSavingsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity={0.55} />
          <stop offset="100%" stopColor={GOLD} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="gridCostFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RED} stopOpacity={0.18} />
          <stop offset="100%" stopColor={RED} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      <CartesianGrid stroke="#E8E3D8" strokeDasharray="3 3" vertical={false} />

      <XAxis
        dataKey="year"
        tick={{ fill: GRAY, fontSize: 11 }}
        tickLine={{ stroke: GRAY }}
        axisLine={{ stroke: GRAY }}
        label={{ value: 'Years', position: 'insideBottom', offset: -8, fill: GRAY, fontSize: 12 }}
        interval={forCapture ? 1 : 'preserveStartEnd'}
        ticks={[1, 5, 10, 15, 20, 25]}
      />
      <YAxis
        tickFormatter={tickINR}
        tick={{ fill: GRAY, fontSize: 11 }}
        tickLine={{ stroke: GRAY }}
        axisLine={{ stroke: GRAY }}
        width={72}
        label={{
          value: 'INR',
          angle: -90,
          position: 'insideLeft',
          offset: 10,
          fill: GRAY,
          fontSize: 12,
        }}
      />

      {!forCapture && (
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
          contentStyle={{
            background: CREAM,
            border: `1px solid ${GOLD}`,
            borderRadius: 8,
            fontSize: 12,
            color: NAVY,
          }}
        />
      )}

      <Legend
        wrapperStyle={{ paddingTop: 12, fontSize: 12, color: NAVY }}
        iconType="circle"
      />

      {/* Zero baseline — distinguishes "paying off" from "profit" for netSavings. */}
      <ReferenceLine y={0} stroke={GRAY} strokeWidth={1} />

      {/* Payback crossover — where the client breaks even. */}
      {paybackYear && (
        <ReferenceLine
          x={paybackYear}
          stroke={GOLD_DARK}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Payback · Y${paybackYear}`,
            position: 'top',
            fill: GOLD_DARK,
            fontSize: 11,
            fontWeight: 700,
          }}
        />
      )}

      {/* Cost of grid electricity — rendered first so the gold area sits on top. */}
      <Area
        type="monotone"
        dataKey="gridCost"
        name="Cost of Grid Electricity (3% yearly escalation)"
        stroke={RED}
        strokeWidth={2.5}
        fill="url(#gridCostFill)"
        dot={false}
        isAnimationActive={!forCapture}
      />

      {/* Net Solar Savings — the hero series. */}
      <Area
        type="monotone"
        dataKey="netSavings"
        name="Net Solar Savings (cumulative, after system cost)"
        stroke={GOLD_DARK}
        strokeWidth={3}
        fill="url(#netSavingsFill)"
        dot={false}
        isAnimationActive={!forCapture}
      />

      {/* Subtle gross-savings line so the client can see gross savings vs net */}
      <Line
        type="monotone"
        dataKey="cumulativeSolarSavings"
        name="Gross Solar Savings (before system cost)"
        stroke={NAVY}
        strokeWidth={1.5}
        strokeDasharray="5 4"
        dot={false}
        isAnimationActive={!forCapture}
      />
    </ComposedChart>
  );

  // For the PDF capture path we mount with explicit pixel dimensions so
  // html2canvas doesn't race the ResponsiveContainer's layout observer.
  if (forCapture) {
    const w = width || 1100;
    return (
      <div
        ref={ref}
        style={{
          width: w,
          height,
          background: '#FFFFFF',
          padding: 20,
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: NAVY,
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          25-Year Savings vs. Grid Electricity
        </div>
        <div
          style={{
            fontSize: 11,
            color: GRAY,
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          Net solar savings after system cost, compared to what you'd spend on the grid at 3% yearly escalation.
        </div>
        <div style={{ width: '100%', height: height - 70 }}>
          <ResponsiveContainer width="100%" height="100%">
            {ChartInner}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {ChartInner}
      </ResponsiveContainer>
    </div>
  );
});

export default SavingsChart;
