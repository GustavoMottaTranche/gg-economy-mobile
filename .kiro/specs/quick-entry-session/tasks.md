# Implementation Plan: Quick Entry Session

## Overview

Implementation of the "Sessão de Lançamento Rápido" feature — a streamlined transaction entry mode where users configure shared fields once (title, description, reference month, purchase date, category) and then enter only monetary values in rapid succession. The implementation follows the existing project patterns: Zustand store for state, service layer for orchestration, repository for persistence, and validation module for input checking.

## Tasks

- [ ] 1. Create validation module and types
  - [ ] 1.1 Create quick entry validation module (`src/validation/quickEntryValidation.ts`)
    - Define `QuickEntrySetupValidationInput` interface with fields: title, description, referenceMonth, purchaseDate, categoryId
    - Implement `validateQuickEntrySetup()` composing existing validators from `entryValidation.ts` where possible
    - Implement `validateQuickEntryAmount()` for amount range validation (1–99999999999 cents)
    - Export `ValidationResult` type consistent with existing validation modules
    - Reuse `validateTitle` and `validateDescription` from existing validation if available; create if not
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 7.2_

  - [ ]* 1.2 Write property test for setup validation correctness
    - **Property 1: Setup validation correctness**
    - Generate random strings for title (0–200 chars), description (0–600 chars), YYYY-MM strings (valid and invalid), Date objects (valid and NaN), and UUID/empty strings for categoryId
    - Assert validation returns `valid: true` iff all field constraints are met simultaneously
    - File: `src/__tests__/quickEntrySetupValidation.property.test.ts`
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 7.2**

  - [ ]* 1.3 Write property test for amount validation boundary
    - **Property 3: Amount validation boundary**
    - Generate random integers across full range (negative, zero, 1, large values, non-integers, NaN, Infinity)
    - Assert `valid: true` iff `1 <= amount <= 99999999999` and amount is a finite integer
    - File: `src/__tests__/quickEntryAmountValidation.property.test.ts`
    - **Validates: Requirements 2.3**

- [ ] 2. Implement Zustand store for session state
  - [ ] 2.1 Create quick entry session store (`src/stores/quickEntryStore.ts`)
    - Define `QuickEntrySessionState` interface (isActive, title, description, referenceMonth, purchaseDate, categoryId, entryCount, maxEntries, totalValue)
    - Define `QuickEntrySessionActions` interface (startSession, recordEntry, endSession, reset)
    - Implement `useQuickEntryStore` with Zustand following existing store patterns (e.g., `goalStore.ts`)
    - `startSession`: sets all locked fields, `isActive = true`, resets counters; no-op if already active
    - `recordEntry`: increments `entryCount`, adds amount to `totalValue`; rejects if at limit or not active
    - `endSession`: captures summary, calls `reset()`, returns summary
    - `reset`: sets all fields to initial values
    - `maxEntries` defaults to 50
    - _Requirements: 6.1, 6.2, 6.3, 4.1_

  - [ ]* 2.2 Write property test for session start locks configuration
    - **Property 2: Session start locks configuration**
    - Generate random valid `QuickEntrySessionConfig` objects
    - Assert that after `startSession(config)`, store state has `isActive = true` and all locked fields match config
    - File: `src/__tests__/quickEntrySessionStart.property.test.ts`
    - **Validates: Requirements 1.6**

  - [ ]* 2.3 Write property test for entry counters accuracy
    - **Property 4: Entry counters are always accurate**
    - Generate arrays of 1–50 valid amounts, apply `recordEntry` for each, assert `entryCount === N` and `totalValue === sum(amounts)`
    - Assert `endSession()` summary matches the same totals
    - File: `src/__tests__/quickEntryCounters.property.test.ts`
    - **Validates: Requirements 2.5, 5.2**

  - [ ]* 2.4 Write property test for session limit enforcement
    - **Property 6: Session limit enforcement**
    - Start a session, submit 50 random valid amounts via `recordEntry`, then attempt additional entries
    - Assert subsequent `recordEntry` calls return false/rejected and `entryCount` remains 50
    - File: `src/__tests__/quickEntryLimit.property.test.ts`
    - **Validates: Requirements 4.1**

  - [ ]* 2.5 Write property test for session reset on end
    - **Property 7: Session reset on end**
    - Start session with random config, record random entries, call `endSession()`
    - Assert all state fields are reset: `isActive = false`, all locked fields null, counters zero
    - File: `src/__tests__/quickEntryReset.property.test.ts`
    - **Validates: Requirements 5.3, 6.2**

  - [ ]* 2.6 Write property test for concurrent session prevention
    - **Property 8: Prevent concurrent sessions**
    - Start session A with config A, attempt `startSession(configB)` while A is active
    - Assert store state remains unchanged (session A's config intact)
    - File: `src/__tests__/quickEntryConcurrent.property.test.ts`
    - **Validates: Requirements 6.3**

- [ ] 3. Checkpoint - Ensure store and validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement service layer for transaction orchestration
  - [ ] 4.1 Create quick entry session service (`src/services/quick-entry/QuickEntrySessionService.ts`)
    - Implement `QuickEntrySessionService` class with dependency injection for `TransactionRepository`
    - Implement `submitEntry(amount: number): Promise<SubmitEntryResult>` method:
      - Read locked session fields from `useQuickEntryStore.getState()`
      - Validate amount using `validateQuickEntryAmount()`
      - Check session is active and not at limit
      - Assemble `CreateTransactionDTO` with: session title, description, purchaseDate, referenceMonth, categoryId, submitted amount, `needsReview: false`, `batchId: undefined`, `isPaid: false`
      - Call `transactionRepository.create(dto)`
      - On success: call `store.recordEntry(amount)`, return `{ success: true }`
      - On error: return `{ success: false, error: message }` (do NOT update store counters)
    - Export interfaces: `QuickEntrySessionConfig`, `QuickEntrySessionSummary`, `SubmitEntryResult`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 7.3_

  - [ ]* 4.2 Write property test for DTO assembly preserves session fields
    - **Property 5: Transaction DTO assembly preserves session fields**
    - Generate random valid session configs and random valid amounts
    - Mock `TransactionRepository.create()` to capture the DTO
    - Assert DTO fields match session config exactly: title, description, date, referenceMonth, categoryId, amount, needsReview=false, batchId=undefined
    - File: `src/__tests__/quickEntryDtoAssembly.property.test.ts`
    - **Validates: Requirements 3.1, 3.2, 3.3, 7.3**

  - [ ]* 4.3 Write unit tests for service error handling
    - Test: DB error → returns `{ success: false, error }` and store counters unchanged
    - Test: submit when session not active → returns `{ success: false }`
    - Test: submit at limit (50 entries) → returns `{ success: false }`
    - Test: invalid amount → returns `{ success: false }`
    - File: `src/__tests__/services/quickEntrySessionService.test.ts`
    - _Requirements: 3.5, 4.1, 4.2_

- [ ] 5. Create custom hook connecting store and service
  - [ ] 5.1 Create `useQuickEntrySession` hook (`src/hooks/useQuickEntrySession.ts`)
    - Expose computed properties: `isActive`, `entryCount`, `maxEntries`, `totalValue`, `remainingEntries`, `isAtLimit`
    - Expose locked fields: `title`, `description`, `referenceMonth`, `purchaseDate`, `categoryId`
    - Expose actions: `startSession(config)`, `submitEntry(amount)`, `endSession()`
    - `remainingEntries` computed as `maxEntries - entryCount`
    - `isAtLimit` computed as `entryCount >= maxEntries`
    - Wire `submitEntry` to `QuickEntrySessionService.submitEntry()`
    - Export hook and return type interface `UseQuickEntrySessionReturn`
    - _Requirements: 2.1, 2.2, 2.5, 4.2, 4.3, 5.1_

  - [ ]* 5.2 Write unit tests for useQuickEntrySession hook
    - Test computed properties calculate correctly
    - Test startSession delegates to store
    - Test submitEntry delegates to service
    - Test endSession delegates to store and returns summary
    - File: `src/__tests__/hooks/useQuickEntrySession.test.ts`
    - _Requirements: 2.5, 4.3_

- [ ] 6. Checkpoint - Ensure all logic layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement UI screens
  - [ ] 7.1 Create Session Setup screen (`app/quick-entry/setup.tsx`)
    - Render form with: title input, description input, reference month picker, purchase date picker, category selector
    - Category selector uses existing category list from the app
    - Wire validation to `validateQuickEntrySetup()` on submit
    - Display inline error messages per field on validation failure
    - On valid submit: call `startSession(config)` and navigate to input screen
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2_

  - [ ] 7.2 Create Value Input screen (`app/quick-entry/input.tsx`)
    - Display locked session fields (title, description, referenceMonth, purchaseDate) as read-only context
    - Display numeric input field for amount entry
    - Display running counter (e.g., "3/50") and accumulated total value
    - On amount submit: call `submitEntry(amount)`, clear input on success, show error toast on failure retaining the value
    - When `isAtLimit` is true: disable input field and show prompt to end session
    - Display "End Session" button that triggers `endSession()`
    - On session end: show `QuickEntrySummaryModal` with summary data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 4.2, 4.3, 5.1_

  - [ ] 7.3 Create Session Summary modal (`src/components/quick-entry/QuickEntrySummaryModal.tsx`)
    - Display total entries created and total accumulated value (formatted as currency)
    - Display dismiss button
    - On dismiss: reset session state and navigate back to setup or previous screen
    - _Requirements: 5.2, 5.3_

- [ ] 8. Wire navigation and integrate feature entry point
  - [ ] 8.1 Add quick-entry route layout (`app/quick-entry/_layout.tsx`)
    - Create stack navigator layout for quick-entry screens (setup → input)
    - Follow existing routing patterns (e.g., `app/import/`, `app/category/`)
    - _Requirements: 1.1, 1.6_

  - [ ] 8.2 Add entry point navigation to quick entry session
    - Add navigation trigger to quick entry session from appropriate location (e.g., Manual entry screen or FAB menu)
    - Ensure session state is checked — if session already active, navigate directly to input screen
    - _Requirements: 5.4, 6.3_

- [ ] 9. Checkpoint - Ensure all tests pass and feature is integrated
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 10. Write component tests for UI screens
  - [ ]* 10.1 Write component tests for QuickEntrySetupScreen
    - Test: all form fields render correctly
    - Test: validation errors display inline on invalid submit
    - Test: valid submission calls startSession and navigates
    - File: `src/__tests__/components/QuickEntrySetupScreen.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2_

  - [ ]* 10.2 Write component tests for QuickEntryInputScreen
    - Test: locked fields display as read-only
    - Test: numeric input accepts and submits values
    - Test: counter displays correctly (e.g., "3/50")
    - Test: input disabled when at limit
    - Test: error toast shown on failure, input value retained
    - File: `src/__tests__/components/QuickEntryInputScreen.test.tsx`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.5, 4.2, 4.3_

  - [ ]* 10.3 Write component tests for QuickEntrySummaryModal
    - Test: displays correct totals
    - Test: dismiss resets state and navigates
    - File: `src/__tests__/components/QuickEntrySummaryModal.test.tsx`
    - _Requirements: 5.2, 5.3_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The feature reuses existing `createTransaction` from `TransactionRepository` — no DB schema changes needed
- Zustand store follows conventions from existing stores (e.g., `goalStore.ts`, `fundStore.ts`)
- Service layer follows existing patterns (e.g., `src/services/batch/BatchSessionManager.ts`)
- Validation module follows existing patterns (e.g., `src/validation/entryValidation.ts`)
- Routing follows Expo Router file-based conventions under `app/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
