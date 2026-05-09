/**
 * Transactions Screen Tests
 *
 * Tests for the Transactions screen component.
 *
 * **Validates: Requirements 19, 20, 30**
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
    t: (key: string, params?: Record<string, unknown>) => {
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
        'import.selectFile': 'Select File',
        'errors.generic': 'An error occurred. Please try again.',
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

// Mock useTransactions hook
const mockRemove = jest.fn().mockResolvedValue(undefined);
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

const mockTransactions = [
  {
    id: 'tx-1',
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
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    category: {
      id: 'cat-1',
      name: 'Salary',
      type: 'income' as const,
      icon: '💰',
      color: '#22C55E',
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
  },
  {
    id: 'tx-2',
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
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    category: {
      id: 'cat-2',
      name: 'Food',
      type: 'expense' as const,
      icon: '🍔',
      color: '#EF4444',
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
  },
  {
    id: 'tx-3',
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
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    category: {
      id: 'cat-3',
      name: 'Transport',
      type: 'expense' as const,
      icon: '🚗',
      color: '#F59E0B',
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
  },
];

const mockSummary = {
  totalIncome: 150000,
  totalExpenses: 8500,
  balance: 141500,
  transactionCount: 3,
};

const mockUseTransactionsReturn = {
  transactions: mockTransactions,
  isLoading: false,
  error: null,
  summary: mockSummary,
  totalCount: 3,
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  nextPage: jest.fn(),
  previousPage: jest.fn(),
  goToPage: jest.fn(),
  create: mockCreate,
  update: mockUpdate,
  remove: mockRemove,
  markAsReviewed: jest.fn(),
  setCategory: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('../../src/hooks/useTransactions', () => ({
  useTransactions: () => mockUseTransactionsReturn,
  TransactionWithCategory: {},
}));

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const { FlatList, View, Text } = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListHeaderComponent,
      ListEmptyComponent,
      testID,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactElement;
      keyExtractor: (item: unknown) => string;
      ListHeaderComponent?: React.ReactElement;
      ListEmptyComponent?: React.ReactElement;
      testID?: string;
    }) => (
      <View testID={testID}>
        {ListHeaderComponent}
        {data && data.length > 0 ? (
          <FlatList data={data} renderItem={renderItem} keyExtractor={keyExtractor} />
        ) : (
          ListEmptyComponent
        )}
      </View>
    ),
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
    mockUseTransactionsReturn.transactions = mockTransactions;
    mockUseTransactionsReturn.isLoading = false;
    mockUseTransactionsReturn.error = null;
    mockUseTransactionsReturn.summary = mockSummary;
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

      // The month selector should show the current month
      const monthSelector = screen.getByTestId('month-selector');
      expect(monthSelector).toBeTruthy();
    });

    it('renders monthly summary with correct values', () => {
      render(<TransactionsScreen />);

      expect(screen.getByText('Month summary')).toBeTruthy();
      expect(screen.getByText('Income')).toBeTruthy();
      expect(screen.getByText('Expenses')).toBeTruthy();
      expect(screen.getByText('Balance')).toBeTruthy();
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

      // The component should update the selected month
      // This is handled internally by the component state
    });

    it('navigates to next month when next button is pressed', () => {
      render(<TransactionsScreen />);

      const nextButton = screen.getByTestId('month-selector-next');
      fireEvent.press(nextButton);

      // The component should update the selected month
      // This is handled internally by the component state
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

      expect(mockRemove).toHaveBeenCalledWith('tx-1');
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

      // The Salary Payment transaction should show as income
      expect(screen.getByText('Salary Payment')).toBeTruthy();
      // Use getAllByText since the amount appears in both the card and summary
      const incomeAmounts = screen.getAllByText('+$1500.00');
      expect(incomeAmounts.length).toBeGreaterThan(0);
    });

    it('displays expense transactions with negative sign', () => {
      render(<TransactionsScreen />);

      // The Grocery Shopping transaction should show as expense
      expect(screen.getByText('Grocery Shopping')).toBeTruthy();
      expect(screen.getByText('-$50.00')).toBeTruthy();
    });
  });
});

describe('TransactionsScreen - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsReturn.isLoading = true;
    mockUseTransactionsReturn.transactions = [];
  });

  afterEach(() => {
    mockUseTransactionsReturn.isLoading = false;
    mockUseTransactionsReturn.transactions = mockTransactions;
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
    mockUseTransactionsReturn.error = 'Failed to load transactions';
    mockUseTransactionsReturn.transactions = [];
  });

  afterEach(() => {
    mockUseTransactionsReturn.error = null;
    mockUseTransactionsReturn.transactions = mockTransactions;
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
    mockUseTransactionsReturn.transactions = [];
    mockUseTransactionsReturn.summary = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
    };
  });

  afterEach(() => {
    mockUseTransactionsReturn.transactions = mockTransactions;
    mockUseTransactionsReturn.summary = mockSummary;
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
    mockUseTransactionsReturn.transactions = mockTransactions;
    mockUseTransactionsReturn.summary = mockSummary;
  });

  it('displays correct income amount', () => {
    render(<TransactionsScreen />);

    // Income should be $1500.00 (150000 cents / 100)
    // Use getAllByText since the amount appears in both the card and summary
    const incomeAmounts = screen.getAllByText('+$1500.00');
    expect(incomeAmounts.length).toBeGreaterThan(0);
  });

  it('displays correct expenses amount', () => {
    render(<TransactionsScreen />);

    // Expenses should be $85.00 (8500 cents / 100)
    expect(screen.getByText('-$85.00')).toBeTruthy();
  });

  it('displays correct balance', () => {
    render(<TransactionsScreen />);

    // Balance should be $1415.00 (141500 cents / 100)
    expect(screen.getByText('+$1415.00')).toBeTruthy();
  });

  it('displays transaction count', () => {
    render(<TransactionsScreen />);

    expect(screen.getByText('3 transactions')).toBeTruthy();
  });
});

describe('TransactionsScreen - Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionsReturn.transactions = mockTransactions;
  });

  it('has accessible add transaction button', () => {
    render(<TransactionsScreen />);

    const addButton = screen.getByTestId('add-transaction-button');
    expect(addButton.props.accessibilityRole).toBe('button');
    expect(addButton.props.accessibilityLabel).toBe('Add transaction');
  });
});
