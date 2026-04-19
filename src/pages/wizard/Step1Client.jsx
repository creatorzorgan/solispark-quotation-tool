import React from 'react';
import { Field } from '../../components/ui.jsx';
import { PROPERTY_TYPES, CLIENT_CATEGORIES } from '../../data/defaultConfig.js';

const Step1Client = ({ draft, updateClient }) => {
  const c = draft.client;
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
    </div>
  );
};

export default Step1Client;
