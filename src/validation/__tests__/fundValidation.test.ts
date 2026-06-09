/**
 * Fund Validation Unit Tests
 *
 * Tests for validateFundName and validateMonetaryInput with locale-specific parsing.
 *
 * **Validates: Requirements 2.5, 5.6, 6.7**
 */

import { validateFundName, validateMonetaryInput } from '../fundValidation';

describe('validateFundName', () => {
  describe('valid names', () => {
    it('should accept a single character name', () => {
      const result = validateFundName('A');
      expect(result).toEqual({ valid: true });
    });

    it('should accept a typical fund name', () => {
      const result = validateFundName('Travel Fund');
      expect(result).toEqual({ valid: true });
    });

    it('should accept a name with exactly 50 characters', () => {
      const result = validateFundName('A'.repeat(50));
      expect(result).toEqual({ valid: true });
    });

    it('should trim whitespace and validate the trimmed result', () => {
      const result = validateFundName('  Viagem  ');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('invalid names', () => {
    it('should reject an empty string', () => {
      const result = validateFundName('');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.nameRequired' });
    });

    it('should reject a whitespace-only string', () => {
      const result = validateFundName('   ');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.nameRequired' });
    });

    it('should reject a name exceeding 50 characters', () => {
      const result = validateFundName('A'.repeat(51));
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.nameTooLong' });
    });
  });
});

describe('validateMonetaryInput', () => {
  describe('valid inputs - en locale', () => {
    it('should accept a simple integer', () => {
      const result = validateMonetaryInput('100', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 10000 });
    });

    it('should accept a decimal value', () => {
      const result = validateMonetaryInput('1500.50', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 150050 });
    });

    it('should accept value with grouping separators', () => {
      const result = validateMonetaryInput('1,500.00', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 150000 });
    });

    it('should accept minimum value 0.01', () => {
      const result = validateMonetaryInput('0.01', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 1 });
    });

    it('should accept maximum value 999,999,999.99', () => {
      const result = validateMonetaryInput('999,999,999.99', 'en');
      expect(result).toEqual({ valid: true, amountInCents: 99999999999 });
    });

    it('should accept numeric input directly', () => {
      const result = validateMonetaryInput(250.5, 'en');
      expect(result).toEqual({ valid: true, amountInCents: 25050 });
    });
  });

  describe('valid inputs - pt-BR locale', () => {
    it('should accept a simple integer', () => {
      const result = validateMonetaryInput('100', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 10000 });
    });

    it('should accept a decimal value with comma', () => {
      const result = validateMonetaryInput('1500,50', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 150050 });
    });

    it('should accept value with grouping separators (dot)', () => {
      const result = validateMonetaryInput('1.500,00', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 150000 });
    });

    it('should accept minimum value 0,01', () => {
      const result = validateMonetaryInput('0,01', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 1 });
    });

    it('should accept maximum value 999.999.999,99', () => {
      const result = validateMonetaryInput('999.999.999,99', 'pt-BR');
      expect(result).toEqual({ valid: true, amountInCents: 99999999999 });
    });
  });

  describe('invalid inputs', () => {
    it('should reject zero by default', () => {
      const result = validateMonetaryInput('0', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.amountTooLow' });
    });

    it('should reject negative values', () => {
      const result = validateMonetaryInput('-10', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });

    it('should reject non-numeric string', () => {
      const result = validateMonetaryInput('abc', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });

    it('should reject empty string', () => {
      const result = validateMonetaryInput('', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });

    it('should reject NaN number', () => {
      const result = validateMonetaryInput(NaN, 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });

    it('should reject Infinity', () => {
      const result = validateMonetaryInput(Infinity, 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });

    it('should reject value exceeding maximum', () => {
      const result = validateMonetaryInput('1000000000', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.amountTooHigh' });
    });

    it('should reject more than 2 decimal places', () => {
      const result = validateMonetaryInput('10.123', 'en');
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.invalidFormat' });
    });
  });

  describe('options', () => {
    it('should allow zero when allowZero is true', () => {
      const result = validateMonetaryInput('0', 'en', { allowZero: true });
      expect(result).toEqual({ valid: true, amountInCents: 0 });
    });

    it('should enforce custom maxCents', () => {
      const result = validateMonetaryInput('200', 'en', { maxCents: 10000 });
      expect(result).toEqual({ valid: false, error: 'futurePlans.validation.amountTooHigh' });
    });

    it('should accept value within custom maxCents', () => {
      const result = validateMonetaryInput('99.99', 'en', { maxCents: 10000 });
      expect(result).toEqual({ valid: true, amountInCents: 9999 });
    });
  });
});
