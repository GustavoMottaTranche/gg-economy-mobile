/**
 * Unit tests for backupStore
 *
 * Tests backup status tracking, scheduled backup configuration, and state management.
 *
 * **Validates: Requirements 8, 9, 26**
 */

import { useBackupStore, type BackupFrequency } from '../../../src/stores/backupStore';

// Helper to wrap state updates
const act = (fn: () => void) => {
  fn();
};

describe('backupStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useBackupStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useBackupStore.getState();

      expect(state.lastBackupTime).toBeNull();
      expect(state.lastBackupStatus).toBe('never');
      expect(state.lastBackupError).toBeNull();
      expect(state.operation.isInProgress).toBe(false);
      expect(state.operation.stage).toBe('idle');
      expect(state.scheduledBackup.frequency).toBe('disabled');
      expect(state.isConnected).toBe(false);
      expect(state.connectedEmail).toBeNull();
    });
  });

  describe('setBackupStatus', () => {
    it('should update backup status on success', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');

      act(() => {
        useBackupStore.getState().setBackupStatus({
          lastBackupTime: timestamp,
          status: 'success',
        });
      });

      const state = useBackupStore.getState();
      expect(state.lastBackupTime).toBe(timestamp.toISOString());
      expect(state.lastBackupStatus).toBe('success');
      expect(state.lastBackupError).toBeNull();
    });

    it('should update backup status on failure', () => {
      act(() => {
        useBackupStore.getState().setBackupStatus({
          lastBackupTime: null,
          status: 'failed',
          errorMessage: 'Network error',
        });
      });

      const state = useBackupStore.getState();
      expect(state.lastBackupStatus).toBe('failed');
      expect(state.lastBackupError).toBe('Network error');
    });
  });

  describe('setOperationInProgress', () => {
    it('should update operation state', () => {
      act(() => {
        useBackupStore.getState().setOperationInProgress('exporting', 0.5, 'Exporting database...');
      });

      const state = useBackupStore.getState();
      expect(state.operation.isInProgress).toBe(true);
      expect(state.operation.stage).toBe('exporting');
      expect(state.operation.progress).toBe(0.5);
      expect(state.operation.message).toBe('Exporting database...');
    });
  });

  describe('setOperationComplete', () => {
    it('should update state on successful completion', () => {
      act(() => {
        useBackupStore.getState().setOperationComplete(true);
      });

      const state = useBackupStore.getState();
      expect(state.operation.isInProgress).toBe(false);
      expect(state.operation.stage).toBe('complete');
      expect(state.operation.progress).toBe(1);
      expect(state.lastBackupStatus).toBe('success');
      expect(state.lastBackupTime).not.toBeNull();
    });

    it('should update state on failed completion', () => {
      act(() => {
        useBackupStore.getState().setOperationComplete(false, 'Upload failed');
      });

      const state = useBackupStore.getState();
      expect(state.operation.isInProgress).toBe(false);
      expect(state.operation.stage).toBe('error');
      expect(state.lastBackupStatus).toBe('failed');
      expect(state.lastBackupError).toBe('Upload failed');
    });
  });

  describe('resetOperation', () => {
    it('should reset operation to idle state', () => {
      // First set operation in progress
      act(() => {
        useBackupStore.getState().setOperationInProgress('uploading', 0.7, 'Uploading...');
      });

      // Then reset
      act(() => {
        useBackupStore.getState().resetOperation();
      });

      const state = useBackupStore.getState();
      expect(state.operation.isInProgress).toBe(false);
      expect(state.operation.stage).toBe('idle');
      expect(state.operation.progress).toBe(0);
      expect(state.operation.message).toBeNull();
    });
  });

  describe('setScheduledBackupConfig', () => {
    it('should update frequency', () => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({ frequency: 'daily' });
      });

      expect(useBackupStore.getState().scheduledBackup.frequency).toBe('daily');
    });

    it('should update preferred hour', () => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({ preferredHour: 14 });
      });

      expect(useBackupStore.getState().scheduledBackup.preferredHour).toBe(14);
    });

    it('should update multiple settings at once', () => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({
          frequency: 'weekly',
          preferredHour: 22,
        });
      });

      const config = useBackupStore.getState().scheduledBackup;
      expect(config.frequency).toBe('weekly');
      expect(config.preferredHour).toBe(22);
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connection status', () => {
      act(() => {
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
      });

      const state = useBackupStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.connectedEmail).toBe('user@example.com');
    });

    it('should clear email on disconnect', () => {
      // First connect
      act(() => {
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
      });

      // Then disconnect
      act(() => {
        useBackupStore.getState().setConnectionStatus(false);
      });

      const state = useBackupStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectedEmail).toBeNull();
    });
  });

  describe('getBackupStatusInfo', () => {
    it('should return formatted backup status', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');

      act(() => {
        useBackupStore.getState().setBackupStatus({
          lastBackupTime: timestamp,
          status: 'success',
        });
      });

      const statusInfo = useBackupStore.getState().getBackupStatusInfo();

      expect(statusInfo.lastBackupTime).toBeInstanceOf(Date);
      expect(statusInfo.lastBackupTime?.toISOString()).toBe(timestamp.toISOString());
      expect(statusInfo.status).toBe('success');
    });

    it('should return null lastBackupTime when never backed up', () => {
      const statusInfo = useBackupStore.getState().getBackupStatusInfo();

      expect(statusInfo.lastBackupTime).toBeNull();
      expect(statusInfo.status).toBe('never');
    });
  });

  describe('isScheduledBackupDue', () => {
    it('should return false when frequency is disabled', () => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({ frequency: 'disabled' });
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
      });

      expect(useBackupStore.getState().isScheduledBackupDue()).toBe(false);
    });

    it('should return false when not connected', () => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({ frequency: 'daily' });
        useBackupStore.getState().setConnectionStatus(false);
      });

      expect(useBackupStore.getState().isScheduledBackupDue()).toBe(false);
    });

    it('should return true when backup is due', () => {
      // Set up: daily backup, connected, last run was 2 days ago
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({
          frequency: 'daily',
          preferredHour: 0, // Midnight
          lastScheduledRun: twoDaysAgo.toISOString(),
        });
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
      });

      expect(useBackupStore.getState().isScheduledBackupDue()).toBe(true);
    });

    it('should return false when backup is not yet due', () => {
      // Set up: weekly backup, connected, last run was 1 day ago
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({
          frequency: 'weekly',
          preferredHour: 23, // 11 PM
          lastScheduledRun: oneDayAgo.toISOString(),
        });
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
      });

      expect(useBackupStore.getState().isScheduledBackupDue()).toBe(false);
    });
  });

  describe('markScheduledBackupRun', () => {
    it('should update lastScheduledRun timestamp', () => {
      const before = new Date();

      act(() => {
        useBackupStore.getState().markScheduledBackupRun();
      });

      const after = new Date();
      const lastRun = new Date(useBackupStore.getState().scheduledBackup.lastScheduledRun!);

      expect(lastRun.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastRun.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set up some state
      act(() => {
        useBackupStore.getState().setBackupStatus({
          lastBackupTime: new Date(),
          status: 'success',
        });
        useBackupStore.getState().setConnectionStatus(true, 'user@example.com');
        useBackupStore.getState().setScheduledBackupConfig({ frequency: 'daily' });
      });

      // Reset
      act(() => {
        useBackupStore.getState().reset();
      });

      const state = useBackupStore.getState();
      expect(state.lastBackupTime).toBeNull();
      expect(state.lastBackupStatus).toBe('never');
      expect(state.isConnected).toBe(false);
      expect(state.scheduledBackup.frequency).toBe('disabled');
    });
  });
});

describe('selector hooks', () => {
  beforeEach(() => {
    useBackupStore.getState().reset();
  });

  describe('useBackupStatus', () => {
    it('should return backup status info', () => {
      // This is a simplified test since we can't use React hooks directly
      // In a real component test, we would use renderHook
      const state = useBackupStore.getState();

      expect(state.lastBackupTime).toBeNull();
      expect(state.lastBackupStatus).toBe('never');
    });
  });

  describe('useBackupOperation', () => {
    it('should return operation state', () => {
      const state = useBackupStore.getState();

      expect(state.operation.isInProgress).toBe(false);
      expect(state.operation.stage).toBe('idle');
    });
  });

  describe('useBackupConnection', () => {
    it('should return connection state', () => {
      const state = useBackupStore.getState();

      expect(state.isConnected).toBe(false);
      expect(state.connectedEmail).toBeNull();
    });
  });

  describe('useScheduledBackup', () => {
    it('should return scheduled backup config', () => {
      const state = useBackupStore.getState();

      expect(state.scheduledBackup.frequency).toBe('disabled');
      expect(state.scheduledBackup.preferredHour).toBe(3);
    });
  });
});

describe('BackupFrequency type', () => {
  it('should accept valid frequency values', () => {
    const frequencies: BackupFrequency[] = [
      'daily',
      'every2days',
      'every3days',
      'weekly',
      'disabled',
    ];

    frequencies.forEach((freq) => {
      act(() => {
        useBackupStore.getState().setScheduledBackupConfig({ frequency: freq });
      });
      expect(useBackupStore.getState().scheduledBackup.frequency).toBe(freq);
    });
  });
});
