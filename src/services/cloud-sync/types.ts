/**
 * Shared type definitions for the Cloud Sync Import feature.
 *
 * Defines interfaces for credentials, results, extracted data,
 * payload structure, and progress tracking.
 *
 * @module services/cloud-sync/types
 */

import type {
  ExpenseGroupRecord,
  CategoryRecord,
  FundRecord,
  FundAllocationRecord,
  TransactionRecord,
  RecurringTransactionRecord,
  WeeklyRecurringGroupRecord,
  WeeklyOccurrenceRecord,
  RecurringFundLinkRecord,
  CategoryGoalRecord,
} from '@db/schema';

// ============================================================================
// Authentication Types
// ============================================================================

/** Credentials for authenticating with the GG-Economy Web platform. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Result of a successful authentication containing the access token. */
export interface LoginResult {
  accessToken: string;
}

// ============================================================================
// Data Extraction Types
// ============================================================================

/** Structured data extracted from all local database tables. */
export interface ExtractedData {
  expenseGroups: ExpenseGroupRecord[];
  categories: CategoryRecord[];
  funds: FundRecord[];
  fundAllocations: FundAllocationRecord[];
  transactions: TransactionRecord[];
  recurringTransactions: RecurringTransactionRecord[];
  weeklyRecurringGroups: WeeklyRecurringGroupRecord[];
  weeklyOccurrences: WeeklyOccurrenceRecord[];
  recurringFundLinks: RecurringFundLinkRecord[];
  categoryGoals: CategoryGoalRecord[];
}

// ============================================================================
// Payload Types
// ============================================================================

/** JSON payload sent to the server import endpoint. */
export interface ImportPayload {
  tables: {
    categories: Record<string, unknown>[];
    funds: Record<string, unknown>[];
    installment_groups: Record<string, unknown>[];
    recurring_transactions: Record<string, unknown>[];
    weekly_recurring_groups: Record<string, unknown>[];
    fund_allocations: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    recurring_fund_links: Record<string, unknown>[];
    weekly_occurrences: Record<string, unknown>[];
    budget_goals: Record<string, unknown>[];
  };
}

// ============================================================================
// Import Result Types
// ============================================================================

/** Aggregate totals from the server import response. */
export interface ImportResultTotals {
  ok: number;
  failed: number;
  skipped: number;
}

/** Full server response from the import endpoint. */
export interface ImportResult {
  totals: ImportResultTotals;
  tables: Record<string, { ok: number; failed: number; skipped: number }>;
}

// ============================================================================
// Progress Types
// ============================================================================

/** Steps in the sync pipeline. */
export type SyncStep = 'extracting' | 'building' | 'uploading';

/** Callback invoked when the sync pipeline transitions to a new step. */
export interface SyncProgressCallback {
  (step: SyncStep): void;
}
