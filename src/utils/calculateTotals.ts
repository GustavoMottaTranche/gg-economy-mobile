/**
 * Financial calculation utilities for transactions
 *
 * Provides functions to calculate:
 * - Total income
 * - Total expenses
 * - Balance (income - expenses)
 * - Category breakdown
 */

import { Transaction, Category } from '../types';

/**
 * Result of financial calculations for a set of transactions
 */
export interface FinancialTotals {
  /** Total income (sum of positive amounts) */
  totalIncome: number;
  /** Total expenses (sum of negative amounts, returned as positive) */
  totalExpenses: number;
  /** Balance (income - expenses) */
  balance: number;
  /** Number of transactions included in calculation */
  transactionCount: number;
}

/**
 * Category breakdown item
 */
export interface CategoryBreakdownItem {
  /** Category ID */
  categoryId: string | null;
  /** Category name (or "Uncategorized") */
  categoryName: string;
  /** Category color (or default) */
  categoryColor: string;
  /** Total amount for this category */
  total: number;
  /** Percentage of total (0-100) */
  percentage: number;
  /** Number of transactions in this category */
  count: number;
}

/**
 * Complete financial summary with category breakdown
 */
export interface FinancialSummary extends FinancialTotals {
  /** Breakdown of income by category */
  incomeByCategory: CategoryBreakdownItem[];
  /** Breakdown of expenses by category */
  expensesByCategory: CategoryBreakdownItem[];
}

/**
 * Options for calculating totals
 */
export interface CalculateTotalsOptions {
  /** Whether to include transactions marked as excluded (default: false) */
  includeExcluded?: boolean;
  /** Filter by reference month (YYYY-MM format) */
  referenceMonth?: string;
}

/**
 * Calculates financial totals from a list of transactions
 *
 * @param transactions - List of transactions to calculate
 * @param options - Calculation options
 * @returns Financial totals (income, expenses, balance)
 *
 * @example
 * const totals = calculateTotals(transactions);
 * console.log(totals.balance); // income - expenses
 */
export function calculateTotals(
  transactions: Transaction[],
  options: CalculateTotalsOptions = {}
): FinancialTotals {
  const { includeExcluded = false, referenceMonth } = options;

  // Filter transactions
  const filtered = transactions.filter((t) => {
    // Exclude transactions marked as excluded from totals
    if (!includeExcluded && t.isExcludedFromTotals) {
      return false;
    }

    // Filter by reference month if specified
    if (referenceMonth && t.referenceMonth !== referenceMonth) {
      return false;
    }

    return true;
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const transaction of filtered) {
    if (transaction.amount > 0) {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += Math.abs(transaction.amount);
    }
  }

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactionCount: filtered.length,
  };
}

/**
 * Calculates category breakdown for transactions
 *
 * @param transactions - List of transactions
 * @param categories - List of categories for name/color lookup
 * @param type - Filter by transaction type ('income' | 'expense')
 * @param options - Calculation options
 * @returns Array of category breakdown items sorted by total (descending)
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'income' | 'expense',
  options: CalculateTotalsOptions = {}
): CategoryBreakdownItem[] {
  const { includeExcluded = false, referenceMonth } = options;

  // Create category lookup map
  const categoryMap = new Map<string, Category>();
  for (const category of categories) {
    categoryMap.set(category.id, category);
  }

  // Filter transactions by type and options
  const filtered = transactions.filter((t) => {
    // Exclude transactions marked as excluded from totals
    if (!includeExcluded && t.isExcludedFromTotals) {
      return false;
    }

    // Filter by reference month if specified
    if (referenceMonth && t.referenceMonth !== referenceMonth) {
      return false;
    }

    // Filter by type (income = positive, expense = negative)
    if (type === 'income' && t.amount <= 0) {
      return false;
    }
    if (type === 'expense' && t.amount >= 0) {
      return false;
    }

    return true;
  });

  // Group by category
  const categoryTotals = new Map<string | null, { total: number; count: number }>();

  for (const transaction of filtered) {
    const categoryId = transaction.categoryId;
    const existing = categoryTotals.get(categoryId) ?? { total: 0, count: 0 };

    categoryTotals.set(categoryId, {
      total: existing.total + Math.abs(transaction.amount),
      count: existing.count + 1,
    });
  }

  // Calculate grand total for percentages
  let grandTotal = 0;
  for (const { total } of categoryTotals.values()) {
    grandTotal += total;
  }

  // Build breakdown items
  const breakdown: CategoryBreakdownItem[] = [];

  for (const [categoryId, { total, count }] of categoryTotals) {
    const category = categoryId ? categoryMap.get(categoryId) : null;

    breakdown.push({
      categoryId,
      categoryName: category?.name ?? 'Uncategorized',
      categoryColor: category?.color ?? '#808080',
      total,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      count,
    });
  }

  // Sort by total descending
  breakdown.sort((a, b) => b.total - a.total);

  return breakdown;
}

/**
 * Calculates complete financial summary with category breakdowns
 *
 * @param transactions - List of transactions
 * @param categories - List of categories for name/color lookup
 * @param options - Calculation options
 * @returns Complete financial summary
 */
export function calculateFinancialSummary(
  transactions: Transaction[],
  categories: Category[],
  options: CalculateTotalsOptions = {}
): FinancialSummary {
  const totals = calculateTotals(transactions, options);
  const incomeByCategory = calculateCategoryBreakdown(transactions, categories, 'income', options);
  const expensesByCategory = calculateCategoryBreakdown(
    transactions,
    categories,
    'expense',
    options
  );

  return {
    ...totals,
    incomeByCategory,
    expensesByCategory,
  };
}

/**
 * Calculates monthly totals for a range of months
 *
 * @param transactions - List of transactions
 * @param months - Array of reference months (YYYY-MM format)
 * @returns Map of reference month to financial totals
 */
export function calculateMonthlyTotals(
  transactions: Transaction[],
  months: string[]
): Map<string, FinancialTotals> {
  const result = new Map<string, FinancialTotals>();

  for (const month of months) {
    result.set(month, calculateTotals(transactions, { referenceMonth: month }));
  }

  return result;
}

/**
 * Generates an array of reference months between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of reference months (YYYY-MM format)
 */
export function generateMonthRange(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];

  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    months.push(`${year}-${month}`);

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Gets the last N months as reference month strings
 *
 * @param count - Number of months to get
 * @param fromDate - Starting date (default: current date)
 * @returns Array of reference months (YYYY-MM format), most recent first
 */
export function getLastNMonths(count: number, fromDate: Date = new Date()): string[] {
  const months: string[] = [];

  const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  for (let i = 0; i < count; i++) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    months.push(`${year}-${month}`);

    current.setMonth(current.getMonth() - 1);
  }

  return months;
}

/**
 * Validates that the financial calculation invariant holds:
 * balance = totalIncome - totalExpenses
 *
 * Also validates that category totals sum to the overall totals.
 *
 * @param summary - Financial summary to validate
 * @returns True if invariants hold
 */
export function validateFinancialInvariant(summary: FinancialSummary): boolean {
  // Check balance invariant
  const expectedBalance = summary.totalIncome - summary.totalExpenses;
  if (Math.abs(summary.balance - expectedBalance) > 0.001) {
    return false;
  }

  // Check income category totals sum to totalIncome
  const incomeCategorySum = summary.incomeByCategory.reduce((sum, item) => sum + item.total, 0);
  if (Math.abs(incomeCategorySum - summary.totalIncome) > 0.001) {
    return false;
  }

  // Check expense category totals sum to totalExpenses
  const expenseCategorySum = summary.expensesByCategory.reduce((sum, item) => sum + item.total, 0);
  if (Math.abs(expenseCategorySum - summary.totalExpenses) > 0.001) {
    return false;
  }

  // Check percentages sum to 100 (or 0 if no transactions)
  if (summary.incomeByCategory.length > 0) {
    const incomePercentageSum = summary.incomeByCategory.reduce(
      (sum, item) => sum + item.percentage,
      0
    );
    if (Math.abs(incomePercentageSum - 100) > 0.001) {
      return false;
    }
  }

  if (summary.expensesByCategory.length > 0) {
    const expensePercentageSum = summary.expensesByCategory.reduce(
      (sum, item) => sum + item.percentage,
      0
    );
    if (Math.abs(expensePercentageSum - 100) > 0.001) {
      return false;
    }
  }

  return true;
}
