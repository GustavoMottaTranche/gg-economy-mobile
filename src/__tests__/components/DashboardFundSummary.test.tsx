/**
 * Dashboard Fund Expense Summary Tests
 *
 * Tests that the fund expense summary element appears on the Dashboard
 * when fund-linked expenses exist for the selected month, and that
 * tapping it navigates to the Future Plans screen.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Dashboard',
        'dashboard.noData': 'No data',
        'common.error': 'Error',
        'common.retry': 'Retry',
        'common.loading': 'Loading',
        'common.refresh': 'Refresh',
        'empty.transactionsHint': 'Import a statement',
        'fileImport.selectFile': 'Select File',
        'futurePlans.dashboard.fundExpensesLabel': 'Fund expenses',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `$${amount.toFixed(2)}`,
  getCurrentLocale: () => 'en',
  getMonthName: (monthIndex: number) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthIndex] ?? 'Unknown';
  },
}));

// Mock fundStore (still needed for other components that may use it)
jest.mock('../../stores/fundStore', () => {
  const mockState = {
    getFundExpensesForMonth: jest.fn(() => Promise.resolve(0)),
    funds: [],
    allocations: new Map(),
    balances: new Map(),
    fundTransactions: new Map(),
    monthlyIncome: null,
    selectedMonth: '2024-01',
    isLoading: false,
  };
  const useFundStore = (selector: (state: typeof mockState) => unknown) => {
    return selector ? selector(mockState) : mockState;
  };
  useFundStore.getState = () => mockState;
  return { useFundStore };
});

// Mock paymentStatusStore
jest.mock('../../stores/paymentStatusStore', () => {
  const mockState = {
    loadPendingItemsForMonth: jest.fn().mockResolvedValue(undefined),
    togglePaymentStatus: jest.fn().mockResolvedValue(undefined),
    loadPaymentTotalsForMonth: jest.fn().mockResolvedValue(undefined),
    pendingItems: {},
    paymentTotals: {},
    isLoading: false,
    error: null,
  };
  const usePaymentStatusStore = (selector: (state: typeof mockState) => unknown) => {
    return selector ? selector(mockState) : mockState;
  };
  usePaymentStatusStore.getState = () => mockState;
  return {
    usePaymentStatusStore,
    usePendingItems: () => [],
    usePaymentTotals: () => null,
  };
});

// Mock useDashboardData with default data
// We use a getter pattern so each test can set the fundExpensesTotal before rendering
const mockDashboardData = {
  summary: {
    referenceMonth: '2024-01',
    totalIncome: 500000,
    totalExpenses: 350000,
    balance: 150000,
    transactionCount: 10,
  },
  expenseBreakdown: [],
  fixedBreakdown: [
    {
      categoryId: 'cat-1',
      categoryName: 'Rent',
      categoryType: 'expense',
      categoryColor: '#3357FF',
      categoryIcon: 'home',
      expenseGroup: 'fixed',
      total: 200000,
      count: 1,
      percentage: 100,
    },
  ],
  variableBreakdown: [
    {
      categoryId: 'cat-2',
      categoryName: 'Food',
      categoryType: 'expense',
      categoryColor: '#FF5733',
      categoryIcon: 'utensils',
      expenseGroup: 'variable',
      total: 150000,
      count: 5,
      percentage: 100,
    },
  ],
  fixedTotal: 200000,
  variableTotal: 150000,
  weeklyTotal: 0,
  generalGoal: null,
  categoryGoals: new Map(),
  expectedFutureSpending: 0,
  chartFilter: 'all',
  setChartFilter: jest.fn(),
  incomeBreakdown: [],
  trendData: [],
  availableMonths: ['2024-01'],
  selectedMonth: '2024-01',
  trendPeriod: 3,
  fundExpensesTotal: 0,
  isLoading: false,
  error: null,
  setSelectedMonth: jest.fn(),
  setTrendPeriod: jest.fn(),
  previousMonth: jest.fn(),
  nextMonth: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('../../hooks/useDashboardData', () => ({
  __esModule: true,
  useDashboardData: () => mockDashboardData,
}));

// Mock weeklyRecurringStore
jest.mock('../../stores/weeklyRecurringStore', () => ({
  useWeeklyRecurringStore: jest.fn(() => ({
    groups: [],
    occurrences: [],
    loadOccurrencesForMonth: jest.fn(),
  })),
  useWeeklyMonthlyTotal: () => 0,
}));

// Mock db schema
jest.mock('../../db/schema', () => ({
  transactions: {
    referenceMonth: 'reference_month',
    amount: 'amount',
    isExcludedFromTotals: 'is_excluded_from_totals',
    categoryId: 'category_id',
    isPaid: 'is_paid',
  },
  categories: {
    id: 'id',
    name: 'name',
    type: 'type',
    color: 'color',
    icon: 'icon',
    expenseGroup: 'expense_group',
  },
  weeklyRecurringGroups: {
    id: 'id',
    categoryId: 'category_id',
    name: 'name',
    defaultAmount: 'default_amount',
  },
  weeklyOccurrences: {
    id: 'id',
    weeklyGroupId: 'weekly_group_id',
    amount: 'amount',
    referenceMonth: 'reference_month',
    isPaid: 'is_paid',
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Svg: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    G: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Path: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
    Rect: (props: any) => <View {...props} />,
    Line: (props: any) => <View {...props} />,
    Text: (props: any) => <View {...props} />,
  };
});

// Import after mocks
import DashboardScreen from '../../../app/(tabs)/index';

describe('Dashboard Fund Expense Summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardData.fundExpensesTotal = 0;
  });

  it('does not display fund expense summary when fund expenses are 0 (Requirement 10.4)', async () => {
    mockDashboardData.fundExpensesTotal = 0;

    const { queryByTestId } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(queryByTestId('dashboard-fund-expense-summary')).toBeNull();
    });
  });

  it('displays fund expense summary when fund expenses > 0 (Requirement 10.1)', async () => {
    mockDashboardData.fundExpensesTotal = 15000; // R$ 150.00 in cents

    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-fund-expense-summary')).toBeTruthy();
    });
  });

  it('displays formatted currency value with label (Requirement 10.2)', async () => {
    mockDashboardData.fundExpensesTotal = 25000; // $250.00 in cents

    const { getByTestId, getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-fund-expense-summary')).toBeTruthy();
    });

    // Check the label and formatted amount are present
    expect(getByText(/Fund expenses.*\$250\.00/)).toBeTruthy();
  });

  it('navigates to Future Plans screen on tap (Requirement 10.6)', async () => {
    mockDashboardData.fundExpensesTotal = 10000;

    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-fund-expense-summary')).toBeTruthy();
    });

    fireEvent.press(getByTestId('dashboard-fund-expense-summary'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/future-plans');
  });

  it('has link accessibility role (Requirement 10.5)', async () => {
    mockDashboardData.fundExpensesTotal = 5000;

    const { getByTestId } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-fund-expense-summary')).toBeTruthy();
    });

    const element = getByTestId('dashboard-fund-expense-summary');
    expect(element.props.accessibilityRole).toBe('link');
  });

  it('fund expenses are displayed separately from regular expense totals (Requirement 10.3)', async () => {
    // Set fund expenses while keeping regular totals unchanged
    mockDashboardData.fundExpensesTotal = 20000; // $200.00 fund expenses
    mockDashboardData.summary = {
      ...mockDashboardData.summary,
      totalExpenses: 350000, // $3500.00 regular expenses (unchanged)
    };

    const { getByTestId, getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-fund-expense-summary')).toBeTruthy();
    });

    // Fund expenses shown as separate element with its own value
    expect(getByText(/Fund expenses.*\$200\.00/)).toBeTruthy();

    // Regular expense summary remains independent (not summed with fund expenses)
    expect(getByTestId('dashboard-expense-summary')).toBeTruthy();
  });
});
