/**
 * Goal Validation Unit Tests
 *
 * Tests for validateGoalAmount with locale-specific parsing.
 *
 * **Validates: Requirements 1.8, 2.7, 7.5, 7.6**
 */

import { validateGoalAmount } from '../goalValidation';

describe('validateGoalAmount', () => {
  describe('valid inputs - en locale', () => {
    it('should accept a simple integer', () => {
      const result = validateGoalAmount('100', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 10000 });
    });

    it('should accept a decimal value with dot separator', () => {
      const result = validateGoalAmount('1500.50', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 150050 });
    });

    it('should accept value with grouping separator (comma)', () => {
      const result = validateGoalAmount('1,500.00', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 150000 });
    });

    it('should accept minimum value 0.01', () => {
      const result = validateGoalAmount('0.01', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 1 });
    });

    it('should accept maximum value 999,999,999.99', () => {
      const result = validateGoalAmount('999,999,999.99', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 99999999999 });
    });

    it('should accept numeric input directly', () => {
      const result = validateGoalAmount(250.5, 'en');
      expect(result).toEqual({ valid: true, amountInCents: 25050 });
    });

    it('should accept value with single decimal place', () => {
      const result = validateGoalAmount('10.5', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 1050 });
    });
  });

  describe('valid inputs - pt-BR locale', () => {
    it('should accept a simple integer', () => {
      const result = validateGoalAmount('100', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 10000 });
    });

    it('should accept a decimal value with comma separator', () => {
      const result = validateGoalAmount('1500,50', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 150050 });
    });

    it('should accept value with grouping separator (dot)', () => {
      const result = validateGoalAmount('1.500,00', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 150000 });
    });

    it('should accept minimum value 0,01', () => {
      const result = validateGoalAmount('0,01', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 1 });
    });

    it('should accept maximum value 999.999.999,99', () => {
      const result = validateGoalAmount('999.999.999,99', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 99999999999 });
    });

    it('should accept numeric input directly', () => {
      const result = validateGoalAmount(250.5, 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 25050 });
    });
  });

  describe('invalid inputs - too low', () => {
    it('should reject zero', () => {
      const result = validateGoalAmount('0', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.tooLow' });
    });

    it('should reject zero with decimal', () => {
      const result = validateGoalAmount('0.00', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.tooLow' });
    });

    it('should reject numeric zero', () => {
      const result = validateGoalAmount(0, 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.tooLow' });
    });

    it('should reject negative values', () => {
      const result = validateGoalAmount('-10', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });
  });

  describe('invalid inputs - too high', () => {
    it('should reject value exceeding maximum', () => {
      const result = validateGoalAmount('1,000,000,000.00', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.tooHigh' });
    });

    it('should reject numeric value exceeding maximum', () => {
      const result = validateGoalAmount(1000000000, 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.tooHigh' });
    });
  });

  describe('invalid inputs - invalid format', () => {
    it('should reject non-numeric string', () => {
      const result = validateGoalAmount('abc', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject empty string', () => {
      const result = validateGoalAmount('', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject whitespace-only string', () => {
      const result = validateGoalAmount('   ', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject NaN', () => {
      const result = validateGoalAmount(NaN, 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject Infinity', () => {
      const result = validateGoalAmount(Infinity, 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject string with more than 2 decimal places', () => {
      const result = validateGoalAmount('10.555', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject string with letters mixed in', () => {
      const result = validateGoalAmount('12a3', 'en');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });

    it('should reject pt-BR string with more than 2 decimal places', () => {
      const result = validateGoalAmount('10,555', 'pt-BR');
      expect(result).toEqual({ valid: false, error: 'goals.validation.invalidFormat' });
    });
  });

  describe('edge cases', () => {
    it('should handle value with currency symbol R$', () => {
      const result = validateGoalAmount('R$ 1.000,00', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 100000 });
    });

    it('should handle value with currency symbol $', () => {
      const result = validateGoalAmount('$1,000.00', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 100000 });
    });

    it('should handle value with leading/trailing whitespace', () => {
      const result = validateGoalAmount('  100.00  ', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 10000 });
    });

    it('should correctly round 19.99 to avoid floating-point issues', () => {
      const result = validateGoalAmount(19.99, 'en');
      expect(result).toEqual({ valid: true, amountInCents: 1999 });
    });

    it('should correctly handle 0.1 + 0.2 style values', () => {
      const result = validateGoalAmount('0.30', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 30 });
    });
  });
});
