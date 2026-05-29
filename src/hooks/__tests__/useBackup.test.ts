/**
 * useBackup Hook Tests
 *
 * Tests for the backup hook with Zustand status tracking.
 *
 * **Validates: Requirements 8, 9, 10, 26, 29**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock backup service
const mockCreateBackup = jest.fn();
const mockListBackups = jest.fn();
const mockDownloadBackup = jest.fn();
const mockClearCache = jest.fn();

jest.mock('../../services/backup/BackupService', () => ({
  backupService: {
    createBackup: (...args: unknown[]) => mockCreateBackup(...args),
    listBackups: () => mockListBackups(),
    downloadBackup: (...args: unknown[]) => mockDownloadBackup(...args),
    clearCache: () => mockClearCache(),
  },
}));

// Mock OAuth service
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../services/backup/OAuthService', () => ({
  oAuthService: {
    signIn: () => mockSignIn(),
    signOut: () => mockSignOut(),
  },
}));

// Mock Zustand store
const mockSetBackupStatus = jest.fn();
const mockSetOperationInProgress = jest.fn();
const mockSetOperationComplete = jest.fn();
const mockResetOperation = jest.fn();
const mockSetConnectionStatus = jest.fn();
const mockSetConfig = jest.fn();
const mockIsDue = jest.fn();
const mockMarkRun = jest.fn();

jest.mock('../../stores/backupStore', () => ({
  useBackupStore: jest.fn((selector) => {
    const state = {
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
        preferredHour: 3,
        lastScheduledRun: null,
      },
      isConnected: false,
      connectedEmail: null,
      setBackupStatus: mockSetBackupStatus,
    };
    return selector ? selector(state) : state;
  }),
  useBackupStatus: jest.fn(() => ({
    lastBackupTime: null,
    status: 'never',
    errorMessage: null,
  })),
  useBackupOperation: jest.fn(() => ({
    isInProgress: false,
    stage: 'idle',
    progress: 0,
    message: null,
    setInProgress: mockSetOperationInProgress,
    setComplete: mockSetOperationComplete,
    reset: mockResetOperation,
  })),
  useBackupConnection: jest.fn(() => ({
    isConnected: false,
    connectedEmail: null,
    setConnectionStatus: mockSetConnectionStatus,
  })),
  useScheduledBackup: jest.fn(() => ({
    frequency: 'disabled',
    preferredHour: 3,
    lastScheduledRun: null,
    setConfig: mockSetConfig,
    isDue: mockIsDue,
    markRun: mockMarkRun,
  })),
}));

// Import after mocks
import { useBackup } from '../useBackup';

describe('useBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDue.mockReturnValue(false);

    // Reset useBackupConnection to default disconnected state
    const { useBackupConnection } = require('../../stores/backupStore');
    useBackupConnection.mockReturnValue({
      isConnected: false,
      connectedEmail: null,
      setConnectionStatus: mockSetConnectionStatus,
    });
  });

  describe('initial state', () => {
    it('returns initial backup state', () => {
      const { result } = renderHook(() => useBackup());

      expect(result.current.lastBackupTime).toBeNull();
      expect(result.current.lastBackupStatus).toBe('never');
      expect(result.current.isBackingUp).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('connect', () => {
    it('connects to Google account successfully', async () => {
      mockSignIn.mockResolvedValue({ email: 'test@example.com', name: 'Test User' });

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const connected = await result.current.connect();
        expect(connected).toBe(true);
      });

      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSetConnectionStatus).toHaveBeenCalledWith(true, 'test@example.com');
    });

    it('handles connection failure', async () => {
      mockSignIn.mockRejectedValue(new Error('Sign in failed'));

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const connected = await result.current.connect();
        expect(connected).toBe(false);
      });

      expect(mockSetConnectionStatus).toHaveBeenCalledWith(false, null);
    });
  });

  describe('disconnect', () => {
    it('disconnects from Google account', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockSetConnectionStatus).toHaveBeenCalledWith(false, null);
      expect(mockClearCache).toHaveBeenCalled();
    });

    it('handles disconnect failure gracefully', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        await result.current.disconnect();
      });

      // Should still update connection status
      expect(mockSetConnectionStatus).toHaveBeenCalledWith(false, null);
    });
  });

  describe('backupNow', () => {
    it('creates backup when connected', async () => {
      // Mock connected state
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      mockCreateBackup.mockResolvedValue({
        success: true,
        backupId: 'backup-1',
        fileName: 'backup.db',
        timestamp: new Date(),
      });

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backupResult = await result.current.backupNow();
        expect(backupResult.success).toBe(true);
      });

      expect(mockCreateBackup).toHaveBeenCalled();
      expect(mockSetOperationComplete).toHaveBeenCalledWith(true);
    });

    it('connects first if not connected', async () => {
      mockSignIn.mockResolvedValue({ email: 'test@example.com', name: 'Test User' });
      mockCreateBackup.mockResolvedValue({
        success: true,
        backupId: 'backup-1',
        fileName: 'backup.db',
        timestamp: new Date(),
      });

      // Start disconnected, then mock connected after sign in
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection
        .mockReturnValueOnce({
          isConnected: false,
          connectedEmail: null,
          setConnectionStatus: mockSetConnectionStatus,
        })
        .mockReturnValue({
          isConnected: true,
          connectedEmail: 'test@example.com',
          setConnectionStatus: mockSetConnectionStatus,
        });

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        await result.current.backupNow();
      });

      expect(mockSignIn).toHaveBeenCalled();
    });

    it('handles backup failure', async () => {
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      mockCreateBackup.mockResolvedValue({
        success: false,
        errorMessage: 'Upload failed',
      });

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backupResult = await result.current.backupNow();
        expect(backupResult.success).toBe(false);
        expect(backupResult.errorMessage).toBe('Upload failed');
      });

      expect(mockSetOperationComplete).toHaveBeenCalledWith(false, 'Upload failed');
    });
  });

  describe('listBackups', () => {
    it('lists available backups when connected', async () => {
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      const mockBackups = [
        {
          id: 'backup-1',
          fileName: 'backup1.db',
          createdAt: new Date(),
          sizeBytes: 1000,
          schemaVersion: 1,
        },
        {
          id: 'backup-2',
          fileName: 'backup2.db',
          createdAt: new Date(),
          sizeBytes: 2000,
          schemaVersion: 1,
        },
      ];
      mockListBackups.mockResolvedValue(mockBackups);

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backups = await result.current.listBackups();
        expect(backups).toHaveLength(2);
      });

      expect(result.current.backups).toHaveLength(2);
    });

    it('returns empty array when not connected', async () => {
      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backups = await result.current.listBackups();
        expect(backups).toHaveLength(0);
      });
    });
  });

  describe('restore', () => {
    it('restores from backup when connected', async () => {
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      mockDownloadBackup.mockResolvedValue('/path/to/backup.db');

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const restoreResult = await result.current.restore('backup-1');
        expect(restoreResult.success).toBe(true);
      });

      expect(mockDownloadBackup).toHaveBeenCalledWith('backup-1', expect.any(Function));
    });

    it('returns error when not connected', async () => {
      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const restoreResult = await result.current.restore('backup-1');
        expect(restoreResult.success).toBe(false);
        expect(restoreResult.errorMessage).toBe('Not connected to Google account');
      });
    });
  });

  describe('scheduled backup settings', () => {
    it('sets backup frequency', () => {
      const { result } = renderHook(() => useBackup());

      act(() => {
        result.current.setBackupFrequency('daily');
      });

      expect(mockSetConfig).toHaveBeenCalledWith({ frequency: 'daily' });
    });

    it('sets preferred hour', () => {
      const { result } = renderHook(() => useBackup());

      act(() => {
        result.current.setPreferredHour(8);
      });

      expect(mockSetConfig).toHaveBeenCalledWith({ preferredHour: 8 });
    });

    it('clamps preferred hour to valid range', () => {
      const { result } = renderHook(() => useBackup());

      act(() => {
        result.current.setPreferredHour(25);
      });

      expect(mockSetConfig).toHaveBeenCalledWith({ preferredHour: 23 });

      act(() => {
        result.current.setPreferredHour(-1);
      });

      expect(mockSetConfig).toHaveBeenCalledWith({ preferredHour: 0 });
    });
  });

  describe('runScheduledBackupIfDue', () => {
    it('runs backup when due', async () => {
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      mockIsDue.mockReturnValue(true);
      mockCreateBackup.mockResolvedValue({
        success: true,
        backupId: 'backup-1',
        fileName: 'backup.db',
        timestamp: new Date(),
      });

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backupResult = await result.current.runScheduledBackupIfDue();
        expect(backupResult?.success).toBe(true);
      });

      expect(mockMarkRun).toHaveBeenCalled();
    });

    it('returns null when not due', async () => {
      mockIsDue.mockReturnValue(false);

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        const backupResult = await result.current.runScheduledBackupIfDue();
        expect(backupResult).toBeNull();
      });

      expect(mockCreateBackup).not.toHaveBeenCalled();
    });
  });

  describe('refreshBackups', () => {
    it('refreshes backup list', async () => {
      const { useBackupConnection } = require('../../stores/backupStore');
      useBackupConnection.mockReturnValue({
        isConnected: true,
        connectedEmail: 'test@example.com',
        setConnectionStatus: mockSetConnectionStatus,
      });

      mockListBackups.mockResolvedValue([]);

      const { result } = renderHook(() => useBackup());

      await act(async () => {
        await result.current.refreshBackups();
      });

      expect(mockListBackups).toHaveBeenCalled();
    });
  });
});
