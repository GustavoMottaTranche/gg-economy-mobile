/**
 * Unit tests for validation schemas
 *
 * **Validates: Requirements 9**
 */

import {
  validateTransaction,
  validateImportOptions,
  validateReferenceMonth,
} from '../../../src/validation/schemas';
import {
  DESCRIPTION_MAX_LENGTH,
  AMOUNT_MAX_VALUE,
  AMOUNT_MIN_VALUE,
} from '../../../src/constants/limits';

describe('validateTransaction', () => {
  describe('valid transactions', () => {
    it('returns valid for complete valid transaction', () => {
      const result = validateTransaction({
        date: new Date(),
        amount: 10000,
        description: 'Test transaction',
        referenceMonth: '2024-01',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for empty object (all fields optional)', () => {
      const result = validateTransaction({});

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for partial transaction data', () => {
      const result = validateTransaction({
        amount: 5000,
        referenceMonth: '2024-06',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts amount at maximum value', () => {
      const result = validateTransaction({
        amount: AMOUNT_MAX_VALUE,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts amount at minimum value', () => {
      const result = validateTransaction({
        amount: AMOUNT_MIN_VALUE,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts zero amount', () => {
      const result = validateTransaction({
        amount: 0,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts negative amount within range', () => {
      const result = validateTransaction({
        amount: -50000,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts empty description', () => {
      const result = validateTransaction({
        description: '',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts description at max length', () => {
      const result = validateTransaction({
        description: 'a'.repeat(DESCRIPTION_MAX_LENGTH),
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('invalid date', () => {
    it('returns error for invalid Date object', () => {
      const result = validateTransaction({
        date: new Date('invalid'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });

    it('returns error for non-Date object', () => {
      const result = validateTransaction({
        date: 'not a date' as unknown as Date,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });

    it('returns error for null date', () => {
      const result = validateTransaction({
        date: null as unknown as Date,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });
  });

  describe('invalid amount', () => {
    it('returns error for non-number amount', () => {
      const result = validateTransaction({
        amount: 'not a number' as unknown as number,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be a number');
    });

    it('returns error for NaN amount', () => {
      const result = validateTransaction({
        amount: NaN,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be a number');
    });

    it('returns error for amount above maximum', () => {
      const result = validateTransaction({
        amount: AMOUNT_MAX_VALUE + 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Amount must be between ${AMOUNT_MIN_VALUE} and ${AMOUNT_MAX_VALUE}`
      );
    });

    it('returns error for amount below minimum', () => {
      const result = validateTransaction({
        amount: AMOUNT_MIN_VALUE - 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Amount must be between ${AMOUNT_MIN_VALUE} and ${AMOUNT_MAX_VALUE}`
      );
    });
  });

  describe('invalid description', () => {
    it('returns error for non-string description', () => {
      const result = validateTransaction({
        description: 123 as unknown as string,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be a string');
    });

    it('returns error for description exceeding max length', () => {
      const result = validateTransaction({
        description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`
      );
    });
  });

  describe('invalid referenceMonth', () => {
    it('returns error for invalid format (slash separator)', () => {
      const result = validateTransaction({
        referenceMonth: '2024/01',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });

    it('returns error for invalid format (single digit month)', () => {
      const result = validateTransaction({
        referenceMonth: '2024-1',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });

    it('returns error for invalid format (two digit year)', () => {
      const result = validateTransaction({
        referenceMonth: '24-01',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });

    it('returns error for empty string', () => {
      const result = validateTransaction({
        referenceMonth: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });

    it('returns error for random string', () => {
      const result = validateTransaction({
        referenceMonth: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });
  });

  describe('multiple errors', () => {
    it('returns all errors for multiple invalid fields', () => {
      const result = validateTransaction({
        date: new Date('invalid'),
        amount: 'not a number' as unknown as number,
        description: 123 as unknown as string,
        referenceMonth: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Invalid date');
      expect(result.errors).toContain('Amount must be a number');
      expect(result.errors).toContain('Description must be a string');
      expect(result.errors).toContain('Reference month must be in YYYY-MM format');
    });
  });
});

describe('validateImportOptions', () => {
  describe('valid options', () => {
    it('returns valid for empty options', () => {
      const result = validateImportOptions({});

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for pt-BR locale', () => {
      const result = validateImportOptions({
        locale: 'pt-BR',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for en locale', () => {
      const result = validateImportOptions({
        locale: 'en',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for threshold at 0', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: 0,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for threshold at 1', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: 1,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for threshold between 0 and 1', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: 0.8,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for complete valid options', () => {
      const result = validateImportOptions({
        locale: 'pt-BR',
        dedupeConfidenceThreshold: 0.75,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for undefined locale', () => {
      const result = validateImportOptions({
        locale: undefined,
        dedupeConfidenceThreshold: 0.5,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('invalid locale', () => {
    it('returns error for unsupported locale', () => {
      const result = validateImportOptions({
        locale: 'fr-FR',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Locale must be pt-BR or en');
    });

    it('returns error for invalid locale format', () => {
      const result = validateImportOptions({
        locale: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Locale must be pt-BR or en');
    });

    it('returns error for empty string locale', () => {
      const result = validateImportOptions({
        locale: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Locale must be pt-BR or en');
    });
  });

  describe('invalid dedupeConfidenceThreshold', () => {
    it('returns error for threshold below 0', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: -0.1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dedupe confidence threshold must be between 0 and 1');
    });

    it('returns error for threshold above 1', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: 1.1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dedupe confidence threshold must be between 0 and 1');
    });

    it('returns error for NaN threshold', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: NaN,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dedupe confidence threshold must be between 0 and 1');
    });

    it('returns error for non-number threshold', () => {
      const result = validateImportOptions({
        dedupeConfidenceThreshold: 'high' as unknown as number,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dedupe confidence threshold must be between 0 and 1');
    });
  });

  describe('multiple errors', () => {
    it('returns all errors for multiple invalid options', () => {
      const result = validateImportOptions({
        locale: 'invalid',
        dedupeConfidenceThreshold: 2,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Locale must be pt-BR or en');
      expect(result.errors).toContain('Dedupe confidence threshold must be between 0 and 1');
    });
  });
});

describe('validateReferenceMonth', () => {
  describe('valid reference months', () => {
    it('returns true for valid format 2024-01', () => {
      expect(validateReferenceMonth('2024-01')).toBe(true);
    });

    it('returns true for valid format 2024-12', () => {
      expect(validateReferenceMonth('2024-12')).toBe(true);
    });

    it('returns true for valid format 1999-06', () => {
      expect(validateReferenceMonth('1999-06')).toBe(true);
    });

    it('returns true for valid format 2100-01', () => {
      expect(validateReferenceMonth('2100-01')).toBe(true);
    });

    it('returns true for month 00 (regex only checks format)', () => {
      // Note: The regex only validates format, not semantic validity
      expect(validateReferenceMonth('2024-00')).toBe(true);
    });

    it('returns true for month 13 (regex only checks format)', () => {
      // Note: The regex only validates format, not semantic validity
      expect(validateReferenceMonth('2024-13')).toBe(true);
    });
  });

  describe('invalid reference months', () => {
    it('returns false for slash separator', () => {
      expect(validateReferenceMonth('2024/01')).toBe(false);
    });

    it('returns false for single digit month', () => {
      expect(validateReferenceMonth('2024-1')).toBe(false);
    });

    it('returns false for two digit year', () => {
      expect(validateReferenceMonth('24-01')).toBe(false);
    });

    it('returns false for three digit year', () => {
      expect(validateReferenceMonth('202-01')).toBe(false);
    });

    it('returns false for five digit year', () => {
      expect(validateReferenceMonth('20240-01')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(validateReferenceMonth('')).toBe(false);
    });

    it('returns false for random string', () => {
      expect(validateReferenceMonth('invalid')).toBe(false);
    });

    it('returns false for date format', () => {
      expect(validateReferenceMonth('2024-01-15')).toBe(false);
    });

    it('returns false for reversed format', () => {
      expect(validateReferenceMonth('01-2024')).toBe(false);
    });

    it('returns false for no separator', () => {
      expect(validateReferenceMonth('202401')).toBe(false);
    });

    it('returns false for space separator', () => {
      expect(validateReferenceMonth('2024 01')).toBe(false);
    });

    it('returns false for underscore separator', () => {
      expect(validateReferenceMonth('2024_01')).toBe(false);
    });
  });
});
