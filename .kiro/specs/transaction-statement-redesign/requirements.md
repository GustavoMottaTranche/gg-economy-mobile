# Requirements Document

## Introduction

Redesign of the transaction statement (extrato) screen and transaction detail screen in the GG Economy mobile app. The goals are to improve the visual design of both screens, allow users to edit transaction categories directly, add filtering capabilities by category and value range, and implement infinite scroll with cursor-based pagination for performant loading of large transaction lists.

## Glossary

- **Statement_Screen**: The main transactions list screen (`app/(tabs)/transactions.tsx`) that displays transactions organized by month with a monthly summary header.
- **Detail_Screen**: The transaction detail modal screen (`app/transaction/[id].tsx`) that shows full transaction information and allows editing.
- **Transaction**: A financial record with title, date, amount (in cents), description, category, origin, and reference month.
- **Category**: A classification entity with name, type (income/expense), icon, color, and expense group (fixed/variable).
- **Filter_Panel**: A collapsible UI section on the Statement_Screen that allows users to narrow down displayed transactions by category and value range.
- **Category_Filter**: A filter that restricts displayed transactions to one or more selected categories.
- **Value_Filter**: A filter that restricts displayed transactions to those within a specified minimum and maximum amount range.
- **Infinite_Scroll**: A pagination pattern where new transaction batches are loaded automatically as the user scrolls near the end of the current list.
- **Cursor**: A composite key (date + transaction ID) used for efficient cursor-based pagination queries.
- **Page_Size**: The number of transactions loaded per batch during infinite scroll (default: 20).
- **FlashList**: The high-performance list component from `@shopify/flash-list` used for rendering transaction lists.
- **Category_Selector**: The existing reusable component (`src/components/CategorySelector.tsx`) that provides cascading group and category selection.

## Requirements

### Requirement 1: Statement Screen Visual Redesign

**User Story:** As a user, I want the transaction statement screen to have an improved visual design, so that it is more pleasant and easier to read.

#### Acceptance Criteria

1. THE Statement_Screen SHALL display a redesigned header with the screen title and an add-transaction button using the existing design system tokens (typography, spacing, borderRadius, shadows).
2. THE Statement_Screen SHALL display the MonthSelector component with updated styling consistent with the new design.
3. THE Statement_Screen SHALL display the MonthlySummary card with income, expenses, and balance using color-coded values (green for income, red for expenses) and the existing semantic color tokens.
4. THE Statement_Screen SHALL display each transaction using the TransactionCard component with consistent card styling, spacing, and elevation from the design system.
5. THE Statement_Screen SHALL support both light and dark themes using the existing `useThemeColors` hook and theme constants.
6. THE Statement_Screen SHALL maintain all existing accessibility attributes (accessibilityRole, accessibilityLabel) on interactive elements.

### Requirement 2: Transaction Detail Screen Visual Redesign

**User Story:** As a user, I want the transaction detail screen to have an improved visual design, so that I can view and manage transaction information more clearly.

#### Acceptance Criteria

1. THE Detail_Screen SHALL display the transaction amount prominently at the top with color-coded formatting (green for income, red for expenses).
2. THE Detail_Screen SHALL display transaction fields (date, description, category, reference month, excluded status) in a structured card layout using the design system tokens.
3. THE Detail_Screen SHALL display action buttons (edit, delete, toggle excluded) with clear visual hierarchy and consistent styling.
4. THE Detail_Screen SHALL support both light and dark themes using the existing `useThemeColors` hook.
5. THE Detail_Screen SHALL maintain all existing accessibility attributes on interactive elements.

### Requirement 3: Editable Transaction Category

**User Story:** As a user, I want to change the category of a transaction from the detail screen, so that I can reclassify transactions for better organization.

#### Acceptance Criteria

1. WHEN the user taps the category field on the Detail_Screen, THE Detail_Screen SHALL display the Category_Selector component with the current category pre-selected.
2. WHEN the user selects a new category from the Category_Selector, THE Detail_Screen SHALL update the transaction category in the database using the existing `setTransactionCategory` function.
3. WHEN the category update succeeds, THE Detail_Screen SHALL display the newly selected category name and color immediately.
4. IF the category update fails, THEN THE Detail_Screen SHALL display an error message using the existing Alert pattern and retain the previous category value.
5. THE Category_Selector SHALL display both income and expense categories with group filtering (Custo Fixo, Variável, Receita).
6. WHEN the user selects a category for an installment group transaction, THE Detail_Screen SHALL prompt whether to apply the change to this parcel only or to all parcels in the group.

### Requirement 4: Filter by Category

**User Story:** As a user, I want to filter transactions by category on the statement screen, so that I can quickly find transactions of a specific type.

#### Acceptance Criteria

1. THE Statement_Screen SHALL display a Filter_Panel toggle button that expands or collapses the filter options.
2. WHEN the Filter_Panel is expanded, THE Statement_Screen SHALL display category filter chips showing all active categories.
3. WHEN the user selects one or more category chips, THE Statement_Screen SHALL display only transactions matching any of the selected categories (multi-select with OR logic).
4. WHEN a Category_Filter is active, THE Statement_Screen SHALL display a visual indicator showing the number of active filters.
5. WHEN the user deselects all category chips, THE Statement_Screen SHALL display all transactions for the selected month without category filtering.
6. WHEN a Category_Filter is active, THE MonthlySummary SHALL recalculate totals based only on the filtered transactions.
7. THE Category_Filter SHALL persist the selected categories while navigating between months within the same session.

### Requirement 5: Filter by Value Range

**User Story:** As a user, I want to filter transactions by amount range on the statement screen, so that I can find transactions within a specific value bracket.

#### Acceptance Criteria

1. WHEN the Filter_Panel is expanded, THE Statement_Screen SHALL display minimum and maximum amount input fields for the Value_Filter.
2. WHEN the user enters a minimum amount, THE Statement_Screen SHALL display only transactions with absolute amount greater than or equal to the minimum value (in cents).
3. WHEN the user enters a maximum amount, THE Statement_Screen SHALL display only transactions with absolute amount less than or equal to the maximum value (in cents).
4. WHEN both minimum and maximum amounts are set, THE Statement_Screen SHALL display only transactions with absolute amount within the specified range (inclusive).
5. IF the user enters a minimum value greater than the maximum value, THEN THE Statement_Screen SHALL display a validation error and retain the previous valid filter state.
6. WHEN a Value_Filter is active, THE MonthlySummary SHALL recalculate totals based only on the filtered transactions.
7. THE Value_Filter input fields SHALL accept numeric input with decimal separator appropriate to the current locale (dot for en, comma for pt-BR).

### Requirement 6: Infinite Scroll with Pagination

**User Story:** As a user, I want transactions to load progressively as I scroll, so that the screen loads quickly even with many transactions.

#### Acceptance Criteria

1. THE Statement_Screen SHALL load an initial batch of 20 transactions when the screen mounts or the reference month changes.
2. WHEN the user scrolls within 50% of the end of the loaded list, THE Statement_Screen SHALL automatically load the next batch of 20 transactions.
3. WHILE additional transactions are being loaded, THE Statement_Screen SHALL display a loading indicator at the bottom of the list.
4. WHEN all transactions for the current month and active filters have been loaded, THE Statement_Screen SHALL stop requesting additional batches.
5. THE Statement_Screen SHALL use cursor-based pagination with a composite key (date DESC, id DESC) to ensure consistent ordering across batches.
6. WHEN filters change (category or value range), THE Statement_Screen SHALL reset the pagination cursor and reload from the first batch.
7. THE Statement_Screen SHALL use FlashList with `onEndReached` and `onEndReachedThreshold` of 0.5 for triggering batch loads.
8. THE Statement_Screen SHALL prevent duplicate batch requests while a load operation is in progress.

### Requirement 7: Filter and Pagination Integration

**User Story:** As a user, I want filters and pagination to work together seamlessly, so that I can browse filtered results without performance issues.

#### Acceptance Criteria

1. WHEN a Category_Filter, Value_Filter, or date range filter is applied, THE Statement_Screen SHALL query the database with the filter conditions combined with cursor-based pagination.
2. WHEN filters are cleared, THE Statement_Screen SHALL reset pagination and reload all transactions from the first batch.
3. THE Statement_Screen SHALL pass filter parameters to the database query layer so that filtering happens at the SQL level rather than in-memory.
4. WHEN the reference month changes, THE Statement_Screen SHALL reset all filters and pagination state.

### Requirement 8: Filter by Date Range

**User Story:** As a user, I want to filter transactions by a custom date range within the selected month, so that I can focus on transactions from a specific period.

#### Acceptance Criteria

1. WHEN the Filter_Panel is expanded, THE Statement_Screen SHALL display start date and end date picker fields for the date range filter.
2. WHEN the user selects a start date, THE Statement_Screen SHALL display only transactions with date on or after the selected start date.
3. WHEN the user selects an end date, THE Statement_Screen SHALL display only transactions with date on or before the selected end date.
4. WHEN both start and end dates are set, THE Statement_Screen SHALL display only transactions with date within the specified range (inclusive).
5. IF the user selects a start date after the end date, THEN THE Statement_Screen SHALL display a validation error and retain the previous valid filter state.
6. WHEN a date range filter is active, THE MonthlySummary SHALL recalculate totals based only on the filtered transactions.
7. THE date picker fields SHALL use the existing `@react-native-community/datetimepicker` component with locale-appropriate date formatting.
8. THE date range filter SHALL default to the full range of the selected reference month when no custom range is set.

### Requirement 9: Internationalization

**User Story:** As a user, I want all new UI elements to be available in both English and Brazilian Portuguese, so that the app remains fully localized.

#### Acceptance Criteria

1. THE Statement_Screen SHALL display all filter labels, placeholders, and button texts using i18n translation keys.
2. THE Detail_Screen SHALL display the category edit prompt and confirmation messages using i18n translation keys.
3. THE Statement_Screen SHALL format currency values in filter inputs according to the current locale (BRL format for pt-BR, USD format for en).
4. THE Statement_Screen SHALL display filter validation error messages using i18n translation keys.
5. THE date picker fields SHALL display dates formatted according to the current locale (DD/MM/YYYY for pt-BR, MM/DD/YYYY for en).
