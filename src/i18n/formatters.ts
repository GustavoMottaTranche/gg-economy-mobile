/**
 * Locale-aware formatters using the Intl API
 *
 * Provides consistent formatting for dates, times, currencies, and numbers
 * based on the current locale setting.
 *
 * **Validates: Requirements 25**
 */
import type { SupportedLocale } from './index';

/**
 * Intl locale strings for supported locales
 */
const INTL_LOCALES: Record<SupportedLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
};

/**
 * Currency codes for supported locales
 */
const CURRENCY_CODES: Record<SupportedLocale, string> = {
  'pt-BR': 'BRL',
  en: 'USD',
};

/**
 * Date format styles
 */
export type DateStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Time format styles
 */
export type TimeStyle = 'short' | 'medium' | 'long' | 'full';

/**
 * Currency display options
 */
export type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/**
 * Options for date formatting
 */
export interface DateFormatOptions {
  /** Date style (default: 'short') */
  dateStyle?: DateStyle;
  /** Whether to include time (default: false) */
  includeTime?: boolean;
  /** Time style when includeTime is true (default: 'short') */
  timeStyle?: TimeStyle;
}

/**
 * Options for currency formatting
 */
export interface CurrencyFormatOptions {
  /** Currency code override (default: locale-based) */
  currency?: string;
  /** How to display the currency (default: 'symbol') */
  currencyDisplay?: CurrencyDisplay;
  /** Whether to show sign for positive values (default: false) */
  showPositiveSign?: boolean;
  /** Minimum fraction digits (default: 2) */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maximumFractionDigits?: number;
}

/**
 * Options for number formatting
 */
export interface NumberFormatOptions {
  /** Minimum fraction digits (default: 0) */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maximumFractionDigits?: number;
  /** Whether to use grouping separators (default: true) */
  useGrouping?: boolean;
  /** Notation style (default: 'standard') */
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
}

/**
 * Options for relative time formatting
 */
export interface RelativeTimeFormatOptions {
  /** Numeric style (default: 'auto') */
  numeric?: 'always' | 'auto';
  /** Style (default: 'long') */
  style?: 'long' | 'short' | 'narrow';
}

/**
 * Formats a date according to the specified locale
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * formatDateLocale(new Date(2024, 0, 15), 'pt-BR') // "15/01/2024"
 * formatDateLocale(new Date(2024, 0, 15), 'en') // "1/15/2024"
 * formatDateLocale(new Date(2024, 0, 15), 'pt-BR', { dateStyle: 'long' }) // "15 de janeiro de 2024"
 */
export function formatDateLocale(
  date: Date,
  locale: SupportedLocale,
  options: DateFormatOptions = {}
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const { dateStyle = 'short', includeTime = false, timeStyle = 'short' } = options;

  const intlLocale = INTL_LOCALES[locale];

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle,
  };

  if (includeTime) {
    formatOptions.timeStyle = timeStyle;
  }

  return new Intl.DateTimeFormat(intlLocale, formatOptions).format(date);
}

/**
 * Formats a time according to the specified locale
 *
 * @param date - Date object containing the time to format
 * @param locale - Locale for formatting
 * @param style - Time style (default: 'short')
 * @returns Formatted time string
 *
 * @example
 * formatTimeLocale(new Date(2024, 0, 15, 14, 30), 'pt-BR') // "14:30"
 * formatTimeLocale(new Date(2024, 0, 15, 14, 30), 'en') // "2:30 PM"
 */
export function formatTimeLocale(
  date: Date,
  locale: SupportedLocale,
  style: TimeStyle = 'short'
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const intlLocale = INTL_LOCALES[locale];

  return new Intl.DateTimeFormat(intlLocale, {
    timeStyle: style,
  }).format(date);
}

/**
 * Formats a date and time according to the specified locale
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @param dateStyle - Date style (default: 'short')
 * @param timeStyle - Time style (default: 'short')
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTimeLocale(new Date(2024, 0, 15, 14, 30), 'pt-BR') // "15/01/2024 14:30"
 * formatDateTimeLocale(new Date(2024, 0, 15, 14, 30), 'en') // "1/15/2024, 2:30 PM"
 */
export function formatDateTimeLocale(
  date: Date,
  locale: SupportedLocale,
  dateStyle: DateStyle = 'short',
  timeStyle: TimeStyle = 'short'
): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const intlLocale = INTL_LOCALES[locale];

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle,
    timeStyle,
  }).format(date);
}

/**
 * Formats a currency amount according to the specified locale
 *
 * @param amount - Amount to format
 * @param locale - Locale for formatting
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrencyLocale(1234.56, 'pt-BR') // "R$ 1.234,56"
 * formatCurrencyLocale(1234.56, 'en') // "$1,234.56"
 * formatCurrencyLocale(-500, 'pt-BR') // "-R$ 500,00"
 */
export function formatCurrencyLocale(
  amount: number,
  locale: SupportedLocale,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = CURRENCY_CODES[locale],
    currencyDisplay = 'symbol',
    showPositiveSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const intlLocale = INTL_LOCALES[locale];

  const formatter = new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    currencyDisplay,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const formatted = formatter.format(Math.abs(amount));

  // Handle sign
  const isNegative = amount < 0;
  const isPositive = amount > 0;

  if (isNegative) {
    return `-${formatted}`;
  }

  if (isPositive && showPositiveSign) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Formats a number according to the specified locale
 *
 * @param value - Number to format
 * @param locale - Locale for formatting
 * @param options - Formatting options
 * @returns Formatted number string
 *
 * @example
 * formatNumberLocale(1234.56, 'pt-BR') // "1.234,56"
 * formatNumberLocale(1234.56, 'en') // "1,234.56"
 * formatNumberLocale(1234567, 'en', { notation: 'compact' }) // "1.2M"
 */
export function formatNumberLocale(
  value: number,
  locale: SupportedLocale,
  options: NumberFormatOptions = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true,
    notation = 'standard',
  } = options;

  const intlLocale = INTL_LOCALES[locale];

  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping,
    notation,
  }).format(value);
}

/**
 * Formats a percentage according to the specified locale
 *
 * @param value - Value to format as percentage (0.5 = 50%)
 * @param locale - Locale for formatting
 * @param fractionDigits - Number of fraction digits (default: 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentLocale(0.5, 'pt-BR') // "50%"
 * formatPercentLocale(0.1234, 'en', 2) // "12.34%"
 */
export function formatPercentLocale(
  value: number,
  locale: SupportedLocale,
  fractionDigits: number = 0
): string {
  const intlLocale = INTL_LOCALES[locale];

  return new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Formats a relative time (e.g., "2 days ago", "in 3 hours")
 *
 * @param value - Numeric value
 * @param unit - Time unit
 * @param locale - Locale for formatting
 * @param options - Formatting options
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTimeLocale(-2, 'day', 'pt-BR') // "há 2 dias"
 * formatRelativeTimeLocale(-2, 'day', 'en') // "2 days ago"
 * formatRelativeTimeLocale(3, 'hour', 'pt-BR') // "em 3 horas"
 */
export function formatRelativeTimeLocale(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale,
  options: RelativeTimeFormatOptions = {}
): string {
  const { numeric = 'auto', style = 'long' } = options;

  const intlLocale = INTL_LOCALES[locale];

  return new Intl.RelativeTimeFormat(intlLocale, {
    numeric,
    style,
  }).format(value, unit);
}

/**
 * Formats a date as relative time from now
 *
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted relative time string
 *
 * @example
 * // If now is Jan 15, 2024
 * formatRelativeDateLocale(new Date(2024, 0, 13), 'en') // "2 days ago"
 * formatRelativeDateLocale(new Date(2024, 0, 13), 'pt-BR') // "há 2 dias"
 */
export function formatRelativeDateLocale(date: Date, locale: SupportedLocale): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  // Choose the most appropriate unit
  if (Math.abs(diffSeconds) < 60) {
    return formatRelativeTimeLocale(diffSeconds, 'second', locale);
  } else if (Math.abs(diffMinutes) < 60) {
    return formatRelativeTimeLocale(diffMinutes, 'minute', locale);
  } else if (Math.abs(diffHours) < 24) {
    return formatRelativeTimeLocale(diffHours, 'hour', locale);
  } else if (Math.abs(diffDays) < 7) {
    return formatRelativeTimeLocale(diffDays, 'day', locale);
  } else if (Math.abs(diffWeeks) < 4) {
    return formatRelativeTimeLocale(diffWeeks, 'week', locale);
  } else if (Math.abs(diffMonths) < 12) {
    return formatRelativeTimeLocale(diffMonths, 'month', locale);
  } else {
    return formatRelativeTimeLocale(diffYears, 'year', locale);
  }
}

/**
 * Gets the month name for a given month index
 *
 * @param monthIndex - Month index (0-11)
 * @param locale - Locale for formatting
 * @param style - Month name style (default: 'long')
 * @returns Month name
 *
 * @example
 * getMonthName(0, 'pt-BR') // "janeiro"
 * getMonthName(0, 'en') // "January"
 * getMonthName(0, 'pt-BR', 'short') // "jan."
 */
export function getMonthName(
  monthIndex: number,
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error('Month index must be between 0 and 11');
  }

  const intlLocale = INTL_LOCALES[locale];
  const date = new Date(2024, monthIndex, 1);

  return new Intl.DateTimeFormat(intlLocale, { month: style }).format(date);
}

/**
 * Gets the weekday name for a given weekday index
 *
 * @param weekdayIndex - Weekday index (0-6, 0 = Sunday)
 * @param locale - Locale for formatting
 * @param style - Weekday name style (default: 'long')
 * @returns Weekday name
 *
 * @example
 * getWeekdayName(0, 'pt-BR') // "domingo"
 * getWeekdayName(0, 'en') // "Sunday"
 * getWeekdayName(1, 'pt-BR', 'short') // "seg."
 */
export function getWeekdayName(
  weekdayIndex: number,
  locale: SupportedLocale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  if (weekdayIndex < 0 || weekdayIndex > 6) {
    throw new Error('Weekday index must be between 0 and 6');
  }

  const intlLocale = INTL_LOCALES[locale];
  // Use a known date and add days to get the correct weekday
  // Jan 7, 2024 is a Sunday (weekday 0)
  const date = new Date(2024, 0, 7 + weekdayIndex);

  return new Intl.DateTimeFormat(intlLocale, { weekday: style }).format(date);
}

/**
 * Gets the decimal separator for a locale
 *
 * @param locale - Locale to get separator for
 * @returns Decimal separator character
 *
 * @example
 * getDecimalSeparator('pt-BR') // ","
 * getDecimalSeparator('en') // "."
 */
export function getDecimalSeparator(locale: SupportedLocale): string {
  const intlLocale = INTL_LOCALES[locale];
  const formatter = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 1,
  });

  const parts = formatter.formatToParts(1.1);
  const decimalPart = parts.find((part) => part.type === 'decimal');
  return decimalPart?.value ?? (locale === 'pt-BR' ? ',' : '.');
}

/**
 * Gets the grouping (thousands) separator for a locale
 *
 * @param locale - Locale to get separator for
 * @returns Grouping separator character
 *
 * @example
 * getGroupingSeparator('pt-BR') // "."
 * getGroupingSeparator('en') // ","
 */
export function getGroupingSeparator(locale: SupportedLocale): string {
  const intlLocale = INTL_LOCALES[locale];
  const formatter = new Intl.NumberFormat(intlLocale);

  const parts = formatter.formatToParts(1000);
  const groupPart = parts.find((part) => part.type === 'group');
  return groupPart?.value ?? (locale === 'pt-BR' ? '.' : ',');
}

/**
 * Gets the currency symbol for a locale
 *
 * @param locale - Locale to get symbol for
 * @returns Currency symbol
 *
 * @example
 * getCurrencySymbol('pt-BR') // "R$"
 * getCurrencySymbol('en') // "$"
 */
export function getCurrencySymbol(locale: SupportedLocale): string {
  const intlLocale = INTL_LOCALES[locale];
  const currency = CURRENCY_CODES[locale];

  const formatter = new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
  });

  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find((part) => part.type === 'currency');
  return symbolPart?.value ?? (locale === 'pt-BR' ? 'R$' : '$');
}

/**
 * Gets the currency code for a locale
 *
 * @param locale - Locale to get currency code for
 * @returns Currency code (e.g., 'BRL', 'USD')
 */
export function getCurrencyCode(locale: SupportedLocale): string {
  return CURRENCY_CODES[locale];
}

/**
 * Parses a locale-formatted number string back to a number
 *
 * @param value - Formatted number string
 * @param locale - Locale used for formatting
 * @returns Parsed number or NaN if invalid
 *
 * @example
 * parseNumberLocale("1.234,56", 'pt-BR') // 1234.56
 * parseNumberLocale("1,234.56", 'en') // 1234.56
 */
export function parseNumberLocale(value: string, locale: SupportedLocale): number {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  let cleaned = value.trim();

  // Check for negative sign
  const isNegative = cleaned.startsWith('-') || cleaned.includes('(');
  cleaned = cleaned.replace(/^-/, '').replace(/[()]/g, '');

  // Handle locale-specific separators
  if (locale === 'pt-BR') {
    // pt-BR uses . for grouping and , for decimal
    cleaned = cleaned.replace(/\./g, ''); // Remove grouping separators
    cleaned = cleaned.replace(',', '.'); // Convert decimal separator
  } else {
    // en uses , for grouping and . for decimal
    cleaned = cleaned.replace(/,/g, ''); // Remove grouping separators
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return NaN;
  }

  return isNegative ? -parsed : parsed;
}

/**
 * Parses a locale-formatted currency string back to a number
 *
 * @param value - Formatted currency string
 * @param locale - Locale used for formatting
 * @returns Parsed number or NaN if invalid
 *
 * @example
 * parseCurrencyLocale("R$ 1.234,56", 'pt-BR') // 1234.56
 * parseCurrencyLocale("$1,234.56", 'en') // 1234.56
 */
export function parseCurrencyLocale(value: string, locale: SupportedLocale): number {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  // Remove currency symbols and whitespace
  let cleaned = value.trim();

  // Check for negative sign
  const isNegative = cleaned.startsWith('-') || cleaned.includes('(');
  cleaned = cleaned.replace(/^-/, '').replace(/[()]/g, '');

  // Remove currency symbols (R$, $, €, £, ¥, etc.)
  cleaned = cleaned.replace(/[R$€£¥]/g, '').trim();

  return parseNumberLocale(isNegative ? `-${cleaned}` : cleaned, locale);
}
