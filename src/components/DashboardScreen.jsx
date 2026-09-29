import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieIcon,
  Repeat,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Download
} from 'lucide-react';
import EvidenceBadge from './EvidenceBadge';

export default function DashboardScreen({
  metrics,
  categorizedTransactions,
  recurringExpenses,
  anomalies,
  onProceedToBrief
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, CREDITS, DEBITS, RECURRING, ANOMALIES

  const {
    totalIncome = 0,
    totalExpenses = 0,
    netCashFlow = 0,
    savingsRate = 0,
    spendingByCategory = [],
    topSpendingCategory = { category: 'None', total: 0, percentage: 0 },
    totalTransactions = 0,
    creditCount = 0,
    debitCount = 0
  } = metrics;

  const isNetPositive = netCashFlow >= 0;

  // Filtered transactions for the ledger
  const filteredTransactions = categorizedTransactions.filter(tx => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.amount.toString().includes(searchQuery) ||
      tx.date.includes(searchQuery);

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) return false;

    // Tab filter
    if (activeTab === 'CREDITS') return tx.type === 'CREDIT';
    if (activeTab === 'DEBITS') return tx.type === 'DEBIT';
    if (activeTab === 'RECURRING') {
      return recurringExpenses.some(r =>
        tx.description.toLowerCase().includes(r.merchant) ||
        r.rawDescription.toLowerCase().includes(tx.description.toLowerCase())
      );
    }
    if (activeTab === 'ANOMALIES') {
      return anomalies.some(a => a.transaction.id === tx.id);
    }

    return true;
  });

  // Category Color Palette
  const categoryColors = {
    Subscriptions: '#8b5cf6',
    Food: '#f59e0b',
    Shopping: '#06b6d4',
    Transport: '#3b82f6',
    Utilities: '#10b981',
    Healthcare: '#ec4899',
    Entertainment: '#f43f5e',
    'Rent/Housing': '#6366f1',
    Income: '#10b981',
    Other: '#64748b'
  };

  return (
    <div className="dashboard-screen" style={{ maxWidth: '1180px', margin: '0 auto' }}>
      {/* Top Banner & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
              Executive Financial Overview
            </h2>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Mathematical calculations verified across {totalTransactions} ledger records. Zero synthetic or extrapolated figures.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onProceedToBrief}
        >
          <Sparkles size={15} />
          <span>Generate Executive AI Brief</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* 1. Total Income */}
        <div className="kpi-card glow-income">
          <div className="kpi-header">
            <span className="kpi-label">Recorded Income (Credits)</span>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <div className="kpi-value positive mono-num">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className="kpi-subtext">
            <TrendingUp size={13} color="#059669" />
            <span>{creditCount} verified incoming payout{creditCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* 2. Total Expenses */}
        <div className="kpi-card glow-expense">
          <div className="kpi-header">
            <span className="kpi-label">Recorded Expenses (Debits)</span>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <div className="kpi-value mono-num" style={{ color: '#DC2626' }}>
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="kpi-subtext">
            <TrendingDown size={13} color="#DC2626" />
            <span>{debitCount} verified outgoing debit{debitCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* 3. Net Cash Flow */}
        <div className="kpi-card glow-cashflow">
          <div className="kpi-header">
            <span className="kpi-label">Net Recorded Cash Flow</span>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <div className={`kpi-value mono-num ${isNetPositive ? 'positive' : 'negative'}`}>
            {isNetPositive ? '+' : '-'}₹{Math.abs(netCashFlow).toLocaleString('en-IN')}
          </div>
          <div className="kpi-subtext">
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isNetPositive ? '#059669' : '#DC2626'
            }} />
            <span>{isNetPositive ? `${savingsRate}% Capital Retained (Surplus)` : 'Deficit burn recorded in this statement'}</span>
          </div>
        </div>

        {/* 4. Top Spending Category */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Primary Spend Driver</span>
            <EvidenceBadge type="CALCULATED" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.55rem', color: 'var(--text-main)' }}>
            {topSpendingCategory.category}
          </div>
          <div className="kpi-subtext mono-num">
            ₹{topSpendingCategory.total.toLocaleString('en-IN')} • {topSpendingCategory.percentage}% of debits
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="dashboard-grid-2">
        {/* Section A: Spending Pattern Breakdown */}
        <div className="fin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieIcon size={17} color="var(--accent-teal)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Spending Allocation by Category
              </h3>
            </div>
            <EvidenceBadge type="CALCULATED" />
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Categorical allocation across {spendingByCategory.length} verified expenditure domains.
          </p>

          {/* Horizontal Proportional Distribution Bar */}
          {spendingByCategory.length > 0 && (
            <div style={{
              display: 'flex',
              height: '10px',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              background: '#F1F5F9',
              marginBottom: '1.5rem'
            }}>
              {spendingByCategory.map(cat => {
                const color = categoryColors[cat.category] || '#64748b';
                return (
                  <div
                    key={cat.category}
                    title={`${cat.category}: ₹${cat.total.toLocaleString('en-IN')} (${cat.percentage}%)`}
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: color,
                      transition: 'width 0.6s ease'
                    }}
                  />
                );
              })}
            </div>
          )}

          {spendingByCategory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              No debit transactions recorded in this statement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {spendingByCategory.map(cat => {
                const color = categoryColors[cat.category] || '#64748b';
                return (
                  <div key={cat.category} className="cat-progress-item" style={{ marginBottom: 0 }}>
                    <div className="cat-progress-header">
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        <span style={{ color: 'var(--text-main)' }}>{cat.category}</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>• {cat.count} txs</span>
                      </span>
                      <span className="mono-num" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                        ₹{cat.total.toLocaleString('en-IN')}
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem', marginLeft: '0.45rem' }}>
                          {cat.percentage}%
                        </span>
                      </span>
                    </div>
                    <div className="cat-bar-track">
                      <div
                        className="cat-bar-fill"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section B: Recurring Commitments */}
        <div className="fin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Repeat size={17} color="var(--color-warning)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Recurring Commitments
              </h3>
            </div>
            <EvidenceBadge type="DETECTED" />
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Cadence algorithm detecting repeat charges with consistent amounts and periodic billing cycles.
          </p>

          {recurringExpenses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}>
              <CheckCircle size={22} color="var(--color-success)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>No Recurring Charges Flagged</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                All outgoing debits in this statement appear as isolated one-off transactions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recurringExpenses.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {rec.rawDescription}
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        padding: '0.1rem 0.45rem',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        {rec.cadence}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.25rem', fontWeight: 600 }}>
                      {rec.label} • {rec.occurrences} billing events recorded
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-num" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      ₹{rec.averageAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      per cycle
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section C: Anomaly Inspection Center */}
      <div className="fin-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={17} color="var(--color-warning)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Anomaly Inspection Center
            </h3>
          </div>
          <EvidenceBadge type="DETECTED" />
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Explainable heuristics flagging unusually large transactions or duplicate-looking charges requiring inspection. (Strictly non-accusatory; never assumes fraud).
        </p>

        {anomalies.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} color="var(--color-success)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-success)', fontWeight: 600 }}>
                Zero statistical anomalies or rapid duplicate charges detected in this statement.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {anomalies.map((anom, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFBEB',
                  borderLeft: '4px solid #D97706',
                  borderRight: '1px solid #FDE68A',
                  borderTop: '1px solid #FDE68A',
                  borderBottom: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                      {anom.transaction.description}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #FDE68A',
                      padding: '0.12rem 0.5rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {anom.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.3rem' }}>
                    {anom.reasons.join(' • ')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Date: {anom.transaction.date} | Category: {anom.transaction.category}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="mono-num" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626' }}>
                    ₹{anom.transaction.amount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Manual Inspection Recommended
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section D: Master Transaction Ledger */}
      <div className="fin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Master Transaction Ledger
              </h3>
              <EvidenceBadge type="CALCULATED" />
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Deterministic categorization applied to all {categorizedTransactions.length} records.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              gap: '0.5rem'
            }}>
              <Search size={14} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search description, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.825rem',
                  width: '180px'
                }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '0.45rem 0.75rem',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="Income">Income</option>
              <option value="Food">Food</option>
              <option value="Shopping">Shopping</option>
              <option value="Transport">Transport</option>
              <option value="Utilities">Utilities</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Rent/Housing">Rent/Housing</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          {[
            { id: 'ALL', label: `All (${categorizedTransactions.length})` },
            { id: 'CREDITS', label: `Income (+${creditCount})` },
            { id: 'DEBITS', label: `Expenses (-${debitCount})` },
            { id: 'RECURRING', label: `Recurring (${recurringExpenses.length})` },
            { id: 'ANOMALIES', label: `Flagged (${anomalies.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--accent-teal)' : 'var(--bg-card-subtle)',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                border: `1px solid ${activeTab === tab.id ? 'var(--accent-teal)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Classification Evidence</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isAnomaly = anomalies.some(a => a.transaction.id === tx.id);
                const color = categoryColors[tx.category] || '#64748b';
                return (
                  <tr key={tx.id} style={{ background: isAnomaly ? '#FFFBEB' : undefined }}>
                    <td className="mono-num" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {tx.date}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span>{tx.description}</span>
                        {isAnomaly && (
                          <span title="Potential anomaly flagged" style={{ fontSize: '0.85rem' }}>
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-chip">
                        <span className="category-dot" style={{ backgroundColor: color }} />
                        {tx.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.76rem', color: 'var(--text-dim)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.ruleMatched}>
                      {tx.ruleMatched}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: tx.type === 'CREDIT' ? '#ECFDF5' : '#FEF2F2',
                        color: tx.type === 'CREDIT' ? '#059669' : '#DC2626',
                        border: `1px solid ${tx.type === 'CREDIT' ? '#A7F3D0' : '#FECACA'}`
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="mono-num" style={{ fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right', color: tx.type === 'CREDIT' ? '#059669' : 'var(--text-main)' }}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
