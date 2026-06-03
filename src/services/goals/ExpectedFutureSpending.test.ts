import {
  calculateExpectedFutureSpending,
  CategorySpendingWithGoal,
} from './ExpectedFutureSpending';

describe('calculateExpectedFutureSpending', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateExpectedFutureSpending([])).toBe(0);
  });

  it('returns 0 when no categories have goals', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 5000, goal: null },
      { categoryId: 'cat-2', actualSpending: 3000, goal: null },
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(0);
  });

  it('sums remaining budget for categories with goals', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 3000, goal: 10000 }, // 7000 remaining
      { categoryId: 'cat-2', actualSpending: 2000, goal: 5000 }, // 3000 remaining
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(10000);
  });

  it('contributes zero when spending exceeds goal (not negative)', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 15000, goal: 10000 }, // exceeded, contributes 0
      { categoryId: 'cat-2', actualSpending: 2000, goal: 5000 }, // 3000 remaining
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(3000);
  });

  it('contributes zero when spending equals goal', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 10000, goal: 10000 }, // exactly met, contributes 0
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(0);
  });

  it('contributes full goal amount when actual spending is zero', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 0, goal: 8000 },
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(8000);
  });

  it('excludes categories without goals from the calculation', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 2000, goal: 5000 }, // 3000 remaining
      { categoryId: 'cat-2', actualSpending: 9000, goal: null }, // excluded
      { categoryId: 'cat-3', actualSpending: 1000, goal: 3000 }, // 2000 remaining
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(5000);
  });

  it('handles a mix of exceeded, met, and under-budget categories', () => {
    const categories: CategorySpendingWithGoal[] = [
      { categoryId: 'cat-1', actualSpending: 12000, goal: 10000 }, // exceeded: 0
      { categoryId: 'cat-2', actualSpending: 5000, goal: 5000 }, // met: 0
      { categoryId: 'cat-3', actualSpending: 1000, goal: 4000 }, // under: 3000
      { categoryId: 'cat-4', actualSpending: 0, goal: 2000 }, // no spending: 2000
      { categoryId: 'cat-5', actualSpending: 7000, goal: null }, // no goal: excluded
    ];
    expect(calculateExpectedFutureSpending(categories)).toBe(5000);
  });
});
