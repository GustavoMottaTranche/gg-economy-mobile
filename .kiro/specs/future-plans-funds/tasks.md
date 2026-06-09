# Implementation Plan: Future Plans Funds

## Overview

This plan implements the "Planos Futuros" feature for the GG-Economy Mobile app. The implementation follows the existing layered architecture: database migration → schema → repositories → services → store → validation → UI components → integration. Each task builds incrementally. All work MUST be done in a new git branch (`feature/future-plans-funds`) to protect existing working code.

## Tasks

- [x] 1. Git branch and database schema
  - [x] 1.1 Create feature branch
    - Run `git checkout -b feature/future-plans-funds` from the project root
    - All subsequent work happens on this branch
    - _Prerequisite: none_

  - [x] 1.2 Create database migration for fund tables
    - Create migration file with all 5 tables: `funds`, `fund_allocations`, `fund_balances`, `fund_transactions`, `recurring_fund_links`
    - `funds`: id (text PK), name (text NOT NULL), icon (text nullable), color (text nullable), is_active (integer default 1), created_at, updated_at
    - `fund_allocations`: id (text PK), fund_id (FK to funds, CASCADE), reference_month (text NOT NULL), amount (real > 0), created_at, updated_at. Unique index on (fund_id, reference_month)
    - `fund_balances`: id (text PK), fund_id (FK to funds, CASCADE, UNIQUE), base_amount (real default 0, >= 0), updated_at
    - `fund_transactions`: id (text PK), fund_id (FK to funds, CASCADE), transaction_id (FK to transactions, CASCADE, UNIQUE), created_at. Index on fund_id
    - `recurring_fund_links`: id (text PK), recurring_id (FK to recurring_transactions, CASCADE, UNIQUE), fund_id (FK to funds, CASCADE), created_at. Index on fund_id
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 1.3 Add Drizzle schema definitions
    - Add `funds`, `fundAllocations`, `fundBalances`, `fundTransactions`, `recurringFundLinks` table definitions to `src/db/schema.ts`
    - Add relations definitions for all new tables
    - Export type definitions (FundRecord, FundAllocationRecord, etc.)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Types and validation
  - [x] 2.1 Create fund type definitions
    - Create `src/types/fund.ts` with interfaces: Fund, FundAllocation, FundBalance, FundTransaction, RecurringFundLink, FundWithBalance
    - Define CreateFundDTO, UpdateFundDTO
    - _Requirements: 5.3, 6.2, 7.2, 8.2_

  - [x] 2.2 Implement fund validation functions
    - Create `src/validation/fundValidation.ts`
    - Implement `validateFundName(name: string)`: valid if 1-50 chars
    - Implement `validateMonetaryInput(input, locale, options)`: valid if 0.01-999,999,999.99, convert to cents, handle locale decimal separators
    - _Requirements: 2.5, 5.6, 6.7_

  - [x] 2.3 Write property test for fund name validation
    - **Property 6: Fund name validation**
    - **Validates: Requirements 5.6**
    - File: `src/__tests__/fundNameValidation.property.test.ts`
    - Use fast-check: empty strings and strings > 50 chars → invalid; strings 1-50 chars → valid

  - [x] 2.4 Write property test for monetary input validation
    - **Property 7: Monetary input validation**
    - **Validates: Requirements 2.5, 6.7**
    - File: `src/__tests__/fundMonetaryValidation.property.test.ts`
    - Use fast-check: values ≤ 0, > 999999999.99, NaN, non-numeric → invalid; values in range → valid with correct cents

- [x] 3. Repository layer
  - [x] 3.1 Create FundRepository
    - Create `src/repositories/FundRepository.ts`
    - Methods: getAll, getActive, getById, create, update, deactivate (soft-delete: set is_active = false)
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 3.2 Create FundAllocationRepository
    - Create `src/repositories/FundAllocationRepository.ts`
    - Methods: getByFundAndMonth, getAllForMonth, getAllForFund, upsert, delete
    - Upsert uses INSERT OR REPLACE pattern for the unique (fund_id, reference_month) combination
    - _Requirements: 6.2, 6.5, 6.6, 6.7_

  - [x] 3.3 Create FundBalanceRepository
    - Create `src/repositories/FundBalanceRepository.ts`
    - Methods: getByFundId, upsert, getAll
    - Handles base_amount storage per fund (unique on fund_id)
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 3.4 Create FundTransactionRepository
    - Create `src/repositories/FundTransactionRepository.ts`
    - Methods: getByFundId, getByTransactionId, link (create record + set isExcludedFromTotals=true), unlink (delete record + set isExcludedFromTotals=false), getByFundIdWithDetails (joins transaction data)
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 3.5 Create RecurringFundLinkRepository
    - Create `src/repositories/RecurringFundLinkRepository.ts`
    - Methods: getByRecurringId, getByFundId, link, unlink
    - _Requirements: 11.3, 11.4, 11.5_

  - [x] 3.6 Write property test for fund persistence round-trip
    - **Property 8: Fund persistence round-trip**
    - **Validates: Requirements 5.3, 6.2, 7.2**
    - File: `src/__tests__/fundPersistence.property.test.ts`
    - Use fast-check: create fund → read back → same name; create allocation → read back → same amount and month

- [x] 4. Calculation services
  - [x] 4.1 Implement SavingsCalculationService
    - Create `src/services/funds/SavingsCalculationService.ts`
    - `calculateSavingsGoal(input)`: returns `monthlyIncome - totalPaid - totalPending - max(0, generalVariableGoal - actualVariableSpending)`. If no variable goal, expectation = 0
    - `calculateActualSavings(input)`: returns `totalReceivedIncome - totalPaidExpenses`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.2_

  - [x] 4.2 Implement FundBalanceCalculationService
    - Create `src/services/funds/FundBalanceCalculationService.ts`
    - `calculateFundBalance(input)`: returns `baseAmount + totalAllocations - totalDeductions`
    - `filterDeductionsByMonth(transactions, currentMonth)`: returns only transactions where referenceMonth <= currentMonth
    - _Requirements: 7.3, 9.1_

  - [x] 4.3 Write property test for Savings Goal calculation
    - **Property 1: Savings Goal calculation correctness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
    - File: `src/__tests__/savingsCalculation.property.test.ts`
    - Use fast-check: verify formula holds for arbitrary valid inputs; variable expectation is max(0, goal - actual); when goal is null, expectation = 0

  - [x] 4.4 Write property test for Actual Savings calculation
    - **Property 2: Actual Savings calculation correctness**
    - **Validates: Requirements 4.2, 4.5**
    - File: `src/__tests__/actualSavings.property.test.ts`
    - Use fast-check: verify result = income - expenses for arbitrary values; result can be negative

  - [x] 4.5 Write property test for Fund Balance calculation
    - **Property 3: Fund Balance calculation correctness**
    - **Validates: Requirements 7.3**
    - File: `src/__tests__/fundBalance.property.test.ts`
    - Use fast-check: verify result = base + allocations - deductions; can be negative

  - [x] 4.6 Write property test for Reference Month Constraint
    - **Property 4: Reference Month Constraint filtering**
    - **Validates: Requirements 9.1, 9.4**
    - File: `src/__tests__/referenceMonthConstraint.property.test.ts`
    - Use fast-check: generate transactions with various months and a current month; verify only referenceMonth <= currentMonth are included

  - [x] 4.7 Write property test for Fund Allocation remaining
    - **Property 5: Fund allocation remaining calculation**
    - **Validates: Requirements 6.3, 6.4**
    - File: `src/__tests__/fundAllocationRemaining.property.test.ts`
    - Use fast-check: remaining = savingsGoal - sum(allocations); can be negative

- [x] 5. Checkpoint - Core logic tests
  - Run all property tests and unit tests to ensure calculation services and repositories work correctly before building UI.

- [x] 6. Zustand store
  - [x] 6.1 Implement fundStore
    - Create `src/stores/fundStore.ts`
    - State: funds, allocations (per month), balances, fundTransactions, monthlyIncome, selectedMonth, isLoading
    - Actions: loadFunds, loadMonthData, createFund, updateFund, deactivateFund, setMonthlyIncome, removeMonthlyIncome, setAllocation, removeAllocation, linkTransaction, unlinkTransaction, setBaseBalance, getFundExpensesForMonth
    - Use repositories for data access; recalculate balances reactively
    - _Requirements: 2.2, 2.4, 5.1, 5.3, 5.4, 5.5, 6.2, 6.6, 6.7, 7.5, 8.2, 8.3, 8.6_

  - [x] 6.2 Create useFuturePlansData hook
    - Create `src/hooks/useFuturePlansData.ts`
    - Composes fundStore data with dashboard queries to provide: savingsGoal, actualSavings, funds with balances, allocations, remaining distributable amount
    - Uses SavingsCalculationService for computed values
    - _Requirements: 3.1, 4.1, 6.3, 13.2_

  - [x] 6.3 Write unit tests for fundStore
    - File: `src/__tests__/fundStore.test.ts`
    - Test all actions: CRUD operations, state transitions, monthly income management, linking/unlinking

- [x] 7. Internationalization
  - [x] 7.1 Add translation keys for pt-BR
    - Add to `src/i18n/locales/pt-BR.json`: futurePlans section with all labels (tab, screen title, metrics, fund management, validation messages, dashboard summary)
    - Key examples: `futurePlans.tab` = "Planos", `futurePlans.savingsGoal` = "Meta de economia", `futurePlans.actualSavings` = "Guardando", `futurePlans.remaining` = "Restante", `futurePlans.fundExpenses` = "Gastos de fundos"
    - _Requirements: 14.1, 14.3, 14.4, 14.5, 14.6_

  - [x] 7.2 Add translation keys for en
    - Add to `src/i18n/locales/en.json`: futurePlans section with all labels
    - Key examples: `futurePlans.tab` = "Plans", `futurePlans.savingsGoal` = "Savings goal", `futurePlans.actualSavings` = "Saving", `futurePlans.remaining` = "Remaining", `futurePlans.fundExpenses` = "Fund expenses"
    - _Requirements: 14.1, 14.3, 14.4, 14.5, 14.6_

- [x] 8. UI Components
  - [x] 8.1 Create SavingsMetrics component
    - Create `src/components/future-plans/SavingsMetrics.tsx`
    - Displays Monthly Income, Savings Goal, and Actual Savings in a card with elevated styling (lg shadow)
    - Uses theme colors; negative savings goal uses `status.error` color
    - _Requirements: 3.1, 4.1, 15.3, 15.5_

  - [x] 8.2 Create FundCard component
    - Create `src/components/future-plans/FundCard.tsx`
    - Displays fund name, icon, color, monthly allocation input, total balance
    - Uses PressableCard with variant="secondary" pattern
    - Tappable to expand and show linked transactions
    - _Requirements: 5.7, 6.1, 7.4, 15.2_

  - [x] 8.3 Create FundTransactionList component
    - Create `src/components/future-plans/FundTransactionList.tsx`
    - Displays all linked transactions for a fund (title, amount, date, reference month)
    - Future-dated transactions shown with muted styling and "futuro"/"future" label
    - _Requirements: 8.4, 8.5, 9.2, 9.3_

  - [x] 8.4 Create FundSelector component
    - Create `src/components/future-plans/FundSelector.tsx`
    - Modal or bottom sheet with list of active funds for selection
    - Used in transaction edit/create screens
    - Shows "Nenhum" / "None" option to unlink
    - _Requirements: 8.1, 8.8_

  - [x] 8.5 Create Future Plans tab screen
    - Create `app/(tabs)/future-plans.tsx`
    - Layout: MonthSelector → SavingsMetrics → FundCard list → Remaining distributable display
    - Shows prompt to configure monthly income if not set
    - Shows "create fund" button when no funds exist
    - Negative remaining uses `status.warning` color
    - _Requirements: 1.2, 2.6, 3.1, 4.1, 5.1, 6.3, 13.1, 13.2, 13.3, 13.4, 15.1, 15.5, 15.6_

  - [x] 8.6 Create Fund Config settings screen
    - Create `app/(tabs)/settings/fund-config.tsx`
    - Layout: Monthly income input → Fund list with base balance inputs → Create fund button
    - Auto-save behavior on valid input (matching existing goal config pattern)
    - Allows editing fund name, icon, color, base balance; deactivating funds
    - _Requirements: 2.1, 2.3, 2.4, 5.4, 5.5, 7.1, 7.5, 15.4_

- [x] 9. Navigation integration
  - [x] 9.1 Add Future Plans tab to tab layout
    - Modify `app/(tabs)/_layout.tsx` to add "future-plans" tab between "manual" and "settings"
    - Add "plans" icon to TabBarIcon component
    - Use localized label from i18n
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 9.2 Add Fund Config to settings navigation
    - Modify `app/(tabs)/settings/_layout.tsx` to add `fund-config` screen
    - Modify `app/(tabs)/settings/index.tsx` to add navigation item ("Configurar Fundos" / "Configure Funds")
    - _Requirements: 2.1_

- [x] 10. Transaction linking integration
  - [x] 10.1 Add Fund selector to transaction edit screen
    - Modify `app/transaction/[id].tsx` to include FundSelector
    - When fund selected: call fundStore.linkTransaction; when "None" selected: call unlinkTransaction
    - Display current linked fund name if any
    - _Requirements: 8.1, 8.6, 8.8_

  - [x] 10.2 Add Fund selector to manual entry screen
    - Modify `app/(tabs)/manual.tsx` to include optional FundSelector for expense transactions
    - When fund selected during creation: link transaction to fund after creation
    - _Requirements: 8.1, 8.7_

  - [x] 10.3 Integrate with recurring transaction generation
    - Modify `src/services/recurring/RecurringTransactionService.ts`
    - When generating a recurring transaction: check `recurring_fund_links` for the recurring_id
    - If link exists: set `isExcludedFromTotals = true` and create `fund_transactions` record
    - _Requirements: 11.1, 11.2_

  - [x] 10.4 Add Fund selector to recurring transaction config
    - Modify recurring transaction create/edit screens to include optional Fund association
    - Store in `recurring_fund_links` table
    - _Requirements: 11.4, 11.5, 11.6_

- [x] 11. Dashboard integration
  - [x] 11.1 Add fund expense summary to Dashboard
    - Modify `app/(tabs)/index.tsx` to display fund-linked expense total for selected month
    - Show as small text/link below or near the expense summary area
    - Only show when fund expenses > 0 for the month
    - Tap navigates to Future Plans screen
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 11.2 Update useDashboardData hook
    - Modify `src/hooks/useDashboardData.ts` to include fund expense total for the month
    - Query `fund_transactions` joined with `transactions` where reference_month = selected month
    - _Requirements: 10.1, 10.3_

- [x] 12. Component and integration tests
  - [x] 12.1 Write tests for Future Plans screen
    - File: `src/__tests__/components/FuturePlansScreen.test.tsx`
    - Test: renders metrics, displays funds, month navigation, empty states, income prompt

  - [x] 12.2 Write tests for FundCard component
    - File: `src/__tests__/components/FundCard.test.tsx`
    - Test: displays name/balance, allocation input, expand to show transactions

  - [x] 12.3 Write tests for FundSelector component
    - File: `src/__tests__/components/FundSelector.test.tsx`
    - Test: shows active funds, selection callback, "None" option

  - [x] 12.4 Write tests for Dashboard fund summary
    - File: `src/__tests__/components/DashboardFundSummary.test.tsx`
    - Test: shows when fund expenses exist, hidden when none, navigation on tap

- [x] 13. Final verification
  - [x] 13.1 Run full test suite
    - Run `npm run typecheck && npm run lint && npm run format:check && npm test -- --passWithNoTests`
    - Fix any errors or warnings

  - [x] 13.2 Verify on device/emulator
    - Verify the new tab appears correctly
    - Verify fund creation, allocation, and balance calculations
    - Verify transaction linking and dashboard summary
    - Test both light and dark themes
    - Test in both pt-BR and en locales
