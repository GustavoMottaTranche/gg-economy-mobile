/**
 * Logger Service
 *
 * Centralized logging service with structured output and environment-based filtering.
 * Supports log levels: debug, info, warn, error.
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: __DEV__ ? 'debug' : 'warn',
      enableConsole: true,
      ...config,
    };
  }

  /**
   * Log a debug message. Only shown in development environment by default.
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an informational message.
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message.
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Get the current logger configuration.
   */
  getConfig(): Readonly<LoggerConfig> {
    return { ...this.config };
  }

  /**
   * Update the logger configuration.
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.config.enableConsole) {
      const consoleFn =
        level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleFn(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, context ?? '');
    }
  }
}

/**
 * Singleton logger instance with default configuration.
 * - In development (__DEV__ = true): logs all levels (debug, info, warn, error)
 * - In production (__DEV__ = false): logs only warn and error levels
 */
export const logger = new Logger();
