/**
 * Parse-related error classes
 *
 * Provides specialized error types for file parsing operations including:
 * - General parse errors with line number reporting
 * - Unsupported file type errors
 *
 * **Validates: Requirements 35, 29**
 */

import { AppError } from './AppError';
import type { ErrorContext, ErrorMessageKey } from './types';

/**
 * Error thrown when file parsing fails
 *
 * @example
 * ```typescript
 * throw new ParseError(
 *   'Invalid date format',
 *   42,
 *   'csv',
 *   { lineContent: '2024-13-45,100.00,Test' }
 * );
 * ```
 */
export class ParseError extends AppError {
  /** Line number where the error occurred (1-indexed) */
  public readonly lineNumber?: number;

  /** Type of file being parsed */
  public readonly fileType?: string;

  constructor(
    message: string,
    lineNumber?: number,
    fileType?: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    const messageKey: ErrorMessageKey = lineNumber
      ? { key: 'import.parseError', params: { line: lineNumber } }
      : { key: 'errors.parseError' };

    super(message, 'PARSE_ERROR', true, messageKey, { ...context, lineNumber, fileType }, cause);

    this.name = 'ParseError';
    this.lineNumber = lineNumber;
    this.fileType = fileType;
    Object.setPrototypeOf(this, ParseError.prototype);
  }

  /**
   * Creates a ParseError from an unknown error
   */
  static fromError(
    error: unknown,
    lineNumber?: number,
    fileType?: string,
    defaultMessage: string = 'Failed to parse file'
  ): ParseError {
    if (error instanceof ParseError) {
      return error;
    }

    if (error instanceof Error) {
      return new ParseError(
        error.message || defaultMessage,
        lineNumber,
        fileType,
        { originalError: error.message },
        error
      );
    }

    return new ParseError(
      typeof error === 'string' ? error : defaultMessage,
      lineNumber,
      fileType,
      { originalError: String(error) }
    );
  }

  /**
   * Returns a formatted error message with line number
   */
  getFormattedMessage(): string {
    if (this.lineNumber) {
      return `Line ${this.lineNumber}: ${this.message}`;
    }
    return this.message;
  }
}

/**
 * Error thrown when an unsupported file type is encountered
 *
 * @example
 * ```typescript
 * throw new UnsupportedFileTypeError('pdf', ['csv', 'ofx', 'qif']);
 * ```
 */
export class UnsupportedFileTypeError extends AppError {
  /** The unsupported file type */
  public readonly fileType: string;

  /** List of supported file types */
  public readonly supportedTypes: string[];

  constructor(fileType: string, supportedTypes: string[] = ['csv', 'ofx', 'qif']) {
    super(
      `Unsupported file type: ${fileType}. Supported types: ${supportedTypes.join(', ')}`,
      'UNSUPPORTED_FILE_TYPE',
      true,
      { key: 'import.invalidFormat' },
      { fileType, supportedTypes }
    );

    this.name = 'UnsupportedFileTypeError';
    this.fileType = fileType;
    this.supportedTypes = supportedTypes;
    Object.setPrototypeOf(this, UnsupportedFileTypeError.prototype);
  }
}

/**
 * Error thrown when no transactions are found in a file
 *
 * @example
 * ```typescript
 * throw new EmptyFileError('csv');
 * ```
 */
export class EmptyFileError extends ParseError {
  constructor(fileType?: string) {
    super('No transactions found in file', undefined, fileType, { fileType });

    this.name = 'EmptyFileError';
    Object.setPrototypeOf(this, EmptyFileError.prototype);
  }
}
