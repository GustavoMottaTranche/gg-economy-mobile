# Implementation Plan: Weekly Recurring Expenses

## Overview

This plan implements weekly recurring expenses (gastos semanais recorrentes) for GG-Economy Mobile. The feature introduces a new `weekly_recurring_groups` table and `weekly_occurrences` table, with a service layer for CRUD operations, an occurrence generator for lazy date-based generation, validation, a Zustand store, and UI components. Implementation follows the existing project patterns (Drizzle ORM, Zustand, Jest + fast-check).

## Tasks

- [x] 1. Database schema and types
  - [x] 1.1 Create SQL migration file for weekly recurring tables
    - Create `src/db/migrations/0005_add_weekly_recurring.sql` with `weekly_recurring_groups` and `weekly_occurrences` tables
    - Include all indexes as defined in the design (active, day, group, month, date, unique group+date)
    - _Requirements: 1.1, 6.1_

  - [x] 1.2 Add Drizzle schema definitions for weekly recurring tables
    - Add `weeklyRecurringGroups` and `weeklyOccurrences` table definitions to `src/db/schema.ts`
    - Add relations, indexes, and type exports (`WeeklyRecurringGroupRecord`, `NewWeeklyRecurringGroupRecord`, `WeeklyOccurrenceRecord`, `NewWeeklyOccurrenceRecord`)
    - _Requirements: 1.1, 6.1_

  - [x] 1.3 Create TypeScript type definitions
    - Create `src/types/weeklyRecurring.ts` with `WeeklyRecurringGroup`, `WeeklyOccurrence`, `CreateWeeklyGroupDTO`, `UpdateWeeklyGroupDTO`, `UpdateOccurrenceDTO` interfaces
    - _Requirements: 1.1, 3.2, 4.1_

- [x] 2. Date utilities and validation
  - [x] 2.1 Implement date utility functions
    - Create `src/services/weekly-recurring/dateUtils.ts`
    - Implement `getWeeklyDatesForMonth(targetMonth, dayOfWeek, startDate)` returning YYYY-MM-DD array
    - Implement `deriveReferenceMonth(date)`, `getTodayBoundary()`, `isPastDate(date)`
    - _Requirements: 1.6, 6.1, 6.4, 7.4_

  - [x] 2.2 Write property test for date calculation correctness
    - **Property 1: Occurrence Date Calculation Correctness**
    - **Validates: Requirements 1.3, 1.6, 6.1, 6.4**

  - [x] 2.3 Implement validation functions
    - Create `src/validation/weeklyRecurringValidation.ts`
    - Implement `validateWeeklyGroup(input)` — title (1-100 chars, no whitespace-only), amount (0.01-999999999.99, max 2 decimals), dayOfWeek (0-6), categoryId (non-null/empty)
    - Implement `validateOccurrenceValue(input)` — amount != 0, within [-999999999, 999999999], max 2 decimals
    - Implement `validateOccurrenceDate(input)` — YYYY-MM-DD format, valid calendar date, within 5 years past to 1 year future
    - _Requirements: 1.2, 3.3, 3.5, 4.7_

  - [x] 2.4 Write property test for validation rejects invalid inputs
    - **Property 3: Validation Rejects Invalid Inputs**
    - **Validates: Requirements 1.2, 3.3, 3.5, 4.7**

  - [x] 2.5 Write unit tests for date utilities
    - Test months with exactly 4 vs 5 occurrences of a given day
    - Test startDate filtering within a month
    - Test boundary: Feb 29 on leap year, Dec 31
    - _Requirements: 1.6, 6.4_

  - [x] 2.6 Write property test for date change derives correct reference month
    - **Property 6: Date Change Derives Correct Reference Month**
    - **Validates: Requirements 3.4**

- [x] 3. Repository layer
  - [x] 3.1 Implement WeeklyGroupRepository
    - Create `src/repositories/WeeklyGroupRepository.ts`
    - Implement `create`, `update`, `softDelete`, `getById`, `getActive`, `getActiveForMonth` methods
    - Use Drizzle ORM queries following existing repository patterns
    - _Requirements: 1.1, 4.1, 5.2_

  - [x] 3.2 Implement WeeklyOccurrenceRepository
    - Create `src/repositories/WeeklyOccurrenceRepository.ts`
    - Implement `create`, `createMany`, `update`, `delete`, `deleteMany`, `deleteFutureUnedited`, `deleteFuture`
    - Implement `getByGroupId`, `getByMonth`, `getByGroupAndMonth`, `getMonthlyTotal`, `existsForGroupAndDate`
    - Implement `getFutureUnedited`, `getFuture`, `getPast`
    - _Requirements: 1.4, 3.2, 4.4, 5.4, 6.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Service layer
  - [x] 5.1 Implement OccurrenceGenerator service
    - Create `src/services/weekly-recurring/OccurrenceGenerator.ts`
    - Implement `generateForMonth(targetMonth)` — generates occurrences for all active groups whose startDate <= last day of month, idempotent via `existsForGroupAndDate` check
    - Implement `generateForGroup(groupId, targetMonth)` — generates for a single group
    - Implement `getMonthlyTotal(targetMonth)` — sums all occurrence amounts for the month
    - Wrap per-group generation in SQLite transaction; on failure rollback that group and continue
    - _Requirements: 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x] 5.2 Write property test for idempotent generation
    - **Property 2: Idempotent Generation**
    - **Validates: Requirements 1.4, 6.3**

  - [x] 5.3 Write property test for monthly total equals sum of occurrences
    - **Property 4: Monthly Total Equals Sum of Occurrences**
    - **Validates: Requirements 2.1**

  - [x] 5.4 Implement WeeklyRecurringService
    - Create `src/services/weekly-recurring/WeeklyRecurringService.ts`
    - Implement `createGroup(dto)` — validate, insert group, generate occurrences for current month
    - Implement `updateGroup(id, dto)` — validate, update group, handle name/value/dayOfWeek changes for future occurrences only
    - Implement `deleteGroup(id)` — soft-delete group, remove future occurrences, preserve past
    - Implement `getActiveGroups()`, `getGroupById(id)`
    - All multi-step operations wrapped in SQLite transactions
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 5.2, 5.3, 5.4, 5.6_

  - [x] 5.5 Write property test for occurrence edit isolation
    - **Property 5: Occurrence Edit Isolation**
    - **Validates: Requirements 3.2**

  - [x] 5.6 Write property test for group edit preserves past, updates eligible future
    - **Property 7: Group Edit Preserves Past, Updates Eligible Future**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 7.1, 7.5**

  - [x] 5.7 Write property test for day-of-week change regenerates correctly
    - **Property 8: Day-of-Week Change Regenerates Correctly**
    - **Validates: Requirements 4.4, 4.5**

  - [x] 5.8 Write property test for deletion preserves past and removes future
    - **Property 9: Deletion Preserves Past and Removes Future**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Store layer
  - [x] 7.1 Implement weeklyRecurringStore
    - Create `src/stores/weeklyRecurringStore.ts` using Zustand
    - Implement state: `groups`, `occurrences` (keyed by month), `monthlyTotals` (keyed by month), `isLoading`, `error`
    - Implement actions: `loadGroups`, `loadOccurrencesForMonth`, `createGroup`, `updateGroup`, `deleteGroup`, `updateOccurrence`, `getMonthlyTotal`
    - `loadOccurrencesForMonth` triggers `OccurrenceGenerator.generateForMonth` before fetching
    - _Requirements: 1.3, 1.4, 2.1, 3.2, 4.1, 5.2, 6.2_

  - [x] 7.2 Write unit tests for weeklyRecurringStore
    - Test loading groups and occurrences
    - Test monthly total computation
    - Test error state handling
    - _Requirements: 2.1, 6.2_

- [x] 8. UI components
  - [x] 8.1 Create WeeklyRecurringForm component
    - Create `src/components/weekly-recurring/WeeklyRecurringForm.tsx`
    - Fields: title (TextInput), amount (numeric input), dayOfWeek (picker 0-6), category (selector), origin (optional selector)
    - Integrate validation, show field-level errors
    - Support both create and edit modes
    - _Requirements: 1.1, 1.2, 4.7_

  - [x] 8.2 Create WeeklyGroupList component
    - Create `src/components/weekly-recurring/WeeklyGroupList.tsx`
    - Display all active weekly recurring groups
    - Each item shows title, amount, day of week, category
    - Provide edit and delete action buttons
    - _Requirements: 4.1, 5.1_

  - [x] 8.3 Create OccurrenceList component
    - Create `src/components/weekly-recurring/OccurrenceList.tsx`
    - Display occurrences for a group ordered chronologically
    - Show date, amount, and edited indicator for each occurrence
    - _Requirements: 3.1, 3.6_

  - [x] 8.4 Create OccurrenceEditModal component
    - Create `src/components/weekly-recurring/OccurrenceEditModal.tsx`
    - Allow editing occurrence value and date
    - Integrate validation, show error messages on invalid input
    - On success, show confirmation and trigger store update
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 8.5 Create deletion confirmation dialog
    - Implement confirmation dialog showing group name and irreversibility warning
    - On confirm, call `deleteGroup`; on cancel, dismiss without changes
    - _Requirements: 5.1, 5.5_

- [x] 9. Integration and wiring
  - [x] 9.1 Integrate weekly total into SummaryCard on Home screen
    - Modify the existing SummaryCard/DashboardStore to include weekly recurring monthly total
    - Show weekly expenses line when total > 0, hide when total = 0
    - Add weekly total to overall monthly expense calculation
    - Trigger occurrence generation on month navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 9.2 Add i18n translation keys for weekly recurring feature
    - Add Portuguese (pt-BR) and English translation keys for all UI strings
    - Include form labels, error messages, confirmation dialogs, summary card labels
    - _Requirements: 1.2, 3.3, 3.5, 4.7, 5.1_

  - [x] 9.3 Wire navigation and routes for weekly recurring screens
    - Add Expo Router routes for weekly recurring group list, create/edit form, and occurrence detail
    - Connect navigation from Home/SummaryCard to weekly recurring screens
    - _Requirements: 3.1, 4.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (9 properties total)
- Unit tests validate specific examples and edge cases
- All multi-step database operations use SQLite transactions for atomicity
- The implementation uses TypeScript throughout, matching the existing codebase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.3", "2.2", "2.5", "2.6"] },
    { "id": 3, "tasks": ["2.4", "3.1", "3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["5.5", "5.6", "5.7", "5.8"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2", "8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4", "8.5"] },
    { "id": 10, "tasks": ["9.1", "9.2", "9.3"] }
  ]
}
```
