/**
 * Unit tests for formatDate utility
 */

import {
  formatDate,
  parseDate,
  detectDateFormat,
  formatDateLocalized,
  formatDateTime,
  getReferenceMonth,
  parseReferenceMonth,
  isSameDay,
  isSameMonth,
  DateFormat,
} from '../../../src/utils/formatDate';

describe('formatDate', () => {
  const testDate = new Date(2024, 0, 15); // January 15, 2024

  describe('DD/MM/YYYY format', () => {
    it('formats date correctly', () => {
      const result = formatDate(testDate, { format: 'DD/MM/YYYY' });
      expect(result).toBe('15/01/2024');
    });

    it('pads single digit day and month', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      const result = formatDate(date, { format: 'DD/MM/YYYY' });
      expect(result).toBe('05/01/2024');
    });
  });

  describe('MM/DD/YYYY format', () => {
    it('formats date correctly', () => {
      const result = formatDate(testDate, { format: 'MM/DD/YYYY' });
      expect(result).toBe('01/15/2024');
    });
  });

  describe('YYYY-MM-DD format', () => {
    it('formats date correctly', () => {
      const result = formatDate(testDate, { format: 'YYYY-MM-DD' });
      expect(result).toBe('2024-01-15');
    });
  });

  describe('locale-based defaults', () => {
    it('uses DD/MM/YYYY for pt-BR locale', () => {
      const result = formatDate(testDate, { locale: 'pt-BR' });
      expect(result).toBe('15/01/2024');
    });

    it('uses MM/DD/YYYY for en locale', () => {
      const result = formatDate(testDate, { locale: 'en' });
      expect(result).toBe('01/15/2024');
    });

    it('uses pt-BR as default locale', () => {
      const result = formatDate(testDate);
      expect(result).toBe('15/01/2024');
    });
  });

  describe('includeTime option', () => {
    it('includes time when option is true', () => {
      const dateWithTime = new Date(2024, 0, 15, 14, 30);
      const result = formatDate(dateWithTime, { includeTime: true });
      expect(result).toBe('15/01/2024 14:30');
    });

    it('pads single digit hours and minutes', () => {
      const dateWithTime = new Date(2024, 0, 15, 9, 5);
      const result = formatDate(dateWithTime, { includeTime: true });
      expect(result).toBe('15/01/2024 09:05');
    });
  });

  describe('error handling', () => {
    it('throws error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date provided');
    });

    it('throws error for non-Date object', () => {
      expect(() => formatDate('2024-01-15' as unknown as Date)).toThrow();
    });
  });
});

describe('parseDate', () => {
  describe('DD/MM/YYYY format', () => {
    it('parses date correctly', () => {
      const result = parseDate('15/01/2024', { format: 'DD/MM/YYYY' });
      expect(result).toEqual(new Date(2024, 0, 15));
    });

    it('parses date with pt-BR locale default', () => {
      const result = parseDate('15/01/2024', { locale: 'pt-BR' });
      expect(result).toEqual(new Date(2024, 0, 15));
    });
  });

  describe('MM/DD/YYYY format', () => {
    it('parses date correctly', () => {
      const result = parseDate('01/15/2024', { format: 'MM/DD/YYYY' });
      expect(result).toEqual(new Date(2024, 0, 15));
    });

    it('parses date with en locale default', () => {
      const result = parseDate('01/15/2024', { locale: 'en' });
      expect(result).toEqual(new Date(2024, 0, 15));
    });
  });

  describe('YYYY-MM-DD format', () => {
    it('parses date correctly', () => {
      const result = parseDate('2024-01-15', { format: 'YYYY-MM-DD' });
      expect(result).toEqual(new Date(2024, 0, 15));
    });

    it('auto-detects ISO format', () => {
      const result = parseDate('2024-01-15');
      expect(result).toEqual(new Date(2024, 0, 15));
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('returns null for null', () => {
      expect(parseDate(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseDate(undefined as unknown as string)).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseDate('invalid')).toBeNull();
    });

    it('returns null for invalid month', () => {
      expect(parseDate('15/13/2024', { format: 'DD/MM/YYYY' })).toBeNull();
    });

    it('returns null for invalid day', () => {
      expect(parseDate('32/01/2024', { format: 'DD/MM/YYYY' })).toBeNull();
    });

    it('returns null for invalid date like Feb 30', () => {
      expect(parseDate('30/02/2024', { format: 'DD/MM/YYYY' })).toBeNull();
    });

    it('returns null for year out of range', () => {
      expect(parseDate('15/01/1800', { format: 'DD/MM/YYYY' })).toBeNull();
    });
  });
});

describe('detectDateFormat', () => {
  it('detects YYYY-MM-DD format', () => {
    expect(detectDateFormat('2024-01-15')).toBe('YYYY-MM-DD');
  });

  it('detects DD/MM/YYYY when first part > 12', () => {
    expect(detectDateFormat('15/01/2024')).toBe('DD/MM/YYYY');
  });

  it('detects MM/DD/YYYY when second part > 12', () => {
    expect(detectDateFormat('01/15/2024')).toBe('MM/DD/YYYY');
  });

  it('returns null for ambiguous dates', () => {
    expect(detectDateFormat('01/05/2024')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(detectDateFormat('invalid')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectDateFormat('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(detectDateFormat(null as unknown as string)).toBeNull();
  });
});

describe('formatDateLocalized', () => {
  const testDate = new Date(2024, 0, 15);

  it('formats date for pt-BR locale', () => {
    const result = formatDateLocalized(testDate, 'pt-BR', 'short');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats date for en locale', () => {
    const result = formatDateLocalized(testDate, 'en', 'short');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('throws error for invalid date', () => {
    expect(() => formatDateLocalized(new Date('invalid'))).toThrow('Invalid date provided');
  });
});

describe('formatDateTime', () => {
  it('formats date and time for pt-BR locale', () => {
    const dateWithTime = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTime(dateWithTime, 'pt-BR');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats date and time for en locale', () => {
    const dateWithTime = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTime(dateWithTime, 'en');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('throws error for invalid date', () => {
    expect(() => formatDateTime(new Date('invalid'))).toThrow('Invalid date provided');
  });
});

describe('getReferenceMonth', () => {
  it('returns correct reference month', () => {
    const date = new Date(2024, 0, 15);
    expect(getReferenceMonth(date)).toBe('2024-01');
  });

  it('pads single digit month', () => {
    const date = new Date(2024, 8, 15); // September
    expect(getReferenceMonth(date)).toBe('2024-09');
  });

  it('handles December correctly', () => {
    const date = new Date(2024, 11, 15);
    expect(getReferenceMonth(date)).toBe('2024-12');
  });

  it('throws error for invalid date', () => {
    expect(() => getReferenceMonth(new Date('invalid'))).toThrow('Invalid date provided');
  });
});

describe('parseReferenceMonth', () => {
  it('parses valid reference month', () => {
    const result = parseReferenceMonth('2024-01');
    expect(result).toEqual(new Date(2024, 0, 1));
  });

  it('parses December correctly', () => {
    const result = parseReferenceMonth('2024-12');
    expect(result).toEqual(new Date(2024, 11, 1));
  });

  it('returns null for invalid format', () => {
    expect(parseReferenceMonth('2024/01')).toBeNull();
    expect(parseReferenceMonth('2024-1')).toBeNull();
    expect(parseReferenceMonth('24-01')).toBeNull();
  });

  it('returns null for invalid month', () => {
    expect(parseReferenceMonth('2024-13')).toBeNull();
    expect(parseReferenceMonth('2024-00')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseReferenceMonth('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseReferenceMonth(null as unknown as string)).toBeNull();
  });
});

describe('isSameDay', () => {
  it('returns true for same day', () => {
    const date1 = new Date(2024, 0, 15, 10, 30);
    const date2 = new Date(2024, 0, 15, 14, 45);
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it('returns false for different days', () => {
    const date1 = new Date(2024, 0, 15);
    const date2 = new Date(2024, 0, 16);
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('returns false for different months', () => {
    const date1 = new Date(2024, 0, 15);
    const date2 = new Date(2024, 1, 15);
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('returns false for different years', () => {
    const date1 = new Date(2024, 0, 15);
    const date2 = new Date(2025, 0, 15);
    expect(isSameDay(date1, date2)).toBe(false);
  });
});

describe('isSameMonth', () => {
  it('returns true for same month', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 31);
    expect(isSameMonth(date1, date2)).toBe(true);
  });

  it('returns false for different months', () => {
    const date1 = new Date(2024, 0, 15);
    const date2 = new Date(2024, 1, 15);
    expect(isSameMonth(date1, date2)).toBe(false);
  });

  it('returns false for different years', () => {
    const date1 = new Date(2024, 0, 15);
    const date2 = new Date(2025, 0, 15);
    expect(isSameMonth(date1, date2)).toBe(false);
  });
});
