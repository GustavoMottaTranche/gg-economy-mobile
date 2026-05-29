/**
 * Property-Based Tests for Sheet Selection
 *
 * These tests verify that when a user selects a specific sheet from an Excel file
 * with multiple worksheets, the ExcelParser correctly parses only the data from
 * that selected sheet.
 *
 * **Property 11: Sheet Selection**
 * For any Excel file with multiple sheets, when the user selects a specific sheet,
 * the ExcelParser MUST parse only the data from that sheet.
 *
 * **Validates: Requirements 9.5**
 */

import fc from 'fast-check';
import * as XLSX from 'xlsx';
import { ExcelParser } from '../../../services/import/ExcelParser';

describe('Property 11: Sheet Selection', () => {
  const parser = new ExcelParser();

  /**
   * Helper function to create an Excel workbook with multiple sheets,
   * each containing different transaction data.
   *
   * @param sheetsData - Array of sheet configurations with name and transactions
   * @returns ArrayBuffer containing the Excel file
   */
  function createMultiSheetExcel(
    sheetsData: Array<{
      name: string;
      transactions: Array<{ date: Date; amount: number; description: string }>;
    }>
  ): ArrayBuffer {
    const workbook = XLSX.utils.book_new();

    for (const sheetData of sheetsData) {
      // Create worksheet data with headers
      const wsData: (string | number)[][] = [['date', 'amount', 'description']];

      for (const tx of sheetData.transactions) {
        const dateStr = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}-${String(tx.date.getDate()).padStart(2, '0')}`;
        wsData.push([dateStr, tx.amount, tx.description]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(workbook, ws, sheetData.name);
    }

    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }

  // Generate valid dates
  const validDateArbitrary = fc.integer({ min: 0, max: 5 * 365 }).map((days) => {
    const date = new Date('2020-01-01');
    date.setDate(date.getDate() + days);
    return date;
  });

  // Generate valid amounts
  const validAmountArbitrary = fc
    .double({
      min: -10000,
      max: 10000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .map((n) => Math.round(n * 100) / 100);

  // Generate valid descriptions (alphanumeric only to avoid parsing issues)
  const validDescriptionArbitrary = fc
    .array(
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        ' '
      ),
      { minLength: 5, maxLength: 50 }
    )
    .map((chars) => chars.join(''))
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  // Generate a single transaction
  const transactionArbitrary = fc.record({
    date: validDateArbitrary,
    amount: validAmountArbitrary,
    description: validDescriptionArbitrary,
  });

  // Generate a list of transactions for a sheet
  const transactionsArbitrary = fc.array(transactionArbitrary, {
    minLength: 1,
    maxLength: 20,
  });

  // Generate valid sheet names (alphanumeric, no special chars that might cause issues)
  const sheetNameArbitrary = fc
    .array(
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9'
      ),
      { minLength: 1, maxLength: 20 }
    )
    .map((chars) => chars.join(''));

  // Generate a sheet configuration
  const sheetConfigArbitrary = fc.record({
    name: sheetNameArbitrary,
    transactions: transactionsArbitrary,
  });

  // Generate multiple sheets with unique names
  const multipleUniqueSheets = fc
    .array(sheetConfigArbitrary, { minLength: 2, maxLength: 5 })
    .filter((sheets) => {
      // Ensure all sheet names are unique
      const names = sheets.map((s) => s.name);
      return new Set(names).size === names.length;
    });

  /**
   * Property: When selecting a sheet by name, only that sheet's data is parsed
   */
  it('should parse only the selected sheet when sheetName is specified', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        // Create multi-sheet Excel file
        const excelData = createMultiSheetExcel(sheetsData);

        // Test selecting each sheet by name
        for (const targetSheet of sheetsData) {
          const result = parser.parse(excelData, { sheetName: targetSheet.name });

          // Verify the correct sheet was used
          expect(result.usedSheet).toBe(targetSheet.name);

          // Verify the correct number of transactions
          expect(result.transactions.length).toBe(targetSheet.transactions.length);

          // Verify each transaction matches the target sheet's data
          for (let i = 0; i < targetSheet.transactions.length; i++) {
            const expected = targetSheet.transactions[i]!;
            const actual = result.transactions[i]!;

            expect(actual.date.toDateString()).toBe(expected.date.toDateString());
            expect(actual.amount).toBeCloseTo(expected.amount, 2);
            expect(actual.description).toBe(expected.description);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When selecting a sheet by index, only that sheet's data is parsed
   */
  it('should parse only the selected sheet when sheetIndex is specified', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        // Create multi-sheet Excel file
        const excelData = createMultiSheetExcel(sheetsData);

        // Test selecting each sheet by index
        for (let index = 0; index < sheetsData.length; index++) {
          const targetSheet = sheetsData[index]!;
          const result = parser.parse(excelData, { sheetIndex: index });

          // Verify the correct sheet was used
          expect(result.usedSheet).toBe(targetSheet.name);

          // Verify the correct number of transactions
          expect(result.transactions.length).toBe(targetSheet.transactions.length);

          // Verify each transaction matches the target sheet's data
          for (let i = 0; i < targetSheet.transactions.length; i++) {
            const expected = targetSheet.transactions[i]!;
            const actual = result.transactions[i]!;

            expect(actual.date.toDateString()).toBe(expected.date.toDateString());
            expect(actual.amount).toBeCloseTo(expected.amount, 2);
            expect(actual.description).toBe(expected.description);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: sheetName takes precedence over sheetIndex
   */
  it('should use sheetName over sheetIndex when both are specified', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        // Need at least 2 sheets to test precedence
        if (sheetsData.length < 2) return;

        const excelData = createMultiSheetExcel(sheetsData);

        // Select second sheet by name but first sheet by index
        const targetSheet = sheetsData[1]!;
        const result = parser.parse(excelData, {
          sheetName: targetSheet.name,
          sheetIndex: 0, // This should be ignored
        });

        // sheetName should take precedence
        expect(result.usedSheet).toBe(targetSheet.name);
        expect(result.transactions.length).toBe(targetSheet.transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Default to first sheet when no selection is made
   */
  it('should default to first sheet when no sheetName or sheetIndex is specified', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        const excelData = createMultiSheetExcel(sheetsData);

        // Parse without specifying sheet
        const result = parser.parse(excelData);

        // Should use first sheet
        const firstSheet = sheetsData[0]!;
        expect(result.usedSheet).toBe(firstSheet.name);
        expect(result.transactions.length).toBe(firstSheet.transactions.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: listSheets returns all sheets with correct metadata
   */
  it('should list all sheets with correct names and indices', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        const excelData = createMultiSheetExcel(sheetsData);

        const sheets = parser.listSheets(excelData);

        // Should have same number of sheets
        expect(sheets.length).toBe(sheetsData.length);

        // Each sheet should have correct name and index
        for (let i = 0; i < sheetsData.length; i++) {
          expect(sheets[i]!.name).toBe(sheetsData[i]!.name);
          expect(sheets[i]!.index).toBe(i);
          // Row count should match transactions + header
          expect(sheets[i]!.rowCount).toBe(sheetsData[i]!.transactions.length + 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Selecting different sheets produces different results
   */
  it('should produce different results when selecting different sheets with different data', () => {
    // Generate sheets with guaranteed different data
    const differentSheetsArbitrary = fc
      .tuple(
        fc.record({
          name: fc.constant('Sheet1'),
          transactions: fc.array(
            fc.record({
              date: fc.constant(new Date('2020-01-01')),
              amount: fc.constant(100),
              description: fc.constant('Transaction A'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        fc.record({
          name: fc.constant('Sheet2'),
          transactions: fc.array(
            fc.record({
              date: fc.constant(new Date('2021-06-15')),
              amount: fc.constant(-200),
              description: fc.constant('Transaction B'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        })
      )
      .map(([sheet1, sheet2]) => [sheet1, sheet2]);

    fc.assert(
      fc.property(differentSheetsArbitrary, (sheetsData) => {
        const excelData = createMultiSheetExcel(sheetsData);

        const result1 = parser.parse(excelData, { sheetName: 'Sheet1' });
        const result2 = parser.parse(excelData, { sheetName: 'Sheet2' });

        // Results should be from different sheets
        expect(result1.usedSheet).toBe('Sheet1');
        expect(result2.usedSheet).toBe('Sheet2');

        // Data should be different
        expect(result1.transactions[0]!.description).toBe('Transaction A');
        expect(result2.transactions[0]!.description).toBe('Transaction B');
        expect(result1.transactions[0]!.amount).toBe(100);
        expect(result2.transactions[0]!.amount).toBe(-200);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sheet selection is consistent across multiple parses
   */
  it('should produce consistent results when parsing the same sheet multiple times', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        const excelData = createMultiSheetExcel(sheetsData);

        // Pick a random sheet to test
        const targetSheet = sheetsData[Math.floor(Math.random() * sheetsData.length)]!;

        // Parse the same sheet multiple times
        const result1 = parser.parse(excelData, { sheetName: targetSheet.name });
        const result2 = parser.parse(excelData, { sheetName: targetSheet.name });
        const result3 = parser.parse(excelData, { sheetName: targetSheet.name });

        // All results should be identical
        expect(result1.transactions.length).toBe(result2.transactions.length);
        expect(result2.transactions.length).toBe(result3.transactions.length);

        for (let i = 0; i < result1.transactions.length; i++) {
          expect(result1.transactions[i]!.date.getTime()).toBe(
            result2.transactions[i]!.date.getTime()
          );
          expect(result2.transactions[i]!.date.getTime()).toBe(
            result3.transactions[i]!.date.getTime()
          );
          expect(result1.transactions[i]!.amount).toBe(result2.transactions[i]!.amount);
          expect(result2.transactions[i]!.amount).toBe(result3.transactions[i]!.amount);
          expect(result1.transactions[i]!.description).toBe(result2.transactions[i]!.description);
          expect(result2.transactions[i]!.description).toBe(result3.transactions[i]!.description);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid sheet name returns appropriate error
   */
  it('should handle invalid sheet name gracefully', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, sheetNameArbitrary, (sheetsData, invalidName) => {
        // Ensure the invalid name doesn't match any existing sheet
        const existingNames = sheetsData.map((s) => s.name);
        if (existingNames.includes(invalidName)) return;

        const excelData = createMultiSheetExcel(sheetsData);

        const result = parser.parse(excelData, { sheetName: invalidName });

        // Should return empty result or error
        expect(result.transactions.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid sheet index returns appropriate error
   */
  it('should handle invalid sheet index gracefully', () => {
    fc.assert(
      fc.property(multipleUniqueSheets, (sheetsData) => {
        const excelData = createMultiSheetExcel(sheetsData);

        // Try to access sheet beyond the valid range
        const invalidIndex = sheetsData.length + 10;
        const result = parser.parse(excelData, { sheetIndex: invalidIndex });

        // Should return empty result or error
        expect(result.transactions.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
