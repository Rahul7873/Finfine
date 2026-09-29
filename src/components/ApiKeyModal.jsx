import React, { useState } from 'react';
import { X, Key, Shield, Sparkles, Check, Trash2 } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveKey('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={20} color="var(--color-ai)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Gemini AI Configuration
            </h3>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: '0.25rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.55' }}>
          FINLENS works 100% out of the box with its built-in deterministic financial engine. You can optionally connect a Google Gemini API key to activate natural language executive synthesis.
        </p>

        <form onSubmit={handleSave}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Google Gemini API Key
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              marginBottom: '1rem'
            }}
          />

          <div style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <Shield size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Your API key is stored locally in your browser memory and never hardcoded or permanently logged.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            {apiKey ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClear}
                style={{ color: '#f87171' }}
              >
                <Trash2 size={14} />
                <span>Remove Key</span>
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
              >
                {savedSuccess ? <Check size={16} /> : <Sparkles size={16} />}
                <span>{savedSuccess ? 'Key Saved!' : 'Save & Enable AI'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
