import {
  getWeeklyDatesForMonth,
  deriveReferenceMonth,
  getTodayBoundary,
  isPastDate,
} from './dateUtils';

describe('dateUtils', () => {
  describe('getWeeklyDatesForMonth', () => {
    it('returns all Mondays in January 2024 (has 4 Mondays starting from day 1)', () => {
      // January 2024: Mon 1, 8, 15, 22, 29 → 5 Mondays
      const result = getWeeklyDatesForMonth('2024-01', 1, '2024-01-01');
      expect(result).toEqual([
        '2024-01-01',
        '2024-01-08',
        '2024-01-15',
        '2024-01-22',
        '2024-01-29',
      ]);
      expect(result.length).toBe(5);
    });

    it('returns 4 Fridays in February 2024 (leap year)', () => {
      // February 2024 (leap year, 29 days): Fri 2, 9, 16, 23 → 4 Fridays
      const result = getWeeklyDatesForMonth('2024-02', 5, '2024-01-01');
      expect(result).toEqual(['2024-02-02', '2024-02-09', '2024-02-16', '2024-02-23']);
      expect(result.length).toBe(4);
    });

    it('returns 5 Thursdays in February 2024 (leap year)', () => {
      // February 2024 (leap year): Thu 1, 8, 15, 22, 29 → 5 Thursdays
      const result = getWeeklyDatesForMonth('2024-02', 4, '2024-01-01');
      expect(result).toEqual([
        '2024-02-01',
        '2024-02-08',
        '2024-02-15',
        '2024-02-22',
        '2024-02-29',
      ]);
      expect(result.length).toBe(5);
    });

    it('filters out dates before startDate within the same month', () => {
      // January 2024 Mondays: 1, 8, 15, 22, 29
      // startDate = 2024-01-10 → only 15, 22, 29
      const result = getWeeklyDatesForMonth('2024-01', 1, '2024-01-10');
      expect(result).toEqual(['2024-01-15', '2024-01-22', '2024-01-29']);
    });

    it('returns empty array when startDate is after the target month', () => {
      const result = getWeeklyDatesForMonth('2024-01', 1, '2024-02-01');
      expect(result).toEqual([]);
    });

    it('returns all dates when startDate is before the target month', () => {
      // March 2024 Sundays: 3, 10, 17, 24, 31 → 5 Sundays
      const result = getWeeklyDatesForMonth('2024-03', 0, '2023-01-01');
      expect(result).toEqual([
        '2024-03-03',
        '2024-03-10',
        '2024-03-17',
        '2024-03-24',
        '2024-03-31',
      ]);
    });

    it('handles December correctly', () => {
      // December 2024 Saturdays: 7, 14, 21, 28 → 4 Saturdays
      const result = getWeeklyDatesForMonth('2024-12', 6, '2024-01-01');
      expect(result).toEqual(['2024-12-07', '2024-12-14', '2024-12-21', '2024-12-28']);
    });

    it('handles Dec 31 boundary (5 Tuesdays including Dec 31)', () => {
      // December 2024 Tuesdays: 3, 10, 17, 24, 31 → 5 Tuesdays
      const result = getWeeklyDatesForMonth('2024-12', 2, '2024-01-01');
      expect(result).toEqual([
        '2024-12-03',
        '2024-12-10',
        '2024-12-17',
        '2024-12-24',
        '2024-12-31',
      ]);
      expect(result.length).toBe(5);
    });

    it('handles startDate on exact day of week within month', () => {
      // January 2024 Mondays: 1, 8, 15, 22, 29
      // startDate = 2024-01-15 (a Monday) → includes 15, 22, 29
      const result = getWeeklyDatesForMonth('2024-01', 1, '2024-01-15');
      expect(result).toEqual(['2024-01-15', '2024-01-22', '2024-01-29']);
    });

    it('returns 4 or 5 dates for any valid month', () => {
      // A month always has 4 or 5 occurrences of any given day
      const result = getWeeklyDatesForMonth('2024-06', 3, '2020-01-01');
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('deriveReferenceMonth', () => {
    it('extracts YYYY-MM from YYYY-MM-DD', () => {
      expect(deriveReferenceMonth('2024-01-15')).toBe('2024-01');
      expect(deriveReferenceMonth('2023-12-31')).toBe('2023-12');
      expect(deriveReferenceMonth('2025-06-01')).toBe('2025-06');
    });
  });

  describe('getTodayBoundary', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const result = getTodayBoundary();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns today date', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getTodayBoundary()).toBe(expected);
    });
  });

  describe('isPastDate', () => {
    it('returns true for dates strictly before today', () => {
      expect(isPastDate('2000-01-01')).toBe(true);
    });

    it('returns false for today (today is considered future)', () => {
      const today = getTodayBoundary();
      expect(isPastDate(today)).toBe(false);
    });

    it('returns false for dates after today', () => {
      expect(isPastDate('2099-12-31')).toBe(false);
    });
  });
});
