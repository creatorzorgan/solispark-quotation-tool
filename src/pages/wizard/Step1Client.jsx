import React, { useState } from 'react';
import { Field } from '../../components/ui.jsx';
import PropertyMap from '../../components/PropertyMap.jsx';
import RoofImageUpload from '../../components/RoofImageUpload.jsx';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import { PROPERTY_TYPES, CLIENT_CATEGORIES } from '../../data/defaultConfig.js';
import { Satellite, Map, Upload, RotateCcw } from 'lucide-react';

const Step1Client = ({ draft, updateClient }) => {
  const c = draft.client;

  // Two capture methods feed the same roofSnapshot field. The map path is
  // nice when the Maps JS API works for the key; the upload path always
  // works because it bypasses Maps entirely.
  const [mode, setMode] = useState('map');

  const handleCapture = ({ snapshot, location }) => {
    updateClient({ roofSnapshot: snapshot, roofLocation: location });
  };
  const handleClear = () => {
    updateClient({ roofSnapshot: null, roofLocation: null });
  };

  const TabButton = ({ value, icon: Icon, children }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex items-center gap-2 px-4 py-2 rounded-pill text-xs font-bold transition ${
          active
            ? 'bg-gold-primary text-navy-dark shadow-gold'
            : 'bg-white text-cream-600 border border-cream-200 hover:text-navy-dark'
        }`}
      >
        <Icon className="w-4 h-4" />
        {children}
      </button>
    );
  };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-navy-dark mb-1">Client Information</h2>
      <p className="text-cream-600 mb-8">Who is this proposal for?</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Client Full Name *">
          <input
            className="input"
            value={c.fullName}
            onChange={(e) => updateClient({ fullName: e.target.value })}
            placeholder="e.g. Vikram Sharma"
          />
        </Field>
        <Field label="Phone Number *">
          <input
            className="input"
            value={c.phone}
            onChange={(e) => updateClient({ phone: e.target.value })}
            placeholder="+91 98xxx xxxxx"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            className="input"
            value={c.email}
            onChange={(e) => updateClient({ email: e.target.value })}
            placeholder="client@example.com"
          />
        </Field>
        <Field label="Client Category">
          <select
            className="input"
            value={c.category}
            onChange={(e) => updateClient({ category: e.target.value })}
          >
            {CLIENT_CATEGORIES.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="Property Address *" className="md:col-span-2">
          <textarea
            rows={3}
            className="input"
            value={c.address}
            onChange={(e) => updateClient({ address: e.target.value })}
            placeholder="Full installation address including city and pincode"
          />
        </Field>
        <Field label="Property Type">
          <select
            className="input"
            value={c.propertyType}
            onChange={(e) => updateClient({ propertyType: e.target.value })}
          >
            {PROPERTY_TYPES.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* ── Property Satellite View ─────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-cream-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-navy-dark flex items-center justify-center shrink-0">
            <Satellite className="w-5 h-5 text-gold-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-navy-dark">Property Satellite View</h3>
            <p className="text-sm text-cream-600">
              Capture a roof snapshot for the proposal's cover letter — either frame it live on the
              map, or upload a screenshot you took on Google Maps yourself.
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <TabButton value="map" icon={Map}>Interactive Map</TabButton>
          <TabButton value="upload" icon={Upload}>Upload Image</TabButton>
        </div>

        {mode === 'map' ? (
          <ErrorBoundary label="The satellite map">
            <PropertyMap
              initialAddress={c.address}
              roofSnapshot={c.roofSnapshot}
              roofLocation={c.roofLocation}
              onCapture={handleCapture}
              onClear={handleClear}
            />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary label="The image upload">
            <RoofImageUpload onCapture={handleCapture} />
          </ErrorBoundary>
        )}

        {/* Shared preview — visible no matter which mode produced the snapshot */}
        {c.roofSnapshot && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-cream-600">
                Captured Snapshot (embedded in PDF)
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="rounded-xl overflow-hidden shadow-cardHover ring-1 ring-navy-dark/10">
              <img src={c.roofSnapshot} alt="Roof satellite view" className="w-full block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1Client;
