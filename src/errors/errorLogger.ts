/**
 * Error Logging Utility
 *
 * Provides error logging functionality with:
 * - Sensitive data filtering
 * - Console logging in development
 * - Extensible for future crash reporting integration
 *
 * **Validates: Requirements 35, 29, 34**
 */

import { AppError } from './AppError';
import type { ErrorCode, ErrorContext, ErrorLogEntry } from './types';

/**
 * Maximum number of error log entries to keep in memory
 */
const MAX_LOG_ENTRIES = 100;

/**
 * In-memory error log storage
 */
let errorLog: ErrorLogEntry[] = [];

/**
 * Keys that should be filtered from error context to prevent sensitive data leakage
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /token/i,
  /password/i,
  /secret/i,
  /key/i,
  /auth/i,
  /amount/i,
  /balance/i,
  /account/i,
  /card/i,
  /ssn/i,
  /pin/i,
  /credential/i,
];

/**
 * Checks if a key might contain sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitizes an object by removing sensitive data
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object with sensitive values replaced
 */
export function sanitizeContext(
  obj: Record<string, unknown> | undefined
): ErrorContext | undefined {
  if (!obj) {
    return undefined;
  }

  const sanitized: ErrorContext = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanitize arrays
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeContext(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Creates an error log entry from an error
 *
 * @param error - Error to create entry from
 * @returns Error log entry
 */
function createLogEntry(error: Error | AppError): ErrorLogEntry {
  const isAppError = error instanceof AppError;

  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    errorCode: isAppError ? error.code : 'UNKNOWN_ERROR',
    message: error.message,
    name: error.name,
    recoverable: isAppError ? error.recoverable : true,
  };

  // Add sanitized context for AppErrors
  if (isAppError && error.context) {
    entry.context = sanitizeContext(error.context as Record<string, unknown>);
  }

  // Only include stack trace in development
  if (__DEV__ && error.stack) {
    entry.stack = error.stack;
  }

  return entry;
}

/**
 * Logs an error to the error log
 *
 * @param error - Error to log
 */
export function logError(error: Error | AppError): void {
  const entry = createLogEntry(error);

  // Add to in-memory log
  errorLog.unshift(entry);

  // Trim log if it exceeds max size
  if (errorLog.length > MAX_LOG_ENTRIES) {
    errorLog = errorLog.slice(0, MAX_LOG_ENTRIES);
  }

  // Log to console in development
  if (__DEV__) {
    console.error(`[${entry.errorCode}] ${entry.name}: ${entry.message}`);
    if (entry.context) {
      console.error('Context:', entry.context);
    }
    if (entry.stack) {
      console.error('Stack:', entry.stack);
    }
  }

  // Future: Send to crash reporting service
  // crashReporter.recordError(entry);
}

/**
 * Logs an error from an unknown value
 *
 * @param error - Unknown error value
 * @param defaultMessage - Default message if error has no message
 */
export function logUnknownError(
  error: unknown,
  defaultMessage: string = 'An unknown error occurred'
): void {
  const appError = AppError.from(error, defaultMessage);
  logError(appError);
}

/**
 * Gets all error log entries
 *
 * @returns Copy of the error log
 */
export function getErrorLog(): ErrorLogEntry[] {
  return [...errorLog];
}

/**
 * Gets recent error log entries
 *
 * @param count - Number of entries to return
 * @returns Recent error log entries
 */
export function getRecentErrors(count: number = 10): ErrorLogEntry[] {
  return errorLog.slice(0, count);
}

/**
 * Gets error log entries filtered by error code
 *
 * @param code - Error code to filter by
 * @returns Filtered error log entries
 */
export function getErrorsByCode(code: ErrorCode): ErrorLogEntry[] {
  return errorLog.filter((entry) => entry.errorCode === code);
}

/**
 * Clears all error log entries
 */
export function clearErrorLog(): void {
  errorLog = [];
}

/**
 * Gets the count of errors in the log
 *
 * @returns Number of error log entries
 */
export function getErrorCount(): number {
  return errorLog.length;
}

/**
 * Checks if there are any errors in the log
 *
 * @returns True if there are errors
 */
export function hasErrors(): boolean {
  return errorLog.length > 0;
}

/**
 * Gets the most recent error
 *
 * @returns Most recent error log entry or undefined
 */
export function getLastError(): ErrorLogEntry | undefined {
  return errorLog[0];
}

/**
 * Error logger configuration
 */
export interface ErrorLoggerConfig {
  /** Maximum number of entries to keep */
  maxEntries?: number;
  /** Whether to log to console in development */
  consoleLogging?: boolean;
  /** Custom error handler for crash reporting integration */
  onError?: (entry: ErrorLogEntry) => void;
}

/**
 * Current logger configuration
 */
let loggerConfig: ErrorLoggerConfig = {
  maxEntries: MAX_LOG_ENTRIES,
  consoleLogging: true,
};

/**
 * Configures the error logger
 *
 * @param config - Logger configuration
 */
export function configureErrorLogger(config: Partial<ErrorLoggerConfig>): void {
  loggerConfig = { ...loggerConfig, ...config };
}

/**
 * Gets the current logger configuration
 *
 * @returns Current logger configuration
 */
export function getLoggerConfig(): ErrorLoggerConfig {
  return { ...loggerConfig };
}

/**
 * Wraps an async function with error logging
 *
 * @param fn - Async function to wrap
 * @param errorMessage - Default error message
 * @returns Wrapped function that logs errors
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logUnknownError(error, errorMessage);
      throw error;
    }
  }) as T;
}

/**
 * Decorator-style error logging for class methods
 *
 * @param errorMessage - Default error message
 * @returns Method decorator
 */
export function LogErrors(errorMessage?: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;

    if (originalMethod) {
      descriptor.value = withErrorLogging(originalMethod, errorMessage);
    }

    return descriptor;
  };
}
