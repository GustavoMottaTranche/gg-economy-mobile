/**
 * Root Layout for GG-Economy Mobile
 *
 * This is the root layout that wraps the entire app with:
 * - DatabaseProvider for SQLite/Drizzle initialization
 * - i18n initialization for internationalization
 * - ErrorBoundary for error handling
 * - ToastContainer for notifications
 * - Splash screen management
 * - App state cleanup for security
 * - Notification handlers for foreground and tap handling
 * - Notification schedule restoration on app startup
 * - Language change listener for notification content updates
 *
 * **Validates: Requirements 28, 30, 34, 3.2, 3.3, 3.4, 4.3, 7.4, 8.2**
 */
import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DatabaseProvider } from '../src/db';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastContainer } from '../src/components/Toast';
import { initializeI18n, isI18nInitialized, i18n } from '../src/i18n';
import { useAppStateCleanup } from '../src/hooks';
import { notificationScheduler } from '../src/services/notifications';
import { useNotificationStore } from '../src/stores/notificationStore';
import { useThemeStore } from '../src/stores/themeStore';

// Check if running in Expo Go (notifications not supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Keep the splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

/**
 * App initialization wrapper that handles i18n setup
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
  const [i18nReady, setI18nReady] = useState(isI18nInitialized());

  useEffect(() => {
    async function initialize() {
      if (!isI18nInitialized()) {
        try {
          await initializeI18n();
          setI18nReady(true);
        } catch (error) {
          console.error('[AppInitializer] Failed to initialize i18n:', error);
          // Still set ready to true to allow app to render with fallback
          setI18nReady(true);
        }
      }
    }

    initialize();
  }, []);

  if (!i18nReady) {
    // Return null while initializing - splash screen is still visible
    return null;
  }

  return <>{children}</>;
}

/**
 * Main app content with navigation
 */
function AppContent() {
  const { t } = useTranslation();
  const router = useRouter();

  // Theme-aware status bar style: light-content for dark mode, dark-content for light mode
  // Subscribes to resolvedScheme so status bar updates reactively within 500ms of theme change
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const statusBarStyle = resolvedScheme === 'dark' ? 'light' : 'dark';

  // Get notification store state for restoration on app startup
  const { settings, isHydrated } = useNotificationStore();

  // Initialize app state cleanup for security
  // This clears sensitive in-memory data when app goes to background
  useAppStateCleanup({
    clearInMemoryTokensOnBackground: true,
    clearDraftDataOnBackground: true, // Clear draft data containing financial info
    clearBackupStatusOnBackground: false, // Keep backup status for UX
  });

  // Restore notification schedule on app startup
  // Waits for store hydration, then verifies/restores scheduled notifications
  // Handles case where scheduled time has passed by scheduling next valid time
  // **Validates: Requirements 3.3, 3.4, 8.2**
  // Skip if running in Expo Go (notifications not supported)
  useEffect(() => {
    if (isHydrated && !isExpoGo) {
      notificationScheduler.restore(settings);
    }
  }, [isHydrated, settings]);

  // Set up notification listeners for foreground delivery and tap handling
  // Skip if running in Expo Go (notifications not supported)
  useEffect(() => {
    if (isExpoGo) {
      // Notifications not supported in Expo Go since SDK 53
      return;
    }

    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    // Dynamically import and set up notifications
    import('expo-notifications')
      .then((Notifications) => {
        // Configure foreground notification behavior
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // Listener for when notification is received while app is foregrounded
        // This triggers auto-rescheduling of the next notification
        // For multi-slot mode, detects slotHour/slotMinute in payload to reschedule the specific slot
        receivedSubscription = Notifications.addNotificationReceivedListener(
          (notification: { request?: { content?: { data?: { slotHour?: number; slotMinute?: number } } } }) => {
            const data = notification?.request?.content?.data;
            if (data && typeof data.slotHour === 'number' && typeof data.slotMinute === 'number') {
              notificationScheduler.handleSlotNotificationReceived(data.slotHour, data.slotMinute);
            } else {
              notificationScheduler.handleNotificationReceived();
            }
          }
        );

        // Listener for when user taps on notification
        // Navigate to Manual Entry screen for quick data input
        responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          router.push('/(tabs)/manual');
        });
      })
      .catch((error) => {
        console.warn('[AppContent] Failed to load expo-notifications:', error);
      });

    // Clean up listeners on unmount
    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [router]);

  // Listen for language changes and reschedule notifications with new locale content
  // When language changes, if notifications are enabled, reschedule with new locale
  // **Validates: Requirements 7.4**
  // Skip if running in Expo Go (notifications not supported)
  useEffect(() => {
    if (isExpoGo) return;

    const handleLanguageChange = async () => {
      // Only reschedule if notifications are enabled
      if (settings.isEnabled && settings.frequency !== 'disabled') {
        await notificationScheduler.cancelAll();
        await notificationScheduler.scheduleNext(settings);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [settings]);

  const onLayoutRootView = useCallback(async () => {
    // Hide splash screen once the app is ready
    await SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style={statusBarStyle} />
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="import"
          options={{
            presentation: 'modal',
            headerShown: false,
            // Import routes are deprecated - they redirect to manual entry
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            presentation: 'modal',
            title: t('transactions.editTransaction'),
            headerShown: true,
            headerStyle: {
              backgroundColor: resolvedScheme === 'dark' ? '#1C1C1E' : '#F5F5F7',
            },
            headerTintColor: resolvedScheme === 'dark' ? '#FFFFFF' : '#1C1C1E',
          }}
        />
        <Stack.Screen
          name="weekly-recurring"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <ToastContainer />
    </View>
  );
}

/**
 * Root layout component
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AppInitializer>
            <DatabaseProvider>
              <AppContent />
            </DatabaseProvider>
          </AppInitializer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
