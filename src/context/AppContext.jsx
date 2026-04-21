import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getAllQuotations,
  getConfig,
  saveConfig as persistConfig,
  resetConfig as resetConfigStorage,
  saveQuotation as persistQuotation,
  deleteQuotation as removeQuotation,
  duplicateQuotation as duplicateInStorage,
  sweepExpired,
  replaceAllQuotations,
} from '../utils/storage.js';
import {
  fetchAllQuotations,
  upsertQuotation,
  deleteQuotationRemote,
  fetchConfig,
  upsertConfig,
} from '../utils/supabaseSync.js';
import { isSupabaseEnabled } from '../lib/supabase.js';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Initial render uses the localStorage cache so the UI paints instantly.
  // Supabase then reconciles in the background (see the effect below).
  const [config, setConfig] = useState(() => getConfig());
  const [quotations, setQuotations] = useState(() => getAllQuotations());
  const [toast, setToast] = useState(null);
  const [syncState, setSyncState] = useState({
    enabled: isSupabaseEnabled,
    status: isSupabaseEnabled ? 'syncing' : 'local-only', // syncing | synced | error | local-only
    lastSyncedAt: null,
    lastError: null,
  });

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // On mount: expiry sweep, then pull fresh data from Supabase and overwrite
  // the cache. This is the "remote wins" direction of sync — any changes made
  // on another device show up here.
  useEffect(() => {
    const swept = sweepExpired(config.payment_terms.proposal_validity_days);
    setQuotations(swept);

    if (!isSupabaseEnabled) return;

    let cancelled = false;
    (async () => {
      try {
        const [remoteQuotations, remoteConfig] = await Promise.all([
          fetchAllQuotations(),
          fetchConfig(),
        ]);
        if (cancelled) return;

        if (remoteQuotations !== null) {
          // Remote is authoritative for the quotation list.
          replaceAllQuotations(remoteQuotations);
          setQuotations(remoteQuotations);
        }
        if (remoteConfig) {
          persistConfig(remoteConfig);
          setConfig(remoteConfig);
        }
        setSyncState((s) => ({
          ...s,
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
        }));
      } catch (err) {
        if (cancelled) return;
        setSyncState((s) => ({
          ...s,
          status: 'error',
          lastError: err?.message || 'Sync failed',
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => setQuotations(getAllQuotations()), []);

  // Writes: update localStorage + state synchronously (instant UI), fire the
  // Supabase call in the background. Failures are logged inside supabaseSync.
  const saveQuotation = useCallback(
    (q) => {
      const saved = persistQuotation(q);
      refresh();
      upsertQuotation(saved).then(() => {
        setSyncState((s) => ({ ...s, status: 'synced', lastSyncedAt: new Date().toISOString() }));
      });
      return saved;
    },
    [refresh]
  );

  const deleteQuotation = useCallback(
    (id) => {
      removeQuotation(id);
      refresh();
      deleteQuotationRemote(id);
    },
    [refresh]
  );

  const duplicateQuotation = useCallback(
    (id) => {
      const copy = duplicateInStorage(id);
      refresh();
      if (copy) upsertQuotation(copy);
      return copy;
    },
    [refresh]
  );

  const saveConfig = useCallback((next) => {
    persistConfig(next);
    setConfig(next);
    upsertConfig(next);
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = resetConfigStorage();
    setConfig(fresh);
    upsertConfig(fresh);
  }, []);

  const value = useMemo(
    () => ({
      config,
      saveConfig,
      resetConfig,
      quotations,
      refresh,
      saveQuotation,
      deleteQuotation,
      duplicateQuotation,
      showToast,
      toast,
      syncState,
    }),
    [
      config,
      quotations,
      toast,
      syncState,
      saveConfig,
      resetConfig,
      saveQuotation,
      deleteQuotation,
      duplicateQuotation,
      refresh,
      showToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
