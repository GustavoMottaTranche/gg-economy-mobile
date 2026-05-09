/**
 * Limits Constants Module
 *
 * Centralized validation limits and business rule constants.
 * These values define constraints for transaction data and pagination.
 *
 * **Validates: Requirements 5**
 */

/**
 * Maximum length for transaction descriptions
 */
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Maximum transaction amount in cents (9,999,999.99)
 */
export const AMOUNT_MAX_VALUE = 999999999;

/**
 * Minimum transaction amount in cents (-9,999,999.99)
 */
export const AMOUNT_MIN_VALUE = -999999999;

/**
 * Regex pattern for validating reference month format (YYYY-MM)
 * @example "2024-01", "2023-12"
 */
export const REFERENCE_MONTH_PATTERN = /^\d{4}-\d{2}$/;

/**
 * Pagination configuration constants
 */
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum allowed items per page */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Type for pagination configuration
 */
export type PaginationConfig = typeof PAGINATION;
