# Implementation Plan: Maestro E2E Testing

## Overview

Expand Maestro E2E test coverage by creating 4 new flow files (dashboard, transactions-list, transaction-edit, categories), updating 2 existing flows (smoke-test, navigation), adding new npm scripts, and updating config tags. Each flow uses `clearState: true` for test independence and creates its own test data inline.

## Tasks

- [x] 1. Update Maestro configuration and npm scripts
  - [x] 1.1 Add new tags to `.maestro/config.yaml`
    - Add `dashboard`, `transactions`, and `categories` tags to the tags section
    - _Requirements: 11.4, 12.1_

  - [x] 1.2 Add new npm scripts to `package.json`
    - Add `e2e:dashboard`: `maestro test .maestro/flows/dashboard.yaml`
    - Add `e2e:transactions`: `maestro test .maestro/flows/transactions-list.yaml`
    - Add `e2e:edit`: `maestro test .maestro/flows/transaction-edit.yaml`
    - Add `e2e:categories`: `maestro test .maestro/flows/categories.yaml`
    - _Requirements: 11.3_

- [x] 2. Update existing flows
  - [x] 2.1 Update `smoke-test.yaml` with timeout improvements
    - Ensure app launch uses 15-second timeout (Requirement 2.1)
    - Ensure tab navigation uses 5-second timeout per tab (Requirement 2.2)
    - Add `takeScreenshot` at each navigation step for visual verification (Requirement 2.3)
    - Ensure descriptive error on timeout failure (Requirement 2.4)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Update `navigation.yaml` to add Notifications sub-setting
    - Add navigation step to tap `settings-item-notifications` and verify notifications screen loads
    - Add back navigation from notifications screen to settings
    - _Requirements: 6.6, 6.7_

- [x] 3. Create Dashboard flow
  - [x] 3.1 Create `.maestro/flows/dashboard.yaml`
    - Set `appId: com.ggeconomy.mobile` and tag `dashboard`
    - Use `clearState: true` for test independence
    - **Part A - App Launch**: Launch app, wait for Dashboard screen (15s timeout)
    - **Part B - Month Selector**: Verify `dashboard-month-selector` is visible with current month; tap previous month arrow and assert update; tap next month arrow and assert update
    - **Part C - Data Setup**: Navigate to Manual Entry, create a test expense transaction (amount: 50.00, description: "Test Expense"), create a test income transaction (amount: 100.00, description: "Test Income"), navigate back to Dashboard
    - **Part D - Summary Card**: Assert `dashboard-summary` shows Income, Expenses, and Balance values
    - **Part E - Chart Filters**: Assert `dashboard-expense-chart` is visible; tap each chart filter option (All, Fixed, Variable) via `dashboard-chart-filter` and verify chart updates
    - **Part F - Empty State**: Navigate to a month with no data, verify empty state hint is displayed
    - Add `takeScreenshot` at key verification points
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 12.1, 12.2_

- [x] 4. Create Transactions List flow
  - [x] 4.1 Create `.maestro/flows/transactions-list.yaml`
    - Set `appId: com.ggeconomy.mobile` and tag `transactions`
    - Use `clearState: true` for test independence
    - **Part A - Data Setup**: Launch app, navigate to Manual Entry, create multiple test transactions (at least 2 expenses with different categories, 1 income) to populate the list
    - **Part B - List Verification**: Navigate to Transactions tab, verify `transactions-screen` loads, assert `monthly-summary` shows income/expenses/balance
    - **Part C - Filter Panel**: Tap filter toggle to expand `Filter_Panel`, verify category/amount/date filters are visible; select a category filter and assert only matching transactions display
    - **Part D - Month Navigation**: Use `month-selector` to navigate to previous month, verify transactions list refreshes for selected month
    - **Part E - Add Transaction Button**: Tap `add-transaction-button` (+), verify navigation to Manual Entry screen, navigate back
    - **Part F - Long Press Delete**: Long-press a transaction card, verify deletion confirmation dialog appears
    - **Part G - Tap Transaction**: Tap a transaction card, verify navigation to transaction edit modal
    - Add `takeScreenshot` at key verification points
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 12.1, 12.2_

- [x] 5. Checkpoint - Verify existing and new flows
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create Transaction Edit flow
  - [x] 6.1 Create `.maestro/flows/transaction-edit.yaml`
    - Set `appId: com.ggeconomy.mobile` and tag `transactions`
    - Use `clearState: true` for test independence
    - **Part A - Data Setup**: Launch app, navigate to Manual Entry, create a test expense transaction with a known category
    - **Part B - Open Edit Modal**: Navigate to Transactions tab, tap the transaction card, verify `transaction-detail-screen` opens with pre-filled fields (amount, category, description)
    - **Part C - Edit Category**: Tap `detail-category`, verify `category-edit-modal` opens with `category-edit-selector`; select a different category; tap save; verify return to transactions list with updated category
    - **Part D - Cancel Edit**: Tap a transaction card again, tap `category-edit-cancel` or back/close button without saving, verify return to transactions list without modification
    - Add `takeScreenshot` at key verification points
    - _Requirements: 9.1, 9.2, 9.3, 12.1, 12.2_

- [x] 7. Create Categories Management flow
  - [x] 7.1 Create `.maestro/flows/categories.yaml`
    - Set `appId: com.ggeconomy.mobile` and tag `categories`
    - Use `clearState: true` for test independence
    - **Part A - App Launch**: Launch app, navigate to Settings > Categories
    - **Part B - List Verification**: Verify `categories-settings-screen` loads, assert existing categories are displayed grouped by type (income/expense) using `expense-group-filter`
    - **Part C - Add Category**: Tap `add-category-button`, verify `category-form-modal` opens; fill `category-name-input` with "Test Category"; select expense type via `type-expense-button`; tap `save-category-button`; verify new category appears in the list
    - **Part D - Validation**: Tap `add-category-button` again, attempt to save with empty required fields, verify validation errors are displayed
    - **Part E - Close Modal**: Open category form, tap `close-category-modal`, verify return to categories list
    - Add `takeScreenshot` at key verification points
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 12.1, 12.2_

- [x] 8. Final checkpoint - Ensure all flows pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No property-based tests are included because Maestro flows are declarative YAML configurations, not functions with testable properties
- Each flow uses `clearState: true` ensuring complete test independence (Requirement 12)
- Flows that need pre-existing data create it inline as setup steps
- All flows use testIDs for reliable element selection
- JUnit reporting is already configured in `.maestro/config.yaml`
- Screenshots are captured at key steps for visual debugging
- The `e2e` script already runs all flows in the `.maestro/flows/` directory, so new flows are automatically included

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["6.1", "7.1"] }
  ]
}
```
