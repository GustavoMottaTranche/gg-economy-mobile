/**
 * ImportOrchestrator - Coordinates the import workflow
 *
 * This service orchestrates the file import process with stage-based progress
 * reporting and cancellation support. It separates business logic from React
 * state management, making it testable without React dependencies.
 *
 * Stages:
 * 1. Reading (10%) - Reads file content from URI
 * 2. Parsing (30%) - Parses transactions from content
 * 3. Deduplicating (60%) - Checks for duplicate transactions
 * 4. Saving (80%) - Saves batch and transactions to database
 * 5. Complete (100%) - Import finished successfully
 *
 * @module ImportOrchestrator
 */

import * as FileSystem from 'expo-file-system';
import type { ITransactionRepository } from '../../repositories/interfaces/ITransactionRepository';
import type { IImportBatchRepository } from '../../repositories/interfaces/IImportBatchRepository';
import type { FileType, ImportBatch, CreateTransactionDTO, RawTransaction } from '../../types';
import { CsvParser, csvParser } from './CsvParser';
import { OfxParser, ofxParser } from './OfxParser';
import { ExcelParser, excelParser } from './ExcelParser';
import { DedupeEngine, dedupeEngine, DuplicateResult } from './DedupeEngine';
import type { ExcelParseOptions } from './types';
import { SUPPORTED_EXTENSIONS } from '../../constants/import';

/**
 * Import stage identifiers
 */
export type ImportStage =
  | 'idle'
  | 'reading'
  | 'parsing'
  | 'deduplicating'
  | 'saving'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Progress information emitted during import
 */
export interface ImportProgress {
  /** Current stage of the import process */
  stage: ImportStage;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Human-readable status message */
  message: string;
  /** Number of transactions processed so far */
  transactionsProcessed: number;
  /** Total number of transactions to process */
  totalTransactions: number;
}

/**
 * Callback type for progress updates
 */
export type ProgressCallback = (progress: ImportProgress) => void;

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
    | 'DATABASE_ERROR'
    | 'CANCELLED';
  /** Error message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
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
 * ImportOrchestrator coordinates the file import workflow
 *
 * This class separates import business logic from React state management,
 * enabling testing without React dependencies and cleaner separation of concerns.
 */
export class ImportOrchestrator {
  private transactionRepo: ITransactionRepository;
  private batchRepo: IImportBatchRepository;
  private csvParser: CsvParser;
  private ofxParser: OfxParser;
  private excelParser: ExcelParser;
  private dedupeEngine: DedupeEngine;
  private progressCallback?: ProgressCallback;
  private cancelled = false;

  /**
   * Creates a new ImportOrchestrator instance
   *
   * @param transactionRepo - Repository for transaction operations
   * @param batchRepo - Repository for import batch operations
   * @param csvParserInstance - CSV parser instance (optional, defaults to singleton)
   * @param ofxParserInstance - OFX parser instance (optional, defaults to singleton)
   * @param excelParserInstance - Excel parser instance (optional, defaults to singleton)
   * @param dedupeEngineInstance - Dedupe engine instance (optional, defaults to singleton)
   */
  constructor(
    transactionRepo: ITransactionRepository,
    batchRepo: IImportBatchRepository,
    csvParserInstance: CsvParser = csvParser,
    ofxParserInstance: OfxParser = ofxParser,
    excelParserInstance: ExcelParser = excelParser,
    dedupeEngineInstance: DedupeEngine = dedupeEngine
  ) {
    this.transactionRepo = transactionRepo;
    this.batchRepo = batchRepo;
    this.csvParser = csvParserInstance;
    this.ofxParser = ofxParserInstance;
    this.excelParser = excelParserInstance;
    this.dedupeEngine = dedupeEngineInstance;
  }

  /**
   * Registers a callback to receive progress updates
   *
   * @param callback - Function to call with progress updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Cancels the current import operation
   *
   * The import will stop at the next stage boundary and return a cancelled result.
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Resets the cancelled flag (called at start of new import)
   */
  private resetCancellation(): void {
    this.cancelled = false;
  }

  /**
   * Checks if the import has been cancelled
   */
  private isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Emits a progress update to the registered callback
   *
   * @param stage - Current import stage
   * @param percentage - Progress percentage (0-100)
   * @param message - Human-readable status message
   * @param transactionsProcessed - Number of transactions processed
   * @param totalTransactions - Total number of transactions
   */
  private emitProgress(
    stage: ImportStage,
    percentage: number,
    message: string,
    transactionsProcessed = 0,
    totalTransactions = 0
  ): void {
    this.progressCallback?.({
      stage,
      percentage,
      message,
      transactionsProcessed,
      totalTransactions,
    });
  }

  /**
   * Creates a cancelled result
   */
  private cancelledResult(): ImportResult {
    return {
      success: false,
      transactionsImported: 0,
      duplicatesFound: 0,
      duplicates: [],
      parseErrors: [],
      warnings: [],
      error: {
        code: 'CANCELLED',
        message: 'Import cancelled by user',
      },
    };
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
   * Checks if a file type is a binary format (Excel)
   *
   * @param fileType - File type
   * @returns True if the file type is binary
   */
  isExcelFileType(fileType: FileType): boolean {
    return fileType === 'xlsx' || fileType === 'xls';
  }

  /**
   * Reads file content from URI
   *
   * @param uri - File URI
   * @returns File content as string
   */
  private async readFileContent(uri: string): Promise<string> {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: 'utf8',
    });
    return content;
  }

  /**
   * Reads file content from URI as base64 (for binary files like Excel)
   *
   * @param uri - File URI
   * @returns File content as base64 string
   */
  private async readFileContentAsBase64(uri: string): Promise<string> {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return content;
  }

  /**
   * Parses file content based on file type
   *
   * @param content - File content (string for CSV/OFX, base64 for Excel)
   * @param fileType - File type
   * @param options - Parse options
   * @returns Parse result with transactions
   */
  private parseContent(
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
  private calculateReferenceMonth(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Imports a file from URI with stage-based progress reporting
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
    this.resetCancellation();

    try {
      // Stage 1: Reading (10%)
      this.emitProgress('reading', 10, 'Reading file...');

      if (this.isCancelled()) {
        this.emitProgress('cancelled', 0, 'Import cancelled');
        return this.cancelledResult();
      }

      // Detect file type first (needed to determine how to read the file)
      const detectedType = fileType || this.detectFileTypeFromName(fileName);

      // Read file content
      let content: string;
      try {
        if (detectedType && this.isExcelFileType(detectedType)) {
          content = await this.readFileContentAsBase64(uri);
        } else {
          content = await this.readFileContent(uri);
        }
      } catch (error) {
        this.emitProgress(
          'error',
          0,
          error instanceof Error ? error.message : 'Failed to read file'
        );
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
        this.emitProgress('error', 0, 'The file is empty');
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

      // Finalize file type detection
      const finalType = detectedType || this.detectFileTypeFromContent(content);

      if (!finalType) {
        this.emitProgress('error', 0, 'Unsupported file type');
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

      // Stage 2: Parsing (30%)
      this.emitProgress('parsing', 30, 'Parsing transactions...');

      if (this.isCancelled()) {
        this.emitProgress('cancelled', 0, 'Import cancelled');
        return this.cancelledResult();
      }

      const parseResult = this.parseContent(content, finalType, options);

      // Check for no transactions
      if (parseResult.transactions.length === 0) {
        this.emitProgress('error', 0, 'No valid transactions found');
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

      // Stage 3: Deduplicating (60%)
      this.emitProgress(
        'deduplicating',
        60,
        'Checking for duplicates...',
        0,
        parseResult.transactions.length
      );

      if (this.isCancelled()) {
        this.emitProgress('cancelled', 0, 'Import cancelled');
        return this.cancelledResult();
      }

      let uniqueTransactions: RawTransaction[];
      let duplicates: DuplicateResult[] = [];

      if (options.skipDedupe) {
        uniqueTransactions = parseResult.transactions;
      } else {
        // Get existing transactions for dedupe comparison
        const existingTransactions = await this.transactionRepo.getAll();
        const dedupeResult = this.dedupeEngine.findDuplicates(
          parseResult.transactions,
          existingTransactions,
          {
            confidenceThreshold: options.dedupeConfidenceThreshold ?? 0.5,
          }
        );
        uniqueTransactions = dedupeResult.uniqueTransactions;
        duplicates = dedupeResult.duplicates;
      }

      // If all transactions are duplicates, don't create a batch
      if (uniqueTransactions.length === 0) {
        this.emitProgress('error', 0, 'All transactions are duplicates');
        return {
          success: false,
          transactionsImported: 0,
          duplicatesFound: duplicates.length,
          duplicates,
          parseErrors: parseResult.errors,
          warnings: [...parseResult.warnings, 'All transactions appear to be duplicates'],
          error: {
            code: 'NO_TRANSACTIONS',
            message: 'All transactions in the file are duplicates of existing transactions',
          },
        };
      }

      // Stage 4: Saving (80%)
      this.emitProgress('saving', 80, 'Saving transactions...', 0, uniqueTransactions.length);

      if (this.isCancelled()) {
        this.emitProgress('cancelled', 0, 'Import cancelled');
        return this.cancelledResult();
      }

      // Create batch and transactions
      const batch = await this.saveBatchWithTransactions(fileName, finalType, uniqueTransactions);

      // Stage 5: Complete (100%)
      this.emitProgress(
        'complete',
        100,
        `Imported ${uniqueTransactions.length} transactions`,
        uniqueTransactions.length,
        uniqueTransactions.length
      );

      return {
        success: true,
        batch,
        transactionsImported: uniqueTransactions.length,
        duplicatesFound: duplicates.length,
        duplicates,
        parseErrors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      this.emitProgress('error', 0, errorMessage);
      return {
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        error: {
          code: 'DATABASE_ERROR',
          message: errorMessage,
          context: { originalError: String(error) },
        },
      };
    }
  }

  /**
   * Creates an import batch with transactions
   *
   * @param fileName - Original file name
   * @param fileType - File type
   * @param transactions - Transactions to create
   * @returns Created batch
   */
  private async saveBatchWithTransactions(
    fileName: string,
    fileType: FileType,
    transactions: RawTransaction[]
  ): Promise<ImportBatch> {
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

    return { ...batch, status: 'reviewing' };
  }
}
