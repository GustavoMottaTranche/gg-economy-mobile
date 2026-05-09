/**
 * Notification Settings Screen Tests
 *
 * Tests for the Notification Settings screen component.
 * Validates:
 * - All frequency options are displayed
 * - Time picker is present and functional
 * - Permission denied banner shows when appropriate
 * - Controls are disabled when permission denied
 * - Enable toggle triggers permission request on first enable
 *
 * **Validates: Requirements 1.1, 2.1, 5.2, 5.3**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// Mock react-native-safe-area-context
jest.mock(
  'react-native-safe-area-context',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
      SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
        React.createElement(View, props, children),
      SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
  },
  { virtual: true }
);

// Mock expo-notifications
jest.mock(
  'expo-notifications',
  () => ({
    getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
    cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    PermissionStatus: {
      GRANTED: 'granted',
      DENIED: 'denied',
      UNDETERMINED: 'undetermined',
    },
    SchedulableTriggerInputTypes: {
      TIME_INTERVAL: 'timeInterval',
    },
  }),
  { virtual: true }
);

// Mock notification settings hook
const mockSetEnabled = jest.fn();
const mockSetFrequency = jest.fn();
const mockSetPreferredTime = jest.fn();
const mockSetScheduledNotificationId = jest.fn();
const mockRecordDelivery = jest.fn();

const defaultUseNotificationSettingsReturn = {
  isEnabled: false,
  frequency: 'disabled' as const,
  preferredHour: 9,
  preferredMinute: 0,
  scheduledNotificationId: null as string | null,
  lastDeliveryTime: null as string | null,
  setEnabled: mockSetEnabled,
  setFrequency: mockSetFrequency,
  setPreferredTime: mockSetPreferredTime,
  setScheduledNotificationId: mockSetScheduledNotificationId,
  recordDelivery: mockRecordDelivery,
};

let mockUseNotificationSettingsReturn = { ...defaultUseNotificationSettingsReturn };

// Mock notification permission hook
const mockSetPermissionStatus = jest.fn();

const defaultUseNotificationPermissionReturn = {
  permissionStatus: 'undetermined' as 'granted' | 'denied' | 'undetermined',
  setPermissionStatus: mockSetPermissionStatus,
};

let mockUseNotificationPermissionReturn = { ...defaultUseNotificationPermissionReturn };

jest.mock('../../src/stores/notificationStore', () => ({
  useNotificationSettings: () => mockUseNotificationSettingsReturn,
  useNotificationPermission: () => mockUseNotificationPermissionReturn,
}));

// Mock permissionHandler service
const mockCheckPermission = jest.fn();
const mockRequestPermission = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock('../../src/services/notifications/PermissionHandler', () => ({
  permissionHandler: {
    checkPermission: () => mockCheckPermission(),
    requestPermission: () => mockRequestPermission(),
    openSettings: () => mockOpenSettings(),
  },
}));

// Mock notificationScheduler service
const mockScheduleNext = jest.fn();
const mockCancelAll = jest.fn();
const mockCalculateNextTime = jest.fn();

jest.mock('../../src/services/notifications/NotificationScheduler', () => ({
  notificationScheduler: {
    scheduleNext: (...args: unknown[]) => mockScheduleNext(...args),
    cancelAll: () => mockCancelAll(),
    calculateNextTime: (...args: unknown[]) => mockCalculateNextTime(...args),
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'notifications.settingsTitle': 'Notifications',
        'notifications.enabled': 'Enabled',
        'notifications.disabled': 'Disabled',
        'notifications.frequency': 'Frequency',
        'notifications.frequencyDaily': 'Daily',
        'notifications.frequencyEvery2Days': 'Every 2 days',
        'notifications.frequencyEvery3Days': 'Every 3 days',
        'notifications.frequencyWeekly': 'Weekly',
        'notifications.frequencyDisabled': 'Disabled',
        'notifications.preferredTime': 'Preferred Time',
        'notifications.selectTime': 'Select Time',
        'notifications.nextNotification': 'Next Notification',
        'notifications.permissionDenied':
          'Notifications are disabled at the system level. Enable them in settings to receive reminders.',
        'notifications.openSettings': 'Open Settings',
        'notifications.settingsDescription':
          'Receive periodic reminders to update your financial data',
        'common.close': 'Close',
        'common.cancel': 'Cancel',
        'common.done': 'Done',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Import the component after mocks
import NotificationSettingsScreen from '../(tabs)/settings/notifications';

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationSettingsReturn = { ...defaultUseNotificationSettingsReturn };
    mockUseNotificationPermissionReturn = { ...defaultUseNotificationPermissionReturn };
    mockCheckPermission.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('granted');
    mockOpenSettings.mockResolvedValue(undefined);
    mockScheduleNext.mockResolvedValue('notification-id-123');
    mockCancelAll.mockResolvedValue(undefined);
    mockCalculateNextTime.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('renders the notification settings screen', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-settings-screen')).toBeTruthy();
      });
    });

    it('renders the enable/disable toggle section', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle-section')).toBeTruthy();
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });
    });

    it('renders the frequency selector', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
        // 'Frequency' appears twice (section title and selector label)
        expect(screen.getAllByText('Frequency').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the time selector', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('time-selector')).toBeTruthy();
        expect(screen.getByText('Preferred Time')).toBeTruthy();
      });
    });
  });

  describe('Frequency Options Display - Requirement 1.1', () => {
    beforeEach(() => {
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'daily',
      };
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };
    });

    it('displays current frequency value', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Daily')).toBeTruthy();
      });
    });

    it('opens frequency modal when pressed', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-modal')).toBeTruthy();
      });
    });

    it('shows all frequency options in modal', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-option-daily')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-every2days')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-every3days')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-weekly')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-disabled')).toBeTruthy();
      });
    });

    it('displays all frequency option labels correctly', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        // 'Daily' appears twice (current value + option), so use getAllByText
        expect(screen.getAllByText('Daily').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Every 2 days')).toBeTruthy();
        expect(screen.getByText('Every 3 days')).toBeTruthy();
        expect(screen.getByText('Weekly')).toBeTruthy();
        // 'Disabled' appears multiple times (current value + option)
        expect(screen.getAllByText('Disabled').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('calls setFrequency when option is selected', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-option-weekly')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-option-weekly'));

      expect(mockSetFrequency).toHaveBeenCalledWith('weekly');
    });
  });

  describe('Time Picker - Requirement 2.1', () => {
    beforeEach(() => {
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'daily',
        preferredHour: 14,
        preferredMinute: 30,
      };
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };
    });

    it('displays current preferred time', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('14:30')).toBeTruthy();
      });
    });

    it('opens time modal when pressed', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('time-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('time-modal')).toBeTruthy();
      });
    });

    it('shows hour options in time modal', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        // Check for visible hour options (FlatList virtualizes, so only nearby hours are rendered)
        // With preferredHour=14, we should see hours around 14
        expect(screen.getByTestId('hour-option-12')).toBeTruthy();
        expect(screen.getByTestId('hour-option-14')).toBeTruthy();
        expect(screen.getByTestId('hour-option-16')).toBeTruthy();
      });
    });

    it('shows minute options in time modal', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('minute-option-0')).toBeTruthy();
        expect(screen.getByTestId('minute-option-15')).toBeTruthy();
        expect(screen.getByTestId('minute-option-30')).toBeTruthy();
        expect(screen.getByTestId('minute-option-45')).toBeTruthy();
      });
    });

    it('calls setPreferredTime when time is confirmed', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        // Use a visible hour option (around preferredHour=14)
        expect(screen.getByTestId('hour-option-15')).toBeTruthy();
      });

      // Select hour (use a visible one)
      fireEvent.press(screen.getByTestId('hour-option-15'));
      // Select minute
      fireEvent.press(screen.getByTestId('minute-option-15'));
      // Confirm
      fireEvent.press(screen.getByTestId('confirm-time-modal'));

      expect(mockSetPreferredTime).toHaveBeenCalledWith(15, 15);
    });

    it('closes time modal on cancel without saving', async () => {
      render(<NotificationSettingsScreen />);

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('time-modal')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('cancel-time-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('time-modal')).toBeNull();
      });

      expect(mockSetPreferredTime).not.toHaveBeenCalled();
    });

    it('is disabled when frequency is disabled', async () => {
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'disabled',
      };
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('time-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Permission Denied Banner - Requirement 5.2', () => {
    beforeEach(() => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'denied',
      };
    });

    it('shows permission denied banner when permission is denied', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('permission-denied-banner')).toBeTruthy();
      });
    });

    it('displays permission denied message', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Notifications are disabled at the system level. Enable them in settings to receive reminders.'
          )
        ).toBeTruthy();
      });
    });

    it('shows Open Settings button in banner', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('open-settings-button')).toBeTruthy();
        expect(screen.getByText('Open Settings')).toBeTruthy();
      });
    });

    it('calls openSettings when Open Settings button is pressed - Requirement 5.3', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('open-settings-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('open-settings-button'));

      await waitFor(() => {
        expect(mockOpenSettings).toHaveBeenCalled();
      });
    });

    it('does not show banner when permission is granted', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('permission-denied-banner')).toBeNull();
      });
    });

    it('does not show banner when permission is undetermined', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'undetermined',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('permission-denied-banner')).toBeNull();
      });
    });
  });

  describe('Controls Disabled When Permission Denied - Requirement 5.2, 5.3', () => {
    beforeEach(() => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'denied',
      };
    });

    it('disables notification toggle when permission denied', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const toggle = screen.getByTestId('notification-toggle');
        expect(toggle.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('disables frequency selector when permission denied', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('frequency-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('disables time selector when permission denied', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('time-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('disables frequency selector when notifications are disabled', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: false,
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('frequency-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Enable Toggle Permission Request', () => {
    beforeEach(() => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'undetermined',
      };
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: false,
      };
    });

    it('requests permission when enabling for the first time', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', true);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('enables notifications when permission is granted', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', true);

      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('does not enable notifications when permission is denied', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', true);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });

      // setEnabled should not be called with true when permission denied
      expect(mockSetEnabled).not.toHaveBeenCalledWith(true);
    });

    it('does not request permission when already granted', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', true);

      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(true);
      });

      // Should not request permission since already granted
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('schedules notification when enabling', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', true);

      await waitFor(() => {
        expect(mockScheduleNext).toHaveBeenCalled();
      });
    });

    it('cancels notifications when disabling', async () => {
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'daily',
      };
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-toggle')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('notification-toggle'), 'valueChange', false);

      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(false);
        expect(mockCancelAll).toHaveBeenCalled();
      });
    });
  });

  describe('Next Notification Preview', () => {
    it('shows next notification preview when enabled', async () => {
      const nextTime = new Date('2024-01-15T09:00:00');
      mockCalculateNextTime.mockReturnValue(nextTime);

      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'daily',
      };
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('next-notification-preview')).toBeTruthy();
        expect(screen.getByTestId('next-notification-time')).toBeTruthy();
      });
    });

    it('does not show next notification preview when disabled', async () => {
      mockCalculateNextTime.mockReturnValue(null);

      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: false,
        frequency: 'disabled',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('next-notification-preview')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'granted',
      };
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: true,
        frequency: 'daily',
      };
    });

    it('notification toggle has accessible role', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const toggle = screen.getByTestId('notification-toggle');
        expect(toggle.props.accessibilityRole).toBe('switch');
      });
    });

    it('frequency selector has accessible role', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('frequency-selector');
        expect(selector.props.accessibilityRole).toBe('button');
      });
    });

    it('time selector has accessible role', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('time-selector');
        expect(selector.props.accessibilityRole).toBe('button');
      });
    });

    it('open settings button has accessible role', async () => {
      mockUseNotificationPermissionReturn = {
        ...defaultUseNotificationPermissionReturn,
        permissionStatus: 'denied',
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('open-settings-button');
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('toggle has correct accessibility state when enabled', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const toggle = screen.getByTestId('notification-toggle');
        expect(toggle.props.accessibilityState?.checked).toBe(true);
      });
    });

    it('toggle has correct accessibility state when disabled', async () => {
      mockUseNotificationSettingsReturn = {
        ...defaultUseNotificationSettingsReturn,
        isEnabled: false,
      };

      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        const toggle = screen.getByTestId('notification-toggle');
        expect(toggle.props.accessibilityState?.checked).toBe(false);
      });
    });
  });

  describe('Settings Description', () => {
    it('displays settings description hint', async () => {
      render(<NotificationSettingsScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('Receive periodic reminders to update your financial data')
        ).toBeTruthy();
      });
    });
  });
});
