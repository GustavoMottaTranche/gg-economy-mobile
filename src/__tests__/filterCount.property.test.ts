// Feature: statement-payment-integration, Property 7: Active filter count includes all active filters
import fc from 'fast-check';
import { useFilterStore } from '../stores/filterStore';

/**
 * Property 7: Active filter count includes all active filters
 *
 * For any FilterState object, the getActiveFilterCount function SHALL return the count
 * of fields that are non-default (non-empty categoryIds, non-null amounts, non-null dates,
 * and pendingOnly === true).
 *
 * **Validates: Requirements 4.6**
 */

// --- Helper: compute expected active filter count from a FilterState ---

interface FilterState {
  categoryIds: string[];
  minAmount: number | null;
  maxAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  pendingOnly: boolean;
}

function computeExpectedActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count++;
  if (filters.minAmount !== null) count++;
  if (filters.maxAmount !== null) count++;
  if (filters.startDate !== null) count++;
  if (filters.endDate !== null) count++;
  if (filters.pendingOnly) count++;
  return count;
}

// --- Arbitraries ---

const categoryIdArb = fc.uuid();

const dateStringArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc
      .integer({ min: 1, max: 12 })
      .chain((month) =>
        fc
          .integer({ min: 1, max: 28 })
          .map(
            (day) =>
              `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          )
      )
  );

const nullableDateArb = fc.oneof(dateStringArb, fc.constant(null));

const nullableAmountArb = fc.oneof(
  fc.integer({ min: 1, max: 9999999 }),
  fc.constant(null)
);

const filterStateArb: fc.Arbitrary<FilterState> = fc.record({
  categoryIds: fc.array(categoryIdArb, { minLength: 0, maxLength: 5 }),
  minAmount: nullableAmountArb,
  maxAmount: nullableAmountArb,
  startDate: nullableDateArb,
  endDate: nullableDateArb,
  pendingOnly: fc.boolean(),
});

// --- Property Tests ---

describe('Property 7: Active filter count includes all active filters', () => {
  beforeEach(() => {
    // Reset the store to default state before each test
    useFilterStore.getState().resetFilters();
  });

  it('getActiveFilterCount returns the count of non-default filter fields for any FilterState', () => {
    fc.assert(
      fc.property(filterStateArb, (filterState) => {
        // Set the store state directly
        useFilterStore.setState({ filters: { ...filterState } });

        const actualCount = useFilterStore.getState().getActiveFilterCount();
        const expectedCount = computeExpectedActiveFilterCount(filterState);

        expect(actualCount).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it('default filter state always returns count of 0', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        useFilterStore.getState().resetFilters();

        const count = useFilterStore.getState().getActiveFilterCount();
        expect(count).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('each individual filter field contributes exactly 1 to the count when active', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasCategoryIds: fc.boolean(),
          hasMinAmount: fc.boolean(),
          hasMaxAmount: fc.boolean(),
          hasStartDate: fc.boolean(),
          hasEndDate: fc.boolean(),
          hasPendingOnly: fc.boolean(),
        }),
        ({ hasCategoryIds, hasMinAmount, hasMaxAmount, hasStartDate, hasEndDate, hasPendingOnly }) => {
          const filters: FilterState = {
            categoryIds: hasCategoryIds ? ['some-category-id'] : [],
            minAmount: hasMinAmount ? 1000 : null,
            maxAmount: hasMaxAmount ? 5000 : null,
            startDate: hasStartDate ? '2024-01-01' : null,
            endDate: hasEndDate ? '2024-01-31' : null,
            pendingOnly: hasPendingOnly,
          };

          useFilterStore.setState({ filters: { ...filters } });

          const actualCount = useFilterStore.getState().getActiveFilterCount();
          const expectedCount =
            (hasCategoryIds ? 1 : 0) +
            (hasMinAmount ? 1 : 0) +
            (hasMaxAmount ? 1 : 0) +
            (hasStartDate ? 1 : 0) +
            (hasEndDate ? 1 : 0) +
            (hasPendingOnly ? 1 : 0);

          expect(actualCount).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
