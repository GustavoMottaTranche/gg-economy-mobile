# Requirements Document

## Introduction

When the user taps a category on the Dashboard screen (within the Fixo or Variável collapsible sections), the app opens a Category Detail Screen that shows all the transactions contributing to that category's total for the selected month. This provides drill-down visibility into how a category sum is composed, enabling the user to quickly understand where their money is going within each category.

## Glossary

- **Dashboard_Screen**: The main tab screen (`app/(tabs)/index.tsx`) that displays financial overview with category breakdowns grouped by expense type (Fixo/Variável).
- **Category_Detail_Screen**: A new screen that displays all transactions belonging to a specific category for a given reference month, including weekly recurring occurrences.
- **Transaction**: A financial record with title, date, amount (in cents), description, category, origin, and reference month stored in the `transactions` table.
- **Weekly_Occurrence**: A weekly recurring expense occurrence stored in `weekly_occurrences`, linked to a `weekly_recurring_groups` entry with a category.
- **Category**: A classification entity with id, name, type (income/expense), icon, color, and expense group (fixed/variable) stored in the `categories` table.
- **CollapsibleSection**: The existing dashboard component that displays categories grouped by expense type (Fixo or Variável) with expandable rows.
- **Category_Breakdown_Item**: The data structure returned by `useDashboardData` containing categoryId, categoryName, categoryColor, categoryIcon, expenseGroup, total, count, and percentage.
- **Reference_Month**: The month in YYYY-MM format used to scope transactions and occurrences.

## Requirements

### Requirement 1: Navigation from Dashboard to Category Detail

**User Story:** As a user, I want to tap a category on the Dashboard screen and be taken to a detail screen, so that I can see what transactions make up that category's total.

#### Acceptance Criteria

1. WHEN the user taps a category row within the CollapsibleSection on the Dashboard_Screen, THE app SHALL navigate to the Category_Detail_Screen passing the category ID and the currently selected Reference_Month as route parameters.
2. THE Category_Detail_Screen SHALL be registered as a route in the Expo Router file-based routing system (e.g., `app/category/[id].tsx`).
3. WHEN the Category_Detail_Screen is opened, THE app SHALL display a back navigation button that returns the user to the Dashboard_Screen.
4. THE navigation to Category_Detail_Screen SHALL complete within 300ms of the user tap to maintain a responsive feel.

### Requirement 2: Category Detail Screen Header

**User Story:** As a user, I want to see the category name, icon, color, and total at the top of the detail screen, so that I immediately know which category I am inspecting.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL display the category icon and name in the screen header area using the category's defined color as accent.
2. THE Category_Detail_Screen SHALL display the total sum for the category in the selected Reference_Month, formatted according to the current locale (BRL for pt-BR, USD for en).
3. THE Category_Detail_Screen SHALL display the Reference_Month formatted as a readable label (e.g., "Janeiro 2025" for pt-BR, "January 2025" for en).
4. THE Category_Detail_Screen SHALL display the transaction count (number of items contributing to the total).
5. IF the category has an expense group classification, THEN THE Category_Detail_Screen SHALL display a badge indicating "Fixo" or "Variável".

### Requirement 3: Transaction List Display

**User Story:** As a user, I want to see all transactions for the selected category and month in a list, so that I can understand each individual contribution to the total.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL display a list of all transactions belonging to the specified category for the selected Reference_Month, ordered by date descending.
2. THE Category_Detail_Screen SHALL display each transaction item showing the title, date (formatted according to locale), and amount (formatted as currency according to locale).
3. THE Category_Detail_Screen SHALL include weekly recurring occurrences that belong to the same category for the selected Reference_Month in the transaction list.
4. THE Category_Detail_Screen SHALL visually distinguish weekly recurring occurrences from regular transactions using a subtle indicator (e.g., a recurring icon or label).
5. WHEN the combined list of transactions and weekly occurrences is empty, THE Category_Detail_Screen SHALL display an empty state message indicating no transactions exist for this category in the selected month.
6. THE Category_Detail_Screen SHALL use a FlatList (or FlashList if already used in the project) for the transaction list to ensure performant rendering.

### Requirement 4: Transaction Item Interaction

**User Story:** As a user, I want to tap a transaction in the category detail list to see its full details, so that I can review or edit it.

#### Acceptance Criteria

1. WHEN the user taps a regular transaction item in the list, THE Category_Detail_Screen SHALL navigate to the existing transaction detail screen (`app/transaction/[id].tsx`) passing the transaction ID.
2. WHEN the user taps a weekly occurrence item in the list, THE Category_Detail_Screen SHALL navigate to the existing weekly recurring detail screen (`app/weekly-recurring/[id].tsx`) passing the weekly group ID.
3. WHEN the user returns from the transaction or weekly recurring detail screen, THE Category_Detail_Screen SHALL refresh its data to reflect any changes made (e.g., amount edited, category changed, transaction deleted).

### Requirement 5: Data Consistency

**User Story:** As a user, I want the category detail screen totals to match the dashboard, so that I can trust the numbers are accurate.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL exclude transactions marked as `isExcludedFromTotals = true` from the displayed list and total calculation.
2. THE Category_Detail_Screen SHALL apply the same payment status filter as the Dashboard_Screen: include transactions where `isPaid = 1` OR `recurringId IS NULL`.
3. THE Category_Detail_Screen SHALL only include weekly occurrences marked as `isPaid = true` in the list and total calculation.
4. THE sum of all displayed item amounts on the Category_Detail_Screen SHALL equal the total shown for that category on the Dashboard_Screen for the same Reference_Month.

### Requirement 6: Visual Design and Theming

**User Story:** As a user, I want the category detail screen to match the app's visual style, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL support both light and dark themes using the existing `useThemeColors` hook and theme constants (spacing, borderRadius, shadows, typography).
2. THE Category_Detail_Screen SHALL use the category's color as an accent element in the header (e.g., icon background tint or top border).
3. THE Category_Detail_Screen SHALL use consistent card styling, spacing, and elevation matching the patterns used in the Dashboard_Screen and Statement_Screen.
4. THE Category_Detail_Screen SHALL maintain accessibility attributes (accessibilityRole, accessibilityLabel) on all interactive elements.

### Requirement 7: Internationalization

**User Story:** As a user, I want the category detail screen to be available in both Portuguese and English, so that the app remains fully localized.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL display all static text labels (header, empty state, badges) using i18n translation keys.
2. THE Category_Detail_Screen SHALL format currency values according to the current locale using the existing `formatCurrencyLocale` utility.
3. THE Category_Detail_Screen SHALL format dates according to the current locale (DD/MM/YYYY for pt-BR, MM/DD/YYYY for en).
4. THE Category_Detail_Screen SHALL format the Reference_Month label according to the current locale.

### Requirement 8: Performance

**User Story:** As a user, I want the category detail screen to load quickly even with many transactions, so that the drill-down experience is seamless.

#### Acceptance Criteria

1. THE Category_Detail_Screen SHALL load and display data within 500ms of navigation for categories with up to 100 transactions.
2. THE Category_Detail_Screen SHALL use the existing database index on `category_id` (`idx_transactions_category_id`) for efficient querying.
3. WHILE data is being loaded, THE Category_Detail_Screen SHALL display a loading indicator.
4. IF the data query fails, THEN THE Category_Detail_Screen SHALL display an error state with a retry action.
