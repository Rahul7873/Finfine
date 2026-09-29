import * as XLSX from 'xlsx';

/**
 * Universal Bank & UPI Statement Parser
 * Supports:
 * - Bank Statements (HDFC, SBI, ICICI, Axis, Kotak, etc.) in Excel (.xlsx, .xls) and PDF
 * - UPI Statements (PhonePe, Paytm Passbook, Google Pay, BHIM, CRED, Amazon Pay) in Excel, CSV, and PDF
 * Extracts standard transaction objects: { date, description, amount, type }
 */

// Month abbreviations mapping
const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

/**
 * Normalizes any date string or Excel serial number into YYYY-MM-DD
 */
export function normalizeDate(rawDate) {
  if (!rawDate) return null;

  // If rawDate is an Excel date serial number (e.g. 45000)
  if (typeof rawDate === 'number') {
    const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const y = jsDate.getUTCFullYear();
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Strip timestamps like "14:30:00" or "02:45 PM" or ", 11:30"
  let str = String(rawDate).trim();
  str = str.replace(/,\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?/i, '').trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmMatch) {
    const d = dmMatch[1].padStart(2, '0');
    const m = dmMatch[2].padStart(2, '0');
    const y = dmMatch[3];
    return `${y}-${m}-${d}`;
  }

  // DD-MMM-YYYY or DD MMM YYYY (e.g. 05-Sep-2026, 5 Sep 2026, 05-SEP-26)
  const dmMonMatch = str.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(\d{2,4})/);
  if (dmMonMatch) {
    const d = dmMonMatch[1].padStart(2, '0');
    const monthKey = dmMonMatch[2].toLowerCase();
    const m = MONTH_MAP[monthKey];
    let y = dmMonMatch[3];
    if (y.length === 2) {
      y = `20${y}`;
    }
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // MMM DD, YYYY or MMM DD YYYY (e.g. Sep 14, 2026, September 14 2026)
  const mdyMatch = str.match(/^([a-zA-Z]{3,9})[-/\s]+(\d{1,2}),?[-/\s]+(\d{2,4})/);
  if (mdyMatch) {
    const monthKey = mdyMatch[1].toLowerCase();
    const m = MONTH_MAP[monthKey];
    const d = mdyMatch[2].padStart(2, '0');
    let y = mdyMatch[3];
    if (y.length === 2) {
      y = `20${y}`;
    }
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    const y = fallback.getUTCFullYear();
    const m = String(fallback.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fallback.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Cleans numerical string and returns a positive float
 */
export function cleanAmount(rawAmount) {
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') return null;
  if (typeof rawAmount === 'number') {
    return isNaN(rawAmount) ? null : Math.abs(rawAmount);
  }
  const cleanStr = String(rawAmount)
    .replace(/[₹$,\s]/g, '')
    .replace(/cr|dr/gi, '')
    .trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : Math.abs(num);
}

/**
 * Detects whether a transaction description indicates CREDIT or DEBIT in UPI transactions
 */
export function inferUpiDirection(description) {
  const desc = String(description || '').toLowerCase();

  // Explicit UPI Credit indicators (Money In)
  if (
    /(received\s*from|money\s*received|added\s*to\s*wallet|money\s*added|cashback|refund\s*from|refund\s*for|credited\s*to|salary|payout|freelance|client|interest|deposit|reversal)/i.test(desc)
  ) {
    return 'CREDIT';
  }

  // Explicit UPI Debit indicators (Money Out)
  if (
    /(paid\s*to|payment\s*to|money\s*sent\s*to|transfer\s*to|sent\s*to|debited\s*from|recharge|bill\s*payment|autopay|order\s*#|purchase)/i.test(desc)
  ) {
    return 'DEBIT';
  }

  return null;
}

/**
 * Parses an Excel file Buffer or ArrayBuffer into standard transaction rows
 */
export function parseExcelData(bufferOrArrayBuffer) {
  const workbook = XLSX.read(bufferOrArrayBuffer, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  // Use the first sheet with data
  let rows = [];
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (sheetData && sheetData.length > 0) {
      rows = sheetData;
      break;
    }
  }

  if (rows.length === 0) {
    throw new Error('The uploaded Excel sheet contains no data.');
  }

  return extractTransactionsFromTable(rows);
}

/**
 * Extracts transactions from a 2D array of rows (detects bank and UPI statement headers)
 */
export function extractTransactionsFromTable(rows) {
  let headerRowIndex = -1;
  let dateCol = -1;
  let descCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let amountCol = -1;
  let typeCol = -1;

  // Scan up to first 35 rows to locate statement header
  const maxScanRows = Math.min(rows.length, 35);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let foundDate = -1;
    let foundDesc = -1;
    let foundDebit = -1;
    let foundCredit = -1;
    let foundAmount = -1;
    let foundType = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (!cell) continue;

      // Date column
      if (foundDate === -1 && /(txn\s*date|transaction\s*date|value\s*date|post\s*date|\bdate\b|\bdt\b)/i.test(cell)) {
        foundDate = c;
      }
      // Description / Narration / Activity / Details (PhonePe & Paytm headers)
      else if (foundDesc === -1 && /(narration|particulars|description|transaction\s*details|details|activity|remarks|payee|merchant|paid\s*to\s*\/?\s*received\s*from)/i.test(cell)) {
        foundDesc = c;
      }
      // Debit column
      else if (foundDebit === -1 && /(withdrawal|debit|\bdr\b|money\s*out|debited\s*from)/i.test(cell)) {
        foundDebit = c;
      }
      // Credit column
      else if (foundCredit === -1 && /(deposit|credit|\bcr\b|money\s*in|credited\s*to)/i.test(cell)) {
        foundCredit = c;
      }
      // Amount column
      else if (foundAmount === -1 && /(amount|txn\s*amt|\btotal\b|net\s*amount)/i.test(cell)) {
        foundAmount = c;
      }
      // Type column (PhonePe Type: DEBIT / CREDIT)
      else if (foundType === -1 && /(type|txn\s*type|transaction\s*type|payment\s*type|cr\s*\/?\s*dr|dr\s*\/?\s*cr|indicator)/i.test(cell)) {
        foundType = c;
      }
    }

    // A valid statement header must have at least Date + Description + (Debit/Credit OR Amount)
    const hasDebitCredit = foundDebit !== -1 || foundCredit !== -1;
    const hasAmount = foundAmount !== -1;

    if (foundDate !== -1 && (foundDesc !== -1 || hasDebitCredit || hasAmount) && (hasDebitCredit || hasAmount)) {
      headerRowIndex = r;
      dateCol = foundDate;
      descCol = foundDesc !== -1 ? foundDesc : (foundDate === 0 ? 1 : 0);
      debitCol = foundDebit;
      creditCol = foundCredit;
      amountCol = foundAmount;
      typeCol = foundType;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // If no explicit header row found, check first row
    const firstRow = rows[0] || [];
    const normalized = firstRow.map(c => String(c).trim().toLowerCase());
    dateCol = normalized.findIndex(c => c.includes('date'));
    descCol = normalized.findIndex(c => c.includes('desc') || c.includes('particular') || c.includes('detail') || c.includes('activity'));
    amountCol = normalized.findIndex(c => c.includes('amount') || c.includes('amt'));
    typeCol = normalized.findIndex(c => c.includes('type'));
    debitCol = normalized.findIndex(c => c.includes('debit') || c.includes('withdrawal'));
    creditCol = normalized.findIndex(c => c.includes('credit') || c.includes('deposit'));

    if (dateCol !== -1 && (amountCol !== -1 || (debitCol !== -1 || creditCol !== -1))) {
      headerRowIndex = 0;
      if (descCol === -1) descCol = 1;
    } else {
      throw new Error('Could not identify statement table columns. Please ensure it contains Date, Narration/Description/Activity, and Debit/Credit or Amount columns.');
    }
  }

  const transactions = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawDate = row[dateCol];
    const parsedDate = normalizeDate(rawDate);
    if (!parsedDate) {
      // Skip non-transaction rows (footer, notes, summary)
      continue;
    }

    const description = String(row[descCol] || '').trim();
    if (!description || /^(total|closing balance|opening balance|sub\s*total)/i.test(description)) {
      continue;
    }

    let amount = null;
    let type = null;

    if (debitCol !== -1 || creditCol !== -1) {
      const debitVal = debitCol !== -1 ? cleanAmount(row[debitCol]) : null;
      const creditVal = creditCol !== -1 ? cleanAmount(row[creditCol]) : null;

      if (debitVal && debitVal > 0) {
        amount = debitVal;
        type = 'DEBIT';
      } else if (creditVal && creditVal > 0) {
        amount = creditVal;
        type = 'CREDIT';
      }
    }

    // Fallback to single amount column
    if (!amount && amountCol !== -1) {
      const rawAmt = row[amountCol];
      amount = cleanAmount(rawAmt);

      if (typeCol !== -1) {
        const rawTypeStr = String(row[typeCol] || '').trim().toUpperCase();
        if (/^(CR|CREDIT|DEPOSIT|INCOME|SUCCESS.*CR)/i.test(rawTypeStr)) {
          type = 'CREDIT';
        } else if (/^(DR|DEBIT|EXPENSE|WITHDRAWAL|SUCCESS.*DR)/i.test(rawTypeStr)) {
          type = 'DEBIT';
        }
      }

      // Check if description has UPI direction cues (PhonePe & Paytm style)
      if (!type) {
        const upiDir = inferUpiDirection(description);
        if (upiDir) {
          type = upiDir;
        }
      }

      // Check if amount string had Cr/Dr or negative sign
      if (!type) {
        const amtStr = String(rawAmt || '').toLowerCase();
        if (amtStr.includes('cr') || amtStr.includes('credit')) {
          type = 'CREDIT';
        } else if (amtStr.includes('dr') || amtStr.includes('debit') || amtStr.startsWith('-')) {
          type = 'DEBIT';
        } else {
          type = /salary|payout|freelance|client|interest|refund|cashback/i.test(description) ? 'CREDIT' : 'DEBIT';
        }
      }
    }

    if (amount && amount > 0 && type) {
      transactions.push({
        date: parsedDate,
        description,
        amount,
        type
      });
    }
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions could be extracted from the statement.');
  }

  return transactions;
}

/**
 * Parses Multi-line UPI Statement text (PhonePe, Paytm, Google Pay, BHIM)
 */
export function parseUpiPdfStatement(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const transactions = [];

  let currentDate = null;
  let i = 0;

  // Header period regex: e.g. "27 Aug, 2026 - 26 Sept, 2026" or "01 Sep 2026 to 30 Sep 2026"
  const periodRegex = /\d{1,2}\s+[a-z]{3,9},?\s+\d{4}\s*(?:-|to)\s*\d{1,2}\s+[a-z]{3,9},?\s+\d{4}/i;

  while (i < lines.length) {
    const line = lines[i];

    // Ignore period range header lines
    if (periodRegex.test(line)) {
      i++;
      continue;
    }

    // 1. Check if line is a standalone Date:
    // e.g. "Sept 26, 2026", "Aug 29, 2026", "26 Sept 2026", "26/09/2026", "26-09-2026"
    const standaloneDateMatch = line.match(/^([a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4})$/i);
    if (standaloneDateMatch && !/statement|details|date|page|period|type|amount/i.test(line)) {
      const parsed = normalizeDate(standaloneDateMatch[1]);
      if (parsed) {
        currentDate = parsed;
        i++;
        // If next line is a time, e.g. "12 55 am" or "12:55 am" or "08:56 pm"
        if (i < lines.length && /^\d{1,2}[:.\uFFFD\s]?\d{2}\s*(?:am|pm)?$/i.test(lines[i])) {
          i++;
        }
        continue;
      }
    }

    // Check if line starts with a date and has timestamp: "Sept 26, 2026 12:55 am"
    const inlineDateMatch = line.match(/^([a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4})\s+(\d{1,2}[:.\uFFFD\s]?\d{2}\s*(?:am|pm)?)$/i);
    if (inlineDateMatch) {
      const parsed = normalizeDate(inlineDateMatch[1]);
      if (parsed) {
        currentDate = parsed;
        i++;
        continue;
      }
    }

    // 2. Pattern A (PhonePe actual pdf-parse text stream):
    // "DEBIT ₹120\tPaid to Mohit Yadav"
    // "CREDIT ₹1\tReceived from" -> next line "BROKENTUSK TECHNOLOGIES PVT LTD"
    // "DEBIT ₹2,000\tPaid to Indian Institute of Technology"
    const typeFirstMatch = line.match(/^(DEBIT|CREDIT)\s*[₹$]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)(?:[\t\s]+(.*))?$/i);
    if (typeFirstMatch) {
      const type = typeFirstMatch[1].toUpperCase();
      const amount = cleanAmount(typeFirstMatch[2]);
      let descPart = (typeFirstMatch[3] || '').trim();

      // If descPart is empty, check next line
      if (!descPart && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!/^(transaction id|utr|credited to|paid by|page|date|this is a system)/i.test(nextLine)) {
          descPart = nextLine;
          i++;
        }
      }

      // If descPart is just "Received from" or "Paid to", check next line for party name
      if (/^(received from|paid to)$/i.test(descPart) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!/^(transaction id|utr|credited to|paid by|page|date|this is a system)/i.test(nextLine)) {
          descPart = `${descPart} ${nextLine}`;
          i++;
        }
      }

      if (currentDate && amount && amount > 0) {
        transactions.push({
          date: currentDate,
          description: cleanDescription(descPart) || `${type === 'CREDIT' ? 'Received from' : 'Paid to'} UPI`,
          amount,
          type
        });
      }
      i++;
      continue;
    }

    // 3. Pattern B (PhonePe OCR / Alternative layout):
    // "Paid to Mohit Yadav DEBIT ₹120"
    // "Received from CREDIT ₹1" -> next line "BROKENTUSK TECHNOLOGIES PVT LTD"
    // "Mobile recharged 8010057938 DEBIT ₹22"
    const typeLastMatch = line.match(/^(paid to|received from|mobile recharged?|recharge|payment to)\s*(.*?)\s*(DEBIT|CREDIT)\s*[₹$]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i);
    if (typeLastMatch) {
      const actionPrefix = typeLastMatch[1].trim();
      let partyName = typeLastMatch[2].trim();
      const type = typeLastMatch[3].toUpperCase();
      const amount = cleanAmount(typeLastMatch[4]);

      // If partyName is empty, check next line
      if (!partyName && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!/^(transaction id|utr|credited to|paid by|page|date|this is a system)/i.test(nextLine)) {
          partyName = nextLine;
          i++;
        }
      }

      const description = partyName ? `${actionPrefix} ${partyName}` : `${actionPrefix} Transaction`;

      if (currentDate && amount && amount > 0) {
        transactions.push({
          date: currentDate,
          description: cleanDescription(description),
          amount,
          type
        });
      }
      i++;
      continue;
    }

    // 4. Pattern C (Paytm / Google Pay multi-line or single line with inline date):
    // e.g. "05 Sep 2026 Paid to Swiggy ₹450.00 DEBITED FROM Kotak..."
    const dateAtStartMatch = line.match(/^([a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4})\s+(.+)/i);
    if (dateAtStartMatch) {
      const parsed = normalizeDate(dateAtStartMatch[1]);
      const rest = dateAtStartMatch[2].trim();
      if (parsed && /(paid to|received from|debited from|credited to|cashback|refund)/i.test(rest)) {
        const upiAmtMatch = rest.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
        if (upiAmtMatch) {
          const amt = cleanAmount(upiAmtMatch[1]);
          const isCredit = /(received from|credited to|cashback|refund)/i.test(rest) && !rest.toLowerCase().startsWith('paid to');
          const type = isCredit ? 'CREDIT' : 'DEBIT';
          let desc = rest.replace(/(?:debited\s*from|credited\s*to|utr\s*:?|transaction\s*id).*$/i, '').trim();
          desc = desc.replace(upiAmtMatch[0], '').trim();

          if (amt && amt > 0) {
            transactions.push({
              date: parsed,
              description: cleanDescription(desc) || 'UPI Transaction',
              amount: amt,
              type
            });
            i++;
            continue;
          }
        }
      }
    }

    i++;
  }

  return transactions;
}

/**
 * Parses Statement text extracted from PDF
 * Identifies standard Indian Bank & UPI (PhonePe, Paytm, GPay) statement lines
 */
export function parsePdfStatementText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('No text content available in PDF.');
  }

  // 1. First attempt to parse as UPI Statement (PhonePe, Paytm, Google Pay, BHIM)
  try {
    const upiTransactions = parseUpiPdfStatement(text);
    if (upiTransactions && upiTransactions.length > 0) {
      return upiTransactions;
    }
  } catch {
    // Continue to standard bank parser
  }

  // 2. Fall back to standard tabular/line-by-line bank statement parsing
  return parseStandardBankPdfText(text);
}

/**
 * Standard Bank PDF parser for tabular and Dr/Cr marked statements
 */
export function parseStandardBankPdfText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const transactions = [];

  // Match dates at start of line:
  // - 01/09/2026 or 01-09-2026 or 2026-09-01
  // - 14 Sep 2026 or 14-Sep-2026 or 14 September 2026
  // - Sep 14, 2026
  const dateRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{2,4}|\d{1,2}-[a-zA-Z]{3,9}-\d{2,4}|[a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{2,4})/i;

  let currentTx = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts with a date
    const dateMatch = line.match(dateRegex);

    if (dateMatch) {
      const rawDateStr = dateMatch[1];
      const parsedDate = normalizeDate(rawDateStr);

      if (parsedDate) {
        const remainder = line.slice(dateMatch[0].length).trim();
        const parsedLine = extractAmountsFromPdfLine(remainder);

        if (parsedLine && parsedLine.amount > 0 && parsedLine.type) {
          if (currentTx) {
            transactions.push(currentTx);
          }
          currentTx = {
            date: parsedDate,
            description: parsedLine.description || 'Transaction',
            amount: parsedLine.amount,
            type: parsedLine.type
          };
          continue;
        }
      }
    }

    // Narration continuation for multi-line bank descriptions
    if (currentTx && !/(page|statement of account|balance|total|ifsc|account number|phonepe|paytm|closing)/i.test(line)) {
      if (line.length < 120 && !line.match(/^\d+$/)) {
        currentTx.description = `${currentTx.description} ${line}`.trim();
      }
    }
  }

  if (currentTx) {
    transactions.push(currentTx);
  }

  if (transactions.length === 0) {
    throw new Error('No structured bank transactions could be detected in this PDF. Please ensure this is a digital bank or UPI statement with text, or upload an Excel (.xlsx) / CSV file.');
  }

  return transactions;
}

/**
 * Helper to parse amounts and descriptions from bank or UPI statement line remainder
 */
export function extractAmountsFromPdfLine(remainder) {
  let line = remainder.trim();

  // Strip timestamp if present at start: e.g. "14:32:00" or "02:30 PM"
  line = line.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\s+/i, '').trim();

  // Strategy 1: UPI Statements (PhonePe / Paytm / Google Pay)
  // Example: "Paid to Swiggy ₹450.00 DEBITED FROM Kotak Bank"
  // Example: "Received from Rahul Sharma ₹5,000.00 CREDITED TO State Bank of India"
  // Example: "Cashback from PhonePe ₹50.00 CREDITED TO PhonePe Wallet"
  // Example: "Refund from Amazon Pay ₹1,299.00 CREDITED TO Kotak Bank"
  const upiCurrencyMatch = line.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})/i);
  const upiDebitedMatch = /(debited\s*from|paid\s*to|payment\s*to|money\s*sent|transfer\s*to)/i.test(line);
  const upiCreditedMatch = /(credited\s*to|received\s*from|money\s*received|cashback|refund)/i.test(line);

  if (upiCurrencyMatch && (upiDebitedMatch || upiCreditedMatch)) {
    const amount = cleanAmount(upiCurrencyMatch[1]);
    const type = upiCreditedMatch && !line.toLowerCase().startsWith('paid to') ? 'CREDIT' : 'DEBIT';

    // Extract description
    let description = line;
    // Clean trailing bank notes like "DEBITED FROM ..." or "CREDITED TO ..."
    description = description.replace(/(?:debited\s*from|credited\s*to|utr\s*:?|transaction\s*id).*$/i, '').trim();
    // Remove the amount from description
    description = description.replace(upiCurrencyMatch[0], '').trim();

    return {
      description: cleanDescription(description) || 'UPI Transaction',
      amount,
      type
    };
  }

  // Strategy 2: Explicit Dr / Cr flag
  // Example: "UPI-SWIGGY-1234 450.00 Dr 25,400.00"
  // Example: "CLIENT PAYOUT 50,000.00 Cr 75,400.00"
  const drCrMatch = line.match(/([\d,]+\.?\d*)\s*(dr|cr|debit|credit)/i);
  if (drCrMatch) {
    const rawAmt = drCrMatch[1];
    const flag = drCrMatch[2].toLowerCase();
    const amount = cleanAmount(rawAmt);
    const type = (flag === 'cr' || flag === 'credit') ? 'CREDIT' : 'DEBIT';

    const descIndex = line.indexOf(drCrMatch[0]);
    const description = line.slice(0, descIndex).trim() || line.replace(drCrMatch[0], '').trim();

    return {
      description: cleanDescription(description),
      amount,
      type
    };
  }

  // Strategy 3: Multi-column numbers at line end: [Debit] [Credit] [Balance] or [Amount] [Balance]
  const numberTokens = [...line.matchAll(/([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})/g)];
  if (numberTokens.length >= 2) {
    if (numberTokens.length >= 3) {
      const debitStr = numberTokens[numberTokens.length - 3][0];
      const creditStr = numberTokens[numberTokens.length - 2][0];
      const debitVal = cleanAmount(debitStr);
      const creditVal = cleanAmount(creditStr);

      const firstTokenIndex = numberTokens[numberTokens.length - 3].index;
      const description = line.slice(0, firstTokenIndex).trim();

      if (debitVal && debitVal > 0 && (!creditVal || creditVal === 0)) {
        return {
          description: cleanDescription(description),
          amount: debitVal,
          type: 'DEBIT'
        };
      } else if (creditVal && creditVal > 0) {
        return {
          description: cleanDescription(description),
          amount: creditVal,
          type: 'CREDIT'
        };
      }
    } else if (numberTokens.length === 2) {
      const amountStr = numberTokens[0][0];
      const amount = cleanAmount(amountStr);
      const description = line.slice(0, numberTokens[0].index).trim();
      const upiDir = inferUpiDirection(description);
      const type = upiDir || (/salary|payout|freelance|client|interest|refund|deposit/i.test(description) ? 'CREDIT' : 'DEBIT');

      return {
        description: cleanDescription(description),
        amount,
        type
      };
    }
  }

  // Strategy 4: Single number in line
  if (numberTokens.length === 1) {
    const amount = cleanAmount(numberTokens[0][0]);
    const description = line.slice(0, numberTokens[0].index).trim();
    const upiDir = inferUpiDirection(description);
    const type = upiDir || (/salary|payout|freelance|client|interest|refund|deposit/i.test(description) ? 'CREDIT' : 'DEBIT');
    return {
      description: cleanDescription(description),
      amount,
      type
    };
  }

  return null;
}

function cleanDescription(desc) {
  return desc
    .replace(/^[₹$\-:/|,\s]+|[₹$\-:/|,\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
