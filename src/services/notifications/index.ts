/**
 * Notification services module
 *
 * Exports all notification-related services for managing
 * periodic reminder notifications.
 *
 * @module services/notifications
 */

export { PermissionHandler, permissionHandler, type IPermissionHandler } from './PermissionHandler';

export {
  NotificationScheduler,
  notificationScheduler,
  FREQUENCY_DAYS,
  type INotificationScheduler,
} from './NotificationScheduler';

export { getNotificationContent, type NotificationContent } from './NotificationContent';
