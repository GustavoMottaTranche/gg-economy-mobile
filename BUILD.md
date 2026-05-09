# EAS Build Guide

This document explains how to use Expo Application Services (EAS) Build to create builds for GG Economy Mobile.

## Prerequisites

1. **Install EAS CLI globally:**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account:**

   ```bash
   eas login
   ```

3. **Configure your project (first time only):**
   ```bash
   eas build:configure
   ```
   This will update `app.json` with your EAS project ID.

## Build Profiles

The project has three build profiles configured in `eas.json`:

### Development

For local development with the Expo dev client.

- **Distribution:** Internal (direct install)
- **Android:** APK format for easy installation
- **iOS:** Simulator build

```bash
# Build for all platforms
npm run build:dev

# Build for Android only
npm run build:dev:android

# Build for iOS only
npm run build:dev:ios

# Build locally (Android only, requires Android SDK)
npm run build:local:android
```

### Preview

For internal testing and QA builds.

- **Distribution:** Internal (direct install via link)
- **Android:** APK format
- **iOS:** Internal distribution (requires Apple Developer account)
- **Update Channel:** `preview` (for OTA updates)

```bash
# Build for all platforms
npm run build:preview

# Build for Android only
npm run build:preview:android

# Build for iOS only
npm run build:preview:ios
```

### Production

For app store releases.

- **Distribution:** Store (Google Play / App Store)
- **Android:** AAB (Android App Bundle) format
- **iOS:** Store distribution
- **Update Channel:** `production` (for OTA updates)
- **Auto Increment:** Version numbers auto-increment

```bash
# Build for all platforms
npm run build:prod

# Build for Android only
npm run build:prod:android

# Build for iOS only
npm run build:prod:ios
```

## Submitting to Stores

### Android (Google Play)

1. Create a Google Play Console service account and download the JSON key
2. Save it as `google-service-account.json` in the project root
3. Run:
   ```bash
   npm run submit:android
   ```

### iOS (App Store)

1. Update `eas.json` with your Apple ID and App Store Connect App ID
2. Run:
   ```bash
   npm run submit:ios
   ```

## Environment Variables

Each build profile sets an `APP_ENV` environment variable:

- `development` → `APP_ENV=development`
- `preview` → `APP_ENV=preview`
- `production` → `APP_ENV=production`

You can access this in your app to conditionally enable features.

## Configuration Files

- **`eas.json`** - EAS Build configuration with all profiles
- **`app.json`** - Expo app configuration with bundle identifiers and permissions

## First-Time Setup Checklist

1. [ ] Install EAS CLI: `npm install -g eas-cli`
2. [ ] Login to Expo: `eas login`
3. [ ] Configure project: `eas build:configure`
4. [ ] Update `app.json` with your EAS project ID
5. [ ] For Android production: Set up Google Play Console service account
6. [ ] For iOS: Set up Apple Developer account and App Store Connect

## Troubleshooting

### Build fails with credential errors

- For Android: Ensure your keystore is properly configured or let EAS manage it
- For iOS: Ensure your Apple Developer account is connected via `eas credentials`

### Build takes too long

- Use `--local` flag for Android development builds if you have Android SDK installed
- Consider using EAS Build's caching features

### OTA Updates not working

- Ensure you're using the correct channel for your build profile
- Check that `expo-updates` is properly configured

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Manage credentials
eas credentials

# Update EAS CLI
npm install -g eas-cli@latest
```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Expo Updates Documentation](https://docs.expo.dev/eas-update/introduction/)
