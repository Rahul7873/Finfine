import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Shield,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Lock,
  Building2
} from 'lucide-react';
import {
  SAMPLE_FREELANCER_CSV,
  SAMPLE_RECURRING_CREEP_CSV,
  SAMPLE_BANK_STATEMENT_ROWS,
  SAMPLE_PDF_STATEMENT_TEXT,
  SAMPLE_PHONEPE_STATEMENT_ROWS,
  SAMPLE_PAYTM_STATEMENT_ROWS
} from '../data/sampleDatasets';
import { parseExcelData, parsePdfStatementText } from '../utils/statementParser';

export default function UploadScreen({ onDataLoaded, onError }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Helper: process standard CSV text
  const processCsvContent = (csvText, fileName = 'uploaded_transactions.csv') => {
    setIsProcessing(true);
    setProcessingStatus('Parsing CSV transaction records...');
    setUploadError(null);

    try {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          setIsProcessing(false);
          setProcessingStatus('');

          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            setUploadError(`Failed to parse CSV: ${results.errors[0].message}`);
            return;
          }

          if (!results.data || results.data.length === 0) {
            setUploadError('The uploaded CSV file contains no transaction rows.');
            return;
          }

          onDataLoaded({
            fileName,
            rawText: csvText,
            rows: results.data,
            fileType: 'csv'
          });
        },
        error: (err) => {
          setIsProcessing(false);
          setProcessingStatus('');
          setUploadError(`Error reading CSV file: ${err.message}`);
        }
      });
    } catch (err) {
      setIsProcessing(false);
      setProcessingStatus('');
      setUploadError(`Parsing failed: ${err.message}`);
    }
  };

  // Helper: process Excel file (.xlsx, .xls)
  const processExcelFile = async (file) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing Excel statement & extracting Credit/Debit columns...');
    setUploadError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Client-side parsing via statementParser
      let extractedRows = null;
      try {
        extractedRows = parseExcelData(arrayBuffer);
      } catch (clientErr) {
        console.warn('Client-side Excel parsing fallback to server API:', clientErr.message);
      }

      if (extractedRows && extractedRows.length > 0) {
        setIsProcessing(false);
        setProcessingStatus('');
        onDataLoaded({
          fileName: file.name,
          rows: extractedRows,
          fileType: 'excel'
        });
        return;
      }

      // Backend fallback
      setProcessingStatus('Processing through backend statement parser...');
      const base64 = await bufferToBase64(arrayBuffer);

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileData: base64
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error ${res.status}`);
      }

      const data = await res.json();
      setIsProcessing(false);
      setProcessingStatus('');

      onDataLoaded({
        fileName: file.name,
        rows: data.rows,
        fileType: 'excel'
      });
    } catch (err) {
      setIsProcessing(false);
      setProcessingStatus('');
      setUploadError(`Excel Parsing Failed: ${err.message}`);
    }
  };

  // Helper: process PDF bank statement (.pdf)
  const processPdfFile = async (file) => {
    setIsProcessing(true);
    setProcessingStatus('Extracting transactions from PDF bank statement...');
    setUploadError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = await bufferToBase64(arrayBuffer);

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: 'application/pdf',
          fileData: base64
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error ${res.status}`);
      }

      const data = await res.json();
      setIsProcessing(false);
      setProcessingStatus('');

      if (!data.rows || data.rows.length === 0) {
        throw new Error('No transaction rows could be extracted from this PDF statement.');
      }

      onDataLoaded({
        fileName: file.name,
        rows: data.rows,
        fileType: 'pdf'
      });
    } catch (err) {
      setIsProcessing(false);
      setProcessingStatus('');
      setUploadError(`PDF Statement Parsing Failed: ${err.message}`);
    }
  };

  const processSelectedFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();

    if (name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          processCsvContent(content, file.name);
        }
      };
      reader.onerror = () => setUploadError('Unable to read selected CSV file.');
      reader.readAsText(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      processExcelFile(file);
    } else if (name.endsWith('.pdf')) {
      processPdfFile(file);
    } else {
      setUploadError('Unsupported file format. Please upload a CSV (.csv), Excel (.xlsx, .xls), or PDF (.pdf) bank statement.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const bufferToBase64 = (buffer) => {
    return new Promise((resolve) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(window.btoa(binary));
    });
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_FREELANCER_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_freelance_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="upload-screen">
      {/* Hero Header */}
      <div className="hero-section">
        <div className="hero-pill-badge">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
          Local Zero-Knowledge Financial Engine
        </div>

        <h1 className="hero-title">
          Institutional Intelligence for <span className="gradient-text">Your Bank Statements</span>
        </h1>

        <p className="hero-subtitle">
          Directly parse Indian bank statements (HDFC, SBI, ICICI, Axis, Kotak), Excel exports, and UPI transactions into an explainable cash flow audit and executive brief.
        </p>

        {/* Accepted Formats Tags with PhonePe & Paytm UPI */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.25rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <FileCode size={13} color="#0284c7" /> CSV Ledger
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <FileSpreadsheet size={13} color="#059669" /> Excel (.xlsx, .xls)
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <FileText size={13} color="#7c3aed" /> PDF Statements
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#F3E8FF',
            border: '1px solid #DDD6FE',
            borderRadius: 'var(--radius-full)',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#6B21A8',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Sparkles size={13} color="#7C3AED" /> PhonePe UPI
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#E0F2FE',
            border: '1px solid #BAE6FD',
            borderRadius: 'var(--radius-full)',
            padding: '0.3rem 0.8rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0369A1',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Sparkles size={13} color="#0284C7" /> Paytm Passbook
          </span>
        </div>
      </div>

      {uploadError && (
        <div style={{
          maxWidth: '720px',
          margin: '0 auto 1.5rem',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          color: '#b91c1c'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem', color: '#991b1b' }}>Statement Parsing Issue</div>
            <div style={{ fontSize: '0.84rem', lineHeight: '1.45', color: '#b91c1c' }}>{uploadError}</div>
          </div>
        </div>
      )}

      {/* Modern Interactive Dropzone */}
      <div
        className={`dropzone-container ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, .pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="dropzone-icon-box">
          {isProcessing ? (
            <Loader2 size={30} className="animate-spin" />
          ) : (
            <UploadCloud size={30} strokeWidth={2.2} />
          )}
        </div>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {isProcessing ? 'Analyzing Document Structure...' : 'Drop your bank or UPI statement here'}
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
          {isProcessing
            ? processingStatus || 'Extracting credit and debit transactions...'
            : 'Supports PhonePe, Paytm, Google Pay, CSV ledgers, Excel workbooks, and digital PDF bank statements.'}
        </p>

        <button
          type="button"
          className="btn-primary"
          style={{ pointerEvents: 'none' }}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing Statement...' : 'Select Statement File'}
        </button>
      </div>

      {/* Realistic One-Click Verified Demo Datasets including PhonePe & Paytm */}
      <div style={{ maxWidth: '880px', margin: '2.5rem auto 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
            One-Click Verified Demo Statements
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDownloadSample}
            style={{ fontSize: '0.76rem', padding: '0.2rem 0.55rem' }}
            title="Download CSV template"
          >
            <Download size={12} />
            <span>Download Template</span>
          </button>
        </div>

        <div className="sample-cards-deck" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {/* Card 1: PhonePe UPI Statement */}
          <div
            className="sample-statement-card"
            onClick={() => {
              onDataLoaded({
                fileName: 'phonepe_upi_statement.csv',
                rows: SAMPLE_PHONEPE_STATEMENT_ROWS,
                fileType: 'csv'
              });
            }}
          >
            <div>
              <span className="bank-badge" style={{ background: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE' }}>
                <Sparkles size={11} /> PhonePe UPI
              </span>
              <div className="bank-title">PhonePe Transaction Statement</div>
              <div className="bank-desc">UPI transfers: Paid to Swiggy, Received from Client, Cashback, and Utilities.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>12 txs • ₹1.01L volume</span>
              <ArrowRight size={14} color="#7C3AED" />
            </div>
          </div>

          {/* Card 2: Paytm Passbook Statement */}
          <div
            className="sample-statement-card"
            onClick={() => {
              onDataLoaded({
                fileName: 'paytm_passbook_statement.xlsx',
                rows: SAMPLE_PAYTM_STATEMENT_ROWS,
                fileType: 'excel'
              });
            }}
          >
            <div>
              <span className="bank-badge" style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                <Sparkles size={11} /> Paytm Passbook
              </span>
              <div className="bank-title">Paytm Wallet & UPI Passbook</div>
              <div className="bank-desc">Activity passbook: Blinkit, Wallet Top-up, Order Refunds, and Client UPI.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>11 txs • ₹64.6K volume</span>
              <ArrowRight size={14} color="#0284C7" />
            </div>
          </div>

          {/* Card 3: HDFC Excel Statement */}
          <div
            className="sample-statement-card"
            onClick={() => {
              onDataLoaded({
                fileName: 'sample_hdfc_bank_statement.xlsx',
                rows: SAMPLE_BANK_STATEMENT_ROWS,
                fileType: 'excel'
              });
            }}
          >
            <div>
              <span className="bank-badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                <FileSpreadsheet size={11} /> Excel Statement
              </span>
              <div className="bank-title">HDFC Bank e-Statement</div>
              <div className="bank-desc">Multi-column layout with separate Withdrawal (Dr) & Deposit (Cr) columns.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>12 txs • ₹1.27L volume</span>
              <ArrowRight size={14} color="#059669" />
            </div>
          </div>

          {/* Card 4: SBI PDF Statement */}
          <div
            className="sample-statement-card"
            onClick={() => {
              try {
                const rows = parsePdfStatementText(SAMPLE_PDF_STATEMENT_TEXT);
                onDataLoaded({
                  fileName: 'sample_sbi_bank_statement.pdf',
                  rows,
                  fileType: 'pdf'
                });
              } catch (err) {
                setUploadError(err.message);
              }
            }}
          >
            <div>
              <span className="bank-badge" style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1' }}>
                <FileText size={11} /> PDF Statement
              </span>
              <div className="bank-title">SBI Bank Statement</div>
              <div className="bank-desc">Tabular bank text parsed into structured credit deposits and debit charges.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>12 txs • Auto-tokenized</span>
              <ArrowRight size={14} color="#475569" />
            </div>
          </div>

          {/* Card 5: Indian Freelancer CSV */}
          <div
            className="sample-statement-card"
            onClick={() => processCsvContent(SAMPLE_FREELANCER_CSV, 'sample_indian_freelancer.csv')}
          >
            <div>
              <span className="bank-badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                <FileCode size={11} /> CSV Ledger
              </span>
              <div className="bank-title">Freelancer Ledger</div>
              <div className="bank-desc">30 transactions covering Upwork, Razorpay, Zomato, AWS, and Rent.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>30 txs • Full Month</span>
              <ArrowRight size={14} color="#1D4ED8" />
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Privacy & Security Callout */}
      <div style={{
        maxWidth: '880px',
        margin: '2rem auto 0',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#059669',
          flexShrink: 0
        }}>
          <Lock size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
            Zero-Knowledge Local Analysis
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            Your bank and UPI statements (PhonePe, Paytm, Google Pay) are processed locally in your browser memory. No bank account numbers, passwords, or personal names are ever transmitted to external servers.
          </div>
        </div>
      </div>
    </div>
  );
}
