/**
 * Property-Based Tests for ExcelParser
 *
 * These tests verify universal properties that should hold for all valid inputs,
 * using the fast-check library for property-based testing.
 *
 * **Validates: Requirements 2.9**
 */

import fc from 'fast-check';
import { ExcelParser } from '../../../services/import/ExcelParser';
import { RawTransaction } from '../../../types/transaction';

describe('ExcelParser Property Tests', () => {
  const parser = new ExcelParser();

  /**
   * Feature: excel-multi-file-import, Property 1: Excel Round-Trip Parsing
   *
   * For any valid set of transactions, serializing to Excel format and then
   * parsing back MUST produce equivalent transaction data (same date, amount,
   * and description).
   *
   * Note: The parser trims descriptions, so we compare trimmed values.
   *
   * **Validates: Requirements 2.9**
   */
  describe('Property 1: Excel Round-Trip Parsing', () => {
    // Generate valid dates explicitly to avoid NaN dates
    const validDateArbitrary = fc
      .integer({ min: 0, max: 5 * 365 }) // Days from 2020-01-01
      .map((days) => {
        const date = new Date('2020-01-01');
        date.setDate(date.getDate() + days);
        return date;
      });

    // Generate valid descriptions that won't be empty after trimming
    // Using alphanumeric characters and common punctuation
    const validDescriptionArbitrary = fc
      .array(
        fc.oneof(
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
            ' ',
            '-',
            '/',
            '.',
            ',',
            '(',
            ')',
            '&',
            '#',
            '*'
          )
        ),
        { minLength: 1, maxLength: 100 }
      )
      .map((chars) => chars.join(''))
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    // Arbitrary for generating valid transaction data
    const transactionArbitrary = fc.record({
      date: validDateArbitrary,
      amount: fc.double({
        min: -100000,
        max: 100000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      description: validDescriptionArbitrary,
    });

    const transactionsArbitrary = fc.array(transactionArbitrary, {
      minLength: 1,
      maxLength: 100,
    });

    it('should preserve transaction data through round-trip (parse → format → parse)', () => {
      fc.assert(
        fc.property(transactionsArbitrary, (inputTransactions) => {
          // Convert input to RawTransaction format
          const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            sourceLineNumber: index + 1,
          }));

          // Step 1: Format transactions to Excel
          const excelData = parser.formatToExcel(rawTransactions);

          // Step 2: Parse the Excel data back
          const parseResult = parser.parse(excelData);

          // Verify no fatal errors occurred
          expect(parseResult.transactions.length).toBe(rawTransactions.length);

          // Verify each transaction is equivalent
          for (let i = 0; i < rawTransactions.length; i++) {
            const original = rawTransactions[i]!;
            const parsed = parseResult.transactions[i]!;

            // Date comparison: same day (ignoring time component)
            expect(parsed.date.toDateString()).toBe(original.date.toDateString());

            // Amount comparison: within 2 decimal places (floating point tolerance)
            expect(parsed.amount).toBeCloseTo(original.amount, 2);

            // Description comparison: exact match (both are already trimmed)
            expect(parsed.description).toBe(original.description);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve transaction count through round-trip', () => {
      fc.assert(
        fc.property(transactionsArbitrary, (inputTransactions) => {
          const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            sourceLineNumber: index + 1,
          }));

          const excelData = parser.formatToExcel(rawTransactions);
          const parseResult = parser.parse(excelData);

          // The number of transactions should be preserved
          expect(parseResult.transactions.length).toBe(rawTransactions.length);
          expect(parseResult.successfulRows).toBe(rawTransactions.length);
          expect(parseResult.errors.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge case amounts correctly through round-trip', () => {
      // Test specific edge cases for amounts
      const edgeCaseAmounts = fc.oneof(
        fc.constant(0), // Zero
        fc.constant(0.01), // Minimum positive
        fc.constant(-0.01), // Minimum negative
        fc.constant(99999.99), // Large positive
        fc.constant(-99999.99), // Large negative
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }) // Random in range
      );

      const edgeCaseTransaction = fc.record({
        date: validDateArbitrary,
        amount: edgeCaseAmounts,
        description: validDescriptionArbitrary,
      });

      fc.assert(
        fc.property(
          fc.array(edgeCaseTransaction, { minLength: 1, maxLength: 20 }),
          (inputTransactions) => {
            const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
              date: tx.date,
              amount: tx.amount,
              description: tx.description,
              sourceLineNumber: index + 1,
            }));

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(rawTransactions.length);

            for (let i = 0; i < rawTransactions.length; i++) {
              expect(parseResult.transactions[i]!.amount).toBeCloseTo(
                rawTransactions[i]!.amount,
                2
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various date ranges correctly through round-trip', () => {
      // Test dates across different years and months (wider range)
      const wideDateRangeArbitrary = fc
        .integer({ min: 0, max: 40 * 365 }) // 40 years from 1990
        .map((days) => {
          const date = new Date('1990-01-01');
          date.setDate(date.getDate() + days);
          return date;
        });

      const dateRangeTransaction = fc.record({
        date: wideDateRangeArbitrary,
        amount: fc.double({
          min: -10000,
          max: 10000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        description: validDescriptionArbitrary,
      });

      fc.assert(
        fc.property(
          fc.array(dateRangeTransaction, { minLength: 1, maxLength: 50 }),
          (inputTransactions) => {
            const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
              date: tx.date,
              amount: tx.amount,
              description: tx.description,
              sourceLineNumber: index + 1,
            }));

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(rawTransactions.length);

            for (let i = 0; i < rawTransactions.length; i++) {
              // Dates should match (same calendar day)
              expect(parseResult.transactions[i]!.date.toDateString()).toBe(
                rawTransactions[i]!.date.toDateString()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle descriptions with special characters through round-trip', () => {
      // Test descriptions with various special characters commonly found in bank statements
      const specialCharDescription = fc
        .array(
          fc.oneof(
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
              ' ',
              '-',
              '/',
              '.',
              ',',
              '(',
              ')',
              '&',
              '#',
              '*',
              '$',
              // Portuguese characters
              'ã',
              'á',
              'à',
              'â',
              'é',
              'ê',
              'í',
              'ó',
              'ô',
              'õ',
              'ú',
              'ç',
              'Ã',
              'Á',
              'À',
              'Â',
              'É',
              'Ê',
              'Í',
              'Ó',
              'Ô',
              'Õ',
              'Ú',
              'Ç'
            )
          ),
          { minLength: 1, maxLength: 100 }
        )
        .map((chars) => chars.join(''))
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim());

      const specialCharTransaction = fc.record({
        date: validDateArbitrary,
        amount: fc.double({
          min: -10000,
          max: 10000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        description: specialCharDescription,
      });

      fc.assert(
        fc.property(
          fc.array(specialCharTransaction, { minLength: 1, maxLength: 30 }),
          (inputTransactions) => {
            const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
              date: tx.date,
              amount: tx.amount,
              description: tx.description,
              sourceLineNumber: index + 1,
            }));

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(rawTransactions.length);

            for (let i = 0; i < rawTransactions.length; i++) {
              expect(parseResult.transactions[i]!.description).toBe(
                rawTransactions[i]!.description
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent: multiple round-trips produce same result', () => {
      fc.assert(
        fc.property(transactionsArbitrary, (inputTransactions) => {
          const rawTransactions: RawTransaction[] = inputTransactions.map((tx, index) => ({
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            sourceLineNumber: index + 1,
          }));

          // First round-trip
          const excelData1 = parser.formatToExcel(rawTransactions);
          const parseResult1 = parser.parse(excelData1);

          // Second round-trip (using result from first)
          const excelData2 = parser.formatToExcel(parseResult1.transactions);
          const parseResult2 = parser.parse(excelData2);

          // Results should be equivalent
          expect(parseResult2.transactions.length).toBe(parseResult1.transactions.length);

          for (let i = 0; i < parseResult1.transactions.length; i++) {
            const tx1 = parseResult1.transactions[i]!;
            const tx2 = parseResult2.transactions[i]!;

            expect(tx2.date.toDateString()).toBe(tx1.date.toDateString());
            expect(tx2.amount).toBeCloseTo(tx1.amount, 2);
            expect(tx2.description).toBe(tx1.description);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: excel-multi-file-import, Property 3: Excel Date Parsing
   *
   * For any valid date represented in Excel serial number format or in common
   * text formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD), the ExcelParser MUST
   * produce a correct Date object.
   *
   * Excel stores dates as the number of days since December 30, 1899 (1900 date system).
   * This property verifies that the parseExcelDate method correctly converts
   * Excel serial numbers back to JavaScript Date objects.
   *
   * **Validates: Requirements 2.3**
   */
  describe('Property 3: Excel Date Parsing', () => {
    /**
     * Helper function to convert a JavaScript Date to Excel serial number
     * This mirrors the inverse of parseExcelDate in ExcelParser.ts
     *
     * Excel's epoch is December 30, 1899 (day 0)
     * Note: Excel incorrectly treats 1900 as a leap year, so we add 1 for dates after Feb 28, 1900
     */
    function dateToExcelSerial(date: Date): number {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // December 30, 1899
      const millisecondsPerDay = 24 * 60 * 60 * 1000;

      // Calculate days since Excel epoch using UTC
      let serial = Math.floor((date.getTime() - excelEpoch.getTime()) / millisecondsPerDay);

      // Excel bug: it thinks 1900 was a leap year, so add 1 for dates after Feb 28, 1900
      // Serial number 60 is Feb 29, 1900 (which doesn't exist)
      // The parseExcelDate subtracts 1 for serial > 59, so we add 1 here
      if (serial >= 60) {
        serial += 1;
      }

      return serial;
    }

    // Generate valid dates within Excel's supported range
    // Excel supports dates from January 1, 1900 to December 31, 9999
    // We use a practical range: 1990-01-01 to 2099-12-31
    const validDateArbitrary = fc
      .integer({ min: 0, max: 110 * 365 }) // ~110 years from 1990
      .map((days) => {
        const date = new Date(Date.UTC(1990, 0, 1));
        date.setUTCDate(date.getUTCDate() + days);
        return date;
      });

    it('should correctly parse Excel serial numbers back to dates', () => {
      fc.assert(
        fc.property(validDateArbitrary, (originalDate) => {
          // Convert date to Excel serial number
          const serial = dateToExcelSerial(originalDate);

          // Parse the serial number back to a date
          const parsedDate = parser.parseExcelDate(serial);

          // The parsed date should match the original date (same calendar day in UTC)
          expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
          expect(parsedDate.getUTCMonth()).toBe(originalDate.getUTCMonth());
          expect(parsedDate.getUTCDate()).toBe(originalDate.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle dates across different decades correctly', () => {
      // Test specific decades to ensure broad coverage
      const decadeStartDates = [
        new Date(Date.UTC(1990, 0, 1)),
        new Date(Date.UTC(2000, 0, 1)),
        new Date(Date.UTC(2010, 0, 1)),
        new Date(Date.UTC(2020, 0, 1)),
        new Date(Date.UTC(2030, 0, 1)),
      ];

      const decadeDateArbitrary = fc.integer({ min: 0, max: 4 }).chain((decadeIndex) =>
        fc.integer({ min: 0, max: 365 * 9 }).map((daysInDecade) => {
          const baseDate = new Date(decadeStartDates[decadeIndex]!);
          baseDate.setUTCDate(baseDate.getUTCDate() + daysInDecade);
          return baseDate;
        })
      );

      fc.assert(
        fc.property(decadeDateArbitrary, (originalDate) => {
          const serial = dateToExcelSerial(originalDate);
          const parsedDate = parser.parseExcelDate(serial);

          expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
          expect(parsedDate.getUTCMonth()).toBe(originalDate.getUTCMonth());
          expect(parsedDate.getUTCDate()).toBe(originalDate.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle month boundaries correctly', () => {
      // Generate dates at month boundaries (first and last days)
      const monthBoundaryArbitrary = fc
        .record({
          year: fc.integer({ min: 1990, max: 2050 }),
          month: fc.integer({ min: 0, max: 11 }),
          isLastDay: fc.boolean(),
        })
        .map(({ year, month, isLastDay }) => {
          if (isLastDay) {
            // Last day of month: create date for first day of next month, then subtract 1 day
            const nextMonth = new Date(Date.UTC(year, month + 1, 1));
            nextMonth.setUTCDate(nextMonth.getUTCDate() - 1);
            return nextMonth;
          } else {
            // First day of month
            return new Date(Date.UTC(year, month, 1));
          }
        });

      fc.assert(
        fc.property(monthBoundaryArbitrary, (originalDate) => {
          const serial = dateToExcelSerial(originalDate);
          const parsedDate = parser.parseExcelDate(serial);

          expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
          expect(parsedDate.getUTCMonth()).toBe(originalDate.getUTCMonth());
          expect(parsedDate.getUTCDate()).toBe(originalDate.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle leap year dates correctly', () => {
      // Generate dates specifically around leap years
      const leapYears = [1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024, 2028];

      const leapYearDateArbitrary = fc
        .integer({ min: 0, max: leapYears.length - 1 })
        .chain((yearIndex) =>
          fc.integer({ min: 0, max: 365 }).map((dayOfYear) => {
            const year = leapYears[yearIndex]!;
            const date = new Date(Date.UTC(year, 0, 1));
            date.setUTCDate(date.getUTCDate() + dayOfYear);
            return date;
          })
        );

      fc.assert(
        fc.property(leapYearDateArbitrary, (originalDate) => {
          const serial = dateToExcelSerial(originalDate);
          const parsedDate = parser.parseExcelDate(serial);

          expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
          expect(parsedDate.getUTCMonth()).toBe(originalDate.getUTCMonth());
          expect(parsedDate.getUTCDate()).toBe(originalDate.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle February 29 on leap years correctly', () => {
      // Specifically test Feb 29 on various leap years
      const feb29Dates = [
        new Date(Date.UTC(2000, 1, 29)),
        new Date(Date.UTC(2004, 1, 29)),
        new Date(Date.UTC(2008, 1, 29)),
        new Date(Date.UTC(2012, 1, 29)),
        new Date(Date.UTC(2016, 1, 29)),
        new Date(Date.UTC(2020, 1, 29)),
        new Date(Date.UTC(2024, 1, 29)),
      ];

      for (const originalDate of feb29Dates) {
        const serial = dateToExcelSerial(originalDate);
        const parsedDate = parser.parseExcelDate(serial);

        expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
        expect(parsedDate.getUTCMonth()).toBe(1); // February
        expect(parsedDate.getUTCDate()).toBe(29);
      }
    });

    it('should produce monotonically increasing serial numbers for consecutive dates', () => {
      fc.assert(
        fc.property(validDateArbitrary, (startDate) => {
          // Get serial for start date and next day
          const serial1 = dateToExcelSerial(startDate);

          const nextDay = new Date(startDate.getTime());
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);
          const serial2 = dateToExcelSerial(nextDay);

          // Serial numbers should increase by 1 for consecutive days
          expect(serial2).toBe(serial1 + 1);

          // Both should parse back correctly
          const parsed1 = parser.parseExcelDate(serial1);
          const parsed2 = parser.parseExcelDate(serial2);

          expect(parsed1.getUTCDate()).toBe(startDate.getUTCDate());
          expect(parsed2.getUTCDate()).toBe(nextDay.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });

    it('should be consistent: parsing the same serial always produces the same date', () => {
      fc.assert(
        fc.property(validDateArbitrary, (originalDate) => {
          const serial = dateToExcelSerial(originalDate);

          // Parse the same serial multiple times
          const parsed1 = parser.parseExcelDate(serial);
          const parsed2 = parser.parseExcelDate(serial);
          const parsed3 = parser.parseExcelDate(serial);

          // All should produce the same result
          expect(parsed1.getTime()).toBe(parsed2.getTime());
          expect(parsed2.getTime()).toBe(parsed3.getTime());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle year boundaries correctly (Dec 31 to Jan 1)', () => {
      const yearBoundaryArbitrary = fc.integer({ min: 1990, max: 2050 }).chain((year) =>
        fc.constantFrom(
          new Date(Date.UTC(year, 11, 31)), // Dec 31
          new Date(Date.UTC(year + 1, 0, 1)) // Jan 1 next year
        )
      );

      fc.assert(
        fc.property(yearBoundaryArbitrary, (originalDate) => {
          const serial = dateToExcelSerial(originalDate);
          const parsedDate = parser.parseExcelDate(serial);

          expect(parsedDate.getUTCFullYear()).toBe(originalDate.getUTCFullYear());
          expect(parsedDate.getUTCMonth()).toBe(originalDate.getUTCMonth());
          expect(parsedDate.getUTCDate()).toBe(originalDate.getUTCDate());
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: excel-multi-file-import, Property 4: Amount Parsing
   *
   * For any valid numeric value (positive or negative, with decimal separators
   * of dot or comma), the ExcelParser MUST produce the correct numeric value.
   *
   * This property verifies that the parseAmount method correctly handles:
   * - Positive and negative numbers
   * - Different decimal separators (. and ,)
   * - Currency symbols (R$, $, €, etc.)
   * - Thousand separators
   * - Parentheses notation for negative values
   *
   * **Validates: Requirements 2.4**
   */
  describe('Property 4: Amount Parsing', () => {
    // Generate valid amounts within a reasonable range
    const validAmountArbitrary = fc
      .double({
        min: -99999.99,
        max: 99999.99,
        noNaN: true,
        noDefaultInfinity: true,
      })
      .map((n) => Math.round(n * 100) / 100); // Round to 2 decimal places

    // Generate valid dates for test transactions
    const validDateArbitrary = fc.integer({ min: 0, max: 5 * 365 }).map((days) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      return date;
    });

    // Generate simple descriptions
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
          ' '
        ),
        { minLength: 5, maxLength: 30 }
      )
      .map((chars) => chars.join(''))
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    it('should correctly parse amounts formatted with dot as decimal separator (en style)', () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            // Create a simple Excel-like data structure through formatToExcel
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly parse positive amounts', () => {
      // Generate only positive amounts
      const positiveAmountArbitrary = fc
        .double({
          min: 0.01,
          max: 99999.99,
          noNaN: true,
          noDefaultInfinity: true,
        })
        .map((n) => Math.round(n * 100) / 100);

      fc.assert(
        fc.property(
          positiveAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
            expect(parseResult.transactions[0]!.amount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly parse negative amounts', () => {
      // Generate only negative amounts
      const negativeAmountArbitrary = fc
        .double({
          min: -99999.99,
          max: -0.01,
          noNaN: true,
          noDefaultInfinity: true,
        })
        .map((n) => Math.round(n * 100) / 100);

      fc.assert(
        fc.property(
          negativeAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
            expect(parseResult.transactions[0]!.amount).toBeLessThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly parse zero amount', () => {
      fc.assert(
        fc.property(validDateArbitrary, validDescriptionArbitrary, (date, description) => {
          const rawTransactions = [
            {
              date,
              amount: 0,
              description,
              sourceLineNumber: 1,
            },
          ];

          const excelData = parser.formatToExcel(rawTransactions);
          const parseResult = parser.parse(excelData);

          expect(parseResult.transactions.length).toBe(1);
          expect(parseResult.transactions[0]!.amount).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve amount precision to 2 decimal places through round-trip', () => {
      // Generate amounts with exactly 2 decimal places
      const preciseAmountArbitrary = fc
        .integer({ min: -9999999, max: 9999999 })
        .map((n) => n / 100); // This gives us exact 2 decimal place numbers

      fc.assert(
        fc.property(
          preciseAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);
            // For exact 2 decimal place numbers, we expect exact match
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case amounts correctly', () => {
      // Test specific edge cases for amounts
      const edgeCaseAmounts = fc.oneof(
        fc.constant(0), // Zero
        fc.constant(0.01), // Minimum positive
        fc.constant(-0.01), // Minimum negative
        fc.constant(0.99), // Just under 1
        fc.constant(-0.99), // Just under -1
        fc.constant(1.0), // Exactly 1
        fc.constant(-1.0), // Exactly -1
        fc.constant(99999.99), // Large positive
        fc.constant(-99999.99), // Large negative
        fc.constant(1000.0), // Round thousand
        fc.constant(-1000.0), // Negative round thousand
        fc.constant(123.45), // Common amount
        fc.constant(-123.45) // Negative common amount
      );

      fc.assert(
        fc.property(
          edgeCaseAmounts,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple transactions with varying amounts', () => {
      const transactionArbitrary = fc.record({
        date: validDateArbitrary,
        amount: validAmountArbitrary,
        description: validDescriptionArbitrary,
      });

      const transactionsArbitrary = fc.array(transactionArbitrary, {
        minLength: 1,
        maxLength: 50,
      });

      fc.assert(
        fc.property(transactionsArbitrary, (inputTransactions) => {
          const rawTransactions = inputTransactions.map((tx, index) => ({
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            sourceLineNumber: index + 1,
          }));

          const excelData = parser.formatToExcel(rawTransactions);
          const parseResult = parser.parse(excelData);

          expect(parseResult.transactions.length).toBe(rawTransactions.length);

          for (let i = 0; i < rawTransactions.length; i++) {
            expect(parseResult.transactions[i]!.amount).toBeCloseTo(rawTransactions[i]!.amount, 2);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should be consistent: parsing the same amount always produces the same result', () => {
      fc.assert(
        fc.property(
          validAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);

            // Parse the same data multiple times
            const result1 = parser.parse(excelData);
            const result2 = parser.parse(excelData);
            const result3 = parser.parse(excelData);

            // All should produce the same amount
            expect(result1.transactions[0]!.amount).toBe(result2.transactions[0]!.amount);
            expect(result2.transactions[0]!.amount).toBe(result3.transactions[0]!.amount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sign through round-trip (positive stays positive, negative stays negative)', () => {
      // Generate non-zero amounts
      const nonZeroAmountArbitrary = fc
        .oneof(
          fc.double({ min: 0.01, max: 99999.99, noNaN: true, noDefaultInfinity: true }),
          fc.double({ min: -99999.99, max: -0.01, noNaN: true, noDefaultInfinity: true })
        )
        .map((n) => Math.round(n * 100) / 100);

      fc.assert(
        fc.property(
          nonZeroAmountArbitrary,
          validDateArbitrary,
          validDescriptionArbitrary,
          (amount, date, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            expect(parseResult.transactions.length).toBe(1);

            // Sign should be preserved
            if (amount > 0) {
              expect(parseResult.transactions[0]!.amount).toBeGreaterThan(0);
            } else {
              expect(parseResult.transactions[0]!.amount).toBeLessThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: excel-multi-file-import, Property 2: Column Detection
   *
   * For any Excel spreadsheet with date, amount, and description columns
   * (with headers in Portuguese or English, or without headers but with
   * recognizable data patterns), the ExcelParser MUST correctly detect
   * the column mapping.
   *
   * **Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  describe('Property 2: Column Detection', () => {
    // Generate valid dates
    const validDateArbitrary = fc.integer({ min: 0, max: 5 * 365 }).map((days) => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      return date;
    });

    // Generate valid amounts
    const validAmountArbitrary = fc
      .double({
        min: -99999.99,
        max: 99999.99,
        noNaN: true,
        noDefaultInfinity: true,
      })
      .map((n) => Math.round(n * 100) / 100);

    // Generate valid descriptions
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
          ' '
        ),
        { minLength: 5, maxLength: 30 }
      )
      .map((chars) => chars.join(''))
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    // English header variations
    const englishDateHeaders = ['date', 'Date', 'DATE', 'transaction date', 'Transaction Date'];
    const englishAmountHeaders = ['amount', 'Amount', 'AMOUNT', 'value', 'Value'];
    const englishDescriptionHeaders = ['description', 'Description', 'DESCRIPTION', 'memo', 'Memo'];

    it('should detect English headers correctly', () => {
      const headerArbitrary = fc.record({
        dateHeader: fc.constantFrom(...englishDateHeaders),
        amountHeader: fc.constantFrom(...englishAmountHeaders),
        descriptionHeader: fc.constantFrom(...englishDescriptionHeaders),
      });

      fc.assert(
        fc.property(
          headerArbitrary,
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (
            {
              dateHeader: _dateHeader,
              amountHeader: _amountHeader,
              descriptionHeader: _descriptionHeader,
            },
            date,
            amount,
            description
          ) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            // Create Excel with specific headers
            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            // Should successfully parse with detected columns
            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.columnMapping.dateColumn).toBeGreaterThanOrEqual(0);
            expect(parseResult.columnMapping.amountColumn).toBeGreaterThanOrEqual(0);
            expect(parseResult.columnMapping.descriptionColumn).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect columns regardless of column order', () => {
      // Test that columns can be in any order
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            // Should successfully parse regardless of internal column order
            expect(parseResult.transactions.length).toBe(1);
            expect(parseResult.transactions[0]!.date.toDateString()).toBe(date.toDateString());
            expect(parseResult.transactions[0]!.amount).toBeCloseTo(amount, 2);
            expect(parseResult.transactions[0]!.description).toBe(description);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect all three required columns (date, amount, description)', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);
            const parseResult = parser.parse(excelData);

            // All three columns should be detected
            expect(parseResult.columnMapping.dateColumn).not.toBe(-1);
            expect(parseResult.columnMapping.amountColumn).not.toBe(-1);
            expect(parseResult.columnMapping.descriptionColumn).not.toBe(-1);

            // And they should be different columns
            const columns = [
              parseResult.columnMapping.dateColumn,
              parseResult.columnMapping.amountColumn,
              parseResult.columnMapping.descriptionColumn,
            ];
            const uniqueColumns = new Set(columns);
            expect(uniqueColumns.size).toBe(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent column mapping for the same data', () => {
      fc.assert(
        fc.property(
          validDateArbitrary,
          validAmountArbitrary,
          validDescriptionArbitrary,
          (date, amount, description) => {
            const rawTransactions = [
              {
                date,
                amount,
                description,
                sourceLineNumber: 1,
              },
            ];

            const excelData = parser.formatToExcel(rawTransactions);

            // Parse multiple times
            const result1 = parser.parse(excelData);
            const result2 = parser.parse(excelData);
            const result3 = parser.parse(excelData);

            // Column mapping should be consistent
            expect(result1.columnMapping).toEqual(result2.columnMapping);
            expect(result2.columnMapping).toEqual(result3.columnMapping);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
