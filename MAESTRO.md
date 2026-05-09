# Maestro E2E Testing Guide

This document describes how to set up and run end-to-end (E2E) tests for GG-Economy Mobile using [Maestro](https://maestro.mobile.dev/).

## Why Maestro?

Maestro is recommended over Detox for Expo apps because:

- **Simpler setup**: No native build configuration required
- **Works with Expo Go**: Can test during development without building
- **YAML-based flows**: Easy to read and write tests
- **Cross-platform**: Same tests work on Android and iOS
- **Built-in waiting**: Automatic handling of async operations

## Prerequisites

### 1. Install Maestro CLI

**macOS (Homebrew):**

```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

**Linux/macOS (curl):**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Windows:**
Maestro requires WSL2. Install WSL2 first, then use the curl command above.

### 2. Verify Installation

```bash
maestro --version
```

### 3. Android Setup

Ensure you have:

- Android SDK installed
- An Android emulator running OR a physical device connected
- ADB accessible in your PATH

```bash
# Check connected devices
adb devices
```

### 4. iOS Setup (macOS only)

Ensure you have:

- Xcode installed
- iOS Simulator available

## Project Structure

```
.maestro/
├── config.yaml              # Maestro configuration
├── flows/                   # Test flow files
│   ├── smoke-test.yaml      # Basic app launch and navigation
│   ├── import-flow.yaml     # Import file flow with document picker (Task 32.2)
│   ├── import-flow-mock.yaml # Import flow without document picker (CI-friendly)
│   ├── manual-entry.yaml    # Manual entry flow (Task 32.3)
│   ├── backup-flow.yaml     # Backup flow (Task 32.4)
│   ├── navigation.yaml      # Navigation tests (Task 32.5)
│   └── language.yaml        # Language switching (Task 32.6)
└── reports/                 # Test reports (generated)
```

## Import Flow Testing

The import flow tests (`import-flow.yaml` and `import-flow-mock.yaml`) validate:

- Requirements 11, 12, 13, 14, 16, 17, 33

### Full Import Flow (`import-flow.yaml`)

Tests the complete import process including document picker interaction:

1. Navigate to Import screen
2. Open document picker
3. Select a file (CSV/OFX)
4. View import progress
5. Navigate to Review screen
6. Categorize transactions
7. Save reviewed transactions

**Note:** Document picker interaction requires:

- A test file pre-loaded on the device/emulator
- System UI interaction which may vary by device

### Mock Import Flow (`import-flow-mock.yaml`)

A CI-friendly version that tests the Review and Categorization flow:

- Skips document picker interaction
- Assumes transactions are pre-seeded or already imported
- More reliable for automated testing environments

### Running Import Tests

```bash
# Run full import flow (requires test file on device)
maestro test .maestro/flows/import-flow.yaml

# Run mock import flow (CI-friendly)
maestro test .maestro/flows/import-flow-mock.yaml

# Run all import tests
maestro test .maestro/flows --include-tags=import
```

### Preparing Test Files

For the full import flow, place test files in the device's Downloads folder:

- `test_transactions.csv`
- `bank_statement.csv`
- `transactions.ofx`

Example CSV format:

```csv
Date,Description,Amount
2024-01-15,Grocery Store,-50.00
2024-01-16,Salary,3000.00
2024-01-17,Electric Bill,-120.00
```

## Manual Entry Flow Testing

The manual entry flow test (`manual-entry.yaml`) validates:

- Requirements 23, 24, 33

### What It Tests

The manual entry flow tests the complete manual transaction entry process:

1. **Form Navigation**: Navigate to Manual Entry tab
2. **Form Elements**: Verify all form fields are present (type toggle, amount, description, date, category, reference month)
3. **Expense Entry**: Create an expense transaction with all fields
4. **Income Entry**: Create an income transaction with all fields
5. **Draft Auto-Save**: Verify draft is automatically saved
6. **Form Validation**: Test empty form submission validation
7. **Clear Draft**: Test draft clearing functionality
8. **Transaction Verification**: Verify saved transactions appear in Transactions list

### Test Flow Parts

**Part A - Expense Entry:**

- Select expense type
- Enter amount (125.50)
- Enter description (Grocery shopping at supermarket)
- Select expense category (Food)
- Save transaction
- Verify form reset

**Part B - Income Entry:**

- Select income type
- Enter amount (3500.00)
- Enter description (Monthly salary payment)
- Select income category (Salary)
- Save transaction

**Part C - Verification:**

- Navigate to Transactions tab
- Verify both transactions appear in list
- Verify monthly summary is updated

**Part D - Validation:**

- Test empty form submission
- Verify validation errors are shown

**Part E - Draft Management:**

- Fill form partially
- Clear draft
- Verify form is reset

### Running Manual Entry Tests

```bash
# Run manual entry flow
npm run e2e:manual

# Or run directly with Maestro
maestro test .maestro/flows/manual-entry.yaml

# Run all manual-tagged tests
maestro test .maestro/flows --include-tags=manual
```

### Test IDs Used

The manual entry flow uses the following testIDs:

| Test ID               | Element                       |
| --------------------- | ----------------------------- |
| `manual-screen`       | Manual Entry screen container |
| `type-toggle`         | Income/Expense type toggle    |
| `type-expense`        | Expense type button           |
| `type-income`         | Income type button            |
| `amount-input`        | Amount text input             |
| `amount-preview`      | Amount preview display        |
| `description-input`   | Description text input        |
| `date-picker`         | Date picker component         |
| `category-selector`   | Category selector button      |
| `category-picker`     | Category picker modal         |
| `month-selector`      | Reference month selector      |
| `submit-button`       | Save transaction button       |
| `clear-draft-button`  | Clear draft button            |
| `draft-indicator`     | Draft saved indicator         |
| `transactions-screen` | Transactions screen container |
| `transactions-list`   | Transactions list             |
| `monthly-summary`     | Monthly summary component     |

## Backup Flow Testing

The backup flow tests (`backup-flow.yaml` and `backup-flow-mock.yaml`) validate:

- Requirements 7, 8, 9, 26, 33

### Full Backup Flow (`backup-flow.yaml`)

Tests the complete backup process including Google OAuth:

1. Navigate to Settings > Backup
2. Connect Google account (OAuth flow)
3. Configure backup frequency (daily, weekly, etc.)
4. Configure preferred backup time
5. Trigger manual backup
6. Verify backup success status
7. Test restore modal

**Note:** OAuth flow requires:

- Google account configured on the device/emulator
- Google Play Services available (Android)
- Network connectivity
- System UI interaction which may vary by device

### Mock Backup Flow (`backup-flow-mock.yaml`)

A CI-friendly version that tests the Backup Settings UI:

- Skips actual OAuth authentication
- Tests all UI elements and modals
- Verifies frequency and time selectors work
- Tests button states (enabled/disabled)
- More reliable for automated testing environments

### Running Backup Tests

```bash
# Run full backup flow (requires Google account on device)
npm run e2e:backup

# Run mock backup flow (CI-friendly)
npm run e2e:backup:mock

# Run all backup tests
maestro test .maestro/flows --include-tags=backup
```

### Test IDs Used

The backup flow uses the following testIDs:

| Test ID                       | Element                           |
| ----------------------------- | --------------------------------- |
| `backup-settings-screen`      | Backup Settings screen container  |
| `google-account-section`      | Google account connection section |
| `connect-button`              | Connect Google account button     |
| `disconnect-button`           | Disconnect Google account button  |
| `connected-email`             | Connected email display           |
| `backup-status-section`       | Backup status section             |
| `backup-status-text`          | Last backup status text           |
| `backup-time-text`            | Last backup time text             |
| `frequency-selector`          | Backup frequency selector         |
| `frequency-modal`             | Frequency selection modal         |
| `frequency-option-daily`      | Daily frequency option            |
| `frequency-option-every2days` | Every 2 days option               |
| `frequency-option-every3days` | Every 3 days option               |
| `frequency-option-weekly`     | Weekly frequency option           |
| `frequency-option-disabled`   | Disabled frequency option         |
| `time-selector`               | Backup time selector              |
| `time-modal`                  | Time selection modal              |
| `time-option-{hour}`          | Time option (0-23)                |
| `backup-now-button`           | Manual backup button              |
| `restore-button`              | Restore from backup button        |
| `restore-modal`               | Restore backup selection modal    |
| `backups-list`                | List of available backups         |
| `backups-loading`             | Backups loading indicator         |
| `no-backups`                  | No backups found message          |
| `close-restore-modal`         | Close restore modal button        |
| `progress-modal`              | Backup/restore progress modal     |
| `backup-progress-message`     | Backup progress message           |
| `restore-progress-message`    | Restore progress message          |
| `progress-bar-fill`           | Progress bar fill indicator       |

### OAuth Flow Considerations

When testing the full backup flow with OAuth:

1. **Device Setup**: Ensure a Google account is signed in on the device
2. **Emulator Setup**: For Android emulators, use a Google APIs system image
3. **Account Selection**: The test attempts to select the first available Google account
4. **Permissions**: The test will attempt to accept OAuth permission prompts
5. **Timeouts**: OAuth flows may take longer; the test uses 30-second timeouts

For CI/CD environments where OAuth cannot be automated, use the mock version:

```bash
npm run e2e:backup:mock
```

## Navigation Flow Testing

The navigation flow test (`navigation.yaml`) validates:

- Requirements 28, 33

### What It Tests

The navigation flow tests comprehensive navigation between all main screens:

1. **Tab Navigation**: Navigate through all 5 main tabs (Dashboard, Transactions, Review, Manual, Settings)
2. **Settings Stack Navigation**: Navigate to all settings sub-screens (Backup, Language, Categories, Rules)
3. **Modal Screens**: Test modal navigation (Import, Category Form, Rule Form, Frequency selector)
4. **Back Navigation**: Verify back button works correctly in stack navigation
5. **Navigation State Persistence**: Verify navigation state is maintained when switching tabs
6. **Rapid Tab Switching**: Test stability under rapid navigation changes

### Test Flow Parts

**Part A - App Launch:**

- Launch app with clear state
- Verify Dashboard is the default screen

**Part B - Tab Navigation (Forward):**

- Navigate: Dashboard → Transactions → Review → Manual → Settings
- Verify each screen loads correctly

**Part C - Tab Navigation (Reverse):**

- Navigate back through tabs in reverse order
- Verify navigation works in both directions

**Part D - Settings Stack Navigation:**

- Navigate to each settings sub-screen (Language, Backup, Categories, Rules)
- Test back navigation from each sub-screen

**Part E - Settings Deep Navigation:**

- Test nested modals (Settings → Backup → Frequency Modal)
- Verify modal open/close behavior

**Part F - Import Modal:**

- Open Import modal from Dashboard
- Close modal and verify return to Dashboard

**Part G - Navigation State Persistence:**

- Navigate to Settings → Backup
- Switch to Dashboard tab
- Return to Settings tab
- Verify Backup screen is still displayed (state preserved)

**Part H - Rapid Tab Switching:**

- Rapidly switch between all tabs
- Verify app remains stable

**Part I - Categories Modal:**

- Navigate to Categories settings
- Open Add Category modal
- Close modal and verify return

**Part J - Rules Modal:**

- Navigate to Rules settings
- Open Add Rule modal
- Close modal and verify return

**Part K - Final Verification:**

- Complete full navigation cycle
- Verify all tabs are accessible

### Running Navigation Tests

```bash
# Run navigation flow
npm run e2e:navigation

# Or run directly with Maestro
maestro test .maestro/flows/navigation.yaml

# Run all navigation-tagged tests
maestro test .maestro/flows --include-tags=navigation
```

### Test IDs Used

The navigation flow uses the following testIDs:

| Test ID                      | Element                              |
| ---------------------------- | ------------------------------------ |
| `settings-screen`            | Settings main screen container       |
| `settings-item-language`     | Language settings navigation item    |
| `settings-item-backup`       | Backup settings navigation item      |
| `settings-item-categories`   | Categories settings navigation item  |
| `settings-item-rules`        | Rules settings navigation item       |
| `backup-settings-screen`     | Backup settings screen container     |
| `categories-settings-screen` | Categories settings screen container |
| `rules-settings-screen`      | Rules settings screen container      |
| `frequency-selector`         | Backup frequency selector            |
| `frequency-modal`            | Frequency selection modal            |
| `close-frequency-modal`      | Close frequency modal button         |
| `import-screen`              | Import screen container              |
| `import-close-button`        | Import screen close button           |
| `add-category-button`        | Add category button                  |
| `category-form-modal`        | Category form modal                  |
| `close-category-modal`       | Close category modal button          |
| `add-rule-button`            | Add rule button                      |
| `rule-form-modal`            | Rule form modal                      |
| `close-rule-modal`           | Close rule modal button              |
| `manual-screen`              | Manual entry screen container        |

### Navigation Structure

The app uses the following navigation structure:

```
Root Layout (_layout.tsx)
├── (tabs) - Bottom Tab Navigator
│   ├── index.tsx (Dashboard) - Default tab
│   ├── transactions.tsx
│   ├── review.tsx
│   ├── manual.tsx
│   └── settings/ - Stack Navigator
│       ├── index.tsx (Settings main)
│       ├── backup.tsx
│       ├── language.tsx
│       ├── categories.tsx
│       └── rules.tsx
├── import/ - Modal Stack
│   ├── index.tsx (File selection)
│   └── progress.tsx
└── transaction/
    └── [id].tsx (Transaction detail modal)
```

### Tips for Navigation Testing

1. **Use `optional: true`**: For elements that may not always be visible
2. **Wait for transitions**: Use `extendedWaitUntil` after navigation actions
3. **Test both directions**: Verify forward and back navigation
4. **Check state persistence**: Ensure navigation state is maintained across tab switches
5. **Test edge cases**: Rapid switching, deep navigation, modal stacking

## Language Switching Flow Testing

The language switching flow test (`language.yaml`) validates:

- Requirements 25, 33

### What It Tests

The language switching flow tests internationalization (i18n) functionality:

1. **Language Selection**: Navigate to Settings > Language and switch languages
2. **UI String Updates**: Verify all UI strings change across multiple screens
3. **Bidirectional Switching**: Test switching from English to Portuguese and back
4. **Language Persistence**: Verify language setting persists after app restart
5. **Navigation Tab Labels**: Verify tab labels update with language change

### Supported Languages

| Language            | Locale Code | Display Name       |
| ------------------- | ----------- | ------------------ |
| Portuguese (Brazil) | pt-BR       | Português (Brasil) |
| English             | en          | English            |

### Test Flow Parts

**Part A - App Launch:**

- Launch app with clear state
- Verify Dashboard is displayed

**Part B - Navigate to Language Settings:**

- Navigate to Settings tab
- Open Language settings screen

**Part C - Switch to Portuguese:**

- Select "Português (Brasil)" option
- Verify language description changes to Portuguese

**Part D - Verify Portuguese Strings:**

- Navigate through all main screens
- Verify Portuguese strings on Dashboard ("Painel", "Receitas", "Despesas", "Saldo")
- Verify Portuguese strings on Transactions ("Lançamentos")
- Verify Portuguese strings on Review ("Revisão")
- Verify Portuguese strings on Manual Entry ("Lançamento Manual")
- Verify Portuguese strings on Settings ("Configurações", "Idioma", "Backup", "Categorias")

**Part E - Switch Back to English:**

- Navigate to Language settings (now "Idioma")
- Select "English" option
- Verify language description changes to English

**Part F - Verify English Strings:**

- Navigate through all main screens
- Verify English strings on Dashboard ("Dashboard", "Income", "Expenses", "Balance")
- Verify English strings on Transactions ("Transactions")
- Verify English strings on Review ("Review")
- Verify English strings on Manual Entry ("Manual Entry")
- Verify English strings on Settings ("Settings", "Language", "Backup", "Categories")

**Part G - Test Language Persistence:**

- Switch to Portuguese
- Restart app (without clearing state)
- Verify Portuguese is still active after restart
- Verify navigation tabs are in Portuguese
- Navigate to Language settings and verify Portuguese is selected

**Part H - Reset to English:**

- Switch back to English for clean state
- Verify Dashboard shows English strings

### Running Language Tests

```bash
# Run language switching flow
npm run e2e:language

# Or run directly with Maestro
maestro test .maestro/flows/language.yaml

# Run all i18n-tagged tests
maestro test .maestro/flows --include-tags=i18n
```

### Key UI Strings by Language

| Screen           | English              | Portuguese              |
| ---------------- | -------------------- | ----------------------- |
| Dashboard Tab    | Dashboard            | Painel                  |
| Transactions Tab | Transactions         | Lançamentos             |
| Review Tab       | Review               | Revisão                 |
| Manual Tab       | Manual               | Manual                  |
| Settings Tab     | Settings             | Configurações           |
| Income           | Income               | Receitas                |
| Expenses         | Expenses             | Despesas                |
| Balance          | Balance              | Saldo                   |
| Language         | Language             | Idioma                  |
| Backup           | Backup               | Backup                  |
| Categories       | Categories           | Categorias              |
| Rules            | Categorization Rules | Regras de Categorização |

### Language Persistence

The app stores the selected language preference using Zustand with persistence. When testing language persistence:

1. **First Launch**: App uses device locale or defaults to English
2. **After Selection**: Language preference is saved to AsyncStorage
3. **App Restart**: Language preference is restored from storage
4. **Clear State**: Using `clearState: true` resets to default language

### Tips for Language Testing

1. **Wait for language change**: UI updates may take a moment after language selection
2. **Use `anyOf` for assertions**: Some strings may vary based on app state
3. **Test persistence separately**: Use `clearState: false` when testing persistence
4. **Check navigation tabs**: Tab labels are a reliable indicator of current language
5. **Use `optional: true`**: For content that may not be visible (empty states, etc.)

## Running Tests

### Start the App

First, start the Expo development server:

```bash
# In the gg-economy-mobile directory
npm start
```

Then, run the app on your device/emulator:

- Press `a` for Android
- Press `i` for iOS (macOS only)

### Run All Tests

```bash
npm run e2e
```

### Run Specific Test

```bash
npm run e2e:smoke
```

Or run any flow directly:

```bash
maestro test .maestro/flows/smoke-test.yaml
```

### Run Tests with Tags

```bash
# Run only smoke tests
maestro test .maestro/flows --include-tags=smoke

# Run import-related tests
maestro test .maestro/flows --include-tags=import
```

## Writing Tests

### Basic Flow Structure

```yaml
# flow-name.yaml
appId: com.ggeconomy.mobile

---
# Launch the app
- launchApp:
    clearState: true # Optional: clear app data

# Wait for element
- extendedWaitUntil:
    visible: 'Element Text'
    timeout: 10000

# Tap on element
- tapOn: 'Button Text'

# Assert element is visible
- assertVisible: 'Expected Text'

# Input text
- inputText: 'Hello World'

# Take screenshot
- takeScreenshot: 'screenshot_name'
```

### Common Commands

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `launchApp`         | Launch the app                |
| `tapOn`             | Tap on an element             |
| `inputText`         | Type text into focused field  |
| `assertVisible`     | Assert element is visible     |
| `assertNotVisible`  | Assert element is not visible |
| `extendedWaitUntil` | Wait for condition            |
| `scroll`            | Scroll in a direction         |
| `swipe`             | Swipe gesture                 |
| `takeScreenshot`    | Capture screenshot            |
| `back`              | Press back button             |
| `hideKeyboard`      | Hide the keyboard             |

### Element Selection

Maestro can find elements by:

1. **Text content**: `tapOn: "Button Text"`
2. **Test ID**: `tapOn: { id: "submit-button" }`
3. **Accessibility label**: `tapOn: { accessibilityLabel: "Submit" }`
4. **Index**: `tapOn: { index: 0 }` (first matching element)

### Best Practices

1. **Use meaningful test IDs**: Add `testID` props to React Native components
2. **Wait for elements**: Use `extendedWaitUntil` instead of fixed delays
3. **Clear state when needed**: Use `clearState: true` for isolated tests
4. **Take screenshots**: Document test progress with screenshots
5. **Use environment variables**: Store test data in `config.yaml`

## Adding Test IDs to Components

For reliable element selection, add `testID` props to your components:

```tsx
// Example: Button with testID
<TouchableOpacity testID="import-button" onPress={handleImport}>
  <Text>Import File</Text>
</TouchableOpacity>

// Example: Input with testID
<TextInput
  testID="amount-input"
  value={amount}
  onChangeText={setAmount}
/>
```

Then reference in Maestro:

```yaml
- tapOn:
    id: 'import-button'

- inputText: '100.00'
- tapOn:
    id: 'amount-input'
```

## Debugging Tests

### Run in Debug Mode

```bash
maestro test .maestro/flows/smoke-test.yaml --debug-output=debug_output
```

### View Hierarchy

```bash
maestro hierarchy
```

### Interactive Studio

```bash
maestro studio
```

This opens a web UI where you can:

- See the current screen
- Inspect elements
- Build flows interactively

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: gg-economy-mobile

      - name: Install Maestro
        run: |
          brew tap mobile-dev-inc/tap
          brew install maestro

      - name: Start Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: |
            cd gg-economy-mobile
            npm run e2e
```

## Troubleshooting

### App Not Found

Ensure the `appId` in your flow matches your app's bundle identifier:

- Check `app.json` for the correct bundle ID
- For Expo Go, use `host.exp.exponent`

### Element Not Found

1. Use `maestro hierarchy` to see available elements
2. Check if the element has loaded (add wait)
3. Verify the text/ID matches exactly

### Timeout Errors

Increase timeout values:

```yaml
- extendedWaitUntil:
    visible: 'Slow Element'
    timeout: 30000 # 30 seconds
```

### Emulator Issues

```bash
# Restart ADB
adb kill-server
adb start-server

# Check emulator status
adb devices
```

## Available npm Scripts

| Script                    | Description                        |
| ------------------------- | ---------------------------------- |
| `npm run e2e`             | Run all E2E tests                  |
| `npm run e2e:smoke`       | Run smoke tests only               |
| `npm run e2e:import`      | Run import flow test               |
| `npm run e2e:import:mock` | Run mock import flow (CI-friendly) |
| `npm run e2e:manual`      | Run manual entry flow test         |
| `npm run e2e:backup`      | Run backup flow test               |
| `npm run e2e:backup:mock` | Run mock backup flow (CI-friendly) |
| `npm run e2e:navigation`  | Run navigation flow test           |
| `npm run e2e:language`    | Run language switching flow test   |
| `npm run e2e:studio`      | Open Maestro Studio                |

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro CLI Reference](https://maestro.mobile.dev/cli/commands)
- [Flow Reference](https://maestro.mobile.dev/reference/flow-reference)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)
