/**
 * Unit tests for BackupError classes
 *
 * **Validates: Requirements 35, 29**
 */

import { BackupError, RestoreError, OAuthError } from '../../../src/errors/BackupError';
import { AppError } from '../../../src/errors/AppError';

describe('BackupError', () => {
  describe('constructor', () => {
    it('should create a backup error with default type', () => {
      const error = new BackupError('Backup failed');

      expect(error.message).toBe('Backup failed');
      expect(error.name).toBe('BackupError');
      expect(error.code).toBe('BACKUP_ERROR');
      expect(error.errorType).toBe('unknown');
      expect(error.recoverable).toBe(false);
    });

    it('should create a network backup error (recoverable)', () => {
      const error = new BackupError('Network timeout', 'network');

      expect(error.errorType).toBe('network');
      expect(error.recoverable).toBe(true);
      expect(error.messageKey).toEqual({ key: 'errors.network' });
    });

    it('should create a permission backup error', () => {
      const error = new BackupError('Access denied', 'permission');

      expect(error.errorType).toBe('permission');
      expect(error.recoverable).toBe(false);
    });

    it('should create a storage backup error', () => {
      const error = new BackupError('Quota exceeded', 'storage');

      expect(error.errorType).toBe('storage');
      expect(error.recoverable).toBe(false);
    });

    it('should create an auth backup error', () => {
      const error = new BackupError('Token expired', 'auth');

      expect(error.errorType).toBe('auth');
      expect(error.messageKey).toEqual({ key: 'errors.oauthFailed' });
    });

    it('should include error type in context', () => {
      const error = new BackupError('Error', 'network', { retryCount: 3 });

      expect(error.context).toEqual({
        retryCount: 3,
        errorType: 'network',
      });
    });

    it('should be an instance of AppError', () => {
      const error = new BackupError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BackupError);
    });
  });

  describe('from', () => {
    it('should return the same BackupError if passed a BackupError', () => {
      const original = new BackupError('Original', 'network');
      const result = BackupError.from(original);

      expect(result).toBe(original);
    });

    it('should classify network errors', () => {
      const result = BackupError.from(new Error('Network timeout'));
      expect(result.errorType).toBe('network');
    });

    it('should classify permission errors', () => {
      const result = BackupError.from(new Error('403 Forbidden'));
      expect(result.errorType).toBe('permission');
    });

    it('should classify storage errors', () => {
      const result = BackupError.from(new Error('Storage quota exceeded'));
      expect(result.errorType).toBe('storage');
    });

    it('should classify auth errors', () => {
      const result = BackupError.from(new Error('Token expired'));
      expect(result.errorType).toBe('auth');
    });

    it('should default to unknown for unclassified errors', () => {
      const result = BackupError.from(new Error('Something went wrong'));
      expect(result.errorType).toBe('unknown');
    });
  });

  describe('classifyError', () => {
    it('should classify network-related messages', () => {
      expect(BackupError.classifyError('Network error')).toBe('network');
      expect(BackupError.classifyError('Connection timeout')).toBe('network');
      expect(BackupError.classifyError('Device is offline')).toBe('network');
      expect(BackupError.classifyError('ECONNREFUSED')).toBe('network');
      expect(BackupError.classifyError('ENOTFOUND')).toBe('network');
    });

    it('should classify permission-related messages', () => {
      expect(BackupError.classifyError('Permission denied')).toBe('permission');
      expect(BackupError.classifyError('403 error')).toBe('permission');
      expect(BackupError.classifyError('Forbidden')).toBe('permission');
      expect(BackupError.classifyError('Access denied')).toBe('permission');
    });

    it('should classify storage-related messages', () => {
      expect(BackupError.classifyError('Storage full')).toBe('storage');
      expect(BackupError.classifyError('Quota exceeded')).toBe('storage');
      expect(BackupError.classifyError('Disk full')).toBe('storage');
      expect(BackupError.classifyError('No space left')).toBe('storage');
    });

    it('should classify auth-related messages', () => {
      expect(BackupError.classifyError('Auth failed')).toBe('auth');
      expect(BackupError.classifyError('401 Unauthorized')).toBe('auth');
      expect(BackupError.classifyError('Token invalid')).toBe('auth');
      expect(BackupError.classifyError('Session expired')).toBe('auth');
    });

    it('should return unknown for unclassified messages', () => {
      expect(BackupError.classifyError('Something happened')).toBe('unknown');
      expect(BackupError.classifyError('')).toBe('unknown');
    });
  });
});

describe('RestoreError', () => {
  describe('constructor', () => {
    it('should create a restore error', () => {
      const error = new RestoreError('Restore failed');

      expect(error.message).toBe('Restore failed');
      expect(error.name).toBe('RestoreError');
      expect(error.code).toBe('RESTORE_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.messageKey).toEqual({ key: 'errors.restoreFailed' });
    });

    it('should include context', () => {
      const error = new RestoreError('Restore failed', { backupId: 'backup-123' });

      expect(error.context).toEqual({ backupId: 'backup-123' });
    });

    it('should be an instance of AppError', () => {
      const error = new RestoreError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RestoreError);
    });
  });

  describe('from', () => {
    it('should return the same RestoreError if passed a RestoreError', () => {
      const original = new RestoreError('Original');
      const result = RestoreError.from(original);

      expect(result).toBe(original);
    });

    it('should wrap a regular Error', () => {
      const original = new Error('Database restore failed');
      const result = RestoreError.from(original);

      expect(result).toBeInstanceOf(RestoreError);
      expect(result.message).toBe('Database restore failed');
      expect(result.cause).toBe(original);
    });
  });
});

describe('OAuthError', () => {
  describe('constructor', () => {
    it('should create an OAuth error', () => {
      const error = new OAuthError('Authentication failed');

      expect(error.message).toBe('Authentication failed');
      expect(error.name).toBe('OAuthError');
      expect(error.code).toBe('OAUTH_ERROR');
      expect(error.tokenExpired).toBe(false);
      expect(error.recoverable).toBe(true);
      expect(error.messageKey).toEqual({ key: 'errors.oauthFailed' });
    });

    it('should create an OAuth error with token expired', () => {
      const error = new OAuthError('Token expired', true);

      expect(error.tokenExpired).toBe(true);
      expect(error.messageKey).toEqual({ key: 'errors.tokenExpired' });
    });

    it('should include token expired in context', () => {
      const error = new OAuthError('Error', true, { userId: 'user-123' });

      expect(error.context).toEqual({
        userId: 'user-123',
        tokenExpired: true,
      });
    });

    it('should be an instance of AppError', () => {
      const error = new OAuthError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(OAuthError);
    });
  });

  describe('from', () => {
    it('should return the same OAuthError if passed an OAuthError', () => {
      const original = new OAuthError('Original', true);
      const result = OAuthError.from(original);

      expect(result).toBe(original);
    });

    it('should detect token expired from error message', () => {
      const result = OAuthError.from(new Error('Token has expired'));
      expect(result.tokenExpired).toBe(true);
    });

    it('should detect invalid_grant as token expired', () => {
      const result = OAuthError.from(new Error('invalid_grant'));
      expect(result.tokenExpired).toBe(true);
    });

    it('should not mark as expired for other errors', () => {
      const result = OAuthError.from(new Error('Network error'));
      expect(result.tokenExpired).toBe(false);
    });
  });
});
