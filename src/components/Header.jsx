import React from 'react';
import { Layers, Key, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import PipelineTracker from './PipelineTracker';

export default function Header({ currentStep, setStep, maxStepReached, onReset, onOpenKeyModal, hasApiKey }) {
  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/sample_freelance_transactions.csv';
    link.download = 'sample_freelance_transactions.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="app-header">
      <div className="brand-container" onClick={onReset} title="FINLENS Home">
        <div className="brand-logo-icon">
          <Layers size={18} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-name">
            FINLENS
            <span className="brand-tag">Executive</span>
          </div>
        </div>
      </div>

      <PipelineTracker
        currentStep={currentStep}
        setStep={setStep}
        maxStepReached={maxStepReached}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleDownloadSample}
          title="Download Sample CSV for testing"
        >
          <Download size={13} />
          <span>Sample CSV</span>
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={onOpenKeyModal}
          title="Configure Gemini API Key"
          style={{
            borderColor: hasApiKey ? 'rgba(124, 58, 237, 0.4)' : 'var(--border-subtle)',
            color: hasApiKey ? '#7c3aed' : 'var(--text-muted)'
          }}
        >
          <Key size={13} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {hasApiKey && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed' }} />
            )}
            {hasApiKey ? 'Gemini Active' : 'AI Key'}
          </span>
        </button>

        {currentStep !== 'upload' && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onReset}
            title="Upload new statement"
          >
            <RotateCcw size={13} />
            <span>New File</span>
          </button>
        )}
      </div>
    </header>
  );
}
