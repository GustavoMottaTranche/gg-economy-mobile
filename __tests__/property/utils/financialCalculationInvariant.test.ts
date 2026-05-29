/**
 * Property-Based Test: Financial Calculation Invariant (Property 5)
 *
 * **Validates: Requirements 21.2-21.7, 32.5, 32.8**
 *
 * *For any* set of transactions in a given reference month, the sum of all
 * transaction amounts grouped by category SHALL equal the total sum of all
 * transaction amounts. Additionally, total income minus total expenses SHALL
 * equal the balance.
 */
import * as fc from 'fast-check';
import {
  calculateTotals,
  calculateCategoryBreakdown,
  calculateFinancialSummary,
  validateFinancialInvariant,
} from '../../../src/utils/calculateTotals';
import { Transaction, Category } from '../../../src/types';

describe('Property 5: Financial Calculation Invariant', () => {
  /**
   * Arbitrary for generating valid transaction amounts
   * Using reasonable financial amounts (avoiding extreme values)
   */
  const amountArb = fc
    .double({
      min: -100000,
      max: 100000,
      noNaN: true,
      noDefaultInfinity: true,
    })
    .filter((n) => Number.isFinite(n));

  /**
   * Arbitrary for generating category IDs
   */
  const categoryIdArb = fc.oneof(
    fc.constant(null),
    fc.constantFrom('cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5')
  );

  /**
   * Arbitrary for generating reference months
   */
  const referenceMonthArb = fc.constantFrom(
    '2024-01',
    '2024-02',
    '2024-03',
    '2024-04',
    '2024-05',
    '2024-06'
  );

  /**
   * Helper to create a transaction with given properties
   */
  function createTransaction(
    amount: number,
    categoryId: string | null,
    referenceMonth: string,
    isExcluded: boolean = false
  ): Transaction {
    return {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(2024, 0, 15),
      amount,
      description: 'Test transaction',
      title: '',
      categoryId,
      originId: null,
      batchId: null,
      referenceMonth,
      needsReview: false,
      isExcludedFromTotals: isExcluded,
      duplicateOf: null,
      installmentGroupId: null,
      recurringId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Test categories for breakdown calculations
   */
  const testCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Food',
      type: 'expense',
      icon: 'food',
      color: '#FF0000',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date(),
    },
    {
      id: 'cat-2',
      name: 'Transport',
      type: 'expense',
      icon: 'car',
      color: '#00FF00',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date(),
    },
    {
      id: 'cat-3',
      name: 'Salary',
      type: 'income',
      icon: 'money',
      color: '#0000FF',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date(),
    },
    {
      id: 'cat-4',
      name: 'Bonus',
      type: 'income',
      icon: 'gift',
      color: '#FFFF00',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date(),
    },
    {
      id: 'cat-5',
      name: 'Bills',
      type: 'expense',
      icon: 'bill',
      color: '#FF00FF',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date(),
    },
  ];

  /**
   * Arbitrary for generating a list of transactions
   */
  const transactionListArb = fc
    .array(
      fc.record({
        amount: amountArb,
        categoryId: categoryIdArb,
        referenceMonth: referenceMonthArb,
        isExcluded: fc.boolean(),
      }),
      { minLength: 0, maxLength: 50 }
    )
    .map((items) =>
      items.map((item) =>
        createTransaction(item.amount, item.categoryId, item.referenceMonth, item.isExcluded)
      )
    );

  describe('Balance Invariant', () => {
    it('balance should equal income minus expenses', () => {
      /**
       * Property: For any set of transactions, balance = totalIncome - totalExpenses
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals = calculateTotals(transactions);

          const expectedBalance = totals.totalIncome - totals.totalExpenses;

          expect(totals.balance).toBeCloseTo(expectedBalance, 10);
        }),
        { numRuns: 100 }
      );
    });

    it('balance should be consistent across multiple calculations', () => {
      /**
       * Property: Calculating totals multiple times should produce identical results
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals1 = calculateTotals(transactions);
          const totals2 = calculateTotals(transactions);

          expect(totals1.totalIncome).toBe(totals2.totalIncome);
          expect(totals1.totalExpenses).toBe(totals2.totalExpenses);
          expect(totals1.balance).toBe(totals2.balance);
          expect(totals1.transactionCount).toBe(totals2.transactionCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Category Sum Invariant', () => {
    it('income category totals should sum to total income', () => {
      /**
       * Property: Sum of all income category totals should equal totalIncome
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals = calculateTotals(transactions);
          const incomeBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'income'
          );

          const categorySum = incomeBreakdown.reduce((sum, item) => sum + item.total, 0);

          expect(categorySum).toBeCloseTo(totals.totalIncome, 10);
        }),
        { numRuns: 100 }
      );
    });

    it('expense category totals should sum to total expenses', () => {
      /**
       * Property: Sum of all expense category totals should equal totalExpenses
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals = calculateTotals(transactions);
          const expenseBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'expense'
          );

          const categorySum = expenseBreakdown.reduce((sum, item) => sum + item.total, 0);

          expect(categorySum).toBeCloseTo(totals.totalExpenses, 10);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Percentage Invariant', () => {
    it('income category percentages should sum to 100', () => {
      /**
       * Property: When there is income, category percentages should sum to 100
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const incomeBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'income'
          );

          if (incomeBreakdown.length > 0) {
            const percentageSum = incomeBreakdown.reduce((sum, item) => sum + item.percentage, 0);

            expect(percentageSum).toBeCloseTo(100, 10);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('expense category percentages should sum to 100', () => {
      /**
       * Property: When there are expenses, category percentages should sum to 100
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const expenseBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'expense'
          );

          if (expenseBreakdown.length > 0) {
            const percentageSum = expenseBreakdown.reduce((sum, item) => sum + item.percentage, 0);

            expect(percentageSum).toBeCloseTo(100, 10);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Financial Summary Invariant', () => {
    it('financial summary should pass validation', () => {
      /**
       * Property: Any calculated financial summary should pass the invariant validation
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const summary = calculateFinancialSummary(transactions, testCategories);

          expect(validateFinancialInvariant(summary)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('summary totals should match individual calculations', () => {
      /**
       * Property: Financial summary totals should match calculateTotals results
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals = calculateTotals(transactions);
          const summary = calculateFinancialSummary(transactions, testCategories);

          expect(summary.totalIncome).toBe(totals.totalIncome);
          expect(summary.totalExpenses).toBe(totals.totalExpenses);
          expect(summary.balance).toBe(totals.balance);
          expect(summary.transactionCount).toBe(totals.transactionCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Exclusion Handling', () => {
    it('excluded transactions should not affect totals', () => {
      /**
       * Property: Transactions marked as excluded should not be counted in totals
       */
      fc.assert(
        fc.property(
          fc.array(amountArb, { minLength: 1, maxLength: 20 }),
          fc.array(amountArb, { minLength: 1, maxLength: 20 }),
          (includedAmounts, excludedAmounts) => {
            const includedTxs = includedAmounts.map((amount) =>
              createTransaction(amount, null, '2024-01', false)
            );
            const excludedTxs = excludedAmounts.map((amount) =>
              createTransaction(amount, null, '2024-01', true)
            );

            const allTransactions = [...includedTxs, ...excludedTxs];
            const totals = calculateTotals(allTransactions);

            // Calculate expected totals from included only
            let expectedIncome = 0;
            let expectedExpenses = 0;
            for (const amount of includedAmounts) {
              if (amount > 0) expectedIncome += amount;
              else expectedExpenses += Math.abs(amount);
            }

            expect(totals.totalIncome).toBeCloseTo(expectedIncome, 10);
            expect(totals.totalExpenses).toBeCloseTo(expectedExpenses, 10);
            expect(totals.transactionCount).toBe(includedAmounts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('includeExcluded option should include all transactions', () => {
      /**
       * Property: With includeExcluded=true, all transactions should be counted
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totalsWithExcluded = calculateTotals(transactions, { includeExcluded: true });

          // Count all transactions regardless of exclusion flag
          let expectedIncome = 0;
          let expectedExpenses = 0;
          for (const tx of transactions) {
            if (tx.amount > 0) expectedIncome += tx.amount;
            else expectedExpenses += Math.abs(tx.amount);
          }

          expect(totalsWithExcluded.totalIncome).toBeCloseTo(expectedIncome, 10);
          expect(totalsWithExcluded.totalExpenses).toBeCloseTo(expectedExpenses, 10);
          expect(totalsWithExcluded.transactionCount).toBe(transactions.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Reference Month Filtering', () => {
    it('filtering by reference month should only include matching transactions', () => {
      /**
       * Property: When filtering by reference month, only matching transactions count
       */
      fc.assert(
        fc.property(transactionListArb, referenceMonthArb, (transactions, filterMonth) => {
          const filteredTotals = calculateTotals(transactions, { referenceMonth: filterMonth });

          // Calculate expected totals for the filtered month
          const matchingTxs = transactions.filter(
            (tx) => tx.referenceMonth === filterMonth && !tx.isExcludedFromTotals
          );

          let expectedIncome = 0;
          let expectedExpenses = 0;
          for (const tx of matchingTxs) {
            if (tx.amount > 0) expectedIncome += tx.amount;
            else expectedExpenses += Math.abs(tx.amount);
          }

          expect(filteredTotals.totalIncome).toBeCloseTo(expectedIncome, 10);
          expect(filteredTotals.totalExpenses).toBeCloseTo(expectedExpenses, 10);
          expect(filteredTotals.transactionCount).toBe(matchingTxs.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Transaction Count Invariant', () => {
    it('transaction count should match number of included transactions', () => {
      /**
       * Property: transactionCount should equal the number of non-excluded transactions
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const totals = calculateTotals(transactions);

          const expectedCount = transactions.filter((tx) => !tx.isExcludedFromTotals).length;

          expect(totals.transactionCount).toBe(expectedCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Category Count Invariant', () => {
    it('category breakdown counts should sum to total transaction count', () => {
      /**
       * Property: Sum of transaction counts across all categories should equal
       * the total number of transactions of that type
       */
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          const incomeBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'income'
          );
          const expenseBreakdown = calculateCategoryBreakdown(
            transactions,
            testCategories,
            'expense'
          );

          const incomeCount = incomeBreakdown.reduce((sum, item) => sum + item.count, 0);
          const expenseCount = expenseBreakdown.reduce((sum, item) => sum + item.count, 0);

          // Count actual income and expense transactions
          const actualIncomeCount = transactions.filter(
            (tx) => tx.amount > 0 && !tx.isExcludedFromTotals
          ).length;
          const actualExpenseCount = transactions.filter(
            (tx) => tx.amount < 0 && !tx.isExcludedFromTotals
          ).length;

          expect(incomeCount).toBe(actualIncomeCount);
          expect(expenseCount).toBe(actualExpenseCount);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      /**
       * Property: Empty transaction list should produce zero totals
       */
      const totals = calculateTotals([]);

      expect(totals.totalIncome).toBe(0);
      expect(totals.totalExpenses).toBe(0);
      expect(totals.balance).toBe(0);
      expect(totals.transactionCount).toBe(0);
    });

    it('should handle all-income transactions', () => {
      /**
       * Property: When all transactions are income, expenses should be zero
       */
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0.01, max: 10000, noNaN: true }), {
            minLength: 1,
            maxLength: 20,
          }),
          (amounts) => {
            const transactions = amounts
              .filter((a) => Number.isFinite(a))
              .map((amount) => createTransaction(amount, null, '2024-01'));

            if (transactions.length === 0) return;

            const totals = calculateTotals(transactions);

            expect(totals.totalExpenses).toBe(0);
            expect(totals.balance).toBe(totals.totalIncome);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all-expense transactions', () => {
      /**
       * Property: When all transactions are expenses, income should be zero
       */
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: -10000, max: -0.01, noNaN: true }), {
            minLength: 1,
            maxLength: 20,
          }),
          (amounts) => {
            const transactions = amounts
              .filter((a) => Number.isFinite(a))
              .map((amount) => createTransaction(amount, null, '2024-01'));

            if (transactions.length === 0) return;

            const totals = calculateTotals(transactions);

            expect(totals.totalIncome).toBe(0);
            expect(totals.balance).toBe(-totals.totalExpenses);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero-amount transactions', () => {
      /**
       * Property: Zero-amount transactions should not affect totals
       */
      const transactions = [
        createTransaction(0, null, '2024-01'),
        createTransaction(100, null, '2024-01'),
        createTransaction(-50, null, '2024-01'),
      ];

      const totals = calculateTotals(transactions);

      expect(totals.totalIncome).toBe(100);
      expect(totals.totalExpenses).toBe(50);
      expect(totals.balance).toBe(50);
    });
  });
});
