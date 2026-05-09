/**
 * Unit tests for ScheduledBackupService
 *
 * Tests the background backup scheduling functionality.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import {
  BACKUP_TASK_NAME,
  registerBackupTask,
  isBackgroundFetchAvailable,
  getBackgroundFetchStatus,
  enableScheduledBackups,
  disableScheduledBackups,
  isScheduledBackupsEnabled,
  updateScheduledBackupSettings,
  ScheduledBackupService,
  scheduledBackupService,
} from '../../../../src/services/backup/ScheduledBackupService';
import { backupService } from '../../../../src/services/backup/BackupService';
import { oAuthService } from '../../../../src/services/backup/OAuthService';
import { useBackupStore } from '../../../../src/stores/backupStore';

// Mock expo-background-fetch
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchStatus: {
    Available: 3,
    Denied: 1,
    Restricted: 2,
  },
  BackgroundFetchResult: {
    NoData: 1,
    NewData: 2,
    Failed: 3,
  },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

// Mock backup service
jest.mock('../../../../src/services/backup/BackupService', () => ({
  backupService: {
    createBackup: jest.fn(),
  },
}));

// Mock OAuth service
jest.mock('../../../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    isSignedIn: jest.fn(),
  },
}));

// Mock backup store
jest.mock('../../../../src/stores/backupStore', () => ({
  useBackupStore: {
    getState: jest.fn(() => ({
      isScheduledBackupDue: jest.fn(() => false),
      setOperationComplete: jest.fn(),
      markScheduledBackupRun: jest.fn(),
      setOperationInProgress: jest.fn(),
      scheduledBackup: { frequency: 'disabled' },
      isConnected: false,
    })),
  },
}));

describe('ScheduledBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BACKUP_TASK_NAME', () => {
    it('should have the correct task name', () => {
      expect(BACKUP_TASK_NAME).toBe('gg-economy-scheduled-backup');
    });
  });

  describe('registerBackupTask', () => {
    it('should define the background task', () => {
      registerBackupTask();

      expect(TaskManager.defineTask).toHaveBeenCalledWith(BACKUP_TASK_NAME, expect.any(Function));
    });
  });

  describe('isBackgroundFetchAvailable', () => {
    it('should return true when background fetch is available', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );

      const result = await isBackgroundFetchAvailable();

      expect(result).toBe(true);
    });

    it('should return false when background fetch is denied', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Denied
      );

      const result = await isBackgroundFetchAvailable();

      expect(result).toBe(false);
    });

    it('should return false when background fetch is restricted', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Restricted
      );

      const result = await isBackgroundFetchAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getBackgroundFetchStatus', () => {
    it('should return the current status', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );

      const status = await getBackgroundFetchStatus();

      expect(status).toBe(BackgroundFetch.BackgroundFetchStatus.Available);
    });
  });

  describe('enableScheduledBackups', () => {
    it('should register the task when background fetch is available', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );
      (BackgroundFetch.registerTaskAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await enableScheduledBackups();

      expect(result).toBe(true);
      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        BACKUP_TASK_NAME,
        expect.objectContaining({
          minimumInterval: 15 * 60,
          stopOnTerminate: false,
          startOnBoot: true,
        })
      );
    });

    it('should return false when background fetch is not available', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Denied
      );

      const result = await enableScheduledBackups();

      expect(result).toBe(false);
      expect(BackgroundFetch.registerTaskAsync).not.toHaveBeenCalled();
    });

    it('should return false when registration fails', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );
      (BackgroundFetch.registerTaskAsync as jest.Mock).mockRejectedValue(
        new Error('Registration failed')
      );

      const result = await enableScheduledBackups();

      expect(result).toBe(false);
    });
  });

  describe('disableScheduledBackups', () => {
    it('should unregister the task when it is registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
      (BackgroundFetch.unregisterTaskAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await disableScheduledBackups();

      expect(result).toBe(true);
      expect(BackgroundFetch.unregisterTaskAsync).toHaveBeenCalledWith(BACKUP_TASK_NAME);
    });

    it('should return true when task is not registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

      const result = await disableScheduledBackups();

      expect(result).toBe(true);
      expect(BackgroundFetch.unregisterTaskAsync).not.toHaveBeenCalled();
    });

    it('should return false when unregistration fails', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
      (BackgroundFetch.unregisterTaskAsync as jest.Mock).mockRejectedValue(
        new Error('Unregistration failed')
      );

      const result = await disableScheduledBackups();

      expect(result).toBe(false);
    });
  });

  describe('isScheduledBackupsEnabled', () => {
    it('should return true when task is registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

      const result = await isScheduledBackupsEnabled();

      expect(result).toBe(true);
    });

    it('should return false when task is not registered', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

      const result = await isScheduledBackupsEnabled();

      expect(result).toBe(false);
    });
  });

  describe('updateScheduledBackupSettings', () => {
    it('should enable backups when enabled is true', async () => {
      (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
        BackgroundFetch.BackgroundFetchStatus.Available
      );
      (BackgroundFetch.registerTaskAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await updateScheduledBackupSettings(true);

      expect(result).toBe(true);
      expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalled();
    });

    it('should disable backups when enabled is false', async () => {
      (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
      (BackgroundFetch.unregisterTaskAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await updateScheduledBackupSettings(false);

      expect(result).toBe(true);
      expect(BackgroundFetch.unregisterTaskAsync).toHaveBeenCalled();
    });
  });

  describe('ScheduledBackupService class', () => {
    let service: ScheduledBackupService;

    beforeEach(() => {
      service = new ScheduledBackupService();
    });

    describe('initialize', () => {
      it('should register the backup task', async () => {
        await service.initialize();

        expect(TaskManager.defineTask).toHaveBeenCalledWith(BACKUP_TASK_NAME, expect.any(Function));
      });

      it('should not initialize twice', async () => {
        await service.initialize();
        await service.initialize();

        // defineTask should only be called once
        expect(TaskManager.defineTask).toHaveBeenCalledTimes(1);
      });

      it('should enable backups when frequency is set and connected', async () => {
        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: jest.fn(() => false),
          scheduledBackup: { frequency: 'daily' },
          isConnected: true,
        });
        (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
          BackgroundFetch.BackgroundFetchStatus.Available
        );
        (BackgroundFetch.registerTaskAsync as jest.Mock).mockResolvedValue(undefined);

        const newService = new ScheduledBackupService();
        await newService.initialize();

        expect(BackgroundFetch.registerTaskAsync).toHaveBeenCalled();
      });
    });

    describe('updateSchedule', () => {
      it('should call updateScheduledBackupSettings', async () => {
        (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
          BackgroundFetch.BackgroundFetchStatus.Available
        );
        (BackgroundFetch.registerTaskAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await service.updateSchedule(true);

        expect(result).toBe(true);
      });
    });

    describe('shouldRunBackup', () => {
      it('should return the result from store', () => {
        const mockIsScheduledBackupDue = jest.fn(() => true);
        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: mockIsScheduledBackupDue,
        });

        const result = service.shouldRunBackup();

        expect(result).toBe(true);
        expect(mockIsScheduledBackupDue).toHaveBeenCalled();
      });
    });

    describe('checkAndRunScheduledBackup', () => {
      it('should return false when backup is not due', async () => {
        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: jest.fn(() => false),
        });

        const result = await service.checkAndRunScheduledBackup();

        expect(result).toBe(false);
      });

      it('should return false when not signed in', async () => {
        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: jest.fn(() => true),
        });
        (oAuthService.isSignedIn as jest.Mock).mockResolvedValue(false);

        const result = await service.checkAndRunScheduledBackup();

        expect(result).toBe(false);
      });

      it('should run backup and return true on success', async () => {
        const mockSetOperationInProgress = jest.fn();
        const mockSetOperationComplete = jest.fn();
        const mockMarkScheduledBackupRun = jest.fn();

        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: jest.fn(() => true),
          setOperationInProgress: mockSetOperationInProgress,
          setOperationComplete: mockSetOperationComplete,
          markScheduledBackupRun: mockMarkScheduledBackupRun,
        });
        (oAuthService.isSignedIn as jest.Mock).mockResolvedValue(true);
        (backupService.createBackup as jest.Mock).mockResolvedValue({
          success: true,
        });

        const result = await service.checkAndRunScheduledBackup();

        expect(result).toBe(true);
        expect(mockSetOperationInProgress).toHaveBeenCalled();
        expect(mockSetOperationComplete).toHaveBeenCalledWith(true);
        expect(mockMarkScheduledBackupRun).toHaveBeenCalled();
      });

      it('should return false on backup failure', async () => {
        const mockSetOperationInProgress = jest.fn();
        const mockSetOperationComplete = jest.fn();

        (useBackupStore.getState as jest.Mock).mockReturnValue({
          isScheduledBackupDue: jest.fn(() => true),
          setOperationInProgress: mockSetOperationInProgress,
          setOperationComplete: mockSetOperationComplete,
        });
        (oAuthService.isSignedIn as jest.Mock).mockResolvedValue(true);
        (backupService.createBackup as jest.Mock).mockResolvedValue({
          success: false,
          errorMessage: 'Backup failed',
        });

        const result = await service.checkAndRunScheduledBackup();

        expect(result).toBe(false);
        expect(mockSetOperationComplete).toHaveBeenCalledWith(false, 'Backup failed');
      });
    });

    describe('getStatus', () => {
      it('should return status information', async () => {
        (BackgroundFetch.getStatusAsync as jest.Mock).mockResolvedValue(
          BackgroundFetch.BackgroundFetchStatus.Available
        );
        (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

        const status = await service.getStatus();

        expect(status).toEqual({
          isAvailable: true,
          isEnabled: true,
          status: BackgroundFetch.BackgroundFetchStatus.Available,
        });
      });
    });
  });

  describe('scheduledBackupService singleton', () => {
    it('should be an instance of ScheduledBackupService', () => {
      expect(scheduledBackupService).toBeInstanceOf(ScheduledBackupService);
    });
  });
});
