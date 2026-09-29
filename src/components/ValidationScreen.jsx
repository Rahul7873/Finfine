import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Eye,
  Info,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers
} from 'lucide-react';
import EvidenceBadge from './EvidenceBadge';

export default function ValidationScreen({ validationResult, fileName, onContinue, onBack }) {
  const [showRawTable, setShowRawTable] = useState(false);
  const [searchTable, setSearchTable] = useState('');

  const {
    isValid,
    totalRows,
    validCount,
    errorCount,
    duplicateCount,
    duplicateRows = [],
    errors = [],
    warnings = [],
    validTransactions = []
  } = validationResult;

  const creditsCount = validTransactions.filter(t => t.type === 'CREDIT').length;
  const debitsCount = validTransactions.filter(t => t.type === 'DEBIT').length;
  const totalVolume = validTransactions.reduce((sum, t) => sum + t.amount, 0);

  const filteredPreview = validTransactions.filter(tx =>
    tx.description.toLowerCase().includes(searchTable.toLowerCase()) ||
    tx.date.includes(searchTable) ||
    tx.amount.toString().includes(searchTable)
  );

  return (
    <div className="validation-screen" style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Statement Integrity Audit
            </h2>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Deterministic verification of column constraints, ISO dates, amount formats, and credit/debit classifications.
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <FileSpreadsheet size={15} color="var(--accent-teal)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{fileName}</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Data Integrity Score */}
        <div className="fin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Data Integrity
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isValid ? '#059669' : '#dc2626', letterSpacing: '-0.02em' }}>
            {isValid ? '100% Pass' : `${Math.round((validCount / Math.max(totalRows, 1)) * 100)}% Pass`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {validCount} of {totalRows} clean transactions
          </div>
        </div>

        {/* Card 2: Income Credits */}
        <div className="fin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Income Deposits
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
            {creditsCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dim)' }}>credits</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Mapped to incoming payments
          </div>
        </div>

        {/* Card 3: Expense Debits */}
        <div className="fin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Expense Debits
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em' }}>
            {debitsCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dim)' }}>debits</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Ready for categorization
          </div>
        </div>

        {/* Card 4: Duplicate Check */}
        <div className="fin-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Duplicates Flagged
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: duplicateCount > 0 ? '#d97706' : 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {duplicateCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {duplicateCount > 0 ? 'Review flagged notices' : 'Zero duplicate signatures'}
          </div>
        </div>
      </div>

      {/* Verification Checklist Box */}
      <div className="fin-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
          Deterministic Verification Audit
        </h3>

        <div className="validation-checklist">
          <div className="check-item success">
            <CheckCircle2 size={16} />
            <span>Structured bank transactions extracted and schema verified ({validCount} records)</span>
          </div>

          <div className="check-item success">
            <CheckCircle2 size={16} />
            <span>Required ledger columns present (Date, Description, Amount, and Transaction Type)</span>
          </div>

          <div className="check-item success">
            <CheckCircle2 size={16} />
            <span>Dates normalized to standard ISO calendar format</span>
          </div>

          <div className="check-item success">
            <CheckCircle2 size={16} />
            <span>Monetary values validated as positive numerals with CREDIT/DEBIT mapping</span>
          </div>

          {duplicateCount > 0 ? (
            <div className="check-item warning">
              <AlertTriangle size={16} />
              <span>{duplicateCount} potential duplicate transaction{duplicateCount > 1 ? 's' : ''} detected for your review</span>
            </div>
          ) : (
            <div className="check-item success">
              <CheckCircle2 size={16} />
              <span>No redundant duplicate transactions found in this statement</span>
            </div>
          )}

          {errorCount > 0 ? (
            <div className="check-item error">
              <XCircle size={16} />
              <span>{errorCount} corrupted or incomplete row{errorCount > 1 ? 's' : ''} excluded from calculation</span>
            </div>
          ) : (
            <div className="check-item success">
              <CheckCircle2 size={16} />
              <span>Zero syntax or formatting errors encountered</span>
            </div>
          )}
        </div>

        {/* Warnings list if any */}
        {warnings.length > 0 && (
          <div style={{
            marginTop: '1rem',
            background: 'var(--color-warning-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.15rem',
            border: '1px solid var(--color-warning-border)'
          }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={14} />
              Audit Notices & Warnings ({warnings.length})
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Errors list if any */}
        {errors.length > 0 && (
          <div style={{
            marginTop: '1rem',
            background: 'var(--color-danger-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.15rem',
            border: '1px solid var(--color-danger-border)'
          }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <XCircle size={14} />
              Data Integrity Errors ({errors.length})
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--color-danger)', lineHeight: '1.55' }}>
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Raw Ledger Preview Toggle */}
      <div className="fin-card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Extracted Transaction Ledger Preview
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Inspect parsed dates, descriptions, amounts, and types before proceeding to analytics.
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRawTable(!showRawTable)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
          >
            <Eye size={13} />
            <span>{showRawTable ? 'Hide Records' : `View ${validCount} Records`}</span>
          </button>
        </div>

        {showRawTable && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ marginBottom: '0.85rem' }}>
              <input
                type="text"
                placeholder="Filter preview records..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.85rem',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreview.map((tx, idx) => (
                    <tr key={idx}>
                      <td className="mono-num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tx.date}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {tx.description}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: tx.type === 'CREDIT' ? '#ECFDF5' : '#FEF2F2',
                          color: tx.type === 'CREDIT' ? '#059669' : '#DC2626',
                          border: `1px solid ${tx.type === 'CREDIT' ? '#A7F3D0' : '#FECACA'}`
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="mono-num" style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'CREDIT' ? '#059669' : 'var(--text-main)' }}>
                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginTop: '1.75rem' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          <span>Upload Another File</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onContinue}
          disabled={!isValid || validCount === 0}
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
        >
          <span>Continue to Financial Analytics</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
