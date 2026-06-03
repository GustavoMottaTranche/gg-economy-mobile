# Implementation Plan: Variable Expense Goals

## Overview

This plan implements budget goals for variable expenses in the GG-Economy mobile app. The implementation follows the existing layered architecture: database migration → schema → repository → store → validation/services → UI components → i18n. Each task builds incrementally, wiring new code into the existing system at each step.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Create the `category_goals` table migration file
    - Create `src/db/migrations/0007_add_category_goals.sql` with CREATE TABLE and CREATE INDEX statements
    - Create `src/db/migrations/0007_add_category_goals.ts` TypeScript migration wrapper
    - Table columns: `id` (text PK), `category_id` (text, unique, FK to categories with ON DELETE CASCADE), `amount` (real, > 0), `created_at` (text, default datetime('now')), `updated_at` (text, default datetime('now'))
    - Include index on `category_id`
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

  - [x] 1.2 Add `categoryGoals` table definition to Drizzle schema
    - Add the `categoryGoals` sqliteTable to `src/db/schema.ts`
    - Include unique constraint on `categoryId`, cascade delete reference to `categories.id`
    - Include index definition
    - _Requirements: 6.1, 6.5, 6.6_

- [x] 2. Repository layer
  - [x] 2.1 Create `ICategoryGoalRepository` interface
    - Create `src/repositories/interfaces/ICategoryGoalRepository.ts`
    - Define methods: `getByCategoryId`, `getAllForVariableCategories`, `upsert`, `delete`
    - Define `CategoryGoal` type in `src/types/goal.ts`
    - _Requirements: 6.1, 6.7_

  - [x] 2.2 Implement `CategoryGoalRepository`
    - Create `src/repositories/CategoryGoalRepository.ts`
    - Implement all CRUD methods using Drizzle ORM queries
    - `upsert` uses INSERT OR REPLACE pattern, generates UUID for id, updates `updated_at`
    - `delete` removes the row entirely (absence = no goal)
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7, 2.2, 2.4, 2.5_

  - [x] 2.3 Write property test for goal persistence round-trip
    - **Property 1: Goal persistence round-trip**
    - **Validates: Requirements 1.2, 2.2, 6.2**
    - File: `src/__tests__/goalPersistence.property.test.ts`
    - Use fast-check to generate valid amounts (1..99999999999) and category IDs
    - Verify upsert → getByCategoryId returns same amount

  - [x] 2.4 Write property test for goal deletion
    - **Property 2: Goal deletion returns absent state**
    - **Validates: Requirements 1.5, 2.5, 6.3, 6.7**
    - File: `src/__tests__/goalDeletion.property.test.ts`
    - Use fast-check to generate goals, persist, delete, verify null return

  - [x] 2.5 Write property test for cascade delete
    - **Property 7: Cascade delete removes associated goals**
    - **Validates: Requirements 6.5**
    - File: `src/__tests__/goalCascadeDelete.property.test.ts`
    - Use fast-check to generate category+goal pairs, delete category, verify goal is gone

- [x] 3. Validation utility
  - [x] 3.1 Implement goal validation function
    - Create `src/validation/goalValidation.ts`
    - Implement `validateGoalAmount(input: string | number, locale: SupportedLocale): GoalValidationResult`
    - Accept values between 0.01 and 999,999,999.99, convert to cents
    - Handle locale-specific decimal separators (comma for pt-BR, dot for en)
    - Return `{ valid: true, amountInCents }` or `{ valid: false, error: i18nKey }`
    - _Requirements: 1.8, 2.7, 7.5, 7.6_

  - [x] 3.2 Write property test for goal validation
    - **Property 3: Goal validation rejects invalid amounts**
    - **Validates: Requirements 1.8, 2.7, 7.5**
    - File: `src/__tests__/goalValidation.property.test.ts`
    - Use fast-check to generate invalid values (≤0, >999999999.99, NaN, non-numeric strings)
    - Verify all return `{ valid: false }`
    - Also verify valid amounts in range return `{ valid: true }`

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Expected Future Spending calculation service
  - [x] 5.1 Implement `calculateExpectedFutureSpending` function
    - Create `src/services/goals/ExpectedFutureSpending.ts`
    - Pure function: for each category with a goal, compute `max(0, goal - actualSpending)`
    - Sum all contributions; categories without goals contribute nothing
    - Result is always ≥ 0
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 5.2 Write property test for Expected Future Spending
    - **Property 4: Expected Future Spending calculation**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**
    - File: `src/__tests__/expectedFutureSpending.property.test.ts`
    - Use fast-check to generate arrays of `{ categoryId, actualSpending, goal | null }`
    - Verify result equals manual sum of `max(0, goal - actual)` for categories with goals
    - Verify result is always ≥ 0

- [x] 6. Zustand goal store
  - [x] 6.1 Implement `goalStore` with Zustand
    - Create `src/stores/goalStore.ts`
    - State: `generalGoal: number | null`, `categoryGoals: Map<string, number>`, `isLoading: boolean`
    - Actions: `loadGoals`, `setGeneralGoal`, `removeGeneralGoal`, `setCategoryGoal`, `removeCategoryGoal`
    - `setGeneralGoal` persists to `user_preferences` table with key `general_variable_goal`
    - `removeGeneralGoal` deletes the row from `user_preferences`
    - `setCategoryGoal` calls `CategoryGoalRepository.upsert`
    - `removeCategoryGoal` calls `CategoryGoalRepository.delete`
    - _Requirements: 1.2, 1.4, 1.5, 2.2, 2.4, 2.5, 6.2, 6.3, 6.7_

  - [x] 6.2 Write unit tests for goalStore
    - File: `src/__tests__/goalStore.test.ts`
    - Test all state transitions: load, set, remove for both general and category goals
    - Mock repository and user_preferences queries
    - _Requirements: 1.2, 1.4, 1.5, 2.2, 2.4, 2.5_

- [x] 7. Hooks for Dashboard consumption
  - [x] 7.1 Create `useGoals` hook
    - Create `src/hooks/useGoals.ts`
    - Expose goal data from goalStore for Dashboard components
    - Compute `expectedFutureSpending` using the calculation service
    - Return: `generalGoal`, `categoryGoals`, `expectedFutureSpending`, `isLoading`
    - _Requirements: 3.1, 4.1, 10.1_

  - [x] 7.2 Integrate goals into `useDashboardData` hook
    - Modify `src/hooks/useDashboardData.ts` to include goal data in return type
    - Wire `useGoals` data into the dashboard data flow
    - _Requirements: 3.1, 4.1, 10.1, 10.10_

- [x] 8. Internationalization
  - [x] 8.1 Add i18n translation keys for pt-BR and en
    - Add goal-related keys to `src/i18n/locales/pt-BR.json` and `src/i18n/locales/en.json`
    - Keys include: settings menu item, screen title, general goal label, category goal labels, suggestion indicators ("meta"/"goal"), expected spending label ("expectativa"/"expected"), validation messages, explanatory text (≤150 chars), input placeholders
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 5.4_

  - [x] 8.2 Write property test for i18n key completeness
    - **Property 5: i18n keys completeness**
    - **Validates: Requirements 8.1, 5.4, 1.6**
    - File: `src/__tests__/goalI18n.property.test.ts`
    - Use fast-check to iterate over all required keys and both locales
    - Verify each key resolves to a non-empty string
    - Verify explanatory text ≤ 150 characters in all locales

  - [x] 8.3 Write property test for currency formatting
    - **Property 8: Currency formatting produces valid locale output**
    - **Validates: Requirements 3.2, 4.2, 10.7**
    - File: `src/__tests__/goalCurrencyFormat.property.test.ts`
    - Use fast-check to generate valid positive amounts and supported locales
    - Verify `formatCurrencyLocale` returns a non-empty string with currency symbol

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Dashboard UI modifications
  - [x] 10.1 Modify `CollapsibleSection` to display general goal and expected spending
    - Modify `src/components/dashboard/CollapsibleSection.tsx`
    - When `generalGoal` is configured: display goal value formatted as currency with suggestion indicator ("meta"/"goal") using `text.tertiary` color
    - Display expected future spending with label ("expectativa"/"expected") in secondary styling
    - When no goal configured: render only actual total, no placeholders
    - Set `accessibilityLabel` including both actual and goal values when goal exists
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.3, 9.2, 9.4, 9.5, 10.1, 10.7, 10.8, 10.9_

  - [x] 10.2 Modify `CategoryRow` to display per-category goals
    - Modify `src/components/dashboard/CategoryRow.tsx`
    - When category has a goal: display goal value formatted as currency with suggestion indicator, using muted/secondary styling
    - When no goal: display only actual amount, no placeholders
    - Ensure no text truncation on 320dp+ screens for values up to 999,999.99
    - Minimum 10sp text size for goal value
    - Set `accessibilityLabel` with both actual and goal when goal exists
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.3, 9.2, 9.4, 9.5_

  - [x] 10.3 Write unit tests for CollapsibleSection with goals
    - File: `src/__tests__/components/CollapsibleSection.goals.test.tsx`
    - Test rendering with/without general goal, expected spending display, accessibility labels
    - _Requirements: 3.1, 3.4, 9.4, 9.5_

  - [x] 10.4 Write unit tests for CategoryRow with goals
    - File: `src/__tests__/components/CategoryRow.goals.test.tsx`
    - Test rendering with/without category goal, suggestion indicator, accessibility labels
    - _Requirements: 4.1, 4.4, 9.4, 9.5_

- [x] 11. Budget Goals settings screen
  - [x] 11.1 Add `budget-goals` route to settings stack
    - Modify `app/(tabs)/settings/_layout.tsx` to add the `budget-goals` screen
    - Modify `app/(tabs)/settings/index.tsx` to add navigation item with localized label
    - _Requirements: 7.1, 7.2_

  - [x] 11.2 Implement Budget Goals configuration screen
    - Create `app/(tabs)/settings/budget-goals.tsx`
    - Display general goal input at the top with localized label
    - Display list of variable categories (alphabetical order) with icon, color, name, and goal input
    - Use `PressableCard` with `variant="secondary"` and `spacing.base` padding
    - Use `useThemeColors` hook for all colors (no hardcoded literals)
    - Include explanatory text (≤150 chars) stating goals are suggestions
    - Auto-save: persist on valid input, remove on clear
    - Inline validation messages for invalid input
    - Confirmation feedback on save/edit/remove
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 9.1, 9.3_

  - [x] 11.3 Write property test for category alphabetical order
    - **Property 6: Categories displayed in alphabetical order**
    - **Validates: Requirements 7.9**
    - File: `src/__tests__/goalCategoryOrder.property.test.ts`
    - Use fast-check to generate arrays of category names
    - Verify sorting logic produces ascending alphabetical order

  - [x] 11.4 Write unit tests for Budget Goals screen
    - File: `src/__tests__/components/BudgetGoalsScreen.test.tsx`
    - Test rendering, input interactions, auto-save behavior, validation display
    - File: `app/(tabs)/settings/__tests__/budget-goals.test.tsx`
    - Test navigation and screen structure
    - _Requirements: 7.3, 7.4, 7.7, 7.8, 7.9_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All amounts stored in cents (integers) to avoid floating-point issues
- Auto-save pattern matches existing frictionless UX in the app
- The `user_preferences` table is reused for the general variable goal (no new table needed)
- Property tests use `fast-check` with `{ numRuns: 100 }` configuration

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "8.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "5.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "3.2", "5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["7.2", "11.1"] },
    { "id": 6, "tasks": ["10.1", "10.2", "11.2"] },
    { "id": 7, "tasks": ["10.3", "10.4", "11.3", "11.4"] }
  ]
}
```
