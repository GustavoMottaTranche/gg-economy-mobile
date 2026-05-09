/**
 * Property-Based Test: CSV Delimiter Auto-Detection (Property 10)
 *
 * For any valid CSV content using comma, semicolon, or tab as delimiter,
 * the Import_Service SHALL correctly detect the delimiter and parse all
 * rows consistently.
 *
 * **Validates: Requirements 13.2**
 *
 * @module CsvDelimiterDetection.test
 */

import * as fc from 'fast-check';
import { CsvParser, CsvDelimiter } from '../../../../src/services/import/CsvParser';

describe('Property 10: CSV Delimiter Auto-Detection', () => {
  const parser = new CsvParser();

  /**
   * Arbitrary for CSV delimiters
   */
  const delimiterArb: fc.Arbitrary<CsvDelimiter> = fc.constantFrom(',', ';', '\t');

  /**
   * Arbitrary for generating valid field values
   * Excludes characters that would interfere with delimiter detection
   */
  const fieldArb = (delimiter: CsvDelimiter): fc.Arbitrary<string> =>
    fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => {
        // Exclude the delimiter character
        if (s.includes(delimiter)) return false;
        // Exclude newlines
        if (s.includes('\n') || s.includes('\r')) return false;
        // Exclude quotes (they complicate CSV parsing)
        if (s.includes('"')) return false;
        // Exclude empty strings
        if (s.trim() === '') return false;
        return true;
      })
      .map((s) => s.trim());

  /**
   * Arbitrary for generating a valid date string
   */
  const dateStringArb = fc
    .integer({ min: 0, max: 3652 }) // Days from 2020-01-01 to 2030-01-01
    .map((days) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

  /**
   * Arbitrary for generating a valid amount string
   */
  const amountStringArb = fc
    .double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true })
    .map((n) => (Math.round(n * 100) / 100).toFixed(2));

  /**
   * Arbitrary for generating a valid description
   */
  const descriptionArb = (delimiter: CsvDelimiter): fc.Arbitrary<string> =>
    fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => {
        if (s.includes(delimiter)) return false;
        if (s.includes('\n') || s.includes('\r')) return false;
        if (s.includes('"')) return false; // Exclude quotes
        if (s.trim() === '') return false;
        return true;
      })
      .map((s) => s.trim());

  /**
   * Generates a CSV row with the given delimiter
   */
  function generateRow(
    date: string,
    amount: string,
    description: string,
    delimiter: CsvDelimiter
  ): string {
    return [date, amount, description].join(delimiter);
  }

  /**
   * Generates a complete CSV with header and data rows
   */
  function generateCsv(
    rows: Array<{ date: string; amount: string; description: string }>,
    delimiter: CsvDelimiter
  ): string {
    const header = ['date', 'amount', 'description'].join(delimiter);
    const dataRows = rows.map((r) => generateRow(r.date, r.amount, r.description, delimiter));
    return [header, ...dataRows].join('\n');
  }

  it('should correctly detect comma delimiter', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: dateStringArb,
            amount: amountStringArb,
            description: descriptionArb(','),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          const csv = generateCsv(rows, ',');
          const result = parser.parse(csv);

          expect(result.delimiter).toBe(',');
          expect(result.transactions.length).toBe(rows.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly detect semicolon delimiter', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: dateStringArb,
            amount: amountStringArb,
            description: descriptionArb(';'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          const csv = generateCsv(rows, ';');
          const result = parser.parse(csv);

          expect(result.delimiter).toBe(';');
          expect(result.transactions.length).toBe(rows.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly detect tab delimiter', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: dateStringArb,
            amount: amountStringArb,
            description: descriptionArb('\t'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          const csv = generateCsv(rows, '\t');
          const result = parser.parse(csv);

          expect(result.delimiter).toBe('\t');
          expect(result.transactions.length).toBe(rows.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect delimiter consistently regardless of row count', () => {
    fc.assert(
      fc.property(delimiterArb, fc.integer({ min: 1, max: 50 }), (delimiter, rowCount) => {
        // Generate rows with the chosen delimiter
        const rows = Array.from({ length: rowCount }, (_, i) => ({
          date: `2024-01-${((i % 28) + 1).toString().padStart(2, '0')}`,
          amount: ((i + 1) * 10.5).toFixed(2),
          description: `Transaction ${i + 1}`,
        }));

        const csv = generateCsv(rows, delimiter);
        const result = parser.parse(csv);

        expect(result.delimiter).toBe(delimiter);
        expect(result.transactions.length).toBe(rowCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should parse all rows consistently with detected delimiter', () => {
    fc.assert(
      fc.property(
        delimiterArb,
        fc.array(
          fc.record({
            date: dateStringArb,
            amount: amountStringArb,
            description: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => {
                // Filter out problematic characters for all delimiters
                return (
                  !s.includes(',') &&
                  !s.includes(';') &&
                  !s.includes('\t') &&
                  !s.includes('\n') &&
                  !s.includes('\r') &&
                  !s.includes('"') &&
                  s.trim() !== ''
                );
              })
              .map((s) => s.trim()),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (delimiter, rows) => {
          const csv = generateCsv(rows, delimiter);
          const result = parser.parse(csv);

          // All rows should be parsed successfully
          expect(result.errors).toHaveLength(0);
          expect(result.transactions.length).toBe(rows.length);

          // Each transaction should have correct data
          for (let i = 0; i < rows.length; i++) {
            expect(result.transactions[i].description).toBe(rows[i].description);
            expect(result.transactions[i].amount).toBeCloseTo(parseFloat(rows[i].amount), 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect delimiter from first few lines only', () => {
    fc.assert(
      fc.property(delimiterArb, (delimiter) => {
        // Generate a large CSV
        const rows = Array.from({ length: 100 }, (_, i) => ({
          date: `2024-01-${((i % 28) + 1).toString().padStart(2, '0')}`,
          amount: ((i + 1) * 10).toFixed(2),
          description: `Transaction ${i + 1}`,
        }));

        const csv = generateCsv(rows, delimiter);
        const result = parser.parse(csv);

        // Should still detect correctly
        expect(result.delimiter).toBe(delimiter);
      }),
      { numRuns: 50 }
    );
  });

  it('should handle quoted fields containing the delimiter character', () => {
    fc.assert(
      fc.property(delimiterArb, (delimiter) => {
        // Create a description that contains the delimiter but is quoted
        const descriptionWithDelimiter = `Test${delimiter}Description`;
        const quotedDescription = `"${descriptionWithDelimiter}"`;

        const csv = [
          ['date', 'amount', 'description'].join(delimiter),
          ['2024-01-15', '100.00', quotedDescription].join(delimiter),
        ].join('\n');

        const result = parser.parse(csv);

        expect(result.delimiter).toBe(delimiter);
        expect(result.transactions.length).toBe(1);
        expect(result.transactions[0].description).toBe(descriptionWithDelimiter);
      }),
      { numRuns: 50 }
    );
  });

  it('should prefer delimiter with consistent count across lines', () => {
    // This tests that the detection algorithm prefers consistency
    fc.assert(
      fc.property(delimiterArb, (delimiter) => {
        // Generate CSV where the chosen delimiter appears consistently
        const rows = Array.from({ length: 5 }, (_, i) => ({
          date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
          amount: '100.00',
          description: `Transaction ${i + 1}`,
        }));

        const csv = generateCsv(rows, delimiter);
        const result = parser.parse(csv);

        // The detected delimiter should match what we used
        expect(result.delimiter).toBe(delimiter);
      }),
      { numRuns: 100 }
    );
  });

  it('should detect delimiter correctly for single-row CSV', () => {
    fc.assert(
      fc.property(
        delimiterArb,
        dateStringArb,
        amountStringArb,
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => {
            return (
              !s.includes(',') &&
              !s.includes(';') &&
              !s.includes('\t') &&
              !s.includes('\n') &&
              !s.includes('"') &&
              s.trim() !== ''
            );
          })
          .map((s) => s.trim()),
        (delimiter, date, amount, description) => {
          const csv = [
            ['date', 'amount', 'description'].join(delimiter),
            [date, amount, description].join(delimiter),
          ].join('\n');

          const result = parser.parse(csv);

          expect(result.delimiter).toBe(delimiter);
          expect(result.transactions.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
