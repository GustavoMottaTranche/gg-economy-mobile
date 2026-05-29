/**
 * Excel Parser for importing bank statement files (.xlsx, .xls)
 *
 * Features:
 * - Support for .xlsx and .xls formats using SheetJS
 * - Auto-detection of column mapping (date, amount, description)
 * - Header row detection with Portuguese and English support
 * - Date parsing for Excel serial numbers and text formats
 * - Amount parsing with decimal separator detection
 * - Multi-sheet support with sheet listing and selection
 * - Error handling with row number reporting
 *
 * @module ExcelParser
 */

import * as XLSX from 'xlsx';
import { RawTransaction } from '../../types/transaction';
import { parseDate, detectDateFormat, DateFormat } from '../../utils/formatDate';
import {
  ExcelParseOptions,
  ExcelParseResult,
  ExcelParseError,
  SheetInfo,
  ExcelColumnMapping,
} from './types';

/**
 * Maximum number of rows allowed in an Excel file
 */
const MAX_EXCEL_ROWS = 10000;

/**
 * Number of preview rows to include in sheet info
 */
const PREVIEW_ROWS = 5;

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
  'data lançamento',
  'data do lançamento',
  'data lancamento',
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
  'debito',
  'credito',
  'quantia',
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
  'observação',
  'observacao',
  'compra',
  'estabelecimento',
  'loja',
  'local',
  'title',
  'título',
  'titulo',
  'lançamento',
  'lancamento',
  'merchant',
  'payee',
];

/**
 * Excel Parser class for importing bank statements from Excel files
 */
export class ExcelParser {
  /**
   * Parses Excel file content and extracts transactions
   *
   * @param data - ArrayBuffer or base64 string of the Excel file
   * @param options - Parsing options
   * @returns Parse result with transactions and errors
   */
  parse(data: ArrayBuffer | string, options: ExcelParseOptions = {}): ExcelParseResult {
    const errors: ExcelParseError[] = [];
    const warnings: string[] = [];
    const transactions: RawTransaction[] = [];

    try {
      // Read workbook
      const workbook = this.readWorkbook(data);

      // Get sheet info
      const sheets = this.extractSheetInfo(workbook);

      if (sheets.length === 0) {
        return this.createErrorResult('EXCEL_NO_SHEETS', 'No worksheets found in the Excel file');
      }

      // Determine which sheet to use
      const targetSheet = this.selectSheet(workbook, sheets, options);

      if (!targetSheet) {
        return this.createErrorResult('EXCEL_EMPTY_SHEET', 'The selected worksheet is empty');
      }

      // Get worksheet data as array of arrays
      const sheetData: unknown[][] = XLSX.utils.sheet_to_json(targetSheet.sheet!, {
        header: 1,
        defval: '',
        raw: false,
      });

      if (sheetData.length === 0) {
        return this.createErrorResult('EXCEL_EMPTY_SHEET', 'The selected worksheet is empty');
      }

      // Check row limit
      if (sheetData.length > MAX_EXCEL_ROWS) {
        return this.createErrorResult(
          'EXCEL_TOO_MANY_ROWS',
          `File exceeds the limit of ${MAX_EXCEL_ROWS} rows (found ${sheetData.length} rows)`
        );
      }

      // Detect header and column mapping
      const { hasHeader, columnMapping } = this.detectHeaderAndMapping(
        sheetData,
        options.columnMapping
      );

      if (
        columnMapping.dateColumn === -1 ||
        columnMapping.amountColumn === -1 ||
        columnMapping.descriptionColumn === -1
      ) {
        const missingColumns: string[] = [];
        if (columnMapping.dateColumn === -1) missingColumns.push('date');
        if (columnMapping.amountColumn === -1) missingColumns.push('amount');
        if (columnMapping.descriptionColumn === -1) missingColumns.push('description');

        warnings.push(
          `Could not detect columns: ${missingColumns.join(', ')}. Using default positions.`
        );

        // Apply defaults for missing columns
        if (columnMapping.dateColumn === -1) columnMapping.dateColumn = 0;
        if (columnMapping.amountColumn === -1) columnMapping.amountColumn = 1;
        if (columnMapping.descriptionColumn === -1) columnMapping.descriptionColumn = 2;
      }

      // Determine starting row (skip header if detected)
      const dataStartIndex = hasHeader ? 1 : 0;

      // Parse data rows
      for (let i = dataStartIndex; i < sheetData.length; i++) {
        const rowNumber = i + 1; // 1-indexed for user display
        const row = sheetData[i];
        if (!row) continue;

        // Skip empty rows
        if (this.isEmptyRow(row)) {
          continue;
        }

        try {
          const transaction = this.parseRow(row, columnMapping, rowNumber, options.locale);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            rowNumber,
            message: error instanceof Error ? error.message : 'Unknown parsing error',
            cellContent: this.getRowPreview(row),
          });
        }
      }

      if (transactions.length === 0) {
        return {
          transactions: [],
          errors,
          warnings,
          sheets,
          usedSheet: targetSheet.name,
          columnMapping,
          totalRows: sheetData.length - (hasHeader ? 1 : 0),
          successfulRows: 0,
        };
      }

      return {
        transactions,
        errors,
        warnings,
        sheets,
        usedSheet: targetSheet.name,
        columnMapping,
        totalRows: sheetData.length - (hasHeader ? 1 : 0),
        successfulRows: transactions.length,
      };
    } catch (error) {
      // Handle password-protected files
      if (error instanceof Error && error.message.includes('password')) {
        return this.createErrorResult(
          'EXCEL_PASSWORD_PROTECTED',
          'This file is password-protected. Please remove the password and try again.'
        );
      }

      // Handle corrupted files
      if (
        error instanceof Error &&
        (error.message.includes('corrupted') || error.message.includes('invalid'))
      ) {
        return this.createErrorResult(
          'EXCEL_CORRUPTED',
          'The file appears to be corrupted or invalid'
        );
      }

      return this.createErrorResult(
        'EXCEL_READ_ERROR',
        error instanceof Error ? error.message : 'Failed to read Excel file'
      );
    }
  }

  /**
   * Lists all worksheets in an Excel file
   *
   * @param data - ArrayBuffer or base64 string of the Excel file
   * @returns Array of sheet information
   */
  listSheets(data: ArrayBuffer | string): SheetInfo[] {
    const workbook = this.readWorkbook(data);
    return this.extractSheetInfo(workbook);
  }

  /**
   * Detects column mapping automatically from worksheet data
   *
   * @param sheet - XLSX WorkSheet object
   * @returns Detected column mapping
   */
  detectColumnMapping(sheet: XLSX.WorkSheet): ExcelColumnMapping {
    const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const { columnMapping } = this.detectHeaderAndMapping(sheetData);
    return columnMapping;
  }

  /**
   * Parses Excel serial date number to JavaScript Date
   *
   * Excel stores dates as the number of days since December 30, 1899.
   * This method handles both the 1900 date system (Windows) and 1904 date system (Mac).
   *
   * @param serial - Excel serial date number
   * @param use1904DateSystem - Whether to use the 1904 date system (default: false)
   * @returns JavaScript Date object
   */
  parseExcelDate(serial: number, use1904DateSystem: boolean = false): Date {
    // Excel's epoch: December 30, 1899 (1900 system) or January 1, 1904 (1904 system)
    const excelEpoch = use1904DateSystem
      ? new Date(Date.UTC(1904, 0, 1))
      : new Date(Date.UTC(1899, 11, 30));

    // Excel incorrectly treats 1900 as a leap year, so we need to adjust for dates after Feb 28, 1900
    let adjustedSerial = serial;
    if (!use1904DateSystem && serial > 59) {
      adjustedSerial -= 1;
    }

    // Convert serial to milliseconds and add to epoch
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + adjustedSerial * millisecondsPerDay);

    return date;
  }

  /**
   * Formats transactions back to Excel format (for round-trip testing)
   *
   * @param transactions - Transactions to format
   * @returns ArrayBuffer containing the Excel file
   */
  formatToExcel(transactions: RawTransaction[]): ArrayBuffer {
    // Create worksheet data with headers
    const wsData: (string | number)[][] = [['date', 'amount', 'description']];

    for (const transaction of transactions) {
      const dateStr = this.formatDateForExcel(transaction.date);
      wsData.push([dateStr, transaction.amount, transaction.description]);
    }

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // Write to ArrayBuffer
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return buffer;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Reads an Excel workbook from data
   */
  private readWorkbook(data: ArrayBuffer | string): XLSX.WorkBook {
    if (typeof data === 'string') {
      // Assume base64 encoded
      return XLSX.read(data, { type: 'base64' });
    }
    return XLSX.read(data, { type: 'array' });
  }

  /**
   * Extracts sheet information from a workbook
   */
  private extractSheetInfo(workbook: XLSX.WorkBook): SheetInfo[] {
    const sheets: SheetInfo[] = [];

    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const name = workbook.SheetNames[i];
      if (!name) continue;
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      // Get sheet data for row count and preview
      const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      // Filter out completely empty rows for accurate count
      const nonEmptyRows = sheetData.filter((row) => !this.isEmptyRow(row));

      // Create preview (first N rows)
      const preview: string[][] = sheetData
        .slice(0, PREVIEW_ROWS)
        .map((row) => (row as unknown[]).map((cell) => String(cell ?? '')));

      sheets.push({
        name,
        index: i,
        rowCount: nonEmptyRows.length,
        preview,
      });
    }

    return sheets;
  }

  /**
   * Selects the target sheet based on options
   */
  private selectSheet(
    workbook: XLSX.WorkBook,
    _sheets: SheetInfo[],
    options: ExcelParseOptions
  ): { name: string; sheet: XLSX.WorkSheet } | null {
    let targetSheetName: string | undefined;

    if (options.sheetName) {
      // Use specified sheet name
      if (!workbook.SheetNames.includes(options.sheetName)) {
        return null;
      }
      targetSheetName = options.sheetName;
    } else if (options.sheetIndex !== undefined) {
      // Use specified sheet index
      if (options.sheetIndex < 0 || options.sheetIndex >= workbook.SheetNames.length) {
        return null;
      }
      targetSheetName = workbook.SheetNames[options.sheetIndex];
    } else {
      // Default to first sheet
      targetSheetName = workbook.SheetNames[0];
    }

    if (!targetSheetName) {
      return null;
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return null;
    }

    return { name: targetSheetName, sheet };
  }

  /**
   * Detects header row and maps columns to transaction fields
   */
  private detectHeaderAndMapping(
    data: unknown[][],
    forcedMapping?: Partial<ExcelColumnMapping>
  ): { hasHeader: boolean; columnMapping: ExcelColumnMapping } {
    if (data.length === 0) {
      return {
        hasHeader: false,
        columnMapping: {
          dateColumn: forcedMapping?.dateColumn ?? -1,
          amountColumn: forcedMapping?.amountColumn ?? -1,
          descriptionColumn: forcedMapping?.descriptionColumn ?? -1,
        },
      };
    }

    const firstRow = data[0];
    if (!firstRow) {
      return {
        hasHeader: false,
        columnMapping: {
          dateColumn: forcedMapping?.dateColumn ?? -1,
          amountColumn: forcedMapping?.amountColumn ?? -1,
          descriptionColumn: forcedMapping?.descriptionColumn ?? -1,
        },
      };
    }

    let dateColumn = forcedMapping?.dateColumn ?? -1;
    let amountColumn = forcedMapping?.amountColumn ?? -1;
    let descriptionColumn = forcedMapping?.descriptionColumn ?? -1;
    let hasHeader = false;

    // Try to match headers in first row
    for (let i = 0; i < firstRow.length; i++) {
      const cellValue = String(firstRow[i] ?? '')
        .toLowerCase()
        .trim();

      if (dateColumn === -1 && DATE_HEADERS.some((h) => cellValue.includes(h))) {
        dateColumn = i;
        hasHeader = true;
      }
      if (amountColumn === -1 && AMOUNT_HEADERS.some((h) => cellValue.includes(h))) {
        amountColumn = i;
        hasHeader = true;
      }
      if (descriptionColumn === -1 && DESCRIPTION_HEADERS.some((h) => cellValue.includes(h))) {
        descriptionColumn = i;
        hasHeader = true;
      }
    }

    // If no headers detected, try to infer from data patterns by scanning multiple rows
    if (!hasHeader && data.length > 1) {
      const maxColCount = Math.max(...data.slice(0, 10).map((r) => (r ? r.length : 0)));
      const rowsToScan = Math.min(data.length, 10);

      // Build confidence scores for each column
      const dateScores: number[] = new Array(maxColCount).fill(0);
      const amountScores: number[] = new Array(maxColCount).fill(0);
      const textScores: number[] = new Array(maxColCount).fill(0);
      let scannedRows = 0;

      for (let rowIdx = 0; rowIdx < rowsToScan; rowIdx++) {
        const dataRow = data[rowIdx];
        if (!dataRow || this.isEmptyRow(dataRow)) continue;
        scannedRows++;

        for (let i = 0; i < dataRow.length; i++) {
          const cellValue = String(dataRow[i] ?? '').trim();
          if (cellValue.length === 0) continue;

          if (this.looksLikeDate(cellValue)) {
            dateScores[i] = (dateScores[i] ?? 0) + 1;
          } else if (this.looksLikeAmount(cellValue)) {
            amountScores[i] = (amountScores[i] ?? 0) + 1;
          } else {
            textScores[i] = (textScores[i] ?? 0) + 1;
          }
        }
      }

      // Assign columns based on highest confidence (require at least 50% of scanned rows to match)
      const threshold = scannedRows > 1 ? Math.ceil(scannedRows * 0.5) : 1;

      // Find best date column
      if (dateColumn === -1) {
        let bestScore = 0;
        for (let i = 0; i < maxColCount; i++) {
          if ((dateScores[i] ?? 0) >= threshold && (dateScores[i] ?? 0) > bestScore) {
            bestScore = dateScores[i] ?? 0;
            dateColumn = i;
          }
        }
      }

      // Find best amount column (prioritize numeric detection)
      if (amountColumn === -1) {
        let bestScore = 0;
        for (let i = 0; i < maxColCount; i++) {
          if (i === dateColumn) continue;
          if ((amountScores[i] ?? 0) >= threshold && (amountScores[i] ?? 0) > bestScore) {
            bestScore = amountScores[i] ?? 0;
            amountColumn = i;
          }
        }
      }

      // Find best description column (text that is not date or amount)
      if (descriptionColumn === -1) {
        let bestScore = 0;
        for (let i = 0; i < maxColCount; i++) {
          if (i === dateColumn || i === amountColumn) continue;
          if ((textScores[i] ?? 0) >= threshold && (textScores[i] ?? 0) > bestScore) {
            bestScore = textScores[i] ?? 0;
            descriptionColumn = i;
          }
        }
      }
    }

    return {
      hasHeader,
      columnMapping: {
        dateColumn,
        amountColumn,
        descriptionColumn,
      },
    };
  }

  /**
   * Parses a single row into a RawTransaction
   */
  private parseRow(
    row: unknown[],
    mapping: ExcelColumnMapping,
    rowNumber: number,
    locale?: 'pt-BR' | 'en'
  ): RawTransaction | null {
    // Validate we have enough columns
    const maxIndex = Math.max(mapping.dateColumn, mapping.amountColumn, mapping.descriptionColumn);
    if (row.length <= maxIndex) {
      throw new Error(`Row has ${row.length} columns, but expected at least ${maxIndex + 1}`);
    }

    // Parse date
    const dateValue = row[mapping.dateColumn];
    const date = this.parseTransactionDate(dateValue);
    if (!date) {
      throw new Error(`Invalid date: "${dateValue}"`);
    }

    // Parse amount
    const amountValue = row[mapping.amountColumn];
    const amount = this.parseAmount(amountValue, locale);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: "${amountValue}"`);
    }

    // Parse description
    const description = String(row[mapping.descriptionColumn] ?? '').trim();
    if (!description) {
      throw new Error('Empty description');
    }

    return {
      date,
      amount,
      description,
      sourceLineNumber: rowNumber,
    };
  }

  /**
   * Parses a date value from Excel (can be serial number or text)
   */
  private parseTransactionDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // If it's a number, treat as Excel serial date
    if (typeof value === 'number') {
      return this.parseExcelDate(value);
    }

    // If it's already a Date object
    if (value instanceof Date) {
      return value;
    }

    // Try to parse as string
    const strValue = String(value).trim();

    // Try auto-detection
    const detectedFormat = detectDateFormat(strValue);
    if (detectedFormat) {
      const result = parseDate(strValue, { format: detectedFormat });
      if (result) return result;
    }

    // Try common formats
    const formats: DateFormat[] = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
    for (const fmt of formats) {
      const result = parseDate(strValue, { format: fmt });
      if (result) return result;
    }

    return null;
  }

  /**
   * Parses an amount value from Excel
   */
  private parseAmount(value: unknown, locale?: 'pt-BR' | 'en'): number {
    if (value === null || value === undefined || value === '') {
      return NaN;
    }

    // If it's already a number
    if (typeof value === 'number') {
      return value;
    }

    // Parse as string
    let strValue = String(value).trim();

    // Check for negative in parentheses format: (100.00)
    const isParenthesesNegative = strValue.startsWith('(') && strValue.endsWith(')');
    if (isParenthesesNegative) {
      strValue = strValue.slice(1, -1);
    }

    // Check for negative sign
    const isNegative = strValue.startsWith('-') || isParenthesesNegative;
    strValue = strValue.replace(/^-/, '');

    // Remove currency symbols and whitespace
    strValue = strValue.replace(/[R$€£¥\s]/g, '');

    if (strValue === '') {
      return NaN;
    }

    // Detect decimal separator
    const decimalSeparator = this.detectDecimalSeparator(strValue, locale);

    if (decimalSeparator === ',') {
      // pt-BR style: 1.234,56
      strValue = strValue.replace(/\./g, ''); // Remove thousand separators
      strValue = strValue.replace(',', '.'); // Convert decimal separator
    } else {
      // en style: 1,234.56
      strValue = strValue.replace(/,/g, ''); // Remove thousand separators
    }

    const parsed = parseFloat(strValue);

    if (isNaN(parsed)) {
      return NaN;
    }

    return isNegative ? -parsed : parsed;
  }

  /**
   * Detects the decimal separator used in an amount string
   */
  private detectDecimalSeparator(value: string, locale?: 'pt-BR' | 'en'): '.' | ',' {
    if (locale === 'pt-BR') return ',';
    if (locale === 'en') return '.';

    const dotCount = (value.match(/\./g) || []).length;
    const commaCount = (value.match(/,/g) || []).length;

    if (dotCount === 0 && commaCount === 1) {
      if (/,\d{2}$/.test(value)) {
        return ',';
      }
    }

    if (commaCount === 0 && dotCount === 1) {
      if (/\.\d{2}$/.test(value)) {
        return '.';
      }
    }

    const lastDotIndex = value.lastIndexOf('.');
    const lastCommaIndex = value.lastIndexOf(',');

    if (lastDotIndex > lastCommaIndex) {
      if (/\.\d{1,2}$/.test(value)) {
        return '.';
      }
    }

    if (lastCommaIndex > lastDotIndex) {
      if (/,\d{1,2}$/.test(value)) {
        return ',';
      }
    }

    return '.';
  }

  /**
   * Checks if a string looks like a date
   */
  private looksLikeDate(value: string): boolean {
    const datePatterns = [
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY or MM-DD-YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
      /^\d{5}$/, // Excel serial date (5 digits)
    ];

    return datePatterns.some((pattern) => pattern.test(value.trim()));
  }

  /**
   * Checks if a string looks like a monetary amount
   */
  private looksLikeAmount(value: string): boolean {
    const cleaned = value.replace(/[R$€£¥\s]/g, '').trim();

    const amountPatterns = [
      /^-?\d+[.,]\d{2}$/, // 123.45 or 123,45
      /^-?\d{1,3}([.,]\d{3})*[.,]\d{2}$/, // 1.234,56 or 1,234.56
      /^-?\d+$/, // Integer amounts
      /^\(-?\d+[.,]\d{2}\)$/, // (123.45) negative format
    ];

    return amountPatterns.some((pattern) => pattern.test(cleaned));
  }

  /**
   * Checks if a row is empty
   */
  private isEmptyRow(row: unknown[]): boolean {
    if (!row || row.length === 0) return true;
    return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
  }

  /**
   * Gets a preview string of a row for error reporting
   */
  private getRowPreview(row: unknown[]): string {
    return row
      .slice(0, 5)
      .map((cell) => String(cell ?? '').substring(0, 20))
      .join(' | ');
  }

  /**
   * Formats a date for Excel output
   */
  private formatDateForExcel(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  /**
   * Creates an error result with a specific error code
   */
  private createErrorResult(code: string, message: string): ExcelParseResult {
    return {
      transactions: [],
      errors: [{ rowNumber: 0, message: `${code}: ${message}` }],
      warnings: [],
      sheets: [],
      usedSheet: '',
      columnMapping: { dateColumn: -1, amountColumn: -1, descriptionColumn: -1 },
      totalRows: 0,
      successfulRows: 0,
    };
  }
}

/**
 * Default ExcelParser instance
 */
export const excelParser = new ExcelParser();
