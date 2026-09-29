import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { app } from '../server.js';

describe('FINLENS Backend API Test Suite', () => {
  let server;
  let baseUrl;

  before(() => {
    process.env.NODE_ENV = 'test';
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  describe('1. Health Check Endpoint (GET /api/health)', () => {
    test('returns 200 OK and expected service metadata', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.version, '1.0.0');
      assert.equal(data.service, 'FINLENS Backend API');
      assert.equal(typeof data.hasConfiguredApiKey, 'boolean');
      assert.ok(data.timestamp);
      assert.ok(!isNaN(new Date(data.timestamp).getTime()));
    });
  });

  describe('2. Sample CSV Endpoint (GET /api/sample-csv)', () => {
    test('serves the sample CSV file with correct headers and content', async () => {
      const res = await fetch(`${baseUrl}/api/sample-csv`);
      assert.equal(res.status, 200);

      const contentType = res.headers.get('content-type');
      assert.ok(contentType && contentType.includes('text/csv'));

      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition && disposition.includes('sample_freelance_transactions.csv'));

      const text = await res.text();
      assert.ok(text.length > 0);
      assert.match(text, /date/i);
      assert.match(text, /description/i);
      assert.match(text, /amount/i);
      assert.match(text, /type/i);
    });
  });

  describe('3. Validation Endpoint (POST /api/validate)', () => {
    test('returns 400 when rows payload is missing', async () => {
      const res = await fetch(`${baseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);

      const data = await res.json();
      assert.match(data.error, /missing rows/i);
    });

    test('validates valid transaction rows correctly', async () => {
      const payload = {
        rows: [
          { date: '2026-09-01', description: 'Design Sprint Client Retainer', amount: '75000', type: 'CREDIT' },
          { date: '2026-09-03', description: 'GitHub Team Subscription', amount: '1200', type: 'DEBIT' },
          { date: '2026-09-05', description: 'Swiggy Dinner', amount: '480', type: 'DEBIT' }
        ]
      };

      const res = await fetch(`${baseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isValid, true);
      assert.equal(data.validCount, 3);
      assert.equal(data.errorCount, 0);
      assert.equal(data.validTransactions[0].amount, 75000);
      assert.equal(data.validTransactions[0].type, 'CREDIT');
    });

    test('detects currency symbols and formats amount properly', async () => {
      const payload = {
        rows: [
          { date: '2026-09-01', description: 'Client Payment', amount: '₹ 1,50,000', type: 'CREDIT' },
          { date: '2026-09-02', description: 'MacBook Care', amount: '$ 2,500.50', type: 'DEBIT' }
        ]
      };

      const res = await fetch(`${baseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isValid, true);
      assert.equal(data.validTransactions[0].amount, 150000);
      assert.equal(data.validTransactions[1].amount, 2500.5);
    });

    test('flags invalid rows and returns validation errors', async () => {
      const payload = {
        rows: [
          { date: 'not-a-date', description: 'Malformed Row', amount: '-500', type: 'INVALID_TYPE' }
        ]
      };

      const res = await fetch(`${baseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isValid, false);
      assert.ok(data.errorCount >= 2);
      assert.ok(data.errors.some(e => /date/i.test(e)));
      assert.ok(data.errors.some(e => /amount/i.test(e)));
    });

    test('handles empty rows array gracefully', async () => {
      const res = await fetch(`${baseUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: [] })
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isValid, false);
      assert.equal(data.validCount, 0);
      assert.match(data.errors[0], /empty/i);
    });
  });

  describe('4. Analysis Endpoint (POST /api/analyze)', () => {
    test('returns 400 when transactions array is missing or empty', async () => {
      const res1 = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res1.status, 400);

      const res2 = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [] })
      });
      assert.equal(res2.status, 400);
    });

    test('performs full financial analysis including categorization, metrics, recurring, and anomalies', async () => {
      const transactions = [
        { id: 'tx-1', date: '2026-07-05', description: 'Client Retainer UX', amount: 80000, type: 'CREDIT' },
        { id: 'tx-2', date: '2026-07-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT' },
        { id: 'tx-3', date: '2026-08-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT' },
        { id: 'tx-4', date: '2026-09-05', description: 'Netflix Subscription', amount: 649, type: 'DEBIT' },
        { id: 'tx-5', date: '2026-09-10', description: 'Zomato Food Delivery', amount: 550, type: 'DEBIT' },
        { id: 'tx-6', date: '2026-09-15', description: 'Apple Studio Display', amount: 159900, type: 'DEBIT' }
      ];

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.ok(data.categorized);
      assert.ok(data.metrics);
      assert.ok(data.recurring);
      assert.ok(data.anomalies);

      // Verify metrics
      assert.equal(data.metrics.totalIncome, 80000);
      assert.equal(data.metrics.creditCount, 1);
      assert.equal(data.metrics.debitCount, 5);
      assert.equal(data.metrics.totalTransactions, 6);

      // Verify categorization
      const netflixTx = data.categorized.find(t => t.description === 'Netflix Subscription');
      assert.equal(netflixTx.category, 'Subscriptions');

      const zomatoTx = data.categorized.find(t => t.description.includes('Zomato'));
      assert.equal(zomatoTx.category, 'Food');

      // Verify recurring detection
      const netflixRecurring = data.recurring.find(r => r.merchant === 'netflix');
      assert.ok(netflixRecurring);
      assert.equal(netflixRecurring.occurrences, 3);
      assert.equal(netflixRecurring.label, 'Possible recurring expense');

      // Verify anomaly detection
      assert.ok(data.anomalies.length > 0);
      const appleAnomaly = data.anomalies.find(a => a.transaction.description.includes('Apple'));
      assert.ok(appleAnomaly);
      assert.equal(appleAnomaly.label, 'Potential anomaly — review recommended');
      assert.doesNotMatch(appleAnomaly.label, /fraud/i);
    });
  });

  describe('5. Financial AI Brief Endpoint (POST /api/brief)', () => {
    test('returns 400 when metrics object is missing', async () => {
      const res = await fetch(`${baseUrl}/api/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);

      const data = await res.json();
      assert.match(data.error, /metrics are required/i);
    });

    test('generates transparent deterministic brief when no user API key is provided', async () => {
      const payload = {
        metrics: {
          totalIncome: 120000,
          totalExpenses: 45000,
          netCashFlow: 75000,
          savingsRate: 62.5,
          totalTransactions: 42,
          topSpendingCategory: { category: 'Shopping', total: 18000, percentage: 40.0 },
          spendingByCategory: [
            { category: 'Shopping', total: 18000, count: 5, percentage: 40.0 },
            { category: 'Food', total: 12000, count: 18, percentage: 26.7 }
          ]
        },
        recurring: [
          { merchant: 'netflix', averageAmount: 649, cadence: 'Monthly', label: 'Possible recurring expense' }
        ],
        anomalies: [
          { transaction: { description: 'MacBook Repair', amount: 15000 }, reasons: ['Unusually large amount'] }
        ]
      };

      const res = await fetch(`${baseUrl}/api/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 200);

      const brief = await res.json();
      assert.equal(brief.source, 'DETERMINISTIC_ENGINE');
      assert.equal(brief.badge, 'AI INTERPRETATION');
      assert.equal(brief.isAiPowered, false);
      assert.ok(brief.whatHappened);
      assert.ok(brief.whyItMatters);
      assert.ok(Array.isArray(brief.worthReviewing));
      assert.ok(brief.worthReviewing.length > 0);
      assert.match(brief.dataLimitations, /only uses the transactions included in the uploaded CSV/i);
    });

    test('falls back gracefully to deterministic brief when an invalid external API key is passed', async () => {
      const payload = {
        metrics: {
          totalIncome: 50000,
          totalExpenses: 20000,
          netCashFlow: 30000,
          savingsRate: 60.0,
          totalTransactions: 10,
          topSpendingCategory: { category: 'Food', total: 10000, percentage: 50.0 },
          spendingByCategory: [{ category: 'Food', total: 10000, count: 5, percentage: 50.0 }]
        },
        userApiKey: 'INVALID_GEMINI_KEY_FOR_TESTING'
      };

      const res = await fetch(`${baseUrl}/api/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 200);

      const brief = await res.json();
      assert.ok(
        brief.source === 'DETERMINISTIC_ENGINE_FALLBACK' ||
        brief.source === 'DETERMINISTIC_ENGINE'
      );
      assert.equal(brief.badge, 'AI INTERPRETATION');
      assert.ok(brief.whatHappened);
      assert.ok(brief.whyItMatters);
    });
  });

  describe('6. Statement Parsing Endpoint (POST /api/parse-statement)', () => {
    test('returns 400 when fileData is missing', async () => {
      const res = await fetch(`${baseUrl}/api/parse-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'test.xlsx' })
      });
      assert.equal(res.status, 400);

      const data = await res.json();
      assert.match(data.error, /fileData.*required/i);
    });

    test('parses Excel bank statement with separate Debit and Credit columns', async () => {
      // Create in-memory Excel workbook simulating HDFC statement
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['HDFC Bank Ltd - Statement of Account'],
        ['Account: 50100987654321', 'Currency: INR'],
        ['Date', 'Narration', 'Withdrawal (Dr)', 'Deposit (Cr)', 'Closing Balance'],
        ['01/09/2026', 'Swiggy Bangalore Order #123', '450.00', '', '15000.00'],
        ['05/09/2026', 'Client Retainer UX Consulting', '', '65000.00', '80000.00'],
        ['08/09/2026', 'Netflix Entertainment', '649.00', '', '79351.00']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64 = buffer.toString('base64');

      const res = await fetch(`${baseUrl}/api/parse-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'hdfc_statement.xlsx',
          fileData: base64
        })
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.fileType, 'excel');
      assert.equal(data.totalExtracted, 3);
      assert.equal(data.rows[0].description, 'Swiggy Bangalore Order #123');
      assert.equal(data.rows[0].amount, 450);
      assert.equal(data.rows[0].type, 'DEBIT');
      assert.equal(data.rows[1].description, 'Client Retainer UX Consulting');
      assert.equal(data.rows[1].amount, 65000);
      assert.equal(data.rows[1].type, 'CREDIT');
      assert.equal(data.validation.isValid, true);
    });

    test('parses authentic PhonePe PDF statement file via /api/parse-statement', async () => {
      const pdfPath = 'C:\\Users\\rahul\\.gemini\\antigravity-ide\\brain\\7a217b1a-86af-46f8-ae55-4ff18c4b6ecc\\.user_uploaded\\media_1790414048293.pdf';
      if (fs.existsSync(pdfPath)) {
        const pdfBuffer = fs.readFileSync(pdfPath);
        const base64 = pdfBuffer.toString('base64');

        const res = await fetch(`${baseUrl}/api/parse-statement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: 'PhonePe_Statement_8010057938.pdf',
            fileData: base64
          })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.fileType, 'pdf');
        assert.equal(data.totalExtracted, 38);
        assert.equal(data.rows.length, 38);
        assert.equal(data.validation.isValid, true);
        assert.equal(data.validation.validCount, 38);

        // Verify key transactions
        const credit1 = data.rows.find(r => r.amount === 1 && r.type === 'CREDIT');
        assert.ok(credit1);
        assert.equal(credit1.description, 'Received from BROKENTUSK TECHNOLOGIES PVT LTD');

        const debitCollege = data.rows.find(r => r.amount === 60500);
        assert.ok(debitCollege);
        assert.equal(debitCollege.description, 'Paid to SAITM');
        assert.equal(debitCollege.type, 'DEBIT');

        const creditDad = data.rows.find(r => r.amount === 30600);
        assert.ok(creditDad);
        assert.equal(creditDad.description, 'Received from Dad');
        assert.equal(creditDad.type, 'CREDIT');
      }
    });

    test('rejects empty statement that contains no transaction rows', async () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Empty Statement Header Only'],
        ['Date', 'Narration', 'Debit', 'Credit']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64 = buffer.toString('base64');

      const res = await fetch(`${baseUrl}/api/parse-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'empty.xlsx',
          fileData: base64
        })
      });
      assert.equal(res.status, 500);
      const data = await res.json();
      assert.ok(data.error);
    });
  });
});

