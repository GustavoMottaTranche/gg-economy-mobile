/**
 * Unit tests for calculateTotals utility
 */

import {
  calculateTotals,
  calculateCategoryBreakdown,
  calculateFinancialSummary,
  calculateMonthlyTotals,
  generateMonthRange,
  getLastNMonths,
  validateFinancialInvariant,
  FinancialSummary,
} from '../../../src/utils/calculateTotals';
import { Transaction, Category } from '../../../src/types';

// Helper to create test transactions
function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'test-id',
    title: '',
    date: new Date(2024, 0, 15),
    amount: 100,
    description: 'Test transaction',
    categoryId: null,
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create test categories
function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Test Category',
    type: 'expense',
    icon: 'test-icon',
    color: '#FF0000',
    isActive: true,
    expenseGroup: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('calculateTotals', () => {
  it('calculates totals for empty array', () => {
    const result = calculateTotals([]);
    expect(result).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
    });
  });

  it('calculates income correctly', () => {
    const transactions = [createTransaction({ amount: 1000 }), createTransaction({ amount: 500 })];
    const result = calculateTotals(transactions);
    expect(result.totalIncome).toBe(1500);
    expect(result.totalExpenses).toBe(0);
    expect(result.balance).toBe(1500);
  });

  it('calculates expenses correctly', () => {
    const transactions = [createTransaction({ amount: -100 }), createTransaction({ amount: -50 })];
    const result = calculateTotals(transactions);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(150);
    expect(result.balance).toBe(-150);
  });

  it('calculates mixed income and expenses', () => {
    const transactions = [
      createTransaction({ amount: 1000 }),
      createTransaction({ amount: -300 }),
      createTransaction({ amount: 500 }),
      createTransaction({ amount: -200 }),
    ];
    const result = calculateTotals(transactions);
    expect(result.totalIncome).toBe(1500);
    expect(result.totalExpenses).toBe(500);
    expect(result.balance).toBe(1000);
  });

  it('excludes transactions marked as excluded', () => {
    const transactions = [
      createTransaction({ amount: 1000 }),
      createTransaction({ amount: -500, isExcludedFromTotals: true }),
    ];
    const result = calculateTotals(transactions);
    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(0);
    expect(result.transactionCount).toBe(1);
  });

  it('includes excluded transactions when option is set', () => {
    const transactions = [
      createTransaction({ amount: 1000 }),
      createTransaction({ amount: -500, isExcludedFromTotals: true }),
    ];
    const result = calculateTotals(transactions, { includeExcluded: true });
    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(500);
    expect(result.transactionCount).toBe(2);
  });

  it('filters by reference month', () => {
    const transactions = [
      createTransaction({ amount: 1000, referenceMonth: '2024-01' }),
      createTransaction({ amount: 500, referenceMonth: '2024-02' }),
    ];
    const result = calculateTotals(transactions, { referenceMonth: '2024-01' });
    expect(result.totalIncome).toBe(1000);
    expect(result.transactionCount).toBe(1);
  });

  it('handles zero amounts', () => {
    const transactions = [createTransaction({ amount: 0 })];
    const result = calculateTotals(transactions);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.balance).toBe(0);
  });
});

describe('calculateCategoryBreakdown', () => {
  const categories: Category[] = [
    createCategory({ id: 'cat-1', name: 'Food', color: '#FF0000' }),
    createCategory({ id: 'cat-2', name: 'Transport', color: '#00FF00' }),
  ];

  it('returns empty array for no transactions', () => {
    const result = calculateCategoryBreakdown([], categories, 'expense');
    expect(result).toEqual([]);
  });

  it('groups expenses by category', () => {
    const transactions = [
      createTransaction({ amount: -100, categoryId: 'cat-1' }),
      createTransaction({ amount: -50, categoryId: 'cat-1' }),
      createTransaction({ amount: -75, categoryId: 'cat-2' }),
    ];
    const result = calculateCategoryBreakdown(transactions, categories, 'expense');

    expect(result).toHaveLength(2);

    const foodCategory = result.find((r) => r.categoryId === 'cat-1');
    expect(foodCategory!.total).toBe(150);
    expect(foodCategory!.count).toBe(2);

    const transportCategory = result.find((r) => r.categoryId === 'cat-2');
    expect(transportCategory!.total).toBe(75);
    expect(transportCategory!.count).toBe(1);
  });

  it('groups income by category', () => {
    const transactions = [
      createTransaction({ amount: 1000, categoryId: 'cat-1' }),
      createTransaction({ amount: 500, categoryId: 'cat-2' }),
    ];
    const result = calculateCategoryBreakdown(transactions, categories, 'income');

    expect(result).toHaveLength(2);
    expect(result[0]!.total).toBe(1000);
    expect(result[1]!.total).toBe(500);
  });

  it('handles uncategorized transactions', () => {
    const transactions = [createTransaction({ amount: -100, categoryId: null })];
    const result = calculateCategoryBreakdown(transactions, categories, 'expense');

    expect(result).toHaveLength(1);
    expect(result[0]!.categoryId).toBeNull();
    expect(result[0]!.categoryName).toBe('Uncategorized');
    expect(result[0]!.categoryColor).toBe('#808080');
  });

  it('calculates percentages correctly', () => {
    const transactions = [
      createTransaction({ amount: -75, categoryId: 'cat-1' }),
      createTransaction({ amount: -25, categoryId: 'cat-2' }),
    ];
    const result = calculateCategoryBreakdown(transactions, categories, 'expense');

    const foodCategory = result.find((r) => r.categoryId === 'cat-1');
    expect(foodCategory!.percentage).toBe(75);

    const transportCategory = result.find((r) => r.categoryId === 'cat-2');
    expect(transportCategory!.percentage).toBe(25);
  });

  it('sorts by total descending', () => {
    const transactions = [
      createTransaction({ amount: -50, categoryId: 'cat-1' }),
      createTransaction({ amount: -100, categoryId: 'cat-2' }),
    ];
    const result = calculateCategoryBreakdown(transactions, categories, 'expense');

    expect(result[0]!.categoryId).toBe('cat-2');
    expect(result[1]!.categoryId).toBe('cat-1');
  });

  it('excludes transactions marked as excluded', () => {
    const transactions = [
      createTransaction({ amount: -100, categoryId: 'cat-1' }),
      createTransaction({ amount: -50, categoryId: 'cat-1', isExcludedFromTotals: true }),
    ];
    const result = calculateCategoryBreakdown(transactions, categories, 'expense');

    expect(result[0]!.total).toBe(100);
    expect(result[0]!.count).toBe(1);
  });
});

describe('calculateFinancialSummary', () => {
  const categories: Category[] = [
    createCategory({ id: 'cat-1', name: 'Salary', type: 'income' }),
    createCategory({ id: 'cat-2', name: 'Food', type: 'expense' }),
  ];

  it('returns complete summary', () => {
    const transactions = [
      createTransaction({ amount: 1000, categoryId: 'cat-1' }),
      createTransaction({ amount: -300, categoryId: 'cat-2' }),
    ];
    const result = calculateFinancialSummary(transactions, categories);

    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(300);
    expect(result.balance).toBe(700);
    expect(result.incomeByCategory).toHaveLength(1);
    expect(result.expensesByCategory).toHaveLength(1);
  });

  it('validates financial invariant', () => {
    const transactions = [
      createTransaction({ amount: 1000, categoryId: 'cat-1' }),
      createTransaction({ amount: 500, categoryId: 'cat-1' }),
      createTransaction({ amount: -300, categoryId: 'cat-2' }),
      createTransaction({ amount: -200, categoryId: 'cat-2' }),
    ];
    const result = calculateFinancialSummary(transactions, categories);

    expect(validateFinancialInvariant(result)).toBe(true);
  });
});

describe('calculateMonthlyTotals', () => {
  it('calculates totals for each month', () => {
    const transactions = [
      createTransaction({ amount: 1000, referenceMonth: '2024-01' }),
      createTransaction({ amount: -500, referenceMonth: '2024-01' }),
      createTransaction({ amount: 800, referenceMonth: '2024-02' }),
    ];
    const months = ['2024-01', '2024-02'];
    const result = calculateMonthlyTotals(transactions, months);

    expect(result.get('2024-01')!.totalIncome).toBe(1000);
    expect(result.get('2024-01')!.totalExpenses).toBe(500);
    expect(result.get('2024-02')!.totalIncome).toBe(800);
    expect(result.get('2024-02')!.totalExpenses).toBe(0);
  });

  it('returns zero totals for months with no transactions', () => {
    const transactions: Transaction[] = [];
    const months = ['2024-01'];
    const result = calculateMonthlyTotals(transactions, months);

    expect(result.get('2024-01')!.totalIncome).toBe(0);
    expect(result.get('2024-01')!.totalExpenses).toBe(0);
  });
});

describe('generateMonthRange', () => {
  it('generates range for same month', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 31);
    const result = generateMonthRange(start, end);

    expect(result).toEqual(['2024-01']);
  });

  it('generates range for multiple months', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 2, 31);
    const result = generateMonthRange(start, end);

    expect(result).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('generates range across years', () => {
    const start = new Date(2023, 11, 1);
    const end = new Date(2024, 1, 28);
    const result = generateMonthRange(start, end);

    expect(result).toEqual(['2023-12', '2024-01', '2024-02']);
  });
});

describe('getLastNMonths', () => {
  it('returns correct number of months', () => {
    const result = getLastNMonths(3, new Date(2024, 2, 15)); // March 2024

    expect(result).toHaveLength(3);
    expect(result).toEqual(['2024-03', '2024-02', '2024-01']);
  });

  it('handles year boundary', () => {
    const result = getLastNMonths(3, new Date(2024, 1, 15)); // February 2024

    expect(result).toEqual(['2024-02', '2024-01', '2023-12']);
  });

  it('returns single month', () => {
    const result = getLastNMonths(1, new Date(2024, 0, 15));

    expect(result).toEqual(['2024-01']);
  });
});

describe('validateFinancialInvariant', () => {
  it('returns true for valid summary', () => {
    const summary: FinancialSummary = {
      totalIncome: 1000,
      totalExpenses: 500,
      balance: 500,
      transactionCount: 2,
      incomeByCategory: [
        {
          categoryId: 'cat-1',
          categoryName: 'Salary',
          categoryColor: '#00FF00',
          total: 1000,
          percentage: 100,
          count: 1,
        },
      ],
      expensesByCategory: [
        {
          categoryId: 'cat-2',
          categoryName: 'Food',
          categoryColor: '#FF0000',
          total: 500,
          percentage: 100,
          count: 1,
        },
      ],
    };

    expect(validateFinancialInvariant(summary)).toBe(true);
  });

  it('returns false for incorrect balance', () => {
    const summary: FinancialSummary = {
      totalIncome: 1000,
      totalExpenses: 500,
      balance: 600, // Should be 500
      transactionCount: 2,
      incomeByCategory: [],
      expensesByCategory: [],
    };

    expect(validateFinancialInvariant(summary)).toBe(false);
  });

  it('returns false for incorrect income category sum', () => {
    const summary: FinancialSummary = {
      totalIncome: 1000,
      totalExpenses: 0,
      balance: 1000,
      transactionCount: 1,
      incomeByCategory: [
        {
          categoryId: 'cat-1',
          categoryName: 'Salary',
          categoryColor: '#00FF00',
          total: 800,
          percentage: 100,
          count: 1,
        }, // Should be 1000
      ],
      expensesByCategory: [],
    };

    expect(validateFinancialInvariant(summary)).toBe(false);
  });

  it('returns false for incorrect expense category sum', () => {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 500,
      balance: -500,
      transactionCount: 1,
      incomeByCategory: [],
      expensesByCategory: [
        {
          categoryId: 'cat-2',
          categoryName: 'Food',
          categoryColor: '#FF0000',
          total: 400,
          percentage: 100,
          count: 1,
        }, // Should be 500
      ],
    };

    expect(validateFinancialInvariant(summary)).toBe(false);
  });

  it('returns false for incorrect percentage sum', () => {
    const summary: FinancialSummary = {
      totalIncome: 1000,
      totalExpenses: 0,
      balance: 1000,
      transactionCount: 2,
      incomeByCategory: [
        {
          categoryId: 'cat-1',
          categoryName: 'Salary',
          categoryColor: '#00FF00',
          total: 600,
          percentage: 60,
          count: 1,
        },
        {
          categoryId: 'cat-2',
          categoryName: 'Bonus',
          categoryColor: '#00FF00',
          total: 400,
          percentage: 30,
          count: 1,
        }, // Should be 40
      ],
      expensesByCategory: [],
    };

    expect(validateFinancialInvariant(summary)).toBe(false);
  });

  it('handles empty categories', () => {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
      incomeByCategory: [],
      expensesByCategory: [],
    };

    expect(validateFinancialInvariant(summary)).toBe(true);
  });
});
