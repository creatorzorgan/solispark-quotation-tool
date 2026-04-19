// Formatting helpers for currency, numbers, dates.

export const formatINR = (value, { compact = false } = {}) => {
  const n = Number(value) || 0;
  if (compact) {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  }
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const formatNumber = (value, decimals = 0) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const formatKw = (value) => `${formatNumber(value, value < 10 ? 2 : 1)} kW`;
export const formatKwh = (value) => `${formatNumber(value, 0)} kWh`;

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const todayISO = () => new Date().toISOString();

export const daysBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};
