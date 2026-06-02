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

import type {
  NotificationSettings,
  NotificationFrequency,
  TimeSlot,
} from '../../stores/notificationStore';
import { useNotificationStore, timeSlotKey } from '../../stores/notificationStore';
import { getCurrentLocale } from '../../i18n';
import { getNotificationContent } from './NotificationContent';
import { logger } from '../logging';
import { getNotifications } from './NotificationsModuleLoader';

/**
 * Mapping of notification frequency to number of days between notifications
 */
export const FREQUENCY_DAYS: Record<NotificationFrequency, number> = {
  daily: 1,
  every2days: 2,
  every3days: 3,
  weekly: 7,
  disabled: 0,
  multipleDaily: 1,
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

  /**
   * Schedule notifications for all time slots in multipleDaily mode
   * @param timeSlots - Array of time slots to schedule
   * @param settings - Current notification settings
   * @returns Mapping of slot keys to notification IDs
   */
  scheduleAllSlots: (
    timeSlots: TimeSlot[],
    settings: NotificationSettings
  ) => Promise<Record<string, string>>;

  /**
   * Calculate the next notification time across all time slots
   * @param timeSlots - Array of time slots to consider
   * @param fromTime - Base time for calculation (defaults to now)
   * @returns Next notification Date or null if timeSlots is empty
   */
  calculateNextTimeMultiSlot: (timeSlots: TimeSlot[], fromTime?: Date) => Date | null;

  /**
   * Restore all time slot notifications after app restart
   * Verifies each stored ID and reschedules missing ones
   * @param timeSlots - Array of time slots to restore
   * @param storedIds - Previously stored mapping of slot keys to notification IDs
   * @param settings - Current notification settings
   * @returns Updated mapping of slot keys to notification IDs
   */
  restoreMultipleSlots: (
    timeSlots: TimeSlot[],
    storedIds: Record<string, string>,
    settings: NotificationSettings
  ) => Promise<Record<string, string>>;

  /**
   * Handle notification received for a specific time slot
   * Reschedules only the delivered slot for the next day
   * @param slotHour - The hour of the delivered time slot
   * @param slotMinute - The minute of the delivered time slot
   */
  handleSlotNotificationReceived: (slotHour: number, slotMinute: number) => Promise<void>;
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
      return;
    }

    // If notifications are disabled, ensure all are canceled
    if (!settings.isEnabled || settings.frequency === 'disabled') {
      await this.cancelAll();
      useNotificationStore.getState().setScheduledNotificationId(null);
      return;
    }

    // Handle multipleDaily frequency — restore all time slot notifications
    if (settings.frequency === 'multipleDaily') {
      const newMapping = await this.restoreMultipleSlots(
        settings.timeSlots,
        settings.timeSlotNotificationIds,
        settings
      );
      useNotificationStore.getState().setTimeSlotNotificationIds(newMapping);
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
        return;
      }
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
   * Schedule notifications for all time slots in multipleDaily mode
   *
   * Cancels all existing notifications, then schedules one notification
   * for each time slot using TIME_INTERVAL triggers. Each notification
   * includes the slot's hour and minute in its data payload.
   *
   * On per-slot failure, logs a warning and continues with remaining slots.
   *
   * @param timeSlots - Array of time slots to schedule
   * @param settings - Current notification settings
   * @returns Mapping of slot keys to notification IDs
   */
  async scheduleAllSlots(
    timeSlots: TimeSlot[],
    _settings: NotificationSettings
  ): Promise<Record<string, string>> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      return {};
    }

    // Cancel all existing notifications before scheduling
    await NotificationsModule.cancelAllScheduledNotificationsAsync();

    const locale = getCurrentLocale();
    const content = getNotificationContent(locale);
    const result: Record<string, string> = {};
    const now = new Date();

    for (const slot of timeSlots) {
      try {
        // Calculate target time (today if in future, tomorrow if already passed)
        const targetTime = new Date(now);
        targetTime.setHours(slot.hour, slot.minute, 0, 0);

        if (targetTime.getTime() <= now.getTime()) {
          // Already passed today, schedule for tomorrow
          targetTime.setDate(targetTime.getDate() + 1);
        }

        // Calculate seconds until target, minimum 1
        const seconds = Math.max(1, Math.floor((targetTime.getTime() - now.getTime()) / 1000));

        const notificationId = await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            data: {
              type: 'reminder',
              navigateTo: '/(tabs)/manual',
              slotHour: slot.hour,
              slotMinute: slot.minute,
            },
            sound: true,
          },
          trigger: {
            type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
          },
        });

        result[timeSlotKey(slot)] = notificationId;
      } catch (error) {
        console.warn(
          `Failed to schedule notification for slot ${timeSlotKey(slot)}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue with remaining slots — do not store an ID for this slot
      }
    }

    return result;
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

  /**
   * Calculate the next notification time across all time slots
   *
   * For a given set of time slots, finds the earliest slot whose target
   * time is strictly after `fromTime`. If all slots are at or before
   * the current time today, returns the earliest slot's time on the next day.
   *
   * @param timeSlots - Array of time slots to consider
   * @param fromTime - Base time for calculation (defaults to now)
   * @returns Next notification Date or null if timeSlots is empty
   *
   * **Validates: Requirements 6.1, 6.2, 6.3**
   */
  calculateNextTimeMultiSlot(timeSlots: TimeSlot[], fromTime?: Date): Date | null {
    if (timeSlots.length === 0) {
      return null;
    }

    const now = fromTime || new Date();

    // Sort slots in chronological order
    const sortedSlots = [...timeSlots].sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    // Find the earliest slot whose target time is strictly after fromTime
    for (const slot of sortedSlots) {
      const targetTime = new Date(now);
      targetTime.setHours(slot.hour, slot.minute, 0, 0);

      if (targetTime.getTime() > now.getTime()) {
        return targetTime;
      }
    }

    // All slots are at or before current time today — return earliest slot's time tomorrow
    const earliestSlot = sortedSlots[0];
    const tomorrowTime = new Date(now);
    tomorrowTime.setDate(tomorrowTime.getDate() + 1);
    tomorrowTime.setHours(earliestSlot.hour, earliestSlot.minute, 0, 0);

    return tomorrowTime;
  }

  /**
   * Restore all time slot notifications after app restart
   *
   * Queries all currently scheduled notifications and verifies each stored
   * notification ID still exists. For any missing slots, reschedules the
   * notification and updates the mapping. On per-slot failure, logs a warning
   * and continues with remaining slots.
   *
   * @param timeSlots - Array of time slots to restore
   * @param storedIds - Previously stored mapping of slot keys to notification IDs
   * @param settings - Current notification settings
   * @returns Updated mapping of slot keys to notification IDs
   *
   * **Validates: Requirements 4.3, 4.4, 4.5**
   */
  async restoreMultipleSlots(
    timeSlots: TimeSlot[],
    storedIds: Record<string, string>,
    _settings: NotificationSettings
  ): Promise<Record<string, string>> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      return {};
    }

    // Query all currently scheduled notifications
    const scheduledNotifications = await NotificationsModule.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduledNotifications.map((n) => n.identifier));

    const locale = getCurrentLocale();
    const content = getNotificationContent(locale);
    const result: Record<string, string> = {};
    const now = new Date();

    for (const slot of timeSlots) {
      const key = timeSlotKey(slot);
      const storedId = storedIds[key];

      // Check if the stored notification ID still exists in the scheduled list
      if (storedId && scheduledIds.has(storedId)) {
        // Notification still exists, keep it
        result[key] = storedId;
        continue;
      }

      // Notification is missing — reschedule
      try {
        const targetTime = new Date(now);
        targetTime.setHours(slot.hour, slot.minute, 0, 0);

        if (targetTime.getTime() <= now.getTime()) {
          // Already passed today, schedule for tomorrow
          targetTime.setDate(targetTime.getDate() + 1);
        }

        const seconds = Math.max(1, Math.floor((targetTime.getTime() - now.getTime()) / 1000));

        const notificationId = await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            data: {
              type: 'reminder',
              navigateTo: '/(tabs)/manual',
              slotHour: slot.hour,
              slotMinute: slot.minute,
            },
            sound: true,
          },
          trigger: {
            type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
          },
        });

        result[key] = notificationId;
      } catch (error) {
        logger.warn(`Failed to restore notification for slot ${key}`, {
          error: error instanceof Error ? error.message : String(error),
          context: 'notifications',
        });
        // Continue with remaining slots
      }
    }

    return result;
  }

  /**
   * Handle notification received for a specific time slot
   *
   * When a notification is delivered for a specific time slot, reschedules
   * only that slot for the same hour and minute on the next calendar day.
   * Updates the store's notification ID mapping with the new ID.
   *
   * On failure, logs a warning without throwing.
   *
   * @param slotHour - The hour of the delivered time slot (0-23)
   * @param slotMinute - The minute of the delivered time slot (0, 15, 30, 45)
   *
   * **Validates: Requirements 3.2, 3.4**
   */
  async handleSlotNotificationReceived(slotHour: number, slotMinute: number): Promise<void> {
    try {
      const NotificationsModule = await getNotifications();
      if (!NotificationsModule) {
        return;
      }

      const now = new Date();

      // Calculate target time for the same hour/minute on the NEXT calendar day
      const targetTime = new Date(now);
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(slotHour, slotMinute, 0, 0);

      // Calculate seconds until target, minimum 1
      const seconds = Math.max(1, Math.floor((targetTime.getTime() - now.getTime()) / 1000));

      const locale = getCurrentLocale();
      const content = getNotificationContent(locale);

      // Schedule new notification for this slot only
      const newId = await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: {
            type: 'reminder',
            navigateTo: '/(tabs)/manual',
            slotHour,
            slotMinute,
          },
          sound: true,
        },
        trigger: {
          type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });

      // Update the notification ID mapping in the store
      const key = timeSlotKey({ hour: slotHour, minute: slotMinute });
      useNotificationStore.getState().setTimeSlotNotificationId(key, newId);
    } catch (error) {
      logger.warn('Failed to reschedule slot notification after delivery', {
        slotHour,
        slotMinute,
        error: error instanceof Error ? error.message : String(error),
        context: 'notifications',
      });
    }
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
