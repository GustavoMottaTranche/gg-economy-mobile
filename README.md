# GG-Economy Mobile

[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-55-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-61dafb.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Personal finance mobile app for importing, categorizing, and tracking financial transactions. Built with an **offline-first** architecture — all data is stored locally on your device with optional Google Drive backup.

## ✨ Features

- **📥 Import Transactions** — Load bank statements from CSV and OFX files
- **🏷️ Smart Categorization** — Automatic category suggestions with customizable rules
- **📊 Dashboard** — Visual summary with charts and category breakdowns
- **📝 Manual Entry** — Add transactions manually with draft auto-save
- **☁️ Google Drive Backup** — Optional scheduled or manual backup to the cloud
- **🌐 Internationalization** — Available in Portuguese (pt-BR) and English

## 📱 Platform Support

| Platform | Status                    |
| -------- | ------------------------- |
| Android  | ✅ Primary (v1)           |
| iOS      | 🔜 Future (same codebase) |

## 🛠️ Tech Stack

| Component            | Technology                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | [Expo SDK 55](https://expo.dev/) + [React Native 0.83](https://reactnative.dev/)                                                                               |
| Language             | [TypeScript 5.9](https://www.typescriptlang.org/)                                                                                                              |
| Database             | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team/)                                                    |
| Navigation           | [Expo Router v55](https://docs.expo.dev/router/introduction/)                                                                                                  |
| State Management     | [Zustand](https://zustand-demo.pmnd.rs/)                                                                                                                       |
| Internationalization | [i18next](https://www.i18next.com/) + [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/)                                             |
| Testing              | [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) + [fast-check](https://fast-check.dev/) |
| E2E Testing          | [Maestro](https://maestro.mobile.dev/)                                                                                                                         |

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Android Studio** ([Download](https://developer.android.com/studio)) — for Android emulator
- **Expo Go** app ([Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)) — for physical device testing

### Verify Installation

```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gg-economy-mobile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run on Android Emulator

First, start an Android emulator via Android Studio:

1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Click the play button next to your AVD

Then start the app:

```bash
npm run android
```

### 4. Run on Physical Device

1. Install **Expo Go** from Google Play Store
2. Ensure your phone and computer are on the same Wi-Fi network
3. Start the development server:

```bash
npm start
```

4. Scan the QR code with Expo Go

## 📜 Available Scripts

### Development

| Script            | Description                       |
| ----------------- | --------------------------------- |
| `npm start`       | Start Expo development server     |
| `npm run android` | Run on Android emulator/device    |
| `npm run ios`     | Run on iOS simulator (macOS only) |
| `npm run web`     | Run in web browser                |

### Testing

| Script                  | Description                    |
| ----------------------- | ------------------------------ |
| `npm test`              | Run unit tests                 |
| `npm run test:watch`    | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage report |

### Code Quality

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | Run ESLint                      |
| `npm run lint:fix`     | Fix ESLint errors automatically |
| `npm run format`       | Format code with Prettier       |
| `npm run format:check` | Check code formatting           |
| `npm run typecheck`    | Run TypeScript type checking    |

### Database

| Script                | Description                 |
| --------------------- | --------------------------- |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate`  | Run database migrations     |
| `npm run db:studio`   | Open Drizzle Studio         |

### E2E Testing (Maestro)

| Script                    | Description                        |
| ------------------------- | ---------------------------------- |
| `npm run e2e`             | Run all E2E tests                  |
| `npm run e2e:smoke`       | Run smoke tests                    |
| `npm run e2e:import`      | Run import flow tests              |
| `npm run e2e:import:mock` | Run mock import flow (CI-friendly) |
| `npm run e2e:manual`      | Run manual entry tests             |
| `npm run e2e:backup`      | Run backup flow tests              |
| `npm run e2e:backup:mock` | Run mock backup flow (CI-friendly) |
| `npm run e2e:navigation`  | Run navigation tests               |
| `npm run e2e:language`    | Run language switching tests       |
| `npm run e2e:studio`      | Open Maestro Studio                |

### Build (EAS)

| Script                          | Description                        |
| ------------------------------- | ---------------------------------- |
| `npm run build:dev`             | Development build (all platforms)  |
| `npm run build:dev:android`     | Development build (Android)        |
| `npm run build:preview`         | Preview/QA build (all platforms)   |
| `npm run build:preview:android` | Preview build (Android)            |
| `npm run build:prod`            | Production build (all platforms)   |
| `npm run build:prod:android`    | Production build (Android)         |
| `npm run build:local:android`   | Local Android build (requires SDK) |
| `npm run submit:android`        | Submit to Google Play              |
| `npm run submit:ios`            | Submit to App Store                |

## 📁 Project Structure

```
gg-economy-mobile/
├── app/                      # Expo Router screens
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── index.tsx         # Dashboard (home)
│   │   ├── transactions.tsx  # Transactions list
│   │   ├── review.tsx        # Review imported transactions
│   │   ├── manual.tsx        # Manual entry form
│   │   └── settings/         # Settings stack
│   │       ├── index.tsx     # Settings main
│   │       ├── backup.tsx    # Backup settings
│   │       ├── language.tsx  # Language settings
│   │       ├── categories.tsx # Category management
│   │       └── rules.tsx     # Categorization rules
│   ├── import/               # Import flow modal
│   └── transaction/          # Transaction detail modal
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── charts/           # Chart components
│   │   ├── dashboard/        # Dashboard components
│   │   └── ui/               # Base UI components
│   ├── db/                   # Database layer
│   │   ├── schema.ts         # Drizzle schema
│   │   ├── client.ts         # Database client
│   │   ├── queries/          # Query functions
│   │   └── migrations/       # Schema migrations
│   ├── services/             # Business logic services
│   │   ├── import/           # CSV/OFX parsers
│   │   ├── backup/           # Google Drive backup
│   │   └── categorization/   # Auto-categorization
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand stores
│   ├── i18n/                 # Internationalization
│   │   └── locales/          # Translation files
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   └── constants/            # App constants
├── assets/                   # Images and icons
├── .maestro/                 # E2E test flows
└── drizzle/                  # Generated migrations
```

## 🧪 Testing

### Unit Tests

Unit tests are written with Jest and React Native Testing Library:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Property-Based Tests

Property-based tests use [fast-check](https://fast-check.dev/) to verify invariants:

- CSV/OFX parsing round-trip
- Financial calculation invariants
- Date formatting consistency
- Dedupe engine idempotence
- Backup/restore round-trip

### E2E Tests

E2E tests use [Maestro](https://maestro.mobile.dev/). See [MAESTRO.md](./MAESTRO.md) for detailed setup and usage.

```bash
# Install Maestro (macOS)
brew tap mobile-dev-inc/tap
brew install maestro

# Run all E2E tests
npm run e2e
```

For comprehensive manual testing instructions, see [TESTING.md](./TESTING.md).

## 🏗️ Building for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for creating production builds.

### Quick Start

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time)
eas build:configure

# Create production build
npm run build:prod:android
```

For detailed build instructions, profiles, and store submission, see [BUILD.md](./BUILD.md).

## 🌐 Internationalization

The app supports the following languages:

| Language            | Locale Code |
| ------------------- | ----------- |
| Portuguese (Brazil) | `pt-BR`     |
| English             | `en`        |

The app automatically detects the device language. Users can override this in **Settings > Language**.

### Adding Translations

Translation files are located in `src/i18n/locales/`:

```
src/i18n/locales/
├── pt-BR.json
└── en.json
```

## 🔒 Privacy & Security

- **Offline-first**: All data is stored locally on your device
- **No account required**: No login, no registration
- **Secure token storage**: OAuth tokens stored in Android Keystore
- **Optional backup**: Google Drive backup is opt-in only
- **No telemetry**: No data is sent to external servers

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ using <a href="https://expo.dev/">Expo</a> and <a href="https://reactnative.dev/">React Native</a>
</p>
