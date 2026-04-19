import React from 'react';

export const StatusChip = ({ status }) => {
  const map = {
    Draft: 'chip-gray',
    Sent: 'chip-blue',
    Accepted: 'chip-green',
    Expired: 'chip-red',
  };
  return <span className={map[status] || 'chip-gray'}>{status}</span>;
};

export const Field = ({ label, children, hint, error, className = '' }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    {children}
    {hint && !error && <p className="mt-1.5 text-xs text-cream-600">{hint}</p>}
    {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
  </div>
);

export const SectionTitle = ({ title, subtitle, right }) => (
  <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
    <div>
      <h1 className="font-heading text-3xl font-bold text-navy-dark">{title}</h1>
      {subtitle && <p className="mt-1 text-cream-600">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Stat = ({ label, value, icon: Icon, tone = 'navy' }) => {
  const toneMap = {
    navy: 'bg-navy-dark text-white',
    gold: 'bg-gold-primary text-navy-dark',
    light: 'bg-white border border-cream-100 text-navy-dark',
    mid: 'bg-navy-mid text-white',
  };
  return (
    <div className={`card p-6 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs uppercase tracking-wider ${tone === 'light' ? 'text-cream-600' : 'opacity-75'}`}>
          {label}
        </span>
        {Icon && <Icon className="w-5 h-5 opacity-80" />}
      </div>
      <div className="font-heading text-2xl lg:text-3xl font-bold">{value}</div>
    </div>
  );
};

export const EmptyState = ({ title, description, action }) => (
  <div className="card p-12 text-center">
    <h3 className="font-heading text-xl font-semibold text-navy-dark mb-2">{title}</h3>
    <p className="text-cream-600 mb-6">{description}</p>
    {action}
  </div>
);
