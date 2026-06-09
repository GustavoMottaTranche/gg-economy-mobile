import {
  calculateSavingsGoal,
  calculateActualSavings,
  calculateRemainingDistributable,
  SavingsCalculationInput,
  ActualSavingsInput,
} from './SavingsCalculationService';

describe('calculateSavingsGoal', () => {
  it('returns income minus fixed paid minus fixed pending minus variableSpendingOrGoal', () => {
    const input: SavingsCalculationInput = {
      monthlyIncome: 2500000, // R$ 25,000
      fixedPaidExpenses: 1285000, // R$ 12,850
      fixedPendingExpenses: 0,
      variableSpendingOrGoal: 650000, // R$ 6,500 (goal > spent)
    };
    // 2500000 - 1285000 - 0 - 650000 = 565000
    expect(calculateSavingsGoal(input)).toBe(565000);
  });

  it('uses actual variable spending when it exceeds the goal', () => {
    const input: SavingsCalculationInput = {
      monthlyIncome: 2500000,
      fixedPaidExpenses: 1000000,
      fixedPendingExpenses: 200000,
      variableSpendingOrGoal: 800000, // actual > goal, so we pass actual
    };
    // 2500000 - 1000000 - 200000 - 800000 = 500000
    expect(calculateSavingsGoal(input)).toBe(500000);
  });

  it('returns zero when expenses exceed income (clamped)', () => {
    const input: SavingsCalculationInput = {
      monthlyIncome: 500000,
      fixedPaidExpenses: 400000,
      fixedPendingExpenses: 200000,
      variableSpendingOrGoal: 100000,
    };
    // 500000 - 400000 - 200000 - 100000 = -200000 → 0
    expect(calculateSavingsGoal(input)).toBe(0);
  });

  it('returns full income when all deductions are zero', () => {
    const input: SavingsCalculationInput = {
      monthlyIncome: 500000,
      fixedPaidExpenses: 0,
      fixedPendingExpenses: 0,
      variableSpendingOrGoal: 0,
    };
    expect(calculateSavingsGoal(input)).toBe(500000);
  });

  it('handles only fixed pending with no paid', () => {
    const input: SavingsCalculationInput = {
      monthlyIncome: 1000000,
      fixedPaidExpenses: 0,
      fixedPendingExpenses: 300000,
      variableSpendingOrGoal: 200000,
    };
    // 1000000 - 0 - 300000 - 200000 = 500000
    expect(calculateSavingsGoal(input)).toBe(500000);
  });
});

describe('calculateActualSavings', () => {
  it('returns income minus paid expenses', () => {
    const input: ActualSavingsInput = {
      monthlyIncome: 500000,
      totalPaidExpenses: 300000,
    };
    expect(calculateActualSavings(input)).toBe(200000);
  });

  it('returns zero when income equals expenses', () => {
    const input: ActualSavingsInput = {
      monthlyIncome: 300000,
      totalPaidExpenses: 300000,
    };
    expect(calculateActualSavings(input)).toBe(0);
  });

  it('can return a negative value when expenses exceed income', () => {
    const input: ActualSavingsInput = {
      monthlyIncome: 100000,
      totalPaidExpenses: 250000,
    };
    expect(calculateActualSavings(input)).toBe(-150000);
  });

  it('returns full income when no expenses are paid', () => {
    const input: ActualSavingsInput = {
      monthlyIncome: 500000,
      totalPaidExpenses: 0,
    };
    expect(calculateActualSavings(input)).toBe(500000);
  });
});

describe('calculateRemainingDistributable', () => {
  it('returns savings goal minus allocations', () => {
    expect(calculateRemainingDistributable(300000, 100000)).toBe(200000);
  });

  it('returns zero when allocations equal savings goal', () => {
    expect(calculateRemainingDistributable(300000, 300000)).toBe(0);
  });

  it('can return negative when over-allocated', () => {
    expect(calculateRemainingDistributable(300000, 400000)).toBe(-100000);
  });

  it('returns full savings goal when no allocations', () => {
    expect(calculateRemainingDistributable(500000, 0)).toBe(500000);
  });

  it('handles zero savings goal', () => {
    expect(calculateRemainingDistributable(0, 50000)).toBe(-50000);
  });
});
