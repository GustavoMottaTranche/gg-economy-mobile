# Implementation Plan: Category Detail Screen

## Overview

Implement a drill-down Category Detail Screen accessible from the Dashboard's CollapsibleSection. When a user taps a category row, the app navigates to a new screen displaying all transactions and weekly occurrences for that category in the selected month. The implementation follows existing patterns from `app/transaction/[id].tsx` and `app/weekly-recurring/[id].tsx`.

## Tasks

- [x] 1. Create data layer queries
  - [x] 1.1 Create `src/db/queries/categoryDetail.ts` with query functions
    - Implement `getCategoryDetailTransactionsQuery(categoryId, referenceMonth)` using Drizzle ORM
    - Filter: `categoryId` match, `referenceMonth` match, `isExcludedFromTotals = false`, `(isPaid = 1 OR recurringId IS NULL)`
    - Order by `date DESC`
    - Implement `getCategoryDetailWeeklyQuery(categoryId, referenceMonth)` joining `weeklyOccurrences` → `weeklyRecurringGroups`
    - Filter: `wrg.categoryId` match, `wo.referenceMonth` match, `wo.isPaid = true`
    - Order by `date DESC`
    - _Requirements: 5.1, 5.2, 5.3, 8.2_

- [x] 2. Create custom hook
  - [x] 2.1 Create `src/hooks/useCategoryDetailData.ts`
    - Define `CategoryDetailItem`, `CategoryInfo`, and `UseCategoryDetailDataReturn` interfaces
    - Fetch category metadata from `categories` table by ID
    - Fetch transactions via `getCategoryDetailTransactionsQuery`
    - Fetch weekly occurrences via `getCategoryDetailWeeklyQuery`
    - Merge both lists, sort by date descending
    - Compute total as sum of `abs(amount)` across all items
    - Re-fetch on screen focus using `useFocusEffect` or equivalent
    - Handle loading, error, and empty states
    - _Requirements: 3.1, 3.3, 4.3, 5.4, 8.1, 8.3, 8.4_

  - [x] 2.2 Write property test: Data filtering correctness
    - **Property 1: Data filtering correctness**
    - Generate random transactions/weekly occurrences with various filter states
    - Assert only items matching dashboard filters are included
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 2.3 Write property test: List sort order
    - **Property 2: List sort order**
    - Generate random valid category detail items
    - Assert items are ordered by date descending (item[i].date >= item[i+1].date)
    - **Validates: Requirements 3.1**

  - [x] 2.4 Write property test: Total consistency
    - **Property 3: Total consistency**
    - Generate random items with known amounts
    - Assert total equals sum of abs(amount) across all items
    - **Validates: Requirements 5.4, 2.2**

  - [x] 2.5 Write property test: Weekly occurrence inclusion with indicator
    - **Property 4: Weekly occurrence inclusion with indicator**
    - Generate weekly occurrences matching filters
    - Assert they appear in results with `type === 'weekly'`
    - **Validates: Requirements 3.3, 3.4**

- [x] 3. Checkpoint - Ensure data layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add i18n keys
  - [x] 4.1 Add `categoryDetail` namespace keys to `src/i18n/locales/pt-BR.json` and `src/i18n/locales/en.json`
    - Keys: `title`, `transactionCount`, `emptyTitle`, `emptyDescription`, `badgeFixed`, `badgeVariable`, `weeklyIndicator`, `errorTitle`, `errorDescription`, `retry`
    - pt-BR: "Detalhes da Categoria", "{{count}} lançamento(s)", "Nenhum lançamento", etc.
    - en: "Category Details", "{{count}} transaction(s)", "No transactions", etc.
    - _Requirements: 7.1, 7.4_

- [x] 5. Create screen component and register route
  - [x] 5.1 Create `app/category/[id].tsx` screen component
    - Extract `id` and `month` params via `useLocalSearchParams<{ id: string; month: string }>()`
    - Use `useCategoryDetailData(id, month)` hook for data
    - Render header section: category icon + name (with color accent), total amount, month label, count, expense group badge
    - Render FlatList of `CategoryDetailItem` with title, formatted date, formatted currency amount
    - Show recurring indicator for `type === 'weekly'` items
    - Handle item press: transaction → `router.push(/transaction/${id})`, weekly → `router.push(/weekly-recurring/${weeklyGroupId})`
    - Handle loading state with `LoadingIndicator`
    - Handle error state with `EmptyState` + retry action
    - Handle empty list with `EmptyState` descriptive message
    - Use `useThemeColors()`, spacing, borderRadius, shadows, typography from theme constants
    - Add accessibility attributes on all interactive elements
    - Default `month` to current month if missing/invalid
    - Set dynamic header title via `Stack.Screen` options
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5, 3.6, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.3, 8.4_

  - [x] 5.2 Register route in `app/_layout.tsx`
    - Add `<Stack.Screen name="category/[id]" />` with `presentation: 'card'`, `headerShown: true`, and dynamic theme-aware header styling matching the transaction detail screen pattern
    - _Requirements: 1.2, 1.3_

- [x] 6. Modify Dashboard navigation
  - [x] 6.1 Update `handleCategoryPress` in `app/(tabs)/index.tsx` to navigate via `router.push(`/category/${categoryId}?month=${selectedMonth}`)`
    - Replace the current toggle behavior with navigation
    - Remove `expandedCategoryId` state variable and its setter
    - Remove `useCategoryTransactions` import and usage if present
    - Keep `CollapsibleSection` interface unchanged (it still receives `onCategoryPress`)
    - _Requirements: 1.1, 1.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write unit and property tests for screen
  - [x] 8.1 Write unit tests for CategoryDetailScreen component
    - Test navigation integration: verify `router.push` called with correct params on category press from dashboard
    - Test empty state renders when data is empty
    - Test loading state renders while `isLoading = true`
    - Test error state renders with retry action on query failure
    - Test item press navigation: tap transaction → `/transaction/[id]`, tap weekly → `/weekly-recurring/[groupId]`
    - Test expense group badge renders correctly for fixed/variable/null
    - _Requirements: 2.5, 3.4, 3.5, 4.1, 4.2, 8.3, 8.4_

  - [x] 8.2 Write property test: Item rendering completeness
    - **Property 5: Item rendering completeness**
    - Generate random valid CategoryDetailItems
    - Assert each rendered item contains non-empty title, formatted date, and formatted currency amount
    - **Validates: Requirements 3.2, 7.2, 7.3**

  - [x] 8.3 Write property test: Reference month formatting round-trip
    - **Property 6: Reference month formatting round-trip**
    - Generate random valid YYYY-MM strings
    - Assert formatted label contains a recognizable month name and correct 4-digit year
    - **Validates: Requirements 2.3, 7.4**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript (React Native with Expo Router) — no language selection needed
- Follow existing patterns from `app/transaction/[id].tsx` and `app/weekly-recurring/[id].tsx`
- Use existing `useThemeColors()` hook, `spacing`, `borderRadius`, `shadows`, `typography` from `src/constants/theme.ts`
- Use existing `formatCurrencyLocale`, `formatDateLocale`, `getMonthName` from `src/i18n`
- Use existing `LoadingIndicator` and `EmptyState` components

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "5.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
