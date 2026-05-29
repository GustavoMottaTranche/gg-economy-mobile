# Implementation Plan: Manual Entry Installments

## Overview

This plan implements the reformulation of the manual entry screen in GG Economy Mobile. It covers: removing import/review navigation, adding installment (parcelamento) support with future month visualization, adding batch entry by category mode, and implementing validation, error handling, and atomic operations. The implementation uses TypeScript with the existing Drizzle ORM + expo-sqlite stack, Zustand stores, and expo-router.

## Tasks

- [x] 1. Database schema and core interfaces
  - [x] 1.1 Add `installmentGroupId` column and index to transactions table
    - Add `installmentGroupId: text('installment_group_id')` column to the existing transactions schema
    - Add index `idx_transactions_installment_group` on the new column
    - Generate and apply Drizzle migration
    - _Requirements: 3.1, 3.4, 4.1, 4.2_

  - [x] 1.2 Create TypeScript interfaces and DTOs for installment and batch features
    - Create `src/types/installment.ts` with `InstallmentDetail`, `InstallmentCalculatorInput`, `CreateInstallmentDTO`
    - Create `src/types/batch.ts` with `BatchSession`, `BatchSessionActions`, `BatchSessionSummary`, `CreateBatchEntryDTO`
    - Create `src/types/validation.ts` with `ValidationResult`, `InstallmentValidationInput`, `StandardValidationInput`
    - _Requirements: 2.1, 2.2, 5.1, 8.1_

- [x] 2. Installment calculation logic
  - [x] 2.1 Implement `InstallmentCalculator` pure functions
    - Create `src/services/installment/InstallmentCalculator.ts`
    - Implement `distributeAmount(total: number, parts: number): number[]` — floor division with remainder on first parcel
    - Implement `advanceMonth(month: string, offset: number): string` — handles year rollover
    - Implement `calculateInstallments(input: InstallmentCalculatorInput): InstallmentDetail[]` — combines distribution, month advancement, and description suffix generation
    - _Requirements: 2.3, 2.4, 2.5, 3.2, 3.3_

  - [x] 2.2 Write property test: Amount distribution invariant (Property 1)
    - **Property 1: Amount distribution invariant**
    - For any valid total (1–99999999999 cents) and parcel count (2–48), verify sum equals total, first parcel = floor(total/count) + remainder, remaining parcels = floor(total/count)
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [x] 2.3 Write property test: Month advancement correctness (Property 2)
    - **Property 2: Month advancement correctness**
    - For any valid start month and parcel count (2–48), verify each consecutive month is exactly one calendar month after the previous, with correct December→January rollover
    - **Validates: Requirements 2.2, 3.2, 7.1**

  - [x] 2.4 Write property test: Description suffix formatting (Property 3)
    - **Property 3: Description suffix formatting**
    - For any non-empty description and parcel count N (2–48), verify i-th description equals `"{original} (i/N)"`
    - **Validates: Requirements 3.3**

  - [x] 2.5 Write property test: Installment group homogeneity (Property 4)
    - **Property 4: Installment group homogeneity**
    - For any input with given categoryId and originId, all generated records share the same categoryId, originId, and installmentGroupId
    - **Validates: Requirements 3.4**

- [x] 3. Validation service
  - [x] 3.1 Implement `EntryValidationService`
    - Create `src/validation/installmentValidation.ts`
    - Implement `validateInstallmentEntry(input)` — checks amount range, parcel count (2–48), description (1–100 chars, non-blank), minimum parcel value (≥1 cent), required fields
    - Implement `validateStandardEntry(input)` — checks amount, description, date, category, referenceMonth
    - Implement `validateBatchEntry(input)` — same as standard minus categoryId (derived from session)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 3.2 Write property test: Amount validation rejects invalid values (Property 8)
    - **Property 8: Amount validation rejects invalid values**
    - For any amount ≤ 0 or > 99999999999, validation returns `valid: false`
    - **Validates: Requirements 8.1**

  - [x] 3.3 Write property test: Description validation rejects invalid inputs (Property 9)
    - **Property 9: Description validation rejects invalid inputs**
    - For any empty, whitespace-only, or >100 char string, validation returns `valid: false`
    - **Validates: Requirements 8.2**

  - [x] 3.4 Write property test: Minimum parcel value validation (Property 10)
    - **Property 10: Minimum parcel value validation**
    - For any total and count where `floor(total/count) < 1`, validation returns `valid: false`
    - **Validates: Requirements 8.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Installment group management (edit/delete)
  - [x] 5.1 Implement `InstallmentGroupManager` service
    - Create `src/services/installment/InstallmentGroupManager.ts`
    - Implement `deleteAllInGroup(groupId: string)` — atomic deletion of all parcels in a group via DB transaction
    - Implement `deleteSingleParcel(transactionId: string, groupId: string)` — remove one parcel and re-index remaining descriptions
    - Implement `recalculateGroup(groupId: string, newTotal: number)` — redistribute amounts across all parcels in group with same rounding rules
    - Implement `updateGroupField(groupId: string, field: 'description' | 'categoryId', value: string)` — update a field across all parcels atomically
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.2 Write property test: Re-indexing after single parcel deletion (Property 5)
    - **Property 5: Re-indexing after single parcel deletion**
    - For any group of size N and removal index k (1 ≤ k ≤ N), remaining (N-1) parcels have sequential suffixes " (1/(N-1))" through " ((N-1)/(N-1))"
    - **Validates: Requirements 4.3**

- [x] 6. Batch session management
  - [x] 6.1 Implement `BatchSessionManager` Zustand store
    - Create `src/services/batch/BatchSessionManager.ts`
    - Implement `startSession(categoryId, categoryType)` — sets active state, stores category info, resets counter
    - Implement `incrementCount(amount)` — increments entry count, adds to totalValue, enforces max 50 limit
    - Implement `endSession()` — returns `BatchSessionSummary` with totalEntries and totalValue, resets state
    - Implement `reset()` — clears all session state
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 6.3_

  - [x] 6.2 Write property test: Batch entry category and type derivation (Property 6)
    - **Property 6: Batch entry category and type derivation**
    - For any session with category type T, every transaction created has matching categoryId and type-consistent amount sign
    - **Validates: Requirements 5.2, 6.1**

- [x] 7. Utility functions
  - [x] 7.1 Implement `deriveReferenceMonth` utility
    - Create `src/utils/deriveReferenceMonth.ts`
    - Implement function that extracts YYYY-MM from a Date object with zero-padded month
    - _Requirements: 6.2_

  - [x] 7.2 Write property test: Reference month derivation from date (Property 7)
    - **Property 7: Reference month derivation from date**
    - For any valid Date, derived referenceMonth equals the date's year and zero-padded month as "YYYY-MM"
    - **Validates: Requirements 6.2**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Navigation restructuring
  - [x] 9.1 Remove import/review tabs and routes, update navigation to 4 tabs
    - Remove the "Review" tab from the tab layout in `app/(tabs)/_layout.tsx`
    - Remove or archive `app/import/` route files
    - Update tab bar to show only: Dashboard, Transactions, Manual Entry, Settings
    - Add redirect logic in `_layout.tsx` for any navigation to removed routes (`/import/*`, `/review`) → redirect to `/manual`
    - _Requirements: 1.1, 1.3_

  - [x] 9.2 Write unit tests for navigation changes
    - Test that tab bar renders exactly 4 tabs with correct labels
    - Test that accessing import/review routes redirects to manual entry
    - _Requirements: 1.1, 1.3_

- [x] 10. Manual entry screen with installment mode UI
  - [x] 10.1 Implement installment toggle and form on ManualEntryScreen
    - Add installment mode toggle to the manual entry screen
    - When active, show parcel count input (2–48) and start month selector
    - Wire form inputs to `InstallmentCalculator.calculateInstallments()` for live preview
    - _Requirements: 2.1, 2.2, 7.2_

  - [x] 10.2 Implement `InstallmentPreview` component
    - Create component that displays ordered list of parcels: number (X/N), reference month (locale-formatted), and value
    - Show preview without values when total amount is not yet entered
    - Update preview within 500ms of any input change (parcel count, value, start month)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 10.3 Implement installment confirmation and persistence flow
    - On confirm: validate via `EntryValidationService`, generate UUID for `installmentGroupId`, create all parcels via `TransactionRepository.createMany()` inside a DB transaction
    - On success: show confirmation with parcel count and period (start month – end month)
    - On error: rollback transaction, show error toast, retain form data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.6_

- [x] 11. Batch entry mode UI
  - [x] 11.1 Implement batch mode activation and simplified form
    - Add batch mode toggle to manual entry screen
    - On activation: prompt category selection, derive type from category, show simplified form (value, description, date/time only)
    - Display session counter (starts at 0) and enforce max 50 entries
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [x] 11.2 Implement batch entry save and session lifecycle
    - On save: validate via `validateBatchEntry()`, create transaction with session's category/type, derive referenceMonth from date, increment session counter
    - After save: clear value and description fields, reset date to current device time, keep category fixed
    - On session end: show summary with total entries and total value
    - On error: show error message, retain form data, do not increment counter, preserve previous entries
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 6.4_

- [x] 12. Edit/delete UI for installment groups
  - [x] 12.1 Implement group-aware delete dialog and logic
    - When deleting a transaction with non-null `installmentGroupId`, show dialog: "Delete this parcel only" or "Delete all parcels"
    - "Delete all": call `InstallmentGroupManager.deleteAllInGroup()` atomically
    - "Delete single": call `InstallmentGroupManager.deleteSingleParcel()` with re-indexing
    - On error: rollback, show error toast, preserve original data
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [x] 12.2 Implement group-aware edit dialog and logic
    - When editing value of a parcel: show dialog "Apply to this parcel only" or "Recalculate all parcels with new total"
    - "Recalculate": prompt for new total, call `InstallmentGroupManager.recalculateGroup()`
    - When editing description/category: show dialog "Apply to this parcel only" or "Apply to all parcels"
    - "Apply to all": call `InstallmentGroupManager.updateGroupField()` atomically
    - On error: rollback, show error toast, preserve original data
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- All property tests should be placed in `src/__tests__/properties/` directory with minimum 100 iterations
- All amounts are handled in cents (integer arithmetic) to avoid floating-point issues
- Atomic operations use Drizzle's `db.transaction()` for rollback safety
- Previously imported data is preserved — only navigation and routes are removed (Requirement 1.4)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "6.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "3.4", "6.2", "7.2"] },
    { "id": 3, "tasks": ["5.1", "9.1"] },
    { "id": 4, "tasks": ["5.2", "9.2"] },
    { "id": 5, "tasks": ["10.1", "11.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "11.2"] },
    { "id": 7, "tasks": ["12.1", "12.2"] }
  ]
}
```
