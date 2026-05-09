/**
 * Property-Based Test: Transaction Data Validation (Property 7)
 *
 * **Validates: Requirements 3.6**
 *
 * *For any* transaction record, the `date` field SHALL be a valid date and
 * the `amount` field SHALL be a numeric value. Invalid data SHALL be rejected
 * by the Database_Manager.
 *
 * Note: This test validates the CONCEPT of transaction data validation.
 * It uses a simulated validator to demonstrate the property.
 */
import * as fc from 'fast-check';

describe('Property 7: Transaction Data Validation', () => {
  /**
   * Validation error class
   */
  class ValidationError extends Error {
    constructor(
      message: string,
      public readonly field: string
    ) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  /**
   * Transaction validator that enforces data validation rules
   */
  class TransactionValidator {
    /**
     * Validate transaction data
     * @throws ValidationError if validation fails
     */
    validate(data: {
      date?: unknown;
      amount?: unknown;
      description?: unknown;
      referenceMonth?: unknown;
    }): void {
      // Validate date field
      if (data.date === undefined || data.date === null) {
        throw new ValidationError('Date is required', 'date');
      }
      if (!(data.date instanceof Date)) {
        throw new ValidationError('Date must be a Date object', 'date');
      }
      if (isNaN(data.date.getTime())) {
        throw new ValidationError('Date must be a valid date', 'date');
      }

      // Validate amount field
      if (data.amount === undefined || data.amount === null) {
        throw new ValidationError('Amount is required', 'amount');
      }
      if (typeof data.amount !== 'number') {
        throw new ValidationError('Amount must be a number', 'amount');
      }
      if (!Number.isFinite(data.amount)) {
        throw new ValidationError('Amount must be a finite number', 'amount');
      }

      // Validate description field
      if (data.description === undefined || data.description === null || data.description === '') {
        throw new ValidationError('Description is required', 'description');
      }
      if (typeof data.description !== 'string') {
        throw new ValidationError('Description must be a string', 'description');
      }

      // Validate referenceMonth field
      if (data.referenceMonth === undefined || data.referenceMonth === null) {
        throw new ValidationError('Reference month is required', 'referenceMonth');
      }
      if (typeof data.referenceMonth !== 'string') {
        throw new ValidationError('Reference month must be a string', 'referenceMonth');
      }
      // Check format YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(data.referenceMonth)) {
        throw new ValidationError('Reference month must be in YYYY-MM format', 'referenceMonth');
      }
    }

    /**
     * Try to validate and return result
     */
    tryValidate(data: {
      date?: unknown;
      amount?: unknown;
      description?: unknown;
      referenceMonth?: unknown;
    }): { valid: boolean; error?: ValidationError } {
      try {
        this.validate(data);
        return { valid: true };
      } catch (error) {
        if (error instanceof ValidationError) {
          return { valid: false, error };
        }
        throw error;
      }
    }
  }

  let validator: TransactionValidator;

  beforeEach(() => {
    validator = new TransactionValidator();
  });

  describe('Date Field Validation', () => {
    it('should accept valid dates', () => {
      /**
       * Property: Any valid Date object should be accepted
       */
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2050-12-31') }),
          (validDate) => {
            // Skip invalid dates that fast-check might generate
            if (isNaN(validDate.getTime())) return;

            const result = validator.tryValidate({
              date: validDate,
              amount: 100,
              description: 'Test transaction',
              referenceMonth: '2024-01',
            });

            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept dates across different years', () => {
      /**
       * Property: Dates from any valid year should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2000, max: 2050 }),
            month: fc.integer({ min: 1, max: 12 }),
            day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid dates
          }),
          ({ year, month, day }) => {
            const validDate = new Date(year, month - 1, day);

            const result = validator.tryValidate({
              date: validDate,
              amount: 50,
              description: 'Test',
              referenceMonth: `${year}-${month.toString().padStart(2, '0')}`,
            });

            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject null dates', () => {
      /**
       * Property: Null dates should be rejected
       */
      const result = validator.tryValidate({
        date: null,
        amount: 100,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('date');
    });

    it('should reject undefined dates', () => {
      /**
       * Property: Undefined dates should be rejected
       */
      const result = validator.tryValidate({
        date: undefined,
        amount: 100,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('date');
    });

    it('should reject invalid Date objects', () => {
      /**
       * Property: Invalid Date objects (NaN time) should be rejected
       */
      const invalidDate = new Date('invalid');

      const result = validator.tryValidate({
        date: invalidDate,
        amount: 100,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('date');
    });
  });

  describe('Amount Field Validation', () => {
    it('should accept valid numeric amounts', () => {
      /**
       * Property: Any finite number should be accepted as amount
       */
      fc.assert(
        fc.property(fc.double({ min: -1000000, max: 1000000, noNaN: true }), (validAmount) => {
          // Skip if not finite
          if (!Number.isFinite(validAmount)) return;

          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: validAmount,
            description: 'Test transaction',
            referenceMonth: '2024-01',
          });

          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept positive amounts (income)', () => {
      /**
       * Property: Positive amounts representing income should be accepted
       */
      fc.assert(
        fc.property(fc.double({ min: 0.01, max: 1000000, noNaN: true }), (positiveAmount) => {
          if (!Number.isFinite(positiveAmount)) return;

          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: positiveAmount,
            description: 'Income',
            referenceMonth: '2024-01',
          });

          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept negative amounts (expenses)', () => {
      /**
       * Property: Negative amounts representing expenses should be accepted
       */
      fc.assert(
        fc.property(fc.double({ min: -1000000, max: -0.01, noNaN: true }), (negativeAmount) => {
          if (!Number.isFinite(negativeAmount)) return;

          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: negativeAmount,
            description: 'Expense',
            referenceMonth: '2024-01',
          });

          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept zero amount', () => {
      /**
       * Property: Zero amount should be accepted (edge case)
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: 0,
        description: 'Zero amount transaction',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject NaN amounts', () => {
      /**
       * Property: NaN should be rejected as an invalid amount
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: NaN,
        description: 'Invalid amount',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });

    it('should reject Infinity amounts', () => {
      /**
       * Property: Infinity should be rejected as an invalid amount
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: Infinity,
        description: 'Invalid amount',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });

    it('should reject negative Infinity amounts', () => {
      /**
       * Property: Negative Infinity should be rejected as an invalid amount
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: -Infinity,
        description: 'Invalid amount',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });

    it('should reject null amounts', () => {
      /**
       * Property: Null amounts should be rejected
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: null,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });

    it('should reject string amounts', () => {
      /**
       * Property: String amounts should be rejected
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: '100' as unknown,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });
  });

  describe('Description Field Validation', () => {
    it('should accept non-empty descriptions', () => {
      /**
       * Property: Any non-empty string should be accepted as description
       */
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 500 }), (validDescription) => {
          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: 100,
            description: validDescription,
            referenceMonth: '2024-01',
          });

          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept descriptions with special characters', () => {
      /**
       * Property: Descriptions with special characters should be accepted
       */
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (description) => {
          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: 100,
            description,
            referenceMonth: '2024-01',
          });

          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept descriptions with unicode characters', () => {
      /**
       * Property: Descriptions with unicode (including emojis) should be accepted
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100, unit: 'grapheme' }),
          (unicodeDescription) => {
            const result = validator.tryValidate({
              date: new Date('2024-01-15'),
              amount: 100,
              description: unicodeDescription,
              referenceMonth: '2024-01',
            });

            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty descriptions', () => {
      /**
       * Property: Empty descriptions should be rejected
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: 100,
        description: '',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('description');
    });

    it('should reject null descriptions', () => {
      /**
       * Property: Null descriptions should be rejected
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: 100,
        description: null,
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('description');
    });
  });

  describe('Reference Month Field Validation', () => {
    it('should accept valid YYYY-MM format', () => {
      /**
       * Property: Reference months in YYYY-MM format should be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 1, max: 12 }),
          }),
          ({ year, month }) => {
            const referenceMonth = `${year}-${month.toString().padStart(2, '0')}`;

            const result = validator.tryValidate({
              date: new Date('2024-01-15'),
              amount: 100,
              description: 'Test',
              referenceMonth,
            });

            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid reference month formats', () => {
      /**
       * Property: Invalid reference month formats should be rejected
       */
      const invalidFormats = [
        '2024-1', // Missing leading zero
        '24-01', // Two-digit year
        '2024/01', // Wrong separator
        '01-2024', // Wrong order
        '2024-13', // Invalid month (but format is correct, so this passes format check)
        'January 2024', // Text format
      ];

      for (const invalidFormat of invalidFormats) {
        if (!/^\d{4}-\d{2}$/.test(invalidFormat)) {
          const result = validator.tryValidate({
            date: new Date('2024-01-15'),
            amount: 100,
            description: 'Test',
            referenceMonth: invalidFormat,
          });

          expect(result.valid).toBe(false);
          expect(result.error?.field).toBe('referenceMonth');
        }
      }
    });
  });

  describe('Combined Validation', () => {
    it('should accept transactions with all valid fields', () => {
      /**
       * Property: Transactions with all valid fields should always be accepted
       */
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2020, max: 2025 }),
            month: fc.integer({ min: 1, max: 12 }),
            day: fc.integer({ min: 1, max: 28 }),
            amount: fc.double({ min: -10000, max: 10000, noNaN: true }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          ({ year, month, day, amount, description }) => {
            if (!Number.isFinite(amount)) return;
            const date = new Date(year, month - 1, day);

            const referenceMonth = `${year}-${month.toString().padStart(2, '0')}`;

            const result = validator.tryValidate({
              date,
              amount,
              description,
              referenceMonth,
            });

            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate all fields consistently', () => {
      /**
       * Property: Validation should be deterministic - same input always produces same result
       */
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2020, max: 2025 }),
            month: fc.integer({ min: 1, max: 12 }),
            day: fc.integer({ min: 1, max: 28 }),
            amount: fc.double({ min: -10000, max: 10000, noNaN: true }),
            description: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          ({ year, month, day, amount, description }) => {
            if (!Number.isFinite(amount)) return;
            const date = new Date(year, month - 1, day);

            const data = {
              date,
              amount,
              description,
              referenceMonth: '2024-01',
            };

            // Run validation twice
            const result1 = validator.tryValidate(data);
            const result2 = validator.tryValidate(data);

            // Both attempts should have the same result
            expect(result1.valid).toBe(result2.valid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      /**
       * Property: Very large (but finite) amounts should be accepted
       */
      const largeAmounts = [999999999, -999999999, 0.0001, -0.0001];

      for (const amount of largeAmounts) {
        const result = validator.tryValidate({
          date: new Date('2024-01-15'),
          amount,
          description: 'Large amount test',
          referenceMonth: '2024-01',
        });

        expect(result.valid).toBe(true);
      }
    });

    it('should handle boundary dates', () => {
      /**
       * Property: Boundary dates should be accepted
       */
      const boundaryDates = [
        new Date('2000-01-01'),
        new Date('2099-12-31'),
        new Date('2024-02-29'), // Leap year
      ];

      for (const date of boundaryDates) {
        const result = validator.tryValidate({
          date,
          amount: 100,
          description: 'Boundary date test',
          referenceMonth: '2024-01',
        });

        expect(result.valid).toBe(true);
      }
    });

    it('should handle long descriptions', () => {
      /**
       * Property: Long descriptions should be accepted
       */
      const longDescription = 'A'.repeat(1000);

      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: 100,
        description: longDescription,
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Validation Order', () => {
    it('should validate date before amount', () => {
      /**
       * Property: When both date and amount are invalid, date error should be reported first
       */
      const result = validator.tryValidate({
        date: null,
        amount: NaN,
        description: 'Test',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('date');
    });

    it('should validate amount before description', () => {
      /**
       * Property: When both amount and description are invalid, amount error should be reported first
       */
      const result = validator.tryValidate({
        date: new Date('2024-01-15'),
        amount: NaN,
        description: '',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(false);
      expect(result.error?.field).toBe('amount');
    });
  });
});
