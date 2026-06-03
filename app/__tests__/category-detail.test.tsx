/**
 * CategoryDetailScreen Unit Tests
 *
 * Tests for the Category Detail Screen component covering:
 * - Navigation integration (router.push with correct params)
 * - Empty state rendering
 * - Loading state rendering
 * - Error state with retry action
 * - Item press navigation (transaction vs weekly)
 * - Expense group badge rendering (fixed/variable/null)
 *
 * **Validates: Requirements 2.5, 3.4, 3.5, 4.1, 4.2, 8.3, 8.4**
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// ============================================================================
// Mocks
// ============================================================================

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    useLocalSearchParams: jest.fn(() => ({ id: 'cat-1', month: '2025-01' })),
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      back: (...args: unknown[]) => mockBack(...args),
      replace: jest.fn(),
      navigate: jest.fn(),
    },
    Stack: {
      Screen: ({ options }: { options?: { title?: string } }) =>
        React.createElement(View, { testID: 'stack-screen', 'aria-label': options?.title }),
    },
  };
});

// Mock @react-navigation/native (useFocusEffect)
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require('react');
    // Simulates focus effect by running callback on mount
    useEffect(() => {
      callback();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));

// Mock i18n module
jest.mock('../../src/i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  formatDateLocale: (date: Date, _locale: string) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  },
  getCurrentLocale: () => 'pt-BR' as const,
  getMonthName: (monthIndex: number, _locale: string, _style: string) => {
    const months = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    return months[monthIndex] ?? 'unknown';
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'categoryDetail.title': 'Detalhes da Categoria',
        'categoryDetail.transactionCount': `${params?.count ?? 0} lançamento(s)`,
        'categoryDetail.emptyTitle': 'Nenhum lançamento',
        'categoryDetail.emptyDescription':
          'Nenhum lançamento encontrado para esta categoria neste mês.',
        'categoryDetail.badgeFixed': 'Fixo',
        'categoryDetail.badgeVariable': 'Variável',
        'categoryDetail.weeklyIndicator': 'Semanal',
        'categoryDetail.errorTitle': 'Erro ao carregar',
        'categoryDetail.errorDescription': 'Não foi possível carregar os lançamentos.',
        'categoryDetail.retry': 'Tentar novamente',
        'categoryDetail.paid': 'Pago',
        'categoryDetail.pending': 'Pendente',
        'categoryDetail.installmentLabel': `Parcela ${params?.current ?? ''} de ${params?.total ?? ''}`,
        'categoryDetail.recurringLabel': 'Recorrente',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'pt-BR', changeLanguage: jest.fn() },
  }),
}));

// Mock useCategoryDetailData hook
const mockRefresh = jest.fn();
const mockHookReturn = {
  category: {
    id: 'cat-1',
    name: 'Alimentação',
    icon: '🍔',
    color: '#FF5733',
    type: 'expense' as const,
    expenseGroup: 'variable' as string | null,
  },
  items: [
    {
      id: 'txn-1',
      title: 'Supermercado',
      date: '2025-01-15',
      amount: -5000,
      type: 'transaction' as const,
      isPaid: true,
    },
    {
      id: 'txn-2',
      title: 'Restaurante',
      date: '2025-01-10',
      amount: -3000,
      type: 'transaction' as const,
      isPaid: true,
    },
    {
      id: 'wo-1',
      title: 'Feira semanal',
      date: '2025-01-08',
      amount: -2000,
      type: 'weekly' as const,
      weeklyGroupId: 'wg-1',
      isPaid: true,
    },
  ],
  total: 10000,
  count: 3,
  paymentSummary: { paidTotal: 10000, pendingTotal: 0, grandTotal: 10000 },
  installmentInfo: new Map(),
  isLoading: false,
  error: null,
  refresh: mockRefresh,
};

let mockHookReturnValue = { ...mockHookReturn };

jest.mock('../../src/hooks/useCategoryDetailData', () => ({
  useCategoryDetailData: () => mockHookReturnValue,
}));

// Mock themeStore
jest.mock('../../src/stores/themeStore', () => {
  const mockState = {
    resolvedScheme: 'light' as const,
    preference: 'light' as const,
    setPreference: jest.fn(),
  };
  const useThemeStore = (selector: (state: typeof mockState) => unknown) => {
    return selector ? selector(mockState) : mockState;
  };
  useThemeStore.getState = () => mockState;
  useThemeStore.setState = jest.fn();
  return { useThemeStore };
});

// Mock db client (prevent real DB access)
jest.mock('../../src/db/client', () => ({
  getDb: jest.fn(),
}));

// Mock db schema
jest.mock('../../src/db/schema', () => ({
  categories: {
    id: 'id',
    name: 'name',
    icon: 'icon',
    color: 'color',
    type: 'type',
    expenseGroup: 'expense_group',
  },
  transactions: { id: 'id', categoryId: 'category_id', referenceMonth: 'reference_month' },
  weeklyOccurrences: { id: 'id', weeklyGroupId: 'weekly_group_id' },
  weeklyRecurringGroups: { id: 'id', categoryId: 'category_id' },
}));

// Mock db queries
jest.mock('../../src/db/queries/categoryDetail', () => ({
  getCategoryDetailTransactionsQuery: jest.fn().mockResolvedValue([]),
  getCategoryDetailWeeklyQuery: jest.fn().mockResolvedValue([]),
}));

// Import after mocks
import CategoryDetailScreen from '../category/[id]';

// ============================================================================
// Tests
// ============================================================================

describe('CategoryDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturnValue = { ...mockHookReturn };
  });

  describe('Rendering with data', () => {
    it('renders the screen with category header info', () => {
      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-screen')).toBeTruthy();
      expect(screen.getByTestId('category-detail-header')).toBeTruthy();
      expect(screen.getByText('Alimentação')).toBeTruthy();
    });

    it('renders total amount formatted correctly', () => {
      render(<CategoryDetailScreen />);

      // total is 10000 cents = 100.00
      expect(screen.getByTestId('category-detail-total')).toBeTruthy();
      expect(screen.getByTestId('category-detail-total')).toHaveTextContent('R$ 100.00');
    });

    it('renders the month label formatted', () => {
      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-month')).toBeTruthy();
      expect(screen.getByText('Janeiro 2025')).toBeTruthy();
    });

    it('renders transaction count', () => {
      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-count')).toBeTruthy();
      expect(screen.getByText('3 lançamento(s)')).toBeTruthy();
    });

    it('renders transaction items in the list', () => {
      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-item-txn-1')).toBeTruthy();
      expect(screen.getByTestId('category-detail-item-txn-2')).toBeTruthy();
      expect(screen.getByTestId('category-detail-item-wo-1')).toBeTruthy();
    });

    it('renders weekly indicator badge for weekly items', () => {
      render(<CategoryDetailScreen />);

      // The weekly item should have the "Semanal" text visible
      expect(screen.getByText(/Semanal/)).toBeTruthy();
    });
  });

  describe('Loading state (Requirement 8.3)', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        isLoading: true,
        items: [],
        category: null,
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-loading')).toBeTruthy();
    });

    it('does not render the list when loading', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        isLoading: true,
        items: [],
        category: null,
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.queryByTestId('category-detail-list')).toBeNull();
    });
  });

  describe('Error state (Requirement 8.4)', () => {
    it('renders error state when error is present', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        isLoading: false,
        error: 'Database query failed',
        items: [],
        category: null,
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-error')).toBeTruthy();
    });

    it('displays error title and description', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        isLoading: false,
        error: 'Database query failed',
        items: [],
        category: null,
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByText('Erro ao carregar')).toBeTruthy();
      expect(screen.getByText('Não foi possível carregar os lançamentos.')).toBeTruthy();
    });

    it('renders retry button that calls refresh on press', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        isLoading: false,
        error: 'Database query failed',
        items: [],
        category: null,
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      const retryButton = screen.getByText('Tentar novamente');
      expect(retryButton).toBeTruthy();
      fireEvent.press(retryButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty state (Requirement 3.5)', () => {
    it('renders empty state when items list is empty', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        items: [],
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-empty')).toBeTruthy();
    });

    it('displays empty state title and description', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        items: [],
        total: 0,
        count: 0,
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByText('Nenhum lançamento')).toBeTruthy();
      expect(
        screen.getByText('Nenhum lançamento encontrado para esta categoria neste mês.')
      ).toBeTruthy();
    });
  });

  describe('Item press navigation (Requirements 4.1, 4.2)', () => {
    it('navigates to /transaction/[id] when a transaction item is pressed', () => {
      render(<CategoryDetailScreen />);

      const txnItem = screen.getByTestId('category-detail-item-txn-1');
      fireEvent.press(txnItem);

      expect(mockPush).toHaveBeenCalledWith('/transaction/txn-1');
    });

    it('navigates to /weekly-recurring/[groupId] when a weekly item is pressed', () => {
      render(<CategoryDetailScreen />);

      const weeklyItem = screen.getByTestId('category-detail-item-wo-1');
      fireEvent.press(weeklyItem);

      expect(mockPush).toHaveBeenCalledWith('/weekly-recurring/wg-1');
    });

    it('navigates to transaction detail for a second transaction', () => {
      render(<CategoryDetailScreen />);

      const txnItem = screen.getByTestId('category-detail-item-txn-2');
      fireEvent.press(txnItem);

      expect(mockPush).toHaveBeenCalledWith('/transaction/txn-2');
    });
  });

  describe('Expense group badge (Requirement 2.5)', () => {
    it('renders "Variável" badge when expenseGroup is variable', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        category: { ...mockHookReturn.category, expenseGroup: 'variable' },
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-badge')).toBeTruthy();
      expect(screen.getByText('Variável')).toBeTruthy();
    });

    it('renders "Fixo" badge when expenseGroup is fixed', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        category: { ...mockHookReturn.category, expenseGroup: 'fixed' },
      };

      render(<CategoryDetailScreen />);

      expect(screen.getByTestId('category-detail-badge')).toBeTruthy();
      expect(screen.getByText('Fixo')).toBeTruthy();
    });

    it('does not render badge when expenseGroup is null', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        category: { ...mockHookReturn.category, expenseGroup: null },
      };

      render(<CategoryDetailScreen />);

      expect(screen.queryByTestId('category-detail-badge')).toBeNull();
    });
  });

  describe('Weekly recurring indicator (Requirement 3.4)', () => {
    it('shows recurring indicator for weekly items', () => {
      render(<CategoryDetailScreen />);

      // Weekly item should have the recurring badge with 🔄 Semanal text
      const weeklyTexts = screen.getAllByText(/Semanal/);
      expect(weeklyTexts.length).toBeGreaterThan(0);
    });

    it('does not show recurring indicator for regular transaction items', () => {
      mockHookReturnValue = {
        ...mockHookReturn,
        items: [
          {
            id: 'txn-only',
            title: 'Regular Transaction',
            date: '2025-01-12',
            amount: -4500,
            type: 'transaction' as const,
          },
        ],
        total: 4500,
        count: 1,
      };

      render(<CategoryDetailScreen />);

      expect(screen.queryByText(/Semanal/)).toBeNull();
    });
  });
});
