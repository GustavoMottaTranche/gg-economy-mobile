/**
 * Currency formatting utility with locale support
 *
 * Supports:
 * - pt-BR: Brazilian Real (BRL) with comma decimal separator
 * - en: US Dollar (USD) with period decimal separator
 */

export type SupportedLocale = 'pt-BR' | 'en';

export interface FormatCurrencyOptions {
  /** Locale for formatting (default: 'pt-BR') */
  locale?: SupportedLocale;
  /** Whether to show currency symbol (default: true) */
  showSymbol?: boolean;
  /** Whether to show sign for positive values (default: false) */
  showPositiveSign?: boolean;
}

/**
 * Currency configuration per locale
 */
const CURRENCY_CONFIG: Record<SupportedLocale, { currency: string; locale: string }> = {
  'pt-BR': { currency: 'BRL', locale: 'pt-BR' },
  en: { currency: 'USD', locale: 'en-US' },
};

/**
 * Formats a numeric amount as currency string according to locale
 *
 * @param amount - Amount in cents (integer) or decimal value
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, { locale: 'pt-BR' }) // "R$ 1.234,56"
 * formatCurrency(1234.56, { locale: 'en' }) // "$1,234.56"
 * formatCurrency(-500, { locale: 'pt-BR' }) // "-R$ 500,00"
 */
export function formatCurrency(amount: number, options: FormatCurrencyOptions = {}): string {
  const { locale = 'pt-BR', showSymbol = true, showPositiveSign = false } = options;

  const config = CURRENCY_CONFIG[locale];

  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
 * Parses a currency string back to a numeric value
 *
 * @param value - Currency string to parse
 * @param locale - Locale used for parsing (default: 'pt-BR')
 * @returns Parsed numeric value or NaN if invalid
 *
 * @example
 * parseCurrency("R$ 1.234,56", 'pt-BR') // 1234.56
 * parseCurrency("$1,234.56", 'en') // 1234.56
 * parseCurrency("-R$ 500,00", 'pt-BR') // -500
 */
export function parseCurrency(value: string, locale: SupportedLocale = 'pt-BR'): number {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  // Remove currency symbols and whitespace
  let cleaned = value.trim();

  // Check for negative sign
  const isNegative = cleaned.startsWith('-') || cleaned.includes('(');
  cleaned = cleaned.replace(/^-/, '').replace(/[()]/g, '');

  // Remove currency symbols (R$, $, etc.)
  cleaned = cleaned.replace(/[R$€£¥]/g, '').trim();

  // Handle locale-specific decimal and grouping separators
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
 * Gets the currency symbol for a locale
 *
 * @param locale - Locale to get symbol for
 * @returns Currency symbol
 */
export function getCurrencySymbol(locale: SupportedLocale = 'pt-BR'): string {
  const config = CURRENCY_CONFIG[locale];
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  });

  // Extract symbol from formatted zero
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find((part) => part.type === 'currency');
  return symbolPart?.value ?? (locale === 'pt-BR' ? 'R$' : '$');
}

/**
 * Gets the decimal separator for a locale
 *
 * @param locale - Locale to get separator for
 * @returns Decimal separator character
 */
export function getDecimalSeparator(locale: SupportedLocale = 'pt-BR'): string {
  const config = CURRENCY_CONFIG[locale];
  const formatter = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 1,
  });

  const parts = formatter.formatToParts(1.1);
  const decimalPart = parts.find((part) => part.type === 'decimal');
  return decimalPart?.value ?? (locale === 'pt-BR' ? ',' : '.');
}

/**
 * Gets the grouping separator for a locale
 *
 * @param locale - Locale to get separator for
 * @returns Grouping separator character
 */
export function getGroupingSeparator(locale: SupportedLocale = 'pt-BR'): string {
  const config = CURRENCY_CONFIG[locale];
  const formatter = new Intl.NumberFormat(config.locale);

  const parts = formatter.formatToParts(1000);
  const groupPart = parts.find((part) => part.type === 'group');
  return groupPart?.value ?? (locale === 'pt-BR' ? '.' : ',');
}
