# Implementation Plan: Transaction Statement Redesign

## Overview

Redesign the transaction statement and detail screens with improved visuals, add filtering capabilities (category, value range, date range), implement editable categories from the detail screen via bottom sheet, and migrate to cursor-based infinite scroll pagination with a page size of 20. The implementation extends existing patterns (Drizzle ORM, Zustand stores, FlashList, i18n) and introduces a filter state layer with SQL-level filtering.

## Tasks

- [x] 1. Create filter store and query builder infrastructure
  - [x] 1.1 Create `useFilterStore` Zustand store at `src/stores/filterStore.ts`
    - Implement `FilterState` interface with `categoryIds`, `minAmount`, `maxAmount`, `startDate`, `endDate`
    - Implement actions: `setCategoryIds`, `toggleCategory`, `setMinAmount`, `setMaxAmount`, `setStartDate`, `setEndDate`, `setExpanded`, `resetFilters`, `getActiveFilterCount`
    - Date range resets on month change; category and value filters persist across months
    - _Requirements: 4.7, 7.1_

  - [x] 1.2 Create `buildFilterConditions` query builder at `src/db/buildFilterConditions.ts`
    - Accept `PaginationFilters` (referenceMonth, categoryIds, minAmount, maxAmount, startDate, endDate)
    - Build Drizzle `and(...)` condition combining all non-null filters
    - Use `inArray` for category filter (OR logic), `sql` template for ABS amount comparisons, date comparisons
    - _Requirements: 7.1, 7.3, 4.3, 5.2, 5.3, 5.4, 8.2, 8.3, 8.4_

  - [x] 1.3 Write property test for `buildFilterConditions` (Property 6: Combined Filter Query Builder)
    - **Property 6: Combined Filter Query Builder**
    - **Validates: Requirements 7.1, 7.3**
    - Generate random filter combinations, verify the built condition produces equivalent results to applying each filter sequentially

- [x] 2. Extend `usePaginatedTransactions` hook with filter support
  - [x] 2.1 Refactor `src/hooks/usePaginatedTransactions.ts` to accept `PaginationFilters`
    - Change `PaginationOptions` to include `categoryIds`, `minAmount`, `maxAmount`, `startDate`, `endDate`
    - Integrate `buildFilterConditions` for WHERE clause construction
    - Reduce default page size from 50 to 20
    - Add `FilteredSummary` aggregate query (totalIncome, totalExpenses, balance, transactionCount) with same filters but no cursor
    - Reset cursor when any filter parameter changes
    - Prevent duplicate batch requests while loading (`isLoadingMore` guard)
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3_

  - [x] 2.2 Write property test for cursor pagination ordering (Property 7)
    - **Property 7: Cursor Pagination Ordering Consistency**
    - **Validates: Requirements 6.5, 6.4**
    - Generate random ordered transaction sets, paginate with page size 20, verify concatenated results maintain strict (date DESC, id DESC) ordering with no duplicates

  - [x] 2.3 Write property test for category filter correctness (Property 2)
    - **Property 2: Category Filter Correctness**
    - **Validates: Requirements 4.3, 4.5**
    - Generate random transaction arrays and random category ID subsets, verify filter output matches expected set membership (OR logic)

  - [x] 2.4 Write property test for value range filter correctness (Property 4)
    - **Property 4: Value Range Filter Correctness**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - Generate random transactions and random [min, max] ranges, verify filter output contains exactly transactions where abs(amount) is within range

  - [x] 2.5 Write property test for date range filter correctness (Property 5)
    - **Property 5: Date Range Filter Correctness**
    - **Validates: Requirements 8.2, 8.3, 8.4**
    - Generate random transactions with random dates and random [start, end] ranges, verify filter output

  - [x] 2.6 Write property test for summary recalculation (Property 3)
    - **Property 3: Summary Recalculation from Filtered Data**
    - **Validates: Requirements 4.6, 5.6, 8.6**
    - Generate random transactions with random filters, verify computed summary equals manual aggregation of filtered subset

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create FilterPanel component
  - [x] 4.1 Create `FilterPanel` component at `src/components/filters/FilterPanel.tsx`
    - Implement collapsible panel with toggle button showing active filter count badge
    - Add category chips section with horizontal scroll and multi-select (using existing category data from `useCategories`)
    - Add min/max amount `TextInput` fields with locale-aware numeric keyboard
    - Add start/end date picker buttons using `@react-native-community/datetimepicker`
    - Add "Clear all" button to reset filters
    - Implement validation: show inline error if min > max or startDate > endDate, retain previous valid state
    - Use i18n translation keys for all labels, placeholders, and error messages
    - Support light/dark themes via `useThemeColors`
    - Maintain accessibility attributes on all interactive elements
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.5, 5.7, 8.1, 8.5, 8.7, 8.8, 9.1, 9.3, 9.4, 9.5_

  - [x] 4.2 Write property test for currency locale round-trip (Property 8)
    - **Property 8: Currency Locale Round-Trip**
    - **Validates: Requirements 5.7, 9.3**
    - Generate random numeric values, format with locale decimal separator, parse back, verify equality within 1 cent tolerance

  - [x] 4.3 Write unit tests for FilterPanel
    - Test expanded/collapsed rendering
    - Test category chip toggle behavior
    - Test validation error display for invalid ranges
    - Test active filter count badge
    - _Requirements: 4.1, 4.2, 4.4, 5.5, 8.5_

- [x] 5. Redesign Statement Screen with filters and pagination
  - [x] 5.1 Refactor `app/(tabs)/transactions.tsx` to integrate FilterPanel, useFilterStore, and extended usePaginatedTransactions
    - Replace `useTransactions` with extended `usePaginatedTransactions` (page size 20)
    - Subscribe to `useFilterStore` for filter state
    - Render `FilterPanel` between MonthSelector and transaction list
    - Pass `FilteredSummary` from hook to `MonthlySummary` component (recalculated based on active filters)
    - Configure FlashList with `onEndReached={loadMore}` and `onEndReachedThreshold={0.5}`
    - Add loading indicator (`ListFooterComponent`) while `isLoadingMore` is true
    - Reset filters and pagination when reference month changes
    - Redesign header with screen title and add-transaction button using design system tokens
    - Update MonthSelector styling consistent with new design
    - Update MonthlySummary with color-coded values (green income, red expenses) using semantic color tokens
    - Ensure TransactionCard uses consistent card styling, spacing, and elevation
    - Support light/dark themes via `useThemeColors`
    - Maintain all existing accessibility attributes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.6, 5.6, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 7.2, 7.4, 8.6, 9.1_

  - [x] 5.2 Write property test for amount color assignment (Property 1)
    - **Property 1: Amount Color Assignment**
    - **Validates: Requirements 1.3, 2.1**
    - For any transaction amount, verify green for positive, red for negative

  - [x] 5.3 Write unit tests for Statement Screen integration
    - Test FlashList configured with correct onEndReachedThreshold
    - Test loading indicator appears during pagination fetch
    - Test month change resets date range but preserves category filter
    - _Requirements: 6.7, 6.3, 7.4_

- [x] 6. Redesign Detail Screen with category editing
  - [x] 6.1 Refactor `app/transaction/[id].tsx` with visual redesign and category edit via bottom sheet
    - Redesign amount display prominently at top with color-coded formatting (green income, red expenses)
    - Restructure transaction fields in card layout using design system tokens
    - Redesign action buttons with clear visual hierarchy
    - Make category row tappable — opens bottom sheet with `CategorySelector` (pre-selected current category)
    - On category select: if installment group, show Alert for scope (this parcel only vs. all parcels via `updateGroupField`)
    - Call `setTransactionCategory` on confirm; on success close sheet and UI updates reactively
    - On failure: show Alert error with i18n message, retain previous category
    - Support light/dark themes via `useThemeColors`
    - Maintain all existing accessibility attributes
    - Use i18n translation keys for category edit prompt and confirmation messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.2_

  - [x] 6.2 Write unit tests for Detail Screen category editing
    - Test bottom sheet opens with pre-selected category
    - Test installment group prompt appears for group transactions
    - Test error handling retains previous category
    - _Requirements: 3.1, 3.4, 3.6_

- [x] 7. Add i18n translation keys
  - [x] 7.1 Add translation keys to `src/i18n/` for pt-BR and en locales
    - Add filter labels: "Filtros", "Categoria", "Valor mínimo", "Valor máximo", "Data início", "Data fim", "Limpar filtros"
    - Add filter placeholders and validation errors
    - Add category edit prompts: "Alterar categoria", "Aplicar a esta parcela", "Aplicar a todas as parcelas"
    - Add active filter badge text
    - Add empty filter results message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript/TSX
- Existing indexes in the database schema already support all query patterns (no migrations needed)
- The `buildFilterConditions` function is a pure function that can be tested independently of the database

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "7.1"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2"] }
  ]
}
```
