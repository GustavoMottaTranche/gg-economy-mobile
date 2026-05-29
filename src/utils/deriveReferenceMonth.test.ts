import { deriveReferenceMonth } from './deriveReferenceMonth';

describe('deriveReferenceMonth', () => {
  it('should return "2025-01" for January 2025', () => {
    expect(deriveReferenceMonth(new Date(2025, 0, 15))).toBe('2025-01');
  });

  it('should return "2025-12" for December 2025', () => {
    expect(deriveReferenceMonth(new Date(2025, 11, 1))).toBe('2025-12');
  });

  it('should zero-pad single-digit months', () => {
    expect(deriveReferenceMonth(new Date(2024, 2, 10))).toBe('2024-03');
    expect(deriveReferenceMonth(new Date(2024, 8, 30))).toBe('2024-09');
  });

  it('should not zero-pad double-digit months', () => {
    expect(deriveReferenceMonth(new Date(2024, 9, 5))).toBe('2024-10');
    expect(deriveReferenceMonth(new Date(2024, 10, 20))).toBe('2024-11');
  });

  it('should handle different years correctly', () => {
    expect(deriveReferenceMonth(new Date(2000, 0, 1))).toBe('2000-01');
    expect(deriveReferenceMonth(new Date(1999, 5, 15))).toBe('1999-06');
    expect(deriveReferenceMonth(new Date(2030, 11, 31))).toBe('2030-12');
  });

  it('should ignore the day and time components', () => {
    const date1 = new Date(2025, 3, 1, 0, 0, 0);
    const date2 = new Date(2025, 3, 28, 23, 59, 59);
    expect(deriveReferenceMonth(date1)).toBe('2025-04');
    expect(deriveReferenceMonth(date2)).toBe('2025-04');
  });
});
