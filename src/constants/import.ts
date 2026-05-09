/**
 * Import-related constants
 *
 * Centralized configuration values for the import functionality.
 * These constants control file selection, parsing limits, and supported formats.
 *
 * @module constants/import
 */

/**
 * Maximum number of files allowed in multi-file import
 */
export const MAX_MULTI_FILE_COUNT = 10;

/**
 * Maximum number of rows allowed in Excel files
 */
export const MAX_EXCEL_ROWS = 10000;

/**
 * Timeout in milliseconds for sheet selection dialog
 * After this timeout, the first sheet is selected automatically
 */
export const SHEET_SELECTION_TIMEOUT_MS = 5000;

/**
 * Supported file extensions for import
 */
export const SUPPORTED_EXTENSIONS = ['.csv', '.ofx', '.qfx', '.xlsx', '.xls'] as const;

/**
 * Type representing a supported file extension
 */
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * MIME types for supported files
 */
export const SUPPORTED_MIME_TYPES = [
  // CSV formats
  'text/csv',
  'text/comma-separated-values',
  'application/csv',
  // OFX/QFX formats
  'application/x-ofx',
  'application/vnd.intu.qfx',
  // Generic text formats (for files without specific MIME type)
  'text/plain',
  'application/octet-stream',
  // Excel formats
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
] as const;

/**
 * Type representing a supported MIME type
 */
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
