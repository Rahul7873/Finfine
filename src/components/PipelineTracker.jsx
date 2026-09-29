import React from 'react';
import { UploadCloud, CheckCircle2, LayoutDashboard, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 'upload', label: '1. Source', icon: UploadCloud },
  { id: 'validation', label: '2. Audit', icon: CheckCircle2 },
  { id: 'dashboard', label: '3. Analytics', icon: LayoutDashboard },
  { id: 'brief', label: '4. Executive Brief', icon: Sparkles }
];

export default function PipelineTracker({ currentStep, setStep, maxStepReached }) {
  const stepIndices = { upload: 1, validation: 2, dashboard: 3, brief: 4 };
  const currentIdx = stepIndices[currentStep] || 1;
  const maxIdx = stepIndices[maxStepReached] || 1;

  return (
    <nav className="pipeline-nav" aria-label="FINLENS Workflow Pipeline">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === step.id;
        const isCompleted = stepNum < currentIdx || (stepNum <= maxIdx && !isActive);
        const isClickable = stepNum <= maxIdx;
        const Icon = step.icon;

        return (
          <button
            key={step.id}
            type="button"
            className={`pipeline-step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            onClick={() => isClickable && setStep(step.id)}
            disabled={!isClickable}
            title={isClickable ? `Jump to ${step.label}` : 'Complete prior steps first'}
          >
            <span className="step-num">
              {isCompleted && !isActive ? '✓' : stepNum}
            </span>
            <Icon size={13} />
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
