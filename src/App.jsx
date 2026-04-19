import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateQuotation from './pages/CreateQuotation.jsx';
import AllQuotations from './pages/AllQuotations.jsx';
import QuotationDetail from './pages/QuotationDetail.jsx';
import Settings from './pages/Settings.jsx';

const App = () => (
  <AppProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="quotations" element={<AllQuotations />} />
        <Route path="quotations/new" element={<CreateQuotation />} />
        <Route path="quotations/:id" element={<QuotationDetail />} />
        <Route path="quotations/:id/edit" element={<CreateQuotation />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  </AppProvider>
);

export default App;
