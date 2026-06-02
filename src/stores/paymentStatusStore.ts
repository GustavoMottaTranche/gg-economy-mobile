/**
 * Zustand store for payment status tracking
 *
 * Manages state for pending items and payment totals per month,
 * toggle operations, and bulk mark actions with optimistic updates.
 *
 * **Validates: Requirements 1.1, 1.4, 3.2, 3.4, 4.1, 4.2, 5.1, 5.2**
 */
import { create } from 'zustand';
import { logger } from '../services/logging';
import { paymentStatusService } from '../services/payment-status/PaymentStatusService';
import { useToastStore } from './toastStore';
import type { PendingItem, PaymentTotals, BulkMarkResult } from '../types/paymentStatus';

// ─── State Interface ─────────────────────────────────────────────────────────

interface PaymentStatusState {
  /** Pending items keyed by reference month (YYYY-MM) */
  pendingItems: Record<string, PendingItem[]>;
  /** Payment totals keyed by reference month (YYYY-MM) */
  paymentTotals: Record<string, PaymentTotals>;
  /** Whether an async operation is in progress */
  isLoading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
}

// ─── Actions Interface ───────────────────────────────────────────────────────

interface PaymentStatusActions {
  /** Load pending items for a given month */
  loadPendingItemsForMonth(month: string): Promise<void>;
  /** Load payment totals for a given month */
  loadPaymentTotalsForMonth(month: string): Promise<void>;
  /** Toggle payment status of a single occurrence */
  togglePaymentStatus(id: string, type: 'weekly' | 'monthly'): Promise<void>;
  /** Bulk mark all unpaid occurrences in a group as paid */
  bulkMarkAsPaid(groupId: string, type: 'weekly' | 'monthly'): Promise<BulkMarkResult>;
}

type PaymentStatusStore = PaymentStatusState & PaymentStatusActions;

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: PaymentStatusState = {
  pendingItems: {},
  paymentTotals: {},
  isLoading: false,
  error: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Zustand store for payment status tracking.
 *
 * - `loadPendingItemsForMonth`: fetches pending items from PaymentStatusService
 * - `loadPaymentTotalsForMonth`: fetches payment totals from PaymentStatusService
 * - `togglePaymentStatus`: toggles isPaid for a single occurrence with optimistic update
 * - `bulkMarkAsPaid`: marks all unpaid occurrences in a group as paid
 *
 * On toggle/bulk mark success, recalculates totals and refreshes pending items.
 * On failure, reverts optimistic state and shows error via toastStore.
 */
export const usePaymentStatusStore = create<PaymentStatusStore>()((set, get) => ({
  ...initialState,

  loadPendingItemsForMonth: async (month: string) => {
    set({ isLoading: true, error: null });
    try {
      const items = await paymentStatusService.getPendingItemsForMonth(month);
      set((state) => ({
        pendingItems: { ...state.pendingItems, [month]: items },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load pending items';
      logger.error('Failed to load pending items for month', { month, error: message });
      set({ error: message, isLoading: false });
    }
  },

  loadPaymentTotalsForMonth: async (month: string) => {
    try {
      const totals = await paymentStatusService.getPaymentTotalsForMonth(month);
      set((state) => ({
        paymentTotals: { ...state.paymentTotals, [month]: totals },
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load payment totals';
      logger.error('Failed to load payment totals for month', { month, error: message });
      set({ error: message });
    }
  },

  togglePaymentStatus: async (id: string, type: 'weekly' | 'monthly') => {
    const { isLoading, pendingItems, paymentTotals } = get();

    // Prevent concurrent operations
    if (isLoading) return;

    // Save previous state for rollback
    const previousPendingItems = { ...pendingItems };
    const previousPaymentTotals = { ...paymentTotals };

    // Find the item being toggled to determine its month
    let affectedMonth: string | null = null;
    for (const [month, items] of Object.entries(pendingItems)) {
      const item = items.find((i) => i.id === id && i.type === type);
      if (item) {
        affectedMonth = month;
        break;
      }
    }

    // Optimistic update: remove item from pending list
    if (affectedMonth) {
      set((state) => ({
        isLoading: true,
        error: null,
        pendingItems: {
          ...state.pendingItems,
          [affectedMonth!]: (state.pendingItems[affectedMonth!] ?? []).filter(
            (item) => !(item.id === id && item.type === type)
          ),
        },
      }));
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      // Perform the toggle
      if (type === 'weekly') {
        await paymentStatusService.toggleWeeklyOccurrence(id);
      } else {
        await paymentStatusService.toggleMonthlyTransaction(id);
      }

      // Recalculate totals and refresh pending items for affected month
      if (affectedMonth) {
        const [items, totals] = await Promise.all([
          paymentStatusService.getPendingItemsForMonth(affectedMonth),
          paymentStatusService.getPaymentTotalsForMonth(affectedMonth),
        ]);

        set((state) => ({
          pendingItems: { ...state.pendingItems, [affectedMonth!]: items },
          paymentTotals: { ...state.paymentTotals, [affectedMonth!]: totals },
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle payment status';
      logger.error('Failed to toggle payment status', { id, type, error: message });

      // Revert optimistic state
      set({
        pendingItems: previousPendingItems,
        paymentTotals: previousPaymentTotals,
        error: message,
        isLoading: false,
      });

      // Show error toast
      useToastStore.getState().showError(message);
    }
  },

  bulkMarkAsPaid: async (groupId: string, type: 'weekly' | 'monthly'): Promise<BulkMarkResult> => {
    const { isLoading, pendingItems, paymentTotals } = get();

    // Prevent concurrent operations
    if (isLoading) {
      return { markedCount: 0, affectedMonths: [] };
    }

    // Save previous state for rollback
    const previousPendingItems = { ...pendingItems };
    const previousPaymentTotals = { ...paymentTotals };

    set({ isLoading: true, error: null });

    try {
      // Perform the bulk mark
      let result: BulkMarkResult;
      if (type === 'weekly') {
        result = await paymentStatusService.bulkMarkWeeklyGroup(groupId);
      } else {
        result = await paymentStatusService.bulkMarkMonthlyGroup(groupId);
      }

      // Refresh pending items and totals for all affected months
      if (result.affectedMonths.length > 0) {
        const refreshPromises = result.affectedMonths.flatMap((month) => [
          paymentStatusService.getPendingItemsForMonth(month).then((items) => ({
            type: 'pending' as const,
            month,
            data: items,
          })),
          paymentStatusService.getPaymentTotalsForMonth(month).then((totals) => ({
            type: 'totals' as const,
            month,
            data: totals,
          })),
        ]);

        const results = await Promise.all(refreshPromises);

        set((state) => {
          const newPendingItems = { ...state.pendingItems };
          const newPaymentTotals = { ...state.paymentTotals };

          for (const r of results) {
            if (r.type === 'pending') {
              newPendingItems[r.month] = r.data as PendingItem[];
            } else {
              newPaymentTotals[r.month] = r.data as PaymentTotals;
            }
          }

          return {
            pendingItems: newPendingItems,
            paymentTotals: newPaymentTotals,
            isLoading: false,
          };
        });
      } else {
        set({ isLoading: false });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk mark as paid';
      logger.error('Failed to bulk mark as paid', { groupId, type, error: message });

      // Revert state
      set({
        pendingItems: previousPendingItems,
        paymentTotals: previousPaymentTotals,
        error: message,
        isLoading: false,
      });

      // Show error toast
      useToastStore.getState().showError(message);

      return { markedCount: 0, affectedMonths: [] };
    }
  },
}));

// ─── Selector Hooks ──────────────────────────────────────────────────────────

const EMPTY_PENDING_ITEMS: PendingItem[] = [];

/**
 * Hook to get pending items for a specific month
 */
export function usePendingItems(month: string) {
  return usePaymentStatusStore((state) => state.pendingItems[month] ?? EMPTY_PENDING_ITEMS);
}

/**
 * Hook to get payment totals for a specific month
 */
export function usePaymentTotals(month: string) {
  return usePaymentStatusStore((state) => state.paymentTotals[month] ?? null);
}

/**
 * Hook to get loading and error state
 */
export function usePaymentStatusLoading() {
  const isLoading = usePaymentStatusStore((state) => state.isLoading);
  const error = usePaymentStatusStore((state) => state.error);
  return { isLoading, error };
}
