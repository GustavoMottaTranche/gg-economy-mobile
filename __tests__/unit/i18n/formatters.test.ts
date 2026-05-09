/**
 * Unit tests for i18n formatters
 *
 * Tests locale-aware formatting for dates, times, currencies, and numbers.
 *
 * **Validates: Requirements 25, 29**
 */
import {
  formatDateLocale,
  formatTimeLocale,
  formatDateTimeLocale,
  formatCurrencyLocale,
  formatNumberLocale,
  formatPercentLocale,
  formatRelativeTimeLocale,
  getMonthName,
  getWeekdayName,
  getDecimalSeparator,
  getGroupingSeparator,
  getCurrencySymbol,
  getCurrencyCode,
  parseNumberLocale,
  parseCurrencyLocale,
} from '../../../src/i18n/formatters';
import type { SupportedLocale } from '../../../src/i18n';

describe('i18n formatters', () => {
  describe('formatDateLocale', () => {
    const testDate = new Date(2024, 0, 15); // January 15, 2024

    it('should format date in pt-BR locale with short style', () => {
      const result = formatDateLocale(testDate, 'pt-BR');
      expect(result).toMatch(/15\/01\/2024/);
    });

    it('should format date in en locale with short style', () => {
      const result = formatDateLocale(testDate, 'en');
      // Short style may use 2 or 4 digit year depending on locale settings
      expect(result).toMatch(/1\/15\/(2024|24)/);
    });

    it('should format date with medium style', () => {
      const result = formatDateLocale(testDate, 'pt-BR', { dateStyle: 'medium' });
      expect(result).toContain('jan');
    });

    it('should format date with long style', () => {
      const result = formatDateLocale(testDate, 'pt-BR', { dateStyle: 'long' });
      expect(result.toLowerCase()).toContain('janeiro');
    });

    it('should include time when requested', () => {
      const dateWithTime = new Date(2024, 0, 15, 14, 30);
      const result = formatDateLocale(dateWithTime, 'pt-BR', { includeTime: true });
      expect(result).toContain('14:30');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDateLocale(new Date('invalid'), 'pt-BR')).toThrow('Invalid date provided');
    });

    it('should throw error for non-Date input', () => {
      expect(() => formatDateLocale('2024-01-15' as unknown as Date, 'pt-BR')).toThrow(
        'Invalid date provided'
      );
    });
  });

  describe('formatTimeLocale', () => {
    const testDate = new Date(2024, 0, 15, 14, 30, 45);

    it('should format time in pt-BR locale', () => {
      const result = formatTimeLocale(testDate, 'pt-BR');
      expect(result).toMatch(/14:30/);
    });

    it('should format time in en locale with AM/PM', () => {
      const result = formatTimeLocale(testDate, 'en');
      expect(result).toMatch(/2:30.*PM/i);
    });

    it('should format time with medium style', () => {
      const result = formatTimeLocale(testDate, 'pt-BR', 'medium');
      expect(result).toContain('45'); // Should include seconds
    });

    it('should throw error for invalid date', () => {
      expect(() => formatTimeLocale(new Date('invalid'), 'pt-BR')).toThrow('Invalid date provided');
    });
  });

  describe('formatDateTimeLocale', () => {
    const testDate = new Date(2024, 0, 15, 14, 30);

    it('should format date and time in pt-BR locale', () => {
      const result = formatDateTimeLocale(testDate, 'pt-BR');
      expect(result).toMatch(/15\/01\/2024/);
      expect(result).toMatch(/14:30/);
    });

    it('should format date and time in en locale', () => {
      const result = formatDateTimeLocale(testDate, 'en');
      // Short style may use 2 or 4 digit year depending on locale settings
      expect(result).toMatch(/1\/15\/(2024|24)/);
      expect(result).toMatch(/2:30.*PM/i);
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDateTimeLocale(new Date('invalid'), 'pt-BR')).toThrow(
        'Invalid date provided'
      );
    });
  });

  describe('formatCurrencyLocale', () => {
    it('should format currency in pt-BR locale (BRL)', () => {
      const result = formatCurrencyLocale(1234.56, 'pt-BR');
      expect(result).toMatch(/R\$\s*1\.234,56/);
    });

    it('should format currency in en locale (USD)', () => {
      const result = formatCurrencyLocale(1234.56, 'en');
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('should format negative amounts', () => {
      const result = formatCurrencyLocale(-500, 'pt-BR');
      expect(result).toMatch(/-R\$\s*500,00/);
    });

    it('should show positive sign when requested', () => {
      const result = formatCurrencyLocale(100, 'pt-BR', { showPositiveSign: true });
      expect(result).toMatch(/\+R\$\s*100,00/);
    });

    it('should format zero correctly', () => {
      const result = formatCurrencyLocale(0, 'pt-BR');
      expect(result).toMatch(/R\$\s*0,00/);
    });

    it('should use custom currency when specified', () => {
      const result = formatCurrencyLocale(100, 'pt-BR', { currency: 'EUR' });
      expect(result).toContain('€');
    });

    it('should respect fraction digits options', () => {
      const result = formatCurrencyLocale(100.5, 'en', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(result).toMatch(/\$10[01]/); // Rounded to 100 or 101
    });
  });

  describe('formatNumberLocale', () => {
    it('should format number in pt-BR locale', () => {
      const result = formatNumberLocale(1234.56, 'pt-BR');
      expect(result).toBe('1.234,56');
    });

    it('should format number in en locale', () => {
      const result = formatNumberLocale(1234.56, 'en');
      expect(result).toBe('1,234.56');
    });

    it('should format large numbers', () => {
      const result = formatNumberLocale(1234567.89, 'pt-BR');
      expect(result).toBe('1.234.567,89');
    });

    it('should format with compact notation', () => {
      const result = formatNumberLocale(1234567, 'en', { notation: 'compact' });
      // Compact notation may show 1M, 1.2M, or 1.23M depending on implementation
      expect(result).toMatch(/1\.?\d*M/i);
    });

    it('should respect fraction digits options', () => {
      const result = formatNumberLocale(1234.5678, 'en', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
      expect(result).toBe('1,234.5678');
    });

    it('should disable grouping when requested', () => {
      const result = formatNumberLocale(1234.56, 'en', { useGrouping: false });
      expect(result).toBe('1234.56');
    });
  });

  describe('formatPercentLocale', () => {
    it('should format percentage in pt-BR locale', () => {
      const result = formatPercentLocale(0.5, 'pt-BR');
      expect(result).toBe('50%');
    });

    it('should format percentage in en locale', () => {
      const result = formatPercentLocale(0.5, 'en');
      expect(result).toBe('50%');
    });

    it('should format with fraction digits', () => {
      const result = formatPercentLocale(0.1234, 'en', 2);
      expect(result).toBe('12.34%');
    });

    it('should format small percentages', () => {
      const result = formatPercentLocale(0.001, 'en', 1);
      expect(result).toBe('0.1%');
    });
  });

  describe('formatRelativeTimeLocale', () => {
    it('should format past days in pt-BR', () => {
      const result = formatRelativeTimeLocale(-2, 'day', 'pt-BR');
      // pt-BR may use "anteontem" (day before yesterday) or "há 2 dias"
      expect(result.toLowerCase()).toMatch(/anteontem|2|dias|há/);
    });

    it('should format past days in en', () => {
      const result = formatRelativeTimeLocale(-2, 'day', 'en');
      expect(result.toLowerCase()).toContain('2 days ago');
    });

    it('should format future hours', () => {
      const result = formatRelativeTimeLocale(3, 'hour', 'en');
      expect(result.toLowerCase()).toContain('in 3 hours');
    });

    it('should format with numeric always option', () => {
      const result = formatRelativeTimeLocale(-1, 'day', 'en', { numeric: 'always' });
      expect(result.toLowerCase()).toContain('1 day ago');
    });
  });

  describe('getMonthName', () => {
    it('should return month name in pt-BR', () => {
      expect(getMonthName(0, 'pt-BR').toLowerCase()).toBe('janeiro');
      expect(getMonthName(11, 'pt-BR').toLowerCase()).toBe('dezembro');
    });

    it('should return month name in en', () => {
      expect(getMonthName(0, 'en')).toBe('January');
      expect(getMonthName(11, 'en')).toBe('December');
    });

    it('should return short month name', () => {
      const result = getMonthName(0, 'en', 'short');
      expect(result).toMatch(/Jan/i);
    });

    it('should throw error for invalid month index', () => {
      expect(() => getMonthName(-1, 'en')).toThrow('Month index must be between 0 and 11');
      expect(() => getMonthName(12, 'en')).toThrow('Month index must be between 0 and 11');
    });
  });

  describe('getWeekdayName', () => {
    it('should return weekday name in pt-BR', () => {
      expect(getWeekdayName(0, 'pt-BR').toLowerCase()).toBe('domingo');
      expect(getWeekdayName(1, 'pt-BR').toLowerCase()).toMatch(/segunda/);
    });

    it('should return weekday name in en', () => {
      expect(getWeekdayName(0, 'en')).toBe('Sunday');
      expect(getWeekdayName(1, 'en')).toBe('Monday');
    });

    it('should return short weekday name', () => {
      const result = getWeekdayName(0, 'en', 'short');
      expect(result).toMatch(/Sun/i);
    });

    it('should throw error for invalid weekday index', () => {
      expect(() => getWeekdayName(-1, 'en')).toThrow('Weekday index must be between 0 and 6');
      expect(() => getWeekdayName(7, 'en')).toThrow('Weekday index must be between 0 and 6');
    });
  });

  describe('getDecimalSeparator', () => {
    it('should return comma for pt-BR', () => {
      expect(getDecimalSeparator('pt-BR')).toBe(',');
    });

    it('should return period for en', () => {
      expect(getDecimalSeparator('en')).toBe('.');
    });
  });

  describe('getGroupingSeparator', () => {
    it('should return period for pt-BR', () => {
      expect(getGroupingSeparator('pt-BR')).toBe('.');
    });

    it('should return comma for en', () => {
      expect(getGroupingSeparator('en')).toBe(',');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return R$ for pt-BR', () => {
      expect(getCurrencySymbol('pt-BR')).toBe('R$');
    });

    it('should return $ for en', () => {
      expect(getCurrencySymbol('en')).toBe('$');
    });
  });

  describe('getCurrencyCode', () => {
    it('should return BRL for pt-BR', () => {
      expect(getCurrencyCode('pt-BR')).toBe('BRL');
    });

    it('should return USD for en', () => {
      expect(getCurrencyCode('en')).toBe('USD');
    });
  });

  describe('parseNumberLocale', () => {
    it('should parse pt-BR formatted number', () => {
      expect(parseNumberLocale('1.234,56', 'pt-BR')).toBe(1234.56);
    });

    it('should parse en formatted number', () => {
      expect(parseNumberLocale('1,234.56', 'en')).toBe(1234.56);
    });

    it('should parse negative numbers', () => {
      expect(parseNumberLocale('-1.234,56', 'pt-BR')).toBe(-1234.56);
    });

    it('should parse numbers in parentheses as negative', () => {
      expect(parseNumberLocale('(1.234,56)', 'pt-BR')).toBe(-1234.56);
    });

    it('should return NaN for invalid input', () => {
      expect(parseNumberLocale('', 'pt-BR')).toBeNaN();
      expect(parseNumberLocale('abc', 'pt-BR')).toBeNaN();
    });

    it('should return NaN for null/undefined', () => {
      expect(parseNumberLocale(null as unknown as string, 'pt-BR')).toBeNaN();
      expect(parseNumberLocale(undefined as unknown as string, 'pt-BR')).toBeNaN();
    });
  });

  describe('parseCurrencyLocale', () => {
    it('should parse pt-BR formatted currency', () => {
      expect(parseCurrencyLocale('R$ 1.234,56', 'pt-BR')).toBe(1234.56);
    });

    it('should parse en formatted currency', () => {
      expect(parseCurrencyLocale('$1,234.56', 'en')).toBe(1234.56);
    });

    it('should parse negative currency', () => {
      expect(parseCurrencyLocale('-R$ 500,00', 'pt-BR')).toBe(-500);
    });

    it('should parse currency without symbol', () => {
      expect(parseCurrencyLocale('1.234,56', 'pt-BR')).toBe(1234.56);
    });

    it('should return NaN for invalid input', () => {
      expect(parseCurrencyLocale('', 'pt-BR')).toBeNaN();
      expect(parseCurrencyLocale('abc', 'pt-BR')).toBeNaN();
    });
  });

  describe('locale consistency', () => {
    const locales: SupportedLocale[] = ['pt-BR', 'en'];

    locales.forEach((locale) => {
      describe(`${locale} locale`, () => {
        it('should have consistent decimal and grouping separators', () => {
          const decimal = getDecimalSeparator(locale);
          const grouping = getGroupingSeparator(locale);
          expect(decimal).not.toBe(grouping);
        });

        it('should format and parse numbers consistently', () => {
          const original = 1234.56;
          const formatted = formatNumberLocale(original, locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const parsed = parseNumberLocale(formatted, locale);
          expect(parsed).toBeCloseTo(original, 2);
        });

        it('should format and parse currency consistently', () => {
          const original = 1234.56;
          const formatted = formatCurrencyLocale(original, locale);
          const parsed = parseCurrencyLocale(formatted, locale);
          expect(parsed).toBeCloseTo(original, 2);
        });
      });
    });
  });
});
