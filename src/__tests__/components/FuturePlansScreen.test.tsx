/**
 * FuturePlansScreen Component Tests
 *
 * Tests for the Future Plans screen including:
 * - Renders savings metrics (monthly income, savings goal, actual savings)
 * - Displays fund cards for active funds
 * - Month navigation updates displayed data
 * - Empty states when no funds exist
 * - Income prompt when monthly income is not configured
 * - Remaining distributable amount with warning color for negative values
 *
 * **Validates: Requirements 1.2, 2.6, 3.1, 4.1, 5.1, 6.3, 13.1, 13.2, 15.5, 15.6**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockPreviousMonth = jest.fn();
const mockNextMonth = jest.fn();
const mockSetSelectedMonth = jest.fn();
const mockLoadFunds = jest.fn();
const mockSetAllocation = jest.fn();
const mockRemoveAllocation = jest.fn();

let mockHookData = {
  savingsGoal: 300000,
  actualSavings: 150000,
  fundsWithBalances: [] as Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    totalBalance: number;
    monthlyAllocation: number;
  }>,
  remainingDistributable: 200000,
  monthlyIncome: 500000 as number | null,
  selectedMonth: '2025-01',
  isLoading: false,
  setSelectedMonth: mockSetSelectedMonth,
  previousMonth: mockPreviousMonth,
  nextMonth: mockNextMonth,
};

let mockFundTransactions = new Map<string, unknown[]>();

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../hooks/useFuturePlansData', () => ({
  useFuturePlansData: () => mockHookData,
}));

jest.mock('../../stores/fundStore', () => ({
  useFundStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      loadFunds: mockLoadFunds,
      setAllocation: mockSetAllocation,
      removeAllocation: mockRemoveAllocation,
      fundTransactions: mockFundTransactions,
    }),
}));

jest.mock('../../stores/themeStore', () => ({
  useThemeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ resolvedScheme: 'light', preference: 'light' }),
}));

jest.mock('../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      danger: { base: '#DC2626', light: '#FEE2E2' },
      warning: { base: '#F59E0B', light: '#FEF3C7' },
      success: { base: '#16A34A' },
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#D1D5DB' },
  }),
}));

jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  getCurrentLocale: () => 'pt-BR',
}));

jest.mock('../../constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  borderRadius: { sm: 4, md: 12, lg: 16 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
    title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
    overline: { letterSpacing: 1 },
  },
  shadows: { light: { lg: {} } },
}));

// Mock child components to isolate screen behavior
jest.mock('../../components/ui/LoadingIndicator', () => ({
  LoadingIndicator: ({ size }: { size: string }) => {
    const { View } = require('react-native');
    return <View testID={`loading-indicator-${size}`} />;
  },
}));

jest.mock('../../components/ui/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
    action,
    testID,
  }: {
    icon?: string;
    title: string;
    description?: string;
    action?: { label: string; onPress: () => void };
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="empty-state-title">{title}</Text>
        {description && <Text testID="empty-state-description">{description}</Text>}
        {action && (
          <TouchableOpacity testID="empty-state-action" onPress={action.onPress}>
            <Text>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

jest.mock('../../components/dashboard', () => ({
  MonthSelector: ({
    testID,
    onPreviousMonth,
    onNextMonth,
  }: {
    selectedMonth: string;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onMonthPress?: () => void;
    isFutureMonth?: boolean;
    style?: unknown;
    testID?: string;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID={testID}>
        <TouchableOpacity testID={`${testID}-prev`} onPress={onPreviousMonth}>
          <Text>{'<'}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`${testID}-next`} onPress={onNextMonth}>
          <Text>{'>'}</Text>
        </TouchableOpacity>
      </View>
    );
  },
  MonthPickerModal: () => null,
}));

jest.mock('../../components/future-plans/SavingsMetrics', () => ({
  SavingsMetrics: ({
    testID,
    monthlyIncome,
    savingsGoal,
    actualSavings,
  }: {
    monthlyIncome: number | null;
    savingsGoal: number;
    actualSavings: number;
    style?: unknown;
    testID?: string;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID={`${testID}-income-value`}>
          {monthlyIncome !== null ? `R$ ${(monthlyIncome / 100).toFixed(2)}` : '—'}
        </Text>
        <Text testID={`${testID}-savings-goal-value`}>R$ {(savingsGoal / 100).toFixed(2)}</Text>
        <Text testID={`${testID}-actual-savings-value`}>R$ {(actualSavings / 100).toFixed(2)}</Text>
      </View>
    );
  },
}));

jest.mock('../../components/future-plans/FundCard', () => ({
  FundCard: ({
    fund,
    testID,
    onPress,
    expanded,
    children,
  }: {
    fund: { id: string; name: string; totalBalance: number; monthlyAllocation: number };
    onAllocationChange: (fundId: string, value: string) => void;
    onPress: (fundId: string) => void;
    expanded: boolean;
    testID?: string;
    children?: React.ReactNode;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID={testID} onPress={() => onPress(fund.id)}>
        <Text testID={`${testID}-name`}>{fund.name}</Text>
        <Text testID={`${testID}-balance`}>R$ {(fund.totalBalance / 100).toFixed(2)}</Text>
        {expanded && <View testID={`${testID}-expanded`}>{children}</View>}
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/future-plans/FundTransactionList', () => ({
  FundTransactionList: ({ testID }: { transactions: unknown[]; testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));

// ─── Import Component After Mocks ────────────────────────────────────────────

import FuturePlansScreen from '../../../app/(tabs)/future-plans';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FuturePlansScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFundTransactions = new Map();
    mockHookData = {
      savingsGoal: 300000,
      actualSavings: 150000,
      fundsWithBalances: [],
      remainingDistributable: 200000,
      monthlyIncome: 500000,
      selectedMonth: '2025-01',
      isLoading: false,
      setSelectedMonth: mockSetSelectedMonth,
      previousMonth: mockPreviousMonth,
      nextMonth: mockNextMonth,
    };
  });

  describe('Income prompt', () => {
    it('shows income prompt when monthly income is not configured', () => {
      mockHookData.monthlyIncome = null;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-income-prompt')).toBeTruthy();
    });

    it('shows config button in income prompt', () => {
      mockHookData.monthlyIncome = null;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-go-to-config')).toBeTruthy();
    });

    it('does not show income prompt when monthly income is configured', () => {
      mockHookData.monthlyIncome = 500000;

      const { queryByTestId } = render(<FuturePlansScreen />);

      expect(queryByTestId('future-plans-income-prompt')).toBeNull();
    });
  });

  describe('Savings metrics', () => {
    it('renders savings metrics component', () => {
      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-savings-metrics')).toBeTruthy();
    });

    it('passes monthly income to savings metrics', () => {
      mockHookData.monthlyIncome = 500000;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-savings-metrics-income-value').props.children).toBe(
        'R$ 5000.00'
      );
    });

    it('passes savings goal to savings metrics', () => {
      mockHookData.savingsGoal = 300000;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-savings-metrics-savings-goal-value').props.children).toEqual(
        ['R$ ', '3000.00']
      );
    });

    it('passes actual savings to savings metrics', () => {
      mockHookData.actualSavings = 150000;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(
        getByTestId('future-plans-savings-metrics-actual-savings-value').props.children
      ).toEqual(['R$ ', '1500.00']);
    });
  });

  describe('Empty state (no funds)', () => {
    it('shows empty state when no funds exist', () => {
      mockHookData.fundsWithBalances = [];

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('empty-state-title')).toBeTruthy();
    });

    it('shows create fund hint in empty state', () => {
      mockHookData.fundsWithBalances = [];

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('empty-state-action')).toBeTruthy();
    });
  });

  describe('Fund cards display', () => {
    const fundsData = [
      {
        id: 'fund-1',
        name: 'Travel',
        icon: '✈️',
        color: '#3B82F6',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        totalBalance: 500000,
        monthlyAllocation: 100000,
      },
      {
        id: 'fund-2',
        name: 'Emergency',
        icon: '🆘',
        color: '#EF4444',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        totalBalance: 1000000,
        monthlyAllocation: 200000,
      },
    ];

    it('renders a FundCard for each active fund', () => {
      mockHookData.fundsWithBalances = fundsData;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-fund-card-fund-1')).toBeTruthy();
      expect(getByTestId('future-plans-fund-card-fund-2')).toBeTruthy();
    });

    it('displays fund names', () => {
      mockHookData.fundsWithBalances = fundsData;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-fund-card-fund-1-name').props.children).toBe('Travel');
      expect(getByTestId('future-plans-fund-card-fund-2-name').props.children).toBe('Emergency');
    });

    it('displays fund balances', () => {
      mockHookData.fundsWithBalances = fundsData;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-fund-card-fund-1-balance').props.children).toEqual([
        'R$ ',
        '5000.00',
      ]);
    });

    it('does not show empty state when funds exist', () => {
      mockHookData.fundsWithBalances = fundsData;

      const { queryByTestId } = render(<FuturePlansScreen />);

      expect(queryByTestId('empty-state-title')).toBeNull();
    });
  });

  describe('Month navigation', () => {
    it('renders month selector', () => {
      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-month-selector')).toBeTruthy();
    });

    it('calls previousMonth when previous button is pressed', () => {
      const { getByTestId } = render(<FuturePlansScreen />);

      fireEvent.press(getByTestId('future-plans-month-selector-prev'));

      expect(mockPreviousMonth).toHaveBeenCalledTimes(1);
    });

    it('calls nextMonth when next button is pressed', () => {
      const { getByTestId } = render(<FuturePlansScreen />);

      fireEvent.press(getByTestId('future-plans-month-selector-next'));

      expect(mockNextMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Remaining distributable', () => {
    it('displays remaining amount when funds exist', () => {
      mockHookData.fundsWithBalances = [
        {
          id: 'fund-1',
          name: 'Travel',
          icon: null,
          color: null,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          totalBalance: 500000,
          monthlyAllocation: 100000,
        },
      ];
      mockHookData.remainingDistributable = 200000;

      const { getByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('future-plans-remaining')).toBeTruthy();
      expect(getByTestId('future-plans-remaining-value').props.children).toBe('R$ 2000.00');
    });

    it('uses warning color when remaining is negative', () => {
      mockHookData.fundsWithBalances = [
        {
          id: 'fund-1',
          name: 'Over Allocated',
          icon: null,
          color: null,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          totalBalance: 500000,
          monthlyAllocation: 400000,
        },
      ];
      mockHookData.remainingDistributable = -100000;

      const { getByTestId } = render(<FuturePlansScreen />);

      const remainingValue = getByTestId('future-plans-remaining-value');
      // When remaining is negative, the color should be the warning color
      const style = remainingValue.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.color).toBe('#F59E0B');
    });

    it('uses primary text color when remaining is positive', () => {
      mockHookData.fundsWithBalances = [
        {
          id: 'fund-1',
          name: 'Normal',
          icon: null,
          color: null,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          totalBalance: 500000,
          monthlyAllocation: 100000,
        },
      ];
      mockHookData.remainingDistributable = 200000;

      const { getByTestId } = render(<FuturePlansScreen />);

      const remainingValue = getByTestId('future-plans-remaining-value');
      const style = remainingValue.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.color).toBe('#1C1C1E');
    });

    it('does not show remaining when no funds exist (shows empty state instead)', () => {
      mockHookData.fundsWithBalances = [];

      const { queryByTestId } = render(<FuturePlansScreen />);

      expect(queryByTestId('future-plans-remaining')).toBeNull();
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when loading with no data', () => {
      mockHookData.isLoading = true;
      mockHookData.fundsWithBalances = [];
      mockHookData.monthlyIncome = null;

      const { getByTestId, queryByTestId } = render(<FuturePlansScreen />);

      expect(getByTestId('loading-indicator-large')).toBeTruthy();
      expect(queryByTestId('future-plans-month-selector')).toBeNull();
    });

    it('does not show loading indicator when data is available', () => {
      mockHookData.isLoading = false;
      mockHookData.monthlyIncome = 500000;

      const { queryByTestId } = render(<FuturePlansScreen />);

      expect(queryByTestId('loading-indicator-large')).toBeNull();
    });
  });
});
