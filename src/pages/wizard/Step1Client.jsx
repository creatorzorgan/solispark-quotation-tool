import React from 'react';
import { Field } from '../../components/ui.jsx';
import PropertyMap from '../../components/PropertyMap.jsx';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import { PROPERTY_TYPES, CLIENT_CATEGORIES } from '../../data/defaultConfig.js';
import { Satellite } from 'lucide-react';

const Step1Client = ({ draft, updateClient }) => {
  const c = draft.client;

  // Persist the roof capture back onto the draft so the full quotation object
  // (which is what syncs to Supabase) carries both the image and the frame.
  const handleCapture = ({ snapshot, location }) => {
    updateClient({ roofSnapshot: snapshot, roofLocation: location });
  };
  const handleClear = () => {
    updateClient({ roofSnapshot: null, roofLocation: null });
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
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 rounded-md bg-navy-dark flex items-center justify-center shrink-0">
            <Satellite className="w-5 h-5 text-gold-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-navy-dark">Property Satellite View</h3>
            <p className="text-sm text-cream-600">
              Search the address, pan and zoom to frame the roof, then capture a snapshot to embed
              in the proposal's cover letter.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <ErrorBoundary label="The satellite map">
            <PropertyMap
              initialAddress={c.address}
              roofSnapshot={c.roofSnapshot}
              roofLocation={c.roofLocation}
              onCapture={handleCapture}
              onClear={handleClear}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default Step1Client;
