/**
 * Transactions Screen Tests
 *
 * Tests for the Transactions screen component.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.6, 5.6, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 7.2, 7.4, 8.6, 9.1**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock expo-router
jest.mock('expo-router', () => {
  const mockRouterObj = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  };
  return {
    router: mockRouterObj,
    useRouter: () => mockRouterObj,
  };
});

// Get the mocked router for assertions
import { router as mockedRouter } from 'expo-router';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'transactions.title': 'Transactions',
        'transactions.monthSummary': 'Month summary',
        'transactions.addTransaction': 'Add transaction',
        'transactions.deleteTransaction': 'Delete transaction',
        'transactions.deleteConfirmation': 'Are you sure you want to delete this transaction?',
        'transactions.referenceMonth': 'Reference month',
        'dashboard.income': 'Income',
        'dashboard.expenses': 'Expenses',
        'dashboard.balance': 'Balance',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.previous': 'Previous',
        'common.next': 'Next',
        'empty.transactions': 'No transactions yet',
        'empty.transactionsHint': 'Import a statement or add manually',
        'fileImport.selectFile': 'Select File',
        'errors.generic': 'An error occurred. Please try again.',
        'filters.title': 'Filters',
        'filters.activeFilters': 'Active filters',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../src/i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `$${amount.toFixed(2)}`,
  formatDateLocale: (date: Date, _locale: string, _options?: unknown) => {
    return date.toLocaleDateString('en-US');
  },
  getCurrentLocale: () => 'en',
  getMonthName: (monthIndex: number, _locale: string, _style: string) => {
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

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock data
const mockTransactions = [
  {
    id: 'tx-1',
    title: 'Salary Payment',
    date: new Date('2024-01-15'),
    amount: 150000, // $1500.00 income
    description: 'Salary Payment',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    category: {
      id: 'cat-1',
      name: 'Salary',
      type: 'income' as const,
      icon: '💰',
      color: '#22C55E',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
  },
  {
    id: 'tx-2',
    title: 'Grocery Shopping',
    date: new Date('2024-01-10'),
    amount: -5000, // -$50.00 expense
    description: 'Grocery Shopping',
    categoryId: 'cat-2',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    category: {
      id: 'cat-2',
      name: 'Food',
      type: 'expense' as const,
      icon: '🍔',
      color: '#EF4444',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
  },
  {
    id: 'tx-3',
    title: 'Gas Station',
    date: new Date('2024-01-05'),
    amount: -3500, // -$35.00 expense
    description: 'Gas Station',
    categoryId: 'cat-3',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    installmentGroupId: null,
    recurringId: null,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    category: {
      id: 'cat-3',
      name: 'Transport',
      type: 'expense' as const,
      icon: '🚗',
      color: '#F59E0B',
      isActive: true,
      expenseGroup: null,
      createdAt: new Date('2024-01-01'),
    },
  },
];

const mockSummary = {
  totalIncome: 150000,
  totalExpenses: -8500,
  balance: 141500,
  transactionCount: 3,
};

const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();

const mockUsePaginatedTransactionsReturn = {
  transactions: mockTransactions,
  isLoading: false,
  isLoadingMore: false,
  error: null as string | null,
  hasMore: false,
  totalCount: 3,
  summary: mockSummary,
  loadMore: mockLoadMore,
  refresh: mockRefresh,
};

jest.mock('../../src/hooks/usePaginatedTransactions', () => ({
  usePaginatedTransactions: () => mockUsePaginatedTransactionsReturn,
}));

// Mock useFilterStore
const mockFilterState = {
  categoryIds: [] as string[],
  minAmount: null as number | null,
  maxAmount: null as number | null,
  startDate: null as string | null,
  endDate: null as string | null,
  pendingOnly: false,
};

const mockSetExpanded = jest.fn();
const mockResetFilters = jest.fn();
const mockResetDateRange = jest.fn();

jest.mock('../../src/stores/filterStore', () => ({
  useFilterStore: (selector: (state: unknown) => unknown) => {
    const state = {
      filters: mockFilterState,
      isExpanded: false,
      setExpanded: mockSetExpanded,
      resetFilters: mockResetFilters,
      resetDateRange: mockResetDateRange,
      setCategoryIds: jest.fn(),
      setMinAmount: jest.fn(),
      setMaxAmount: jest.fn(),
      setStartDate: jest.fn(),
      setEndDate: jest.fn(),
      getActiveFilterCount: () => 0,
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

// Mock useCategories
jest.mock('../../src/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      {
        id: 'cat-1',
        name: 'Salary',
        type: 'income',
        icon: '💰',
        color: '#22C55E',
        isActive: true,
        expenseGroup: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-2',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        color: '#EF4444',
        isActive: true,
        expenseGroup: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-3',
        name: 'Transport',
        type: 'expense',
        icon: '🚗',
        color: '#F59E0B',
        isActive: true,
        expenseGroup: null,
        createdAt: new Date(),
      },
    ],
  }),
}));

// Mock deleteTransaction
const mockDeleteTransaction = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/db/queries/transactions', () => ({
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}));

// Mock weeklyRecurringStore
const mockToggleGroupExpansion = jest.fn();
jest.mock('../../src/stores/weeklyRecurringStore', () => ({
  useWeeklyRecurringStore: Object.assign(
    (selector: (state: unknown) => unknown) => {
      const state = {
        groups: [],
        occurrences: {},
        monthlyTotals: {},
        isLoading: false,
        error: null,
        expandedGroupIds: new Set<string>(),
        loadOccurrencesForMonth: jest.fn().mockResolvedValue(undefined),
        toggleGroupExpansion: mockToggleGroupExpansion,
        collapseAllGroups: jest.fn(),
      };
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    },
    {
      getState: () => ({
        groups: [],
        loadGroups: jest.fn().mockResolvedValue(undefined),
        loadOccurrencesForMonth: jest.fn().mockResolvedValue(undefined),
        toggleGroupExpansion: mockToggleGroupExpansion,
        collapseAllGroups: jest.fn(),
      }),
    }
  ),
  useWeeklyOccurrences: () => [],
  useWeeklyGroups: () => [],
  useExpandedGroupIds: () => new Set<string>(),
  useWeeklyMonthlyTotal: () => 0,
}));

// Mock paymentStatusStore
const mockTogglePaymentStatus = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/stores/paymentStatusStore', () => ({
  usePaymentStatusStore: (selector: (state: unknown) => unknown) => {
    const state = {
      pendingItems: {},
      paymentTotals: {},
      isLoading: false,
      error: null,
      togglePaymentStatus: mockTogglePaymentStatus,
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  },
}));

// Mock useUnifiedStatementItems - returns transactions wrapped as UnifiedStatementItem
jest.mock('../../src/hooks/useUnifiedStatementItems', () => ({
  useUnifiedStatementItems: ({ transactions }: { transactions: unknown[] }) => {
    return transactions.map((t: unknown) => ({
      type: 'transaction' as const,
      data: t,
    }));
  },
}));

// Mock WeeklyGroupItem
jest.mock('../../src/components/WeeklyGroupItem', () => ({
  WeeklyGroupItem: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>WeeklyGroupItem</Text>
      </View>
    );
  },
}));

// Mock WeeklyParcelRow
jest.mock('../../src/components/WeeklyParcelRow', () => ({
  WeeklyParcelRow: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>WeeklyParcelRow</Text>
      </View>
    );
  },
}));

// Mock PaymentStatusToggle
jest.mock('../../src/components/PaymentStatusToggle', () => ({
  PaymentStatusToggle: ({
    isPaid,
    onToggle,
    testID,
  }: {
    isPaid: boolean;
    onToggle: () => void;
    testID?: string;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID={testID} onPress={onToggle}>
        <Text>{isPaid ? '✓' : '○'}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock FilterPanel
jest.mock('../../src/components/filters/FilterPanel', () => ({
  FilterPanel: ({ testID }: { testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID ?? 'filter-panel'}>
        <Text>Filters</Text>
      </View>
    );
  },
}));

// Mock FlashList - captures props for assertion
let lastFlashListProps: Record<string, unknown> = {};

jest.mock('@shopify/flash-list', () => {
  const { FlatList, View } = require('react-native');
  return {
    FlashList: (props: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactElement;
      keyExtractor: (item: unknown) => string;
      ListHeaderComponent?: React.ReactElement;
      ListEmptyComponent?: React.ReactElement;
      ListFooterComponent?: React.ReactElement | null;
      onEndReached?: () => void;
      onEndReachedThreshold?: number;
      testID?: string;
    }) => {
      // Store props for test assertions
      lastFlashListProps = props;
      const {
        data,
        renderItem,
        keyExtractor,
        ListHeaderComponent,
        ListEmptyComponent,
        ListFooterComponent,
        testID,
      } = props;
      return (
        <View testID={testID}>
          {ListHeaderComponent}
          {data && data.length > 0 ? (
            <FlatList data={data} renderItem={renderItem} keyExtractor={keyExtractor} />
          ) : (
            ListEmptyComponent
          )}
          {ListFooterComponent}
        </View>
      );
    },
    ListRenderItemInfo: {},
  };
});

// Mock MonthSelector
jest.mock('../../src/components/dashboard/MonthSelector', () => ({
  MonthSelector: ({
    selectedMonth,
    onPreviousMonth,
    onNextMonth,
    disableNext,
    testID,
  }: {
    selectedMonth: string;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    disableNext?: boolean;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    const [year, month] = selectedMonth.split('-').map(Number);
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
    const monthName = months[(month ?? 1) - 1];

    return (
      <View testID={testID}>
        <TouchableOpacity testID={`${testID}-prev`} onPress={onPreviousMonth}>
          <Text>‹</Text>
        </TouchableOpacity>
        <Text testID={`${testID}-text`}>{`${monthName} ${year}`}</Text>
        <TouchableOpacity testID={`${testID}-next`} onPress={onNextMonth} disabled={disableNext}>
          <Text>›</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock TransactionCard
jest.mock('../../src/components/ui/TransactionCard', () => ({
  TransactionCard: ({
    transaction,
    category,
    onPress,
    testID,
  }: {
    transaction: { id: string; description: string; amount: number };
    category?: { name: string } | null;
    onPress?: () => void;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    const isIncome = transaction.amount > 0;

    return (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <View>
          <Text>{transaction.description}</Text>
          <Text>{category?.name ?? 'Uncategorized'}</Text>
          <Text style={{ color: isIncome ? '#166534' : '#991b1b' }}>
            {isIncome ? '+' : '-'}${Math.abs(transaction.amount / 100).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
}));

// Mock LoadingIndicator
jest.mock('../../src/components/ui/LoadingIndicator', () => ({
  LoadingIndicator: ({ message, testID }: { message?: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{message ?? 'Loading...'}</Text>
      </View>
    );
  },
}));

// Mock EmptyState
jest.mock('../../src/components/ui/EmptyState', () => ({
  EmptyState: ({
    icon,
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
        {icon && <Text>{icon}</Text>}
        <Text>{title}</Text>
        {description && <Text>{description}</Text>}
        {action && (
          <TouchableOpacity testID={`${testID}-action`} onPress={action.onPress}>
            <Text>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

// Import the component after mocks
import TransactionsScreen from '../(tabs)/transactions';

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
    mockUsePaginatedTransactionsReturn.isLoading = false;
    mockUsePaginatedTransactionsReturn.isLoadingMore = false;
    mockUsePaginatedTransactionsReturn.error = null;
    mockUsePaginatedTransactionsReturn.summary = mockSummary;
    mockUsePaginatedTransactionsReturn.hasMore = false;
  });

  describe('Rendering', () => {
    it('renders correctly with transactions', () => {
      render(<TransactionsScreen />);

      expect(screen.getByTestId('transactions-screen')).toBeTruthy();
      expect(screen.getByTestId('month-selector')).toBeTruthy();
      expect(screen.getByTestId('monthly-summary')).toBeTruthy();
      expect(screen.getByTestId('transactions-list')).toBeTruthy();
    });

    it('renders the screen title', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Transactions')).toBeTruthy();
    });

    it('renders the add transaction button', () => {
      render(<TransactionsScreen />);

      expect(screen.getByTestId('add-transaction-button')).toBeTruthy();
    });

    it('renders month selector with current month', () => {
      render(<TransactionsScreen />);

      const monthSelector = screen.getByTestId('month-selector');
      expect(monthSelector).toBeTruthy();
    });

    it('renders the filter panel', () => {
      render(<TransactionsScreen />);

      expect(screen.getByTestId('filter-panel')).toBeTruthy();
    });

    it('renders monthly summary with correct values', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Month summary')).toBeTruthy();
      expect(screen.getByText('Income', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByText('Expenses', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByText('Balance', { includeHiddenElements: true })).toBeTruthy();
    });

    it('renders transaction cards', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Salary Payment')).toBeTruthy();
      expect(screen.getByText('Grocery Shopping')).toBeTruthy();
      expect(screen.getByText('Gas Station')).toBeTruthy();
    });
  });

  describe('Month Navigation', () => {
    it('navigates to previous month when previous button is pressed', () => {
      render(<TransactionsScreen />);

      const prevButton = screen.getByTestId('month-selector-prev');
      fireEvent.press(prevButton);

      // The component should update the selected month and reset date range
      expect(mockResetDateRange).toHaveBeenCalled();
    });

    it('navigates to next month when next button is pressed', () => {
      render(<TransactionsScreen />);

      const nextButton = screen.getByTestId('month-selector-next');
      fireEvent.press(nextButton);
    });
  });

  describe('Transaction Interactions', () => {
    it('navigates to transaction detail when transaction is pressed', () => {
      render(<TransactionsScreen />);

      const transactionCard = screen.getByTestId('transaction-card-tx-1');
      fireEvent.press(transactionCard);

      expect(mockedRouter.push).toHaveBeenCalledWith('/transaction/tx-1');
    });

    it('shows delete confirmation when transaction is long pressed', async () => {
      render(<TransactionsScreen />);

      const transactionItem = screen.getByTestId('transaction-item-tx-1');
      fireEvent(transactionItem, 'longPress');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete transaction',
          'Are you sure you want to delete this transaction?',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
            expect.objectContaining({ text: 'Delete', style: 'destructive' }),
          ])
        );
      });
    });

    it('deletes transaction when delete is confirmed', async () => {
      render(<TransactionsScreen />);

      const transactionItem = screen.getByTestId('transaction-item-tx-1');
      fireEvent(transactionItem, 'longPress');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the delete button callback from the Alert.alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Delete');

      // Simulate pressing delete
      await deleteButton.onPress();

      expect(mockDeleteTransaction).toHaveBeenCalledWith('tx-1');
    });

    it('navigates to manual entry when add button is pressed', () => {
      render(<TransactionsScreen />);

      const addButton = screen.getByTestId('add-transaction-button');
      fireEvent.press(addButton);

      expect(mockedRouter.push).toHaveBeenCalledWith('/(tabs)/manual');
    });
  });

  describe('Visual Distinction', () => {
    it('displays income transactions with positive sign', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Salary Payment')).toBeTruthy();
      const incomeAmounts = screen.getAllByText('+$1500.00');
      expect(incomeAmounts.length).toBeGreaterThan(0);
    });

    it('displays expense transactions with negative sign', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Grocery Shopping')).toBeTruthy();
      expect(screen.getByText('-$50.00')).toBeTruthy();
    });
  });
});

describe('TransactionsScreen - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.isLoading = true;
    mockUsePaginatedTransactionsReturn.transactions = [];
  });

  afterEach(() => {
    mockUsePaginatedTransactionsReturn.isLoading = false;
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
  });

  it('shows loading indicator when loading', () => {
    render(<TransactionsScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});

describe('TransactionsScreen - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.error = 'Failed to load transactions';
    mockUsePaginatedTransactionsReturn.transactions = [];
  });

  afterEach(() => {
    mockUsePaginatedTransactionsReturn.error = null;
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
  });

  it('shows error state when there is an error', () => {
    render(<TransactionsScreen />);

    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
  });
});

describe('TransactionsScreen - Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = [];
    mockUsePaginatedTransactionsReturn.summary = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
    };
  });

  afterEach(() => {
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
    mockUsePaginatedTransactionsReturn.summary = mockSummary;
  });

  it('shows empty state when no transactions', () => {
    render(<TransactionsScreen />);

    expect(screen.getByTestId('empty-transactions')).toBeTruthy();
    expect(screen.getByText('No transactions yet')).toBeTruthy();
    expect(screen.getByText('Import a statement or add manually')).toBeTruthy();
  });

  it('navigates to import when empty state action is pressed', () => {
    render(<TransactionsScreen />);

    const importButton = screen.getByTestId('empty-transactions-action');
    fireEvent.press(importButton);

    expect(mockedRouter.push).toHaveBeenCalledWith('/import');
  });
});

describe('TransactionsScreen - Monthly Summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
    mockUsePaginatedTransactionsReturn.summary = mockSummary;
  });

  it('displays correct income amount', () => {
    render(<TransactionsScreen />);

    // Income should be $1500.00 (150000 cents / 100)
    const incomeAmounts = screen.getAllByText('+$1500.00');
    expect(incomeAmounts.length).toBeGreaterThan(0);
  });

  it('displays correct expenses amount', () => {
    render(<TransactionsScreen />);

    // Expenses should be $85.00 (8500 cents / 100)
    expect(screen.getByText(/85\.00/, { includeHiddenElements: true })).toBeTruthy();
  });

  it('displays correct balance', () => {
    render(<TransactionsScreen />);

    // Balance should be $1415.00 (141500 cents / 100)
    expect(screen.getByText(/1415\.00/, { includeHiddenElements: true })).toBeTruthy();
  });

  it('displays transaction count', () => {
    render(<TransactionsScreen />);

    expect(screen.getByText(/3\s+transactions/, { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('TransactionsScreen - Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
  });

  it('has accessible add transaction button', () => {
    render(<TransactionsScreen />);

    const addButton = screen.getByTestId('add-transaction-button');
    expect(addButton.props.accessibilityRole).toBe('button');
    expect(addButton.props.accessibilityLabel).toBe('Add transaction');
  });
});

describe('TransactionsScreen - Infinite Scroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
    mockUsePaginatedTransactionsReturn.isLoadingMore = true;
    mockUsePaginatedTransactionsReturn.hasMore = true;
  });

  afterEach(() => {
    mockUsePaginatedTransactionsReturn.isLoadingMore = false;
    mockUsePaginatedTransactionsReturn.hasMore = false;
  });

  it('shows loading footer when loading more', () => {
    render(<TransactionsScreen />);

    expect(screen.getByTestId('loading-more-indicator')).toBeTruthy();
  });

  /**
   * **Validates: Requirement 6.7**
   * FlashList is configured with onEndReachedThreshold of 0.5
   */
  it('configures FlashList with onEndReachedThreshold of 0.5', () => {
    render(<TransactionsScreen />);

    expect(lastFlashListProps.onEndReachedThreshold).toBe(0.5);
  });

  /**
   * **Validates: Requirement 6.3**
   * Loading indicator (footer) appears when isLoadingMore is true
   */
  it('displays loading indicator at bottom during pagination fetch', () => {
    mockUsePaginatedTransactionsReturn.isLoadingMore = true;
    render(<TransactionsScreen />);

    const loadingIndicator = screen.getByTestId('loading-more-indicator');
    expect(loadingIndicator).toBeTruthy();
  });

  it('does not display loading footer when not loading more', () => {
    mockUsePaginatedTransactionsReturn.isLoadingMore = false;
    render(<TransactionsScreen />);

    expect(screen.queryByTestId('loading-more-indicator')).toBeNull();
  });
});

describe('TransactionsScreen - Month Change Filter Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaginatedTransactionsReturn.transactions = mockTransactions;
    mockUsePaginatedTransactionsReturn.isLoading = false;
    mockUsePaginatedTransactionsReturn.isLoadingMore = false;
    mockUsePaginatedTransactionsReturn.error = null;
    mockUsePaginatedTransactionsReturn.summary = mockSummary;
    mockUsePaginatedTransactionsReturn.hasMore = false;
    // Simulate active category filter
    mockFilterState.categoryIds = ['cat-1', 'cat-2'];
  });

  afterEach(() => {
    mockFilterState.categoryIds = [];
  });

  /**
   * **Validates: Requirement 7.4**
   * When month changes, resetDateRange is called (date range resets) but category filter persists
   */
  it('resets date range but preserves category filter on month change', () => {
    render(<TransactionsScreen />);

    const prevButton = screen.getByTestId('month-selector-prev');
    fireEvent.press(prevButton);

    // Date range should be reset
    expect(mockResetDateRange).toHaveBeenCalled();
    // Full resetFilters should NOT be called (category filter persists)
    expect(mockResetFilters).not.toHaveBeenCalled();
  });

  it('resets date range on next month navigation as well', () => {
    render(<TransactionsScreen />);

    // First navigate to previous month so next button becomes enabled
    const prevButton = screen.getByTestId('month-selector-prev');
    fireEvent.press(prevButton);

    // Clear mocks to isolate the next navigation
    jest.clearAllMocks();

    // Now navigate forward
    const nextButton = screen.getByTestId('month-selector-next');
    fireEvent.press(nextButton);

    // Date range should be reset
    expect(mockResetDateRange).toHaveBeenCalled();
    // Full resetFilters should NOT be called (category filter persists)
    expect(mockResetFilters).not.toHaveBeenCalled();
  });
});
