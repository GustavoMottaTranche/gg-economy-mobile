/**
 * useBackup Hook
 *
 * Custom hook for managing backup operations with the custom server.
 * Integrates with CustomServerClient and backupStore for state management.
 */
import { useCallback, useState, useEffect, useRef } from 'react';
import {
  useBackupStore,
  useBackupStatus,
  useBackupOperation,
  useBackupConnection,
  useScheduledBackup,
} from '../stores/backupStore';
import { customServerSettingsStore } from '../services/backup/CustomServerSettingsStore';
import {
  testConnection,
  listBackups as fetchServerBackups,
  deleteBackup as deleteServerBackup,
  mapServerToAppMetadata,
  type CustomServerConfig,
} from '../services/backup/CustomServerClient';
import {
  createCustomServerBackup,
  restoreFromCustomServer,
} from '../services/backup/CustomServerIntegration';
import type { BackupMetadata, RestoreResult } from '../types/backup';

/**
 * Restore progress state
 */
export interface RestoreProgress {
  stage: 'downloading' | 'restoring' | 'complete' | 'error';
  progress: number; // 0-1
  message: string;
}

/**
 * Return type for useBackup hook
 */
export interface UseBackupReturn {
  // Status
  lastBackupTime: Date | null;
  lastBackupStatus: 'success' | 'failed' | 'never';
  lastBackupError: string | null;

  // Operation state
  isBackingUp: boolean;
  isRestoring: boolean;
  restoreProgress: RestoreProgress | null;

  // Connection state
  isConnected: boolean;
  isConfigured: boolean;

  // Scheduled backup
  backupFrequency: 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled';
  preferredHour: number;

  // Available backups
  backups: BackupMetadata[];
  isLoadingBackups: boolean;

  // Actions
  testServerConnection: () => Promise<boolean>;
  backupNow: () => Promise<{ success: boolean; errorMessage?: string }>;
  listBackups: () => Promise<BackupMetadata[]>;
  restore: (filename: string) => Promise<RestoreResult>;
  deleteBackup: (filename: string) => Promise<boolean>;
  setBackupFrequency: (
    frequency: 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled'
  ) => void;
  setPreferredHour: (hour: number) => void;
  refreshBackups: () => Promise<void>;
}

/**
 * Get the current server config from settings store
 */
async function getServerConfig(): Promise<CustomServerConfig> {
  const settings = await customServerSettingsStore.getSettings();
  const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

  return {
    serverUrl: settings.serverUrl ?? '',
    apiKey: settings.apiKey ?? '',
    deviceId,
  };
}

/**
 * Hook for managing backup operations via custom server
 */
export function useBackup(): UseBackupReturn {
  // Zustand store selectors
  const backupStatus = useBackupStatus();
  const operation = useBackupOperation();
  const connection = useBackupConnection();
  const scheduledBackup = useScheduledBackup();
  const store = useBackupStore();

  // Local state
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const hasInitialized = useRef(false);

  // Check if server is configured on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkConfig = async () => {
      const configured = await customServerSettingsStore.isConfigured();
      setIsConfigured(configured);
      if (configured) {
        connection.setConnectionStatus(true, null);
      }
    };
    checkConfig();
  }, [connection]);

  /**
   * Test connection to the custom server
   */
  const testServerConnection = useCallback(async (): Promise<boolean> => {
    try {
      const config = await getServerConfig();
      await testConnection(config);
      connection.setConnectionStatus(true, null);
      setIsConfigured(true);
      return true;
    } catch {
      connection.setConnectionStatus(false, null);
      return false;
    }
  }, [connection]);

  /**
   * Create a backup now
   */
  const backupNow = useCallback(async (): Promise<{ success: boolean; errorMessage?: string }> => {
    try {
      const config = await getServerConfig();

      operation.setInProgress('exporting', 0, 'Starting backup...');

      await createCustomServerBackup(config, (progress) => {
        operation.setInProgress(progress.stage, progress.progress, progress.message);
      });

      operation.setComplete(true);
      store.setBackupStatus({
        lastBackupTime: new Date(),
        status: 'success',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      operation.setComplete(false, errorMessage);
      store.setBackupStatus({
        lastBackupTime: backupStatus.lastBackupTime,
        status: 'failed',
        errorMessage,
      });

      return { success: false, errorMessage };
    }
  }, [operation, store, backupStatus.lastBackupTime]);

  /**
   * List available backups from the server
   */
  const listBackupsAction = useCallback(async (): Promise<BackupMetadata[]> => {
    setIsLoadingBackups(true);

    try {
      const config = await getServerConfig();
      const serverBackups = await fetchServerBackups(config);
      const mapped = serverBackups.slice(0, 50).map(mapServerToAppMetadata);
      setBackups(mapped);
      return mapped;
    } catch (error) {
      console.error('[useBackup] Failed to list backups:', error);
      return [];
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  /**
   * Restore from a backup
   */
  const restore = useCallback(async (filename: string): Promise<RestoreResult> => {
    setIsRestoring(true);
    setRestoreProgress({
      stage: 'downloading',
      progress: 0,
      message: 'Downloading backup...',
    });

    try {
      const config = await getServerConfig();

      const result = await restoreFromCustomServer(filename, config, (progress) => {
        setRestoreProgress({
          stage: progress.progress < 1 ? 'downloading' : 'restoring',
          progress: progress.progress,
          message: progress.message,
        });
      });

      if (result.success) {
        setRestoreProgress({
          stage: 'complete',
          progress: 1,
          message: 'Restore completed successfully',
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';

      setRestoreProgress({
        stage: 'error',
        progress: 0,
        message: errorMessage,
      });

      return {
        success: false,
        errorMessage,
      };
    } finally {
      setIsRestoring(false);
    }
  }, []);

  /**
   * Delete a backup from the server
   */
  const deleteBackupAction = useCallback(
    async (filename: string): Promise<boolean> => {
      try {
        const config = await getServerConfig();
        await deleteServerBackup(filename, config);
        // Refresh list after delete
        await listBackupsAction();
        return true;
      } catch (error) {
        console.error('[useBackup] Failed to delete backup:', error);
        return false;
      }
    },
    [listBackupsAction]
  );

  /**
   * Set backup frequency
   */
  const setBackupFrequency = useCallback(
    (frequency: 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled') => {
      scheduledBackup.setConfig({ frequency });
    },
    [scheduledBackup]
  );

  /**
   * Set preferred backup hour
   */
  const setPreferredHour = useCallback(
    (hour: number) => {
      const validHour = Math.max(0, Math.min(23, hour));
      scheduledBackup.setConfig({ preferredHour: validHour });
    },
    [scheduledBackup]
  );

  /**
   * Refresh backup list
   */
  const refreshBackups = useCallback(async (): Promise<void> => {
    await listBackupsAction();
  }, [listBackupsAction]);

  return {
    // Status
    lastBackupTime: backupStatus.lastBackupTime,
    lastBackupStatus: backupStatus.status,
    lastBackupError: backupStatus.errorMessage ?? null,

    // Operation state
    isBackingUp: operation.isInProgress,
    isRestoring,
    restoreProgress,

    // Connection state
    isConnected: connection.isConnected,
    isConfigured,

    // Scheduled backup
    backupFrequency: scheduledBackup.frequency,
    preferredHour: scheduledBackup.preferredHour,

    // Available backups
    backups,
    isLoadingBackups,

    // Actions
    testServerConnection,
    backupNow,
    listBackups: listBackupsAction,
    restore,
    deleteBackup: deleteBackupAction,
    setBackupFrequency,
    setPreferredHour,
    refreshBackups,
  };
}

export default useBackup;
