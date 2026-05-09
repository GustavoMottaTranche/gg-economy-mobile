/**
 * Unit tests for ValidationError classes
 *
 * **Validates: Requirements 35, 29**
 */

import { ValidationError, MultiValidationError } from '../../../src/errors/ValidationError';
import { AppError } from '../../../src/errors/AppError';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Amount is required', 'amount');

      expect(error.message).toBe('Amount is required');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('amount');
      expect(error.recoverable).toBe(true);
    });

    it('should include field in context', () => {
      const error = new ValidationError(
        'Invalid',
        'date',
        { key: 'validation.invalidDate' },
        { value: 'bad-date' }
      );

      expect(error.context).toEqual({
        value: 'bad-date',
        field: 'date',
      });
    });

    it('should be an instance of AppError', () => {
      const error = new ValidationError('Test', 'field');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('static factory methods', () => {
    describe('required', () => {
      it('should create a required field error', () => {
        const error = ValidationError.required('amount');

        expect(error.message).toBe('amount is required');
        expect(error.field).toBe('amount');
        expect(error.messageKey).toEqual({ key: 'validation.required' });
      });
    });

    describe('invalidAmount', () => {
      it('should create an invalid amount error with default field', () => {
        const error = ValidationError.invalidAmount();

        expect(error.message).toBe('Invalid amount');
        expect(error.field).toBe('amount');
        expect(error.messageKey).toEqual({ key: 'validation.invalidAmount' });
      });

      it('should create an invalid amount error with custom field', () => {
        const error = ValidationError.invalidAmount('price');

        expect(error.field).toBe('price');
      });
    });

    describe('invalidDate', () => {
      it('should create an invalid date error with default field', () => {
        const error = ValidationError.invalidDate();

        expect(error.message).toBe('Invalid date');
        expect(error.field).toBe('date');
        expect(error.messageKey).toEqual({ key: 'validation.invalidDate' });
      });

      it('should create an invalid date error with custom field', () => {
        const error = ValidationError.invalidDate('startDate');

        expect(error.field).toBe('startDate');
      });
    });

    describe('minLength', () => {
      it('should create a min length error', () => {
        const error = ValidationError.minLength('description', 10);

        expect(error.message).toBe('description must be at least 10 characters');
        expect(error.field).toBe('description');
        expect(error.messageKey).toEqual({ key: 'validation.minLength', params: { min: 10 } });
      });
    });

    describe('maxLength', () => {
      it('should create a max length error', () => {
        const error = ValidationError.maxLength('name', 50);

        expect(error.message).toBe('name must be at most 50 characters');
        expect(error.field).toBe('name');
        expect(error.messageKey).toEqual({ key: 'validation.maxLength', params: { max: 50 } });
      });
    });

    describe('positiveNumber', () => {
      it('should create a positive number error with default field', () => {
        const error = ValidationError.positiveNumber();

        expect(error.message).toBe('Value must be positive');
        expect(error.field).toBe('amount');
        expect(error.messageKey).toEqual({ key: 'validation.positiveNumber' });
      });

      it('should create a positive number error with custom field', () => {
        const error = ValidationError.positiveNumber('quantity');

        expect(error.field).toBe('quantity');
      });
    });

    describe('futureDate', () => {
      it('should create a future date error with default field', () => {
        const error = ValidationError.futureDate();

        expect(error.message).toBe('Date cannot be in the future');
        expect(error.field).toBe('date');
        expect(error.messageKey).toEqual({ key: 'validation.futureDate' });
      });

      it('should create a future date error with custom field', () => {
        const error = ValidationError.futureDate('transactionDate');

        expect(error.field).toBe('transactionDate');
      });
    });
  });
});

describe('MultiValidationError', () => {
  const fieldErrors = [
    { field: 'amount', message: 'Required', messageKey: { key: 'validation.required' } },
    { field: 'date', message: 'Invalid', messageKey: { key: 'validation.invalidDate' } },
    {
      field: 'description',
      message: 'Too short',
      messageKey: { key: 'validation.minLength', params: { min: 5 } },
    },
  ];

  describe('constructor', () => {
    it('should create a multi-validation error', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.message).toBe('Validation failed for fields: amount, date, description');
      expect(error.name).toBe('MultiValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors).toEqual(fieldErrors);
      expect(error.recoverable).toBe(true);
    });

    it('should include field names in context', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.context).toEqual({
        fields: ['amount', 'date', 'description'],
      });
    });

    it('should be an instance of AppError', () => {
      const error = new MultiValidationError(fieldErrors);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(MultiValidationError);
    });
  });

  describe('getFieldError', () => {
    it('should return the error for a specific field', () => {
      const error = new MultiValidationError(fieldErrors);

      const dateError = error.getFieldError('date');
      expect(dateError).toEqual({
        field: 'date',
        message: 'Invalid',
        messageKey: { key: 'validation.invalidDate' },
      });
    });

    it('should return undefined for non-existent field', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.getFieldError('category')).toBeUndefined();
    });
  });

  describe('hasFieldError', () => {
    it('should return true for fields with errors', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.hasFieldError('amount')).toBe(true);
      expect(error.hasFieldError('date')).toBe(true);
    });

    it('should return false for fields without errors', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.hasFieldError('category')).toBe(false);
    });
  });

  describe('getErrorFields', () => {
    it('should return all field names with errors', () => {
      const error = new MultiValidationError(fieldErrors);

      expect(error.getErrorFields()).toEqual(['amount', 'date', 'description']);
    });
  });

  describe('fromValidationErrors', () => {
    it('should create from array of ValidationErrors', () => {
      const validationErrors = [
        ValidationError.required('amount'),
        ValidationError.invalidDate('date'),
      ];

      const error = MultiValidationError.fromValidationErrors(validationErrors);

      expect(error.fieldErrors).toHaveLength(2);
      expect(error.fieldErrors[0].field).toBe('amount');
      expect(error.fieldErrors[1].field).toBe('date');
    });
  });
});
