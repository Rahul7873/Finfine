import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  ArrowLeft,
  Key,
  ShieldCheck,
  RefreshCw,
  Printer,
  FileText,
  Clock,
  Compass,
  CheckSquare
} from 'lucide-react';
import EvidenceBadge from './EvidenceBadge';

export default function AIBriefScreen({
  brief,
  isAiPowered,
  metrics,
  onBackToDashboard,
  onOpenKeyModal,
  onRefreshBrief,
  isRefreshing
}) {
  const [copied, setCopied] = useState(false);

  const {
    whatHappened = '',
    whyItMatters = '',
    worthReviewing = [],
    dataLimitations = '',
    source = 'DETERMINISTIC_ENGINE'
  } = brief || {};

  const handleCopyMarkdown = () => {
    const md = `# FINLENS Executive Financial Briefing
**Document Type:** Confidential Financial Memo
**Evidence Standard:** Strict Deterministic Fact Layer
**Engine Source:** ${isAiPowered ? 'Google Gemini 2.5 Flash LLM' : 'FINLENS Deterministic Financial Intelligence'}
**Statement Date:** ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

---

## 1. Executive Summary & Factual Record
${whatHappened}

## 2. Strategic Implications for Freelance Cash Flow
${whyItMatters}

## 3. High-Priority Audit Checklist
${worthReviewing.map(item => `- [ ] ${item}`).join('\n')}

---

### Data Limitations & Boundary Notice
> ${dataLimitations}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="brief-screen" style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
              Executive Financial Brief
            </h2>
            <EvidenceBadge type="AI_INTERPRETATION" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Factual synthesis and conservative cash flow interpretation derived directly from calculated records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyMarkdown}
            title="Copy as Markdown memo"
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Memo'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrint}
            title="Print or export as PDF"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={onRefreshBrief}
            disabled={isRefreshing}
            title="Re-synthesize executive brief"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* Intelligence Engine Status Pill */}
      <div style={{
        background: isAiPowered ? 'var(--color-ai-bg)' : 'var(--bg-card-subtle)',
        border: `1px solid ${isAiPowered ? 'var(--color-ai-border)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={16} color={isAiPowered ? '#7C3AED' : '#0284C7'} />
          <span style={{ fontSize: '0.84rem', color: isAiPowered ? '#6B21A8' : 'var(--text-muted)' }}>
            Intelligence Engine: <strong>{isAiPowered ? 'Google Gemini 2.5 Flash' : 'Built-in Deterministic Intelligence (Section 15)'}</strong>
          </span>
        </div>

        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: '0.78rem', color: 'var(--accent-teal)' }}
          onClick={onOpenKeyModal}
        >
          <Key size={13} />
          <span>{isAiPowered ? 'Manage Gemini Key' : 'Connect Custom Gemini Key'}</span>
        </button>
      </div>

      {/* Institutional Executive Brief Card */}
      <div className="ai-brief-card">
        {/* Memo Meta Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '1.25rem',
          marginBottom: '1.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 700
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={13} /> Financial Briefing Memo
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={13} /> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Section 1: What Happened */}
        <div className="brief-block">
          <div className="brief-title">
            <span style={{ color: 'var(--accent-teal)' }}>📊</span>
            <h3>1. What Happened</h3>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <p className="brief-text">
            {whatHappened}
          </p>
        </div>

        {/* Section 2: Why It Matters */}
        <div className="brief-block">
          <div className="brief-title">
            <span style={{ color: '#7C3AED' }}>💡</span>
            <h3>2. Why It Matters</h3>
            <EvidenceBadge type="AI_INTERPRETATION" />
          </div>
          <p className="brief-text">
            {whyItMatters}
          </p>
        </div>

        {/* Section 3: Worth Reviewing */}
        <div className="brief-block">
          <div className="brief-title">
            <span style={{ color: 'var(--color-warning)' }}>🔍</span>
            <h3>3. Action Checklist & Attention Items</h3>
            <EvidenceBadge type="DETECTED" />
          </div>
          <ul className="review-list">
            {worthReviewing.map((item, idx) => (
              <li key={idx}>
                <CheckSquare size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 4: Data Limitations */}
        <div className="brief-block">
          <div className="limitation-alert">
            <ShieldCheck size={18} color="var(--text-dim)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                Data Boundaries & Regulatory Scope Notice
              </strong>
              {dataLimitations}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={15} />
          <span>Back to Financial Overview</span>
        </button>
      </div>
    </div>
  );
}
