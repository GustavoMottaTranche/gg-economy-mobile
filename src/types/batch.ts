import { CategoryType } from './category';

/**
 * State of an active batch entry session
 */
export interface BatchSession {
  /** Whether a batch session is currently active */
  isActive: boolean;
  /** Selected category for the session */
  categoryId: string | null;
  /** Type derived from the selected category */
  categoryType: CategoryType | null;
  /** Locked title for the session, applied to all entries */
  title: string | null;
  /** Number of entries added in the current session */
  entryCount: number;
  /** Maximum entries allowed per session */
  maxEntries: number;
  /** Sum of all entry amounts in the session (cents) */
  totalValue: number;
}

/**
 * Actions available on a batch session
 */
export interface BatchSessionActions {
  /** Start a new batch session with a selected category and title */
  startSession(categoryId: string, categoryType: CategoryType, title: string): void;
  /** Increment the entry count and add amount to total */
  incrementCount(amount: number): void;
  /** End the session and return a summary */
  endSession(): BatchSessionSummary;
  /** Reset all session state */
  reset(): void;
}

/**
 * Summary returned when a batch session ends
 */
export interface BatchSessionSummary {
  /** Total number of entries created in the session */
  totalEntries: number;
  /** Total value of all entries in the session (cents) */
  totalValue: number;
}

/**
 * DTO for creating a single entry in batch mode (category comes from session)
 */
export interface CreateBatchEntryDTO {
  /** Amount in cents */
  amount: number;
  /** Entry description */
  description: string;
  /** Transaction date */
  date: Date;
}
