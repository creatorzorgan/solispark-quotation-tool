import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Settings,
  Menu,
  X,
  Sun,
  CheckCircle2,
  XCircle,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quotations/new', label: 'Create Quotation', icon: FilePlus2 },
  { to: '/quotations', label: 'All Quotations', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// Compact cloud-sync indicator shown in the sidebar footer.
const SyncBadge = ({ syncState }) => {
  if (!syncState) return null;
  const { status, enabled, lastSyncedAt } = syncState;

  if (!enabled) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/40">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local only</span>
      </div>
    );
  }
  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-2 text-xs text-white/60">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing…</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-rose-300" title={syncState.lastError || ''}>
        <CloudOff className="w-3.5 h-3.5" />
        <span>Sync offline</span>
      </div>
    );
  }
  const when = lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="flex items-center gap-2 text-xs text-emerald-300" title={`Synced at ${when}`}>
      <Cloud className="w-3.5 h-3.5" />
      <span>Synced{when ? ` · ${when}` : ''}</span>
    </div>
  );
};

const Layout = () => {
  const { toast, config, syncState } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-offwhite">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-navy-dark text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
          <button
            onClick={() => {
              navigate('/');
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-md bg-gold-primary flex items-center justify-center shadow-gold">
              <Sun className="w-6 h-6 text-navy-dark" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <div className="font-heading font-bold text-lg leading-tight text-white">Solispark</div>
              <div className="text-[11px] uppercase tracking-wider text-gold-light/80">Energy</div>
            </div>
          </button>
          <button
            className="lg:hidden text-white/70 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-gold-primary text-navy-dark shadow-gold'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 text-xs text-white/40 space-y-2">
          <SyncBadge syncState={syncState} />
          <div className="font-heading text-gold-light text-sm">
            {config.company.tagline}
          </div>
          <div>© {new Date().getFullYear()} Solispark Energy</div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy-dark/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-cream-100">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="w-6 h-6 text-navy-dark" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gold-primary flex items-center justify-center">
              <Sun className="w-5 h-5 text-navy-dark" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-navy-dark">Solispark</span>
          </div>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-md shadow-cardHover text-sm font-semibold ${
              toast.kind === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {toast.kind === 'error' ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
