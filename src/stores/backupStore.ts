/**
 * Zustand store for backup status tracking
 *
 * Manages backup state including last backup time, status, and progress.
 * Persists backup status to AsyncStorage for persistence across app restarts.
 *
 * **Validates: Requirements 8, 9, 26**
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BackupStatusInfo } from '../types/backup';

/**
 * Backup frequency options
 */
export type BackupFrequency = 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled';

/**
 * Backup operation state
 */
export interface BackupOperationState {
  isInProgress: boolean;
  stage: 'idle' | 'exporting' | 'uploading' | 'complete' | 'error';
  progress: number; // 0-1
  message: string | null;
}

/**
 * Scheduled backup configuration
 */
export interface ScheduledBackupConfig {
  frequency: BackupFrequency;
  preferredHour: number; // 0-23
  lastScheduledRun: string | null; // ISO date string
}

/**
 * Backup store state
 */
interface BackupStoreState {
  // Backup status
  lastBackupTime: string | null; // ISO date string
  lastBackupStatus: 'success' | 'failed' | 'never';
  lastBackupError: string | null;

  // Current operation state
  operation: BackupOperationState;

  // Scheduled backup configuration
  scheduledBackup: ScheduledBackupConfig;

  // Google account connection
  isConnected: boolean;
  connectedEmail: string | null;
}

/**
 * Backup store actions
 */
interface BackupStoreActions {
  /**
   * Update backup status after a backup operation
   */
  setBackupStatus: (status: BackupStatusInfo) => void;

  /**
   * Set backup operation in progress
   */
  setOperationInProgress: (
    stage: BackupOperationState['stage'],
    progress: number,
    message: string
  ) => void;

  /**
   * Set backup operation complete
   */
  setOperationComplete: (success: boolean, errorMessage?: string) => void;

  /**
   * Reset operation state to idle
   */
  resetOperation: () => void;

  /**
   * Update scheduled backup configuration
   */
  setScheduledBackupConfig: (config: Partial<ScheduledBackupConfig>) => void;

  /**
   * Update Google account connection status
   */
  setConnectionStatus: (isConnected: boolean, email?: string | null) => void;

  /**
   * Get the current backup status info
   */
  getBackupStatusInfo: () => BackupStatusInfo;

  /**
   * Check if a scheduled backup is due
   */
  isScheduledBackupDue: () => boolean;

  /**
   * Mark scheduled backup as run
   */
  markScheduledBackupRun: () => void;

  /**
   * Reset the store (useful for testing)
   */
  reset: () => void;
}

type BackupStore = BackupStoreState & BackupStoreActions;

/**
 * Initial state
 */
const initialState: BackupStoreState = {
  lastBackupTime: null,
  lastBackupStatus: 'never',
  lastBackupError: null,
  operation: {
    isInProgress: false,
    stage: 'idle',
    progress: 0,
    message: null,
  },
  scheduledBackup: {
    frequency: 'disabled',
    preferredHour: 3, // 3 AM default
    lastScheduledRun: null,
  },
  isConnected: false,
  connectedEmail: null,
};

/**
 * Calculate the next scheduled backup time based on frequency
 */
function getNextScheduledTime(
  lastRun: Date | null,
  frequency: BackupFrequency,
  preferredHour: number
): Date | null {
  if (frequency === 'disabled') {
    return null;
  }

  const now = new Date();
  let nextRun: Date;

  if (!lastRun) {
    // First scheduled backup - run at next preferred hour
    nextRun = new Date(now);
    nextRun.setHours(preferredHour, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
  }

  // Calculate days between backups
  const daysInterval: Record<BackupFrequency, number> = {
    daily: 1,
    every2days: 2,
    every3days: 3,
    weekly: 7,
    disabled: 0,
  };

  nextRun = new Date(lastRun);
  nextRun.setDate(nextRun.getDate() + daysInterval[frequency]);
  nextRun.setHours(preferredHour, 0, 0, 0);

  return nextRun;
}

/**
 * Zustand store for backup management with persistence
 */
export const useBackupStore = create<BackupStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBackupStatus: (status: BackupStatusInfo) => {
        set({
          lastBackupTime: status.lastBackupTime?.toISOString() ?? null,
          lastBackupStatus: status.status,
          lastBackupError: status.errorMessage ?? null,
        });
      },

      setOperationInProgress: (
        stage: BackupOperationState['stage'],
        progress: number,
        message: string
      ) => {
        set({
          operation: {
            isInProgress: true,
            stage,
            progress,
            message,
          },
        });
      },

      setOperationComplete: (success: boolean, errorMessage?: string) => {
        const now = new Date().toISOString();

        set({
          operation: {
            isInProgress: false,
            stage: success ? 'complete' : 'error',
            progress: success ? 1 : 0,
            message: success ? 'Backup completed successfully' : (errorMessage ?? 'Backup failed'),
          },
          lastBackupTime: success ? now : get().lastBackupTime,
          lastBackupStatus: success ? 'success' : 'failed',
          lastBackupError: success ? null : (errorMessage ?? 'Unknown error'),
        });
      },

      resetOperation: () => {
        set({
          operation: {
            isInProgress: false,
            stage: 'idle',
            progress: 0,
            message: null,
          },
        });
      },

      setScheduledBackupConfig: (config: Partial<ScheduledBackupConfig>) => {
        set((state) => ({
          scheduledBackup: {
            ...state.scheduledBackup,
            ...config,
          },
        }));
      },

      setConnectionStatus: (isConnected: boolean, email?: string | null) => {
        set({
          isConnected,
          connectedEmail: email ?? null,
        });
      },

      getBackupStatusInfo: (): BackupStatusInfo => {
        const state = get();
        return {
          lastBackupTime: state.lastBackupTime ? new Date(state.lastBackupTime) : null,
          status: state.lastBackupStatus,
          errorMessage: state.lastBackupError ?? undefined,
        };
      },

      isScheduledBackupDue: (): boolean => {
        const state = get();
        const { frequency, preferredHour, lastScheduledRun } = state.scheduledBackup;

        if (frequency === 'disabled' || !state.isConnected) {
          return false;
        }

        const lastRun = lastScheduledRun ? new Date(lastScheduledRun) : null;
        const nextScheduled = getNextScheduledTime(lastRun, frequency, preferredHour);

        if (!nextScheduled) {
          return false;
        }

        return new Date() >= nextScheduled;
      },

      markScheduledBackupRun: () => {
        set((state) => ({
          scheduledBackup: {
            ...state.scheduledBackup,
            lastScheduledRun: new Date().toISOString(),
          },
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'gg-economy-backup-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        lastBackupTime: state.lastBackupTime,
        lastBackupStatus: state.lastBackupStatus,
        lastBackupError: state.lastBackupError,
        scheduledBackup: state.scheduledBackup,
        isConnected: state.isConnected,
        connectedEmail: state.connectedEmail,
      }),
    }
  )
);

/**
 * Selector hooks for specific backup state
 */
export function useBackupStatus() {
  const lastBackupTime = useBackupStore((state) => state.lastBackupTime);
  const lastBackupStatus = useBackupStore((state) => state.lastBackupStatus);
  const lastBackupError = useBackupStore((state) => state.lastBackupError);

  return {
    lastBackupTime: lastBackupTime ? new Date(lastBackupTime) : null,
    status: lastBackupStatus,
    errorMessage: lastBackupError,
  };
}

export function useBackupOperation() {
  const operation = useBackupStore((state) => state.operation);
  const setOperationInProgress = useBackupStore((state) => state.setOperationInProgress);
  const setOperationComplete = useBackupStore((state) => state.setOperationComplete);
  const resetOperation = useBackupStore((state) => state.resetOperation);

  return {
    ...operation,
    setInProgress: setOperationInProgress,
    setComplete: setOperationComplete,
    reset: resetOperation,
  };
}

export function useBackupConnection() {
  const isConnected = useBackupStore((state) => state.isConnected);
  const connectedEmail = useBackupStore((state) => state.connectedEmail);
  const setConnectionStatus = useBackupStore((state) => state.setConnectionStatus);

  return {
    isConnected,
    connectedEmail,
    setConnectionStatus,
  };
}

export function useScheduledBackup() {
  const scheduledBackup = useBackupStore((state) => state.scheduledBackup);
  const setScheduledBackupConfig = useBackupStore((state) => state.setScheduledBackupConfig);
  const isScheduledBackupDue = useBackupStore((state) => state.isScheduledBackupDue);
  const markScheduledBackupRun = useBackupStore((state) => state.markScheduledBackupRun);

  return {
    ...scheduledBackup,
    setConfig: setScheduledBackupConfig,
    isDue: isScheduledBackupDue,
    markRun: markScheduledBackupRun,
  };
}
