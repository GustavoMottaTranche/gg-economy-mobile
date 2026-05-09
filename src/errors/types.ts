/**
 * Error types and interfaces for the error handling infrastructure
 *
 * **Validates: Requirements 35, 29**
 */

/**
 * Error codes for categorizing errors
 */
export type ErrorCode =
  | 'APP_ERROR'
  | 'DATABASE_ERROR'
  | 'MIGRATION_ERROR'
  | 'PARSE_ERROR'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'BACKUP_ERROR'
  | 'RESTORE_ERROR'
  | 'OAUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Backup error types for classification
 */
export type BackupErrorType = 'network' | 'permission' | 'storage' | 'auth' | 'unknown';

/**
 * Context metadata for errors (without sensitive data)
 */
export interface ErrorContext {
  /** Original error message if wrapping another error */
  originalError?: string;
  /** File type being processed */
  fileType?: string;
  /** Line number where error occurred */
  lineNumber?: number;
  /** Field name for validation errors */
  field?: string;
  /** Migration version for database errors */
  migrationVersion?: number;
  /** Additional non-sensitive metadata */
  [key: string]: unknown;
}

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
  /** Timestamp of when the error occurred */
  timestamp: string;
  /** Error code for categorization */
  errorCode: ErrorCode;
  /** Error message */
  message: string;
  /** Error name/class */
  name: string;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Sanitized context (no sensitive data) */
  context?: ErrorContext;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * i18n message key for user-facing error messages
 */
export interface ErrorMessageKey {
  /** Translation key */
  key: string;
  /** Interpolation parameters */
  params?: Record<string, string | number>;
}

/**
 * Sensitive data keys that should be filtered from error context
 */
export const SENSITIVE_KEYS = [
  'accessToken',
  'refreshToken',
  'token',
  'password',
  'secret',
  'apiKey',
  'authorization',
  'amount', // Don't log financial amounts
  'balance',
  'accountNumber',
  'cardNumber',
  'ssn',
  'pin',
] as const;

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value has a message property
 */
export function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}
