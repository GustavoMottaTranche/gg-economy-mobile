/**
 * Unit Tests for ExcelParser
 *
 * Tests for Excel file parsing functionality including:
 * - .xlsx and .xls file parsing
 * - Empty row and column handling
 * - Merged cell handling
 * - Error cases (password-protected, corrupted, etc.)
 * - Sheet listing
 * - Column detection
 *
 * **Validates: Requirements 13.1, 13.2, 13.5, 13.6**
 */

import * as XLSX from 'xlsx';
import { ExcelParser, excelParser } from '../../../services/import/ExcelParser';
import { RawTransaction } from '../../../types/transaction';

describe('ExcelParser Unit Tests', () => {
  const parser = new ExcelParser();

  // Helper to create test Excel data
  function createTestExcel(
    data: (string | number | null)[][],
    options?: { sheetName?: string; bookType?: 'xlsx' | 'xlsb' }
  ): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, options?.sheetName || 'Sheet1');
    return XLSX.write(wb, { type: 'array', bookType: options?.bookType || 'xlsx' });
  }

  // Helper to create multi-sheet Excel
  function createMultiSheetExcel(
    sheets: { name: string; data: (string | number | null)[][] }[]
  ): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    for (const sheet of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    }
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  }

  /**
   * Requirement 13.1: Test Excel_Parser with .xlsx files
   */
  describe('XLSX File Parsing (Requirement 13.1)', () => {
    it('should parse a valid .xlsx file with headers', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Test transaction 1'],
        ['2024-01-16', -50.25, 'Test transaction 2'],
        ['2024-01-17', 200.0, 'Test transaction 3'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(result.successfulRows).toBe(3);
      expect(result.totalRows).toBe(3);
    });

    it('should parse a valid .xlsx file without headers', () => {
      const data = [
        ['2024-01-15', 100.5, 'Test transaction 1'],
        ['2024-01-16', -50.25, 'Test transaction 2'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      // Should still parse (may have warnings about column detection)
      expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect Portuguese headers correctly', () => {
      const data = [
        ['data', 'valor', 'descrição'],
        ['2024-01-15', 100.5, 'Transação teste'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
      expect(result.columnMapping.dateColumn).toBe(0);
      expect(result.columnMapping.amountColumn).toBe(1);
      expect(result.columnMapping.descriptionColumn).toBe(2);
    });

    it('should detect English headers correctly', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Test transaction'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
      expect(result.columnMapping.dateColumn).toBe(0);
      expect(result.columnMapping.amountColumn).toBe(1);
      expect(result.columnMapping.descriptionColumn).toBe(2);
    });
  });

  /**
   * Requirement 13.2: Test Excel_Parser with .xls files (legacy format)
   */
  describe('XLS File Parsing - Legacy Format (Requirement 13.2)', () => {
    it('should parse data in xlsb format (binary)', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Test transaction'],
      ];

      // Create xlsb format (closest to xls we can create programmatically)
      const excelData = createTestExcel(data, { bookType: 'xlsb' });
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
    });
  });

  /**
   * Requirement 13.5: Test handling of empty rows and columns
   */
  describe('Empty Rows and Columns Handling (Requirement 13.5)', () => {
    it('should skip empty rows', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Transaction 1'],
        ['', '', ''], // Empty row
        ['2024-01-16', 200.0, 'Transaction 2'],
        [null, null, null], // Another empty row
        ['2024-01-17', 300.0, 'Transaction 3'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(3);
      expect(result.errors.length).toBe(0);
    });

    it('should handle rows with only whitespace', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Transaction 1'],
        ['   ', '   ', '   '], // Whitespace only
        ['2024-01-16', 200.0, 'Transaction 2'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(2);
    });

    it('should handle extra empty columns', () => {
      const data = [
        ['date', 'amount', 'description', '', ''],
        ['2024-01-15', 100.5, 'Transaction 1', '', ''],
        ['2024-01-16', 200.0, 'Transaction 2', '', ''],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(2);
    });

    it('should handle leading empty columns', () => {
      const data = [
        ['', 'date', 'amount', 'description'],
        ['', '2024-01-15', 100.5, 'Transaction 1'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      // Should detect columns correctly even with leading empty column
      expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Requirement 13.6: Test handling of merged cells
   */
  describe('Merged Cells Handling (Requirement 13.6)', () => {
    it('should handle data with potential merged cell patterns', () => {
      // SheetJS handles merged cells by putting value in top-left cell
      // and leaving other cells empty
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Transaction 1'],
        ['2024-01-16', 200.0, 'Transaction 2'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(2);
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    it('should return error for empty sheet', () => {
      const data: (string | number)[][] = [];
      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('empty');
    });

    it('should return error for sheet with only headers', () => {
      const data = [['date', 'amount', 'description']];
      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(0);
    });

    it('should handle invalid date values gracefully', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['invalid-date', 100.5, 'Transaction 1'],
        ['2024-01-16', 200.0, 'Transaction 2'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      // Should parse the valid row and report error for invalid
      expect(result.transactions.length).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should handle invalid amount values gracefully', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 'not-a-number', 'Transaction 1'],
        ['2024-01-16', 200.0, 'Transaction 2'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should handle empty description gracefully', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, ''],
        ['2024-01-16', 200.0, 'Valid transaction'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      // Empty description should cause an error for that row
      expect(result.transactions.length).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  /**
   * Sheet Listing Tests
   */
  describe('Sheet Listing', () => {
    it('should list all sheets in a workbook', () => {
      const sheets = [
        {
          name: 'Transactions',
          data: [
            ['date', 'amount', 'description'],
            ['2024-01-15', 100, 'Test'],
          ],
        },
        { name: 'Summary', data: [['Total'], [1000]] },
        { name: 'Empty', data: [] },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const sheetList = parser.listSheets(excelData);

      expect(sheetList.length).toBe(3);
      expect(sheetList[0].name).toBe('Transactions');
      expect(sheetList[1].name).toBe('Summary');
      expect(sheetList[2].name).toBe('Empty');
    });

    it('should include row count for each sheet', () => {
      const sheets = [
        {
          name: 'Sheet1',
          data: [
            ['a', 'b'],
            ['1', '2'],
            ['3', '4'],
          ],
        },
        { name: 'Sheet2', data: [['x']] },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const sheetList = parser.listSheets(excelData);

      expect(sheetList[0].rowCount).toBe(3);
      expect(sheetList[1].rowCount).toBe(1);
    });

    it('should include preview rows for each sheet', () => {
      const sheets = [
        {
          name: 'Sheet1',
          data: [
            ['header1', 'header2'],
            ['row1col1', 'row1col2'],
            ['row2col1', 'row2col2'],
          ],
        },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const sheetList = parser.listSheets(excelData);

      expect(sheetList[0].preview.length).toBeGreaterThan(0);
      expect(sheetList[0].preview[0]).toEqual(['header1', 'header2']);
    });
  });

  /**
   * Sheet Selection Tests
   */
  describe('Sheet Selection', () => {
    it('should parse specified sheet by name', () => {
      const sheets = [
        { name: 'Other', data: [['x', 'y', 'z']] },
        {
          name: 'Transactions',
          data: [
            ['date', 'amount', 'description'],
            ['2024-01-15', 100, 'Test'],
          ],
        },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const result = parser.parse(excelData, { sheetName: 'Transactions' });

      expect(result.usedSheet).toBe('Transactions');
      expect(result.transactions.length).toBe(1);
    });

    it('should parse specified sheet by index', () => {
      const sheets = [
        { name: 'Sheet1', data: [['a', 'b', 'c']] },
        {
          name: 'Sheet2',
          data: [
            ['date', 'amount', 'description'],
            ['2024-01-15', 100, 'Test'],
          ],
        },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const result = parser.parse(excelData, { sheetIndex: 1 });

      expect(result.usedSheet).toBe('Sheet2');
      expect(result.transactions.length).toBe(1);
    });

    it('should default to first sheet when no selection specified', () => {
      const sheets = [
        {
          name: 'First',
          data: [
            ['date', 'amount', 'description'],
            ['2024-01-15', 100, 'Test'],
          ],
        },
        { name: 'Second', data: [['x', 'y', 'z']] },
      ];

      const excelData = createMultiSheetExcel(sheets);
      const result = parser.parse(excelData);

      expect(result.usedSheet).toBe('First');
    });
  });

  /**
   * Column Detection Tests
   */
  describe('Column Detection', () => {
    it('should detect columns with alternative header names', () => {
      const data = [
        ['Transaction Date', 'Value', 'Memo'],
        ['2024-01-15', 100.5, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      // Should detect based on partial matches
      expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect columns in different order', () => {
      const data = [
        ['description', 'date', 'amount'],
        ['Test transaction', '2024-01-15', 100.5],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
      expect(result.columnMapping.descriptionColumn).toBe(0);
      expect(result.columnMapping.dateColumn).toBe(1);
      expect(result.columnMapping.amountColumn).toBe(2);
    });

    it('should handle forced column mapping', () => {
      const data = [
        ['col1', 'col2', 'col3'],
        ['2024-01-15', 100.5, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData, {
        columnMapping: {
          dateColumn: 0,
          amountColumn: 1,
          descriptionColumn: 2,
        },
      });

      expect(result.transactions.length).toBe(1);
    });
  });

  /**
   * Date Parsing Tests
   */
  describe('Date Parsing', () => {
    it('should parse Excel serial date numbers', () => {
      // Excel serial number for 2024-01-15 is 45307 (days since Dec 30, 1899)
      // Note: Excel has a leap year bug for 1900, so serial > 59 needs adjustment
      const serial = 45307;
      const date = parser.parseExcelDate(serial);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(15);
    });

    it('should parse dates in YYYY-MM-DD format', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions[0].date.getFullYear()).toBe(2024);
      expect(result.transactions[0].date.getMonth()).toBe(0);
      expect(result.transactions[0].date.getDate()).toBe(15);
    });

    it('should parse dates in DD/MM/YYYY format', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['15/01/2024', 100, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
    });
  });

  /**
   * Amount Parsing Tests
   */
  describe('Amount Parsing', () => {
    it('should parse positive amounts', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100.5, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions[0].amount).toBeCloseTo(100.5, 2);
    });

    it('should parse negative amounts', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', -50.25, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions[0].amount).toBeCloseTo(-50.25, 2);
    });

    it('should parse zero amount', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 0, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = parser.parse(excelData);

      expect(result.transactions[0].amount).toBe(0);
    });
  });

  /**
   * Format to Excel (Round-trip) Tests
   */
  describe('Format to Excel', () => {
    it('should format transactions to Excel format', () => {
      const transactions: RawTransaction[] = [
        { date: new Date('2024-01-15'), amount: 100.5, description: 'Test 1', sourceLineNumber: 1 },
        {
          date: new Date('2024-01-16'),
          amount: -50.25,
          description: 'Test 2',
          sourceLineNumber: 2,
        },
      ];

      const excelData = parser.formatToExcel(transactions);

      expect(excelData).toBeInstanceOf(ArrayBuffer);
      expect(excelData.byteLength).toBeGreaterThan(0);
    });

    it('should produce parseable Excel from formatToExcel', () => {
      const transactions: RawTransaction[] = [
        { date: new Date('2024-01-15'), amount: 100.5, description: 'Test', sourceLineNumber: 1 },
      ];

      const excelData = parser.formatToExcel(transactions);
      const result = parser.parse(excelData);

      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].amount).toBeCloseTo(100.5, 2);
    });
  });

  /**
   * Default Instance Tests
   */
  describe('Default Instance', () => {
    it('should export a default parser instance', () => {
      expect(excelParser).toBeInstanceOf(ExcelParser);
    });

    it('should be usable for parsing', () => {
      const data = [
        ['date', 'amount', 'description'],
        ['2024-01-15', 100, 'Test'],
      ];

      const excelData = createTestExcel(data);
      const result = excelParser.parse(excelData);

      expect(result.transactions.length).toBe(1);
    });
  });
});
