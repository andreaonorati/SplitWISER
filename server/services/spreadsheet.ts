import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import fs from 'fs';

/**
 * Parse spreadsheet (Excel/CSV) files into row data.
 */

export interface SpreadsheetData {
  headers: string[];
  rows: Array<Record<string, string>>;
}

/**
 * Parse an Excel file (.xlsx, .xls) into headers + rows.
 */
export function parseExcelFile(filePath: string): SpreadsheetData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: '',
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

/**
 * Parse a CSV file into headers + rows.
 */
export function parseCsvFile(filePath: string): SpreadsheetData {
  const content = fs.readFileSync(filePath, 'utf-8');

  const records: string[][] = csvParse(content, {
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length < 2) {
    return { headers: records[0] || [], rows: [] };
  }

  const headers = records[0];
  const rows = records.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}

/**
 * Auto-detect file type and parse accordingly.
 */
export function parseSpreadsheet(filePath: string): SpreadsheetData {
  const ext = filePath.toLowerCase().split('.').pop();

  switch (ext) {
    case 'csv':
      return parseCsvFile(filePath);
    case 'xlsx':
    case 'xls':
      return parseExcelFile(filePath);
    default:
      throw new Error(`Unsupported spreadsheet format: .${ext}`);
  }
}
