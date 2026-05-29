# Requirements Document

## Introduction

This feature integrates weekly recurring expenses and payment status tracking into the transactions statement (extrato) screen. Currently, weekly occurrences are displayed as a simple list in the statement header, separate from the main transaction list. This integration will merge weekly expenses as grouped, expandable items in the main statement list, allow editing individual parcel values, provide a paid/pending toggle for all transaction types, and add a "Pending only" filter to the FilterPanel.

## Glossary

- **Statement_Screen**: The main transactions tab screen (`transactions.tsx`) that displays a paginated list of financial transactions organized by month.
- **Statement_List**: The FlashList-based scrollable list within the Statement_Screen that renders transaction items.
- **Weekly_Group_Item**: A collapsible row in the Statement_List representing a weekly recurring expense group, displaying the group title and monthly total.
- **Weekly_Parcel**: An individual weekly occurrence within a Weekly_Group_Item, representing a single week's expense entry.
- **Payment_Status_Toggle**: A UI control that allows the user to switch a transaction or occurrence between paid and pending states.
- **FilterPanel**: The collapsible filter component above the Statement_List that supports category, amount range, and date range filtering.
- **PaymentStatusService**: The existing service class that handles toggling and querying payment status for weekly occurrences and monthly transactions.
- **Transaction_Detail_View**: The modal screen (`transaction/[id].tsx`) that displays full details of a single transaction.
- **Unified_Statement_Item**: A data type representing either a regular transaction, an installment parcel, or a Weekly_Group_Item in the Statement_List.

## Requirements

### Requirement 1: Weekly Expenses as Grouped Items in Statement List

**User Story:** As a user, I want to see my weekly recurring expenses integrated into the main statement list as grouped items with a monthly total, so that I have a unified view of all my expenses in one place.

#### Acceptance Criteria

1. WHEN the Statement_Screen loads for a given month, THE Statement_List SHALL display Weekly_Group_Items alongside regular transactions, sorted by date.
2. THE Weekly_Group_Item SHALL display the group title, category icon, and the sum of all Weekly_Parcel amounts for the current month.
3. WHEN the user taps a Weekly_Group_Item, THE Statement_List SHALL expand the item to reveal individual Weekly_Parcels with their respective dates and amounts.
4. WHEN the user taps an expanded Weekly_Group_Item header, THE Statement_List SHALL collapse the item to hide individual Weekly_Parcels.
5. WHILE a Weekly_Group_Item is expanded, THE Statement_List SHALL display each Weekly_Parcel with its date, amount, and payment status indicator.
6. THE Statement_List SHALL no longer display weekly occurrences in a separate header section above the main list.

### Requirement 2: Edit Individual Weekly Parcel Values

**User Story:** As a user, I want to edit the amount of individual weekly parcels, so that I can adjust values when a specific week's expense differs from the default.

#### Acceptance Criteria

1. WHEN the user taps a Weekly_Parcel within an expanded Weekly_Group_Item, THE Statement_Screen SHALL navigate to a detail view for that parcel.
2. WHEN the user edits the amount of a Weekly_Parcel, THE PaymentStatusService SHALL persist the new amount and set the `isValueEdited` flag to true.
3. WHEN a Weekly_Parcel amount is updated, THE Weekly_Group_Item SHALL recalculate and display the updated monthly total.
4. IF the user enters an invalid amount (zero, negative, or non-numeric), THEN THE Statement_Screen SHALL display a validation error and reject the change.

### Requirement 3: Payment Status Toggle for All Transactions

**User Story:** As a user, I want to mark any transaction as paid or pending, so that I can track which expenses have been settled.

#### Acceptance Criteria

1. THE Statement_List SHALL display a Payment_Status_Toggle for each Unified_Statement_Item (regular transactions, installment parcels, and Weekly_Parcels).
2. WHEN the user activates the Payment_Status_Toggle on a regular transaction, THE PaymentStatusService SHALL toggle the `isPaid` field on the transactions table and persist the change.
3. WHEN the user activates the Payment_Status_Toggle on a Weekly_Parcel, THE PaymentStatusService SHALL toggle the `isPaid` field on the weekly_occurrences table and persist the change.
4. WHEN the user activates the Payment_Status_Toggle on an installment parcel, THE PaymentStatusService SHALL toggle the `isPaid` field on the transactions table and persist the change.
5. WHEN a payment status toggle completes, THE Statement_List SHALL update the visual state of the affected item without requiring a full page refresh.
6. THE Payment_Status_Toggle SHALL display a filled checkmark icon for paid items and an empty circle icon for pending items.

### Requirement 4: Filter by Payment Status

**User Story:** As a user, I want to filter the statement to show only pending items, so that I can quickly see which expenses still need to be paid.

#### Acceptance Criteria

1. THE FilterPanel SHALL include a "Pending only" toggle option alongside existing category, amount range, and date range filters.
2. WHEN the "Pending only" filter is active, THE Statement_List SHALL display only Unified_Statement_Items where `isPaid` equals false.
3. WHEN the "Pending only" filter is active and a Weekly_Group_Item has at least one pending Weekly_Parcel, THE Statement_List SHALL display that Weekly_Group_Item in the filtered results.
4. WHEN the "Pending only" filter is active and a Weekly_Group_Item is displayed, THE Weekly_Group_Item SHALL show only the pending parcels count and pending total amount.
5. WHEN the "Pending only" filter is cleared, THE Statement_List SHALL return to displaying all Unified_Statement_Items regardless of payment status.
6. THE FilterPanel SHALL count the "Pending only" filter in the active filter count badge when it is enabled.

### Requirement 5: Payment Status in Transaction Detail View

**User Story:** As a user, I want to toggle the paid/pending status from the transaction detail view, so that I can manage payment status while reviewing transaction details.

#### Acceptance Criteria

1. WHEN the Transaction_Detail_View is opened for any transaction, THE Transaction_Detail_View SHALL display the current payment status (paid or pending) as a detail row.
2. WHEN the user taps the payment status row in the Transaction_Detail_View, THE PaymentStatusService SHALL toggle the `isPaid` field and persist the change.
3. WHEN the payment status is toggled in the Transaction_Detail_View, THE Transaction_Detail_View SHALL immediately reflect the updated status without navigation.
4. WHEN the user returns to the Statement_List after toggling payment status in the Transaction_Detail_View, THE Statement_List SHALL reflect the updated payment status.
