/**
 * Payment Status Store Tests
 *
 * Tests for the paymentStatusStore Zustand store.
 * Validates:
 * - Loading pending items and totals
 * - Toggle updates state correctly (optimistic update + refresh)
 * - Bulk mark updates state correctly
 * - Error state handling and revert
 * - isLoading prevents concurrent operations
 *
 * **Validates: Requirements 1.4, 3.4, 5.2**
 */

import { act } from '@testing-library/react-native';
import type { PendingItem, PaymentTotals, BulkMarkResult } from '../../types/paymentStatus';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the PaymentStatusService
const mockGetPendingItemsForMonth = jest.fn();
const mockGetPaymentTotalsForMonth = jest.fn();
const mockToggleWeeklyOccurrence = jest.fn();
const mockToggleMonthlyTransaction = jest.fn();
const mockBulkMarkWeeklyGroup = jest.fn();
const mockBulkMarkMonthlyGroup = jest.fn();

jest.mock('../../services/payment-status/PaymentStatusService', () => ({
  paymentStatusService: {
    getPendingItemsForMonth: (...args: unknown[]) => mockGetPendingItemsForMonth(...args),
    getPaymentTotalsForMonth: (...args: unknown[]) => mockGetPaymentTotalsForMonth(...args),
    toggleWeeklyOccurrence: (...args: unknown[]) => mockToggleWeeklyOccurrence(...args),
    toggleMonthlyTransaction: (...args: unknown[]) => mockToggleMonthlyTransaction(...args),
    bulkMarkWeeklyGroup: (...args: unknown[]) => mockBulkMarkWeeklyGroup(...args),
    bulkMarkMonthlyGroup: (...args: unknown[]) => mockBulkMarkMonthlyGroup(...args),
  },
}));

// Mock the logger
jest.mock('../../services/logging', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import after mocks
import { usePaymentStatusStore } from '../paymentStatusStore';
import { useToastStore } from '../toastStore';

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockPendingItems: PendingItem[] = [
  {
    id: 'occ-1',
    type: 'weekly',
    groupId: 'group-1',
    groupName: 'Internet',
    amount: 99.9,
    date: '2024-01-05',
    referenceMonth: '2024-01',
  },
  {
    id: 'occ-2',
    type: 'monthly',
    groupId: 'group-2',
    groupName: 'Aluguel',
    amount: 1500.0,
    date: '2024-01-10',
    referenceMonth: '2024-01',
  },
];

const mockPaymentTotals: PaymentTotals = {
  predictedTotal: 2500.0,
  paidTotal: 900.1,
  pendingTotal: 1599.9,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('paymentStatusStore', () => {
  beforeEach(() => {
    // Reset store state
    usePaymentStatusStore.setState({
      pendingItems: {},
      paymentTotals: {},
      isLoading: false,
      error: null,
    });

    // Reset toast store
    useToastStore.getState().reset();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with empty state', () => {
      const state = usePaymentStatusStore.getState();

      expect(state.pendingItems).toEqual({});
      expect(state.paymentTotals).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadPendingItemsForMonth', () => {
    it('sets pendingItems[month] correctly on success', async () => {
      mockGetPendingItemsForMonth.mockResolvedValue(mockPendingItems);

      await act(async () => {
        await usePaymentStatusStore.getState().loadPendingItemsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.pendingItems['2024-01']).toEqual(mockPendingItems);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading to true during operation', async () => {
      let loadingDuringCall = false;
      mockGetPendingItemsForMonth.mockImplementation(() => {
        loadingDuringCall = usePaymentStatusStore.getState().isLoading;
        return Promise.resolve([]);
      });

      await act(async () => {
        await usePaymentStatusStore.getState().loadPendingItemsForMonth('2024-01');
      });

      expect(loadingDuringCall).toBe(true);
      expect(usePaymentStatusStore.getState().isLoading).toBe(false);
    });

    it('sets error state on failure', async () => {
      mockGetPendingItemsForMonth.mockRejectedValue(new Error('DB connection failed'));

      await act(async () => {
        await usePaymentStatusStore.getState().loadPendingItemsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.error).toBe('DB connection failed');
      expect(state.isLoading).toBe(false);
    });

    it('preserves pending items for other months', async () => {
      // Pre-populate another month
      usePaymentStatusStore.setState({
        pendingItems: { '2024-02': [mockPendingItems[0]] },
      });

      mockGetPendingItemsForMonth.mockResolvedValue(mockPendingItems);

      await act(async () => {
        await usePaymentStatusStore.getState().loadPendingItemsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.pendingItems['2024-01']).toEqual(mockPendingItems);
      expect(state.pendingItems['2024-02']).toEqual([mockPendingItems[0]]);
    });
  });

  describe('loadPaymentTotalsForMonth', () => {
    it('sets paymentTotals[month] correctly on success', async () => {
      mockGetPaymentTotalsForMonth.mockResolvedValue(mockPaymentTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().loadPaymentTotalsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.paymentTotals['2024-01']).toEqual(mockPaymentTotals);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error state on failure', async () => {
      mockGetPaymentTotalsForMonth.mockRejectedValue(new Error('Query failed'));

      await act(async () => {
        await usePaymentStatusStore.getState().loadPaymentTotalsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.error).toBe('Query failed');
      expect(state.isLoading).toBe(false);
    });

    it('preserves totals for other months', async () => {
      const otherTotals: PaymentTotals = { predictedTotal: 100, paidTotal: 50, pendingTotal: 50 };
      usePaymentStatusStore.setState({
        paymentTotals: { '2024-02': otherTotals },
      });

      mockGetPaymentTotalsForMonth.mockResolvedValue(mockPaymentTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().loadPaymentTotalsForMonth('2024-01');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.paymentTotals['2024-01']).toEqual(mockPaymentTotals);
      expect(state.paymentTotals['2024-02']).toEqual(otherTotals);
    });
  });

  describe('togglePaymentStatus', () => {
    beforeEach(() => {
      // Set up initial state with pending items
      usePaymentStatusStore.setState({
        pendingItems: { '2024-01': [...mockPendingItems] },
        paymentTotals: { '2024-01': mockPaymentTotals },
      });
    });

    it('optimistically removes item from pending list on toggle', async () => {
      const updatedItems: PendingItem[] = [mockPendingItems[1]];
      const updatedTotals: PaymentTotals = {
        predictedTotal: 2500.0,
        paidTotal: 999.0,
        pendingTotal: 1501.0,
      };

      mockToggleWeeklyOccurrence.mockResolvedValue({ id: 'occ-1', isPaid: true });
      mockGetPendingItemsForMonth.mockResolvedValue(updatedItems);
      mockGetPaymentTotalsForMonth.mockResolvedValue(updatedTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-1', 'weekly');
      });

      const state = usePaymentStatusStore.getState();
      expect(state.pendingItems['2024-01']).toEqual(updatedItems);
      expect(state.paymentTotals['2024-01']).toEqual(updatedTotals);
      expect(state.isLoading).toBe(false);
    });

    it('calls toggleWeeklyOccurrence for weekly type', async () => {
      mockToggleWeeklyOccurrence.mockResolvedValue({ id: 'occ-1', isPaid: true });
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue(mockPaymentTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-1', 'weekly');
      });

      expect(mockToggleWeeklyOccurrence).toHaveBeenCalledWith('occ-1');
      expect(mockToggleMonthlyTransaction).not.toHaveBeenCalled();
    });

    it('calls toggleMonthlyTransaction for monthly type', async () => {
      mockToggleMonthlyTransaction.mockResolvedValue({ id: 'occ-2', isPaid: true });
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue(mockPaymentTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-2', 'monthly');
      });

      expect(mockToggleMonthlyTransaction).toHaveBeenCalledWith('occ-2');
      expect(mockToggleWeeklyOccurrence).not.toHaveBeenCalled();
    });

    it('reverts state and shows toast on failure', async () => {
      mockToggleWeeklyOccurrence.mockRejectedValue(new Error('Toggle failed'));

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-1', 'weekly');
      });

      const state = usePaymentStatusStore.getState();
      // State should be reverted to original
      expect(state.pendingItems['2024-01']).toEqual(mockPendingItems);
      expect(state.paymentTotals['2024-01']).toEqual(mockPaymentTotals);
      expect(state.error).toBe('Toggle failed');
      expect(state.isLoading).toBe(false);

      // Toast should have been shown
      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(toasts[0].severity).toBe('error');
      expect(toasts[0].message).toBe('Toggle failed');
    });

    it('refreshes pending items and totals after successful toggle', async () => {
      const refreshedItems: PendingItem[] = [mockPendingItems[1]];
      const refreshedTotals: PaymentTotals = {
        predictedTotal: 2500.0,
        paidTotal: 1000.0,
        pendingTotal: 1500.0,
      };

      mockToggleWeeklyOccurrence.mockResolvedValue({ id: 'occ-1', isPaid: true });
      mockGetPendingItemsForMonth.mockResolvedValue(refreshedItems);
      mockGetPaymentTotalsForMonth.mockResolvedValue(refreshedTotals);

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-1', 'weekly');
      });

      expect(mockGetPendingItemsForMonth).toHaveBeenCalledWith('2024-01');
      expect(mockGetPaymentTotalsForMonth).toHaveBeenCalledWith('2024-01');

      const state = usePaymentStatusStore.getState();
      expect(state.pendingItems['2024-01']).toEqual(refreshedItems);
      expect(state.paymentTotals['2024-01']).toEqual(refreshedTotals);
    });

    it('prevents concurrent operations when isLoading is true', async () => {
      // Set isLoading to true
      usePaymentStatusStore.setState({ isLoading: true });

      await act(async () => {
        await usePaymentStatusStore.getState().togglePaymentStatus('occ-1', 'weekly');
      });

      // Service should not have been called
      expect(mockToggleWeeklyOccurrence).not.toHaveBeenCalled();
      expect(mockToggleMonthlyTransaction).not.toHaveBeenCalled();
    });
  });

  describe('bulkMarkAsPaid', () => {
    const bulkResult: BulkMarkResult = {
      markedCount: 3,
      affectedMonths: ['2024-01', '2024-02'],
    };

    beforeEach(() => {
      usePaymentStatusStore.setState({
        pendingItems: {
          '2024-01': [...mockPendingItems],
          '2024-02': [mockPendingItems[0]],
        },
        paymentTotals: {
          '2024-01': mockPaymentTotals,
          '2024-02': { predictedTotal: 100, paidTotal: 0, pendingTotal: 100 },
        },
      });
    });

    it('calls bulkMarkWeeklyGroup for weekly type', async () => {
      mockBulkMarkWeeklyGroup.mockResolvedValue(bulkResult);
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue({
        predictedTotal: 2500,
        paidTotal: 2500,
        pendingTotal: 0,
      });

      await act(async () => {
        await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      expect(mockBulkMarkWeeklyGroup).toHaveBeenCalledWith('group-1');
      expect(mockBulkMarkMonthlyGroup).not.toHaveBeenCalled();
    });

    it('calls bulkMarkMonthlyGroup for monthly type', async () => {
      mockBulkMarkMonthlyGroup.mockResolvedValue(bulkResult);
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue({
        predictedTotal: 2500,
        paidTotal: 2500,
        pendingTotal: 0,
      });

      await act(async () => {
        await usePaymentStatusStore.getState().bulkMarkAsPaid('group-2', 'monthly');
      });

      expect(mockBulkMarkMonthlyGroup).toHaveBeenCalledWith('group-2');
      expect(mockBulkMarkWeeklyGroup).not.toHaveBeenCalled();
    });

    it('refreshes affected months on success', async () => {
      mockBulkMarkWeeklyGroup.mockResolvedValue(bulkResult);
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue({
        predictedTotal: 2500,
        paidTotal: 2500,
        pendingTotal: 0,
      });

      await act(async () => {
        await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      // Should refresh both affected months
      expect(mockGetPendingItemsForMonth).toHaveBeenCalledWith('2024-01');
      expect(mockGetPendingItemsForMonth).toHaveBeenCalledWith('2024-02');
      expect(mockGetPaymentTotalsForMonth).toHaveBeenCalledWith('2024-01');
      expect(mockGetPaymentTotalsForMonth).toHaveBeenCalledWith('2024-02');
    });

    it('returns BulkMarkResult on success', async () => {
      mockBulkMarkWeeklyGroup.mockResolvedValue(bulkResult);
      mockGetPendingItemsForMonth.mockResolvedValue([]);
      mockGetPaymentTotalsForMonth.mockResolvedValue({
        predictedTotal: 2500,
        paidTotal: 2500,
        pendingTotal: 0,
      });

      let result: BulkMarkResult | undefined;
      await act(async () => {
        result = await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      expect(result).toEqual(bulkResult);
    });

    it('reverts state and shows toast on failure', async () => {
      mockBulkMarkWeeklyGroup.mockRejectedValue(new Error('Bulk mark failed'));

      const previousPendingItems = usePaymentStatusStore.getState().pendingItems;
      const previousPaymentTotals = usePaymentStatusStore.getState().paymentTotals;

      let result: BulkMarkResult | undefined;
      await act(async () => {
        result = await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      const state = usePaymentStatusStore.getState();
      // State should be reverted
      expect(state.pendingItems['2024-01']).toEqual(previousPendingItems['2024-01']);
      expect(state.pendingItems['2024-02']).toEqual(previousPendingItems['2024-02']);
      expect(state.paymentTotals['2024-01']).toEqual(previousPaymentTotals['2024-01']);
      expect(state.error).toBe('Bulk mark failed');
      expect(state.isLoading).toBe(false);

      // Should return empty result
      expect(result).toEqual({ markedCount: 0, affectedMonths: [] });

      // Toast should have been shown
      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
      expect(toasts[0].severity).toBe('error');
      expect(toasts[0].message).toBe('Bulk mark failed');
    });

    it('prevents concurrent operations when isLoading is true', async () => {
      usePaymentStatusStore.setState({ isLoading: true });

      let result: BulkMarkResult | undefined;
      await act(async () => {
        result = await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      expect(mockBulkMarkWeeklyGroup).not.toHaveBeenCalled();
      expect(result).toEqual({ markedCount: 0, affectedMonths: [] });
    });

    it('handles empty affectedMonths without refreshing', async () => {
      const emptyResult: BulkMarkResult = { markedCount: 0, affectedMonths: [] };
      mockBulkMarkWeeklyGroup.mockResolvedValue(emptyResult);

      await act(async () => {
        await usePaymentStatusStore.getState().bulkMarkAsPaid('group-1', 'weekly');
      });

      // Should not attempt to refresh since no months were affected
      expect(mockGetPendingItemsForMonth).not.toHaveBeenCalled();
      expect(mockGetPaymentTotalsForMonth).not.toHaveBeenCalled();
      expect(usePaymentStatusStore.getState().isLoading).toBe(false);
    });
  });
});
