/**
 * ScheduledBackupService - Background backup scheduling
 *
 * Implements scheduled backups using expo-background-fetch.
 * This is an optional feature that runs backups in the background.
 *
 * **Validates: Requirements 9**
 *
 * @module services/backup/ScheduledBackupService
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { backupService } from './BackupService';
import { oAuthService } from './OAuthService';
import { useBackupStore } from '../../stores/backupStore';
import { logger } from '../logging';

// Background task name
export const BACKUP_TASK_NAME = 'gg-economy-scheduled-backup';

/**
 * Minimum interval between background fetches (in seconds)
 * Note: iOS has a minimum of 15 minutes, Android can be more frequent
 */
const MIN_INTERVAL_SECONDS = 15 * 60; // 15 minutes

/**
 * Register the background backup task
 * This should be called at app startup
 */
export function registerBackupTask(): void {
  TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
    try {
      const store = useBackupStore.getState();

      // Check if scheduled backup is enabled and due
      if (!store.isScheduledBackupDue()) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Check if user is authenticated
      const isSignedIn = await oAuthService.isSignedIn();
      if (!isSignedIn) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Perform backup
      const result = await backupService.createBackup();

      if (result.success) {
        // Update store with success
        store.setOperationComplete(true);
        store.markScheduledBackupRun();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } else {
        // Update store with failure
        store.setOperationComplete(false, result.errorMessage);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useBackupStore.getState().setOperationComplete(false, errorMessage);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Check if background fetch is available on this device
 */
export async function isBackgroundFetchAvailable(): Promise<boolean> {
  const status = await BackgroundFetch.getStatusAsync();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

/**
 * Get the current background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
  return BackgroundFetch.getStatusAsync();
}

/**
 * Enable scheduled backups
 * Registers the background task with the system
 */
export async function enableScheduledBackups(): Promise<boolean> {
  try {
    // Check if background fetch is available
    const isAvailable = await isBackgroundFetchAvailable();
    if (!isAvailable) {
      logger.warn('Background fetch is not available on this device', {
        context: 'scheduledBackup',
      });
      return false;
    }

    // Register the background task
    await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
      minimumInterval: MIN_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    return true;
  } catch (error) {
    logger.error('Failed to enable scheduled backups', {
      error: error instanceof Error ? error.message : String(error),
      context: 'scheduledBackup',
    });
    return false;
  }
}

/**
 * Disable scheduled backups
 * Unregisters the background task
 */
export async function disableScheduledBackups(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);

    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);
    }

    return true;
  } catch (error) {
    logger.error('Failed to disable scheduled backups', {
      error: error instanceof Error ? error.message : String(error),
      context: 'scheduledBackup',
    });
    return false;
  }
}

/**
 * Check if scheduled backups are currently enabled
 */
export async function isScheduledBackupsEnabled(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
}

/**
 * Update scheduled backup settings
 * Re-registers the task if settings change
 */
export async function updateScheduledBackupSettings(enabled: boolean): Promise<boolean> {
  if (enabled) {
    return enableScheduledBackups();
  } else {
    return disableScheduledBackups();
  }
}

/**
 * Scheduled backup service class for more complex operations
 */
export class ScheduledBackupService {
  private isInitialized = false;

  /**
   * Initialize the scheduled backup service
   * Should be called once at app startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('ScheduledBackupService already initialized');
      return;
    }

    logger.debug('Initializing ScheduledBackupService');

    // Register the background task definition
    registerBackupTask();

    // Check if scheduled backups should be enabled based on store state
    const store = useBackupStore.getState();
    if (store.scheduledBackup.frequency !== 'disabled' && store.isConnected) {
      logger.debug('Enabling scheduled backups on initialization', {
        frequency: store.scheduledBackup.frequency,
      });
      await enableScheduledBackups();
    }

    this.isInitialized = true;
    logger.debug('ScheduledBackupService initialized successfully');
  }

  /**
   * Update backup schedule based on user preferences
   */
  async updateSchedule(enabled: boolean): Promise<boolean> {
    return updateScheduledBackupSettings(enabled);
  }

  /**
   * Check if a backup should run now based on schedule
   */
  shouldRunBackup(): boolean {
    return useBackupStore.getState().isScheduledBackupDue();
  }

  /**
   * Manually trigger a scheduled backup check
   * Useful for testing or when app comes to foreground
   */
  async checkAndRunScheduledBackup(): Promise<boolean> {
    const store = useBackupStore.getState();

    if (!store.isScheduledBackupDue()) {
      return false;
    }

    const isSignedIn = await oAuthService.isSignedIn();
    if (!isSignedIn) {
      return false;
    }

    // Run backup
    store.setOperationInProgress('exporting', 0, 'Starting scheduled backup...');

    const result = await backupService.createBackup((progress) => {
      store.setOperationInProgress(progress.stage, progress.progress, progress.message);
    });

    if (result.success) {
      store.setOperationComplete(true);
      store.markScheduledBackupRun();
      return true;
    } else {
      store.setOperationComplete(false, result.errorMessage);
      return false;
    }
  }

  /**
   * Get status information about scheduled backups
   */
  async getStatus(): Promise<{
    isAvailable: boolean;
    isEnabled: boolean;
    status: BackgroundFetch.BackgroundFetchStatus;
  }> {
    const [isAvailable, isEnabled, status] = await Promise.all([
      isBackgroundFetchAvailable(),
      isScheduledBackupsEnabled(),
      getBackgroundFetchStatus(),
    ]);

    return {
      isAvailable,
      isEnabled,
      status,
    };
  }
}

// Export singleton instance
export const scheduledBackupService = new ScheduledBackupService();
