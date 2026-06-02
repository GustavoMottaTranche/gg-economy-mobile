/**
 * Zustand store for transaction filter state management
 *
 * Manages filter selections (category, value range, date range) and panel
 * expansion state. Filters persist across month navigation within the same
 * session. When the reference month changes, only the date range resets
 * (since dates are month-specific); category and value filters persist.
 *
 * **Validates: Requirements 4.7, 7.1**
 */
import { create } from 'zustand';

/**
 * Filter state representing active filter selections.
 * All filters use AND logic between different filter types.
 * Category filter uses OR logic within selected categories.
 */
export interface FilterState {
  /** Selected category IDs (OR logic within this filter) */
  categoryIds: string[];
  /** Minimum absolute amount in cents (inclusive) */
  minAmount: number | null;
  /** Maximum absolute amount in cents (inclusive) */
  maxAmount: number | null;
  /** Start date filter as ISO string (YYYY-MM-DD, inclusive) */
  startDate: string | null;
  /** End date filter as ISO string (YYYY-MM-DD, inclusive) */
  endDate: string | null;
  /** When true, show only items where isPaid is false */
  pendingOnly: boolean;
}

/**
 * Filter store state and actions.
 */
export interface FilterStoreState {
  /** Current filter selections */
  filters: FilterState;
  /** Whether the filter panel is expanded */
  isExpanded: boolean;

  // Actions

  /** Set the full list of selected category IDs */
  setCategoryIds: (ids: string[]) => void;
  /** Toggle a single category ID in/out of the selection */
  toggleCategory: (id: string) => void;
  /** Set the minimum amount filter (null to clear) */
  setMinAmount: (amount: number | null) => void;
  /** Set the maximum amount filter (null to clear) */
  setMaxAmount: (amount: number | null) => void;
  /** Set the start date filter (null to clear) */
  setStartDate: (date: string | null) => void;
  /** Set the end date filter (null to clear) */
  setEndDate: (date: string | null) => void;
  /** Set the "Pending only" filter (show only unpaid items) */
  setPendingOnly: (value: boolean) => void;
  /** Set the filter panel expanded/collapsed state */
  setExpanded: (expanded: boolean) => void;
  /** Reset all filters to default (empty) state */
  resetFilters: () => void;
  /** Reset only date range filters (called on month change) */
  resetDateRange: () => void;
  /** Get the count of currently active filters */
  getActiveFilterCount: () => number;
}

/**
 * Default (empty) filter state.
 */
const defaultFilters: FilterState = {
  categoryIds: [],
  minAmount: null,
  maxAmount: null,
  startDate: null,
  endDate: null,
  pendingOnly: false,
};

/**
 * Zustand store for filter management.
 *
 * Persists category and value filters across month navigation.
 * Date range resets on month change since dates are month-specific.
 */
export const useFilterStore = create<FilterStoreState>((set, get) => ({
  filters: { ...defaultFilters },
  isExpanded: false,

  setCategoryIds: (ids: string[]) => {
    set((state) => ({
      filters: { ...state.filters, categoryIds: [...ids] },
    }));
  },

  toggleCategory: (id: string) => {
    set((state) => {
      const current = state.filters.categoryIds;
      const exists = current.includes(id);
      const categoryIds = exists ? current.filter((cid) => cid !== id) : [...current, id];
      return { filters: { ...state.filters, categoryIds } };
    });
  },

  setMinAmount: (amount: number | null) => {
    set((state) => ({
      filters: { ...state.filters, minAmount: amount },
    }));
  },

  setMaxAmount: (amount: number | null) => {
    set((state) => ({
      filters: { ...state.filters, maxAmount: amount },
    }));
  },

  setStartDate: (date: string | null) => {
    set((state) => ({
      filters: { ...state.filters, startDate: date },
    }));
  },

  setEndDate: (date: string | null) => {
    set((state) => ({
      filters: { ...state.filters, endDate: date },
    }));
  },

  setPendingOnly: (value: boolean) => {
    set((state) => ({
      filters: { ...state.filters, pendingOnly: value },
    }));
  },

  setExpanded: (expanded: boolean) => {
    set({ isExpanded: expanded });
  },

  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
  },

  resetDateRange: () => {
    const { filters } = get();
    // Only update if dates are actually set (avoid unnecessary re-renders)
    if (filters.startDate !== null || filters.endDate !== null) {
      set((state) => ({
        filters: { ...state.filters, startDate: null, endDate: null },
      }));
    }
  },

  getActiveFilterCount: () => {
    const { filters } = get();
    let count = 0;

    if (filters.categoryIds.length > 0) count++;
    if (filters.minAmount !== null) count++;
    if (filters.maxAmount !== null) count++;
    if (filters.startDate !== null) count++;
    if (filters.endDate !== null) count++;
    if (filters.pendingOnly) count++;

    return count;
  },
}));
