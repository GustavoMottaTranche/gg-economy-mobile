/**
 * Import Service - Main orchestrator for file imports
 *
 * Features:
 * - Detects file type (CSV, OFX, or Excel) from extension or content
 * - Uses appropriate parser (CsvParser, OfxParser, or ExcelParser)
 * - Runs dedupe against existing transactions
 * - Creates ImportBatch record
 * - Inserts transactions with needsReview=true
 * - Returns import result with stats
 *
 * Integrations:
 * - expo-document-picker for file selection
 * - expo-file-system for reading file content
 * - Share Intent handler for Android
 *
 * @module ImportService
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { CsvParser, csvParser, CsvParseResult } from './CsvParser';
import { OfxParser, ofxParser, OfxParseResult } from './OfxParser';
import { ExcelParser, excelParser } from './ExcelParser';
import { DedupeEngine, dedupeEngine, DedupeResult, DuplicateResult } from './DedupeEngine';
import type { ExcelParseOptions } from './types';
import type { ITransactionRepository } from '../../repositories/interfaces/ITransactionRepository';
import type { IImportBatchRepository } from '../../repositories/interfaces/IImportBatchRepository';
import { transactionRepository } from '../../repositories/TransactionRepository';
import { importBatchRepository } from '../../repositories/ImportBatchRepository';
import type {
  FileType,
  ImportBatch,
  CreateTransactionDTO,
  RawTransaction,
  Transaction,
} from '../../types';

// Import constants from centralized module
import {
  MAX_MULTI_FILE_COUNT as _MAX_MULTI_FILE_COUNT,
  MAX_EXCEL_ROWS as _MAX_EXCEL_ROWS,
  SHEET_SELECTION_TIMEOUT_MS as _SHEET_SELECTION_TIMEOUT_MS,
  SUPPORTED_EXTENSIONS as _SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES as _SUPPORTED_MIME_TYPES,
  type SupportedExtension as _SupportedExtension,
} from '../../constants/import';
import { logger } from '../logging';
import { validateImportOptions } from '../../validation';

/**
 * Re-export constants for backward compatibility
 * @deprecated Import from '../../constants/import' instead
 */
export const SUPPORTED_EXTENSIONS = _SUPPORTED_EXTENSIONS;
export type SupportedExtension = _SupportedExtension;

/**
 * Re-export MIME types for backward compatibility
 * @deprecated Import from '../../constants/import' instead
 */
export const SUPPORTED_MIME_TYPES = _SUPPORTED_MIME_TYPES;

/**
 * Re-export max file count for backward compatibility
 * @deprecated Import from '../../constants/import' instead
 */
export const MAX_MULTI_FILE_COUNT = _MAX_MULTI_FILE_COUNT;

/**
 * Re-export max Excel rows for backward compatibility
 * @deprecated Import from '../../constants/import' instead
 */
export const MAX_EXCEL_ROWS = _MAX_EXCEL_ROWS;

/**
 * Re-export sheet selection timeout for backward compatibility
 * @deprecated Import from '../../constants/import' instead
 */
export const SHEET_SELECTION_TIMEOUT_MS = _SHEET_SELECTION_TIMEOUT_MS;

/**
 * Import error with context
 */
export interface ImportError {
  /** Error code */
  code:
    | 'FILE_READ_ERROR'
    | 'PARSE_ERROR'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'EMPTY_FILE'
    | 'NO_TRANSACTIONS'
    | 'DATABASE_ERROR';
  /** Error message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Result of file selection
 */
export interface FileSelectionResult {
  /** Whether a file was selected */
  success: boolean;
  /** File URI (if selected) */
  uri?: string;
  /** File name (if selected) */
  fileName?: string;
  /** File type (if detected) */
  fileType?: FileType;
  /** Error (if failed) */
  error?: ImportError;
  /** Whether the user cancelled */
  cancelled?: boolean;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** Created import batch (if successful) */
  batch?: ImportBatch;
  /** Number of transactions imported */
  transactionsImported: number;
  /** Number of duplicates found */
  duplicatesFound: number;
  /** Duplicate details */
  duplicates: DuplicateResult[];
  /** Parse errors encountered */
  parseErrors: Array<{ lineNumber?: number; message: string }>;
  /** Warnings */
  warnings: string[];
  /** Error (if failed) */
  error?: ImportError;
}

/**
 * Options for import operation
 */
export interface ImportOptions {
  /** Locale hint for parsing (affects decimal separator detection) */
  locale?: 'pt-BR' | 'en';
  /** Minimum confidence threshold for duplicate detection (0-1) */
  dedupeConfidenceThreshold?: number;
  /** Whether to skip duplicate detection */
  skipDedupe?: boolean;
  /** Excel-specific: Index of the sheet to parse (0-indexed) */
  excelSheetIndex?: number;
  /** Excel-specific: Name of the sheet to parse (takes precedence over sheetIndex) */
  excelSheetName?: string;
}

/**
 * Import Service class for orchestrating file imports
 */
export class ImportService {
  private csvParser: CsvParser;
  private ofxParser: OfxParser;
  private excelParser: ExcelParser;
  private dedupeEngine: DedupeEngine;
  private transactionRepo: ITransactionRepository;
  private batchRepo: IImportBatchRepository;

  constructor(
    csvParserInstance: CsvParser = csvParser,
    ofxParserInstance: OfxParser = ofxParser,
    excelParserInstance: ExcelParser = excelParser,
    dedupeEngineInstance: DedupeEngine = dedupeEngine,
    transactionRepoInstance: ITransactionRepository = transactionRepository,
    batchRepoInstance: IImportBatchRepository = importBatchRepository
  ) {
    this.csvParser = csvParserInstance;
    this.ofxParser = ofxParserInstance;
    this.excelParser = excelParserInstance;
    this.dedupeEngine = dedupeEngineInstance;
    this.transactionRepo = transactionRepoInstance;
    this.batchRepo = batchRepoInstance;
  }

  /**
   * Opens the document picker for file selection
   *
   * @returns File selection result
   */
  async selectFile(): Promise<FileSelectionResult> {
    logger.debug('Opening document picker for file selection', {
      supportedTypes: SUPPORTED_MIME_TYPES,
    });
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES as unknown as string[],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        logger.debug('File selection cancelled by user');
        return { success: false, cancelled: true };
      }

      const asset = result.assets[0];
      if (!asset) {
        return {
          success: false,
          error: {
            code: 'FILE_READ_ERROR',
            message: 'No file selected',
          },
        };
      }

      const fileName = asset.name;
      const fileType = this.detectFileTypeFromName(fileName);

      if (!fileType) {
        logger.debug('Unsupported file type selected', { fileName });
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
            context: { fileName },
          },
        };
      }

      logger.debug('File selected successfully', { fileName, fileType, uri: asset.uri });
      return {
        success: true,
        uri: asset.uri,
        fileName,
        fileType,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to select file',
          context: { originalError: String(error) },
        },
      };
    }
  }

  /**
   * Reads file content from URI
   *
   * @param uri - File URI
   * @returns File content as string
   */
  async readFileContent(uri: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return content;
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reads file content from URI as base64 (for binary files like Excel)
   *
   * @param uri - File URI
   * @returns File content as base64 string
   */
  async readFileContentAsBase64(uri: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return content;
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if a file type is a binary format (Excel)
   *
   * @param fileType - File type
   * @returns True if the file type is binary
   */
  isExcelFileType(fileType: FileType): boolean {
    return fileType === 'xlsx' || fileType === 'xls';
  }

  /**
   * Detects file type from file name extension
   *
   * @param fileName - File name
   * @returns Detected file type or undefined
   */
  detectFileTypeFromName(fileName: string): FileType | undefined {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.csv')) {
      return 'csv';
    }
    if (lowerName.endsWith('.ofx') || lowerName.endsWith('.qfx')) {
      return 'ofx';
    }
    if (lowerName.endsWith('.qif')) {
      return 'qif';
    }
    if (lowerName.endsWith('.xlsx')) {
      return 'xlsx';
    }
    if (lowerName.endsWith('.xls')) {
      return 'xls';
    }

    return undefined;
  }

  /**
   * Detects file type from content
   *
   * @param content - File content
   * @returns Detected file type or undefined
   */
  detectFileTypeFromContent(content: string): FileType | undefined {
    const trimmedContent = content.trim();

    // Check for OFX markers
    if (
      trimmedContent.includes('OFXHEADER:') ||
      trimmedContent.includes('<OFX>') ||
      trimmedContent.includes('<STMTTRN>')
    ) {
      return 'ofx';
    }

    // Check for QIF markers
    if (trimmedContent.startsWith('!Type:')) {
      return 'qif';
    }

    // Default to CSV if it looks like structured text with delimiters
    if (
      trimmedContent.includes(',') ||
      trimmedContent.includes(';') ||
      trimmedContent.includes('\t')
    ) {
      return 'csv';
    }

    return undefined;
  }

  /**
   * Parses file content based on file type
   *
   * @param content - File content (string for CSV/OFX, base64 for Excel)
   * @param fileType - File type
   * @param options - Parse options
   * @returns Parse result with transactions
   */
  parseContent(
    content: string,
    fileType: FileType,
    options: ImportOptions = {}
  ): {
    transactions: RawTransaction[];
    errors: Array<{ lineNumber?: number; message: string }>;
    warnings: string[];
  } {
    if (fileType === 'csv') {
      const result = this.csvParser.parse(content, { locale: options.locale });
      return {
        transactions: result.transactions,
        errors: result.errors.map((e) => ({
          lineNumber: e.lineNumber,
          message: e.message,
        })),
        warnings: result.warnings,
      };
    }

    if (fileType === 'ofx') {
      const result = this.ofxParser.parse(content);
      return {
        transactions: result.transactions,
        errors: result.errors.map((e) => ({
          lineNumber: e.transactionIndex,
          message: e.message,
        })),
        warnings: result.warnings,
      };
    }

    if (fileType === 'xlsx' || fileType === 'xls') {
      // Excel files are passed as base64 strings
      const excelOptions: ExcelParseOptions = {
        locale: options.locale,
        sheetIndex: options.excelSheetIndex,
        sheetName: options.excelSheetName,
      };
      const result = this.excelParser.parse(content, excelOptions);
      return {
        transactions: result.transactions,
        errors: result.errors.map((e) => ({
          lineNumber: e.rowNumber,
          message: e.message,
        })),
        warnings: result.warnings,
      };
    }

    // QIF not yet implemented
    return {
      transactions: [],
      errors: [{ message: 'QIF format is not yet supported' }],
      warnings: [],
    };
  }

  /**
   * Calculates reference month from transaction date
   *
   * @param date - Transaction date
   * @returns Reference month in YYYY-MM format
   */
  calculateReferenceMonth(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Imports a file from URI
   *
   * @param uri - File URI
   * @param fileName - File name
   * @param fileType - File type (optional, will be detected if not provided)
   * @param options - Import options
   * @returns Import result
   */
  async importFile(
    uri: string,
    fileName: string,
    fileType?: FileType,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    logger.debug('Starting file import', { fileName, fileType, options });

    // Validate import options using centralized validation
    const validationResult = validateImportOptions({
      locale: options.locale,
      dedupeConfidenceThreshold: options.dedupeConfidenceThreshold,
    });

    if (!validationResult.valid) {
      logger.warn('Import options validation failed', { errors: validationResult.errors });
      return {
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        error: {
          code: 'PARSE_ERROR',
          message: `Invalid import options: ${validationResult.errors.join(', ')}`,
          context: { validationErrors: validationResult.errors },
        },
      };
    }

    try {
      // Detect file type first (needed to determine how to read the file)
      const detectedType = fileType || this.detectFileTypeFromName(fileName);
      logger.debug('File type detected', { detectedType, fileName });

      // Read file content (use base64 for Excel files, UTF-8 for text files)
      let content: string;
      try {
        if (detectedType && this.isExcelFileType(detectedType)) {
          // Excel files are binary, read as base64
          content = await this.readFileContentAsBase64(uri);
        } else {
          // Text files (CSV, OFX, QIF) read as UTF-8
          content = await this.readFileContent(uri);
        }
        logger.debug('File content read successfully', { contentLength: content.length });
      } catch (error) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'FILE_READ_ERROR',
            message: error instanceof Error ? error.message : 'Failed to read file',
          },
        };
      }

      // Check for empty file
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'EMPTY_FILE',
            message: 'The file is empty',
          },
        };
      }

      // Finalize file type detection (try content-based detection for text files if needed)
      const finalType = detectedType || this.detectFileTypeFromContent(content);

      if (!finalType) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `Could not detect file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
          },
        };
      }

      // Parse content
      const parseResult = this.parseContent(content, finalType, options);
      logger.debug('File parsed', {
        transactionCount: parseResult.transactions.length,
        errorCount: parseResult.errors.length,
        warningCount: parseResult.warnings.length,
      });

      // Check for no transactions
      if (parseResult.transactions.length === 0) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: parseResult.errors,
          warnings: parseResult.warnings,
          error: {
            code: 'NO_TRANSACTIONS',
            message: 'No valid transactions found in the file',
          },
        };
      }

      // Run deduplication
      let dedupeResult: DedupeResult;
      if (options.skipDedupe) {
        logger.debug('Skipping deduplication as requested');
        dedupeResult = {
          uniqueTransactions: parseResult.transactions,
          duplicates: [],
          totalProcessed: parseResult.transactions.length,
        };
      } else {
        // Get existing transactions for dedupe comparison
        const existingTransactions = await this.transactionRepo.getAll();
        logger.debug('Running deduplication', {
          newTransactions: parseResult.transactions.length,
          existingTransactions: existingTransactions.length,
        });
        dedupeResult = this.dedupeEngine.findDuplicates(
          parseResult.transactions,
          existingTransactions,
          {
            confidenceThreshold: options.dedupeConfidenceThreshold ?? 0.5,
          }
        );
        logger.debug('Deduplication complete', {
          uniqueCount: dedupeResult.uniqueTransactions.length,
          duplicateCount: dedupeResult.duplicates.length,
        });
      }

      // If all transactions are duplicates, don't create a batch
      if (dedupeResult.uniqueTransactions.length === 0) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: dedupeResult.duplicates.length,
          duplicates: dedupeResult.duplicates,
          parseErrors: parseResult.errors,
          warnings: [...parseResult.warnings, 'All transactions appear to be duplicates'],
          error: {
            code: 'NO_TRANSACTIONS',
            message: 'All transactions in the file are duplicates of existing transactions',
          },
        };
      }

      // Create batch and transactions in a single database transaction
      const result = await this.createBatchWithTransactions(
        fileName,
        finalType,
        dedupeResult.uniqueTransactions
      );

      logger.debug('Import completed successfully', {
        batchId: result.batch.id,
        transactionsImported: result.transactionsCreated,
        duplicatesFound: dedupeResult.duplicates.length,
      });

      return {
        success: true,
        batch: result.batch,
        transactionsImported: result.transactionsCreated,
        duplicatesFound: dedupeResult.duplicates.length,
        duplicates: dedupeResult.duplicates,
        parseErrors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    } catch (error) {
      logger.error('Import failed with database error', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Database operation failed',
          context: { originalError: String(error) },
        },
      };
    }
  }

  /**
   * Creates an import batch with transactions in a single database transaction
   *
   * @param fileName - Original file name
   * @param fileType - File type
   * @param transactions - Transactions to create
   * @returns Created batch and transaction count
   */
  async createBatchWithTransactions(
    fileName: string,
    fileType: FileType,
    transactions: RawTransaction[]
  ): Promise<{ batch: ImportBatch; transactionsCreated: number }> {
    // Create the batch first
    const batch = await this.batchRepo.create({
      fileName,
      fileType,
      transactionCount: transactions.length,
    });

    // Convert raw transactions to DTOs
    const transactionDTOs: CreateTransactionDTO[] = transactions.map((tx) => ({
      date: tx.date,
      amount: tx.amount,
      description: tx.description,
      batchId: batch.id,
      referenceMonth: this.calculateReferenceMonth(tx.date),
      needsReview: true,
      isExcludedFromTotals: false,
    }));

    // Create all transactions
    await this.transactionRepo.createMany(transactionDTOs);

    // Mark batch as reviewing
    await this.batchRepo.markAsReviewing(batch.id);

    return {
      batch: { ...batch, status: 'reviewing' },
      transactionsCreated: transactions.length,
    };
  }

  /**
   * Handles a file shared via Share Intent (Android)
   *
   * @param url - The shared file URL
   * @param options - Import options
   * @returns Import result
   */
  async handleSharedFile(url: string, options: ImportOptions = {}): Promise<ImportResult> {
    try {
      // Parse the URL to get file info
      const parsedUrl = Linking.parse(url);

      // Extract file name from URL path
      let fileName = 'shared_file';
      if (parsedUrl.path) {
        const pathParts = parsedUrl.path.split('/');
        fileName = pathParts[pathParts.length - 1] || fileName;
      }

      // Detect file type
      const fileType = this.detectFileTypeFromName(fileName);

      if (!fileType) {
        // Try to read content and detect from content
        try {
          const content = await this.readFileContent(url);
          const detectedType = this.detectFileTypeFromContent(content);

          if (!detectedType) {
            return {
              success: false,
              transactionsImported: 0,
              duplicatesFound: 0,
              duplicates: [],
              parseErrors: [],
              warnings: [],
              error: {
                code: 'UNSUPPORTED_FILE_TYPE',
                message: `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
              },
            };
          }

          return this.importFile(url, fileName, detectedType, options);
        } catch {
          return {
            success: false,
            transactionsImported: 0,
            duplicatesFound: 0,
            duplicates: [],
            parseErrors: [],
            warnings: [],
            error: {
              code: 'UNSUPPORTED_FILE_TYPE',
              message: `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
            },
          };
        }
      }

      return this.importFile(url, fileName, fileType, options);
    } catch (error) {
      return {
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        error: {
          code: 'FILE_READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process shared file',
          context: { url, originalError: String(error) },
        },
      };
    }
  }

  /**
   * Full import flow: select file and import
   *
   * @param options - Import options
   * @returns Import result
   */
  async selectAndImport(options: ImportOptions = {}): Promise<ImportResult> {
    const selection = await this.selectFile();

    if (!selection.success) {
      if (selection.cancelled) {
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'FILE_READ_ERROR',
            message: 'File selection cancelled',
          },
        };
      }

      return {
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        error: selection.error,
      };
    }

    return this.importFile(selection.uri!, selection.fileName!, selection.fileType, options);
  }
}

/**
 * Default ImportService instance
 */
export const importService = new ImportService();
