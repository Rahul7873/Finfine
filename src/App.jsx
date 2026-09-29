import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadScreen from './components/UploadScreen';
import ValidationScreen from './components/ValidationScreen';
import DashboardScreen from './components/DashboardScreen';
import AIBriefScreen from './components/AIBriefScreen';
import ApiKeyModal from './components/ApiKeyModal';
import {
  validateCSV,
  categorizeTransactions,
  calculateFinancialMetrics,
  detectRecurringExpenses,
  detectAnomalies,
  generateDeterministicBrief
} from './utils/engine';

export default function App() {
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload' | 'validation' | 'dashboard' | 'brief'
  const [maxStepReached, setMaxStepReached] = useState('upload');

  const [fileName, setFileName] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [categorizedTransactions, setCategorizedTransactions] = useState([]);
  const [financialMetrics, setFinancialMetrics] = useState(null);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [aiBrief, setAiBrief] = useState(null);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finlens_gemini_api_key') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isAiPowered, setIsAiPowered] = useState(false);
  const [isRefreshingBrief, setIsRefreshingBrief] = useState(false);

  // Sync API Key to localStorage
  const handleSaveApiKey = (key) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('finlens_gemini_api_key', key);
    } else {
      localStorage.removeItem('finlens_gemini_api_key');
    }
  };

  // Step 1 -> Step 2: CSV Data Loaded & Validated
  const handleDataLoaded = async ({ fileName: name, rows }) => {
    setFileName(name);

    let valResult = null;
    try {
      // Try backend endpoint first
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      if (res.ok) {
        valResult = await res.json();
      }
    } catch {
      // Graceful fallback to client-side engine
    }

    if (!valResult) {
      valResult = validateCSV(rows);
    }

    setValidationResult(valResult);
    setCurrentStep('validation');
    setMaxStepReached('validation');
  };

  // Step 2 -> Step 3: Categorize & Compute Metrics
  const handleContinueToAnalysis = async () => {
    if (!validationResult || !validationResult.validTransactions) return;

    const txs = validationResult.validTransactions;
    let analysisData = null;

    try {
      // Try backend endpoint
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txs })
      });
      if (res.ok) {
        analysisData = await res.json();
      }
    } catch {
      // Fallback
    }

    if (analysisData) {
      setCategorizedTransactions(analysisData.categorized);
      setFinancialMetrics(analysisData.metrics);
      setRecurringExpenses(analysisData.recurring);
      setAnomalies(analysisData.anomalies);
      generateBrief(analysisData.metrics, analysisData.recurring, analysisData.anomalies);
    } else {
      // Client-side fallback
      const categorized = categorizeTransactions(txs);
      const metrics = calculateFinancialMetrics(categorized);
      const recurring = detectRecurringExpenses(categorized);
      const anom = detectAnomalies(categorized);

      setCategorizedTransactions(categorized);
      setFinancialMetrics(metrics);
      setRecurringExpenses(recurring);
      setAnomalies(anom);
      generateBrief(metrics, recurring, anom);
    }

    setCurrentStep('dashboard');
    setMaxStepReached('dashboard');
  };

  // Generate / Refresh AI Brief (Section 15 & 16)
  const generateBrief = async (metrics, recurring, anom) => {
    setIsRefreshingBrief(true);
    let briefResult = null;

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          categories: metrics.spendingByCategory,
          recurring,
          anomalies: anom,
          userApiKey: apiKey
        })
      });

      if (res.ok) {
        briefResult = await res.json();
      }
    } catch {
      // Fallback
    }

    if (!briefResult) {
      briefResult = generateDeterministicBrief(
        metrics,
        metrics.spendingByCategory,
        recurring,
        anom
      );
    }

    setAiBrief(briefResult);
    setIsAiPowered(Boolean(briefResult.isAiPowered));
    setIsRefreshingBrief(false);
  };

  const handleRefreshBrief = () => {
    if (financialMetrics) {
      generateBrief(financialMetrics, recurringExpenses, anomalies);
    }
  };

  // Reset to Upload Screen
  const handleReset = () => {
    setCurrentStep('upload');
    setMaxStepReached('upload');
    setFileName('');
    setValidationResult(null);
    setCategorizedTransactions([]);
    setFinancialMetrics(null);
    setRecurringExpenses([]);
    setAnomalies([]);
    setAiBrief(null);
  };

  return (
    <div className="finlens-app">
      <Header
        currentStep={currentStep}
        setStep={setCurrentStep}
        maxStepReached={maxStepReached}
        onReset={handleReset}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        hasApiKey={Boolean(apiKey)}
      />

      <main className="main-content">
        {currentStep === 'upload' && (
          <UploadScreen
            onDataLoaded={handleDataLoaded}
          />
        )}

        {currentStep === 'validation' && validationResult && (
          <ValidationScreen
            validationResult={validationResult}
            fileName={fileName}
            onContinue={handleContinueToAnalysis}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'dashboard' && financialMetrics && (
          <DashboardScreen
            metrics={financialMetrics}
            categorizedTransactions={categorizedTransactions}
            recurringExpenses={recurringExpenses}
            anomalies={anomalies}
            onProceedToBrief={() => {
              setCurrentStep('brief');
              setMaxStepReached('brief');
            }}
          />
        )}

        {currentStep === 'brief' && aiBrief && (
          <AIBriefScreen
            brief={aiBrief}
            isAiPowered={isAiPowered}
            metrics={financialMetrics}
            onBackToDashboard={() => setCurrentStep('dashboard')}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            onRefreshBrief={handleRefreshBrief}
            isRefreshing={isRefreshingBrief}
          />
        )}
      </main>

      {/* Optional Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
