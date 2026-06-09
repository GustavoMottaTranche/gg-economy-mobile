import {
  calculateFundBalance,
  filterDeductionsByMonth,
  FundBalanceInput,
  TransactionWithMonth,
} from './FundBalanceCalculationService';

describe('calculateFundBalance', () => {
  it('returns base plus allocations minus deductions', () => {
    const input: FundBalanceInput = {
      baseAmount: 100000,
      totalAllocations: 50000,
      totalDeductions: 30000,
    };
    expect(calculateFundBalance(input)).toBe(120000);
  });

  it('returns base amount when no allocations or deductions', () => {
    const input: FundBalanceInput = {
      baseAmount: 200000,
      totalAllocations: 0,
      totalDeductions: 0,
    };
    expect(calculateFundBalance(input)).toBe(200000);
  });

  it('returns zero when deductions equal base plus allocations', () => {
    const input: FundBalanceInput = {
      baseAmount: 100000,
      totalAllocations: 50000,
      totalDeductions: 150000,
    };
    expect(calculateFundBalance(input)).toBe(0);
  });

  it('can return a negative value when deductions exceed base plus allocations', () => {
    const input: FundBalanceInput = {
      baseAmount: 50000,
      totalAllocations: 30000,
      totalDeductions: 100000,
    };
    expect(calculateFundBalance(input)).toBe(-20000);
  });

  it('returns allocations when base amount is zero', () => {
    const input: FundBalanceInput = {
      baseAmount: 0,
      totalAllocations: 75000,
      totalDeductions: 25000,
    };
    expect(calculateFundBalance(input)).toBe(50000);
  });

  it('handles large values correctly', () => {
    const input: FundBalanceInput = {
      baseAmount: 99999999999,
      totalAllocations: 50000000,
      totalDeductions: 10000000,
    };
    expect(calculateFundBalance(input)).toBe(100039999999);
  });
});

describe('filterDeductionsByMonth', () => {
  const transactions: TransactionWithMonth[] = [
    { amount: 10000, referenceMonth: '2025-01' },
    { amount: 20000, referenceMonth: '2025-03' },
    { amount: 30000, referenceMonth: '2025-06' },
    { amount: 40000, referenceMonth: '2025-09' },
    { amount: 50000, referenceMonth: '2025-12' },
  ];

  it('includes transactions with referenceMonth equal to currentMonth', () => {
    const result = filterDeductionsByMonth(transactions, '2025-06');
    expect(result).toContainEqual({ amount: 30000, referenceMonth: '2025-06' });
  });

  it('includes transactions with referenceMonth before currentMonth', () => {
    const result = filterDeductionsByMonth(transactions, '2025-06');
    expect(result).toContainEqual({ amount: 10000, referenceMonth: '2025-01' });
    expect(result).toContainEqual({ amount: 20000, referenceMonth: '2025-03' });
  });

  it('excludes transactions with referenceMonth after currentMonth', () => {
    const result = filterDeductionsByMonth(transactions, '2025-06');
    expect(result).not.toContainEqual({ amount: 40000, referenceMonth: '2025-09' });
    expect(result).not.toContainEqual({ amount: 50000, referenceMonth: '2025-12' });
  });

  it('returns all transactions when currentMonth is the latest', () => {
    const result = filterDeductionsByMonth(transactions, '2025-12');
    expect(result).toHaveLength(5);
  });

  it('returns empty array when currentMonth is before all transactions', () => {
    const result = filterDeductionsByMonth(transactions, '2024-12');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when input is empty', () => {
    const result = filterDeductionsByMonth([], '2025-06');
    expect(result).toHaveLength(0);
  });

  it('handles year boundaries correctly', () => {
    const yearBoundaryTransactions: TransactionWithMonth[] = [
      { amount: 1000, referenceMonth: '2024-11' },
      { amount: 2000, referenceMonth: '2024-12' },
      { amount: 3000, referenceMonth: '2025-01' },
      { amount: 4000, referenceMonth: '2025-02' },
    ];
    const result = filterDeductionsByMonth(yearBoundaryTransactions, '2025-01');
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ amount: 1000, referenceMonth: '2024-11' });
    expect(result).toContainEqual({ amount: 2000, referenceMonth: '2024-12' });
    expect(result).toContainEqual({ amount: 3000, referenceMonth: '2025-01' });
  });
});
