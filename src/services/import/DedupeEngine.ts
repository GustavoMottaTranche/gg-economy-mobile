/**
 * Dedupe Engine for detecting and handling duplicate transactions
 *
 * Features:
 * - FITID-based deduplication for OFX imports (highest confidence - 100%)
 * - Date + amount + description matching (high confidence)
 * - Date + amount matching (medium confidence)
 * - Confidence scoring for potential duplicates
 * - Idempotent operation: dedupe(dedupe(x)) === dedupe(x)
 *
 * Confidence Scoring:
 * - 100%: Exact FITID match
 * - 90-99%: Same date, amount, and very similar description
 * - 70-89%: Same date and amount, somewhat similar description
 * - 50-69%: Same date and amount only
 *
 * @module DedupeEngine
 */

import { RawTransaction, Transaction } from '../../types/transaction';

/**
 * Result of duplicate detection for a single transaction
 */
export interface DuplicateResult {
  /** The new transaction being checked */
  newTransaction: RawTransaction;
  /** The existing transaction that matches */
  existingTransaction: Transaction | RawTransaction;
  /** Confidence score (0-1, where 1 = 100% confident it's a duplicate) */
  confidence: number;
  /** Reason for the match */
  matchReason: 'fitid' | 'date_amount_description' | 'date_amount';
}

/**
 * Result of the dedupe operation
 */
export interface DedupeResult {
  /** Transactions that are unique (no duplicates found) */
  uniqueTransactions: RawTransaction[];
  /** Transactions identified as duplicates with their matches */
  duplicates: DuplicateResult[];
  /** Total transactions processed */
  totalProcessed: number;
}

/**
 * Represents transactions from a single file in a batch group
 */
export interface FileTransactions {
  /** Unique identifier for the file (e.g., filename or batch ID) */
  fileId: string;
  /** Transactions from this file */
  transactions: RawTransaction[];
}

/**
 * Result of cross-file deduplication
 */
export interface CrossFileDedupeResult {
  /** Transactions per file after cross-file deduplication */
  fileResults: Map<string, RawTransaction[]>;
  /** Cross-file duplicates found (duplicates between different files) */
  crossFileDuplicates: CrossFileDuplicateResult[];
  /** Total transactions processed across all files */
  totalProcessed: number;
  /** Total unique transactions after cross-file deduplication */
  totalUnique: number;
}

/**
 * Result of a cross-file duplicate detection
 */
export interface CrossFileDuplicateResult {
  /** The duplicate transaction */
  duplicateTransaction: RawTransaction;
  /** File ID where the duplicate was found */
  duplicateFileId: string;
  /** The original transaction that this duplicates */
  originalTransaction: RawTransaction;
  /** File ID where the original was found */
  originalFileId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the match */
  matchReason: 'fitid' | 'date_amount_description' | 'date_amount';
}

/**
 * Result of database verification
 */
export interface DatabaseVerificationResult {
  /** Transactions that are new (not in database) */
  newTransactions: RawTransaction[];
  /** Transactions that already exist in database */
  existingInDatabase: DuplicateResult[];
  /** Total transactions checked */
  totalChecked: number;
}

/**
 * Options for duplicate detection
 */
export interface DedupeOptions {
  /** Minimum confidence threshold to consider as duplicate (0-1, default: 0.5) */
  confidenceThreshold?: number;
  /** Whether to use FITID for matching (default: true) */
  useFitId?: boolean;
  /** Whether to use description similarity (default: true) */
  useDescriptionSimilarity?: boolean;
}

/**
 * Dedupe Engine class for detecting duplicate transactions
 */
export class DedupeEngine {
  /**
   * Default confidence threshold
   */
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

  /**
   * Finds duplicates among new transactions compared to existing transactions
   *
   * @param newTransactions - New transactions to check for duplicates
   * @param existingTransactions - Existing transactions to compare against
   * @param options - Deduplication options
   * @returns Dedupe result with unique transactions and duplicates
   */
  findDuplicates(
    newTransactions: RawTransaction[],
    existingTransactions: (Transaction | RawTransaction)[],
    options: DedupeOptions = {}
  ): DedupeResult {
    const {
      confidenceThreshold = DedupeEngine.DEFAULT_CONFIDENCE_THRESHOLD,
      useFitId = true,
      useDescriptionSimilarity = true,
    } = options;

    const uniqueTransactions: RawTransaction[] = [];
    const duplicates: DuplicateResult[] = [];

    // Build index for faster lookups
    const existingByFitId = this.buildFitIdIndex(existingTransactions);
    const existingByDateAmount = this.buildDateAmountIndex(existingTransactions);

    for (const newTx of newTransactions) {
      const duplicateResult = this.findDuplicateFor(
        newTx,
        existingTransactions,
        existingByFitId,
        existingByDateAmount,
        { useFitId, useDescriptionSimilarity }
      );

      if (duplicateResult && duplicateResult.confidence >= confidenceThreshold) {
        duplicates.push(duplicateResult);
      } else {
        uniqueTransactions.push(newTx);
      }
    }

    return {
      uniqueTransactions,
      duplicates,
      totalProcessed: newTransactions.length,
    };
  }

  /**
   * Finds duplicates within a single set of transactions (self-deduplication)
   * This is useful for detecting duplicates within an import batch
   *
   * @param transactions - Transactions to check for internal duplicates
   * @param options - Deduplication options
   * @returns Dedupe result with unique transactions and duplicates
   */
  findDuplicatesWithinSet(
    transactions: RawTransaction[],
    options: DedupeOptions = {}
  ): DedupeResult {
    const {
      confidenceThreshold = DedupeEngine.DEFAULT_CONFIDENCE_THRESHOLD,
      useFitId = true,
      useDescriptionSimilarity = true,
    } = options;

    const uniqueTransactions: RawTransaction[] = [];
    const duplicates: DuplicateResult[] = [];
    const seen: RawTransaction[] = [];

    for (const tx of transactions) {
      // Build indexes from seen transactions
      const seenByFitId = this.buildFitIdIndex(seen);
      const seenByDateAmount = this.buildDateAmountIndex(seen);

      const duplicateResult = this.findDuplicateFor(tx, seen, seenByFitId, seenByDateAmount, {
        useFitId,
        useDescriptionSimilarity,
      });

      if (duplicateResult && duplicateResult.confidence >= confidenceThreshold) {
        duplicates.push(duplicateResult);
      } else {
        uniqueTransactions.push(tx);
        seen.push(tx);
      }
    }

    return {
      uniqueTransactions,
      duplicates,
      totalProcessed: transactions.length,
    };
  }

  /**
   * Runs deduplication in an idempotent manner
   * Running dedupe twice produces the same result as running it once
   *
   * @param transactions - Transactions to dedupe
   * @param options - Deduplication options
   * @returns Dedupe result
   */
  dedupeIdempotent(transactions: RawTransaction[], options: DedupeOptions = {}): DedupeResult {
    // First pass: find duplicates within the set
    const result = this.findDuplicatesWithinSet(transactions, options);

    // The result is already idempotent because:
    // 1. We process transactions in order
    // 2. We only compare against previously seen unique transactions
    // 3. Running again on uniqueTransactions will produce the same result

    return result;
  }

  /**
   * Performs cross-file deduplication across multiple files in a batch group.
   * Detects and removes duplicates between different files, keeping only one copy.
   *
   * The algorithm processes files in order, comparing each file's transactions
   * against all previously processed files. This ensures deterministic results
   * and maintains the first occurrence of each transaction.
   *
   * @param files - Array of file transactions to deduplicate across
   * @param options - Deduplication options
   * @returns Cross-file dedupe result with unique transactions per file and duplicates found
   *
   * **Validates: Requirements 8.1, 8.3, 8.4**
   */
  findCrossFileDuplicates(
    files: FileTransactions[],
    options: DedupeOptions = {}
  ): CrossFileDedupeResult {
    const {
      confidenceThreshold = DedupeEngine.DEFAULT_CONFIDENCE_THRESHOLD,
      useFitId = true,
      useDescriptionSimilarity = true,
    } = options;

    const fileResults = new Map<string, RawTransaction[]>();
    const crossFileDuplicates: CrossFileDuplicateResult[] = [];
    let totalProcessed = 0;
    let totalUnique = 0;

    // Track all unique transactions seen so far across all files
    // Maps to the file ID where the transaction was first seen
    const seenTransactions: Array<{ tx: RawTransaction; fileId: string }> = [];

    for (const file of files) {
      const uniqueInFile: RawTransaction[] = [];
      totalProcessed += file.transactions.length;

      // Build indexes from all seen transactions for efficient lookup
      const seenByFitId = this.buildFitIdIndexWithFileId(seenTransactions);
      const seenByDateAmount = this.buildDateAmountIndexWithFileId(seenTransactions);

      for (const tx of file.transactions) {
        const duplicateResult = this.findCrossFileDuplicateFor(
          tx,
          file.fileId,
          seenTransactions,
          seenByFitId,
          seenByDateAmount,
          { useFitId, useDescriptionSimilarity, confidenceThreshold }
        );

        if (duplicateResult) {
          crossFileDuplicates.push(duplicateResult);
        } else {
          uniqueInFile.push(tx);
          seenTransactions.push({ tx, fileId: file.fileId });
        }
      }

      fileResults.set(file.fileId, uniqueInFile);
      totalUnique += uniqueInFile.length;
    }

    return {
      fileResults,
      crossFileDuplicates,
      totalProcessed,
      totalUnique,
    };
  }

  /**
   * Verifies new transactions against existing database transactions.
   * Identifies which transactions already exist in the database.
   *
   * @param newTransactions - New transactions to verify
   * @param existingTransactions - Existing transactions from database
   * @param options - Deduplication options
   * @returns Verification result with new and existing transactions
   *
   * **Validates: Requirements 8.2**
   */
  verifyAgainstDatabase(
    newTransactions: RawTransaction[],
    existingTransactions: Transaction[],
    options: DedupeOptions = {}
  ): DatabaseVerificationResult {
    const result = this.findDuplicates(newTransactions, existingTransactions, options);

    return {
      newTransactions: result.uniqueTransactions,
      existingInDatabase: result.duplicates,
      totalChecked: result.totalProcessed,
    };
  }

  /**
   * Performs complete deduplication for a multi-file import:
   * 1. First deduplicates within each file
   * 2. Then deduplicates across files
   * 3. Finally verifies against database
   *
   * This is the main entry point for multi-file import deduplication.
   *
   * @param files - Array of file transactions
   * @param existingTransactions - Existing transactions from database
   * @param options - Deduplication options
   * @returns Complete deduplication result
   *
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   */
  deduplicateMultiFileImport(
    files: FileTransactions[],
    existingTransactions: Transaction[],
    options: DedupeOptions = {}
  ): {
    fileResults: Map<string, RawTransaction[]>;
    inFileDuplicates: Map<string, DuplicateResult[]>;
    crossFileDuplicates: CrossFileDuplicateResult[];
    databaseDuplicates: DuplicateResult[];
    totalInFileDuplicates: number;
    totalCrossFileDuplicates: number;
    totalDatabaseDuplicates: number;
    totalUniqueTransactions: number;
  } {
    const inFileDuplicates = new Map<string, DuplicateResult[]>();
    let totalInFileDuplicates = 0;

    // Step 1: Deduplicate within each file
    const dedupedFiles: FileTransactions[] = files.map((file) => {
      const result = this.findDuplicatesWithinSet(file.transactions, options);
      inFileDuplicates.set(file.fileId, result.duplicates);
      totalInFileDuplicates += result.duplicates.length;
      return {
        fileId: file.fileId,
        transactions: result.uniqueTransactions,
      };
    });

    // Step 2: Deduplicate across files
    const crossFileResult = this.findCrossFileDuplicates(dedupedFiles, options);

    // Step 3: Verify against database
    // Collect all unique transactions from cross-file deduplication
    const allUniqueTransactions: RawTransaction[] = [];
    for (const transactions of crossFileResult.fileResults.values()) {
      allUniqueTransactions.push(...transactions);
    }

    const dbVerification = this.verifyAgainstDatabase(
      allUniqueTransactions,
      existingTransactions,
      options
    );

    // Update file results to exclude database duplicates
    const finalFileResults = new Map<string, RawTransaction[]>();
    const dbDuplicateSet = new Set(
      dbVerification.existingInDatabase.map((d) => this.getTransactionKey(d.newTransaction))
    );

    for (const [fileId, transactions] of crossFileResult.fileResults) {
      const filtered = transactions.filter((tx) => !dbDuplicateSet.has(this.getTransactionKey(tx)));
      finalFileResults.set(fileId, filtered);
    }

    const totalUniqueTransactions = dbVerification.newTransactions.length;

    return {
      fileResults: finalFileResults,
      inFileDuplicates,
      crossFileDuplicates: crossFileResult.crossFileDuplicates,
      databaseDuplicates: dbVerification.existingInDatabase,
      totalInFileDuplicates,
      totalCrossFileDuplicates: crossFileResult.crossFileDuplicates.length,
      totalDatabaseDuplicates: dbVerification.existingInDatabase.length,
      totalUniqueTransactions,
    };
  }

  /**
   * Builds an index of transactions by FITID with file ID for cross-file lookup
   */
  private buildFitIdIndexWithFileId(
    transactions: Array<{ tx: RawTransaction; fileId: string }>
  ): Map<string, { tx: RawTransaction; fileId: string }> {
    const index = new Map<string, { tx: RawTransaction; fileId: string }>();

    for (const item of transactions) {
      const fitId = item.tx.fitId;
      if (fitId) {
        index.set(fitId, item);
      }
    }

    return index;
  }

  /**
   * Builds an index of transactions by date+amount with file ID for cross-file lookup
   */
  private buildDateAmountIndexWithFileId(
    transactions: Array<{ tx: RawTransaction; fileId: string }>
  ): Map<string, Array<{ tx: RawTransaction; fileId: string }>> {
    const index = new Map<string, Array<{ tx: RawTransaction; fileId: string }>>();

    for (const item of transactions) {
      const key = this.getDateAmountKey(item.tx.date, item.tx.amount);
      const existing = index.get(key) || [];
      existing.push(item);
      index.set(key, existing);
    }

    return index;
  }

  /**
   * Finds a cross-file duplicate for a single transaction
   */
  private findCrossFileDuplicateFor(
    tx: RawTransaction,
    currentFileId: string,
    seenTransactions: Array<{ tx: RawTransaction; fileId: string }>,
    fitIdIndex: Map<string, { tx: RawTransaction; fileId: string }>,
    dateAmountIndex: Map<string, Array<{ tx: RawTransaction; fileId: string }>>,
    options: {
      useFitId: boolean;
      useDescriptionSimilarity: boolean;
      confidenceThreshold: number;
    }
  ): CrossFileDuplicateResult | null {
    // Check FITID first (fastest and most reliable)
    if (options.useFitId && tx.fitId) {
      const fitIdMatch = fitIdIndex.get(tx.fitId);
      if (fitIdMatch) {
        return {
          duplicateTransaction: tx,
          duplicateFileId: currentFileId,
          originalTransaction: fitIdMatch.tx,
          originalFileId: fitIdMatch.fileId,
          confidence: 1.0,
          matchReason: 'fitid',
        };
      }
    }

    // Check date+amount index
    const key = this.getDateAmountKey(tx.date, tx.amount);
    const candidates = dateAmountIndex.get(key) || [];

    let bestMatch: CrossFileDuplicateResult | null = null;

    for (const candidate of candidates) {
      const result = this.calculateConfidence(tx, candidate.tx, {
        useFitId: options.useFitId,
        useDescriptionSimilarity: options.useDescriptionSimilarity,
      });

      if (
        result &&
        result.confidence >= options.confidenceThreshold &&
        (!bestMatch || result.confidence > bestMatch.confidence)
      ) {
        bestMatch = {
          duplicateTransaction: tx,
          duplicateFileId: currentFileId,
          originalTransaction: candidate.tx,
          originalFileId: candidate.fileId,
          confidence: result.confidence,
          matchReason: result.matchReason,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Creates a unique key for a transaction (for Set operations)
   */
  private getTransactionKey(tx: RawTransaction): string {
    const dateStr = this.formatDateForKey(tx.date);
    const amountStr = tx.amount.toFixed(2);
    const descNormalized = this.normalizeDescription(tx.description);
    return `${dateStr}|${amountStr}|${descNormalized}`;
  }

  /**
   * Marks a transaction as a duplicate of another
   *
   * @param transaction - Transaction to mark as duplicate
   * @param duplicateOfId - ID of the original transaction
   * @returns Updated transaction with duplicateOf set
   */
  markAsDuplicate<T extends { duplicateOf?: string | null }>(
    transaction: T,
    duplicateOfId: string
  ): T {
    return {
      ...transaction,
      duplicateOf: duplicateOfId,
    };
  }

  /**
   * Calculates confidence score for a potential duplicate match
   *
   * @param newTx - New transaction
   * @param existingTx - Existing transaction to compare
   * @param options - Options for scoring
   * @returns Confidence score (0-1) and match reason
   */
  calculateConfidence(
    newTx: RawTransaction,
    existingTx: Transaction | RawTransaction,
    options: { useFitId?: boolean; useDescriptionSimilarity?: boolean } = {}
  ): { confidence: number; matchReason: DuplicateResult['matchReason'] } | null {
    const { useFitId = true, useDescriptionSimilarity = true } = options;

    // Check FITID match first (highest priority)
    if (useFitId && newTx.fitId && this.getFitId(existingTx)) {
      if (newTx.fitId === this.getFitId(existingTx)) {
        return { confidence: 1.0, matchReason: 'fitid' };
      }
    }

    // Check date and amount match
    if (!this.datesMatch(newTx.date, this.getDate(existingTx))) {
      return null;
    }

    if (!this.amountsMatch(newTx.amount, this.getAmount(existingTx))) {
      return null;
    }

    // Date and amount match - calculate description similarity
    if (useDescriptionSimilarity) {
      const similarity = this.calculateDescriptionSimilarity(
        newTx.description,
        this.getDescription(existingTx)
      );

      if (similarity >= 0.9) {
        // Very similar description: 90-99% confidence
        const confidence = 0.9 + similarity * 0.09;
        return { confidence, matchReason: 'date_amount_description' };
      } else if (similarity >= 0.5) {
        // Somewhat similar description: 70-89% confidence
        const confidence = 0.7 + (similarity - 0.5) * 0.4;
        return { confidence, matchReason: 'date_amount_description' };
      }
    }

    // Date and amount match only: 50-69% confidence
    // Higher confidence if descriptions are at least somewhat similar
    const similarity = this.calculateDescriptionSimilarity(
      newTx.description,
      this.getDescription(existingTx)
    );
    const confidence = 0.5 + similarity * 0.19;
    return { confidence, matchReason: 'date_amount' };
  }

  /**
   * Builds an index of transactions by FITID for fast lookup
   */
  private buildFitIdIndex(
    transactions: (Transaction | RawTransaction)[]
  ): Map<string, Transaction | RawTransaction> {
    const index = new Map<string, Transaction | RawTransaction>();

    for (const tx of transactions) {
      const fitId = this.getFitId(tx);
      if (fitId) {
        index.set(fitId, tx);
      }
    }

    return index;
  }

  /**
   * Builds an index of transactions by date+amount for fast lookup
   */
  private buildDateAmountIndex(
    transactions: (Transaction | RawTransaction)[]
  ): Map<string, (Transaction | RawTransaction)[]> {
    const index = new Map<string, (Transaction | RawTransaction)[]>();

    for (const tx of transactions) {
      const key = this.getDateAmountKey(this.getDate(tx), this.getAmount(tx));
      const existing = index.get(key) || [];
      existing.push(tx);
      index.set(key, existing);
    }

    return index;
  }

  /**
   * Finds a duplicate for a single transaction
   */
  private findDuplicateFor(
    newTx: RawTransaction,
    existingTransactions: (Transaction | RawTransaction)[],
    fitIdIndex: Map<string, Transaction | RawTransaction>,
    dateAmountIndex: Map<string, (Transaction | RawTransaction)[]>,
    options: { useFitId: boolean; useDescriptionSimilarity: boolean }
  ): DuplicateResult | null {
    // Check FITID first (fastest and most reliable)
    if (options.useFitId && newTx.fitId) {
      const fitIdMatch = fitIdIndex.get(newTx.fitId);
      if (fitIdMatch) {
        return {
          newTransaction: newTx,
          existingTransaction: fitIdMatch,
          confidence: 1.0,
          matchReason: 'fitid',
        };
      }
    }

    // Check date+amount index
    const key = this.getDateAmountKey(newTx.date, newTx.amount);
    const candidates = dateAmountIndex.get(key) || [];

    let bestMatch: DuplicateResult | null = null;

    for (const candidate of candidates) {
      const result = this.calculateConfidence(newTx, candidate, options);
      if (result && (!bestMatch || result.confidence > bestMatch.confidence)) {
        bestMatch = {
          newTransaction: newTx,
          existingTransaction: candidate,
          confidence: result.confidence,
          matchReason: result.matchReason,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Creates a key for date+amount lookup
   */
  private getDateAmountKey(date: Date, amount: number): string {
    const dateStr = this.formatDateForKey(date);
    const amountStr = amount.toFixed(2);
    return `${dateStr}|${amountStr}`;
  }

  /**
   * Formats a date for use as a key (YYYY-MM-DD)
   */
  private formatDateForKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Checks if two dates match (same day)
   */
  private datesMatch(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Checks if two amounts match (with small tolerance for floating point)
   */
  private amountsMatch(amount1: number, amount2: number): boolean {
    return Math.abs(amount1 - amount2) < 0.01;
  }

  /**
   * Calculates similarity between two descriptions using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Normalize descriptions
    const normalized1 = this.normalizeDescription(desc1);
    const normalized2 = this.normalizeDescription(desc2);

    // If both are empty or identical after normalization
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // If one is empty
    if (normalized1.length === 0 || normalized2.length === 0) {
      return 0.0;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    // Convert distance to similarity (0-1)
    return 1 - distance / maxLength;
  }

  /**
   * Normalizes a description for comparison
   * - Converts to lowercase
   * - Removes extra whitespace
   * - Removes common noise words
   */
  private normalizeDescription(description: string): string {
    return description.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create distance matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] =
            1 +
            Math.min(
              dp[i - 1][j], // deletion
              dp[i][j - 1], // insertion
              dp[i - 1][j - 1] // substitution
            );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Gets the FITID from a transaction (handles both RawTransaction and Transaction)
   */
  private getFitId(tx: Transaction | RawTransaction): string | undefined {
    if ('fitId' in tx) {
      return tx.fitId;
    }
    return undefined;
  }

  /**
   * Gets the date from a transaction
   */
  private getDate(tx: Transaction | RawTransaction): Date {
    return tx.date;
  }

  /**
   * Gets the amount from a transaction
   */
  private getAmount(tx: Transaction | RawTransaction): number {
    return tx.amount;
  }

  /**
   * Gets the description from a transaction
   */
  private getDescription(tx: Transaction | RawTransaction): string {
    return tx.description;
  }
}

/**
 * Default DedupeEngine instance
 */
export const dedupeEngine = new DedupeEngine();
