/**
 * Unit tests for DatabaseError classes
 *
 * **Validates: Requirements 35, 29**
 */

import {
  DatabaseError,
  MigrationError,
  ConstraintViolationError,
} from '../../../src/errors/DatabaseError';
import { AppError } from '../../../src/errors/AppError';

describe('DatabaseError', () => {
  describe('constructor', () => {
    it('should create a database error with default values', () => {
      const error = new DatabaseError('Database operation failed');

      expect(error.message).toBe('Database operation failed');
      expect(error.name).toBe('DatabaseError');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.messageKey).toEqual({ key: 'errors.database' });
    });

    it('should create a database error with context', () => {
      const error = new DatabaseError('Insert failed', {
        table: 'transactions',
        operation: 'insert',
      });

      expect(error.context).toEqual({ table: 'transactions', operation: 'insert' });
    });

    it('should create a database error with cause', () => {
      const cause = new Error('SQLite error');
      const error = new DatabaseError('Database error', undefined, cause);

      expect(error.cause).toBe(cause);
    });

    it('should be an instance of AppError', () => {
      const error = new DatabaseError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
    });
  });

  describe('from', () => {
    it('should return the same DatabaseError if passed a DatabaseError', () => {
      const original = new DatabaseError('Original');
      const result = DatabaseError.from(original);

      expect(result).toBe(original);
    });

    it('should wrap a regular Error', () => {
      const original = new Error('SQLite constraint failed');
      const result = DatabaseError.from(original);

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('SQLite constraint failed');
      expect(result.cause).toBe(original);
    });

    it('should wrap a string error', () => {
      const result = DatabaseError.from('String error');

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('String error');
    });

    it('should use default message for unknown types', () => {
      const result = DatabaseError.from(null);

      expect(result.message).toBe('Database operation failed');
    });
  });
});

describe('MigrationError', () => {
  describe('constructor', () => {
    it('should create a migration error with version', () => {
      const error = new MigrationError('Migration failed', 3);

      expect(error.message).toBe('Migration failed');
      expect(error.name).toBe('MigrationError');
      expect(error.code).toBe('MIGRATION_ERROR');
      expect(error.migrationVersion).toBe(3);
      expect(error.recoverable).toBe(false);
    });

    it('should include migration version in context', () => {
      const error = new MigrationError('Migration failed', 5, { sql: 'ALTER TABLE...' });

      expect(error.context).toEqual({
        sql: 'ALTER TABLE...',
        migrationVersion: 5,
      });
    });

    it('should be an instance of AppError', () => {
      const error = new MigrationError('Test', 1);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(MigrationError);
    });
  });
});

describe('ConstraintViolationError', () => {
  describe('constructor', () => {
    it('should create a constraint violation error', () => {
      const error = new ConstraintViolationError(
        'Foreign key constraint failed',
        'category_id',
        'FOREIGN_KEY'
      );

      expect(error.message).toBe('Foreign key constraint failed');
      expect(error.name).toBe('ConstraintViolationError');
      expect(error.constraint).toBe('category_id');
      expect(error.constraintType).toBe('FOREIGN_KEY');
    });

    it('should include constraint info in context', () => {
      const error = new ConstraintViolationError('Unique constraint failed', 'email', 'UNIQUE', {
        value: 'test@example.com',
      });

      expect(error.context).toEqual({
        value: 'test@example.com',
        constraint: 'email',
        constraintType: 'UNIQUE',
      });
    });

    it('should be an instance of DatabaseError', () => {
      const error = new ConstraintViolationError('Test', 'id', 'NOT_NULL');
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(ConstraintViolationError);
    });
  });
});
