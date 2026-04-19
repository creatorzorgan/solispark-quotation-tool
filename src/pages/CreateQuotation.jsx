import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useQuotationDraft } from '../hooks/useQuotationDraft.js';
import { generateReferenceNumber, getQuotation, newId } from '../utils/storage.js';
import Step1Client from './wizard/Step1Client.jsx';
import Step2Energy from './wizard/Step2Energy.jsx';
import Step3System from './wizard/Step3System.jsx';
import Step4Pricing from './wizard/Step4Pricing.jsx';
import Step5ROI from './wizard/Step5ROI.jsx';
import Step6Preview from './wizard/Step6Preview.jsx';

const STEPS = [
  { id: 1, label: 'Client', component: Step1Client },
  { id: 2, label: 'Energy', component: Step2Energy },
  { id: 3, label: 'System', component: Step3System },
  { id: 4, label: 'Pricing', component: Step4Pricing },
  { id: 5, label: 'ROI', component: Step5ROI },
  { id: 6, label: 'Preview', component: Step6Preview },
];

const CreateQuotation = () => {
  const { config, saveQuotation, showToast } = useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = id ? getQuotation(id) : null;

  const {
    draft,
    update,
    updateClient,
    updateEnergy,
    updateSystem,
    updatePricing,
    setAttachedDocs,
    suggestSystem,
    computed,
    commitPricing,
  } = useQuotationDraft(config, existing || undefined);

  const [step, setStep] = useState(1);

  // When moving from step 2 to step 3, auto-suggest system size if not set
  useEffect(() => {
    if (step === 3 && !draft.system.systemSizeKw) {
      suggestSystem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const StepComponent = STEPS[step - 1].component;

  const handleSaveDraft = () => {
    commitPricing();
    const toSave = {
      ...draft,
      id: draft.id || newId(),
      referenceNumber: draft.referenceNumber || generateReferenceNumber(),
      status: draft.status === 'Accepted' ? 'Accepted' : 'Draft',
    };
    saveQuotation(toSave);
    showToast('Draft saved');
    navigate('/quotations');
  };

  const handleFinalize = (status = 'Sent') => {
    commitPricing();
    const toSave = {
      ...draft,
      id: draft.id || newId(),
      referenceNumber: draft.referenceNumber || generateReferenceNumber(),
      status,
    };
    const saved = saveQuotation(toSave);
    showToast(`Quotation marked as ${status}`);
    navigate(`/quotations/${saved.id}`);
  };

  const canNext = () => {
    if (step === 1) {
      return !!draft.client.fullName && !!draft.client.phone && !!draft.client.address;
    }
    if (step === 2) {
      return !!draft.energy.monthlyBill && !!draft.energy.perUnitRate;
    }
    if (step === 3) {
      return !!draft.system.systemSizeKw && !!draft.system.panelCount;
    }
    return true;
  };

  const next = () => {
    if (step === 4) commitPricing();
    setStep((s) => Math.min(6, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div>
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-navy-dark">
            {existing ? 'Edit Quotation' : 'Create New Quotation'}
          </h1>
          <button onClick={handleSaveDraft} className="btn-ghost text-sm">
            <Save className="w-4 h-4" /> Save Draft
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-pill text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-gold-primary text-navy-dark shadow-gold'
                      : done
                      ? 'bg-navy-dark text-white'
                      : 'bg-white text-cream-600 border border-cream-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      active
                        ? 'bg-navy-dark text-gold-primary'
                        : done
                        ? 'bg-gold-primary text-navy-dark'
                        : 'bg-cream-100 text-cream-600'
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : s.id}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 min-w-[8px] ${done ? 'bg-navy-dark' : 'bg-cream-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className="card p-6 lg:p-8">
        <StepComponent
          draft={draft}
          config={config}
          computed={computed}
          update={update}
          updateClient={updateClient}
          updateEnergy={updateEnergy}
          updateSystem={updateSystem}
          updatePricing={updatePricing}
          setAttachedDocs={setAttachedDocs}
          suggestSystem={suggestSystem}
          onFinalize={handleFinalize}
        />
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-6">
        <button className="btn-outline" onClick={back} disabled={step === 1}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < 6 ? (
          <button className="btn-primary" onClick={next} disabled={!canNext()}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="btn-primary" onClick={() => handleFinalize('Sent')}>
            Generate & Mark Sent <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateQuotation;
