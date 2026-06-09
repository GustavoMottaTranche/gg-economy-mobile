# Requirements Document

## Introduction

This feature adds a "Planos Futuros" (Future Plans) screen as a new tab in the footer navigation. The screen allows users to visualize their monthly savings capacity through two key metrics: a projected savings goal and the actual realized savings. Users can create named fund allocation slots (e.g., travel, retirement, emergency fund) to distribute their savings. Fund balances accumulate over months and can be managed via a configuration screen. Manual transactions can be linked to funds, with those expenses subtracted from fund balances and displayed separately on the Dashboard summary. The feature integrates with the existing recurring transactions system and enforces a temporal constraint where only transactions with a current or future reference month count toward fund deductions.

## Glossary

- **Future_Plans_Screen**: The new tab screen in the footer navigation that displays savings metrics and fund allocation management for the selected month.
- **Monthly_Income**: A user-configurable monetary value representing the total expected income for the month, stored in user preferences (not necessarily the sum of income transactions).
- **Savings_Goal**: A calculated value representing the projected amount available to save: Monthly_Income minus total paid expenses minus total pending expenses minus remaining variable expectation. The remaining variable expectation is `max(0, General_Variable_Goal - actual_variable_spending)` representing the anticipated spending that has not yet occurred.
- **Actual_Savings**: A calculated value representing the realized savings amount: total received income minus total paid expenses minus total spent on variable expenses.
- **Fund**: A user-created allocation slot with a name, accumulated balance, and monthly allocation amount. Examples: travel, retirement, emergency fund.
- **Fund_Allocation**: The monthly amount assigned to a specific Fund from the Savings_Goal. The sum of all fund allocations reduces the remaining distributable savings.
- **Fund_Balance**: The total accumulated amount for a Fund, composed of the configured base balance plus the sum of monthly allocations minus linked transaction deductions.
- **Linked_Transaction**: A transaction that has been associated with a specific Fund. The transaction amount is subtracted from the Fund_Balance and displayed separately from regular monthly totals.
- **Fund_Config_Screen**: A configuration screen where users can set Monthly_Income, create/edit/delete Funds, and set the accumulated base balance for each Fund.
- **Reference_Month_Constraint**: The rule that only Linked_Transactions with a reference month equal to or less than the current month count toward Fund_Balance deductions. Future-dated transactions are listed but excluded from the sum.
- **Variable_Expense_Expectation**: The remaining expected variable spending for the Savings_Goal calculation: `max(0, General_Variable_Goal - actual_variable_spending)`. When actual variable spending equals or exceeds the goal, the expectation is zero (all anticipated variable spending already occurred).

## Requirements

### Requirement 1: Future Plans Tab Navigation

**User Story:** As a user, I want a "Planos Futuros" tab in the footer navigation, so that I can quickly access my savings plan and fund allocation screen.

#### Acceptance Criteria

1. THE app SHALL display a "Planos Futuros" tab in the bottom navigation bar as the fourth tab (between Manual and Settings).
2. WHEN the user taps the "Planos Futuros" tab, THE app SHALL navigate to the Future_Plans_Screen.
3. THE "Planos Futuros" tab SHALL display a localized label ("Planos" in pt-BR, "Plans" in en) and an icon consistent with the existing tab bar style.
4. THE "Planos Futuros" tab SHALL use theme colors from the `useThemeColors` hook for active and inactive states, matching the existing tab styling pattern.
5. THE tab bar layout SHALL accommodate the additional tab without text truncation on screen widths of 320dp or greater.

### Requirement 2: Monthly Income Configuration

**User Story:** As a user, I want to configure my expected monthly income independently of actual income transactions, so that my savings projections reflect my real earning expectations.

#### Acceptance Criteria

1. THE Fund_Config_Screen SHALL provide an input field to set the Monthly_Income as a positive monetary value between 0.01 and 999,999,999.99.
2. WHEN the user saves a Monthly_Income value, THE system SHALL persist the value in the `user_preferences` table with the key `monthly_income`.
3. IF the Monthly_Income is not configured, THEN THE Future_Plans_Screen SHALL display a prompt directing the user to configure the value in the Fund_Config_Screen.
4. THE Fund_Config_Screen SHALL allow the user to edit the Monthly_Income value at any time.
5. WHEN the user enters a value outside the accepted range or a non-numeric value, THE system SHALL display an inline validation message and not persist the invalid value.
6. THE Future_Plans_Screen SHALL display the configured Monthly_Income value at the top of the screen formatted as currency according to the current locale.

### Requirement 3: Savings Goal Calculation

**User Story:** As a user, I want to see my projected savings goal for the month, so that I know how much I can potentially allocate to my funds.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL display the Savings_Goal value prominently for the selected month.
2. THE system SHALL calculate Savings_Goal as: Monthly_Income - Total_Paid_Expenses - Total_Pending_Expenses - Variable_Expense_Expectation, where Total_Paid_Expenses and Total_Pending_Expenses already include variable expense amounts.
3. THE Variable_Expense_Expectation SHALL equal `max(0, General_Variable_Goal - actual_variable_spending)`, representing the remaining anticipated variable spending that has not yet occurred.
4. WHEN actual variable spending equals or exceeds the General_Variable_Goal, THE Variable_Expense_Expectation SHALL be zero.
5. IF no General_Variable_Goal is configured, THEN THE Variable_Expense_Expectation SHALL be zero (no additional anticipated spending beyond what is already counted in paid/pending).
6. THE Savings_Goal SHALL accept negative values (displayed with a minus sign) to indicate that expenses exceed income.
7. THE Future_Plans_Screen SHALL format the Savings_Goal as currency according to the current locale.
8. WHEN any transaction affecting the selected month is added, edited, or deleted, THE Future_Plans_Screen SHALL recalculate and update the Savings_Goal.
9. Linked_Transactions (transactions with a Fund association) that have `isExcludedFromTotals = true` SHALL NOT be included in Total_Paid_Expenses or Total_Pending_Expenses for the Savings_Goal calculation. Transactions with no Fund association SHALL count normally in totals.

### Requirement 4: Actual Savings Calculation

**User Story:** As a user, I want to see how much I am actually saving this month, so that I can compare my real savings with the projected goal.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL display the Actual_Savings value alongside the Savings_Goal for the selected month.
2. THE system SHALL calculate Actual_Savings as: Total_Received_Income - Total_Paid_Expenses (which already includes paid variable expenses).
3. Total_Received_Income SHALL include only income transactions that are marked as paid (isPaid = true) for the selected reference month.
4. Total_Paid_Expenses SHALL include all expense transactions (both fixed and variable) that are marked as paid (isPaid = true) for the selected reference month, excluding Linked_Transactions (those with `isExcludedFromTotals = true`).
5. THE Actual_Savings SHALL accept negative values to indicate that paid expenses exceed received income.
6. THE Future_Plans_Screen SHALL format the Actual_Savings as currency according to the current locale.
7. THE Future_Plans_Screen SHALL visually distinguish the Savings_Goal and Actual_Savings using different labels and styling so users can identify each metric without ambiguity.

### Requirement 5: Fund Creation and Management

**User Story:** As a user, I want to create named fund allocation slots, so that I can plan how to distribute my savings across different goals.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL display a list of all active Funds created by the user.
2. THE Future_Plans_Screen SHALL provide an option to create a new Fund by specifying a name (1-50 characters).
3. WHEN the user creates a Fund, THE system SHALL persist the Fund record in a new `funds` SQLite table with columns: `id` (text primary key), `name` (text, not null), `icon` (text, optional), `color` (text, optional), `is_active` (integer boolean, default true), `created_at` (text, ISO 8601), `updated_at` (text, ISO 8601).
4. THE Fund_Config_Screen SHALL allow the user to edit the name, icon, and color of an existing Fund.
5. THE Fund_Config_Screen SHALL allow the user to deactivate (soft-delete) a Fund, hiding it from the Future_Plans_Screen list while preserving historical data.
6. IF a Fund name is empty or exceeds 50 characters, THEN THE system SHALL display an inline validation message and not persist the invalid value.
7. THE Future_Plans_Screen SHALL display each Fund with its name, icon (if set), color indicator (if set), monthly allocation, and current accumulated balance.

### Requirement 6: Monthly Fund Allocation

**User Story:** As a user, I want to allocate a portion of my monthly savings to each fund, so that I can distribute my savings goal across different future plans.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL provide an input for each Fund to set a monthly Fund_Allocation amount for the selected month.
2. WHEN the user sets a Fund_Allocation, THE system SHALL persist the value in a `fund_allocations` table with columns: `id` (text primary key), `fund_id` (text, foreign key to funds), `reference_month` (text, YYYY-MM format), `amount` (real, in cents, must be greater than zero), `created_at` (text, ISO 8601), `updated_at` (text, ISO 8601).
3. THE Future_Plans_Screen SHALL display the remaining distributable amount: Savings_Goal minus the sum of all Fund_Allocations for the selected month.
4. WHEN the sum of Fund_Allocations exceeds the Savings_Goal, THE remaining distributable amount SHALL display as a negative value indicating over-allocation.
5. THE system SHALL enforce a unique constraint on the combination of `fund_id` and `reference_month` in the `fund_allocations` table to prevent duplicate allocations.
6. THE Future_Plans_Screen SHALL allow the user to edit or remove a Fund_Allocation for the current month.
7. WHEN the user removes a Fund_Allocation, THE system SHALL delete the corresponding row from the `fund_allocations` table.

### Requirement 7: Fund Balance Accumulation

**User Story:** As a user, I want my fund balances to accumulate over time combining monthly allocations and a configurable base, so that I can track the total amount saved toward each goal.

#### Acceptance Criteria

1. THE Fund_Config_Screen SHALL provide an input field for each Fund to set a base Fund_Balance representing previously accumulated savings (before using this feature).
2. WHEN the user sets a base Fund_Balance, THE system SHALL persist the value in a `fund_balances` table with columns: `id` (text primary key), `fund_id` (text, foreign key to funds, unique), `base_amount` (real, in cents, must be zero or greater), `updated_at` (text, ISO 8601).
3. THE system SHALL calculate the total Fund_Balance as: base_amount + sum of all Fund_Allocations for the Fund (across all months) - sum of all Linked_Transaction amounts for the Fund (respecting the Reference_Month_Constraint).
4. THE Future_Plans_Screen SHALL display the total Fund_Balance for each Fund formatted as currency.
5. THE Fund_Config_Screen SHALL allow the user to edit the base Fund_Balance at any time.
6. WHEN a Fund is deactivated, THE system SHALL retain all associated Fund_Balance and Fund_Allocation records.

### Requirement 8: Linking Transactions to Funds

**User Story:** As a user, I want to link manual transactions to a fund so that the expense is subtracted from the fund balance instead of counting in my regular monthly totals.

#### Acceptance Criteria

1. WHEN creating or editing a transaction (including from the transaction detail/edit screen), THE system SHALL provide an optional Fund selector allowing the user to link the transaction to an active Fund.
2. WHEN a transaction is linked to a Fund, THE system SHALL store the association in a `fund_transactions` table with columns: `id` (text primary key), `fund_id` (text, foreign key to funds), `transaction_id` (text, foreign key to transactions, unique), `created_at` (text, ISO 8601).
3. WHEN a transaction is linked to a Fund, THE system SHALL set the transaction's `isExcludedFromTotals` flag to true, excluding it from regular monthly expense calculations.
4. THE Future_Plans_Screen SHALL display all Linked_Transactions for a selected Fund, regardless of their reference month.
5. WHEN displaying Linked_Transactions, THE system SHALL show the transaction title, amount, date, and reference month.
6. THE system SHALL allow the user to unlink a transaction from a Fund (via the transaction detail/edit screen or the Future_Plans_Screen), removing the `fund_transactions` record and setting `isExcludedFromTotals` back to false.
7. THE system SHALL support linking both manually created transactions and recurring-generated transactions to Funds.
8. THE transaction detail/edit screen SHALL display the currently linked Fund name (if any) and allow the user to change or remove the Fund association.

### Requirement 9: Reference Month Constraint for Fund Deductions

**User Story:** As a user, I want fund deductions to only count for the current or past months, so that future-dated transactions do not prematurely reduce my fund balances.

#### Acceptance Criteria

1. WHEN calculating Fund_Balance deductions, THE system SHALL include only Linked_Transactions whose reference month is equal to or less than the current calendar month.
2. THE Future_Plans_Screen SHALL list all Linked_Transactions for a Fund regardless of their reference month for visibility purposes.
3. WHEN displaying Linked_Transactions with a future reference month, THE Future_Plans_Screen SHALL visually indicate that the transaction is not counted in the current balance (e.g., muted styling with a label such as "futuro" / "future").
4. WHEN a new month begins and a previously-future Linked_Transaction's reference month becomes current, THE system SHALL start including that transaction in Fund_Balance deductions.
5. THE system SHALL use the device's current date to determine the current calendar month for the Reference_Month_Constraint evaluation.

### Requirement 10: Dashboard Fund Expense Summary

**User Story:** As a user, I want to see the total fund-linked expenses for the month on the Dashboard, so that I am aware of fund spending without it affecting my regular monthly totals.

#### Acceptance Criteria

1. WHEN one or more Linked_Transactions exist for the selected month, THE Dashboard_Screen SHALL display a summary element showing the total fund-linked expense amount for that month.
2. THE Dashboard fund expense summary SHALL display the total as a formatted currency value with a localized label (e.g., "Gastos de fundos: R$ X" in pt-BR, "Fund expenses: $X" in en).
3. THE Dashboard fund expense summary SHALL NOT add the fund-linked expense total to the regular monthly expense sum (paid or pending).
4. IF no Linked_Transactions exist for the selected month, THEN THE Dashboard_Screen SHALL NOT display the fund expense summary element.
5. THE Dashboard fund expense summary SHALL be positioned as a small link or text element within the summary area, visually subordinate to the main expense totals.
6. WHEN the user taps the fund expense summary element, THE app SHALL navigate to the Future_Plans_Screen.

### Requirement 11: Recurring Transaction Integration

**User Story:** As a user, I want to link recurring transactions to funds, so that recurring expenses like investment contributions are automatically tracked as fund deductions.

#### Acceptance Criteria

1. WHEN a recurring transaction generates a new transaction instance, THE system SHALL check if the recurring transaction has a linked Fund association.
2. IF a recurring transaction has a Fund association, THEN THE system SHALL automatically link the generated transaction to the same Fund and set `isExcludedFromTotals` to true.
3. THE system SHALL store recurring-to-fund associations in a `recurring_fund_links` table with columns: `id` (text primary key), `recurring_id` (text, foreign key to recurring_transactions, unique), `fund_id` (text, foreign key to funds), `created_at` (text, ISO 8601).
4. WHEN configuring a recurring transaction, THE system SHALL provide an optional Fund selector to associate the recurring transaction with a Fund.
5. WHEN the user removes a Fund association from a recurring transaction, THE system SHALL delete the `recurring_fund_links` record but SHALL NOT unlink previously generated transactions.
6. THE system SHALL support Fund association for both monthly recurring transactions and weekly recurring groups.

### Requirement 12: Data Persistence and Schema

**User Story:** As a user, I want all fund-related data stored reliably on my device, so that my savings plan persists between app sessions.

#### Acceptance Criteria

1. THE system SHALL create the `funds` table via a versioned database migration following the project's existing Drizzle ORM migration pattern.
2. THE system SHALL create the `fund_allocations` table with a composite unique index on (`fund_id`, `reference_month`).
3. THE system SHALL create the `fund_balances` table with a unique constraint on `fund_id`.
4. THE system SHALL create the `fund_transactions` table with a unique constraint on `transaction_id` and a foreign key to both `funds` and `transactions` tables.
5. THE system SHALL create the `recurring_fund_links` table with a unique constraint on `recurring_id` and foreign keys to both `recurring_transactions` and `funds` tables.
6. WHEN a Fund is deleted (hard-delete from config), THE system SHALL cascade-delete all associated records in `fund_allocations`, `fund_balances`, `fund_transactions`, and `recurring_fund_links` via ON DELETE CASCADE constraints.
7. WHEN a transaction is deleted, THE system SHALL cascade-delete the associated `fund_transactions` record via ON DELETE CASCADE.
8. THE system SHALL store all monetary values in cents (real type) consistent with the existing schema convention.

### Requirement 13: Month Navigation on Future Plans Screen

**User Story:** As a user, I want to navigate between months on the Future Plans screen, so that I can review past allocations and plan future months.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL include a month selector component matching the Dashboard's MonthSelector pattern.
2. WHEN the user navigates to a different month, THE Future_Plans_Screen SHALL update the Savings_Goal, Actual_Savings, Fund_Allocations, and remaining distributable amount for the selected month.
3. THE Future_Plans_Screen SHALL allow navigation to past and future months without restriction.
4. THE Fund_Balance display SHALL always reflect the current accumulated total (not a month-specific snapshot).

### Requirement 14: Internationalization

**User Story:** As a user, I want the Future Plans feature to be fully localized, so that it works consistently in both Portuguese and English.

#### Acceptance Criteria

1. THE system SHALL provide translation keys in both pt-BR and en locale files for all static text labels (tab label, screen title, metric labels, fund management labels, validation messages, dashboard summary text).
2. THE system SHALL format all monetary values according to the current locale using the existing `formatCurrencyLocale` utility.
3. THE "Planos Futuros" tab label SHALL use localized text: "Planos" in pt-BR, "Plans" in en.
4. THE Savings_Goal label SHALL use localized text: "Meta de economia" in pt-BR, "Savings goal" in en.
5. THE Actual_Savings label SHALL use localized text: "Guardando" in pt-BR, "Saving" in en.
6. THE remaining distributable label SHALL use localized text: "Restante" in pt-BR, "Remaining" in en.

### Requirement 15: Theme and Visual Consistency

**User Story:** As a user, I want the Future Plans UI to match the app's existing visual style, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Future_Plans_Screen SHALL apply all color values exclusively from the `useThemeColors` hook, using no hardcoded color literals, so that both light and dark themes render correctly.
2. THE Future_Plans_Screen SHALL use the `PressableCard` component pattern for Fund cards, matching the styling conventions of other screens.
3. THE Savings_Goal and Actual_Savings metrics SHALL be displayed in a card with elevated styling (lg shadow in light mode, border in dark mode) matching the Dashboard's SummaryCard pattern.
4. THE Fund_Config_Screen SHALL follow the same layout patterns as the existing Budget_Goals configuration screen (inputs with category icons, auto-save behavior).
5. WHEN the Savings_Goal is negative, THE Future_Plans_Screen SHALL display the value using the theme's `status.error` color to indicate over-spending.
6. WHEN the remaining distributable amount is negative, THE Future_Plans_Screen SHALL display the value using the theme's `status.warning` color to indicate over-allocation.
