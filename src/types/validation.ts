/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Array of error messages if validation failed */
  errors?: string[];
}

/**
 * Input for installment entry validation
 */
export interface InstallmentValidationInput {
  /** Total amount in cents */
  totalAmount: number;
  /** Number of parcels (expected 2–48) */
  parcelCount: number;
  /** Transaction description */
  description: string;
  /** Start month in YYYY-MM format */
  startMonth: string;
  /** Category identifier (required) */
  categoryId: string | null;
}

/**
 * Input for standard (single) entry validation
 */
export interface StandardValidationInput {
  /** Amount in cents */
  amount: number;
  /** Transaction description */
  description: string;
  /** Transaction date */
  date: Date;
  /** Category identifier (required) */
  categoryId: string | null;
  /** Reference month in YYYY-MM format */
  referenceMonth: string;
}
