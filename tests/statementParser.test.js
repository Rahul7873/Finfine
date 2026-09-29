import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  normalizeDate,
  cleanAmount,
  extractTransactionsFromTable,
  parseExcelData,
  parsePdfStatementText
} from '../src/utils/statementParser.js';

describe('FINLENS Statement Parser Test Suite', () => {

  describe('1. Date Normalization', () => {
    test('normalizes ISO dates (YYYY-MM-DD)', () => {
      assert.equal(normalizeDate('2026-09-01'), '2026-09-01');
      assert.equal(normalizeDate('2026/09/15'), '2026-09-15');
    });

    test('normalizes Indian/European dates (DD/MM/YYYY and DD-MM-YYYY)', () => {
      assert.equal(normalizeDate('05/09/2026'), '2026-09-05');
      assert.equal(normalizeDate('15-09-2026'), '2026-09-15');
      assert.equal(normalizeDate('1/9/2026'), '2026-09-01');
    });

    test('normalizes dates with month abbreviations (DD-MMM-YYYY)', () => {
      assert.equal(normalizeDate('05-Sep-2026'), '2026-09-05');
      assert.equal(normalizeDate('12-JAN-2026'), '2026-01-12');
      assert.equal(normalizeDate('20 Oct 26'), '2026-10-20');
    });

    test('normalizes Excel numeric date serials', () => {
      // 46265 corresponds to 2026-09-01
      const serial = 46265;
      const parsed = normalizeDate(serial);
      assert.match(parsed, /^2026-/);
    });

    test('returns null for empty or invalid dates', () => {
      assert.equal(normalizeDate(''), null);
      assert.equal(normalizeDate(null), null);
      assert.equal(normalizeDate('not-a-date'), null);
    });
  });

  describe('2. Amount Cleaning', () => {
    test('cleans rupee symbols, commas, and whitespace', () => {
      assert.equal(cleanAmount('₹ 1,50,000.50'), 150000.5);
      assert.equal(cleanAmount(' $ 2,500 '), 2500);
      assert.equal(cleanAmount('649.00 Dr'), 649);
      assert.equal(cleanAmount('50000.00 Cr'), 50000);
    });

    test('handles negative numbers by taking absolute value', () => {
      assert.equal(cleanAmount('-1250.75'), 1250.75);
    });

    test('returns null for invalid amounts', () => {
      assert.equal(cleanAmount(''), null);
      assert.equal(cleanAmount(null), null);
      assert.equal(cleanAmount('abc'), null);
    });
  });

  describe('3. Excel Bank Statement Parsing', () => {
    test('parses HDFC-style statement with separate Debit and Credit columns', () => {
      const rows = [
        ['HDFC Bank Ltd - Statement of Account'],
        ['Account: 50100987654321', 'Customer: Rahul'],
        ['Date', 'Narration', 'Chq/Ref No', 'Withdrawal (Dr)', 'Deposit (Cr)', 'Closing Balance'],
        ['01/09/2026', 'Swiggy Bangalore', 'REF001', '450.00', '', '15000.00'],
        ['05/09/2026', 'Client Retainer UX Consulting', 'REF002', '', '65000.00', '80000.00'],
        ['08/09/2026', 'Netflix Entertainment', 'REF003', '649.00', '', '79351.00'],
        ['Total Withdrawals: 1099.00', '', '', '', ''] // Footer row
      ];

      const txs = extractTransactionsFromTable(rows);
      assert.equal(txs.length, 3);
      assert.equal(txs[0].date, '2026-09-01');
      assert.equal(txs[0].description, 'Swiggy Bangalore');
      assert.equal(txs[0].amount, 450);
      assert.equal(txs[0].type, 'DEBIT');

      assert.equal(txs[1].date, '2026-09-05');
      assert.equal(txs[1].description, 'Client Retainer UX Consulting');
      assert.equal(txs[1].amount, 65000);
      assert.equal(txs[1].type, 'CREDIT');
    });

    test('parses SBI-style statement with single Amount column and Dr/Cr indicator', () => {
      const rows = [
        ['State Bank of India - e-Statement'],
        ['Txn Date', 'Particulars', 'Amount', 'Type', 'Balance'],
        ['02/09/2026', 'Uber Ride Bangalore', '350.00', 'DR', '45000.00'],
        ['06/09/2026', 'Freelance Project Deposit', '45000.00', 'CR', '90000.00']
      ];

      const txs = extractTransactionsFromTable(rows);
      assert.equal(txs.length, 2);
      assert.equal(txs[0].amount, 350);
      assert.equal(txs[0].type, 'DEBIT');
      assert.equal(txs[1].amount, 45000);
      assert.equal(txs[1].type, 'CREDIT');
    });

    test('reads binary Excel buffer with parseExcelData', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Date', 'Description', 'Withdrawal', 'Deposit'],
        ['01/09/2026', 'Amazon India', '1299.00', ''],
        ['05/09/2026', 'Client Retainer', '', '50000.00']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const txs = parseExcelData(buf);
      assert.equal(txs.length, 2);
      assert.equal(txs[0].amount, 1299);
      assert.equal(txs[0].type, 'DEBIT');
      assert.equal(txs[1].amount, 50000);
      assert.equal(txs[1].type, 'CREDIT');
    });
  });

  describe('4. PDF Statement Text Parsing', () => {
    test('extracts transactions from multi-column bank statement text (Debit / Credit / Balance)', () => {
      const text = `
State Bank of India - Account Statement
Branch: Indiranagar, Bangalore
Txn Date Narration Debit Credit Balance
01/09/2026 UPI/Zomato/Order982 350.00 0.00 45,000.00
03/09/2026 Amazon India Shopping 1,299.00 0.00 43,701.00
05/09/2026 Freelance Payout Web Project 0.00 55,000.00 98,701.00
10/09/2026 Bescom Power Bill 1,450.00 0.00 97,251.00
      `;

      const txs = parsePdfStatementText(text);
      assert.equal(txs.length, 4);

      assert.equal(txs[0].date, '2026-09-01');
      assert.equal(txs[0].description, 'UPI/Zomato/Order982');
      assert.equal(txs[0].amount, 350);
      assert.equal(txs[0].type, 'DEBIT');

      assert.equal(txs[2].date, '2026-09-05');
      assert.equal(txs[2].description, 'Freelance Payout Web Project');
      assert.equal(txs[2].amount, 55000);
      assert.equal(txs[2].type, 'CREDIT');
    });

    test('extracts transactions from Dr/Cr marked statement text', () => {
      const text = `
HDFC Bank Statement
Date Narration Amount Dr/Cr Balance
02/09/2026 Netflix Entertainment 649.00 Dr 50,000.00
04/09/2026 Swiggy Food Bangalore 450.00 DR 49,550.00
06/09/2026 Client Invoicing Payment 80,000.00 Cr 1,29,550.00
08-Sep-2026 Uber Ride 380.00 Dr 1,29,170.00
      `;

      const txs = parsePdfStatementText(text);
      assert.equal(txs.length, 4);
      assert.equal(txs[0].amount, 649);
      assert.equal(txs[0].type, 'DEBIT');
      assert.equal(txs[2].amount, 80000);
      assert.equal(txs[2].type, 'CREDIT');
      assert.equal(txs[3].amount, 380);
      assert.equal(txs[3].type, 'DEBIT');
    });

    test('throws descriptive error when no transactions are detected', () => {
      const nonBankText = 'This is an arbitrary PDF with no transactions.';
      assert.throws(() => parsePdfStatementText(nonBankText), /no structured bank transactions/i);
    });
  });

  describe('5. UPI Statement Parsing (PhonePe, Paytm, Google Pay)', () => {
    test('parses PhonePe transaction statement with Paid to and Received from', () => {
      const rows = [
        ['PhonePe Transaction Statement for 9876543210'],
        ['Date', 'Transaction ID', 'Details', 'Type', 'Amount', 'Status'],
        ['05 Sep 2026', 'T26090512001', 'Paid to Swiggy Bangalore', 'DEBIT', '450.00', 'SUCCESS'],
        ['08 Sep 2026', 'T26090814002', 'Received from Client Payout', 'CREDIT', '48000.00', 'SUCCESS'],
        ['12 Sep 2026', 'T26091218003', 'Paid to Uber India', 'DEBIT', '380.00', 'SUCCESS'],
        ['15 Sep 2026', 'T26091520004', 'Cashback from PhonePe', 'CREDIT', '50.00', 'SUCCESS']
      ];

      const txs = extractTransactionsFromTable(rows);
      assert.equal(txs.length, 4);
      assert.equal(txs[0].date, '2026-09-05');
      assert.equal(txs[0].description, 'Paid to Swiggy Bangalore');
      assert.equal(txs[0].amount, 450);
      assert.equal(txs[0].type, 'DEBIT');

      assert.equal(txs[1].date, '2026-09-08');
      assert.equal(txs[1].amount, 48000);
      assert.equal(txs[1].type, 'CREDIT');

      assert.equal(txs[3].description, 'Cashback from PhonePe');
      assert.equal(txs[3].amount, 50);
      assert.equal(txs[3].type, 'CREDIT');
    });

    test('parses Paytm passbook statement with separate Debit and Credit columns', () => {
      const rows = [
        ['Paytm Payments Bank / Wallet Passbook'],
        ['Date', 'Activity', 'Order ID', 'Debit', 'Credit', 'Closing Balance'],
        ['02/09/2026', 'Paid to Blinkit Grocery', 'ORD987612', '820.00', '', '4180.00'],
        ['04/09/2026', 'Added money to Wallet', 'ORD987613', '', '5000.00', '9180.00'],
        ['10/09/2026', 'Refund for Swiggy Order', 'ORD987614', '', '450.00', '9630.00'],
        ['14/09/2026', 'Payment to Starbucks Coffee', 'ORD987615', '360.00', '', '9270.00']
      ];

      const txs = extractTransactionsFromTable(rows);
      assert.equal(txs.length, 4);
      assert.equal(txs[0].description, 'Paid to Blinkit Grocery');
      assert.equal(txs[0].amount, 820);
      assert.equal(txs[0].type, 'DEBIT');

      assert.equal(txs[1].description, 'Added money to Wallet');
      assert.equal(txs[1].amount, 5000);
      assert.equal(txs[1].type, 'CREDIT');

      assert.equal(txs[2].description, 'Refund for Swiggy Order');
      assert.equal(txs[2].amount, 450);
      assert.equal(txs[2].type, 'CREDIT');
    });

    test('parses single-line UPI PDF statement text format', () => {
      const phonePeText = `
PhonePe Transaction Statement
Period: 01 Sep 2026 to 30 Sep 2026
05 Sep 2026 Paid to Swiggy ₹450.00 DEBITED FROM Kotak Mahindra Bank UTR: 42421980
08 Sep 2026 Received from Rahul Sharma ₹15,000.00 CREDITED TO Kotak Mahindra Bank UTR: 42421999
14 Sep 2026 Paid to Uber India ₹320.00 DEBITED FROM Kotak Mahindra Bank UTR: 42422001
20 Sep 2026 Cashback from PhonePe ₹50.00 CREDITED TO PhonePe Wallet
      `;

      const txs = parsePdfStatementText(phonePeText);
      assert.equal(txs.length, 4);
      assert.equal(txs[0].date, '2026-09-05');
      assert.equal(txs[0].amount, 450);
      assert.equal(txs[0].type, 'DEBIT');

      assert.equal(txs[1].date, '2026-09-08');
      assert.equal(txs[1].amount, 15000);
      assert.equal(txs[1].type, 'CREDIT');

      assert.equal(txs[3].amount, 50);
      assert.equal(txs[3].type, 'CREDIT');
    });

    test('parses authentic multi-line PhonePe PDF statement text', () => {
      const multiLinePhonePeText = `
Transaction Statement for 8010057938
27 Aug, 2026 - 26 Sept, 2026
Date Transaction Details Type Amount
Sept 26, 2026
12 55 am
CREDIT ₹1	Received from
BROKENTUSK TECHNOLOGIES PVT LTD
Transaction ID T2609260055411858017240
UTR No. 626999895262
Credited to XXXXXXXXXXXXX6637
Sept 26, 2026
12 55 am
DEBIT ₹1	Paid to BROKENTUSK TECHNOLOGIES PVT LTD
Transaction ID T2609260055298380546991
UTR No. 747302360041
Paid by XXXXXXXXXXXXX6637
Sept 25, 2026
08 56 pm
DEBIT ₹120	Paid to Mohit Yadav
Transaction ID T2609252056074249044730
UTR No. 695297470383
Paid by XXXXXXXXXXXXX6637
Sept 25, 2026
01 44 am
DEBIT ₹22	Mobile recharged 8010057938
Transaction ID NB26092501443250715509392
UTR No. 270201915286
Airtel Prepaid Reference ID 1740865779
Paid by XXXXXXXXXXXXX6637
Sept 24, 2026
01 03 am
DEBIT ₹2,000	Paid to Indian Institute of Technology
Transaction ID T2609240103128065939305
UTR No. 012703099530
Paid by XXXXXXXXXXXXX6637
Aug 29, 2026
04 08 pm
CREDIT ₹30,600	Received from Dad
Transaction ID T2608291608540006109205
UTR No. 956448661760
Credited to XXXXXXXXXXXXX6637
Page 1 of 6
This is a system generated statement.
      `;

      const txs = parsePdfStatementText(multiLinePhonePeText);
      assert.equal(txs.length, 6);

      assert.equal(txs[0].date, '2026-09-26');
      assert.equal(txs[0].description, 'Received from BROKENTUSK TECHNOLOGIES PVT LTD');
      assert.equal(txs[0].amount, 1);
      assert.equal(txs[0].type, 'CREDIT');

      assert.equal(txs[1].date, '2026-09-26');
      assert.equal(txs[1].description, 'Paid to BROKENTUSK TECHNOLOGIES PVT LTD');
      assert.equal(txs[1].amount, 1);
      assert.equal(txs[1].type, 'DEBIT');

      assert.equal(txs[2].date, '2026-09-25');
      assert.equal(txs[2].description, 'Paid to Mohit Yadav');
      assert.equal(txs[2].amount, 120);
      assert.equal(txs[2].type, 'DEBIT');

      assert.equal(txs[3].date, '2026-09-25');
      assert.equal(txs[3].description, 'Mobile recharged 8010057938');
      assert.equal(txs[3].amount, 22);
      assert.equal(txs[3].type, 'DEBIT');

      assert.equal(txs[4].date, '2026-09-24');
      assert.equal(txs[4].description, 'Paid to Indian Institute of Technology');
      assert.equal(txs[4].amount, 2000);
      assert.equal(txs[4].type, 'DEBIT');

      assert.equal(txs[5].date, '2026-08-29');
      assert.equal(txs[5].description, 'Received from Dad');
      assert.equal(txs[5].amount, 30600);
      assert.equal(txs[5].type, 'CREDIT');
    });
  });
});

