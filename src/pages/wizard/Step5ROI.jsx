import React from 'react';
import { Stat } from '../../components/ui.jsx';
import SavingsChart from '../../components/SavingsChart.jsx';
import { formatINR, formatKwh, formatNumber } from '../../utils/format.js';
import { Leaf, TrendingUp, Clock, Zap, IndianRupee, Sun } from 'lucide-react';

const Step5ROI = ({ draft, computed }) => {
  if (!computed) {
    return (
      <div className="text-center text-cream-600 py-12">
        Please complete previous steps to see ROI projections.
      </div>
    );
  }
  const { roi, totals } = computed;

  // Simple ASCII-chart-style SVG bars
  const maxCum = Math.max(...roi.yearlyBreakdown.map((y) => y.cumulative));
  const netCost = totals.afterSubsidy + totals.gst;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">ROI Projections</h2>
      <p className="text-cream-600 mb-8">
        What the client gets back over 25 years — the real story behind the investment.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Monthly Savings" value={formatINR(roi.monthlySavings)} icon={IndianRupee} tone="light" />
        <Stat label="Annual Savings" value={formatINR(roi.annualSavings)} icon={TrendingUp} tone="light" />
        <Stat label="Payback Period" value={`${roi.paybackYears} yrs`} icon={Clock} tone="gold" />
        <Stat label="25-Year ROI" value={`${roi.roiPercent}%`} icon={TrendingUp} tone="navy" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Monthly Generation" value={formatKwh(roi.monthlyGenKwh)} icon={Zap} tone="light" />
        <Stat label="25-Year Savings" value={formatINR(roi.totalSavings, { compact: true })} icon={Sun} tone="light" />
        <Stat label="CO₂ Offset / Year" value={`${formatNumber(roi.co2PerYear)} kg`} icon={Leaf} tone="light" />
      </div>

      {/* 25-year cumulative savings chart — the hero financial visual. Same
          component gets rendered off-screen and stamped on the PDF ROI page. */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-navy-dark">
              25-Year Savings vs. Grid Electricity
            </h3>
            <p className="text-xs text-cream-600 mt-1">
              Net solar savings (after system cost) vs. what the client would spend on the grid,
              assuming 3% annual tariff escalation.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-cream-600">Net 25-Yr Profit</div>
            <div className="font-heading text-xl font-bold text-emerald-600">
              {formatINR(roi.totalSavings - (totals.afterSubsidy + totals.gst), { compact: true })}
            </div>
          </div>
        </div>
        <SavingsChart
          monthlyBill={draft.energy.monthlyBill}
          netCost={totals.afterSubsidy + totals.gst}
          systemSizeKw={draft.system.systemSizeKw}
          perUnitRate={draft.energy.perUnitRate}
          height={380}
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-lg font-semibold text-navy-dark">
            Cumulative Savings vs. Investment
          </h3>
          <div className="text-xs text-cream-600">
            Red line = investment recovered after <strong>{roi.paybackYears}</strong> years
          </div>
        </div>
        <div className="relative">
          <svg viewBox="0 0 780 260" className="w-full h-auto">
            {/* Y-axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <g key={p}>
                <line x1="40" y1={20 + 200 * (1 - p)} x2="780" y2={20 + 200 * (1 - p)} stroke="#F0EDE8" strokeWidth="1" />
                <text x="36" y={24 + 200 * (1 - p)} fontSize="10" fill="#6B6560" textAnchor="end">
                  {formatINR(maxCum * p, { compact: true })}
                </text>
              </g>
            ))}
            {/* Bars */}
            {roi.yearlyBreakdown.map((y, i) => {
              const bw = 28;
              const gap = 2;
              const x = 50 + i * (bw + gap);
              const h = 200 * (y.cumulative / maxCum);
              return (
                <g key={y.year}>
                  <rect
                    x={x}
                    y={220 - h}
                    width={bw}
                    height={h}
                    rx="2"
                    fill={y.cumulative >= netCost ? '#F5A623' : '#1A2744'}
                  />
                  {(y.year === 1 || y.year % 5 === 0 || y.year === 25) && (
                    <text x={x + bw / 2} y="238" fontSize="10" fill="#6B6560" textAnchor="middle">
                      Y{y.year}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Net cost line */}
            <line
              x1="40"
              y1={220 - 200 * (netCost / maxCum)}
              x2="780"
              y2={220 - 200 * (netCost / maxCum)}
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text
              x="770"
              y={220 - 200 * (netCost / maxCum) - 4}
              fontSize="10"
              fill="#EF4444"
              textAnchor="end"
              fontWeight="700"
            >
              Net cost: {formatINR(netCost, { compact: true })}
            </text>
          </svg>
        </div>
        <div className="mt-4 flex items-center gap-6 text-xs text-cream-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-navy-mid" /> Recovering investment
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gold-primary" /> Net profit zone
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-cream-800">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-cream-600 mb-1">Net Investment</div>
          <div className="font-heading text-xl font-bold text-navy-dark">{formatINR(netCost)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-cream-600 mb-1">Total 25-yr Savings</div>
          <div className="font-heading text-xl font-bold text-navy-dark">{formatINR(roi.totalSavings)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-cream-600 mb-1">Net Profit</div>
          <div className="font-heading text-xl font-bold text-emerald-600">
            {formatINR(roi.totalSavings - netCost)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step5ROI;
