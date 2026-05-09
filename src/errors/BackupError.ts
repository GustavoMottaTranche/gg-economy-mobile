/**
 * Backup-related error classes
 *
 * Provides specialized error types for backup and restore operations including:
 * - Backup errors with type classification (network, permission, storage, auth)
 * - Restore errors
 * - OAuth errors
 *
 * **Validates: Requirements 35, 29**
 */

import { AppError } from './AppError';
import type { BackupErrorType, ErrorContext, ErrorMessageKey } from './types';

/**
 * Error thrown when a backup operation fails
 *
 * @example
 * ```typescript
 * throw new BackupError(
 *   'Failed to upload backup',
 *   'network',
 *   { retryCount: 3 }
 * );
 * ```
 */
export class BackupError extends AppError {
  /** Type of backup error for classification */
  public readonly errorType: BackupErrorType;

  constructor(
    message: string,
    errorType: BackupErrorType = 'unknown',
    context?: ErrorContext,
    cause?: Error
  ) {
    // Network errors are recoverable, others may not be
    const recoverable = errorType === 'network';

    // Map error type to appropriate i18n key
    const messageKeyMap: Record<BackupErrorType, ErrorMessageKey> = {
      network: { key: 'errors.network' },
      permission: { key: 'backup.error', params: { detail: 'permission' } },
      storage: { key: 'backup.error', params: { detail: 'storage' } },
      auth: { key: 'errors.oauthFailed' },
      unknown: { key: 'errors.backupFailed' },
    };

    super(
      message,
      'BACKUP_ERROR',
      recoverable,
      messageKeyMap[errorType],
      { ...context, errorType },
      cause
    );

    this.name = 'BackupError';
    this.errorType = errorType;
    Object.setPrototypeOf(this, BackupError.prototype);
  }

  /**
   * Creates a BackupError from an unknown error, attempting to classify it
   */
  static from(error: unknown, defaultMessage: string = 'Backup operation failed'): BackupError {
    if (error instanceof BackupError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = BackupError.classifyError(errorMessage);

    return new BackupError(
      error instanceof Error ? error.message : defaultMessage,
      errorType,
      { originalError: errorMessage },
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Classifies an error message into a BackupErrorType
   */
  static classifyError(message: string): BackupErrorType {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('offline') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound')
    ) {
      return 'network';
    }

    if (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('403') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('access denied')
    ) {
      return 'permission';
    }

    if (
      lowerMessage.includes('storage') ||
      lowerMessage.includes('quota') ||
      lowerMessage.includes('disk full') ||
      lowerMessage.includes('no space')
    ) {
      return 'storage';
    }

    if (
      lowerMessage.includes('auth') ||
      lowerMessage.includes('401') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('token') ||
      lowerMessage.includes('expired')
    ) {
      return 'auth';
    }

    return 'unknown';
  }
}

/**
 * Error thrown when a restore operation fails
 *
 * @example
 * ```typescript
 * throw new RestoreError(
 *   'Failed to restore database',
 *   { backupId: 'backup-123' }
 * );
 * ```
 */
export class RestoreError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, 'RESTORE_ERROR', true, { key: 'errors.restoreFailed' }, context, cause);

    this.name = 'RestoreError';
    Object.setPrototypeOf(this, RestoreError.prototype);
  }

  /**
   * Creates a RestoreError from an unknown error
   */
  static from(error: unknown, defaultMessage: string = 'Restore operation failed'): RestoreError {
    if (error instanceof RestoreError) {
      return error;
    }

    return new RestoreError(
      error instanceof Error ? error.message : defaultMessage,
      { originalError: error instanceof Error ? error.message : String(error) },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Error thrown when OAuth authentication fails
 *
 * @example
 * ```typescript
 * throw new OAuthError('Token refresh failed');
 * ```
 */
export class OAuthError extends AppError {
  /** Whether the token has expired */
  public readonly tokenExpired: boolean;

  constructor(
    message: string,
    tokenExpired: boolean = false,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(
      message,
      'OAUTH_ERROR',
      true,
      { key: tokenExpired ? 'errors.tokenExpired' : 'errors.oauthFailed' },
      { ...context, tokenExpired },
      cause
    );

    this.name = 'OAuthError';
    this.tokenExpired = tokenExpired;
    Object.setPrototypeOf(this, OAuthError.prototype);
  }

  /**
   * Creates an OAuthError from an unknown error
   */
  static from(error: unknown, defaultMessage: string = 'Authentication failed'): OAuthError {
    if (error instanceof OAuthError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const tokenExpired =
      errorMessage.toLowerCase().includes('expired') ||
      errorMessage.toLowerCase().includes('invalid_grant');

    return new OAuthError(
      error instanceof Error ? error.message : defaultMessage,
      tokenExpired,
      { originalError: errorMessage },
      error instanceof Error ? error : undefined
    );
  }
}
