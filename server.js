import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateCSV,
  categorizeTransactions,
  calculateFinancialMetrics,
  detectRecurringExpenses,
  detectAnomalies,
  generateDeterministicBrief
} from './src/utils/engine.js';
import { PDFParse } from 'pdf-parse';
import { parseExcelData, parsePdfStatementText } from './src/utils/statementParser.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'FINLENS Backend API',
    hasConfiguredApiKey: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your_gemini_api_key_here'),
    timestamp: new Date().toISOString()
  });
});

// CSV Sample Data
app.get('/api/sample-csv', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'sample_freelance_transactions.csv');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_freelance_transactions.csv"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ error: 'Sample CSV file not found' });
  }
});

// Step 1.5: Parse Bank Statement (Excel .xlsx/.xls or PDF .pdf)
app.post('/api/parse-statement', async (req, res) => {
  try {
    const { fileData, fileName, fileType } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'fileData (base64 string) is required in request payload' });
    }

    const name = (fileName || 'statement').toLowerCase();
    const buffer = Buffer.from(fileData, 'base64');
    let rows = [];

    if (name.endsWith('.xlsx') || name.endsWith('.xls') || fileType?.includes('sheet') || fileType?.includes('excel')) {
      rows = parseExcelData(buffer);
    } else if (name.endsWith('.pdf') || fileType?.includes('pdf')) {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = result?.text || '';
        if (!text.trim()) {
          return res.status(422).json({
            error: 'No readable text content found in this PDF. If this is a scanned document, please export as Excel (.xlsx) or CSV from your bank portal.'
          });
        }
        rows = parsePdfStatementText(text);
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith('.csv') || fileType?.includes('csv')) {
      // Parse CSV via Excel parser (which supports CSVs)
      rows = parseExcelData(buffer);
    } else {
      // Automatic detection: Try Excel first, then PDF
      try {
        rows = parseExcelData(buffer);
      } catch {
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          rows = parsePdfStatementText(result?.text || '');
        } finally {
          await parser.destroy();
        }
      }
    }

    if (!rows || rows.length === 0) {
      return res.status(422).json({
        error: 'No valid credit or debit bank transactions could be extracted from this statement.'
      });
    }

    const validation = validateCSV(rows);

    res.json({
      success: true,
      fileName: fileName || 'statement',
      fileType: name.endsWith('.pdf') ? 'pdf' : (name.endsWith('.csv') ? 'csv' : 'excel'),
      totalExtracted: rows.length,
      rows,
      validation
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || 'Failed to parse bank statement'
    });
  }
});

// Step 2: Validate Data
app.post('/api/validate', (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows) {
      return res.status(400).json({ error: 'Missing rows in request payload' });
    }
    const validationResult = validateCSV(rows);
    res.json(validationResult);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Validation failed' });
  }
});

// Step 3 & 4: Categorize & Full Financial Analysis
app.post('/api/analyze', (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Valid transactions array is required' });
    }

    // Step 3: Categorize transactions
    const categorized = categorizeTransactions(transactions);

    // Step 4: Calculate metrics (Deterministic)
    const metrics = calculateFinancialMetrics(categorized);

    // Detect Recurring Expenses (Pattern Logic)
    const recurring = detectRecurringExpenses(categorized);

    // Detect Anomalies (Explainable Rules)
    const anomalies = detectAnomalies(categorized);

    res.json({
      categorized,
      metrics,
      recurring,
      anomalies
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Step 5: AI Financial Brief ("What happened + Why it matters")
app.post('/api/brief', async (req, res) => {
  try {
    const { metrics, categories, recurring, anomalies, userApiKey } = req.body;

    if (!metrics) {
      return res.status(400).json({ error: 'Financial metrics are required' });
    }

    // Always generate deterministic baseline brief
    const deterministicBrief = generateDeterministicBrief(
      metrics,
      categories || metrics.spendingByCategory || [],
      recurring || [],
      anomalies || []
    );

    const apiKey = userApiKey || (process.env.AI_API_KEY !== 'your_gemini_api_key_here' ? process.env.AI_API_KEY : null);

    // If no valid Gemini API key is configured, return the deterministic brief
    if (!apiKey) {
      return res.json({
        ...deterministicBrief,
        source: 'DETERMINISTIC_ENGINE',
        isAiPowered: false,
        note: 'Generated using FINLENS deterministic financial intelligence engine. Provide a Gemini API key for external LLM generation.'
      });
    }

    // Call Gemini API with structured facts (Section 15 constraints)
    try {
      const systemInstruction = `You are FINLENS AI, a conservative, transparent financial intelligence assistant for Indian freelancers and independent professionals.
You must adhere strictly to these product boundaries:
1. Explain ONLY the provided structured facts. Do NOT invent transactions, do NOT invent financial numbers, and do NOT extrapolate beyond this statement.
2. Clearly distinguish between calculated facts, detected patterns, and AI interpretations.
3. NEVER provide investment recommendations, loan approvals, or claim regulatory financial authority.
4. If something is unusual, label it as "Potential anomaly — review recommended". Never say "fraud".
5. Return your answer in JSON format with EXACTLY four fields:
{
  "whatHappened": "A concise factual summary based ONLY on the calculated results.",
  "whyItMatters": "A cautious interpretation of the observed patterns for an Indian freelancer.",
  "worthReviewing": ["Point 1", "Point 2", "Point 3"],
  "dataLimitations": "This analysis only uses the transactions included in the uploaded CSV. It does not represent your complete financial situation unless the dataset is complete."
}`;

      const userPrompt = `Here are the deterministic financial facts calculated from the user's uploaded statement:
- Total Recorded Transactions: ${metrics.totalTransactions}
- Total Recorded Income (CREDIT): ₹${metrics.totalIncome?.toLocaleString('en-IN')}
- Total Recorded Expenses (DEBIT): ₹${metrics.totalExpenses?.toLocaleString('en-IN')}
- Net Recorded Cash Flow: ₹${metrics.netCashFlow?.toLocaleString('en-IN')}
- Top Spending Category: ${metrics.topSpendingCategory?.category} (₹${metrics.topSpendingCategory?.total?.toLocaleString('en-IN')}, ${metrics.topSpendingCategory?.percentage}%)
- All Spending Categories: ${JSON.stringify(metrics.spendingByCategory)}
- Detected Possible Recurring Expenses: ${JSON.stringify(recurring?.map(r => ({ merchant: r.merchant, average: r.averageAmount, cadence: r.cadence })))}
- Detected Potential Anomalies: ${JSON.stringify(anomalies?.map(a => ({ description: a.transaction?.description, amount: a.transaction?.amount, reasons: a.reasons })))}

Write the FINLENS financial brief now in valid JSON adhering to the specified structure.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Gemini API call failed, falling back to deterministic brief:', errorText);
        return res.json({
          ...deterministicBrief,
          source: 'DETERMINISTIC_ENGINE_FALLBACK',
          isAiPowered: false,
          warning: 'Gemini API call failed. Displaying transparent deterministic brief.'
        });
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedJson = JSON.parse(rawText);

      return res.json({
        source: 'GEMINI_LLM',
        badge: 'AI INTERPRETATION',
        isAiPowered: true,
        whatHappened: parsedJson.whatHappened || deterministicBrief.whatHappened,
        whyItMatters: parsedJson.whyItMatters || deterministicBrief.whyItMatters,
        worthReviewing: Array.isArray(parsedJson.worthReviewing) ? parsedJson.worthReviewing : deterministicBrief.worthReviewing,
        dataLimitations: parsedJson.dataLimitations || deterministicBrief.dataLimitations
      });
    } catch (llmErr) {
      console.warn('Error during Gemini API parsing:', llmErr.message);
      return res.json({
        ...deterministicBrief,
        source: 'DETERMINISTIC_ENGINE_FALLBACK',
        isAiPowered: false,
        warning: 'Fallback to deterministic brief due to API parsing issue.'
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Brief generation failed' });
  }
});

export { app };
export default app;

const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('server')
) && process.env.NODE_ENV !== 'test';

import os from 'os';

if (isDirectExecution) {
  const interfaces = os.networkInterfaces();
  const netIps = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        netIps.push(iface.address);
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`FINLENS Backend Server running!`);
    console.log(`- Local:   http://localhost:${PORT}`);
    netIps.forEach(ip => {
      console.log(`- Network: http://${ip}:${PORT}`);
    });
    console.log(`======================================================\n`);
  });
}


