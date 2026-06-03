# Requirements Document

## Introduction

This feature adds the ability to set budget goals (metas) for variable expenses. Users can configure a general budget goal for all variable costs combined and/or individual goals per variable expense category through the Settings screen. These goals are displayed on the Dashboard alongside the actual registered values in the Variável collapsible section, serving as suggestion values (not hard limits) to help users track their spending relative to their intentions. Goals are optional — some categories can have them while others do not.

## Glossary

- **Budget_Goal**: A monetary value representing the user's intended maximum spending for a variable expense category or the variable expenses as a whole. Budget goals are advisory suggestions, not enforced limits.
- **General_Variable_Goal**: A single budget goal that applies to the total of all variable expenses combined for a given month.
- **Category_Variable_Goal**: A budget goal that applies to a specific variable expense category for a given month.
- **Dashboard_Screen**: The main tab screen that displays financial overview with category breakdowns grouped by expense type (Fixo/Variável).
- **Settings_Screen**: The app's settings screen where users manage preferences, categories, and configuration.
- **CollapsibleSection**: The dashboard component that displays categories grouped by expense type (Fixo or Variável) with expandable rows showing category name, amount, and percentage.
- **Category**: A classification entity with id, name, type, icon, color, and expense group (fixed/variable) stored in the `categories` table.
- **Variable_Category**: A category with `expense_group = 'variable'` that classifies variable expense transactions.
- **Suggestion_Indicator**: A visual element that communicates to the user that a budget goal value is a non-binding suggestion rather than a hard spending limit.
- **Expected_Future_Spending**: A calculated value representing the sum of remaining budget for all variable categories that have goals configured. For each category: `max(0, goal - actual_spending)`. Categories without goals or whose spending exceeds their goal contribute zero.

## Requirements

### Requirement 1: General Variable Expense Goal Configuration

**User Story:** As a user, I want to set a general budget goal for all my variable expenses combined, so that I can track my total variable spending against my intended budget.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide an option to configure a General_Variable_Goal as a positive monetary value between 0.01 and 999,999,999.99 in the app's currency.
2. WHEN the user sets a General_Variable_Goal, THE system SHALL persist the value locally using the existing `user_preferences` table with a dedicated key.
3. WHEN the user has not configured a General_Variable_Goal, THE system SHALL treat the goal as absent (not zero) and display no goal information for the variable total.
4. THE Settings_Screen SHALL allow the user to edit an existing General_Variable_Goal value at any time.
5. THE Settings_Screen SHALL allow the user to remove (clear) a previously set General_Variable_Goal, returning the system to the "no goal configured" state.
6. THE Settings_Screen SHALL display the General_Variable_Goal input with a localized label that explicitly references the total of all variable expenses (e.g., "Meta total de gastos variáveis" in pt-BR, "Total variable expense goal" in en).
7. WHEN the user successfully saves, edits, or removes a General_Variable_Goal, THE system SHALL display a brief confirmation feedback indicating the operation was completed.
8. IF the user enters a value outside the accepted range (less than 0.01 or greater than 999,999,999.99), THEN THE system SHALL display an inline validation message and not persist the value.

### Requirement 2: Per-Category Variable Expense Goal Configuration

**User Story:** As a user, I want to set individual budget goals for specific variable expense categories, so that I can track spending per category against my intended budget for each.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide an option to configure a Category_Variable_Goal for each active Variable_Category.
2. WHEN the user sets a Category_Variable_Goal for a specific Variable_Category, THE system SHALL persist the value locally in the `category_goals` table linking the category ID to the goal amount.
3. IF the user has not configured a Category_Variable_Goal for a Variable_Category, THEN THE system SHALL treat the goal as absent and display no goal value or goal-related element for that category on the Dashboard.
4. THE Settings_Screen SHALL allow the user to edit an existing Category_Variable_Goal value and SHALL persist the updated value upon confirmation without requiring app restart or screen reload.
5. THE Settings_Screen SHALL allow the user to remove (clear) a previously set Category_Variable_Goal, deleting the stored record and returning that category to the "no goal configured" state.
6. THE Settings_Screen SHALL display the list of active Variable_Categories with their current goal values displayed in the input field, or an empty input field with a placeholder indicating no goal is set, allowing the user to selectively configure goals for any subset.
7. THE Settings_Screen SHALL accept Category_Variable_Goal values only within the range of 0.01 to 999,999,999.99 (in the app's currency unit), rejecting values outside this range with an inline validation message.

### Requirement 3: Dashboard Display of General Variable Goal

**User Story:** As a user, I want to see my general variable expense goal on the Dashboard alongside the actual total, so that I can quickly assess how my total variable spending compares to my budget intention.

#### Acceptance Criteria

1. WHEN a General_Variable_Goal is configured, THE Dashboard_Screen SHALL display the goal value in the Variável CollapsibleSection header, adjacent to the actual total amount.
2. THE Dashboard_Screen SHALL display the General_Variable_Goal formatted as currency according to the current locale using the existing `formatCurrencyLocale` utility.
3. THE Dashboard_Screen SHALL include a Suggestion_Indicator (e.g., a label such as "meta" or an icon) next to the General_Variable_Goal to communicate that the value is a suggestion, not a limit.
4. IF a General_Variable_Goal is not configured, THEN THE Dashboard_Screen SHALL display only the actual variable total without any goal reference and without rendering an empty goal placeholder or reserved space.
5. THE Dashboard_Screen SHALL visually distinguish the General_Variable_Goal from the actual total value by rendering the goal in a muted or secondary text color from the theme, so that users can differentiate between registered spending and the goal without relying on the label alone.

### Requirement 4: Dashboard Display of Per-Category Variable Goals

**User Story:** As a user, I want to see individual category goals alongside each category's actual amount on the Dashboard, so that I can assess per-category spending relative to my intention.

#### Acceptance Criteria

1. WHEN a Category_Variable_Goal is configured for a Variable_Category, THE Dashboard_Screen SHALL display the goal value in the category row within the Variável CollapsibleSection, adjacent to the actual category amount.
2. THE Dashboard_Screen SHALL display each Category_Variable_Goal formatted as currency according to the current locale.
3. THE Dashboard_Screen SHALL include a Suggestion_Indicator next to each displayed Category_Variable_Goal to communicate that the value is a suggestion, not a limit.
4. IF a Category_Variable_Goal is not configured for a Variable_Category, THEN THE Dashboard_Screen SHALL display only the actual category amount without any goal element, placeholder, or separator for that category.
5. IF a Variable_Category has a Category_Variable_Goal configured but has zero actual spending, THEN THE Dashboard_Screen SHALL display the goal value alongside the actual amount formatted as the locale-equivalent of zero (e.g., "R$ 0,00").
6. THE Dashboard_Screen SHALL visually distinguish Category_Variable_Goals from actual category amounts (e.g., smaller font, muted color, or a "/ meta" separator) so users can differentiate between registered spending and the goal.
7. THE layout of category rows with goals SHALL display both the actual amount and the goal value without text truncation or overflow on screen widths of 320dp or greater, for goal values up to the equivalent of 999,999.99 in the user's currency.
8. THE category row layout SHALL maintain a minimum text size of 10sp for the goal value to ensure legibility on minimum supported screen widths (320dp).

### Requirement 5: Goal Values Are Suggestions Only

**User Story:** As a user, I want budget goals to clearly be non-binding suggestions, so that I do not feel restricted or alarmed when my spending exceeds a goal.

#### Acceptance Criteria

1. THE system SHALL NOT block, warn with alerts, or prevent any transaction when spending exceeds a Budget_Goal value.
2. IF actual spending exceeds a Budget_Goal, THEN THE Dashboard_Screen SHALL NOT use red color, warning icons, exclamation marks, or flashing indicators to represent the exceeded state.
3. WHEN actual spending exceeds a Category_Variable_Goal or General_Variable_Goal, THE Dashboard_Screen SHALL continue displaying both the actual spending value and the goal value using the same neutral styling applied to non-exceeded goals.
4. THE Settings_Screen SHALL display an explanatory text of at most 150 characters within the goal configuration area stating that goals are suggestion values for personal reference only.
5. IF actual spending exceeds a Budget_Goal, THEN THE system SHALL NOT trigger push notifications, in-app alerts, or any automated user notification about the exceedance.

### Requirement 6: Data Persistence and Schema

**User Story:** As a user, I want my budget goals to be stored reliably on my device, so that they persist between app sessions.

#### Acceptance Criteria

1. THE system SHALL store Category_Variable_Goals in a new `category_goals` SQLite table with columns: `id` (text primary key), `category_id` (text, foreign key to categories), `amount` (real, the goal value in cents, must be greater than zero), `created_at` (text, ISO 8601 datetime defaulting to current time), and `updated_at` (text, ISO 8601 datetime defaulting to current time).
2. THE system SHALL store the General_Variable_Goal in the existing `user_preferences` table using the key `general_variable_goal` with the value stored as a string representation of the amount in cents (must be greater than zero).
3. WHEN the user removes the General_Variable_Goal, THE system SHALL delete the `general_variable_goal` row from the `user_preferences` table so that absence of the row indicates no goal is configured.
4. THE system SHALL create the `category_goals` table via a versioned database migration following the project's existing migration pattern.
5. WHEN a category is deleted, THE system SHALL cascade-delete any associated Category_Variable_Goal record via an `ON DELETE CASCADE` foreign key constraint on the `category_id` column.
6. THE system SHALL enforce a unique constraint on `category_id` in the `category_goals` table to prevent duplicate goals for the same category.
7. WHEN the user removes a Category_Variable_Goal, THE system SHALL delete the corresponding row from the `category_goals` table so that absence of the row indicates no goal is configured for that category.

### Requirement 7: Settings Screen Navigation and Layout

**User Story:** As a user, I want to access variable expense goal configuration from Settings in an intuitive way, so that I can easily find and manage my budget goals.

#### Acceptance Criteria

1. THE Settings_Screen SHALL include a navigation item labeled with a term equivalent to "Metas de Gastos Variáveis" (localized) that opens the goal configuration screen.
2. WHEN the user taps the budget goals settings item, THE app SHALL navigate to a dedicated Budget_Goals configuration screen.
3. THE Budget_Goals configuration screen SHALL display the General_Variable_Goal input at the top, followed by the list of Variable_Categories with their individual goal inputs below.
4. THE Budget_Goals configuration screen SHALL display each Variable_Category with its icon, color indicator, and name alongside its goal input field.
5. THE Budget_Goals configuration screen SHALL accept only valid numeric monetary values greater than zero and up to 9,999,999.99 with at most 2 decimal places for goal inputs.
6. IF the user enters an invalid value (negative, non-numeric, zero, or exceeding 9,999,999.99), THEN THE system SHALL display an inline validation message and not persist the invalid value.
7. WHEN the user enters a valid goal value in an input field, THE system SHALL persist the value automatically without requiring an explicit save action.
8. WHEN the user clears a goal input field (leaves it empty), THE system SHALL remove the previously stored goal for that category or general goal, returning it to the "no goal configured" state.
9. THE Budget_Goals configuration screen SHALL display Variable_Categories in alphabetical order by name.

### Requirement 8: Internationalization

**User Story:** As a user, I want the budget goals feature to be fully localized, so that it works consistently in both Portuguese and English.

#### Acceptance Criteria

1. THE system SHALL provide translation keys in both pt-BR and en locale files for all static text labels related to budget goals (settings menu item, configuration screen labels, suggestion indicators, expected future spending label, explanatory text, validation messages).
2. THE system SHALL format all Budget_Goal and Expected_Future_Spending currency values according to the current locale using the existing `formatCurrencyLocale` utility.
3. WHEN the user changes the app language in Settings, THE Settings_Screen goal configuration labels SHALL update to display in the newly selected language (pt-BR or en) without requiring an app restart.
4. THE Dashboard_Screen Suggestion_Indicators SHALL use localized text from translation keys (e.g., "meta" in pt-BR, "goal" in en).
5. THE Dashboard_Screen Expected_Future_Spending label SHALL use localized text from translation keys (e.g., "expectativa" in pt-BR, "expected" in en).
6. IF a budget goal validation fails, THEN THE system SHALL display the corresponding validation error message in the current active locale.
7. THE system SHALL display budget goal numeric input placeholders and formatting hints according to the current locale (e.g., "1.000,00" for pt-BR, "1,000.00" for en).

### Requirement 9: Theme and Visual Consistency

**User Story:** As a user, I want the budget goals UI to match the app's existing visual style, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Budget_Goals configuration screen SHALL apply all color values exclusively from the `useThemeColors` hook, using no hardcoded color literals, so that both light and dark themes render correctly when the resolved scheme changes.
2. THE Dashboard goal display elements SHALL render goal values using the `text.tertiary` color token from the current theme to visually subordinate them below actual values displayed in `text.primary`.
3. THE Budget_Goals configuration screen SHALL use the `PressableCard` component with `variant="secondary"` (borderRadius 12px, shadow sm in light mode, 1px border in dark mode) and `spacing.base` (16px) internal padding, matching the card pattern used by other configuration screens.
4. IF a budget goal is configured for a category, THEN THE Dashboard goal display elements SHALL set an `accessibilityLabel` that includes both the formatted actual value and the formatted goal value (e.g., "Expenses: R$ 1.200,00 of goal R$ 2.000,00").
5. IF no budget goal is configured for a category, THEN THE Dashboard goal display elements SHALL set an `accessibilityLabel` that includes only the formatted actual value without referencing a goal.

### Requirement 10: Expected Future Spending Display

**User Story:** As a user, I want to see an estimate of my expected future variable spending on the Dashboard header, so that I can understand how much more I anticipate spending based on my category goals.

#### Acceptance Criteria

1. THE Dashboard_Screen SHALL display an Expected_Future_Spending value in the Variável CollapsibleSection header, positioned between the actual total spent and the General_Variable_Goal.
2. THE Expected_Future_Spending SHALL be calculated as the sum of `max(0, Category_Variable_Goal - actual_category_spending)` for each Variable_Category that has a configured Category_Variable_Goal.
3. IF a Variable_Category's actual spending exceeds its Category_Variable_Goal, THEN THE system SHALL contribute zero (not a negative value) for that category to the Expected_Future_Spending sum.
4. IF a Variable_Category has no Category_Variable_Goal configured, THEN THE system SHALL exclude that category from the Expected_Future_Spending calculation entirely (contributes nothing).
5. IF no Variable_Categories have configured Category_Variable_Goals, THEN THE Dashboard_Screen SHALL display zero as the Expected_Future_Spending value.
6. IF a Variable_Category has a Category_Variable_Goal configured but has zero actual spending, THEN THE system SHALL contribute the full Category_Variable_Goal amount to the Expected_Future_Spending sum.
7. THE Dashboard_Screen SHALL display the Expected_Future_Spending formatted as currency with two decimal places according to the current locale (pt-BR or en).
8. THE Dashboard_Screen SHALL display the Expected_Future_Spending with a distinct label and secondary text styling (smaller font size or reduced opacity compared to the actual total) so that a tester can visually confirm it is not the primary spent value.
9. THE Dashboard_Screen SHALL display a localized label adjacent to the Expected_Future_Spending value: "expectativa" in pt-BR, "expected" in en.
10. WHEN a transaction is added, edited, or deleted affecting a Variable_Category, THE Dashboard_Screen SHALL recalculate and update the Expected_Future_Spending value before the user's next interaction with the Dashboard.
