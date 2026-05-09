/**
 * Unit tests for NotificationScheduler service
 *
 * Tests the notification scheduling logic including:
 * - calculateNextTime calculations
 * - scheduleNext scheduling
 * - cancel and cancelAll operations
 * - restore functionality
 * - handleNotificationReceived auto-rescheduling
 *
 * **Validates: Requirements 1.4, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as Notifications from 'expo-notifications';
import { NotificationScheduler, FREQUENCY_DAYS } from '../NotificationScheduler';
import { useNotificationStore } from '../../../stores/notificationStore';
import type { NotificationSettings } from '../../../stores/notificationStore';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock i18n
jest.mock('../../../i18n', () => ({
  getCurrentLocale: jest.fn(() => 'en'),
}));

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();

    // Reset the notification store
    useNotificationStore.getState().reset();
  });

  describe('FREQUENCY_DAYS mapping', () => {
    it('should have correct day values for each frequency', () => {
      expect(FREQUENCY_DAYS.daily).toBe(1);
      expect(FREQUENCY_DAYS.every2days).toBe(2);
      expect(FREQUENCY_DAYS.every3days).toBe(3);
      expect(FREQUENCY_DAYS.weekly).toBe(7);
      expect(FREQUENCY_DAYS.disabled).toBe(0);
    });
  });

  describe('calculateNextTime', () => {
    const baseSettings: NotificationSettings = {
      isEnabled: true,
      frequency: 'daily',
      preferredHour: 9,
      preferredMinute: 0,
      scheduledNotificationId: null,
      lastDeliveryTime: null,
    };

    it('should return null when notifications are disabled', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        isEnabled: false,
      };

      const result = scheduler.calculateNextTime(settings);
      expect(result).toBeNull();
    });

    it('should return null when frequency is disabled', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        frequency: 'disabled',
      };

      const result = scheduler.calculateNextTime(settings);
      expect(result).toBeNull();
    });

    it('should calculate next time at preferred hour and minute', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        preferredHour: 14,
        preferredMinute: 30,
      };

      // Use a time before the preferred time
      const fromTime = new Date('2024-01-15T10:00:00');
      const result = scheduler.calculateNextTime(settings, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });

    it('should schedule for next day if preferred time has passed', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        preferredHour: 9,
        preferredMinute: 0,
        frequency: 'daily',
      };

      // Use a time after the preferred time
      const fromTime = new Date('2024-01-15T15:00:00');
      const result = scheduler.calculateNextTime(settings, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(16); // Next day
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(0);
    });

    it('should respect frequency when calculating next time', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        frequency: 'weekly',
        preferredHour: 9,
        preferredMinute: 0,
      };

      // Use a time after the preferred time
      const fromTime = new Date('2024-01-15T15:00:00');
      const result = scheduler.calculateNextTime(settings, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(22); // 7 days later
    });

    it('should calculate from last delivery time when available', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        frequency: 'every2days',
        preferredHour: 9,
        preferredMinute: 0,
        lastDeliveryTime: '2024-01-15T09:00:00.000Z',
      };

      // Current time is Jan 16, so next should be Jan 17 (2 days from delivery)
      const fromTime = new Date('2024-01-16T10:00:00');
      const result = scheduler.calculateNextTime(settings, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getDate()).toBe(17);
      expect(result!.getHours()).toBe(9);
    });

    it('should always return a future time', () => {
      const settings: NotificationSettings = {
        ...baseSettings,
        frequency: 'daily',
        preferredHour: 9,
        preferredMinute: 0,
      };

      const fromTime = new Date('2024-01-15T12:00:00');
      const result = scheduler.calculateNextTime(settings, fromTime);

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(fromTime.getTime());
    });
  });

  describe('scheduleNext', () => {
    const enabledSettings: NotificationSettings = {
      isEnabled: true,
      frequency: 'daily',
      preferredHour: 9,
      preferredMinute: 0,
      scheduledNotificationId: null,
      lastDeliveryTime: null,
    };

    it('should schedule a notification and return the ID', async () => {
      const mockNotificationId = 'test-notification-id';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockNotificationId);

      const result = await scheduler.scheduleNext(enabledSettings);

      expect(result).toBe(mockNotificationId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('should include correct notification content', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('test-id');

      await scheduler.scheduleNext(enabledSettings);

      const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(call.content.title).toBe('Time to update your finances!');
      expect(call.content.body).toBe('Take a moment to record your recent transactions.');
      expect(call.content.data.type).toBe('reminder');
      expect(call.content.data.navigateTo).toBe('/(tabs)/manual');
    });

    it('should throw error when notifications are disabled', async () => {
      const disabledSettings: NotificationSettings = {
        ...enabledSettings,
        isEnabled: false,
      };

      await expect(scheduler.scheduleNext(disabledSettings)).rejects.toThrow(
        'Cannot schedule notification: notifications are disabled'
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a specific notification', async () => {
      const notificationId = 'test-notification-id';

      await scheduler.cancel(notificationId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationId);
    });

    it('should handle cancel errors gracefully', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Cancel failed')
      );

      // Should not throw
      await expect(scheduler.cancel('test-id')).resolves.not.toThrow();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all scheduled notifications', async () => {
      await scheduler.cancelAll();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle cancelAll errors gracefully', async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error('Cancel all failed')
      );

      // Should not throw
      await expect(scheduler.cancelAll()).resolves.not.toThrow();
    });
  });

  describe('restore', () => {
    it('should cancel all and clear ID when notifications are disabled', async () => {
      const disabledSettings: NotificationSettings = {
        isEnabled: false,
        frequency: 'disabled',
        preferredHour: 9,
        preferredMinute: 0,
        scheduledNotificationId: 'old-id',
        lastDeliveryTime: null,
      };

      await scheduler.restore(disabledSettings);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(useNotificationStore.getState().settings.scheduledNotificationId).toBeNull();
    });

    it('should not reschedule if notification still exists', async () => {
      const settings: NotificationSettings = {
        isEnabled: true,
        frequency: 'daily',
        preferredHour: 9,
        preferredMinute: 0,
        scheduledNotificationId: 'existing-id',
        lastDeliveryTime: null,
      };

      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        { identifier: 'existing-id' },
      ]);

      await scheduler.restore(settings);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should schedule new notification if existing one is missing', async () => {
      const settings: NotificationSettings = {
        isEnabled: true,
        frequency: 'daily',
        preferredHour: 9,
        preferredMinute: 0,
        scheduledNotificationId: 'missing-id',
        lastDeliveryTime: null,
      };

      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('new-id');

      await scheduler.restore(settings);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });

  describe('handleNotificationReceived', () => {
    it('should record delivery and reschedule when enabled', async () => {
      // Set up enabled notifications in the store
      useNotificationStore.getState().setEnabled(true);
      useNotificationStore.getState().setFrequency('daily');

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'new-notification-id'
      );

      await scheduler.handleNotificationReceived();

      // Should have recorded delivery
      expect(useNotificationStore.getState().settings.lastDeliveryTime).not.toBeNull();

      // Should have scheduled next notification
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should not reschedule when notifications are disabled', async () => {
      // Notifications are disabled by default
      useNotificationStore.getState().setEnabled(false);

      await scheduler.handleNotificationReceived();

      // Should have recorded delivery
      expect(useNotificationStore.getState().settings.lastDeliveryTime).not.toBeNull();

      // Should NOT have scheduled next notification
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
});
