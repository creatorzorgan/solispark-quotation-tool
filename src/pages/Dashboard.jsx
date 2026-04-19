import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, TrendingUp, Percent, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { SectionTitle, Stat, StatusChip, EmptyState } from '../components/ui.jsx';
import { formatINR, formatDate } from '../utils/format.js';

const Dashboard = () => {
  const { quotations } = useApp();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = quotations.filter(
      (q) => new Date(q.createdAt) >= monthStart
    );
    const totalPipeline = quotations
      .filter((q) => q.status === 'Sent' || q.status === 'Draft')
      .reduce((s, q) => s + (q.pricing?.grandTotal || 0), 0);
    const accepted = quotations.filter((q) => q.status === 'Accepted').length;
    const total = quotations.length;
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return {
      thisMonthCount: thisMonth.length,
      totalPipeline,
      conversionRate,
    };
  }, [quotations]);

  const recent = quotations.slice(0, 8);

  return (
    <div>
      <SectionTitle
        title="Dashboard"
        subtitle="Your solar quotation command center."
        right={
          <button className="btn-primary" onClick={() => navigate('/quotations/new')}>
            <FilePlus2 className="w-5 h-5" /> Create New Quotation
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat
          label="Quotations This Month"
          value={stats.thisMonthCount}
          icon={FileText}
          tone="navy"
        />
        <Stat
          label="Pipeline Value"
          value={formatINR(stats.totalPipeline, { compact: true })}
          icon={TrendingUp}
          tone="gold"
        />
        <Stat
          label="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={Percent}
          tone="mid"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100">
          <h2 className="font-heading text-lg font-semibold text-navy-dark">
            Recent Quotations
          </h2>
          <button
            className="text-sm text-gold-dark font-semibold hover:underline"
            onClick={() => navigate('/quotations')}
          >
            View All →
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            description="Create your first solar quotation to get started."
            action={
              <button
                className="btn-primary"
                onClick={() => navigate('/quotations/new')}
              >
                <FilePlus2 className="w-4 h-4" /> Create Quotation
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-cream-600 uppercase tracking-wider border-b border-cream-100">
                  <th className="text-left px-6 py-3 font-semibold">Client</th>
                  <th className="text-left px-6 py-3 font-semibold">Date</th>
                  <th className="text-left px-6 py-3 font-semibold">System</th>
                  <th className="text-right px-6 py-3 font-semibold">Value</th>
                  <th className="text-center px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-cream-100 hover:bg-cream-100/40 cursor-pointer transition"
                    onClick={() => navigate(`/quotations/${q.id}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-navy-dark">
                      {q.client?.fullName || '—'}
                      <div className="text-xs text-cream-600 font-normal mt-0.5">
                        {q.referenceNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-cream-800">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-cream-800">
                      {q.system?.systemSizeKw ? `${q.system.systemSizeKw} kW` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-heading font-bold text-navy-dark">
                      {formatINR(q.pricing?.grandTotal || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusChip status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
