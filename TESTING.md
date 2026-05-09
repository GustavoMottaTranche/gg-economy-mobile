# Manual Testing Guide for GG-Economy Mobile

This document provides comprehensive instructions for manually testing the GG-Economy Mobile app on Android devices and emulators.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Running on Android Emulator](#running-on-android-emulator)
3. [Running on Physical Device with Expo Go](#running-on-physical-device-with-expo-go)
4. [Running with Development Build](#running-with-development-build)
5. [Key User Flows to Test](#key-user-flows-to-test)
6. [Automated E2E Testing](#automated-e2e-testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or later)

   ```bash
   node --version
   ```

2. **npm** (v9 or later)

   ```bash
   npm --version
   ```

3. **Expo CLI** (installed globally or via npx)

   ```bash
   npx expo --version
   ```

4. **Android Studio** (for emulator)
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API level 34 recommended)
   - Create an Android Virtual Device (AVD)

5. **Expo Go App** (for physical device testing)
   - Download from Google Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

### Project Setup

```bash
# Navigate to project directory
cd gg-economy-mobile

# Install dependencies
npm install

# Verify installation
npm run typecheck
```

---

## Running on Android Emulator

### Step 1: Start Android Emulator

**Option A: Via Android Studio**

1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Click the play button next to your AVD
4. Wait for the emulator to fully boot

**Option B: Via Command Line**

```bash
# List available emulators
emulator -list-avds

# Start a specific emulator
emulator -avd <emulator_name>

# Example:
emulator -avd Pixel_7_API_34
```

### Step 2: Verify Emulator Connection

```bash
# Check connected devices
adb devices

# Expected output:
# List of devices attached
# emulator-5554   device
```

### Step 3: Start the Development Server

```bash
# Start Expo development server
npm start

# Or start directly for Android
npm run android
```

### Step 4: Run on Emulator

If using `npm start`:

1. Press `a` in the terminal to open on Android emulator
2. Wait for the app to build and install

If using `npm run android`:

- The app will automatically build and launch on the emulator

### Recommended Emulator Settings

| Setting          | Recommended Value           |
| ---------------- | --------------------------- |
| Device           | Pixel 7 or similar          |
| API Level        | 34 (Android 14)             |
| RAM              | 2048 MB                     |
| Internal Storage | 2048 MB                     |
| SD Card          | 512 MB                      |
| Google APIs      | Enabled (for OAuth testing) |

---

## Running on Physical Device with Expo Go

### Step 1: Install Expo Go

1. Open Google Play Store on your Android device
2. Search for "Expo Go"
3. Install the app by Expo Project

### Step 2: Connect to Same Network

Ensure your development machine and Android device are on the **same Wi-Fi network**.

### Step 3: Start Development Server

```bash
npm start
```

### Step 4: Connect Device

**Option A: QR Code**

1. A QR code will appear in the terminal
2. Open Expo Go on your device
3. Tap "Scan QR code"
4. Scan the QR code from the terminal

**Option B: Manual URL**

1. Note the URL shown in the terminal (e.g., `exp://192.168.1.100:8081`)
2. Open Expo Go on your device
3. Tap "Enter URL manually"
4. Enter the URL

### Troubleshooting Connection Issues

If the device cannot connect:

1. **Check firewall**: Ensure port 8081 is not blocked
2. **Use tunnel mode**:
   ```bash
   npm start -- --tunnel
   ```
3. **Check network**: Both devices must be on the same network
4. **Restart Expo Go**: Force close and reopen the app

---

## Running with Development Build

For features that require native modules (like Google OAuth), you may need a development build instead of Expo Go.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Configure EAS

```bash
eas login
eas build:configure
```

### Step 3: Create Development Build

```bash
# Build for Android (development)
eas build --profile development --platform android
```

### Step 4: Install and Run

1. Download the APK from the EAS dashboard
2. Install on your device/emulator
3. Start the development server:
   ```bash
   npm start --dev-client
   ```

---

## Key User Flows to Test

### 1. Import Flow

**Purpose**: Test importing transactions from CSV/OFX files

**Prerequisites**:

- Have a test CSV or OFX file ready on the device
- Sample CSV format:
  ```csv
  Date,Description,Amount
  2024-01-15,Grocery Store,-50.00
  2024-01-16,Salary,3000.00
  2024-01-17,Electric Bill,-120.00
  ```

**Test Steps**:

| Step | Action                         | Expected Result                                 |
| ---- | ------------------------------ | ----------------------------------------------- |
| 1    | Open the app                   | Dashboard screen is displayed                   |
| 2    | Tap the "+" or Import button   | Import screen opens as modal                    |
| 3    | Tap "Select File"              | Device file picker opens                        |
| 4    | Select a CSV or OFX file       | File is selected, name is displayed             |
| 5    | Tap "Import"                   | Progress screen shows import status             |
| 6    | Wait for import to complete    | Success message is displayed                    |
| 7    | Tap "Review Transactions"      | Review screen opens with imported transactions  |
| 8    | Verify transactions are listed | All transactions from file are shown            |
| 9    | Tap on a transaction           | Transaction detail modal opens                  |
| 10   | Select a category              | Category is assigned                            |
| 11   | Tap "Save"                     | Transaction is saved, removed from review queue |
| 12   | Navigate to Transactions tab   | Saved transaction appears in list               |

**Edge Cases to Test**:

- [ ] Import empty file
- [ ] Import file with invalid format
- [ ] Import file with duplicate transactions
- [ ] Import very large file (100+ transactions)
- [ ] Cancel import mid-process

---

### 2. Manual Entry Flow

**Purpose**: Test manually adding transactions

**Test Steps**:

| Step | Action                                | Expected Result                                                  |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| 1    | Navigate to Manual tab                | Manual Entry form is displayed                                   |
| 2    | Verify form fields                    | Date, Amount, Description, Category, Reference Month are visible |
| 3    | Select "Expense" type                 | Expense toggle is active                                         |
| 4    | Enter amount: "125.50"                | Amount is displayed with currency formatting                     |
| 5    | Enter description: "Grocery shopping" | Description is entered                                           |
| 6    | Tap category selector                 | Category picker opens                                            |
| 7    | Select "Food" category                | Category is selected and displayed                               |
| 8    | Tap "Save"                            | Success message appears, form resets                             |
| 9    | Navigate to Transactions tab          | New transaction appears in list                                  |
| 10   | Verify transaction details            | Amount, description, category match entered values               |

**Draft Auto-Save Test**:

| Step | Action                     | Expected Result                  |
| ---- | -------------------------- | -------------------------------- |
| 1    | Start filling the form     | Enter amount and description     |
| 2    | Wait 2-3 seconds           | Draft indicator appears          |
| 3    | Close the app (background) | App goes to background           |
| 4    | Reopen the app             | App resumes                      |
| 5    | Navigate to Manual tab     | Form data is restored from draft |
| 6    | Tap "Clear Draft"          | Form is reset, draft is cleared  |

**Validation Test**:

| Step | Action                                | Expected Result                           |
| ---- | ------------------------------------- | ----------------------------------------- |
| 1    | Leave amount empty                    | -                                         |
| 2    | Tap "Save"                            | Validation error for amount is shown      |
| 3    | Enter amount, leave description empty | -                                         |
| 4    | Tap "Save"                            | Validation error for description is shown |

---

### 3. Backup Flow

**Purpose**: Test Google Drive backup functionality

**Prerequisites**:

- Google account configured on device
- Network connectivity
- Google Play Services available (for emulator, use Google APIs image)

**Test Steps**:

| Step | Action                       | Expected Result                              |
| ---- | ---------------------------- | -------------------------------------------- |
| 1    | Navigate to Settings tab     | Settings screen is displayed                 |
| 2    | Tap "Backup"                 | Backup settings screen opens                 |
| 3    | Verify initial state         | "Not connected" status is shown              |
| 4    | Tap "Connect Google Account" | Google OAuth flow starts                     |
| 5    | Select Google account        | Account selection screen appears             |
| 6    | Grant permissions            | Permission dialog appears                    |
| 7    | Complete OAuth               | Returns to app, shows "Connected as [email]" |
| 8    | Tap frequency selector       | Frequency options appear                     |
| 9    | Select "Daily"               | Frequency is set to daily                    |
| 10   | Tap time selector            | Time picker appears                          |
| 11   | Select preferred time        | Time is set                                  |
| 12   | Tap "Backup Now"             | Progress indicator appears                   |
| 13   | Wait for backup              | Success message with timestamp               |
| 14   | Verify status                | "Last backup: [timestamp]" is displayed      |

**Restore Test**:

| Step | Action                    | Expected Result                         |
| ---- | ------------------------- | --------------------------------------- |
| 1    | Tap "Restore from Backup" | Backup list modal opens                 |
| 2    | Verify backups are listed | Available backups with timestamps shown |
| 3    | Select a backup           | Confirmation dialog appears             |
| 4    | Confirm restore           | Progress indicator appears              |
| 5    | Wait for restore          | Success message, app data is restored   |

**Disconnect Test**:

| Step | Action                          | Expected Result                       |
| ---- | ------------------------------- | ------------------------------------- |
| 1    | Tap "Disconnect"                | Confirmation dialog appears           |
| 2    | Confirm disconnect              | Account is disconnected               |
| 3    | Verify status                   | "Not connected" is displayed          |
| 4    | Verify "Backup Now" is disabled | Button is disabled without connection |

---

### 4. Navigation Flow

**Purpose**: Test navigation between all screens

**Test Steps**:

| Step | Action                     | Expected Result                      |
| ---- | -------------------------- | ------------------------------------ |
| 1    | Launch app                 | Dashboard is displayed (default tab) |
| 2    | Tap "Transactions" tab     | Transactions screen is displayed     |
| 3    | Tap "Review" tab           | Review screen is displayed           |
| 4    | Tap "Manual" tab           | Manual Entry screen is displayed     |
| 5    | Tap "Settings" tab         | Settings screen is displayed         |
| 6    | Tap "Language"             | Language settings screen opens       |
| 7    | Tap back button            | Returns to Settings main screen      |
| 8    | Tap "Backup"               | Backup settings screen opens         |
| 9    | Tap back button            | Returns to Settings main screen      |
| 10   | Tap "Categories"           | Categories management screen opens   |
| 11   | Tap back button            | Returns to Settings main screen      |
| 12   | Tap "Categorization Rules" | Rules management screen opens        |
| 13   | Tap back button            | Returns to Settings main screen      |
| 14   | Tap "Dashboard" tab        | Dashboard is displayed               |

**Review Badge Test**:

| Step | Action                                | Expected Result                      |
| ---- | ------------------------------------- | ------------------------------------ |
| 1    | Import transactions (see Import Flow) | Transactions are imported            |
| 2    | Check Review tab                      | Badge shows count of pending reviews |
| 3    | Review all transactions               | Badge count decreases                |
| 4    | Complete all reviews                  | Badge disappears                     |

**State Persistence Test**:

| Step | Action                        | Expected Result                                    |
| ---- | ----------------------------- | -------------------------------------------------- |
| 1    | Navigate to Settings > Backup | Backup screen is displayed                         |
| 2    | Tap Dashboard tab             | Dashboard is displayed                             |
| 3    | Tap Settings tab              | Backup screen is still displayed (state preserved) |

---

### 5. Language Switching Flow

**Purpose**: Test internationalization (i18n) functionality

**Test Steps**:

| Step | Action                      | Expected Result                           |
| ---- | --------------------------- | ----------------------------------------- |
| 1    | Navigate to Settings tab    | Settings screen in current language       |
| 2    | Tap "Language"              | Language settings screen opens            |
| 3    | Note current language       | Current selection is highlighted          |
| 4    | Select "Português (Brasil)" | Language changes to Portuguese            |
| 5    | Verify Settings screen      | "Configurações" is displayed              |
| 6    | Navigate to Dashboard       | "Painel" is displayed                     |
| 7    | Verify labels               | "Receitas", "Despesas", "Saldo" are shown |
| 8    | Navigate to Transactions    | "Lançamentos" is displayed                |
| 9    | Navigate to Review          | "Revisão" is displayed                    |
| 10   | Navigate to Manual          | "Lançamento Manual" is displayed          |
| 11   | Return to Language settings | "Idioma" is displayed                     |
| 12   | Select "English"            | Language changes to English               |
| 13   | Verify all screens          | English labels are displayed              |

**Persistence Test**:

| Step | Action                     | Expected Result            |
| ---- | -------------------------- | -------------------------- |
| 1    | Set language to Portuguese | Language is changed        |
| 2    | Close app completely       | App is terminated          |
| 3    | Reopen app                 | App launches               |
| 4    | Verify language            | Portuguese is still active |

---

## Automated E2E Testing

For automated testing, we use Maestro. See [MAESTRO.md](./MAESTRO.md) for detailed instructions.

### Quick Start

```bash
# Install Maestro (macOS)
brew tap mobile-dev-inc/tap
brew install maestro

# Run all E2E tests
npm run e2e

# Run specific tests
npm run e2e:smoke        # Basic smoke test
npm run e2e:import       # Import flow
npm run e2e:manual       # Manual entry flow
npm run e2e:backup       # Backup flow
npm run e2e:navigation   # Navigation flow
npm run e2e:language     # Language switching
```

---

## Troubleshooting

### App Won't Start

1. **Clear Metro cache**:

   ```bash
   npm start -- --clear
   ```

2. **Reset Expo cache**:

   ```bash
   npx expo start -c
   ```

3. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Emulator Issues

1. **Emulator not detected**:

   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

2. **App crashes on launch**:
   - Wipe emulator data and restart
   - Use a different API level

3. **Slow performance**:
   - Enable hardware acceleration in AVD settings
   - Allocate more RAM to emulator

### Database Issues

1. **Data not persisting**:
   - Check if database is initialized
   - Look for errors in console logs

2. **Migration errors**:
   - Clear app data and restart
   - Check migration files for syntax errors

### OAuth Issues

1. **Google Sign-In not working**:
   - Ensure Google Play Services is available
   - Check OAuth client IDs in app.json
   - Verify redirect URI configuration

2. **Token refresh failing**:
   - Clear secure storage
   - Re-authenticate with Google

### Network Issues

1. **Cannot connect to dev server**:
   - Check firewall settings
   - Use tunnel mode: `npm start -- --tunnel`
   - Verify same network connection

2. **Backup failing**:
   - Check network connectivity
   - Verify Google account permissions
   - Check Drive API quota

---

## Test Checklist

Use this checklist for comprehensive manual testing:

### Core Functionality

- [ ] App launches successfully
- [ ] Database initializes correctly
- [ ] All tabs are accessible
- [ ] Navigation works in all directions

### Import Flow

- [ ] File picker opens
- [ ] CSV files parse correctly
- [ ] OFX files parse correctly
- [ ] Duplicates are detected
- [ ] Import progress is shown
- [ ] Transactions appear in Review

### Manual Entry

- [ ] Form fields work correctly
- [ ] Validation prevents invalid submissions
- [ ] Draft auto-save works
- [ ] Draft restore works
- [ ] Transactions save successfully

### Review Flow

- [ ] Pending transactions are listed
- [ ] Category assignment works
- [ ] Description editing works
- [ ] Exclude from totals toggle works
- [ ] Badge count updates correctly

### Transactions

- [ ] Monthly view works
- [ ] Month navigation works
- [ ] Summary calculations are correct
- [ ] Transaction details are accessible
- [ ] Edit and delete work

### Dashboard

- [ ] Summary cards display correctly
- [ ] Charts render properly
- [ ] Category breakdown is accurate
- [ ] Month selector works

### Backup

- [ ] Google OAuth works
- [ ] Manual backup succeeds
- [ ] Backup status updates
- [ ] Restore works correctly
- [ ] Disconnect works

### Settings

- [ ] Language switching works
- [ ] Category management works
- [ ] Rules management works
- [ ] App version is displayed

### Internationalization

- [ ] Portuguese strings display correctly
- [ ] English strings display correctly
- [ ] Date formatting follows locale
- [ ] Currency formatting follows locale
- [ ] Language persists after restart

---

## Reporting Issues

When reporting issues, please include:

1. **Device/Emulator info**: Model, Android version, API level
2. **Steps to reproduce**: Detailed steps that led to the issue
3. **Expected behavior**: What should have happened
4. **Actual behavior**: What actually happened
5. **Screenshots/Videos**: Visual evidence if applicable
6. **Console logs**: Any error messages from the terminal

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Android Studio Setup](https://developer.android.com/studio/install)
- [Maestro E2E Testing](https://maestro.mobile.dev/)
