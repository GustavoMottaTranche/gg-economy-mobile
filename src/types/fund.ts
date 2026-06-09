/**
 * Fund Types
 *
 * Type definitions for the Future Plans / Funds feature.
 */

/**
 * Represents a user-created fund allocation slot
 */
export interface Fund {
  /** Unique identifier (UUID) */
  id: string;
  /** Fund name (1-50 characters) */
  name: string;
  /** Optional icon identifier */
  icon: string | null;
  /** Optional color hex value */
  color: string | null;
  /** Whether the fund is active (false = soft-deleted) */
  isActive: boolean;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Represents a monthly allocation amount assigned to a fund
 */
export interface FundAllocation {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the fund */
  fundId: string;
  /** Reference month for the allocation (YYYY-MM format) */
  referenceMonth: string;
  /** Allocation amount in cents (must be > 0) */
  amount: number;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Represents the base balance for a fund (previously accumulated savings)
 */
export interface FundBalance {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the fund (unique per fund) */
  fundId: string;
  /** Base amount in cents (must be >= 0) */
  baseAmount: number;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Represents a link between a transaction and a fund
 */
export interface FundTransaction {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the fund */
  fundId: string;
  /** Reference to the linked transaction (unique per transaction) */
  transactionId: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Represents a link between a recurring transaction and a fund
 */
export interface RecurringFundLink {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the recurring transaction (unique per recurring) */
  recurringId: string;
  /** Reference to the fund */
  fundId: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Fund with calculated balance information for display
 */
export interface FundWithBalance extends Fund {
  /** Total calculated balance: base + allocations - deductions (in cents) */
  totalBalance: number;
  /** Current month allocation amount in cents */
  monthlyAllocation: number;
}

/**
 * DTO for creating a new fund
 */
export interface CreateFundDTO {
  name: string;
  icon?: string;
  color?: string;
}

/**
 * DTO for updating an existing fund
 */
export interface UpdateFundDTO {
  name?: string;
  icon?: string | null;
  color?: string | null;
}
