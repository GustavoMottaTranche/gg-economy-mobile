# Implementation Plan: Entry Title and Dates

## Overview

This plan implements the restructuring of the manual entry form to introduce a separate title field, datetime selection for purchase date, the three date concepts (purchase date, reference month, creation date), infinite installments (recurring transactions), individual parcel value editing, and data migration. Tasks are ordered by dependency: schema/types first, then services, then UI, then integration.

## Tasks

- [x] 1. Database schema and type definitions
  - [x] 1.1 Add `recurring_transactions` table to Drizzle schema
    - Add `recurringTransactions` table definition in `src/db/schema.ts` with columns: id, title, amount, categoryId, categoryType, startMonth, description, originId, isActive, createdAt, updatedAt
    - Add indexes `idx_recurring_active` and `idx_recurring_start_month`
    - Add type exports `RecurringTransactionRecord` and `NewRecurringTransactionRecord`
    - Add relations for `recurringTransactions`
    - _Requirements: 9.2_

  - [x] 1.2 Add `title` and `recurringId` columns to transactions table in schema
    - Add `title: text('title').notNull()` column to `transactions` table in `src/db/schema.ts`
    - Add `recurringId: text('recurring_id').references(() => recurringTransactions.id, { onDelete: 'set null' })` column
    - Update `transactionsRelations` to include relation to `recurringTransactions`
    - _Requirements: 1.4, 9.2_

  - [x] 1.3 Create recurring transaction type definitions
    - Create `src/types/recurring.ts` with `RecurringTransaction`, `CreateRecurringDTO` interfaces
    - Export types from `src/types/index.ts` if barrel file exists
    - _Requirements: 9.2_

  - [x] 1.4 Update installment types to include title field
    - Update `InstallmentCalculatorInput` in `src/types/installment.ts` to replace `description` with `title` as primary and add optional `description`
    - Update `CreateInstallmentDTO` similarly
    - _Requirements: 1.4, 5.5_

- [x] 2. Migration service
  - [x] 2.1 Create migration to add title column and restructure description
    - Create `src/db/migrations/addTitleField.ts`
    - Implement `migrateAddTitleField()`: ALTER TABLE add `title` TEXT NOT NULL DEFAULT '', UPDATE SET title = description, UPDATE SET description = ''
    - Implement `rollbackAddTitleField()` for reverting changes
    - Add `recurring_transactions` table creation to migration
    - Add `recurring_id` column to transactions table in migration
    - Wrap all operations in a transaction for atomicity; rollback on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Write property test for migration data transformation
    - **Property 7: Migration Data Transformation**
    - **Validates: Requirements 6.2, 6.3**
    - Test that for any set of transactions with random descriptions, after migration, title = original description and description = ''

- [x] 3. Validation service
  - [x] 3.1 Create new entry validation module
    - Create `src/validation/entryValidation.ts`
    - Implement `validateTitle(title: string): ValidationResult` — accepts iff `title.trim().length` ∈ [1, 100]
    - Implement `validateDescription(description: string): ValidationResult` — accepts iff `description.length` ≤ 500
    - Implement `validateStandardEntry(input: StandardEntryValidationInput): ValidationResult` with title, description, amount, date, categoryId, referenceMonth validation
    - Implement `validateInstallmentEntry(input: InstallmentEntryValidationInput): ValidationResult` with title, description, totalAmount, parcelCount, startMonth, categoryId, isInfinite validation
    - Implement `validateBatchEntry(input: BatchEntryValidationInput): ValidationResult` with amount, description, date, referenceMonth validation
    - Export constants `TITLE_MIN_LENGTH`, `TITLE_MAX_LENGTH`, `DESCRIPTION_MAX_LENGTH`
    - _Requirements: 1.2, 1.3, 2.3, 7.1, 7.2, 7.3_

  - [x] 3.2 Write property test for title validation
    - **Property 1: Title Validation**
    - **Validates: Requirements 1.2, 1.3, 7.1**
    - Generate random strings with fast-check, verify validateTitle accepts iff trim().length ∈ [1, 100]

  - [x] 3.3 Write property test for description validation
    - **Property 2: Description Validation**
    - **Validates: Requirements 2.3, 7.2**
    - Generate random strings with fast-check, verify validateDescription accepts iff length ≤ 500

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Recurring transaction service
  - [x] 5.1 Create RecurringTransactionService
    - Create `src/services/recurring/RecurringTransactionService.ts`
    - Implement `createRecurring(dto: CreateRecurringDTO): Promise<RecurringTransaction>` — inserts into `recurring_transactions` table
    - Implement `deactivateRecurring(id: string): Promise<void>` — sets `isActive = false`
    - Implement `reactivateRecurring(id: string): Promise<void>` — sets `isActive = true`
    - Implement `updateRecurringAmount(id: string, newAmount: number): Promise<void>` — updates base amount
    - Implement `generateMonthlyTransactions(targetMonth: string): Promise<void>` — for each active recurring where startMonth ≤ targetMonth, create transaction if not already existing for that month
    - Implement `getActiveRecurrings(): Promise<RecurringTransaction[]>`
    - _Requirements: 9.2, 9.3, 9.5, 9.7_

  - [x] 5.2 Write property test for recurring transaction generation
    - **Property 8: Recurring Transaction Generation**
    - **Validates: Requirements 9.2, 9.3**
    - Generate recurring with random startMonth, verify generation for months >= startMonth and no generation for months < startMonth

  - [x] 5.3 Write property test for deactivation/reactivation lifecycle
    - **Property 9: Deactivation/Reactivation Lifecycle**
    - **Validates: Requirements 9.5, 9.7**
    - Verify that after deactivation no new transactions are generated, and after reactivation generation resumes

  - [x] 5.4 Write property test for deactivation preserves history
    - **Property 10: Deactivation Preserves History**
    - **Validates: Requirements 9.6**
    - Generate N transactions from recurring, deactivate, verify all N remain unchanged

- [x] 6. Batch session manager update
  - [x] 6.1 Add title field to BatchSessionManager
    - Update `BatchSession` interface in `src/types/batch.ts` to add `title: string | null`
    - Update `BatchSessionActions.startSession` signature to accept `title: string` parameter
    - Update `useBatchSessionStore` in `src/services/batch/BatchSessionManager.ts` to store and maintain title in session state
    - Update `initialState` to include `title: null`
    - On `startSession`, set title; on `endSession`/`reset`, clear title
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 6.2 Write property test for batch mode title propagation
    - **Property 6: Batch Mode Title Propagation**
    - **Validates: Requirements 5.2, 5.5**
    - Start session with random title, verify all entries created during session have that title

- [x] 7. Installment calculator update
  - [x] 7.1 Update InstallmentCalculator to use title field
    - Update `calculateInstallments` in `src/services/installment/InstallmentCalculator.ts` to accept `title` instead of `description` as primary identifier
    - Update `InstallmentDetail.descriptionSuffix` usage to append to title (e.g., "Supermercado (1/3)")
    - Ensure backward compatibility with existing installment group logic
    - _Requirements: 1.4, 5.5_

  - [x] 7.2 Write property test for individual parcel edit isolation
    - **Property 11: Individual Parcel Edit Isolation**
    - **Validates: Requirements 10.1, 10.2**
    - Generate installment group with N parcels, edit parcel K, verify only K changed

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. DateTimePicker component
  - [x] 9.1 Create DateTimePicker component
    - Create `src/components/ui/DateTimePicker.tsx`
    - Implement component using `@react-native-community/datetimepicker` for both date and time selection
    - Accept props: `value: Date`, `onChange: (date: Date) => void`, `locale: string`, `label?: string`, `minimumDate?: Date`, `maximumDate?: Date`
    - Display formatted date+time according to locale (pt-BR: "dd/MM/yyyy HH:mm", en: "MM/dd/yyyy hh:mm a")
    - Default value to current device date/time when no value provided
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 9.2 Write property test for date formatting matches locale pattern
    - **Property 4: Date Formatting Matches Locale Pattern**
    - **Validates: Requirements 3.4**
    - Generate random dates, format with locale, verify regex pattern match

  - [x] 9.3 Write property test for reference month derivation
    - **Property 5: Reference Month Derivation**
    - **Validates: Requirements 3.5, 4.5**
    - Generate random dates, verify deriveReferenceMonth returns correct YYYY-MM

- [x] 10. Manual entry form UI updates
  - [x] 10.1 Add title input field to manual entry form
    - Add `TitleInput` field to `app/(tabs)/manual.tsx` as required field before description
    - Add validation error display below title field (red text)
    - Wire title field to form state and draft auto-save
    - Replace current description-as-primary behavior with title-as-primary
    - _Requirements: 1.1, 1.5, 7.1, 7.4, 7.5_

  - [x] 10.2 Convert description field to optional multiline input
    - Update description field in `app/(tabs)/manual.tsx` to be optional (allow empty)
    - Change to multiline TextInput with placeholder indicating optional
    - Update validation to use new `validateDescription` (max 500 chars)
    - _Requirements: 2.1, 2.2, 2.5, 7.2_

  - [x] 10.3 Replace DatePicker with DateTimePicker in form
    - Replace `DatePicker` import with new `DateTimePicker` component in `app/(tabs)/manual.tsx`
    - Update form state to store full Date object (date + time)
    - Implement auto-derivation of referenceMonth from selected date when not manually changed
    - Add visual distinction between Data_da_Compra and Mês_de_Referência fields with clear labels
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.4, 4.5_

  - [x] 10.4 Update batch mode UI to include title in session setup
    - Update batch mode activation flow to require title input before starting session
    - Display locked title during active batch session
    - Show description as optional per-entry field during batch
    - On save in batch mode, clear value/description/datetime but keep title and category fixed
    - Wire to updated `useBatchSessionStore.startSession(categoryId, categoryType, title)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 10.5 Add infinite installment option to installment mode
    - Add "Parcela infinita" toggle/option in installment mode panel
    - When selected, hide parcel count selector and show recurring indicator
    - Wire to `RecurringTransactionService.createRecurring()` on save
    - Display ∞ indicator in installment preview
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 10.6 Implement parcel value editing with recurring choice prompt
    - In transaction edit screen, allow editing amount of individual parcels
    - For recurring transaction parcels, show prompt: "Apply to this occurrence only" vs "Apply to all future occurrences"
    - If single occurrence: save only to that transaction
    - If all future: call `updateRecurringAmount` and update future transactions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 10.7 Write property test for recurring amount update propagation
    - **Property 12: Recurring Amount Update Propagation**
    - **Validates: Requirements 10.4**
    - Update recurring base amount, generate future transactions, verify new amount used

  - [x] 10.8 Write property test for single occurrence edit isolation
    - **Property 13: Single Occurrence Edit Isolation**
    - **Validates: Requirements 10.5**
    - Edit single occurrence amount, verify recurring base amount unchanged and next generated uses base

- [x] 11. Transaction listing updates
  - [x] 11.1 Update transaction list items to display title as primary text
    - Update transaction list rendering (likely in `app/(tabs)/transactions.tsx` or transaction card component) to show `title` as primary text
    - Show `description` as secondary text below title only when non-empty
    - Hide description area when description is empty string
    - Display full date+time in localized format in list items
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 11.2 Add recurring transaction indicator in listings
    - Show ∞ icon or recurrence indicator for transactions linked to active recurring
    - _Requirements: 9.4_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration and wiring
  - [x] 13.1 Wire migration to app initialization
    - Integrate `migrateAddTitleField()` into app startup/database initialization flow
    - Check schema version before running migration
    - Handle migration failure with user-facing error alert
    - _Requirements: 6.1, 6.5_

  - [x] 13.2 Wire recurring transaction generation to app lifecycle
    - Call `generateMonthlyTransactions(currentMonth)` on app startup or when navigating to transactions list
    - Ensure idempotent generation (skip if already exists for that month)
    - _Requirements: 9.3_

  - [x] 13.3 Update transaction queries to include title field
    - Update `createTransaction` and `createTransactions` in `src/db/queries/transactions.ts` to accept and persist `title` field
    - Update any read queries to return `title` field
    - Update transaction edit/update queries to handle title
    - _Requirements: 1.4, 2.4_

  - [x] 13.4 Write property test for transaction field persistence round-trip
    - **Property 3: Transaction Field Persistence Round-Trip**
    - **Validates: Requirements 1.4, 2.4, 3.3**
    - Generate random valid title/description/datetime, create transaction, read back, verify equality

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The migration (task 2.1) must run before any other code that depends on the `title` column or `recurring_transactions` table
- The existing `installmentValidation.ts` will be superseded by the new `entryValidation.ts` — update imports gradually
- i18n keys for new labels/errors should be added to translation files as part of each UI task

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 4, "tasks": ["5.1", "6.1", "7.1", "9.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "6.2", "7.2", "9.2", "9.3"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "11.1"] },
    { "id": 7, "tasks": ["10.6", "11.2", "13.3"] },
    { "id": 8, "tasks": ["10.7", "10.8", "13.1", "13.2"] },
    { "id": 9, "tasks": ["13.4"] }
  ]
}
```
