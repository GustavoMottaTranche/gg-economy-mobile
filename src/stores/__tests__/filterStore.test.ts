/**
 * Filter Store Tests
 *
 * Tests for the transaction filter Zustand store.
 * Validates:
 * - Default state is empty filters and collapsed panel
 * - setCategoryIds sets the full category list
 * - toggleCategory adds/removes individual categories
 * - setMinAmount/setMaxAmount set value range filters
 * - setStartDate/setEndDate set date range filters
 * - setExpanded controls panel visibility
 * - resetFilters clears all filters to defaults
 * - resetDateRange clears only date filters (preserves category and value)
 * - getActiveFilterCount returns correct count of active filters
 *
 * **Validates: Requirements 4.7, 7.1**
 */

import { act } from '@testing-library/react-native';
import { useFilterStore } from '../filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    act(() => {
      useFilterStore.setState({
        filters: {
          categoryIds: [],
          minAmount: null,
          maxAmount: null,
          startDate: null,
          endDate: null,
          pendingOnly: false,
        },
        isExpanded: false,
      });
    });
  });

  describe('Initial State', () => {
    it('defaults to empty filters', () => {
      const state = useFilterStore.getState();
      expect(state.filters.categoryIds).toEqual([]);
      expect(state.filters.minAmount).toBeNull();
      expect(state.filters.maxAmount).toBeNull();
      expect(state.filters.startDate).toBeNull();
      expect(state.filters.endDate).toBeNull();
    });

    it('defaults to collapsed panel', () => {
      const state = useFilterStore.getState();
      expect(state.isExpanded).toBe(false);
    });

    it('defaults to zero active filter count', () => {
      const count = useFilterStore.getState().getActiveFilterCount();
      expect(count).toBe(0);
    });
  });

  describe('setCategoryIds', () => {
    it('sets the full list of category IDs', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1', 'cat-2', 'cat-3']);
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-1', 'cat-2', 'cat-3']);
    });

    it('replaces existing category IDs', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1']);
      });
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-2', 'cat-3']);
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-2', 'cat-3']);
    });

    it('clears categories when set to empty array', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1', 'cat-2']);
      });
      act(() => {
        useFilterStore.getState().setCategoryIds([]);
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual([]);
    });
  });

  describe('toggleCategory', () => {
    it('adds a category when not present', () => {
      act(() => {
        useFilterStore.getState().toggleCategory('cat-1');
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-1']);
    });

    it('removes a category when already present', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1', 'cat-2']);
      });
      act(() => {
        useFilterStore.getState().toggleCategory('cat-1');
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-2']);
    });

    it('toggles multiple categories independently', () => {
      act(() => {
        useFilterStore.getState().toggleCategory('cat-1');
      });
      act(() => {
        useFilterStore.getState().toggleCategory('cat-2');
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-1', 'cat-2']);

      act(() => {
        useFilterStore.getState().toggleCategory('cat-1');
      });

      expect(useFilterStore.getState().filters.categoryIds).toEqual(['cat-2']);
    });
  });

  describe('setMinAmount / setMaxAmount', () => {
    it('sets minimum amount', () => {
      act(() => {
        useFilterStore.getState().setMinAmount(1000);
      });

      expect(useFilterStore.getState().filters.minAmount).toBe(1000);
    });

    it('sets maximum amount', () => {
      act(() => {
        useFilterStore.getState().setMaxAmount(5000);
      });

      expect(useFilterStore.getState().filters.maxAmount).toBe(5000);
    });

    it('clears minimum amount with null', () => {
      act(() => {
        useFilterStore.getState().setMinAmount(1000);
      });
      act(() => {
        useFilterStore.getState().setMinAmount(null);
      });

      expect(useFilterStore.getState().filters.minAmount).toBeNull();
    });

    it('clears maximum amount with null', () => {
      act(() => {
        useFilterStore.getState().setMaxAmount(5000);
      });
      act(() => {
        useFilterStore.getState().setMaxAmount(null);
      });

      expect(useFilterStore.getState().filters.maxAmount).toBeNull();
    });

    it('allows setting both min and max independently', () => {
      act(() => {
        useFilterStore.getState().setMinAmount(1000);
      });
      act(() => {
        useFilterStore.getState().setMaxAmount(5000);
      });

      const { filters } = useFilterStore.getState();
      expect(filters.minAmount).toBe(1000);
      expect(filters.maxAmount).toBe(5000);
    });
  });

  describe('setStartDate / setEndDate', () => {
    it('sets start date', () => {
      act(() => {
        useFilterStore.getState().setStartDate('2024-01-15');
      });

      expect(useFilterStore.getState().filters.startDate).toBe('2024-01-15');
    });

    it('sets end date', () => {
      act(() => {
        useFilterStore.getState().setEndDate('2024-01-31');
      });

      expect(useFilterStore.getState().filters.endDate).toBe('2024-01-31');
    });

    it('clears start date with null', () => {
      act(() => {
        useFilterStore.getState().setStartDate('2024-01-15');
      });
      act(() => {
        useFilterStore.getState().setStartDate(null);
      });

      expect(useFilterStore.getState().filters.startDate).toBeNull();
    });

    it('clears end date with null', () => {
      act(() => {
        useFilterStore.getState().setEndDate('2024-01-31');
      });
      act(() => {
        useFilterStore.getState().setEndDate(null);
      });

      expect(useFilterStore.getState().filters.endDate).toBeNull();
    });
  });

  describe('setPendingOnly', () => {
    it('sets pendingOnly to true', () => {
      act(() => {
        useFilterStore.getState().setPendingOnly(true);
      });

      expect(useFilterStore.getState().filters.pendingOnly).toBe(true);
    });

    it('sets pendingOnly to false', () => {
      act(() => {
        useFilterStore.getState().setPendingOnly(true);
      });
      act(() => {
        useFilterStore.getState().setPendingOnly(false);
      });

      expect(useFilterStore.getState().filters.pendingOnly).toBe(false);
    });

    it('defaults to false', () => {
      expect(useFilterStore.getState().filters.pendingOnly).toBe(false);
    });
  });

  describe('setExpanded', () => {
    it('expands the filter panel', () => {
      act(() => {
        useFilterStore.getState().setExpanded(true);
      });

      expect(useFilterStore.getState().isExpanded).toBe(true);
    });

    it('collapses the filter panel', () => {
      act(() => {
        useFilterStore.getState().setExpanded(true);
      });
      act(() => {
        useFilterStore.getState().setExpanded(false);
      });

      expect(useFilterStore.getState().isExpanded).toBe(false);
    });
  });

  describe('resetFilters', () => {
    it('resets all filters to default state', () => {
      // Set various filters
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1', 'cat-2']);
        useFilterStore.getState().setMinAmount(1000);
        useFilterStore.getState().setMaxAmount(5000);
        useFilterStore.getState().setStartDate('2024-01-01');
        useFilterStore.getState().setEndDate('2024-01-31');
        useFilterStore.getState().setPendingOnly(true);
      });

      // Reset
      act(() => {
        useFilterStore.getState().resetFilters();
      });

      const { filters } = useFilterStore.getState();
      expect(filters.categoryIds).toEqual([]);
      expect(filters.minAmount).toBeNull();
      expect(filters.maxAmount).toBeNull();
      expect(filters.startDate).toBeNull();
      expect(filters.endDate).toBeNull();
      expect(filters.pendingOnly).toBe(false);
    });

    it('does not affect isExpanded state', () => {
      act(() => {
        useFilterStore.getState().setExpanded(true);
      });
      act(() => {
        useFilterStore.getState().resetFilters();
      });

      expect(useFilterStore.getState().isExpanded).toBe(true);
    });
  });

  describe('resetDateRange', () => {
    it('resets only date range filters', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1']);
        useFilterStore.getState().setMinAmount(1000);
        useFilterStore.getState().setMaxAmount(5000);
        useFilterStore.getState().setStartDate('2024-01-01');
        useFilterStore.getState().setEndDate('2024-01-31');
      });

      act(() => {
        useFilterStore.getState().resetDateRange();
      });

      const { filters } = useFilterStore.getState();
      // Date range should be cleared
      expect(filters.startDate).toBeNull();
      expect(filters.endDate).toBeNull();
      // Category and value filters should persist
      expect(filters.categoryIds).toEqual(['cat-1']);
      expect(filters.minAmount).toBe(1000);
      expect(filters.maxAmount).toBe(5000);
    });
  });

  describe('getActiveFilterCount', () => {
    it('returns 0 when no filters are active', () => {
      expect(useFilterStore.getState().getActiveFilterCount()).toBe(0);
    });

    it('counts category filter as 1 regardless of how many categories selected', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1', 'cat-2', 'cat-3']);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('counts minAmount as 1', () => {
      act(() => {
        useFilterStore.getState().setMinAmount(1000);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('counts maxAmount as 1', () => {
      act(() => {
        useFilterStore.getState().setMaxAmount(5000);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('counts startDate as 1', () => {
      act(() => {
        useFilterStore.getState().setStartDate('2024-01-01');
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('counts endDate as 1', () => {
      act(() => {
        useFilterStore.getState().setEndDate('2024-01-31');
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('counts all active filters correctly', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1']);
        useFilterStore.getState().setMinAmount(1000);
        useFilterStore.getState().setMaxAmount(5000);
        useFilterStore.getState().setStartDate('2024-01-01');
        useFilterStore.getState().setEndDate('2024-01-31');
        useFilterStore.getState().setPendingOnly(true);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(6);
    });

    it('counts pendingOnly as 1 when true', () => {
      act(() => {
        useFilterStore.getState().setPendingOnly(true);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });

    it('does not count pendingOnly when false', () => {
      act(() => {
        useFilterStore.getState().setPendingOnly(false);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(0);
    });

    it('decreases count when filters are cleared', () => {
      act(() => {
        useFilterStore.getState().setCategoryIds(['cat-1']);
        useFilterStore.getState().setMinAmount(1000);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(2);

      act(() => {
        useFilterStore.getState().setMinAmount(null);
      });

      expect(useFilterStore.getState().getActiveFilterCount()).toBe(1);
    });
  });
});
