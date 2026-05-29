/**
 * Unit tests for error logging utility
 *
 * **Validates: Requirements 35, 29, 34**
 */

import {
  logError,
  logUnknownError,
  getErrorLog,
  getRecentErrors,
  getErrorsByCode,
  clearErrorLog,
  getErrorCount,
  hasErrors,
  getLastError,
  sanitizeContext,
  configureErrorLogger,
  getLoggerConfig,
  withErrorLogging,
} from '../../../src/errors/errorLogger';
import { AppError } from '../../../src/errors/AppError';
import { DatabaseError } from '../../../src/errors/DatabaseError';

describe('errorLogger', () => {
  beforeEach(() => {
    clearErrorLog();
  });

  describe('sanitizeContext', () => {
    it('should return undefined for undefined input', () => {
      expect(sanitizeContext(undefined)).toBeUndefined();
    });

    it('should redact sensitive keys', () => {
      const context = {
        accessToken: 'secret-token',
        refreshToken: 'refresh-secret',
        password: 'my-password',
        apiKey: 'api-key-123',
        operation: 'insert',
      };

      const sanitized = sanitizeContext(context);

      expect(sanitized?.accessToken).toBe('[REDACTED]');
      expect(sanitized?.refreshToken).toBe('[REDACTED]');
      expect(sanitized?.password).toBe('[REDACTED]');
      expect(sanitized?.apiKey).toBe('[REDACTED]');
      expect(sanitized?.operation).toBe('insert');
    });

    it('should redact financial data', () => {
      const context = {
        amount: 1000.5,
        balance: 5000,
        accountNumber: '1234567890',
        cardNumber: '4111111111111111',
        description: 'Test transaction',
      };

      const sanitized = sanitizeContext(context);

      expect(sanitized?.amount).toBe('[REDACTED]');
      expect(sanitized?.balance).toBe('[REDACTED]');
      expect(sanitized?.accountNumber).toBe('[REDACTED]');
      expect(sanitized?.cardNumber).toBe('[REDACTED]');
      expect(sanitized?.description).toBe('Test transaction');
    });

    it('should recursively sanitize nested objects', () => {
      const context = {
        user: {
          name: 'John',
          authToken: 'secret',
        },
        data: {
          amount: 100,
          description: 'Test',
        },
      };

      const sanitized = sanitizeContext(context);

      expect((sanitized?.user as Record<string, unknown>)?.name).toBe('John');
      expect((sanitized?.user as Record<string, unknown>)?.authToken).toBe('[REDACTED]');
      expect((sanitized?.data as Record<string, unknown>)?.amount).toBe('[REDACTED]');
      expect((sanitized?.data as Record<string, unknown>)?.description).toBe('Test');
    });

    it('should handle arrays', () => {
      const context = {
        items: [
          { name: 'Item 1', secretKey: 'secret1' },
          { name: 'Item 2', secretKey: 'secret2' },
        ],
      };

      const sanitized = sanitizeContext(context);
      const items = sanitized?.items as Array<Record<string, unknown>>;

      expect(items[0]!.name).toBe('Item 1');
      expect(items[0]!.secretKey).toBe('[REDACTED]');
      expect(items[1]!.name).toBe('Item 2');
      expect(items[1]!.secretKey).toBe('[REDACTED]');
    });
  });

  describe('logError', () => {
    it('should log an AppError', () => {
      const error = new AppError('Test error', 'DATABASE_ERROR');
      logError(error);

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.message).toBe('Test error');
      expect(log[0]!.errorCode).toBe('DATABASE_ERROR');
      expect(log[0]!.name).toBe('AppError');
      expect(log[0]!.recoverable).toBe(true);
    });

    it('should log a regular Error', () => {
      const error = new Error('Regular error');
      logError(error);

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.message).toBe('Regular error');
      expect(log[0]!.errorCode).toBe('UNKNOWN_ERROR');
    });

    it('should sanitize context in logged errors', () => {
      const error = new AppError(
        'Test',
        'APP_ERROR',
        true,
        { key: 'errors.generic' },
        { accessToken: 'secret', operation: 'test' }
      );
      logError(error);

      const log = getErrorLog();
      expect(log[0]!.context?.accessToken).toBe('[REDACTED]');
      expect(log[0]!.context?.operation).toBe('test');
    });

    it('should include timestamp', () => {
      const before = new Date().toISOString();
      logError(new AppError('Test'));
      const after = new Date().toISOString();

      const log = getErrorLog();
      expect(log[0]!.timestamp >= before).toBe(true);
      expect(log[0]!.timestamp <= after).toBe(true);
    });

    it('should limit log size to MAX_LOG_ENTRIES', () => {
      // Log more than 100 errors
      for (let i = 0; i < 110; i++) {
        logError(new AppError(`Error ${i}`));
      }

      const log = getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    it('should keep most recent errors when trimming', () => {
      for (let i = 0; i < 110; i++) {
        logError(new AppError(`Error ${i}`));
      }

      const log = getErrorLog();
      // Most recent error should be Error 109
      expect(log[0]!.message).toBe('Error 109');
    });
  });

  describe('logUnknownError', () => {
    it('should log an unknown error value', () => {
      logUnknownError('String error');

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.message).toBe('String error');
    });

    it('should use default message for null', () => {
      logUnknownError(null, 'Default message');

      const log = getErrorLog();
      expect(log[0]!.message).toBe('Default message');
    });
  });

  describe('getErrorLog', () => {
    it('should return a copy of the log', () => {
      logError(new AppError('Test'));

      const log1 = getErrorLog();
      const log2 = getErrorLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });

  describe('getRecentErrors', () => {
    it('should return the specified number of recent errors', () => {
      for (let i = 0; i < 20; i++) {
        logError(new AppError(`Error ${i}`));
      }

      const recent = getRecentErrors(5);
      expect(recent).toHaveLength(5);
      expect(recent[0]!.message).toBe('Error 19');
      expect(recent[4]!.message).toBe('Error 15');
    });

    it('should return all errors if count exceeds log size', () => {
      logError(new AppError('Error 1'));
      logError(new AppError('Error 2'));

      const recent = getRecentErrors(10);
      expect(recent).toHaveLength(2);
    });
  });

  describe('getErrorsByCode', () => {
    it('should filter errors by code', () => {
      logError(new AppError('App error', 'APP_ERROR'));
      logError(new DatabaseError('DB error 1'));
      logError(new AppError('Another app error', 'APP_ERROR'));
      logError(new DatabaseError('DB error 2'));

      const dbErrors = getErrorsByCode('DATABASE_ERROR');
      expect(dbErrors).toHaveLength(2);
      expect(dbErrors[0]!.message).toBe('DB error 2');
      expect(dbErrors[1]!.message).toBe('DB error 1');
    });

    it('should return empty array if no matching errors', () => {
      logError(new AppError('Test'));

      const errors = getErrorsByCode('PARSE_ERROR');
      expect(errors).toHaveLength(0);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear all errors', () => {
      logError(new AppError('Error 1'));
      logError(new AppError('Error 2'));

      clearErrorLog();

      expect(getErrorLog()).toHaveLength(0);
    });
  });

  describe('getErrorCount', () => {
    it('should return the number of errors', () => {
      expect(getErrorCount()).toBe(0);

      logError(new AppError('Error 1'));
      expect(getErrorCount()).toBe(1);

      logError(new AppError('Error 2'));
      expect(getErrorCount()).toBe(2);
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors', () => {
      expect(hasErrors()).toBe(false);
    });

    it('should return true when errors exist', () => {
      logError(new AppError('Test'));
      expect(hasErrors()).toBe(true);
    });
  });

  describe('getLastError', () => {
    it('should return undefined when no errors', () => {
      expect(getLastError()).toBeUndefined();
    });

    it('should return the most recent error', () => {
      logError(new AppError('Error 1'));
      logError(new AppError('Error 2'));

      const last = getLastError();
      expect(last?.message).toBe('Error 2');
    });
  });

  describe('configureErrorLogger', () => {
    beforeEach(() => {
      // Reset config to defaults
      configureErrorLogger({ maxEntries: 100, consoleLogging: true });
    });

    it('should update logger configuration', () => {
      configureErrorLogger({ maxEntries: 50, consoleLogging: false });

      const config = getLoggerConfig();
      expect(config.maxEntries).toBe(50);
      expect(config.consoleLogging).toBe(false);
    });

    it('should preserve existing config when partially updating', () => {
      configureErrorLogger({ maxEntries: 50 });

      const config = getLoggerConfig();
      expect(config.maxEntries).toBe(50);
      expect(config.consoleLogging).toBe(true); // Default value preserved
    });
  });

  describe('withErrorLogging', () => {
    it('should log errors from async functions', async () => {
      const failingFn = async () => {
        throw new Error('Async error');
      };

      const wrappedFn = withErrorLogging(failingFn, 'Operation failed');

      await expect(wrappedFn()).rejects.toThrow('Async error');

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.message).toBe('Async error');
    });

    it('should not log when function succeeds', async () => {
      const successFn = async () => 'success';

      const wrappedFn = withErrorLogging(successFn);
      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(getErrorLog()).toHaveLength(0);
    });

    it('should re-throw the original error', async () => {
      const originalError = new DatabaseError('DB failed');
      const failingFn = async () => {
        throw originalError;
      };

      const wrappedFn = withErrorLogging(failingFn);

      await expect(wrappedFn()).rejects.toBe(originalError);
    });
  });
});
