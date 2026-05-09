/**
 * NotificationScheduler - Notification scheduling service
 *
 * Handles scheduling, canceling, and managing periodic reminder notifications
 * using expo-notifications. Integrates with the NotificationStore for state
 * management and supports app startup recovery.
 *
 * **Validates: Requirements 1.4, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * @module services/notifications/NotificationScheduler
 */

import Constants from 'expo-constants';
import type { NotificationSettings, NotificationFrequency } from '../../stores/notificationStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { getCurrentLocale } from '../../i18n';
import { getNotificationContent } from './NotificationContent';
import { logger } from '../logging';

// Check if running in Expo Go (notifications not supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy import of expo-notifications to avoid crash in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (isExpoGo) {
    return null;
  }
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
}

/**
 * Mapping of notification frequency to number of days between notifications
 */
export const FREQUENCY_DAYS: Record<NotificationFrequency, number> = {
  daily: 1,
  every2days: 2,
  every3days: 3,
  weekly: 7,
  disabled: 0,
};

/**
 * Notification scheduler interface
 */
export interface INotificationScheduler {
  /**
   * Calculate the next notification time based on settings
   * @param settings - Current notification settings
   * @param fromTime - Base time for calculation (defaults to now)
   * @returns Next notification Date or null if disabled
   */
  calculateNextTime: (settings: NotificationSettings, fromTime?: Date) => Date | null;

  /**
   * Schedule the next notification based on current settings
   * @param settings - Current notification settings
   * @returns The scheduled notification identifier
   */
  scheduleNext: (settings: NotificationSettings) => Promise<string>;

  /**
   * Cancel a specific scheduled notification
   * @param notificationId - The notification identifier to cancel
   */
  cancel: (notificationId: string) => Promise<void>;

  /**
   * Cancel all scheduled notifications
   */
  cancelAll: () => Promise<void>;

  /**
   * Restore scheduled notifications after app restart
   * Verifies existing schedule or creates new one if needed
   * @param settings - Current notification settings
   */
  restore: (settings: NotificationSettings) => Promise<void>;

  /**
   * Handle notification received (for auto-rescheduling)
   */
  handleNotificationReceived: () => Promise<void>;
}

/**
 * NotificationScheduler class for managing notification scheduling
 *
 * Provides methods to schedule, cancel, and manage periodic reminder
 * notifications using expo-notifications API.
 */
export class NotificationScheduler implements INotificationScheduler {
  /**
   * Calculate the next notification time based on settings
   *
   * The calculation considers:
   * - Current time (or provided fromTime)
   * - Preferred hour and minute from settings
   * - Frequency in days
   * - Last delivery time (if available)
   *
   * @param settings - Current notification settings
   * @param fromTime - Base time for calculation (defaults to now)
   * @returns Next notification Date or null if disabled
   */
  calculateNextTime(settings: NotificationSettings, fromTime?: Date): Date | null {
    // Return null if notifications are disabled
    if (!settings.isEnabled || settings.frequency === 'disabled') {
      return null;
    }

    const frequencyDays = FREQUENCY_DAYS[settings.frequency];
    if (frequencyDays === 0) {
      return null;
    }

    const now = fromTime || new Date();
    const { preferredHour, preferredMinute, lastDeliveryTime } = settings;

    // Create a date at the preferred time today
    const nextTime = new Date(now);
    nextTime.setHours(preferredHour, preferredMinute, 0, 0);

    // If we have a last delivery time, calculate from there
    if (lastDeliveryTime) {
      const lastDelivery = new Date(lastDeliveryTime);
      const nextFromLastDelivery = new Date(lastDelivery);
      nextFromLastDelivery.setDate(nextFromLastDelivery.getDate() + frequencyDays);
      nextFromLastDelivery.setHours(preferredHour, preferredMinute, 0, 0);

      // If the calculated time from last delivery is in the future, use it
      if (nextFromLastDelivery.getTime() > now.getTime()) {
        return nextFromLastDelivery;
      }
    }

    // If today's preferred time has already passed, schedule for the next occurrence
    if (nextTime.getTime() <= now.getTime()) {
      // Move to the next day that matches the frequency
      nextTime.setDate(nextTime.getDate() + frequencyDays);
    }

    return nextTime;
  }

  /**
   * Schedule the next notification based on current settings
   *
   * Uses expo-notifications scheduleNotificationAsync to schedule
   * a notification at the calculated next time.
   *
   * @param settings - Current notification settings
   * @returns The scheduled notification identifier
   * @throws Error if scheduling fails or notifications are disabled
   */
  async scheduleNext(settings: NotificationSettings): Promise<string> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      logger.debug('Running in Expo Go - notifications disabled');
      return 'expo-go-disabled';
    }

    const nextTime = this.calculateNextTime(settings);

    if (!nextTime) {
      throw new Error('Cannot schedule notification: notifications are disabled');
    }

    const locale = getCurrentLocale();
    const content = getNotificationContent(locale);

    // Calculate the trigger time in seconds from now
    const now = new Date();
    const secondsUntilTrigger = Math.max(
      1,
      Math.floor((nextTime.getTime() - now.getTime()) / 1000)
    );

    logger.debug('Scheduling notification', {
      nextTime: nextTime.toISOString(),
      secondsUntilTrigger,
      frequency: settings.frequency,
    });

    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: {
          type: 'reminder',
          navigateTo: '/(tabs)/manual',
        },
        sound: true,
      },
      trigger: {
        type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger,
      },
    });

    logger.debug('Notification scheduled successfully', { notificationId });
    return notificationId;
  }

  /**
   * Cancel a specific scheduled notification
   *
   * @param notificationId - The notification identifier to cancel
   */
  async cancel(notificationId: string): Promise<void> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) return;

    try {
      await NotificationsModule.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      logger.warn('Failed to cancel notification', {
        notificationId,
        error: error instanceof Error ? error.message : String(error),
        context: 'notifications',
      });
    }
  }

  /**
   * Cancel all scheduled notifications
   *
   * Cancels all notifications scheduled by this app.
   */
  async cancelAll(): Promise<void> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) return;

    try {
      await NotificationsModule.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      logger.warn('Failed to cancel all notifications', {
        error: error instanceof Error ? error.message : String(error),
        context: 'notifications',
      });
    }
  }

  /**
   * Restore scheduled notifications after app restart
   *
   * Checks if there's an existing scheduled notification and verifies
   * it's still valid. If not, schedules a new notification based on
   * current settings.
   *
   * @param settings - Current notification settings
   */
  async restore(settings: NotificationSettings): Promise<void> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      logger.debug('Running in Expo Go - restore skipped');
      return;
    }

    logger.debug('Restoring notification schedule', {
      isEnabled: settings.isEnabled,
      frequency: settings.frequency,
    });

    // If notifications are disabled, ensure all are canceled
    if (!settings.isEnabled || settings.frequency === 'disabled') {
      await this.cancelAll();
      useNotificationStore.getState().setScheduledNotificationId(null);
      logger.debug('Notifications disabled - all schedules cleared');
      return;
    }

    // Check if we have a scheduled notification ID
    const { scheduledNotificationId } = settings;

    if (scheduledNotificationId) {
      // Verify the notification still exists
      const scheduledNotifications = await NotificationsModule.getAllScheduledNotificationsAsync();
      const exists = scheduledNotifications.some((n) => n.identifier === scheduledNotificationId);

      if (exists) {
        // Notification still scheduled, nothing to do
        logger.debug('Existing notification schedule still valid', { scheduledNotificationId });
        return;
      }
      logger.debug('Scheduled notification no longer exists, rescheduling', {
        scheduledNotificationId,
      });
    }

    // No valid scheduled notification, schedule a new one
    try {
      const newNotificationId = await this.scheduleNext(settings);
      useNotificationStore.getState().setScheduledNotificationId(newNotificationId);
    } catch (error) {
      logger.warn('Failed to restore notification schedule', {
        error: error instanceof Error ? error.message : String(error),
        context: 'notifications',
      });
    }
  }

  /**
   * Handle notification received (for auto-rescheduling)
   *
   * Called when a notification is delivered. Records the delivery
   * and schedules the next notification based on current settings.
   */
  async handleNotificationReceived(): Promise<void> {
    const store = useNotificationStore.getState();

    // Record the delivery time
    store.recordDelivery();

    // Get current settings after recording delivery
    const settings = useNotificationStore.getState().settings;

    // If notifications are still enabled, schedule the next one
    if (settings.isEnabled && settings.frequency !== 'disabled') {
      try {
        // Cancel any existing scheduled notifications first
        await this.cancelAll();

        // Schedule the next notification
        const newNotificationId = await this.scheduleNext(settings);
        store.setScheduledNotificationId(newNotificationId);
      } catch (error) {
        logger.warn('Failed to reschedule notification after delivery', {
          error: error instanceof Error ? error.message : String(error),
          context: 'notifications',
        });
      }
    }
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
