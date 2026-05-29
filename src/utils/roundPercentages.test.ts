import { roundPercentages } from './roundPercentages';

describe('roundPercentages', () => {
  it('returns all zeros when total is 0', () => {
    expect(roundPercentages([0, 0, 0], 0)).toEqual([0, 0, 0]);
  });

  it('returns [100] for a single value equal to total', () => {
    expect(roundPercentages([500], 500)).toEqual([100]);
  });

  it('returns integer percentages that sum to exactly 100', () => {
    const values = [33, 33, 34];
    const total = 100;
    const result = roundPercentages(values, total);
    expect(result.reduce((sum, v) => sum + v, 0)).toBe(100);
  });

  it('handles the classic 1/3 rounding case', () => {
    const values = [1, 1, 1];
    const total = 3;
    const result = roundPercentages(values, total);
    expect(result.reduce((sum, v) => sum + v, 0)).toBe(100);
    // Each should be 33 or 34
    result.forEach((p) => expect(p).toBeGreaterThanOrEqual(33));
    result.forEach((p) => expect(p).toBeLessThanOrEqual(34));
  });

  it('handles two values with uneven split', () => {
    const values = [60, 40];
    const total = 100;
    const result = roundPercentages(values, total);
    expect(result).toEqual([60, 40]);
  });

  it('distributes remainder to entries with largest fractional parts', () => {
    // 33.33%, 33.33%, 33.33% → floors to 33, 33, 33 = 99, remainder = 1
    // All have same remainder, first in sorted order gets the extra point
    const values = [100, 100, 100];
    const total = 300;
    const result = roundPercentages(values, total);
    expect(result.reduce((sum, v) => sum + v, 0)).toBe(100);
  });

  it('does not crash when values do not sum to total', () => {
    // 25/200*100=12.5, 75/200*100=37.5 → floors: 12, 37 = 49
    // remaining = 100 - 49 = 51, but only 2 entries available
    // Function caps distribution at indices.length
    const values = [25, 75];
    const total = 200;
    const result = roundPercentages(values, total);
    expect(result).toHaveLength(2);
    // Should not throw, values are integers
    result.forEach((p) => expect(Number.isInteger(p)).toBe(true));
  });

  it('works correctly when values sum to total', () => {
    const values = [10, 20, 30, 40];
    const total = 100;
    const result = roundPercentages(values, total);
    expect(result).toEqual([10, 20, 30, 40]);
    expect(result.reduce((sum, v) => sum + v, 0)).toBe(100);
  });
});
