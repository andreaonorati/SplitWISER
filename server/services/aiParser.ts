import OpenAI from 'openai';

/**
 * AI Parsing Service
 *
 * Uses an LLM (OpenAI GPT-4o) to parse noisy OCR output or raw text
 * into structured expense data.
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

/**
 * Parse raw OCR text into structured expense data using LLM.
 */
export async function parseReceiptText(rawText: string): Promise<ParsedExpense> {
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
}

/**
 * Parse CSV/Excel row data into expense suggestions.
 */
export async function parseTabularData(
  rows: Array<Record<string, string>>,
  headers: string[]
): Promise<ParsedExpense[]> {
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
