# Implementation Plan: Statement Payment Integration

## Overview

This plan integrates weekly recurring expenses and payment status tracking into the main transactions statement screen. The implementation follows an incremental approach: first establishing types and interfaces, then building core logic (hooks, store changes, filters), then UI components, and finally wiring everything together in the TransactionsScreen.

## Tasks

- [x] 1. Define types and extend store interfaces
  - [x] 1.1 Create UnifiedStatementItem discriminated union type and WeeklyGroupHeaderData interface
    - Create `src/types/unifiedStatementItem.ts` with the `UnifiedStatementItem` union type and `WeeklyGroupHeaderData` interface as defined in the design
    - Export all types for use across hooks, components, and tests
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Extend filterStore with pendingOnly field
    - Add `pendingOnly: boolean` to `FilterState` interface (default `false`)
    - Add `setPendingOnly(value: boolean)` action
    - Update `getActiveFilterCount` to include `pendingOnly` when true
    - Update `resetFilters` to reset `pendingOnly` to `false`
    - _Requirements: 4.1, 4.6_

  - [x] 1.3 Extend weeklyRecurringStore with expansion state
    - Add `expandedGroupIds: Set<string>` to store state
    - Add `toggleGroupExpansion(groupId: string)` action
    - Add `collapseAllGroups()` action
    - _Requirements: 1.3, 1.4_

- [x] 2. Implement core logic hooks and filter extension
  - [x] 2.1 Implement useUnifiedStatementItems hook
    - Create `src/hooks/useUnifiedStatementItems.ts`
    - Merge paginated transactions and weekly occurrences into a sorted `UnifiedStatementItem[]`
    - Sort by date descending; weekly parcels appear after their group header in date-ascending order within the group
    - Apply `pendingOnly` filter client-side for weekly occurrences
    - Handle expanded/collapsed state to include or exclude parcel items
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.2, 4.3, 4.4_

  - [x] 2.2 Write property test: Unified list sorted by date descending
    - **Property 1: Unified list is sorted by date descending**
    - **Validates: Requirements 1.1**
    - File: `src/__tests__/useUnifiedStatementItems.property.test.ts`

  - [x] 2.3 Write property test: Weekly group monthly total equals sum of occurrence amounts
    - **Property 2: Weekly group monthly total equals sum of occurrence amounts**
    - **Validates: Requirements 1.2, 2.3**
    - File: `src/__tests__/weeklyGroupTotal.property.test.ts`

  - [x] 2.4 Extend buildFilterConditions with pendingOnly support
    - Add `pendingOnly` condition to `buildFilterConditions` that appends `eq(transactions.isPaid, false)` when active
    - _Requirements: 4.2_

  - [x] 2.5 Write property test: Pending filter returns only unpaid items
    - **Property 5: Pending filter returns only unpaid items**
    - **Validates: Requirements 4.2, 4.3**
    - File: `src/__tests__/useUnifiedStatementItems.property.test.ts`

  - [x] 2.6 Write property test: Pending group summary matches unpaid subset
    - **Property 6: Pending group summary matches unpaid subset**
    - **Validates: Requirements 4.4**
    - File: `src/__tests__/useUnifiedStatementItems.property.test.ts`

  - [x] 2.7 Write property test: Active filter count includes all active filters
    - **Property 7: Active filter count includes all active filters**
    - **Validates: Requirements 4.6**
    - File: `src/__tests__/filterCount.property.test.ts`

- [x] 3. Checkpoint - Core logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement amount validation and occurrence update logic
  - [x] 4.1 Implement amount validation function for weekly parcels
    - Create or extend validation in `src/validation/` to reject zero, negative, or non-numeric amounts
    - Return structured error for invalid inputs
    - _Requirements: 2.4_

  - [x] 4.2 Write property test: Invalid amounts are always rejected
    - **Property 4: Invalid amounts are always rejected**
    - **Validates: Requirements 2.4**
    - File: `src/__tests__/amountValidation.property.test.ts`

  - [x] 4.3 Implement occurrence update with isValueEdited flag
    - Ensure `weeklyRecurringStore.updateOccurrence` persists the new amount and sets `isValueEdited` to `true`
    - Refresh occurrences for the month after update
    - _Requirements: 2.2, 2.3_

  - [x] 4.4 Write property test: Occurrence update persists amount and sets isValueEdited flag
    - **Property 8: Occurrence update persists amount and sets isValueEdited flag**
    - **Validates: Requirements 2.2**
    - File: `src/__tests__/occurrenceUpdate.property.test.ts`

- [x] 5. Implement UI components
  - [x] 5.1 Create PaymentStatusToggle component
    - Create `src/components/PaymentStatusToggle.tsx`
    - Render filled checkmark icon for paid, empty circle for pending
    - Accept `isPaid`, `onToggle`, `disabled`, `size`, and `testID` props
    - _Requirements: 3.1, 3.6_

  - [x] 5.2 Write unit tests for PaymentStatusToggle
    - Test correct icon rendering for paid/pending states
    - Test onToggle callback fires on press
    - Test disabled state prevents interaction
    - _Requirements: 3.6_

  - [x] 5.3 Create WeeklyParcelRow component
    - Create `src/components/WeeklyParcelRow.tsx`
    - Display date, amount, and PaymentStatusToggle for each occurrence
    - Handle tap to navigate to parcel detail
    - _Requirements: 1.5, 2.1, 3.1_

  - [x] 5.4 Create WeeklyGroupItem component
    - Create `src/components/WeeklyGroupItem.tsx`
    - Display group title, category icon, and monthly total
    - Handle expand/collapse on header tap
    - Render WeeklyParcelRow items when expanded
    - When pendingOnly is active, show only pending parcels count and pending total
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 4.3, 4.4_

  - [x] 5.5 Write unit tests for WeeklyGroupItem
    - Test renders group title, icon, and total
    - Test expand/collapse behavior on tap
    - Test pending-only mode shows correct counts
    - _Requirements: 1.2, 1.3, 1.4, 4.4_

  - [x] 5.6 Write property test: Payment status toggle is involutory
    - **Property 3: Payment status toggle is involutory (double-toggle restores state)**
    - **Validates: Requirements 3.2, 3.3, 3.4, 5.2**
    - File: `src/__tests__/paymentStatusToggle.property.test.ts`

- [x] 6. Checkpoint - Components verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate into existing screens
  - [x] 7.1 Update FilterPanel with "Pending only" toggle
    - Add a toggle switch for "Pending only" to the FilterPanel component
    - Wire it to `filterStore.setPendingOnly`
    - Include in active filter count badge
    - _Requirements: 4.1, 4.6_

  - [x] 7.2 Write unit tests for FilterPanel pending toggle
    - Test toggle renders and fires setPendingOnly
    - Test active filter count includes pendingOnly
    - _Requirements: 4.1, 4.6_

  - [x] 7.3 Update TransactionsScreen to use unified statement items
    - Replace the inline weekly occurrences header section with unified list rendering
    - Use `useUnifiedStatementItems` hook to merge data sources
    - Render `WeeklyGroupItem` for weekly group headers, `WeeklyParcelRow` for expanded parcels, and existing `TransactionCard` with `PaymentStatusToggle` for regular transactions
    - Wire expand/collapse to `weeklyRecurringStore.toggleGroupExpansion`
    - Wire payment toggle to `paymentStatusStore` with optimistic update and rollback
    - _Requirements: 1.1, 1.3, 1.4, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.4 Update TransactionDetailView with payment status row
    - Add a `DetailRow` showing current payment status (paid/pending) with icon
    - Handle tap to toggle payment status via PaymentStatusService
    - Immediately reflect updated status without navigation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.5 Wire parcel tap navigation to detail view
    - When user taps a WeeklyParcelRow, navigate to a detail view for that parcel
    - Enable amount editing with validation
    - On save, call `weeklyRecurringStore.updateOccurrence` and recalculate group total
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Jest + fast-check for property-based testing
- All components use TypeScript with React Native / Expo conventions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.6", "2.7", "4.2", "4.3"] },
    { "id": 3, "tasks": ["4.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.6"] },
    { "id": 5, "tasks": ["5.4"] },
    { "id": 6, "tasks": ["5.5", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4", "7.5"] }
  ]
}
```
