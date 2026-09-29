import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCSV,
  categorizeTransactions,
  calculateFinancialMetrics,
  detectRecurringExpenses,
  detectAnomalies,
  generateDeterministicBrief,
  REQUIRED_COLUMNS,
  CATEGORIES
} from '../src/utils/engine.js';

describe('FINLENS Engine Test Suite', () => {

  describe('1. CSV Validation Tests', () => {
    test('valid CSV parses correctly with standard ISO dates', () => {
      const validRows = [
        { date: '2026-09-01', description: 'Freelance Payout', amount: '50000', type: 'CREDIT' },
        { date: '2026-09-02', description: 'Amazon', amount: '2499', type: 'DEBIT' }
      ];
      const result = validateCSV(validRows);
      assert.equal(result.isValid, true);
      assert.equal(result.validCount, 2);
      assert.equal(result.errorCount, 0);
      assert.equal(result.validTransactions[0].amount, 50000);
      assert.equal(result.validTransactions[0].type, 'CREDIT');
      assert.equal(result.validTransactions[1].amount, 2499);
      assert.equal(result.validTransactions[1].type, 'DEBIT');
    });

    test('supports flexible date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD)', () => {
      const rows = [
        { date: '15/09/2026', description: 'Client Invoice #1', amount: '35000', type: 'CREDIT' },
        { date: '16-09-2026', description: 'Uber Trip', amount: '420', type: 'DEBIT' },
        { date: '2026/09/17', description: 'Swiggy Lunch', amount: '380', type: 'DEBIT' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.validCount, 3);
      assert.equal(result.validTransactions[0].date, '2026-09-15');
      assert.equal(result.validTransactions[1].date, '2026-09-16');
      assert.equal(result.validTransactions[2].date, '2026-09-17');
    });

    test('normalizes amounts with currency symbols, commas, and spaces', () => {
      const rows = [
        { date: '2026-09-01', description: 'Client Wire', amount: '₹ 1,25,000.50', type: 'CREDIT' },
        { date: '2026-09-02', description: 'Hardware Store', amount: ' $ 1,499.00 ', type: 'DEBIT' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.validTransactions[0].amount, 125000.5);
      assert.equal(result.validTransactions[1].amount, 1499);
    });

    test('normalizes transaction type synonyms (CR/INCOME/DEPOSIT & DR/EXPENSE/WITHDRAWAL)', () => {
      const rows = [
        { date: '2026-09-01', description: 'Salary', amount: '60000', type: 'cr' },
        { date: '2026-09-02', description: 'Consulting', amount: '25000', type: 'income' },
        { date: '2026-09-03', description: 'Bank Deposit', amount: '10000', type: 'deposit' },
        { date: '2026-09-04', description: 'Fuel', amount: '2000', type: 'dr' },
        { date: '2026-09-05', description: 'Groceries', amount: '3500', type: 'expense' },
        { date: '2026-09-06', description: 'ATM Cash', amount: '5000', type: 'withdrawal' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.validCount, 6);
      assert.equal(result.validTransactions[0].type, 'CREDIT');
      assert.equal(result.validTransactions[1].type, 'CREDIT');
      assert.equal(result.validTransactions[2].type, 'CREDIT');
      assert.equal(result.validTransactions[3].type, 'DEBIT');
      assert.equal(result.validTransactions[4].type, 'DEBIT');
      assert.equal(result.validTransactions[5].type, 'DEBIT');
    });

    test('handles case-insensitive and whitespace-padded CSV column headers', () => {
      const rows = [
        { '  DATE  ': '2026-09-01', ' Description ': 'Retainer Fee', ' AMOUNT ': '45000', ' TYPE ': 'CREDIT' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.validCount, 1);
      assert.equal(result.validTransactions[0].description, 'Retainer Fee');
    });

    test('missing required column is detected and fails validation', () => {
      const missingColumnRows = [
        { date: '2026-09-01', description: 'Freelance Payout', amount: '50000' } // missing 'type'
      ];
      const result = validateCSV(missingColumnRows);
      assert.equal(result.isValid, false);
      assert.equal(result.errorCount > 0, true);
      assert.match(result.errors[0], /Missing required column/i);
    });

    test('invalid amount (non-numeric, negative, or zero) is detected', () => {
      const nonNumeric = [{ date: '2026-09-01', description: 'Uber', amount: 'abc_not_a_number', type: 'DEBIT' }];
      const negative = [{ date: '2026-09-01', description: 'Uber', amount: '-500', type: 'DEBIT' }];
      const zero = [{ date: '2026-09-01', description: 'Uber', amount: '0', type: 'DEBIT' }];

      const resNonNumeric = validateCSV(nonNumeric);
      assert.equal(resNonNumeric.isValid, false);
      assert.match(resNonNumeric.errors[0], /Invalid amount/i);

      const resNegative = validateCSV(negative);
      assert.equal(resNegative.isValid, false);
      assert.match(resNegative.errors[0], /Invalid amount/i);

      const resZero = validateCSV(zero);
      assert.equal(resZero.isValid, false);
      assert.match(resZero.errors[0], /Invalid amount/i);
    });

    test('invalid transaction type is detected and rejected', () => {
      const invalidTypeRows = [
        { date: '2026-09-01', description: 'Zomato', amount: '450', type: 'UNKNOWN_TYPE' }
      ];
      const result = validateCSV(invalidTypeRows);
      assert.equal(result.isValid, false);
      assert.equal(result.errorCount, 1);
      assert.match(result.errors[0], /Invalid transaction type/i);
    });

    test('missing or empty description is flagged as error', () => {
      const emptyDescRows = [
        { date: '2026-09-01', description: '   ', amount: '500', type: 'DEBIT' }
      ];
      const result = validateCSV(emptyDescRows);
      assert.equal(result.isValid, false);
      assert.match(result.errors[0], /Missing description/i);
    });

    test('invalid date format is detected', () => {
      const invalidDateRows = [
        { date: '32-13-2026-invalid', description: 'Test', amount: '100', type: 'DEBIT' }
      ];
      const result = validateCSV(invalidDateRows);
      assert.equal(result.isValid, false);
      assert.match(result.errors[0], /Invalid date format/i);
    });

    test('skips empty rows with a warning without breaking validation', () => {
      const rows = [
        { date: '2026-09-01', description: 'Salary', amount: '50000', type: 'CREDIT' },
        { date: '', description: '', amount: '', type: '' },
        { date: '2026-09-02', description: 'Internet Bill', amount: '1200', type: 'DEBIT' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.validCount, 2);
      assert.ok(result.warnings.some(w => /Skipped empty row/i.test(w)));
    });

    test('detects duplicate transactions and records them in duplicateRows', () => {
      const rows = [
        { date: '2026-09-01', description: 'Netflix Subscription', amount: '649', type: 'DEBIT' },
        { date: '2026-09-01', description: 'Netflix Subscription', amount: '649', type: 'DEBIT' },
        { date: '2026-09-02', description: 'Different Transaction', amount: '649', type: 'DEBIT' }
      ];
      const result = validateCSV(rows);
      assert.equal(result.isValid, true);
      assert.equal(result.duplicateCount, 1);
      assert.equal(result.duplicateRows.length, 1);
      assert.equal(result.duplicateRows[0].description, 'Netflix Subscription');
      assert.equal(result.validTransactions[1].isDuplicate, true);
      assert.equal(result.validTransactions[0].isDuplicate, false);
    });

    test('empty file is rejected', () => {
      const result = validateCSV([]);
      assert.equal(result.isValid, false);
      assert.equal(result.validCount, 0);
      assert.match(result.errors[0], /empty/i);
    });

    test('non-array payload is rejected safely', () => {
      const result = validateCSV(null);
      assert.equal(result.isValid, false);
      assert.match(result.errors[0], /empty/i);
    });
  });

  describe('2. Financial Calculation Tests', () => {
    const sampleTxs = [
      { id: '1', date: '2026-09-01', description: 'Client Retainer', amount: 60000, type: 'CREDIT', category: 'Income' },
      { id: '2', date: '2026-09-02', description: 'Swiggy', amount: 500, type: 'DEBIT', category: 'Food' },
      { id: '3', date: '2026-09-03', description: 'Zomato', amount: 700, type: 'DEBIT', category: 'Food' },
      { id: '4', date: '2026-09-04', description: 'Amazon', amount: 2000, type: 'DEBIT', category: 'Shopping' }
    ];

    test('calculates total income correctly', () => {
      const metrics = calculateFinancialMetrics(sampleTxs);
      assert.equal(metrics.totalIncome, 60000);
      assert.equal(metrics.creditCount, 1);
    });

    test('calculates total expenses correctly', () => {
      const metrics = calculateFinancialMetrics(sampleTxs);
      assert.equal(metrics.totalExpenses, 3200);
      assert.equal(metrics.debitCount, 3);
    });

    test('calculates net cash flow correctly', () => {
      const metrics = calculateFinancialMetrics(sampleTxs);
      assert.equal(metrics.netCashFlow, 60000 - 3200); // 56800
    });

    test('calculates savings rate percentage accurately', () => {
      const metrics = calculateFinancialMetrics(sampleTxs);
      // (60000 - 3200) / 60000 * 100 = 94.666% -> 94.7%
      assert.equal(metrics.savingsRate, 94.7);
    });

    test('calculates category totals and identifies top category', () => {
      const metrics = calculateFinancialMetrics(sampleTxs);
      const shopping = metrics.spendingByCategory.find(c => c.category === 'Shopping');
      const food = metrics.spendingByCategory.find(c => c.category === 'Food');

      assert.equal(shopping.total, 2000);
      assert.equal(food.total, 1200);
      assert.equal(metrics.topSpendingCategory.category, 'Shopping');
      assert.equal(metrics.topSpendingCategory.total, 2000);
      assert.equal(metrics.topSpendingCategory.percentage, 62.5); // 2000 / 3200 * 100 = 62.5%
    });

    test('handles empty transactions list without dividing by zero', () => {
      const metrics = calculateFinancialMetrics([]);
      assert.equal(metrics.totalIncome, 0);
      assert.equal(metrics.totalExpenses, 0);
      assert.equal(metrics.netCashFlow, 0);
      assert.equal(metrics.savingsRate, 0);
      assert.equal(metrics.totalTransactions, 0);
      assert.equal(metrics.spendingByCategory.length, 0);
      assert.equal(metrics.topSpendingCategory.category, 'None');
    });

    test('handles 100% income (no expenses) correctly', () => {
      const txs = [{ id: '1', date: '2026-09-01', description: 'Salary', amount: 50000, type: 'CREDIT' }];
      const metrics = calculateFinancialMetrics(txs);
      assert.equal(metrics.totalIncome, 50000);
      assert.equal(metrics.totalExpenses, 0);
      assert.equal(metrics.netCashFlow, 50000);
      assert.equal(metrics.savingsRate, 100);
      assert.equal(metrics.spendingByCategory.length, 0);
    });

    test('handles 100% expenses (zero income / deficit) correctly', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Rent', amount: 20000, type: 'DEBIT', category: 'Rent/Housing' }
      ];
      const metrics = calculateFinancialMetrics(txs);
      assert.equal(metrics.totalIncome, 0);
      assert.equal(metrics.totalExpenses, 20000);
      assert.equal(metrics.netCashFlow, -20000);
      assert.equal(metrics.savingsRate, 0);
      assert.equal(metrics.topSpendingCategory.category, 'Rent/Housing');
    });

    test('rounds decimal numbers to two decimal places without floating point artifacts', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Client A', amount: 1000.12, type: 'CREDIT' },
        { id: '2', date: '2026-09-02', description: 'Expense B', amount: 333.33, type: 'DEBIT', category: 'Food' },
        { id: '3', date: '2026-09-03', description: 'Expense C', amount: 333.33, type: 'DEBIT', category: 'Food' }
      ];
      const metrics = calculateFinancialMetrics(txs);
      assert.equal(metrics.totalIncome, 1000.12);
      assert.equal(metrics.totalExpenses, 666.66);
      assert.equal(metrics.netCashFlow, 333.46);
    });
  });

  describe('3. Categorization Tests', () => {
    test('categorizes known merchants across all major spending domains', () => {
      const raw = [
        { id: '1', date: '2026-09-01', description: 'UPI-Netflix-Sub', amount: 649, type: 'DEBIT' },
        { id: '2', date: '2026-09-02', description: 'Uber Trip Bangalore', amount: 350, type: 'DEBIT' },
        { id: '3', date: '2026-09-03', description: 'Zomato Order #892', amount: 450, type: 'DEBIT' },
        { id: '4', date: '2026-09-04', description: 'Freelance Web Design Payout', amount: 45000, type: 'CREDIT' },
        { id: '5', date: '2026-09-05', description: 'Amazon India Electronics', amount: 3200, type: 'DEBIT' },
        { id: '6', date: '2026-09-06', description: 'Bescom Electricity Bill', amount: 1850, type: 'DEBIT' },
        { id: '7', date: '2026-09-07', description: 'Apollo Pharmacy Meds', amount: 920, type: 'DEBIT' },
        { id: '8', date: '2026-09-08', description: 'BookMyShow Movie Tickets', amount: 650, type: 'DEBIT' },
        { id: '9', date: '2026-09-09', description: 'WeWork Monthly Desk Rent', amount: 12000, type: 'DEBIT' }
      ];
      const categorized = categorizeTransactions(raw);

      assert.equal(categorized[0].category, 'Subscriptions');
      assert.equal(categorized[1].category, 'Transport');
      assert.equal(categorized[2].category, 'Food');
      assert.equal(categorized[3].category, 'Income');
      assert.equal(categorized[4].category, 'Shopping');
      assert.equal(categorized[5].category, 'Utilities');
      assert.equal(categorized[6].category, 'Healthcare');
      assert.equal(categorized[7].category, 'Entertainment');
      assert.equal(categorized[8].category, 'Rent/Housing');
    });

    test('always maps CREDIT transactions to Income regardless of merchant keywords', () => {
      const raw = [
        { id: '1', date: '2026-09-01', description: 'Amazon Refund', amount: 1500, type: 'CREDIT' },
        { id: '2', date: '2026-09-02', description: 'Swiggy Cashback', amount: 50, type: 'CREDIT' },
        { id: '3', date: '2026-09-03', description: 'Uber Cancellation Refund', amount: 100, type: 'CREDIT' }
      ];
      const categorized = categorizeTransactions(raw);
      assert.equal(categorized[0].category, 'Income');
      assert.equal(categorized[1].category, 'Income');
      assert.equal(categorized[2].category, 'Income');
      assert.equal(categorized[0].ruleMatched, 'Credit transaction mapped to Income');
    });

    test('falls back to Other for unrecognized debit descriptions', () => {
      const raw = [
        { id: '1', date: '2026-09-01', description: 'Mystery Merchant XYZ 98124', amount: 750, type: 'DEBIT' }
      ];
      const categorized = categorizeTransactions(raw);
      assert.equal(categorized[0].category, 'Other');
      assert.equal(categorized[0].categorizationMethod, 'RULE_FALLBACK');
    });
  });

  describe('4. Recurring Detection Tests', () => {
    test('detects repeated transaction across periods as possible recurring expense', () => {
      const txs = [
        { id: '1', date: '2026-07-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT', category: 'Subscriptions' },
        { id: '2', date: '2026-08-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT', category: 'Subscriptions' },
        { id: '3', date: '2026-09-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT', category: 'Subscriptions' }
      ];
      const recurring = detectRecurringExpenses(txs);
      assert.equal(recurring.length, 1);
      assert.equal(recurring[0].merchant, 'netflix');
      assert.equal(recurring[0].averageAmount, 649);
      assert.equal(recurring[0].occurrences, 3);
      assert.equal(recurring[0].cadence, 'Monthly');
      assert.equal(recurring[0].label, 'Possible recurring expense');
    });

    test('detects weekly cadence for regular weekly charges', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Coworking Weekly Pass', amount: 1200, type: 'DEBIT' },
        { id: '2', date: '2026-09-08', description: 'Coworking Weekly Pass', amount: 1200, type: 'DEBIT' },
        { id: '3', date: '2026-09-15', description: 'Coworking Weekly Pass', amount: 1200, type: 'DEBIT' }
      ];
      const recurring = detectRecurringExpenses(txs);
      assert.equal(recurring.length, 1);
      assert.equal(recurring[0].cadence, 'Weekly');
    });

    test('normalizes noisy merchant descriptions (UPI, POS, Autopay prefixes and handles)', () => {
      const txs = [
        { id: '1', date: '2026-07-10', description: 'UPI-Spotify@okaxis-Paid', amount: 119, type: 'DEBIT' },
        { id: '2', date: '2026-08-10', description: 'AUTOPAY Spotify India Pvt Ltd', amount: 119, type: 'DEBIT' }
      ];
      const recurring = detectRecurringExpenses(txs);
      assert.equal(recurring.length, 1);
      assert.equal(recurring[0].merchant, 'spotify');
    });

    test('ignores non-recurring one-off transactions', () => {
      const txs = [
        { id: '1', date: '2026-08-10', description: 'Decathlon Sports Gear', amount: 3500, type: 'DEBIT', category: 'Shopping' },
        { id: '2', date: '2026-09-02', description: 'IKEA Furniture', amount: 8000, type: 'DEBIT', category: 'Shopping' }
      ];
      const recurring = detectRecurringExpenses(txs);
      assert.equal(recurring.length, 0);
    });

    test('filters out credit transactions from recurring expenses', () => {
      const txs = [
        { id: '1', date: '2026-07-01', description: 'Client Retainer', amount: 50000, type: 'CREDIT' },
        { id: '2', date: '2026-08-01', description: 'Client Retainer', amount: 50000, type: 'CREDIT' }
      ];
      const recurring = detectRecurringExpenses(txs);
      assert.equal(recurring.length, 0);
    });
  });

  describe('5. Anomaly Detection Tests', () => {
    test('flags unusually large transaction as potential anomaly for review', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Coffee', amount: 150, type: 'DEBIT', category: 'Food' },
        { id: '2', date: '2026-09-02', description: 'Snacks', amount: 200, type: 'DEBIT', category: 'Food' },
        { id: '3', date: '2026-09-03', description: 'Uber', amount: 300, type: 'DEBIT', category: 'Transport' },
        { id: '4', date: '2026-09-04', description: 'Groceries', amount: 500, type: 'DEBIT', category: 'Food' },
        { id: '5', date: '2026-09-05', description: 'Apple MacBook Pro Repair', amount: 48000, type: 'DEBIT', category: 'Shopping' }
      ];
      const anomalies = detectAnomalies(txs);
      assert.equal(anomalies.length > 0, true);
      assert.equal(anomalies[0].transaction.id, '5');
      assert.equal(anomalies[0].label, 'Potential anomaly — review recommended');
      assert.doesNotMatch(anomalies[0].label, /fraud/i); // Explicitly ensure no "fraud" terminology
    });

    test('does not flag normal everyday transactions', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Coffee', amount: 150, type: 'DEBIT', category: 'Food' },
        { id: '2', date: '2026-09-02', description: 'Lunch', amount: 350, type: 'DEBIT', category: 'Food' },
        { id: '3', date: '2026-09-03', description: 'Metro Card Recharge', amount: 200, type: 'DEBIT', category: 'Transport' }
      ];
      const anomalies = detectAnomalies(txs);
      assert.equal(anomalies.length, 0);
    });

    test('exempts Rent/Housing from statistical large-amount flagging', () => {
      const txs = [
        { id: '1', date: '2026-09-01', description: 'Coffee', amount: 100, type: 'DEBIT', category: 'Food' },
        { id: '2', date: '2026-09-02', description: 'Snacks', amount: 120, type: 'DEBIT', category: 'Food' },
        { id: '3', date: '2026-09-03', description: 'Monthly Apartment Rent', amount: 35000, type: 'DEBIT', category: 'Rent/Housing' }
      ];
      const anomalies = detectAnomalies(txs);
      // Rent should not be flagged simply because it is large
      const rentAnomaly = anomalies.find(a => a.transaction.category === 'Rent/Housing');
      assert.equal(rentAnomaly, undefined);
    });

    test('detects rapid duplicate charges within 48 hours for the same merchant and amount', () => {
      const txs = [
        { id: 'tx-1', date: '2026-09-01', description: 'Zomato Order', amount: 750, type: 'DEBIT', category: 'Food' },
        { id: 'tx-2', date: '2026-09-02', description: 'Zomato Order', amount: 750, type: 'DEBIT', category: 'Food' }
      ];
      const anomalies = detectAnomalies(txs);
      assert.ok(anomalies.length >= 1);
      assert.ok(anomalies.some(a => a.reasons.some(r => /Potential duplicate charge/i.test(r))));
    });

    test('returns empty array when given empty list or only credit transactions', () => {
      assert.deepEqual(detectAnomalies([]), []);
      assert.deepEqual(detectAnomalies([{ id: '1', date: '2026-09-01', description: 'Client', amount: 50000, type: 'CREDIT' }]), []);
    });
  });

  describe('6. Deterministic AI Brief Tests', () => {
    test('generates structured brief with required sections and disclaimers', () => {
      const metrics = {
        totalIncome: 50000,
        totalExpenses: 18450,
        netCashFlow: 31550,
        savingsRate: 63.1,
        totalTransactions: 127,
        topSpendingCategory: { category: 'Shopping', total: 6500, percentage: 35.2 }
      };
      const categories = [{ category: 'Shopping', total: 6500 }, { category: 'Food', total: 4200 }];
      const recurring = [{ merchant: 'netflix', averageAmount: 649, label: 'Possible recurring expense' }];
      const anomalies = [{ transaction: { description: 'Amazon Purchase', amount: 8000 } }];

      const brief = generateDeterministicBrief(metrics, categories, recurring, anomalies);
      assert.equal(brief.badge, 'AI INTERPRETATION');
      assert.equal(brief.source, 'DETERMINISTIC_ENGINE');
      assert.match(brief.whatHappened, /127 transactions/i);
      assert.match(brief.whatHappened, /50,000/);
      assert.match(brief.whatHappened, /18,450/);
      assert.match(brief.whyItMatters, /Shopping/);
      assert.equal(Array.isArray(brief.worthReviewing), true);
      assert.match(brief.dataLimitations, /only uses the transactions included/i);
    });

    test('generates cautious negative cash flow commentary when expenses exceed income', () => {
      const metrics = {
        totalIncome: 20000,
        totalExpenses: 35000,
        netCashFlow: -15000,
        savingsRate: 0,
        totalTransactions: 20,
        topSpendingCategory: { category: 'Rent/Housing', total: 25000, percentage: 71.4 }
      };
      const categories = [{ category: 'Rent/Housing', total: 25000 }];
      const recurring = [];
      const anomalies = [];

      const brief = generateDeterministicBrief(metrics, categories, recurring, anomalies);
      assert.match(brief.whatHappened, /negative recorded cash flow of ₹15,000/i);
      assert.match(brief.whyItMatters, /exceeded recorded income/i);
    });

    test('handles empty dataset gracefully in brief generation', () => {
      const metrics = {
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        savingsRate: 0,
        totalTransactions: 0,
        topSpendingCategory: { category: 'None', total: 0, percentage: 0 }
      };
      const brief = generateDeterministicBrief(metrics, [], [], []);
      assert.equal(brief.badge, 'AI INTERPRETATION');
      assert.match(brief.whatHappened, /0 transactions/i);
      assert.ok(brief.worthReviewing.length > 0);
    });
  });

  describe('7. Constants & Exports Integrity Tests', () => {
    test('verifies standard required columns schema', () => {
      assert.deepEqual(REQUIRED_COLUMNS, ['date', 'description', 'amount', 'type']);
    });

    test('verifies supported categories list contains expected domains', () => {
      assert.ok(CATEGORIES.includes('Income'));
      assert.ok(CATEGORIES.includes('Food'));
      assert.ok(CATEGORIES.includes('Shopping'));
      assert.ok(CATEGORIES.includes('Transport'));
      assert.ok(CATEGORIES.includes('Subscriptions'));
      assert.ok(CATEGORIES.includes('Utilities'));
      assert.ok(CATEGORIES.includes('Healthcare'));
      assert.ok(CATEGORIES.includes('Rent/Housing'));
      assert.ok(CATEGORIES.includes('Other'));
    });
  });
});
