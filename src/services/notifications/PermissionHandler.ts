/**
 * PermissionHandler - Notification permission management service
 *
 * Handles checking, requesting, and managing notification permissions
 * using expo-notifications and React Native Linking for system settings.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 *
 * @module services/notifications/PermissionHandler
 */

import { Linking } from 'react-native';
import type { PermissionStatus } from '../../stores/notificationStore';
import { logger } from '../logging';
import { getNotifications } from './NotificationsModuleLoader';

/**
 * Permission handler interface for notification permissions
 */
export interface IPermissionHandler {
  /**
   * Check current permission status
   * @returns Promise resolving to the current permission status
   */
  checkPermission: () => Promise<PermissionStatus>;

  /**
   * Request notification permission from OS
   * @returns Promise resolving to the resulting permission status
   */
  requestPermission: () => Promise<PermissionStatus>;

  /**
   * Open system settings for the app
   * @returns Promise that resolves when settings are opened
   */
  openSettings: () => Promise<void>;
}

/**
 * Map expo-notifications permission status to our PermissionStatus type
 */
function mapExpoPermissionStatus(
  status: import('expo-notifications').PermissionStatus
): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/**
 * PermissionHandler class for managing notification permissions
 *
 * Provides methods to check, request, and manage notification permissions
 * using expo-notifications API and system settings integration.
 */
export class PermissionHandler implements IPermissionHandler {
  /**
   * Check current notification permission status
   *
   * Uses expo-notifications getPermissionsAsync to query the current
   * permission state from the operating system.
   *
   * @returns Promise resolving to 'granted', 'denied', or 'undetermined'
   */
  async checkPermission(): Promise<PermissionStatus> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      logger.debug('Running in Expo Go - returning denied for permissions');
      return 'denied';
    }

    try {
      const { status } = await NotificationsModule.getPermissionsAsync();
      const mappedStatus = mapExpoPermissionStatus(status);
      logger.debug('Notification permission status checked', { status: mappedStatus });
      return mappedStatus;
    } catch (error) {
      // If we can't check permissions, assume undetermined
      logger.warn('Failed to check notification permissions', {
        error: error instanceof Error ? error.message : String(error),
        context: 'permissions',
      });
      return 'undetermined';
    }
  }

  /**
   * Request notification permission from the operating system
   *
   * Uses expo-notifications requestPermissionsAsync to prompt the user
   * for notification permissions. On Android 13+, this will show a
   * system dialog. On older Android versions, permissions are granted
   * by default.
   *
   * @returns Promise resolving to the resulting permission status
   */
  async requestPermission(): Promise<PermissionStatus> {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      logger.debug('Running in Expo Go - returning denied for permission request');
      return 'denied';
    }

    logger.debug('Requesting notification permission');
    try {
      const { status } = await NotificationsModule.requestPermissionsAsync();
      const mappedStatus = mapExpoPermissionStatus(status);
      logger.debug('Notification permission request result', { status: mappedStatus });
      return mappedStatus;
    } catch (error) {
      // If request fails, check current status
      logger.warn('Failed to request notification permissions', {
        error: error instanceof Error ? error.message : String(error),
        context: 'permissions',
      });
      return this.checkPermission();
    }
  }

  /**
   * Open system settings for the app
   *
   * Uses React Native Linking to open the app's settings page in the
   * system settings app. This allows users to manually enable
   * notifications if they previously denied permission.
   *
   * @returns Promise that resolves when settings are opened
   * @throws Error if settings cannot be opened
   */
  async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      logger.error('Failed to open system settings', {
        error: error instanceof Error ? error.message : String(error),
        context: 'permissions',
      });
      throw new Error('Unable to open system settings');
    }
  }
}

// Export singleton instance
export const permissionHandler = new PermissionHandler();
