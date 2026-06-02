/**
 * Zustand store for batch entry session management
 *
 * Manages in-memory batch session state including:
 * - Session activation with category selection
 * - Entry count tracking with max 50 limit
 * - Total value accumulation
 * - Session summary on end
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6, 6.3**
 */

import { create } from 'zustand';

import { CategoryType } from '../../types/category';
import { BatchSession, BatchSessionActions, BatchSessionSummary } from '../../types/batch';

type BatchSessionStore = BatchSession & BatchSessionActions;

/**
 * Initial state for a batch session
 */
const initialState: BatchSession = {
  isActive: false,
  categoryId: null,
  categoryType: null,
  title: null,
  entryCount: 0,
  maxEntries: 50,
  totalValue: 0,
};

/**
 * Zustand store for batch entry session management.
 * State is in-memory only — not persisted to DB until each entry is saved.
 */
export const useBatchSessionStore = create<BatchSessionStore>()((set, get) => ({
  ...initialState,

  startSession(categoryId: string, categoryType: CategoryType, title: string): void {
    set({
      isActive: true,
      categoryId,
      categoryType,
      title,
      entryCount: 0,
      totalValue: 0,
    });
  },

  incrementCount(amount: number): void {
    const { entryCount, maxEntries } = get();

    if (entryCount >= maxEntries) {
      return;
    }

    set((state) => ({
      entryCount: state.entryCount + 1,
      totalValue: state.totalValue + amount,
    }));
  },

  endSession(): BatchSessionSummary {
    const { entryCount, totalValue } = get();

    const summary: BatchSessionSummary = {
      totalEntries: entryCount,
      totalValue,
    };

    set(initialState);

    return summary;
  },

  reset(): void {
    set(initialState);
  },
}));
