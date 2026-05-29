/**
 * Unit tests for parcel amount validation
 *
 * Tests the validateParcelAmount function which validates form input
 * for weekly parcel amount editing.
 *
 * **Validates: Requirements 2.4**
 */

import { validateParcelAmount, validateParcelAmountStandard } from '../parcelAmountValidation';

describe('validateParcelAmount', () => {
  describe('valid inputs', () => {
    it('should accept a positive integer', () => {
      const result = validateParcelAmount(100);
      expect(result).toEqual({ valid: true, amount: 100 });
    });

    it('should accept a positive decimal', () => {
      const result = validateParcelAmount(42.5);
      expect(result).toEqual({ valid: true, amount: 42.5 });
    });

    it('should accept a numeric string', () => {
      const result = validateParcelAmount('150.75');
      expect(result).toEqual({ valid: true, amount: 150.75 });
    });

    it('should accept a string with leading/trailing whitespace', () => {
      const result = validateParcelAmount('  25  ');
      expect(result).toEqual({ valid: true, amount: 25 });
    });

    it('should accept a very small positive number', () => {
      const result = validateParcelAmount(0.01);
      expect(result).toEqual({ valid: true, amount: 0.01 });
    });
  });

  describe('rejects zero', () => {
    it('should reject numeric zero', () => {
      const result = validateParcelAmount(0);
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });

    it('should reject string zero', () => {
      const result = validateParcelAmount('0');
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });

    it('should reject negative zero', () => {
      const result = validateParcelAmount(-0);
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });
  });

  describe('rejects negative amounts', () => {
    it('should reject a negative integer', () => {
      const result = validateParcelAmount(-50);
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });

    it('should reject a negative decimal', () => {
      const result = validateParcelAmount(-0.01);
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });

    it('should reject a negative string', () => {
      const result = validateParcelAmount('-100');
      expect(result).toEqual({ valid: false, error: 'Amount must be greater than zero' });
    });
  });

  describe('rejects non-numeric values', () => {
    it('should reject null', () => {
      const result = validateParcelAmount(null);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject undefined', () => {
      const result = validateParcelAmount(undefined);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject empty string', () => {
      const result = validateParcelAmount('');
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject whitespace-only string', () => {
      const result = validateParcelAmount('   ');
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject NaN', () => {
      const result = validateParcelAmount(NaN);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject Infinity', () => {
      const result = validateParcelAmount(Infinity);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject -Infinity', () => {
      const result = validateParcelAmount(-Infinity);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject non-numeric string', () => {
      const result = validateParcelAmount('abc');
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject boolean', () => {
      const result = validateParcelAmount(true);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject object', () => {
      const result = validateParcelAmount({});
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });

    it('should reject array', () => {
      const result = validateParcelAmount([10]);
      expect(result).toEqual({ valid: false, error: 'Amount must be a valid number' });
    });
  });
});

describe('validateParcelAmountStandard', () => {
  it('should return valid: true with no errors for valid input', () => {
    const result = validateParcelAmountStandard(100);
    expect(result).toEqual({ valid: true });
  });

  it('should return valid: false with errors array for invalid input', () => {
    const result = validateParcelAmountStandard(-5);
    expect(result).toEqual({ valid: false, errors: ['Amount must be greater than zero'] });
  });

  it('should return valid: false with errors array for non-numeric input', () => {
    const result = validateParcelAmountStandard(null);
    expect(result).toEqual({ valid: false, errors: ['Amount must be a valid number'] });
  });
});
