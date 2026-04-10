import OpenAI from 'openai';

/**
 * AI Parsing Service
 *
 * Uses an LLM (OpenAI GPT-4o) to parse noisy OCR output or raw text
 * into structured expense data.
 */

const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.trim();
const openai = hasOpenAIKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface ParsedExpense {
  merchantName: string;
  date: string;         // ISO date string
  totalAmount: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  taxAmount?: number;
  tipAmount?: number;
  category: string;
  confidence: number;   // 0-1 confidence score
  rawText?: string;
}

const SYSTEM_PROMPT = `You are an expert receipt and invoice parser. Given raw text (possibly from OCR with errors), extract structured expense data.

Always respond with valid JSON matching this exact schema:
{
  "merchantName": "string",
  "date": "YYYY-MM-DD",
  "totalAmount": number,
  "currency": "USD",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number  
    }
  ],
  "taxAmount": number or null,
  "tipAmount": number or null,
  "category": "one of: food, transport, accommodation, entertainment, shopping, groceries, utilities, general",
  "confidence": number between 0 and 1
}

Rules:
- Fix OCR errors intelligently (e.g., "S12.99" → 12.99, "0ct" → "Oct")
- If date is ambiguous, use the most likely interpretation
- If items can't be extracted, return empty items array
- Always include totalAmount even if estimated
- Set confidence based on how clear the input was
- If the currency symbol is missing, default to USD
- For credit card transactions, the merchant name is the payee`;

function parseAmountAndCurrency(value: string): { amount: number; currency: string } | null {
  const cleaned = value.replace(/\s+/g, '');
  const symbolMatch = cleaned.match(/([€$£])/);
  const currencyMatch = cleaned.match(/(CZK|EUR|USD|Kc|Kč)/i);
  const numMatch = cleaned.match(/[-+]?\d+[.,]\d{1,2}|[-+]?\d+/);

  if (!numMatch) return null;

  const numeric = parseFloat(numMatch[0].replace(',', '.'));
  if (Number.isNaN(numeric)) return null;

  let currency = 'USD';
  if (symbolMatch?.[1] === '€') currency = 'EUR';
  if (symbolMatch?.[1] === '$') currency = 'USD';
  if (symbolMatch?.[1] === '£') currency = 'GBP';
  if (currencyMatch) {
    const raw = currencyMatch[1].toUpperCase();
    currency = raw === 'KC' || raw === 'KČ' ? 'CZK' : raw;
  }

  return { amount: Math.abs(numeric), currency };
}

function fallbackParseCardTransactions(rawText: string): ParsedExpense[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: ParsedExpense[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Typical transaction amount pattern from banking app screenshots.
    const amountMatch = line.match(/[-]\s?([€$£]?\s?\d+[.,]\d{1,2}|\d+[.,]\d{1,2}\s?(CZK|EUR|USD|Kc|Kč)?)/i);
    if (!amountMatch) continue;

    const parsed = parseAmountAndCurrency(amountMatch[1]);
    if (!parsed || parsed.amount <= 0) continue;

    let merchant = line.replace(amountMatch[0], '').trim();
    if (!merchant) {
      const prev = lines[i - 1] || '';
      // Avoid using pure time/date lines as merchant name.
      if (!/^\d{1,2}[:.]\d{2}$/.test(prev) && !/^\d{1,2}\s?[A-Za-z]{3,}$/.test(prev)) {
        merchant = prev;
      }
    }

    if (!merchant || merchant.length < 2) {
      merchant = 'Card transaction';
    }

    results.push({
      merchantName: merchant,
      date: today,
      totalAmount: parsed.amount,
      currency: parsed.currency,
      items: [],
      taxAmount: null,
      tipAmount: null,
      category: 'general',
      confidence: 0.45,
      rawText,
    });
  }

  return results;
}

/**
 * Parse raw OCR text into structured expense data using LLM.
 */
export async function parseReceiptText(rawText: string): Promise<ParsedExpense | ParsedExpense[]> {
  if (!openai) {
    const fallback = fallbackParseCardTransactions(rawText);
    if (fallback.length > 0) return fallback;
    throw new Error('AI parsing unavailable: OPENAI_API_KEY is not configured');
  }

  try {
    const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse this receipt/transaction text into structured data:\n\n${rawText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 2000,
  });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from AI parsing service');
    }

    const parsed: ParsedExpense = JSON.parse(content);
    parsed.rawText = rawText;
    return parsed;
  } catch {
    const fallback = fallbackParseCardTransactions(rawText);
    if (fallback.length > 0) return fallback;
    throw new Error('Failed to parse receipt text');
  }
}

/**
 * Parse CSV/Excel row data into expense suggestions.
 */
export async function parseTabularData(
  rows: Array<Record<string, string>>,
  headers: string[]
): Promise<ParsedExpense[]> {
  if (!openai) {
    return rows
      .map((row) => {
        const description =
          row.description || row.merchant || row.payee || row.name || row.note || '';
        const amountRaw = row.amount || row.total || row.value || row.debit || '';
        const parsed = parseAmountAndCurrency(String(amountRaw));
        if (!description || !parsed) return null;

        return {
          merchantName: description,
          date: row.date || row.transactionDate || new Date().toISOString().slice(0, 10),
          totalAmount: parsed.amount,
          currency: parsed.currency,
          items: [],
          taxAmount: null,
          tipAmount: null,
          category: 'general',
          confidence: 0.5,
        } as ParsedExpense;
      })
      .filter((v): v is ParsedExpense => !!v);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse these transaction rows into structured expense data. Each row is a separate expense.

Headers: ${JSON.stringify(headers)}

Rows:
${rows.map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`).join('\n')}

Respond with a JSON object: { "expenses": [...] } where each item matches the schema.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI parsing service');
  }

  const result = JSON.parse(content);
  return result.expenses || [];
}

/**
 * Suggest which group members should be participants for an expense
 * based on the expense description and group context.
 */
export async function suggestParticipants(
  expense: ParsedExpense,
  members: Array<{ id: string; name: string }>
): Promise<string[]> {
  if (!openai) return members.map((m) => m.id);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Given an expense and a list of group members, suggest which members should be included as participants. Default to including all members unless the expense clearly applies to specific people. Respond with JSON: { "participantIds": ["id1", "id2", ...], "reasoning": "brief explanation" }`,
      },
      {
        role: 'user',
        content: `Expense: ${expense.merchantName} - ${expense.category} - $${expense.totalAmount}
Members: ${members.map((m) => `${m.name} (${m.id})`).join(', ')}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return members.map((m) => m.id); // Default: all members

  const result = JSON.parse(content);
  return result.participantIds || members.map((m) => m.id);
}
