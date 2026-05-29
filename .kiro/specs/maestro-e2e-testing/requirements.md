# Requirements Document

## Introduction

This feature ensures Maestro E2E testing is properly configured and working with the Android emulator, and provides comprehensive functional test coverage for all major user flows in the GG Economy Mobile app. The goal is to validate that existing Maestro flows execute correctly, identify and fix configuration issues, and expand test coverage to ensure all critical paths are exercised end-to-end.

## Glossary

- **Maestro**: A mobile UI testing framework that uses YAML-based flow definitions to automate interactions with Android and iOS apps
- **Flow**: A YAML file defining a sequence of UI interactions and assertions that Maestro executes against the app
- **Test_Runner**: The Maestro CLI tool that executes flows against a connected device or emulator
- **App**: The GG Economy Mobile React Native/Expo application (appId: com.ggeconomy.mobile)
- **Emulator**: The Android emulator instance used for running E2E tests locally
- **Dashboard_Screen**: The main tab showing monthly financial summary, charts, and category breakdowns
- **Transactions_Screen**: The tab displaying paginated transaction list with filters and monthly navigation
- **Manual_Entry_Screen**: The tab with the form for creating transactions manually (single, installment, batch modes)
- **Settings_Screen**: The tab with navigation to sub-settings (Language, Notifications, Backup, Categories, Rules)
- **Filter_Panel**: The expandable panel on the Transactions screen for filtering by category, amount range, and date range
- **Month_Selector**: The navigation component for switching between months on Dashboard and Transactions screens
- **Category_Selector**: The modal picker for selecting transaction categories
- **Draft_System**: The auto-save mechanism that persists partially filled manual entry forms

## Requirements

### Requirement 1: Maestro Environment Verification

**User Story:** As a developer, I want to verify that Maestro is properly installed and configured to communicate with my Android emulator, so that I can run E2E tests reliably.

#### Acceptance Criteria

1. WHEN the developer runs `maestro --version`, THE Test_Runner SHALL return a valid version string without errors
2. WHEN the developer runs `adb devices`, THE Emulator SHALL appear in the list of connected devices with status "device"
3. WHEN the developer runs `maestro test .maestro/flows/smoke-test.yaml`, THE Test_Runner SHALL successfully launch the App on the Emulator
4. IF the Emulator is not running, THEN THE Test_Runner SHALL report a clear error indicating no connected device was found
5. IF the appId in config.yaml does not match the installed app, THEN THE Test_Runner SHALL report an error indicating the app was not found

### Requirement 2: Smoke Test Flow

**User Story:** As a developer, I want a smoke test that validates the app launches and all main tabs are accessible, so that I can quickly verify the app is functional before running detailed tests.

#### Acceptance Criteria

1. WHEN the smoke test flow executes, THE App SHALL launch with cleared state and display the Dashboard_Screen within 15 seconds
2. WHEN the smoke test navigates to each tab (Dashboard, Transactions, Manual, Settings), THE App SHALL display the corresponding screen within 5 seconds
3. THE smoke test flow SHALL capture screenshots at each navigation step for visual verification
4. IF any tab fails to load within the timeout, THEN THE Test_Runner SHALL fail the flow with a descriptive error message

### Requirement 3: Dashboard Flow

**User Story:** As a developer, I want E2E tests that validate the Dashboard screen displays financial data correctly and responds to user interactions, so that I can ensure the main overview works end-to-end.

#### Acceptance Criteria

1. WHEN the Dashboard_Screen loads, THE App SHALL display the Month_Selector component with the current month
2. WHEN the user taps the previous month arrow on the Month_Selector, THE Dashboard_Screen SHALL update to show the previous month's data
3. WHEN the user taps the next month arrow on the Month_Selector, THE Dashboard_Screen SHALL update to show the next month's data
4. WHEN the Dashboard_Screen loads with transaction data, THE App SHALL display the SummaryCard with Income, Expenses, and Balance values
5. WHEN the Dashboard_Screen loads with transaction data, THE App SHALL display the expense chart with filter options (All, Fixed, Variable)
6. WHEN the user taps a chart filter option, THE Dashboard_Screen SHALL update the chart to reflect the selected filter
7. WHEN the Dashboard_Screen has no transaction data for the selected month, THE App SHALL display an empty state with a hint to add transactions

### Requirement 4: Transactions List Flow

**User Story:** As a developer, I want E2E tests that validate the Transactions screen displays, filters, and paginates transactions correctly, so that I can ensure the transaction browsing experience works end-to-end.

#### Acceptance Criteria

1. WHEN the Transactions_Screen loads, THE App SHALL display the monthly summary with income, expenses, and balance
2. WHEN the user taps the filter toggle, THE Filter_Panel SHALL expand showing category, amount range, and date range filters
3. WHEN the user selects a category filter, THE Transactions_Screen SHALL display only transactions matching the selected category
4. WHEN the user scrolls to the bottom of the transaction list, THE App SHALL load the next page of transactions (infinite scroll pagination)
5. WHEN the user navigates to a different month using the Month_Selector, THE Transactions_Screen SHALL refresh and display transactions for the selected month
6. WHEN the user taps the add transaction button (+), THE App SHALL navigate to the Manual_Entry_Screen
7. WHEN the user long-presses a transaction, THE App SHALL display a deletion confirmation dialog
8. WHEN the user taps a transaction card, THE App SHALL navigate to the transaction edit modal

### Requirement 5: Manual Entry Flow

**User Story:** As a developer, I want E2E tests that validate the manual transaction entry form works correctly for single entries, installments, and batch mode, so that I can ensure users can create transactions reliably.

#### Acceptance Criteria

1. WHEN the Manual_Entry_Screen loads, THE App SHALL display the transaction form with type toggle, title, amount, description, date picker, category selector, and reference month fields
2. WHEN the user selects "expense" type and fills all required fields (title, amount), THE App SHALL enable the save button
3. WHEN the user taps save with valid data, THE App SHALL create the transaction and display a success confirmation
4. WHEN the user taps save with empty required fields, THE App SHALL display validation error messages for each missing field
5. WHEN the user enables installment mode and sets parcel count, THE App SHALL display the installment preview with calculated amounts per parcel
6. WHEN the user submits an installment entry, THE App SHALL create all parcels atomically and display a success message with the period range
7. WHEN the user enables batch mode, THE App SHALL prompt for category and title selection, then allow rapid entry of multiple transactions with the same category
8. WHEN the user partially fills the form and waits, THE Draft_System SHALL auto-save the form state within 2 seconds
9. WHEN the user taps "Clear Draft", THE App SHALL display a confirmation dialog and reset the form upon confirmation

### Requirement 6: Settings Navigation Flow

**User Story:** As a developer, I want E2E tests that validate all settings screens are accessible and functional, so that I can ensure the settings area works end-to-end.

#### Acceptance Criteria

1. WHEN the Settings_Screen loads, THE App SHALL display sections for Preferences (Language, Notifications, Backup) and Data Management (Categories, Rules)
2. WHEN the user taps the Language setting, THE App SHALL navigate to the language selection screen
3. WHEN the user taps the Backup setting, THE App SHALL navigate to the backup configuration screen
4. WHEN the user taps the Categories setting, THE App SHALL navigate to the categories management screen
5. WHEN the user taps the Rules setting, THE App SHALL navigate to the categorization rules screen
6. WHEN the user taps the Notifications setting, THE App SHALL navigate to the notifications configuration screen
7. WHEN the user navigates to a sub-setting and presses back, THE App SHALL return to the Settings_Screen main list

### Requirement 7: Language Switching Flow

**User Story:** As a developer, I want E2E tests that validate language switching updates all UI strings correctly and persists across app restarts, so that I can ensure internationalization works end-to-end.

#### Acceptance Criteria

1. WHEN the user selects "Português (Brasil)" in the language settings, THE App SHALL update all navigation tab labels to Portuguese (Painel, Lançamentos, Manual, Configurações)
2. WHEN the user selects "English" in the language settings, THE App SHALL update all navigation tab labels to English (Dashboard, Transactions, Manual, Settings)
3. WHEN the user switches language and navigates to the Dashboard_Screen, THE App SHALL display summary labels in the selected language (Income/Receitas, Expenses/Despesas, Balance/Saldo)
4. WHEN the user switches language and restarts the app without clearing state, THE App SHALL retain the selected language preference
5. WHEN the user switches language, THE Settings_Screen SHALL display all setting labels in the selected language

### Requirement 8: Backup Settings Flow

**User Story:** As a developer, I want E2E tests that validate the backup settings UI elements and interactions work correctly, so that I can ensure the backup configuration experience is functional.

#### Acceptance Criteria

1. WHEN the backup settings screen loads, THE App SHALL display the Google account connection section, backup status section, and action buttons
2. WHEN the user taps the frequency selector, THE App SHALL display a modal with frequency options (Daily, Every 2 days, Every 3 days, Weekly, Disabled)
3. WHEN the user selects a frequency option, THE App SHALL close the modal and display the selected frequency
4. WHEN the user taps the time selector, THE App SHALL display a modal with hour options (0-23)
5. WHEN no Google account is connected, THE App SHALL display the connect button and disable the backup-now button
6. WHEN the user taps the restore button, THE App SHALL display the restore modal with a list of available backups or a "no backups" message

### Requirement 9: Transaction Edit Flow

**User Story:** As a developer, I want E2E tests that validate the transaction edit modal allows users to modify and save transaction details, so that I can ensure editing works end-to-end.

#### Acceptance Criteria

1. WHEN the user taps a transaction in the list, THE App SHALL open the transaction edit modal with pre-filled fields
2. WHEN the user modifies the category and taps save, THE App SHALL update the transaction and return to the transactions list
3. WHEN the user taps the back/close button without saving, THE App SHALL return to the transactions list without modifying the transaction
4. IF the transaction belongs to an installment group, THEN THE App SHALL display installment-specific information in the edit modal

### Requirement 10: Categories Management Flow

**User Story:** As a developer, I want E2E tests that validate category creation, editing, and listing work correctly, so that I can ensure the categories management feature is functional.

#### Acceptance Criteria

1. WHEN the categories settings screen loads, THE App SHALL display the list of existing categories grouped by type (income/expense)
2. WHEN the user taps the add category button, THE App SHALL display the category form modal
3. WHEN the user fills the category form with valid data and saves, THE App SHALL add the new category to the list
4. IF the user submits the category form with empty required fields, THEN THE App SHALL display validation errors

### Requirement 11: Test Execution and Reporting

**User Story:** As a developer, I want all E2E test flows to produce consistent reports and screenshots, so that I can diagnose failures and track test results over time.

#### Acceptance Criteria

1. WHEN any flow completes successfully, THE Test_Runner SHALL generate a JUnit report in the .maestro/reports directory
2. WHEN any flow fails, THE Test_Runner SHALL capture a screenshot of the failure state
3. THE Test_Runner SHALL support running all flows with `npm run e2e` and individual flows with specific npm scripts
4. WHEN the user runs flows with tag filters (e.g., --include-tags=smoke), THE Test_Runner SHALL execute only flows matching the specified tags

### Requirement 12: Test Data Independence

**User Story:** As a developer, I want each E2E test flow to be independent and not rely on state from other tests, so that tests can run in any order without failures.

#### Acceptance Criteria

1. WHEN a flow starts with `clearState: true`, THE App SHALL launch with a clean database and no persisted preferences
2. WHEN a flow creates test data (transactions, categories), THE flow SHALL not depend on data created by other flows
3. WHEN a flow tests language persistence, THE flow SHALL restore the original language at the end to avoid affecting subsequent flows
4. IF a flow requires pre-existing data, THEN THE flow SHALL create the necessary data as part of its setup steps
