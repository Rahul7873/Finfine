/**
 * FINLENS Core Financial Engine
 * Pure deterministic calculations, validation, rule-based categorization,
 * recurring pattern detection, and explainable anomaly detection.
 */

// Required standard CSV columns
export const REQUIRED_COLUMNS = ['date', 'description', 'amount', 'type'];

// Supported categories
export const CATEGORIES = [
  'Income',
  'Food',
  'Shopping',
  'Transport',
  'Utilities',
  'Subscriptions',
  'Healthcare',
  'Entertainment',
  'Rent/Housing',
  'Other'
];

/**
 * 1. CSV Data Validation
 */
export function validateCSV(dataRows) {
  const issues = [];
  const errors = [];
  const warnings = [];
  const validTransactions = [];
  const duplicateRows = [];

  if (!Array.isArray(dataRows) || dataRows.length === 0) {
    return {
      isValid: false,
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      duplicateCount: 0,
      errors: ['The uploaded CSV file is empty.'],
      warnings: [],
      issues: ['Empty file'],
      validTransactions: []
    };
  }

  // Check required columns on first row
  const firstRow = dataRows[0];
  const normalizedKeys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedKeys.includes(col));

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      totalRows: dataRows.length,
      validCount: 0,
      errorCount: missingColumns.length,
      duplicateCount: 0,
      errors: [`Missing required column(s): ${missingColumns.join(', ')}`],
      warnings: [],
      issues: [`Required columns missing: ${missingColumns.join(', ')}`],
      validTransactions: []
    };
  }

  // Find column key mappings (case-insensitive)
  const keyMap = {};
  for (const key of Object.keys(firstRow)) {
    const cleanKey = key.trim().toLowerCase();
    if (REQUIRED_COLUMNS.includes(cleanKey)) {
      keyMap[cleanKey] = key;
    }
  }

  const seenSignatures = new Map();

  dataRows.forEach((row, index) => {
    const rowIndex = index + 1; // 1-based index (header is row 0)
    const rawDate = row[keyMap['date']];
    const rawDesc = row[keyMap['description']];
    const rawAmount = row[keyMap['amount']];
    const rawType = row[keyMap['type']];

    // Check for empty row
    if (!rawDate && !rawDesc && !rawAmount && !rawType) {
      warnings.push(`Row ${rowIndex}: Skipped empty row`);
      return;
    }

    let hasRowError = false;

    // 1. Description validation
    const description = (rawDesc || '').toString().trim();
    if (!description) {
      errors.push(`Row ${rowIndex}: Missing description`);
      hasRowError = true;
    }

    // 2. Date validation
    const dateStr = (rawDate || '').toString().trim();
    const parsedDate = parseDateString(dateStr);
    if (!parsedDate) {
      errors.push(`Row ${rowIndex}: Invalid date format "${dateStr}". Expected YYYY-MM-DD or DD/MM/YYYY`);
      hasRowError = true;
    }

    // 3. Amount validation
    const cleanAmountStr = (rawAmount || '').toString().replace(/[₹$,\s]/g, '').trim();
    const amountNum = parseFloat(cleanAmountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push(`Row ${rowIndex}: Invalid amount "${rawAmount}". Amount must be a positive number.`);
      hasRowError = true;
    }

    // 4. Type validation (CREDIT or DEBIT)
    const typeStr = (rawType || '').toString().trim().toUpperCase();
    let normalizedType = null;
    if (['CREDIT', 'CR', 'INCOME', 'DEPOSIT'].includes(typeStr)) {
      normalizedType = 'CREDIT';
    } else if (['DEBIT', 'DR', 'EXPENSE', 'WITHDRAWAL'].includes(typeStr)) {
      normalizedType = 'DEBIT';
    } else {
      errors.push(`Row ${rowIndex}: Invalid transaction type "${rawType}". Expected CREDIT or DEBIT.`);
      hasRowError = true;
    }

    if (hasRowError) {
      return;
    }

    // Check for duplicate row
    const signature = `${parsedDate.toISOString().slice(0, 10)}|${description.toLowerCase()}|${amountNum.toFixed(2)}|${normalizedType}`;
    if (seenSignatures.has(signature)) {
      duplicateRows.push({
        rowIndex,
        originalRow: seenSignatures.get(signature),
        duplicateRow: rowIndex,
        description,
        amount: amountNum,
        date: parsedDate.toISOString().slice(0, 10)
      });
      warnings.push(`Row ${rowIndex}: Potential duplicate of row ${seenSignatures.get(signature)} (${description} - ₹${amountNum})`);
    } else {
      seenSignatures.set(signature, rowIndex);
    }

    validTransactions.push({
      id: `tx-${rowIndex}-${Date.now().toString(36)}`,
      rowIndex,
      date: parsedDate.toISOString().slice(0, 10),
      rawDate: dateStr,
      description,
      amount: Math.round(amountNum * 100) / 100,
      type: normalizedType,
      isDuplicate: seenSignatures.get(signature) !== rowIndex
    });
  });

  const isValid = validTransactions.length > 0 && errors.length === 0;

  return {
    isValid,
    totalRows: dataRows.length,
    validCount: validTransactions.length,
    errorCount: errors.length,
    duplicateCount: duplicateRows.length,
    duplicateRows,
    errors,
    warnings,
    validTransactions
  };
}

/**
 * Flexible date parser for YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY
 */
function parseDateString(str) {
  if (!str) return null;
  // Standard ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(Date.UTC(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3])));
    return isNaN(d.getTime()) ? null : d;
  }

  // European / Indian: DD/MM/YYYY or DD-MM-YYYY
  const dmMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1]);
    const month = parseInt(dmMatch[2]) - 1;
    const year = parseInt(dmMatch[3]);
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * 2. Deterministic Rule-Based Categorization
 */
const CATEGORY_RULES = [
  {
    category: 'Subscriptions',
    patterns: [
      /\b(netflix|spotify|prime|youtube\s*premium|disney|hotstar|apple\s*music|figma|github|notion|openai|chatgpt|google\s*one|linkedin|canva|adobe|substack|medium|slack|zoom)\b/i
    ]
  },
  {
    category: 'Food',
    patterns: [
      /\b(zomato|swiggy|blinkit|zepto|starbucks|mcdonald|cafe|coffee|restaurant|diner|burger|pizza|biryani|bigbasket|instamart|grocer|baker|bakery|subway|domino|haldiram|chai|fast\s*food|food|canteen|sweets)\b/i
    ]
  },
  {
    category: 'Shopping',
    patterns: [
      /\b(amazon|flipkart|myntra|ajio|croma|reliance\s*digital|apple\s*store|zara|h&m|ikea|decathlon|retail|mall|store|supermarket|clothing|electronics|delhivery|courier|bluedart|parcel)\b/i
    ]
  },
  {
    category: 'Transport',
    patterns: [
      /\b(uber|ola|rapido|metro|dmrc|delhi\s*metro|metro\s*rail|petrol|fuel|indian\s*oil|bharat\s*petroleum|shell|fastag|irctc|railway|train|flight|air\s*india|indigo|makemytrip|cleartrip|toll|parking|auto|cab)\b/i
    ]
  },
  {
    category: 'Utilities',
    patterns: [
      /\b(electricity|bescom|adani|tata\s*power|water|gas|cylinder|indane|airtel|jio|vi|broadband|wifi|wi-fi|recharge|recharged|prepaid|postpaid|tata\s*play|bill\s*desk|utility)\b/i
    ]
  },
  {
    category: 'Healthcare',
    patterns: [
      /\b(apollo|pharmeasy|1mg|pharmacy|chemist|hospital|clinic|doctor|dental|cult\.?fit|gym|fitness|medplus|pathology|diagnostic|health)\b/i
    ]
  },
  {
    category: 'Entertainment',
    patterns: [
      /\b(bookmyshow|pvr|inox|cinema|movie|theatre|steam|playstation|gaming|concert|event)\b/i
    ]
  },
  {
    category: 'Rent/Housing',
    patterns: [
      /\b(rent|society|maintenance|brokerage|co-working|wework|awfis|landlord|housing|apartment)\b/i
    ]
  },
  {
    category: 'Income',
    patterns: [
      /\b(salary|freelance|client|upwork|fiverr|payment\s*received|payout|razorpay|stripe|invoicing|consulting|retainer|dividend|interest|refund|cashback|deposit)\b/i
    ]
  }
];

export function categorizeTransactions(transactions) {
  return transactions.map(tx => {
    // If it's a CREDIT, default to Income unless matched otherwise
    if (tx.type === 'CREDIT') {
      return {
        ...tx,
        category: 'Income',
        categorizationMethod: 'RULE',
        ruleMatched: 'Credit transaction mapped to Income'
      };
    }

    // Match debit against rules
    const desc = tx.description.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.category === 'Income') continue; // debits shouldn't be income
      for (const pattern of rule.patterns) {
        if (pattern.test(desc)) {
          return {
            ...tx,
            category: rule.category,
            categorizationMethod: 'RULE',
            ruleMatched: `Matched keyword: ${pattern.toString().replace(/^\/|\/[a-z]*$/g, '')}`
          };
        }
      }
    }

    return {
      ...tx,
      category: 'Other',
      categorizationMethod: 'RULE_FALLBACK',
      ruleMatched: 'Unmatched description, categorized as Other'
    };
  });
}

/**
 * 3. Financial Analysis (Calculated Deterministically)
 */
export function calculateFinancialMetrics(transactions) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let creditCount = 0;
  let debitCount = 0;

  const categoryTotals = {};
  const categoryCounts = {};

  for (const cat of CATEGORIES) {
    categoryTotals[cat] = 0;
    categoryCounts[cat] = 0;
  }

  for (const tx of transactions) {
    if (tx.type === 'CREDIT') {
      totalIncome += tx.amount;
      creditCount++;
      categoryTotals['Income'] = (categoryTotals['Income'] || 0) + tx.amount;
      categoryCounts['Income'] = (categoryCounts['Income'] || 0) + 1;
    } else {
      totalExpenses += tx.amount;
      debitCount++;
      const cat = tx.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const netCashFlow = Math.round((totalIncome - totalExpenses) * 100) / 100;

  // Breakdown of spending (excluding Income category)
  const spendingByCategory = Object.keys(categoryTotals)
    .filter(cat => cat !== 'Income' && categoryTotals[cat] > 0)
    .map(category => {
      const amount = Math.round(categoryTotals[category] * 100) / 100;
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0;
      return {
        category,
        total: amount,
        count: categoryCounts[category] || 0,
        percentage
      };
    })
    .sort((a, b) => b.total - a.total);

  const topSpendingCategory = spendingByCategory.length > 0
    ? spendingByCategory[0]
    : { category: 'None', total: 0, percentage: 0, count: 0 };

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10
    : 0;

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    totalTransactions: transactions.length,
    creditCount,
    debitCount,
    spendingByCategory,
    topSpendingCategory
  };
}

/**
 * 4. Recurring Expenses Detection
 * Identifies repeated payments with similar amounts over intervals
 */
export function detectRecurringExpenses(transactions) {
  const debits = transactions.filter(tx => tx.type === 'DEBIT');
  
  // Group by clean merchant name
  const merchantGroups = new Map();

  for (const tx of debits) {
    const cleanMerchant = normalizeMerchantName(tx.description);
    if (!merchantGroups.has(cleanMerchant)) {
      merchantGroups.set(cleanMerchant, []);
    }
    merchantGroups.get(cleanMerchant).push(tx);
  }

  const recurringExpenses = [];

  for (const [merchant, txs] of merchantGroups.entries()) {
    if (txs.length >= 2) {
      // Sort by date ascending
      txs.sort((a, b) => new Date(a.date) - new Date(b.date));

      const amounts = txs.map(t => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      
      // Check variance in amount (within 15% tolerance)
      const maxDelta = Math.max(...amounts.map(amt => Math.abs(amt - avgAmount)));
      const isConsistentAmount = (maxDelta / avgAmount) <= 0.15;

      // Calculate intervals in days between successive charges
      const intervals = [];
      for (let i = 1; i < txs.length; i++) {
        const diffMs = new Date(txs[i].date) - new Date(txs[i - 1].date);
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
        intervals.push(days);
      }

      // Check cadence
      let cadence = 'Irregular recurring';
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      if (avgInterval >= 25 && avgInterval <= 35) {
        cadence = 'Monthly';
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        cadence = 'Weekly';
      } else if (avgInterval >= 85 && avgInterval <= 95) {
        cadence = 'Quarterly';
      }

      // If consistent amount or regular cadence
      if (isConsistentAmount || cadence !== 'Irregular recurring') {
        recurringExpenses.push({
          merchant,
          rawDescription: txs[0].description,
          category: txs[0].category || 'Subscriptions',
          averageAmount: Math.round(avgAmount * 100) / 100,
          occurrences: txs.length,
          cadence,
          isConsistentAmount,
          dates: txs.map(t => t.date),
          totalSpent: Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100,
          label: 'Possible recurring expense' // As required by Section 12
        });
      }
    }
  }

  return recurringExpenses.sort((a, b) => b.totalSpent - a.totalSpent);
}

function normalizeMerchantName(desc) {
  let clean = desc.toLowerCase().trim();
  // Strip common transaction and UPI noise prefixes
  clean = clean.replace(/^(pos|upi|neft|rtgs|imps|autopay|inb|billpay|paid\s*to|payment\s*to|transfer\s*to|money\s*sent\s*to|received\s*from|cashback\s*from|refund\s*from)[\s/_-]+/i, '');
  clean = clean.replace(/[@#].*$/, ''); // strip UPI IDs
  clean = clean.replace(/\b(pvt|ltd|limited|india|inc|llc|payment)\b/gi, '');
  clean = clean.replace(/[\d\-_/]+/g, ' ').trim();
  return clean.split(' ')[0] || desc.toLowerCase();
}

/**
 * 5. Explainable Anomaly Detection
 * Flags transactions requiring review without accusing or claiming fraud.
 */
export function detectAnomalies(transactions) {
  const debits = transactions.filter(tx => tx.type === 'DEBIT');
  if (debits.length === 0) return [];

  const amounts = debits.map(t => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  // Standard deviation
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Median
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const anomalies = [];
  const seenTransactions = [];

  for (const tx of debits) {
    const reasons = [];

    // Rule A: Unusually large transaction (> 3x median and > 2 std deviations, or amount > ₹15,000 for non-rent)
    const isRent = tx.category === 'Rent/Housing';
    if (!isRent && (tx.amount > median * 3.5 || (stdDev > 0 && tx.amount > avgAmount + 2.5 * stdDev))) {
      reasons.push(`Amount ₹${tx.amount.toLocaleString('en-IN')} is unusually large compared to typical spending (median: ₹${Math.round(median).toLocaleString('en-IN')})`);
    }

    // Rule B: Rapid duplicate charge (same merchant & amount within 48 hours)
    for (const prev of seenTransactions) {
      if (prev.amount === tx.amount && normalizeMerchantName(prev.description) === normalizeMerchantName(tx.description)) {
        const diffDays = Math.abs((new Date(tx.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24));
        if (diffDays <= 2 && prev.id !== tx.id) {
          reasons.push(`Potential duplicate charge of ₹${tx.amount.toLocaleString('en-IN')} with ${prev.description} on ${prev.date}`);
          break;
        }
      }
    }

    if (reasons.length > 0) {
      anomalies.push({
        id: `anomaly-${tx.id}`,
        transaction: tx,
        reasons,
        label: 'Potential anomaly — review recommended' // Section 13 requirement
      });
    }

    seenTransactions.push(tx);
  }

  return anomalies;
}

/**
 * 6. Deterministic AI Financial Brief Generator
 * Generates structured, CFO-grade brief without relying on external LLM,
 * satisfying Section 15 & 16.
 */
export function generateDeterministicBrief(metrics, categories, recurring, anomalies) {
  const { totalIncome, totalExpenses, netCashFlow, topSpendingCategory, totalTransactions } = metrics;
  const isPositiveCashFlow = netCashFlow >= 0;

  // Section 1: What happened (Strictly factual numbers)
  const whatHappened = [
    `Your uploaded dataset contains ${totalTransactions} transactions. Total recorded income was ₹${totalIncome.toLocaleString('en-IN')} and total recorded expenses were ₹${totalExpenses.toLocaleString('en-IN')}, resulting in a ${isPositiveCashFlow ? 'positive' : 'negative'} recorded cash flow of ₹${Math.abs(netCashFlow).toLocaleString('en-IN')}.`,
    topSpendingCategory.total > 0
      ? `${topSpendingCategory.category} was the largest expense category, totaling ₹${topSpendingCategory.total.toLocaleString('en-IN')} (${topSpendingCategory.percentage}% of total expenses).`
      : 'No categorized expenses recorded in this period.'
  ];

  // Section 2: Why it matters (Cautious interpretation)
  const whyItMatters = [];
  if (topSpendingCategory.percentage >= 35) {
    whyItMatters.push(
      `${topSpendingCategory.category} represents a substantial portion (${topSpendingCategory.percentage}%) of recorded expenses in this dataset. For independent professionals with irregular income, high concentration in a single category reduces cash flow buffer.`
    );
  } else {
    whyItMatters.push(
      `Recorded expenses are distributed across ${categories.length} categories, with ${topSpendingCategory.category} leading. Maintaining awareness of baseline fixed costs helps plan for income variance.`
    );
  }

  if (recurring.length > 0) {
    const totalRecurringMonthly = recurring.reduce((sum, r) => sum + r.averageAmount, 0);
    whyItMatters.push(
      `Detected ${recurring.length} possible recurring expenses totaling approximately ₹${Math.round(totalRecurringMonthly).toLocaleString('en-IN')} per billing cycle. Recurring commitments represent ongoing cash outflow regardless of monthly freelance earnings.`
    );
  }

  if (!isPositiveCashFlow) {
    whyItMatters.push(
      `Recorded expenses exceeded recorded income by ₹${Math.abs(netCashFlow).toLocaleString('en-IN')}. If this statement covers an atypical month with lumpy freelance payouts due later, this may be temporary; otherwise, it indicates cash depletion.`
    );
  }

  // Section 3: Worth reviewing
  const worthReviewing = [];
  if (topSpendingCategory.total > 0) {
    worthReviewing.push(`${topSpendingCategory.category} transactions to verify if any one-off purchases can be separated from regular operational expenses.`);
  }

  if (recurring.length > 0) {
    worthReviewing.push(
      `Possible recurring expenses: ${recurring.slice(0, 3).map(r => `${r.merchant} (₹${r.averageAmount})`).join(', ')}${recurring.length > 3 ? ` and ${recurring.length - 3} others` : ''}.`
    );
  }

  if (anomalies.length > 0) {
    worthReviewing.push(
      `${anomalies.length} potential anomaly flagged for inspection (e.g. ${anomalies[0].transaction.description} for ₹${anomalies[0].transaction.amount.toLocaleString('en-IN')}).`
    );
  }

  if (worthReviewing.length === 0) {
    worthReviewing.push('General transaction logs to confirm no incoming invoices or payments are missing from the statement period.');
  }

  // Section 4: Data limitation
  const dataLimitations =
    'This analysis only uses the transactions included in the uploaded CSV. It does not represent your complete financial situation unless the dataset is complete.';

  return {
    source: 'DETERMINISTIC_ENGINE',
    badge: 'AI INTERPRETATION',
    whatHappened: whatHappened.join(' '),
    whyItMatters: whyItMatters.join(' '),
    worthReviewing,
    dataLimitations
  };
}
