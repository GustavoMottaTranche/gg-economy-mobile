/**
 * Unit tests for ParseError classes
 *
 * **Validates: Requirements 35, 29**
 */

import {
  ParseError,
  UnsupportedFileTypeError,
  EmptyFileError,
} from '../../../src/errors/ParseError';
import { AppError } from '../../../src/errors/AppError';

describe('ParseError', () => {
  describe('constructor', () => {
    it('should create a parse error with default values', () => {
      const error = new ParseError('Parse failed');

      expect(error.message).toBe('Parse failed');
      expect(error.name).toBe('ParseError');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.lineNumber).toBeUndefined();
      expect(error.fileType).toBeUndefined();
    });

    it('should create a parse error with line number', () => {
      const error = new ParseError('Invalid date', 42, 'csv');

      expect(error.lineNumber).toBe(42);
      expect(error.fileType).toBe('csv');
      expect(error.messageKey).toEqual({ key: 'fileImport.parseError', params: { line: 42 } });
    });

    it('should include line number and file type in context', () => {
      const error = new ParseError('Parse error', 10, 'ofx', { lineContent: 'bad data' });

      expect(error.context).toEqual({
        lineContent: 'bad data',
        lineNumber: 10,
        fileType: 'ofx',
      });
    });

    it('should be an instance of AppError', () => {
      const error = new ParseError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ParseError);
    });
  });

  describe('fromError', () => {
    it('should return the same ParseError if passed a ParseError', () => {
      const original = new ParseError('Original', 5, 'csv');
      const result = ParseError.fromError(original);

      expect(result).toBe(original);
    });

    it('should wrap a regular Error with line number', () => {
      const original = new Error('Invalid format');
      const result = ParseError.fromError(original, 15, 'csv');

      expect(result).toBeInstanceOf(ParseError);
      expect(result.message).toBe('Invalid format');
      expect(result.lineNumber).toBe(15);
      expect(result.fileType).toBe('csv');
      expect(result.cause).toBe(original);
    });

    it('should wrap a string error', () => {
      const result = ParseError.fromError('String error', 20);

      expect(result).toBeInstanceOf(ParseError);
      expect(result.message).toBe('String error');
      expect(result.lineNumber).toBe(20);
    });

    it('should use default message for unknown types', () => {
      const result = ParseError.fromError(null, 1, 'csv');

      expect(result.message).toBe('Failed to parse file');
    });
  });

  describe('getFormattedMessage', () => {
    it('should return message with line number when present', () => {
      const error = new ParseError('Invalid date format', 42);
      expect(error.getFormattedMessage()).toBe('Line 42: Invalid date format');
    });

    it('should return plain message when no line number', () => {
      const error = new ParseError('General parse error');
      expect(error.getFormattedMessage()).toBe('General parse error');
    });
  });
});

describe('UnsupportedFileTypeError', () => {
  describe('constructor', () => {
    it('should create an unsupported file type error', () => {
      const error = new UnsupportedFileTypeError('pdf');

      expect(error.message).toBe('Unsupported file type: pdf. Supported types: csv, ofx, qif');
      expect(error.name).toBe('UnsupportedFileTypeError');
      expect(error.code).toBe('UNSUPPORTED_FILE_TYPE');
      expect(error.fileType).toBe('pdf');
      expect(error.supportedTypes).toEqual(['csv', 'ofx', 'qif']);
      expect(error.recoverable).toBe(true);
    });

    it('should accept custom supported types', () => {
      const error = new UnsupportedFileTypeError('txt', ['csv', 'xlsx']);

      expect(error.message).toBe('Unsupported file type: txt. Supported types: csv, xlsx');
      expect(error.supportedTypes).toEqual(['csv', 'xlsx']);
    });

    it('should have correct message key', () => {
      const error = new UnsupportedFileTypeError('pdf');
      expect(error.messageKey).toEqual({ key: 'fileImport.invalidFormat' });
    });

    it('should be an instance of AppError', () => {
      const error = new UnsupportedFileTypeError('pdf');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnsupportedFileTypeError);
    });
  });
});

describe('EmptyFileError', () => {
  describe('constructor', () => {
    it('should create an empty file error', () => {
      const error = new EmptyFileError('csv');

      expect(error.message).toBe('No transactions found in file');
      expect(error.name).toBe('EmptyFileError');
      expect(error.fileType).toBe('csv');
    });

    it('should work without file type', () => {
      const error = new EmptyFileError();

      expect(error.message).toBe('No transactions found in file');
      expect(error.fileType).toBeUndefined();
    });

    it('should be an instance of ParseError', () => {
      const error = new EmptyFileError();
      expect(error).toBeInstanceOf(ParseError);
      expect(error).toBeInstanceOf(EmptyFileError);
    });
  });
});
