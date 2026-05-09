/**
 * Constants Module Index
 *
 * Re-exports all constant modules for convenient importing.
 *
 * @example
 * // Import specific constants
 * import { MAX_MULTI_FILE_COUNT, TRANSACTION_COLORS, DESCRIPTION_MAX_LENGTH } from '@/constants';
 *
 * // Or import from specific modules
 * import { SUPPORTED_EXTENSIONS } from '@/constants/import';
 */

// Import-related constants
export {
  MAX_MULTI_FILE_COUNT,
  MAX_EXCEL_ROWS,
  SHEET_SELECTION_TIMEOUT_MS,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  type SupportedExtension,
  type SupportedMimeType,
} from './import';

// Theme/color constants
export { TRANSACTION_COLORS, type TransactionColorScheme } from './theme';

// Validation limits constants
export {
  DESCRIPTION_MAX_LENGTH,
  AMOUNT_MAX_VALUE,
  AMOUNT_MIN_VALUE,
  REFERENCE_MONTH_PATTERN,
  PAGINATION,
  type PaginationConfig,
} from './limits';
