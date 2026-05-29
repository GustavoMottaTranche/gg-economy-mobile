/**
 * Date formatting and parsing utilities with locale and format support
 *
 * Supported formats:
 * - DD/MM/YYYY (pt-BR default)
 * - MM/DD/YYYY (en default)
 * - YYYY-MM-DD (ISO)
 */

import { SupportedLocale } from './formatCurrency';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface FormatDateOptions {
  /** Locale for formatting (default: 'pt-BR') */
  locale?: SupportedLocale;
  /** Explicit format override (default: locale-based) */
  format?: DateFormat;
  /** Whether to include time (default: false) */
  includeTime?: boolean;
}

/**
 * Default date format per locale
 */
const DEFAULT_FORMAT: Record<SupportedLocale, DateFormat> = {
  'pt-BR': 'DD/MM/YYYY',
  en: 'MM/DD/YYYY',
};

/**
 * Pads a number with leading zeros
 */
function padZero(num: number, length: number = 2): string {
  return num.toString().padStart(length, '0');
}

/**
 * Formats a Date object to a string according to locale/format
 *
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date(2024, 0, 15), { locale: 'pt-BR' }) // "15/01/2024"
 * formatDate(new Date(2024, 0, 15), { locale: 'en' }) // "01/15/2024"
 * formatDate(new Date(2024, 0, 15), { format: 'YYYY-MM-DD' }) // "2024-01-15"
 */
export function formatDate(date: Date, options: FormatDateOptions = {}): string {
  const { locale = 'pt-BR', format, includeTime = false } = options;

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const dateFormat = format ?? DEFAULT_FORMAT[locale];

  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear().toString();

  let formatted: string;

  switch (dateFormat) {
    case 'DD/MM/YYYY':
      formatted = `${day}/${month}/${year}`;
      break;
    case 'MM/DD/YYYY':
      formatted = `${month}/${day}/${year}`;
      break;
    case 'YYYY-MM-DD':
      formatted = `${year}-${month}-${day}`;
      break;
    default:
      formatted = `${day}/${month}/${year}`;
  }

  if (includeTime) {
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    formatted += ` ${hours}:${minutes}`;
  }

  return formatted;
}

/**
 * Parses a date string to a Date object
 *
 * @param dateString - Date string to parse
 * @param options - Parsing options (locale/format)
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseDate("15/01/2024", { locale: 'pt-BR' }) // Date(2024, 0, 15)
 * parseDate("01/15/2024", { locale: 'en' }) // Date(2024, 0, 15)
 * parseDate("2024-01-15", { format: 'YYYY-MM-DD' }) // Date(2024, 0, 15)
 */
export function parseDate(dateString: string, options: FormatDateOptions = {}): Date | null {
  const { locale = 'pt-BR', format } = options;

  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();

  // Try to detect format if not specified
  const dateFormat = format ?? detectDateFormat(trimmed) ?? DEFAULT_FORMAT[locale];

  let day: number;
  let month: number;
  let year: number;

  try {
    switch (dateFormat) {
      case 'DD/MM/YYYY': {
        const parts = trimmed.split('/');
        if (parts.length !== 3) return null;
        const part0 = parts[0];
        const part1 = parts[1];
        const part2 = parts[2];
        if (!part0 || !part1 || !part2) return null;
        day = parseInt(part0, 10);
        month = parseInt(part1, 10);
        year = parseInt(part2, 10);
        break;
      }
      case 'MM/DD/YYYY': {
        const parts = trimmed.split('/');
        if (parts.length !== 3) return null;
        const part0 = parts[0];
        const part1 = parts[1];
        const part2 = parts[2];
        if (!part0 || !part1 || !part2) return null;
        month = parseInt(part0, 10);
        day = parseInt(part1, 10);
        year = parseInt(part2, 10);
        break;
      }
      case 'YYYY-MM-DD': {
        const parts = trimmed.split('-');
        if (parts.length !== 3) return null;
        const part0 = parts[0];
        const part1 = parts[1];
        const part2 = parts[2];
        if (!part0 || !part1 || !part2) return null;
        year = parseInt(part0, 10);
        month = parseInt(part1, 10);
        day = parseInt(part2, 10);
        break;
      }
      default:
        return null;
    }

    // Validate parsed values
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    // Basic validation
    if (month < 1 || month > 12) {
      return null;
    }

    if (day < 1 || day > 31) {
      return null;
    }

    if (year < 1900 || year > 2100) {
      return null;
    }

    // Create date and validate it's a real date
    const date = new Date(year, month - 1, day);

    // Check if the date is valid (handles invalid dates like Feb 30)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Attempts to detect the format of a date string
 *
 * @param dateString - Date string to analyze
 * @returns Detected format or null if unknown
 */
export function detectDateFormat(dateString: string): DateFormat | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'YYYY-MM-DD';
  }

  // Slash-separated formats
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    // Could be DD/MM/YYYY or MM/DD/YYYY
    // Try to disambiguate by checking if first part > 12
    const parts = trimmed.split('/');
    const part0 = parts[0];
    const part1 = parts[1];
    if (!part0 || !part1) return null;
    const first = parseInt(part0, 10);
    const second = parseInt(part1, 10);

    // If first part > 12, it must be day (DD/MM/YYYY)
    if (first > 12) {
      return 'DD/MM/YYYY';
    }

    // If second part > 12, it must be day (MM/DD/YYYY)
    if (second > 12) {
      return 'MM/DD/YYYY';
    }

    // Ambiguous - return null to use locale default
    return null;
  }

  return null;
}

/**
 * Formats a date for display using Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @param style - Date style ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 */
export function formatDateLocalized(
  date: Date,
  locale: SupportedLocale = 'pt-BR',
  style: 'short' | 'medium' | 'long' | 'full' = 'short'
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const localeString = locale === 'pt-BR' ? 'pt-BR' : 'en-US';

  return new Intl.DateTimeFormat(localeString, {
    dateStyle: style,
  }).format(date);
}

/**
 * Formats a date and time for display using Intl.DateTimeFormat
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date, locale: SupportedLocale = 'pt-BR'): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const localeString = locale === 'pt-BR' ? 'pt-BR' : 'en-US';

  return new Intl.DateTimeFormat(localeString, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Gets the reference month string from a date (YYYY-MM format)
 *
 * @param date - Date to extract reference month from
 * @returns Reference month string in YYYY-MM format
 */
export function getReferenceMonth(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);

  return `${year}-${month}`;
}

/**
 * Parses a reference month string to a Date (first day of month)
 *
 * @param referenceMonth - Reference month string (YYYY-MM)
 * @returns Date object for first day of month or null if invalid
 */
export function parseReferenceMonth(referenceMonth: string): Date | null {
  if (!referenceMonth || typeof referenceMonth !== 'string') {
    return null;
  }

  const match = referenceMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const yearStr = match[1];
  const monthStr = match[2];
  if (!yearStr || !monthStr) return null;

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (month < 1 || month > 12) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

/**
 * Checks if two dates are the same day (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if two dates are in the same month
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}
