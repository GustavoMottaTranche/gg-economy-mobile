/**
 * Theme Constants Module
 *
 * Centralized color constants for UI components.
 * Provides consistent styling across the application.
 *
 * **Validates: Requirements 4**
 */

/**
 * Transaction color schemes for different transaction states and types.
 * Used by TransactionCard and other transaction-related components.
 */
export const TRANSACTION_COLORS = {
  /** Colors for income transactions (positive amounts) */
  income: {
    text: '#166534',
    background: '#dcfce7',
    border: '#86efac',
  },
  /** Colors for expense transactions (negative amounts) */
  expense: {
    text: '#991b1b',
    background: '#fee2e2',
    border: '#fca5a5',
  },
  /** Colors for neutral/default state */
  neutral: {
    text: '#374151',
    background: '#f3f4f6',
    border: '#d1d5db',
  },
  /** Colors for selected transaction state */
  selected: {
    border: '#3b82f6',
    background: '#eff6ff',
  },
  /** Colors for excluded transactions */
  excluded: {
    text: '#6b7280',
    background: '#f9fafb',
  },
} as const;

/**
 * Type representing the available transaction color scheme keys
 */
export type TransactionColorScheme = keyof typeof TRANSACTION_COLORS;
