/**
 * Unit tests for formatCurrency utility
 */

import {
  formatCurrency,
  parseCurrency,
  getCurrencySymbol,
  getDecimalSeparator,
  getGroupingSeparator,
  SupportedLocale,
} from '../../../src/utils/formatCurrency';

describe('formatCurrency', () => {
  describe('pt-BR locale', () => {
    it('formats positive amount with currency symbol', () => {
      const result = formatCurrency(1234.56, { locale: 'pt-BR' });
      expect(result).toMatch(/R\$\s*1\.234,56/);
    });

    it('formats negative amount with minus sign', () => {
      const result = formatCurrency(-500, { locale: 'pt-BR' });
      expect(result).toMatch(/-R\$\s*500,00/);
    });

    it('formats zero correctly', () => {
      const result = formatCurrency(0, { locale: 'pt-BR' });
      expect(result).toMatch(/R\$\s*0,00/);
    });

    it('formats large amounts with grouping separators', () => {
      const result = formatCurrency(1234567.89, { locale: 'pt-BR' });
      expect(result).toMatch(/R\$\s*1\.234\.567,89/);
    });

    it('formats without symbol when showSymbol is false', () => {
      const result = formatCurrency(1234.56, { locale: 'pt-BR', showSymbol: false });
      expect(result).not.toContain('R$');
      expect(result).toMatch(/1\.234,56/);
    });

    it('shows positive sign when showPositiveSign is true', () => {
      const result = formatCurrency(100, { locale: 'pt-BR', showPositiveSign: true });
      expect(result).toMatch(/\+R\$\s*100,00/);
    });
  });

  describe('en locale', () => {
    it('formats positive amount with currency symbol', () => {
      const result = formatCurrency(1234.56, { locale: 'en' });
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('formats negative amount with minus sign', () => {
      const result = formatCurrency(-500, { locale: 'en' });
      expect(result).toMatch(/-\$500\.00/);
    });

    it('formats zero correctly', () => {
      const result = formatCurrency(0, { locale: 'en' });
      expect(result).toMatch(/\$0\.00/);
    });

    it('formats large amounts with grouping separators', () => {
      const result = formatCurrency(1234567.89, { locale: 'en' });
      expect(result).toMatch(/\$1,234,567\.89/);
    });
  });

  describe('default locale', () => {
    it('uses pt-BR as default locale', () => {
      const result = formatCurrency(100);
      expect(result).toMatch(/R\$/);
    });
  });

  describe('edge cases', () => {
    it('handles very small amounts', () => {
      const result = formatCurrency(0.01, { locale: 'pt-BR' });
      expect(result).toMatch(/R\$\s*0,01/);
    });

    it('handles very large amounts', () => {
      const result = formatCurrency(999999999.99, { locale: 'en' });
      expect(result).toMatch(/\$999,999,999\.99/);
    });
  });
});

describe('parseCurrency', () => {
  describe('pt-BR locale', () => {
    it('parses currency string with symbol', () => {
      const result = parseCurrency('R$ 1.234,56', 'pt-BR');
      expect(result).toBeCloseTo(1234.56, 2);
    });

    it('parses negative currency string', () => {
      const result = parseCurrency('-R$ 500,00', 'pt-BR');
      expect(result).toBeCloseTo(-500, 2);
    });

    it('parses currency string without symbol', () => {
      const result = parseCurrency('1.234,56', 'pt-BR');
      expect(result).toBeCloseTo(1234.56, 2);
    });

    it('parses simple decimal value', () => {
      const result = parseCurrency('100,50', 'pt-BR');
      expect(result).toBeCloseTo(100.5, 2);
    });
  });

  describe('en locale', () => {
    it('parses currency string with symbol', () => {
      const result = parseCurrency('$1,234.56', 'en');
      expect(result).toBeCloseTo(1234.56, 2);
    });

    it('parses negative currency string', () => {
      const result = parseCurrency('-$500.00', 'en');
      expect(result).toBeCloseTo(-500, 2);
    });

    it('parses currency string without symbol', () => {
      const result = parseCurrency('1,234.56', 'en');
      expect(result).toBeCloseTo(1234.56, 2);
    });
  });

  describe('invalid inputs', () => {
    it('returns NaN for empty string', () => {
      expect(parseCurrency('', 'pt-BR')).toBeNaN();
    });

    it('returns NaN for null', () => {
      expect(parseCurrency(null as unknown as string, 'pt-BR')).toBeNaN();
    });

    it('returns NaN for undefined', () => {
      expect(parseCurrency(undefined as unknown as string, 'pt-BR')).toBeNaN();
    });

    it('returns NaN for non-numeric string', () => {
      expect(parseCurrency('abc', 'pt-BR')).toBeNaN();
    });
  });
});

describe('getCurrencySymbol', () => {
  it('returns R$ for pt-BR', () => {
    const symbol = getCurrencySymbol('pt-BR');
    expect(symbol).toMatch(/R\$/);
  });

  it('returns $ for en', () => {
    const symbol = getCurrencySymbol('en');
    expect(symbol).toBe('$');
  });

  it('uses pt-BR as default', () => {
    const symbol = getCurrencySymbol();
    expect(symbol).toMatch(/R\$/);
  });
});

describe('getDecimalSeparator', () => {
  it('returns comma for pt-BR', () => {
    expect(getDecimalSeparator('pt-BR')).toBe(',');
  });

  it('returns period for en', () => {
    expect(getDecimalSeparator('en')).toBe('.');
  });

  it('uses pt-BR as default', () => {
    expect(getDecimalSeparator()).toBe(',');
  });
});

describe('getGroupingSeparator', () => {
  it('returns period for pt-BR', () => {
    expect(getGroupingSeparator('pt-BR')).toBe('.');
  });

  it('returns comma for en', () => {
    expect(getGroupingSeparator('en')).toBe(',');
  });

  it('uses pt-BR as default', () => {
    expect(getGroupingSeparator()).toBe('.');
  });
});
