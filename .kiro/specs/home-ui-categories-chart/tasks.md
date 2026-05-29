# Implementation Plan: Home UI Categories Chart

## Overview

Redesign the Dashboard (Home) screen to introduce collapsible expense group sections (Fixed/Variable), lazy-loaded transaction lists per category, an enhanced chart with fixed-vs-variable comparison and filter options, unrestricted future month navigation, and visual layout corrections. Implementation uses TypeScript with the existing Expo Router, Drizzle ORM, Zustand, react-native-svg, and theme system architecture.

## Tasks

- [x] 1. Enhance data layer and utility functions
  - [x] 1.1 Add `roundPercentages` utility function
    - Create `src/utils/roundPercentages.ts` implementing the largest-remainder method
    - Function accepts an array of numeric values and a total, returns integer percentages summing to exactly 100
    - Export the function from `src/utils/roundPercentages.ts`
    - _Requirements: 3.3_

  - [x] 1.2 Write property test for percentage rounding (Property 4)
    - **Property 4: Percentage rounding invariant — sum equals 100**
    - Create `src/__tests__/properties/percentageRounding.property.test.ts`
    - For any set of two or more positive monetary values whose sum is greater than zero, `roundPercentages` SHALL produce integer percentages that sum to exactly 100
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 3.3**

  - [x] 1.3 Enhance `getCategoryBreakdownQuery` to include `expenseGroup`
    - Modify `src/db/queries/dashboard.ts` to add `expenseGroup: categories.expenseGroup` to the select clause of `getCategoryBreakdownQuery`
    - Update the `CategoryBreakdownResult` interface to include `expenseGroup: string | null`
    - _Requirements: 1.1_

  - [x] 1.4 Create `getCategoryTransactionsQuery` in the dashboard queries module
    - Add a new query function in `src/db/queries/dashboard.ts` that fetches transactions for a given `categoryId` and `referenceMonth`
    - Select `id`, `description` (using `title` field), `amount`, and `date` from the transactions table
    - Filter by `categoryId`, `referenceMonth`, and `isExcludedFromTotals = false`
    - Order by `date` descending
    - Export the function and its result type
    - _Requirements: 2.3, 2.5_

  - [x] 1.5 Write property test for category grouping (Property 1)
    - **Property 1: Category grouping partitions by expenseGroup**
    - Create `src/__tests__/properties/categoryGrouping.property.test.ts`
    - For any array of expense categories with mixed `expenseGroup` values, the grouping function SHALL place all categories with `expenseGroup = 'fixed'` into the fixed group, all with `expenseGroup = 'variable'` into the variable group, and exclude all with `expenseGroup = null`
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 1.1**

  - [x] 1.6 Write property test for month advancement (Property 6)
    - **Property 6: Month advancement produces correct next month**
    - Create `src/__tests__/properties/monthNavigationUnrestricted.property.test.ts`
    - For any valid YYYY-MM string, advancing to the next month SHALL produce the chronologically next month, correctly handling December→January year transitions
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 5.2**

- [x] 2. Enhance `useDashboardData` hook and create `useCategoryTransactions` hook
  - [x] 2.1 Enhance `useDashboardData` to return grouped expense breakdowns
    - Modify `src/hooks/useDashboardData.ts` to compute `fixedBreakdown`, `variableBreakdown`, `fixedTotal`, `variableTotal` from the enhanced breakdown query
    - Add `chartFilter` state (`'all' | 'fixed' | 'variable'`) with default `'all'` and `setChartFilter` setter
    - Update `CategoryBreakdownItem` interface to include `expenseGroup: string | null`
    - Use `roundPercentages` for percentage computation within each group
    - Update the `UseDashboardDataReturn` interface with the new fields
    - _Requirements: 1.1, 1.7, 1.8, 4.6_

  - [x] 2.2 Write property test for section totals (Property 2)
    - **Property 2: Section total equals sum of category amounts**
    - Create `src/__tests__/properties/sectionTotals.property.test.ts`
    - For any non-empty array of category breakdown items belonging to an expense group, the computed section total SHALL equal the arithmetic sum of all individual category `total` values
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 1.7, 1.8**

  - [x] 2.3 Create `useCategoryTransactions` hook
    - Create `src/hooks/useCategoryTransactions.ts` implementing the lazy-loading hook
    - Hook accepts `categoryId: string | null`, `month: string`, and `enabled: boolean`
    - Only executes the database query when `enabled` is `true`
    - Returns `{ transactions, isLoading, error, retry }` interface
    - Clears data from memory when `enabled` becomes `false`
    - Export from `src/hooks/index.ts`
    - _Requirements: 2.1, 2.3, 2.4, 2.6_

  - [x] 2.4 Write property test for transaction ordering (Property 3)
    - **Property 3: Transaction list ordering by date descending**
    - Create `src/__tests__/properties/transactionOrdering.property.test.ts`
    - For any non-empty list of transactions returned for a category in a given month, the list SHALL be ordered such that for every consecutive pair, the date of t[i] >= date of t[i+1]
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement new UI components
  - [x] 4.1 Create `CollapsibleSection` component
    - Create `src/components/dashboard/CollapsibleSection.tsx`
    - Implement collapsible container with animated expand/collapse (max 300ms transition)
    - Display section title, total formatted in user currency, and chevron indicator (down when expanded, right when collapsed)
    - Accept `categories`, `isExpanded`, `onToggle`, `onCategoryPress`, `expandedCategoryId`, `selectedMonth` props
    - Use theme system for styling (spacing, shadows, borderRadius, colors)
    - Handle empty section state (zero total, no items)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 4.2 Create `CategoryRow` component
    - Create `src/components/dashboard/CategoryRow.tsx`
    - Display category name, color indicator, total amount, and percentage
    - Support expand/collapse to reveal inline transaction list
    - Use `useCategoryTransactions` hook for lazy loading when expanded
    - Show loading indicator while fetching transactions
    - Show error state with retry button on query failure
    - Show empty state message when no transactions exist
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 4.3 Create `TransactionList` component
    - Create `src/components/dashboard/TransactionList.tsx`
    - Display each transaction with description, amount, and date
    - Render inline within expanded `CategoryRow`
    - Order transactions by date descending (most recent first)
    - _Requirements: 2.5_

  - [x] 4.4 Create `ChartFilter` component
    - Create `src/components/dashboard/ChartFilter.tsx`
    - Implement three filter options: "Todos", "Somente Fixo", "Somente Variável"
    - Visually indicate the active option with differentiated styling (background color/highlight)
    - Default to "Todos" selected
    - Call `onSelect` callback when user taps an option
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 4.5 Create `ExpenseChart` component
    - Create `src/components/dashboard/ExpenseChart.tsx`
    - Support fixed-vs-variable comparison mode (when filter is "Todos") showing two segments with monetary values and percentages
    - Support per-group breakdown mode (when filter is "Somente Fixo" or "Somente Variável") showing individual category segments
    - Use `roundPercentages` to ensure displayed percentages sum to 100
    - Animate transitions between visualization modes (200-400ms)
    - Show empty state when total expenses are zero or selected group has no data
    - Use existing `react-native-svg` and chart patterns from `src/components/charts/`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4, 4.7, 4.8_

  - [x] 4.6 Write property test for filtered chart percentages (Property 5)
    - **Property 5: Filtered chart shows only matching group with correct relative percentages**
    - Create `src/__tests__/properties/filterPercentages.property.test.ts`
    - For any set of expense categories and a selected filter ('fixed' or 'variable'), the chart SHALL display only categories belonging to the selected expense group, and their displayed percentages SHALL sum to exactly 100
    - Use `fast-check` with `{ numRuns: 100 }`
    - **Validates: Requirements 4.2, 4.3**

- [x] 5. Modify MonthSelector for unrestricted future navigation
  - [x] 5.1 Update `MonthSelector` to support future months
    - Modify `src/components/dashboard/MonthSelector.tsx` to accept an optional `isFutureMonth` prop
    - When `isFutureMonth` is true, display a visual indicator (e.g., subtle badge or text color change) that the displayed month is in the future
    - Ensure the next button remains enabled regardless of the current month
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [x] 5.2 Write unit tests for MonthSelector future navigation
    - Test that next button is always enabled when `disableNext` is not passed
    - Test that `isFutureMonth` indicator renders correctly
    - Test month label updates on navigation
    - _Requirements: 5.1, 5.2, 5.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wire components together in the Dashboard screen
  - [x] 7.1 Refactor Dashboard screen to use new components
    - Modify `app/(tabs)/index.tsx` to replace the existing `CategoryBreakdown` with `CollapsibleSection` (Fixed) and `CollapsibleSection` (Variable)
    - Add `ChartFilter` and `ExpenseChart` components between `SummaryCard` and the collapsible sections
    - Add local state for section expand/collapse and expanded category tracking
    - Remove the `isNextDisabled` logic (allow unrestricted forward navigation)
    - Pass `isFutureMonth` prop to `MonthSelector` based on comparison with current month
    - Use enhanced `useDashboardData` hook with `fixedBreakdown`, `variableBreakdown`, `chartFilter`, `setChartFilter`
    - _Requirements: 1.2, 4.6, 5.1, 5.4, 5.5, 6.1_

  - [x] 7.2 Apply layout corrections and visual hierarchy
    - Ensure component order: MonthSelector → SummaryCard → ExpenseChart with ChartFilter → Seção_Fixo → Seção_Variável
    - Apply `spacing.base` (16px) vertical spacing between all adjacent components
    - Apply `spacing.base` (16px) horizontal padding on all components
    - Apply `shadows.lg` to SummaryCard and `shadows.sm` or `shadows.md` to other cards
    - Verify no element overlap on screens 320px–428px wide
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.3 Export new components from dashboard index
    - Update `src/components/dashboard/index.ts` to export `CollapsibleSection`, `CategoryRow`, `TransactionList`, `ChartFilter`, and `ExpenseChart`
    - _Requirements: 6.1_

  - [x] 7.4 Write unit tests for Dashboard integration
    - Test initial state: both sections expanded, "Todos" filter selected
    - Test collapse/expand toggle behavior for sections
    - Test lazy loading: expand category → loading indicator → data appears
    - Test error state: mock query failure → error message + retry button
    - Test filter change: select "Somente Fixo" → chart updates with only fixed categories
    - Test future month navigation: navigate to future month → dashboard renders with zeros
    - _Requirements: 1.2, 2.3, 2.6, 4.6, 5.4, 5.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Jest with `fast-check` for property-based testing
- All components use the existing theme system (`spacing`, `shadows`, `borderRadius`, `colors`)
- Database queries follow the existing Drizzle ORM pattern with `getDb()`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.5", "1.6", "2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "5.1"] },
    { "id": 3, "tasks": ["4.1", "4.3", "4.4", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.5"] },
    { "id": 5, "tasks": ["4.6", "7.3"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.4"] }
  ]
}
```
