/**
 * CSV Parser for importing bank statement files
 *
 * Features:
 * - Auto-detection of delimiter (comma, semicolon, tab)
 * - Header row detection and column mapping
 * - Date parsing for multiple formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 * - Amount parsing with decimal separator detection (period, comma)
 * - Error handling with line number reporting
 *
 * @module CsvParser
 */

import { RawTransaction } from '../../types/transaction';
import { parseDate, detectDateFormat, DateFormat } from '../../utils/formatDate';

/**
 * Supported CSV delimiters
 */
export type CsvDelimiter = ',' | ';' | '\t';

/**
 * Parse error with line number information
 */
export interface CsvParseError {
  /** Line number where the error occurred (1-indexed) */
  lineNumber: number;
  /** Error message */
  message: string;
  /** Original line content */
  lineContent?: string;
}

/**
 * Result of CSV parsing operation
 */
export interface CsvParseResult {
  /** Successfully parsed transactions */
  transactions: RawTransaction[];
  /** Errors encountered during parsing */
  errors: CsvParseError[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Detected delimiter */
  delimiter: CsvDelimiter;
  /** Detected column mapping */
  columnMapping: ColumnMapping;
  /** Total lines processed */
  totalLines: number;
  /** Lines successfully parsed */
  successfulLines: number;
}

/**
 * Column mapping for CSV fields
 */
export interface ColumnMapping {
  /** Index of date column */
  dateIndex: number;
  /** Index of amount column */
  amountIndex: number;
  /** Index of description column */
  descriptionIndex: number;
  /** Header names if detected */
  headers?: string[];
}

/**
 * Options for CSV parsing
 */
export interface CsvParseOptions {
  /** Force a specific delimiter (auto-detect if not provided) */
  delimiter?: CsvDelimiter;
  /** Force a specific date format (auto-detect if not provided) */
  dateFormat?: DateFormat;
  /** Skip the first N lines (useful for files with metadata before headers) */
  skipLines?: number;
  /** Force column mapping (auto-detect if not provided) */
  columnMapping?: Partial<ColumnMapping>;
  /** Locale hint for amount parsing ('pt-BR' uses comma as decimal, 'en' uses period) */
  locale?: 'pt-BR' | 'en';
}

/**
 * Common header names for transaction fields (case-insensitive)
 */
const DATE_HEADERS = [
  'date',
  'data',
  'dt',
  'transaction date',
  'data transação',
  'data da transação',
  'posting date',
];
const AMOUNT_HEADERS = [
  'amount',
  'valor',
  'value',
  'transaction amount',
  'valor transação',
  'debit',
  'credit',
  'débito',
  'crédito',
];
const DESCRIPTION_HEADERS = [
  'description',
  'descrição',
  'descricao',
  'memo',
  'details',
  'detalhes',
  'transaction description',
  'histórico',
  'historico',
  'title',
  'título',
  'titulo',
  'lançamento',
  'lancamento',
  'merchant',
  'payee',
  'compra',
  'estabelecimento',
  'loja',
  'local',
];

/**
 * CSV Parser class for importing bank statements
 */
export class CsvParser {
  /**
   * Parses CSV content and extracts transactions
   *
   * @param content - Raw CSV content as string
   * @param options - Parsing options
   * @returns Parse result with transactions and errors
   */
  parse(content: string, options: CsvParseOptions = {}): CsvParseResult {
    const errors: CsvParseError[] = [];
    const warnings: string[] = [];
    const transactions: RawTransaction[] = [];

    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n').filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      return {
        transactions: [],
        errors: [{ lineNumber: 0, message: 'Empty CSV file' }],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: -1, amountIndex: -1, descriptionIndex: -1 },
        totalLines: 0,
        successfulLines: 0,
      };
    }

    // Skip initial lines if specified
    const skipLines = options.skipLines ?? 0;
    const effectiveLines = lines.slice(skipLines);

    if (effectiveLines.length === 0) {
      return {
        transactions: [],
        errors: [{ lineNumber: skipLines, message: 'No data lines after skipping' }],
        warnings: [],
        delimiter: ',',
        columnMapping: { dateIndex: -1, amountIndex: -1, descriptionIndex: -1 },
        totalLines: lines.length,
        successfulLines: 0,
      };
    }

    // Detect delimiter
    const delimiter = options.delimiter ?? this.detectDelimiter(effectiveLines);

    // Detect header row and column mapping
    const { hasHeader, columnMapping } = this.detectHeaderAndMapping(
      effectiveLines,
      delimiter,
      options.columnMapping
    );

    if (
      columnMapping.dateIndex === -1 ||
      columnMapping.amountIndex === -1 ||
      columnMapping.descriptionIndex === -1
    ) {
      warnings.push(
        'Could not detect all required columns. Using default positions: date=0, amount=1, description=2'
      );
      if (columnMapping.dateIndex === -1) columnMapping.dateIndex = 0;
      if (columnMapping.amountIndex === -1) columnMapping.amountIndex = 1;
      if (columnMapping.descriptionIndex === -1) columnMapping.descriptionIndex = 2;
    }

    // Determine starting line (skip header if detected)
    const dataStartIndex = hasHeader ? 1 : 0;

    // Detect date format from first few data lines
    const dateFormat =
      options.dateFormat ??
      this.detectDateFormatFromLines(
        effectiveLines.slice(dataStartIndex, dataStartIndex + 5),
        delimiter,
        columnMapping.dateIndex
      );

    // Parse data lines
    for (let i = dataStartIndex; i < effectiveLines.length; i++) {
      const lineNumber = skipLines + i + 1; // 1-indexed line number in original file
      const line = effectiveLines[i];
      if (!line) continue;

      try {
        const transaction = this.parseLine(
          line,
          delimiter,
          columnMapping,
          dateFormat,
          lineNumber,
          options.locale
        );
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        errors.push({
          lineNumber,
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          lineContent: line,
        });
      }
    }

    return {
      transactions,
      errors,
      warnings,
      delimiter,
      columnMapping,
      totalLines: effectiveLines.length,
      successfulLines: transactions.length,
    };
  }

  /**
   * Detects the delimiter used in CSV content by analyzing frequency
   *
   * @param lines - Array of CSV lines
   * @returns Detected delimiter
   */
  detectDelimiter(lines: string[]): CsvDelimiter {
    const delimiters: CsvDelimiter[] = [',', ';', '\t'];
    const sampleLines = lines.slice(0, Math.min(5, lines.length));

    // Count occurrences of each delimiter in each line
    const counts: Record<CsvDelimiter, number[]> = {
      ',': [],
      ';': [],
      '\t': [],
    };

    for (const line of sampleLines) {
      for (const delimiter of delimiters) {
        // Count occurrences outside of quoted strings
        const count = this.countDelimiterOccurrences(line, delimiter);
        counts[delimiter].push(count);
      }
    }

    // Find delimiter with most consistent non-zero count across lines
    let bestDelimiter: CsvDelimiter = ',';
    let bestScore = -1;

    for (const delimiter of delimiters) {
      const delimiterCounts = counts[delimiter];
      if (delimiterCounts.length === 0) continue;

      const minCount = Math.min(...delimiterCounts);
      const maxCount = Math.max(...delimiterCounts);

      // Score based on consistency (same count across lines) and having at least 1 occurrence
      if (minCount > 0 && minCount === maxCount) {
        const score = minCount * 10; // Prefer more columns
        if (score > bestScore) {
          bestScore = score;
          bestDelimiter = delimiter;
        }
      } else if (minCount > 0) {
        // Less consistent but still valid
        const avgCount = delimiterCounts.reduce((a, b) => a + b, 0) / delimiterCounts.length;
        const variance =
          delimiterCounts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) /
          delimiterCounts.length;
        const score = avgCount * (1 / (1 + variance));
        if (score > bestScore) {
          bestScore = score;
          bestDelimiter = delimiter;
        }
      }
    }

    return bestDelimiter;
  }

  /**
   * Counts delimiter occurrences in a line, respecting quoted strings
   */
  private countDelimiterOccurrences(line: string, delimiter: CsvDelimiter): number {
    let count = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Handle escaped quotes
        if (inQuotes && line[i + 1] === '"') {
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        count++;
      }
    }

    return count;
  }

  /**
   * Detects header row and maps columns to transaction fields
   */
  private detectHeaderAndMapping(
    lines: string[],
    delimiter: CsvDelimiter,
    forcedMapping?: Partial<ColumnMapping>
  ): { hasHeader: boolean; columnMapping: ColumnMapping } {
    if (lines.length === 0) {
      return {
        hasHeader: false,
        columnMapping: {
          dateIndex: forcedMapping?.dateIndex ?? -1,
          amountIndex: forcedMapping?.amountIndex ?? -1,
          descriptionIndex: forcedMapping?.descriptionIndex ?? -1,
        },
      };
    }

    const firstLine = lines[0];
    if (!firstLine) {
      return {
        hasHeader: false,
        columnMapping: {
          dateIndex: forcedMapping?.dateIndex ?? -1,
          amountIndex: forcedMapping?.amountIndex ?? -1,
          descriptionIndex: forcedMapping?.descriptionIndex ?? -1,
        },
      };
    }
    const fields = this.splitLine(firstLine, delimiter);

    // Check if first line looks like a header (contains known header names)
    let dateIndex = forcedMapping?.dateIndex ?? -1;
    let amountIndex = forcedMapping?.amountIndex ?? -1;
    let descriptionIndex = forcedMapping?.descriptionIndex ?? -1;
    let hasHeader = false;

    // Try to match headers
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]?.toLowerCase().trim() ?? '';

      if (dateIndex === -1 && DATE_HEADERS.some((h) => field.includes(h))) {
        dateIndex = i;
        hasHeader = true;
      }
      if (amountIndex === -1 && AMOUNT_HEADERS.some((h) => field.includes(h))) {
        amountIndex = i;
        hasHeader = true;
      }
      if (descriptionIndex === -1 && DESCRIPTION_HEADERS.some((h) => field.includes(h))) {
        descriptionIndex = i;
        hasHeader = true;
      }
    }

    // If no headers detected, try to infer from data patterns
    if (!hasHeader && lines.length > 1) {
      const dataLine = lines[1];
      if (dataLine) {
        const dataFields = this.splitLine(dataLine, delimiter);

        for (let i = 0; i < dataFields.length; i++) {
          const field = dataFields[i]?.trim() ?? '';

          // Check if field looks like a date
          if (dateIndex === -1 && this.looksLikeDate(field)) {
            dateIndex = i;
          }
          // Check if field looks like an amount
          else if (amountIndex === -1 && this.looksLikeAmount(field)) {
            amountIndex = i;
          }
          // Assume remaining text field is description
          else if (
            descriptionIndex === -1 &&
            field.length > 0 &&
            !this.looksLikeDate(field) &&
            !this.looksLikeAmount(field)
          ) {
            descriptionIndex = i;
          }
        }
      }
    }

    return {
      hasHeader,
      columnMapping: {
        dateIndex,
        amountIndex,
        descriptionIndex,
        headers: hasHeader ? fields : undefined,
      },
    };
  }

  /**
   * Checks if a string looks like a date
   */
  private looksLikeDate(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY or MM-DD-YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
    ];

    return datePatterns.some((pattern) => pattern.test(value.trim()));
  }

  /**
   * Checks if a string looks like a monetary amount
   */
  private looksLikeAmount(value: string): boolean {
    // Remove currency symbols and whitespace
    const cleaned = value.replace(/[R$€£¥\s]/g, '').trim();

    // Amount patterns (with optional negative sign)
    const amountPatterns = [
      /^-?\d+[.,]\d{2}$/, // 123.45 or 123,45
      /^-?\d{1,3}([.,]\d{3})*[.,]\d{2}$/, // 1.234,56 or 1,234.56
      /^-?\d+$/, // Integer amounts
      /^\(-?\d+[.,]\d{2}\)$/, // (123.45) negative format
    ];

    return amountPatterns.some((pattern) => pattern.test(cleaned));
  }

  /**
   * Detects date format from sample data lines
   */
  private detectDateFormatFromLines(
    lines: string[],
    delimiter: CsvDelimiter,
    dateIndex: number
  ): DateFormat | undefined {
    for (const line of lines) {
      const fields = this.splitLine(line, delimiter);
      if (dateIndex >= 0 && dateIndex < fields.length) {
        const dateValue = fields[dateIndex]?.trim();
        if (dateValue) {
          const format = detectDateFormat(dateValue);
          if (format) {
            return format;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Splits a CSV line into fields, respecting quoted values
   */
  splitLine(line: string, delimiter: CsvDelimiter): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    fields.push(currentField);

    return fields;
  }

  /**
   * Parses a single CSV line into a RawTransaction
   */
  private parseLine(
    line: string,
    delimiter: CsvDelimiter,
    mapping: ColumnMapping,
    dateFormat: DateFormat | undefined,
    lineNumber: number,
    locale?: 'pt-BR' | 'en'
  ): RawTransaction | null {
    const fields = this.splitLine(line, delimiter);

    // Validate we have enough fields
    const maxIndex = Math.max(mapping.dateIndex, mapping.amountIndex, mapping.descriptionIndex);
    if (fields.length <= maxIndex) {
      throw new Error(`Line has ${fields.length} fields, but expected at least ${maxIndex + 1}`);
    }

    // Parse date
    const dateValue = fields[mapping.dateIndex]?.trim();
    if (!dateValue) {
      throw new Error('Missing date value');
    }
    const date = this.parseTransactionDate(dateValue, dateFormat);
    if (!date) {
      throw new Error(`Invalid date: "${dateValue}"`);
    }

    // Parse amount
    const amountValue = fields[mapping.amountIndex]?.trim();
    if (!amountValue) {
      throw new Error('Missing amount value');
    }
    const amount = this.parseAmount(amountValue, locale);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: "${amountValue}"`);
    }

    // Parse description
    const description = fields[mapping.descriptionIndex]?.trim();
    if (!description) {
      throw new Error('Empty description');
    }

    return {
      date,
      amount,
      description,
      sourceLineNumber: lineNumber,
    };
  }

  /**
   * Parses a date string with format detection
   */
  private parseTransactionDate(value: string, format?: DateFormat): Date | null {
    // Try specified format first
    if (format) {
      const result = parseDate(value, { format });
      if (result) return result;
    }

    // Try auto-detection
    const detectedFormat = detectDateFormat(value);
    if (detectedFormat) {
      const result = parseDate(value, { format: detectedFormat });
      if (result) return result;
    }

    // Try all formats
    const formats: DateFormat[] = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
    for (const fmt of formats) {
      const result = parseDate(value, { format: fmt });
      if (result) return result;
    }

    return null;
  }

  /**
   * Parses an amount string with decimal separator detection
   *
   * Handles:
   * - Period as decimal separator (1234.56)
   * - Comma as decimal separator (1234,56)
   * - Thousand separators (1.234,56 or 1,234.56)
   * - Negative amounts (-100, (100))
   * - Currency symbols (R$ 100, $100)
   */
  parseAmount(value: string, locale?: 'pt-BR' | 'en'): number {
    if (!value || typeof value !== 'string') {
      return NaN;
    }

    let cleaned = value.trim();

    // Check for negative in parentheses format: (100.00)
    const isParenthesesNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
    if (isParenthesesNegative) {
      cleaned = cleaned.slice(1, -1);
    }

    // Check for negative sign
    const isNegative = cleaned.startsWith('-') || isParenthesesNegative;
    cleaned = cleaned.replace(/^-/, '');

    // Remove currency symbols and whitespace
    cleaned = cleaned.replace(/[R$€£¥\s]/g, '');

    if (cleaned === '') {
      return NaN;
    }

    // Detect decimal separator
    const decimalSeparator = this.detectDecimalSeparator(cleaned, locale);

    if (decimalSeparator === ',') {
      // pt-BR style: 1.234,56
      cleaned = cleaned.replace(/\./g, ''); // Remove thousand separators
      cleaned = cleaned.replace(',', '.'); // Convert decimal separator
    } else {
      // en style: 1,234.56
      cleaned = cleaned.replace(/,/g, ''); // Remove thousand separators
    }

    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return NaN;
    }

    return isNegative ? -parsed : parsed;
  }

  /**
   * Detects the decimal separator used in an amount string
   */
  detectDecimalSeparator(value: string, locale?: 'pt-BR' | 'en'): '.' | ',' {
    // If locale is specified, use its convention
    if (locale === 'pt-BR') return ',';
    if (locale === 'en') return '.';

    // Count occurrences of . and ,
    const dotCount = (value.match(/\./g) || []).length;
    const commaCount = (value.match(/,/g) || []).length;

    // If only one type of separator, check position
    if (dotCount === 0 && commaCount === 1) {
      // Single comma - check if it's followed by exactly 2 digits at end
      if (/,\d{2}$/.test(value)) {
        return ','; // Comma is decimal separator
      }
    }

    if (commaCount === 0 && dotCount === 1) {
      // Single dot - check if it's followed by exactly 2 digits at end
      if (/\.\d{2}$/.test(value)) {
        return '.'; // Dot is decimal separator
      }
    }

    // Multiple separators - the last one is likely the decimal separator
    const lastDotIndex = value.lastIndexOf('.');
    const lastCommaIndex = value.lastIndexOf(',');

    if (lastDotIndex > lastCommaIndex) {
      // Dot comes last - check if it's followed by 1-2 digits
      if (/\.\d{1,2}$/.test(value)) {
        return '.';
      }
    }

    if (lastCommaIndex > lastDotIndex) {
      // Comma comes last - check if it's followed by 1-2 digits
      if (/,\d{1,2}$/.test(value)) {
        return ',';
      }
    }

    // Default to period (most common in programming contexts)
    return '.';
  }

  /**
   * Formats transactions back to CSV (for round-trip testing)
   *
   * @param transactions - Transactions to format
   * @param options - Formatting options
   * @returns CSV string
   */
  formatToCsv(
    transactions: RawTransaction[],
    options: {
      delimiter?: CsvDelimiter;
      dateFormat?: DateFormat;
      includeHeader?: boolean;
    } = {}
  ): string {
    const { delimiter = ',', dateFormat = 'YYYY-MM-DD', includeHeader = true } = options;

    const lines: string[] = [];

    if (includeHeader) {
      lines.push(['date', 'amount', 'description'].join(delimiter));
    }

    for (const transaction of transactions) {
      const dateStr = this.formatDate(transaction.date, dateFormat);
      const amountStr = transaction.amount.toFixed(2);
      const descriptionStr = this.escapeField(transaction.description, delimiter);

      lines.push([dateStr, amountStr, descriptionStr].join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Formats a date according to the specified format
   */
  private formatDate(date: Date, format: DateFormat): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Escapes a field value for CSV output
   */
  private escapeField(value: string, delimiter: CsvDelimiter): string {
    // If field contains delimiter, quotes, or newlines, wrap in quotes
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      // Escape quotes by doubling them
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return value;
  }
}

/**
 * Default CsvParser instance
 */
export const csvParser = new CsvParser();
