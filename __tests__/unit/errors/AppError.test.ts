/**
 * Unit tests for AppError class
 *
 * **Validates: Requirements 35, 29**
 */

import { AppError } from '../../../src/errors/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('APP_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.messageKey).toEqual({ key: 'errors.generic' });
      expect(error.context).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should create an error with custom values', () => {
      const cause = new Error('Original error');
      const error = new AppError(
        'Custom error',
        'DATABASE_ERROR',
        false,
        { key: 'errors.database', params: { detail: 'test' } },
        { operation: 'insert' },
        cause
      );

      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.messageKey).toEqual({ key: 'errors.database', params: { detail: 'test' } });
      expect(error.context).toEqual({ operation: 'insert' });
      expect(error.cause).toBe(cause);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should have a stack trace', () => {
      const error = new AppError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('from', () => {
    it('should return the same AppError if passed an AppError', () => {
      const original = new AppError('Original', 'DATABASE_ERROR');
      const result = AppError.from(original);

      expect(result).toBe(original);
    });

    it('should wrap a regular Error', () => {
      const original = new Error('Regular error');
      const result = AppError.from(original);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Regular error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.cause).toBe(original);
      expect(result.context?.originalError).toBe('Regular error');
    });

    it('should wrap a string error', () => {
      const result = AppError.from('String error');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should wrap an object with message property', () => {
      const result = AppError.from({ message: 'Object error' });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Object error');
    });

    it('should use default message for unknown error types', () => {
      const result = AppError.from(null, 'Default message');

      expect(result.message).toBe('Default message');
    });

    it('should use default message for undefined', () => {
      const result = AppError.from(undefined);

      expect(result.message).toBe('An unknown error occurred');
    });
  });

  describe('toJSON', () => {
    it('should return a JSON-serializable object', () => {
      const error = new AppError(
        'Test error',
        'PARSE_ERROR',
        true,
        { key: 'errors.parseError' },
        { lineNumber: 42 }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AppError',
        message: 'Test error',
        code: 'PARSE_ERROR',
        recoverable: true,
        messageKey: { key: 'errors.parseError' },
        context: { lineNumber: 42 },
        stack: expect.any(String),
      });
    });

    it('should be serializable with JSON.stringify', () => {
      const error = new AppError('Test');
      const serialized = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Test');
      expect(parsed.code).toBe('APP_ERROR');
    });
  });

  describe('toString', () => {
    it('should return a formatted string', () => {
      const error = new AppError('Test error', 'DATABASE_ERROR');
      expect(error.toString()).toBe('AppError [DATABASE_ERROR]: Test error');
    });
  });
});
