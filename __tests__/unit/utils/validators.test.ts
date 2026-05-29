/**
 * Unit tests for validators utility
 */

import {
  validateRequired,
  validateAmount,
  validateDate,
  validateReferenceMonth,
  validateDescription,
  validateCategoryId,
  validateTransactionForm,
  isFormValid,
  getValidationErrors,
  getFirstError,
  ValidationResult,
} from '../../../src/utils/validators';

describe('validateRequired', () => {
  it('returns valid for non-empty string', () => {
    const result = validateRequired('test', 'field');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for empty string', () => {
    const result = validateRequired('', 'field');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('REQUIRED');
  });

  it('returns invalid for whitespace-only string', () => {
    const result = validateRequired('   ', 'field');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for null', () => {
    const result = validateRequired(null, 'field');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for undefined', () => {
    const result = validateRequired(undefined, 'field');
    expect(result.isValid).toBe(false);
  });

  it('returns valid for number', () => {
    const result = validateRequired(0, 'field');
    expect(result.isValid).toBe(true);
  });

  it('returns valid for boolean', () => {
    const result = validateRequired(false, 'field');
    expect(result.isValid).toBe(true);
  });

  it('includes field name in error message', () => {
    const result = validateRequired('', 'description');
    expect(result.errorMessage).toContain('description');
  });
});

describe('validateAmount', () => {
  describe('valid amounts', () => {
    it('accepts positive number', () => {
      const result = validateAmount(100);
      expect(result.isValid).toBe(true);
    });

    it('accepts negative number', () => {
      const result = validateAmount(-100);
      expect(result.isValid).toBe(true);
    });

    it('accepts zero by default', () => {
      const result = validateAmount(0);
      expect(result.isValid).toBe(true);
    });

    it('accepts decimal number', () => {
      const result = validateAmount(100.5);
      expect(result.isValid).toBe(true);
    });

    it('accepts string number', () => {
      const result = validateAmount('100.50');
      expect(result.isValid).toBe(true);
    });

    it('accepts pt-BR formatted string', () => {
      const result = validateAmount('1.234,56', { locale: 'pt-BR' });
      expect(result.isValid).toBe(true);
    });

    it('accepts en formatted string', () => {
      const result = validateAmount('1,234.56', { locale: 'en' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid amounts', () => {
    it('rejects null', () => {
      const result = validateAmount(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('REQUIRED');
    });

    it('rejects undefined', () => {
      const result = validateAmount(undefined);
      expect(result.isValid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validateAmount('');
      expect(result.isValid).toBe(false);
    });

    it('rejects non-numeric string', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_AMOUNT');
    });

    it('rejects NaN', () => {
      const result = validateAmount(NaN);
      expect(result.isValid).toBe(false);
    });

    it('rejects Infinity', () => {
      const result = validateAmount(Infinity);
      expect(result.isValid).toBe(false);
    });
  });

  describe('options', () => {
    it('rejects zero when allowZero is false', () => {
      const result = validateAmount(0, { allowZero: false });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ZERO_NOT_ALLOWED');
    });

    it('rejects negative when allowNegative is false', () => {
      const result = validateAmount(-100, { allowNegative: false });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('NEGATIVE_NOT_ALLOWED');
    });

    it('rejects value below min', () => {
      const result = validateAmount(5, { min: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('BELOW_MIN');
    });

    it('accepts value at min', () => {
      const result = validateAmount(10, { min: 10 });
      expect(result.isValid).toBe(true);
    });

    it('rejects value above max', () => {
      const result = validateAmount(100, { max: 50 });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ABOVE_MAX');
    });

    it('accepts value at max', () => {
      const result = validateAmount(50, { max: 50 });
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateDate', () => {
  describe('valid dates', () => {
    it('accepts Date object', () => {
      const result = validateDate(new Date());
      expect(result.isValid).toBe(true);
    });

    it('accepts ISO date string', () => {
      const result = validateDate('2024-01-15');
      expect(result.isValid).toBe(true);
    });

    it('accepts timestamp number', () => {
      const result = validateDate(Date.now());
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid dates', () => {
    it('rejects null', () => {
      const result = validateDate(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('REQUIRED');
    });

    it('rejects undefined', () => {
      const result = validateDate(undefined);
      expect(result.isValid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid date string', () => {
      const result = validateDate('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_DATE');
    });

    it('rejects invalid Date object', () => {
      const result = validateDate(new Date('invalid'));
      expect(result.isValid).toBe(false);
    });
  });

  describe('options', () => {
    it('rejects future date when allowFuture is false', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDate(futureDate, { allowFuture: false });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('FUTURE_NOT_ALLOWED');
    });

    it('rejects past date when allowPast is false', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const result = validateDate(pastDate, { allowPast: false });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('PAST_NOT_ALLOWED');
    });

    it('rejects date before minDate', () => {
      const minDate = new Date(2024, 0, 15);
      const testDate = new Date(2024, 0, 10);
      const result = validateDate(testDate, { minDate });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('BEFORE_MIN_DATE');
    });

    it('accepts date at minDate', () => {
      const minDate = new Date(2024, 0, 15);
      const result = validateDate(minDate, { minDate });
      expect(result.isValid).toBe(true);
    });

    it('rejects date after maxDate', () => {
      const maxDate = new Date(2024, 0, 15);
      const testDate = new Date(2024, 0, 20);
      const result = validateDate(testDate, { maxDate });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('AFTER_MAX_DATE');
    });

    it('accepts date at maxDate', () => {
      const maxDate = new Date(2024, 0, 15);
      const result = validateDate(maxDate, { maxDate });
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateReferenceMonth', () => {
  describe('valid reference months', () => {
    it('accepts valid format', () => {
      const result = validateReferenceMonth('2024-01');
      expect(result.isValid).toBe(true);
    });

    it('accepts December', () => {
      const result = validateReferenceMonth('2024-12');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid reference months', () => {
    it('rejects null', () => {
      const result = validateReferenceMonth(null);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('REQUIRED');
    });

    it('rejects empty string', () => {
      const result = validateReferenceMonth('');
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid format', () => {
      const result = validateReferenceMonth('2024/01');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('rejects single digit month', () => {
      const result = validateReferenceMonth('2024-1');
      expect(result.isValid).toBe(false);
    });

    it('rejects invalid month 00', () => {
      const result = validateReferenceMonth('2024-00');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_MONTH');
    });

    it('rejects invalid month 13', () => {
      const result = validateReferenceMonth('2024-13');
      expect(result.isValid).toBe(false);
    });

    it('rejects year out of range', () => {
      const result = validateReferenceMonth('1800-01');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_YEAR');
    });
  });
});

describe('validateDescription', () => {
  describe('valid descriptions', () => {
    it('accepts non-empty string', () => {
      const result = validateDescription('Test description');
      expect(result.isValid).toBe(true);
    });

    it('accepts minimum length', () => {
      const result = validateDescription('a', { minLength: 1 });
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid descriptions', () => {
    it('rejects null when required', () => {
      const result = validateDescription(null);
      expect(result.isValid).toBe(false);
    });

    it('rejects empty string when required', () => {
      const result = validateDescription('');
      expect(result.isValid).toBe(false);
    });

    it('rejects string below minLength', () => {
      const result = validateDescription('ab', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('TOO_SHORT');
    });

    it('rejects string above maxLength', () => {
      const result = validateDescription('a'.repeat(600), { maxLength: 500 });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('TOO_LONG');
    });
  });

  describe('options', () => {
    it('accepts null when not required', () => {
      const result = validateDescription(null, { required: false });
      expect(result.isValid).toBe(true);
    });

    it('accepts empty string when not required', () => {
      const result = validateDescription('', { required: false });
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateCategoryId', () => {
  describe('valid category IDs', () => {
    it('accepts null when not required', () => {
      const result = validateCategoryId(null);
      expect(result.isValid).toBe(true);
    });

    it('accepts valid string', () => {
      const result = validateCategoryId('cat-123');
      expect(result.isValid).toBe(true);
    });

    it('accepts ID from valid list', () => {
      const result = validateCategoryId('cat-1', { validIds: ['cat-1', 'cat-2'] });
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid category IDs', () => {
    it('rejects null when required', () => {
      const result = validateCategoryId(null, { required: true });
      expect(result.isValid).toBe(false);
    });

    it('rejects empty string when required', () => {
      const result = validateCategoryId('', { required: true });
      expect(result.isValid).toBe(false);
    });

    it('rejects ID not in valid list', () => {
      const result = validateCategoryId('cat-3', { validIds: ['cat-1', 'cat-2'] });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_CATEGORY');
    });
  });
});

describe('validateTransactionForm', () => {
  it('validates all fields', () => {
    const result = validateTransactionForm({
      date: new Date(),
      amount: 100,
      description: 'Test',
      categoryId: 'cat-1',
      referenceMonth: '2024-01',
    });

    expect(result.date!.isValid).toBe(true);
    expect(result.amount!.isValid).toBe(true);
    expect(result.description!.isValid).toBe(true);
    expect(result.categoryId!.isValid).toBe(true);
    expect(result.referenceMonth!.isValid).toBe(true);
  });

  it('returns errors for invalid fields', () => {
    const result = validateTransactionForm({
      date: null,
      amount: 0,
      description: '',
      categoryId: null,
      referenceMonth: 'invalid',
    });

    expect(result.date!.isValid).toBe(false);
    expect(result.amount!.isValid).toBe(false); // Zero not allowed
    expect(result.description!.isValid).toBe(false);
    expect(result.referenceMonth!.isValid).toBe(false);
  });
});

describe('isFormValid', () => {
  it('returns true when all validations pass', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: true },
      field2: { isValid: true },
    };
    expect(isFormValid(results)).toBe(true);
  });

  it('returns false when any validation fails', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: true },
      field2: { isValid: false, errorMessage: 'Error' },
    };
    expect(isFormValid(results)).toBe(false);
  });
});

describe('getValidationErrors', () => {
  it('returns all error messages', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: false, errorMessage: 'Error 1' },
      field2: { isValid: true },
      field3: { isValid: false, errorMessage: 'Error 2' },
    };
    const errors = getValidationErrors(results);
    expect(errors).toEqual(['Error 1', 'Error 2']);
  });

  it('returns empty array when no errors', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: true },
      field2: { isValid: true },
    };
    const errors = getValidationErrors(results);
    expect(errors).toEqual([]);
  });
});

describe('getFirstError', () => {
  it('returns first error message', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: false, errorMessage: 'Error 1' },
      field2: { isValid: false, errorMessage: 'Error 2' },
    };
    const error = getFirstError(results);
    expect(error).toBe('Error 1');
  });

  it('returns undefined when no errors', () => {
    const results: Record<string, ValidationResult> = {
      field1: { isValid: true },
    };
    const error = getFirstError(results);
    expect(error).toBeUndefined();
  });
});
