/**
 * Logging Service Module
 *
 * Provides centralized logging with structured output and environment-based filtering.
 *
 * @example
 * ```typescript
 * import { logger } from '@services/logging';
 *
 * logger.debug('Processing file', { fileName: 'data.csv' });
 * logger.info('Import completed', { count: 42 });
 * logger.warn('Duplicate found', { transactionId: '123' });
 * logger.error('Import failed', { error: 'Invalid format' });
 * ```
 */

export { Logger, logger } from './Logger';
export type { LogLevel, LogContext, LogEntry, LoggerConfig } from './Logger';
