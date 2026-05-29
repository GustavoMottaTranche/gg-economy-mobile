# Implementation Plan: Payment Status Tracking

## Overview

This plan implements payment status tracking for recurring expenses in GG-Economy Mobile. The feature adds an `is_paid` boolean column to `weekly_occurrences` and `transactions` tables, a centralized `PaymentStatusService`, a dedicated Zustand store (`paymentStatusStore`), and 4 new UI components (PendingSection, PaymentStatusSummary, PaymentStatusOption, OccurrenceStatusToggle). Implementation follows existing project patterns (Drizzle ORM, expo-sqlite, Zustand, Jest + fast-check).

## Tasks

- [x] 1. Database schema and types
  - [x] 1.1 Create SQL migration for payment status columns
    - Create `src/db/migrations/0006_add_payment_status.sql`
    - Add `is_paid INTEGER NOT NULL DEFAULT 0` column to `weekly_occurrences` table
    - Add `is_paid INTEGER NOT NULL DEFAULT 0` column to `transactions` table
    - Create index `idx_weekly_occurrences_month_paid` on `(reference_month, is_paid)`
    - Create index `idx_transactions_month_paid_recurring` on `(reference_month, is_paid, recurring_id)`
    - _Requirements: 1.1, 1.6, 1.7_

  - [x] 1.2 Update Drizzle schema definitions with isPaid column
    - Add `isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false)` to `weeklyOccurrences` table definition in `src/db/schema.ts`
    - Add `isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false)` to `transactions` table definition in `src/db/schema.ts`
    - Update type exports to include the new field
    - _Requirements: 1.1, 1.6, 1.7_

  - [x] 1.3 Create domain type definitions
    - Create `src/types/paymentStatus.ts` with `PendingItem`, `PaymentTotals`, `PaymentStatusCreationOption`, `BulkMarkResult`, `GroupPaymentSummary` interfaces
    - Update `CreateWeeklyGroupDTO` to include optional `paymentStatusOption` field
    - Update `CreateRecurringDTO` (if exists) to include optional `paymentStatusOption` field
    - _Requirements: 2.1, 3.2, 4.1, 5.1, 6.3_

- [x] 2. Service layer
  - [x] 2.1 Implement PaymentStatusService - toggle and query methods
    - Create `src/services/payment-status/PaymentStatusService.ts`
    - Implement `toggleWeeklyOccurrence(occurrenceId)` — flip isPaid boolean and persist
    - Implement `toggleMonthlyTransaction(transactionId)` — flip isPaid boolean and persist
    - Implement `getPendingItemsForMonth(month)` — query both tables for isPaid=false, return sorted by date ascending
    - Implement `getPaymentTotalsForMonth(month)` — compute predictedTotal, paidTotal, pendingTotal from both tables
    - Implement `getGroupPaymentSummary(groupId, type)` — return totalCount, paidCount, pendingCount
    - _Requirements: 1.1, 1.4, 1.5, 4.1, 5.1, 5.5, 6.3_

  - [x] 2.2 Implement PaymentStatusService - bulk mark methods
    - Implement `bulkMarkWeeklyGroup(groupId)` — update all isPaid=false to true within a SQLite transaction, return BulkMarkResult
    - Implement `bulkMarkMonthlyGroup(recurringId)` — update all isPaid=false to true within a SQLite transaction, return BulkMarkResult
    - Ensure transactional rollback on failure
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 2.3 Integrate payment status options into group creation services
    - Modify `WeeklyRecurringService.createGroup()` to accept `paymentStatusOption` and apply status to generated occurrences
    - Modify `RecurringTransactionService` (if applicable) to accept `paymentStatusOption` and apply status to generated transactions
    - Implement "all_pending" (default), "first_paid" (min date in first month = true), "all_paid" (all = true) logic
    - Wrap creation + status assignment in a single SQLite transaction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.4 Write property test for toggle inverts boolean
    - **Property 1: Toggle payment status inverts the boolean**
    - **Validates: Requirements 1.1, 1.5**

  - [x] 2.5 Write property test for newly generated occurrences default to unpaid
    - **Property 2: Newly generated occurrences default to unpaid**
    - **Validates: Requirements 1.6, 1.7, 7.4**

  - [x] 2.6 Write property test for payment totals computation correctness
    - **Property 3: Payment totals computation correctness**
    - **Validates: Requirements 1.4, 5.1, 5.5**

  - [x] 2.7 Write property test for mark first as paid identifies correct occurrence
    - **Property 4: Mark first as paid identifies the correct occurrence**
    - **Validates: Requirements 2.3, 2.7**

  - [x] 2.8 Write property test for mark all as paid sets all to paid
    - **Property 5: Mark all as paid sets all occurrences to paid**
    - **Validates: Requirements 2.4**

  - [x] 2.9 Write property test for bulk mark correctness
    - **Property 6: Bulk mark sets all unpaid to paid and reports correct count**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Store layer
  - [x] 4.1 Implement paymentStatusStore
    - Create `src/stores/paymentStatusStore.ts` using Zustand
    - Implement state: `pendingItems` (Record keyed by month), `paymentTotals` (Record keyed by month), `isLoading`, `error`
    - Implement actions: `loadPendingItemsForMonth(month)`, `loadPaymentTotalsForMonth(month)`, `togglePaymentStatus(id, type)`, `bulkMarkAsPaid(groupId, type)`
    - On toggle/bulk mark success, recalculate totals and refresh pending items for affected months
    - On failure, revert optimistic state and show error via toastStore
    - _Requirements: 1.1, 1.4, 3.2, 3.4, 4.1, 4.2, 5.1, 5.2_

  - [x] 4.2 Write unit tests for paymentStatusStore
    - Test loading pending items and totals
    - Test toggle updates state correctly
    - Test bulk mark updates state correctly
    - Test error state handling and revert
    - _Requirements: 1.4, 3.4, 5.2_

- [x] 5. UI components
  - [x] 5.1 Create OccurrenceStatusToggle component
    - Create `src/components/ui/OccurrenceStatusToggle.tsx`
    - Render visual toggle/checkbox with isPaid state (check icon when paid, empty when pending)
    - Support `size` prop ('small' | 'medium')
    - Include testID prop for testing
    - _Requirements: 1.2, 1.3_

  - [x] 5.2 Create PaymentStatusOption component
    - Create `src/components/weekly-recurring/PaymentStatusOption.tsx`
    - Render three mutually exclusive options: "Todas pendentes", "Marcar primeira como paga", "Marcar todas como pagas"
    - Highlight selected option, call onSelect callback
    - _Requirements: 2.1_

  - [x] 5.3 Create PendingSection component
    - Create `src/components/dashboard/PendingSection.tsx`
    - Render list of PendingItems with group name, formatted amount, date, and OccurrenceStatusToggle
    - Handle toggle tap (onToggleStatus) and item detail tap (onItemPress)
    - Hide section when items list is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.4 Create PaymentStatusSummary component
    - Create `src/components/dashboard/PaymentStatusSummary.tsx`
    - Display predictedTotal, paidTotal (green), pendingTotal (orange) formatted in user locale currency
    - Hide section when predictedTotal equals zero
    - _Requirements: 5.1, 5.3, 5.4, 5.6_

  - [x] 5.5 Write unit tests for UI components
    - Test OccurrenceStatusToggle renders correctly for isPaid=true and isPaid=false
    - Test PaymentStatusOption renders three options and selection callback
    - Test PendingSection hides when empty, shows items when populated
    - Test PaymentStatusSummary hides when predictedTotal=0, shows correct colors
    - _Requirements: 1.2, 1.3, 2.1, 4.3, 4.4, 5.3, 5.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration and wiring
  - [x] 7.1 Integrate PendingSection into Home screen
    - Add PendingSection between SummaryCard and charts section on Home screen
    - Connect to paymentStatusStore for pending items data
    - Wire toggle handler to `paymentStatusStore.togglePaymentStatus()`
    - Wire item press to navigate to Entry_Screen of the corresponding group
    - Trigger `loadPendingItemsForMonth` on month navigation
    - _Requirements: 4.1, 4.2, 4.4, 4.6, 4.7_

  - [x] 7.2 Integrate PaymentStatusSummary into SummaryCard
    - Add PaymentStatusSummary section within existing SummaryCard component
    - Connect to paymentStatusStore for payment totals data
    - Trigger `loadPaymentTotalsForMonth` on month navigation
    - Show/hide based on predictedTotal value
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.3 Integrate PaymentStatusOption into creation forms
    - Add PaymentStatusOption to weekly recurring group creation form
    - Add PaymentStatusOption to monthly recurring transaction creation form (if applicable)
    - Pass selected option to service layer via DTO
    - Default selection: "Todas pendentes"
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.4 Integrate status management into Entry_Screen
    - Display list of occurrences with OccurrenceStatusToggle in Entry_Screen
    - Show group payment summary ("X de Y pagas")
    - Add Bulk Mark button/action to Entry_Screen
    - Wire bulk mark to `paymentStatusStore.bulkMarkAsPaid()`
    - Show confirmation with count of marked items after bulk mark
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3_

  - [x] 7.5 Ensure persistence preservation during group edits
    - Verify that group edit operations (name, amount, dayOfWeek, category) do not modify isPaid on existing occurrences
    - Verify soft delete preserves isPaid on past occurrences
    - Ensure newly generated occurrences after day-of-week change default to isPaid=false
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.6 Write property test for pending section correctness
    - **Property 7: Pending section contains exactly unpaid items sorted by date**
    - **Validates: Requirements 4.1**

  - [x] 7.7 Write property test for group mutations preserve payment status
    - **Property 8: Group mutations preserve payment status**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 7.8 Write property test for paid and pending count computation
    - **Property 9: Paid and pending count computation**
    - **Validates: Requirements 6.3**

- [x] 8. i18n and final wiring
  - [x] 8.1 Add i18n translation keys for payment status feature
    - Add Portuguese (pt-BR) and English translation keys for all payment status UI strings
    - Include: status labels, creation options, bulk mark button, confirmation messages, summary labels, pending section title
    - _Requirements: 2.1, 3.1, 3.3, 4.5, 5.1, 6.3_

  - [x] 8.2 Wire month navigation to refresh payment status data
    - Ensure paymentStatusStore reloads pending items and totals when user navigates between months
    - Ensure data loads on app startup for current month
    - _Requirements: 4.7, 5.2, 7.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 9 universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- All multi-step database operations (bulk mark, creation with status) use SQLite transactions for atomicity
- The implementation uses TypeScript throughout, matching the existing codebase (Drizzle ORM, Zustand, Jest + fast-check)
- The `is_paid` column uses INTEGER (0/1) in SQLite with Drizzle's boolean mode for TypeScript mapping

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4"] },
    { "id": 8, "tasks": ["5.5"] },
    { "id": 9, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 10, "tasks": ["7.6", "7.7", "7.8", "8.1", "8.2"] }
  ]
}
```
