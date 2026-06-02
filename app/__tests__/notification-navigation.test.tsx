/**
 * Notification Navigation Integration Tests
 *
 * Tests for notification tap navigation and notification received handling.
 * Validates:
 * - Notification tap opens app and navigates to Manual Entry screen
 * - Notification received listener calls handleNotificationReceived
 *
 * **Validates: Requirements 4.3, 3.2**
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Store callbacks for simulating notification events
let notificationReceivedCallback: ((notification: unknown) => void) | null = null;
let notificationResponseCallback: ((response: unknown) => void) | null = null;

// Mock expo-notifications
const mockSetNotificationHandler = jest.fn();
const mockAddNotificationReceivedListener = jest.fn((callback) => {
  notificationReceivedCallback = callback;
  return { remove: jest.fn() };
});
const mockAddNotificationResponseReceivedListener = jest.fn((callback) => {
  notificationResponseCallback = callback;
  return { remove: jest.fn() };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: (...args: unknown[]) => mockSetNotificationHandler(...args),
  addNotificationReceivedListener: (callback: (notification: unknown) => void) =>
    mockAddNotificationReceivedListener(callback),
  addNotificationResponseReceivedListener: (callback: (response: unknown) => void) =>
    mockAddNotificationResponseReceivedListener(callback),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Stack: {
    Screen: ({ children }: { children?: React.ReactNode }) => children ?? null,
  },
}));

// Mock notification scheduler
const mockHandleNotificationReceived = jest.fn();
const mockHandleSlotNotificationReceived = jest.fn();
const mockRestore = jest.fn();

jest.mock('../../src/services/notifications', () => ({
  notificationScheduler: {
    handleNotificationReceived: () => mockHandleNotificationReceived(),
    handleSlotNotificationReceived: (slotHour: number, slotMinute: number) =>
      mockHandleSlotNotificationReceived(slotHour, slotMinute),
    restore: (...args: unknown[]) => mockRestore(...args),
    scheduleNext: jest.fn(() => Promise.resolve('notification-id')),
    cancelAll: jest.fn(() => Promise.resolve()),
    calculateNextTime: jest.fn(() => null),
  },
}));

// Mock notification store
const mockNotificationSettings = {
  isEnabled: true,
  frequency: 'daily' as const,
  preferredHour: 9,
  preferredMinute: 0,
  scheduledNotificationId: null,
  lastDeliveryTime: null,
};

jest.mock('../../src/stores/notificationStore', () => ({
  useNotificationStore: () => ({
    settings: mockNotificationSettings,
    isHydrated: true,
  }),
  useNotificationSettings: () => mockNotificationSettings,
  useNotificationPermission: () => ({
    permissionStatus: 'granted',
    setPermissionStatus: jest.fn(),
  }),
}));

// Mock database provider
jest.mock('../../src/db', () => ({
  DatabaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock error boundary
jest.mock('../../src/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock toast container
jest.mock('../../src/components/Toast', () => ({
  ToastContainer: () => null,
}));

// Mock i18n
jest.mock('../../src/i18n', () => ({
  initializeI18n: jest.fn().mockResolvedValue(undefined),
  isI18nInitialized: jest.fn(() => true),
}));

// Mock useAppStateCleanup hook
jest.mock('../../src/hooks', () => ({
  useAppStateCleanup: jest.fn(),
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

/**
 * Test component that simulates the AppContent behavior from _layout.tsx
 * This isolates the notification listener setup for testing
 */
function TestAppContent({ includeHandler = false }: { includeHandler?: boolean } = {}) {
  const { useRouter } = require('expo-router');
  const router = useRouter();
  const { notificationScheduler } = require('../../src/services/notifications');
  const { useNotificationStore } = require('../../src/stores/notificationStore');
  const { settings, isHydrated } = useNotificationStore();
  const Notifications = require('expo-notifications');

  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    if (isHydrated) {
      notificationScheduler.restore(settings);
    }
  }, [isHydrated, settings]);

  React.useEffect(() => {
    // Configure foreground notification behavior (matches _layout.tsx)
    if (includeHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }

    // Listener for when notification is received while app is foregrounded
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification: {
        request?: { content?: { data?: { slotHour?: number; slotMinute?: number } } };
      }) => {
        const data = notification?.request?.content?.data;
        if (data && typeof data.slotHour === 'number' && typeof data.slotMinute === 'number') {
          notificationScheduler.handleSlotNotificationReceived(data.slotHour, data.slotMinute);
        } else {
          notificationScheduler.handleNotificationReceived();
        }
      }
    );

    // Listener for when user taps on notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/manual');
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router, includeHandler]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <View testID="test-app-content">
      <Text>Test App Content</Text>
    </View>
  );
}

describe('Notification Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationReceivedCallback = null;
    notificationResponseCallback = null;
  });

  describe('Notification Tap Navigation - Requirement 4.3', () => {
    it('sets up notification response listener on mount', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
      });
    });

    it('navigates to manual entry when notification is tapped', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationResponseCallback).not.toBeNull();
      });

      // Simulate notification tap
      notificationResponseCallback?.({
        notification: {
          request: {
            content: {
              title: 'Test Notification',
              body: 'Test body',
            },
          },
        },
        actionIdentifier: 'default',
      });

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/manual');
    });

    it('navigates to manual entry regardless of notification content', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationResponseCallback).not.toBeNull();
      });

      // Simulate notification tap with minimal data
      notificationResponseCallback?.({ notification: {} });

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/manual');
    });

    it('cleans up notification response listener on unmount', async () => {
      const mockRemove = jest.fn();
      mockAddNotificationResponseReceivedListener.mockReturnValueOnce({
        remove: mockRemove,
      });

      const { unmount } = render(<TestAppContent />);

      await waitFor(() => {
        expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Notification Received Handling - Requirement 3.2', () => {
    it('sets up notification received listener on mount', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(mockAddNotificationReceivedListener).toHaveBeenCalled();
      });
    });

    it('calls handleNotificationReceived when notification is received', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate notification received
      notificationReceivedCallback?.({
        request: {
          content: {
            title: 'Test Notification',
            body: 'Test body',
          },
        },
      });

      expect(mockHandleNotificationReceived).toHaveBeenCalled();
    });

    it('calls handleNotificationReceived for any notification', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate notification received with minimal data
      notificationReceivedCallback?.({ request: {} });

      expect(mockHandleNotificationReceived).toHaveBeenCalled();
    });

    it('calls handleSlotNotificationReceived when slotHour and slotMinute are present', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate notification received with slot data in payload
      notificationReceivedCallback?.({
        request: {
          content: {
            data: {
              slotHour: 14,
              slotMinute: 30,
            },
          },
        },
      });

      expect(mockHandleSlotNotificationReceived).toHaveBeenCalledWith(14, 30);
      expect(mockHandleNotificationReceived).not.toHaveBeenCalled();
    });

    it('calls handleNotificationReceived when only slotHour is present (no slotMinute)', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate notification with only slotHour (missing slotMinute)
      notificationReceivedCallback?.({
        request: {
          content: {
            data: {
              slotHour: 9,
            },
          },
        },
      });

      expect(mockHandleNotificationReceived).toHaveBeenCalled();
      expect(mockHandleSlotNotificationReceived).not.toHaveBeenCalled();
    });

    it('calls handleNotificationReceived when data is missing', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate notification with no data field
      notificationReceivedCallback?.({
        request: {
          content: {},
        },
      });

      expect(mockHandleNotificationReceived).toHaveBeenCalled();
      expect(mockHandleSlotNotificationReceived).not.toHaveBeenCalled();
    });

    it('cleans up notification received listener on unmount', async () => {
      const mockRemove = jest.fn();
      mockAddNotificationReceivedListener.mockReturnValueOnce({
        remove: mockRemove,
      });

      const { unmount } = render(<TestAppContent />);

      await waitFor(() => {
        expect(mockAddNotificationReceivedListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('App Startup Notification Restoration - Requirement 3.3, 3.4, 8.2', () => {
    it('restores notification schedule when store is hydrated', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(mockRestore).toHaveBeenCalledWith(mockNotificationSettings);
      });
    });

    it('passes current settings to restore function', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(mockRestore).toHaveBeenCalledWith(
          expect.objectContaining({
            isEnabled: true,
            frequency: 'daily',
            preferredHour: 9,
            preferredMinute: 0,
          })
        );
      });
    });
  });

  describe('Foreground Notification Handler Configuration', () => {
    it('configures notification handler for foreground notifications', async () => {
      render(<TestAppContent includeHandler={true} />);

      await waitFor(() => {
        expect(mockSetNotificationHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            handleNotification: expect.any(Function),
          })
        );
      });
    });

    it('notification handler returns correct configuration', async () => {
      let handlerConfig: {
        handleNotification: () => Promise<{
          shouldShowBanner: boolean;
          shouldShowList: boolean;
          shouldPlaySound: boolean;
          shouldSetBadge: boolean;
        }>;
      } | null = null;

      mockSetNotificationHandler.mockImplementationOnce((config) => {
        handlerConfig = config;
      });

      render(<TestAppContent includeHandler={true} />);

      await waitFor(() => {
        expect(handlerConfig).not.toBeNull();
      });

      const result = await handlerConfig!.handleNotification();

      expect(result).toEqual({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      });
    });
  });

  describe('Multiple Notification Events', () => {
    it('handles multiple notification taps correctly', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationResponseCallback).not.toBeNull();
      });

      // Simulate multiple notification taps
      notificationResponseCallback?.({ notification: {} });
      notificationResponseCallback?.({ notification: {} });
      notificationResponseCallback?.({ notification: {} });

      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/manual');
    });

    it('handles multiple notification received events correctly', async () => {
      render(<TestAppContent />);

      await waitFor(() => {
        expect(notificationReceivedCallback).not.toBeNull();
      });

      // Simulate multiple notifications received
      notificationReceivedCallback?.({ request: {} });
      notificationReceivedCallback?.({ request: {} });

      expect(mockHandleNotificationReceived).toHaveBeenCalledTimes(2);
    });
  });
});
