import React from 'react';
import { Calculator, Search, Sparkles, HelpCircle } from 'lucide-react';

export default function EvidenceBadge({ type, size = 'normal' }) {
  if (type === 'CALCULATED') {
    return (
      <span className="evidence-badge calculated" title="Direct mathematical calculation from uploaded transaction records">
        <Calculator size={11} strokeWidth={2.5} />
        CALCULATED
      </span>
    );
  }

  if (type === 'DETECTED') {
    return (
      <span className="evidence-badge detected" title="Pattern identified using deterministic heuristic rules">
        <Search size={11} strokeWidth={2.5} />
        DETECTED
      </span>
    );
  }

  if (type === 'AI_INTERPRETATION' || type === 'AI INTERPRETATION') {
    return (
      <span className="evidence-badge ai-interpretation" title="Natural language synthesis and cautious interpretation">
        <Sparkles size={11} strokeWidth={2.5} />
        AI INTERPRETATION
      </span>
    );
  }

  return (
    <span className="evidence-badge assumption" title="Unverified assumption or user note">
      <HelpCircle size={11} strokeWidth={2.5} />
      UNVERIFIED ASSUMPTION
    </span>
  );
}
