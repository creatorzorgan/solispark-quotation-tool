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
} from '../utils/storage.js';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [config, setConfig] = useState(() => getConfig());
  const [quotations, setQuotations] = useState(() => getAllQuotations());
  const [toast, setToast] = useState(null);

  // Expiry sweep on load
  useEffect(() => {
    const updated = sweepExpired(config.payment_terms.proposal_validity_days);
    setQuotations(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => setQuotations(getAllQuotations()), []);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const saveQuotation = useCallback((q) => {
    const saved = persistQuotation(q);
    refresh();
    return saved;
  }, [refresh]);

  const deleteQuotation = useCallback((id) => {
    removeQuotation(id);
    refresh();
  }, [refresh]);

  const duplicateQuotation = useCallback((id) => {
    const copy = duplicateInStorage(id);
    refresh();
    return copy;
  }, [refresh]);

  const saveConfig = useCallback((next) => {
    persistConfig(next);
    setConfig(next);
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = resetConfigStorage();
    setConfig(fresh);
  }, []);

  const value = useMemo(() => ({
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
  }), [config, quotations, toast, saveConfig, resetConfig, saveQuotation, deleteQuotation, duplicateQuotation, refresh, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
