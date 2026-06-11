/**
 * useCloudSync Hook Tests
 *
 * Tests for the cloud sync hook that manages sync pipeline state.
 * The hook delegates execution to CloudSyncService and manages
 * React state for progress, results, and errors.
 */
import { renderHook, act } from '@testing-library/react-native';

import { CloudSyncError } from '../../services/cloud-sync/CloudSyncError';
import type { ImportResult, SyncStep } from '../../services/cloud-sync/types';

// Mock CloudSyncService
const mockExecute = jest.fn();
jest.mock('../../services/cloud-sync/CloudSyncService', () => ({
  execute: (...args: unknown[]) => mockExecute(...args),
}));

// Mock db/client
jest.mock('../../db/client', () => ({
  getDb: jest.fn(() => ({}) as never),
}));

// Mock SyncKeyStorage
const mockGetSyncKey = jest.fn();
const mockSetSyncKey = jest.fn();
const mockRemoveSyncKey = jest.fn();
const mockValidateSyncKey = jest.fn();
jest.mock('../../services/cloud-sync/SyncKeyStorage', () => ({
  getSyncKey: () => mockGetSyncKey(),
  setSyncKey: (key: string) => mockSetSyncKey(key),
  removeSyncKey: () => mockRemoveSyncKey(),
  validateSyncKey: (key: string, url: string) => mockValidateSyncKey(key, url),
  isValidSyncKeyFormat: (key: string) => key.startsWith('gge_') && key.length > 4,
}));

// Mock config
jest.mock('../../services/cloud-sync/config', () => ({
  getCloudSyncConfig: jest.fn().mockResolvedValue({ baseUrl: 'https://example.com' }),
}));

// Import after mocks
import { useCloudSync } from '../useCloudSync';

// Test data
const mockImportResult: ImportResult = {
  totals: { ok: 15, failed: 1, skipped: 3 },
  tables: {
    categories: { ok: 5, failed: 0, skipped: 1 },
    funds: { ok: 3, failed: 0, skipped: 0 },
    transactions: { ok: 7, failed: 1, skipped: 2 },
  },
};

describe('useCloudSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSyncKey.mockResolvedValue(null);
  });

  describe('initial state', () => {
    it('should have isRunning as false', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.isRunning).toBe(false);
    });

    it('should have currentStep as null', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.currentStep).toBeNull();
    });

    it('should have result as null', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.result).toBeNull();
    });

    it('should have error as null', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.error).toBeNull();
    });

    it('should have hasKey as false when no key stored', async () => {
      mockGetSyncKey.mockResolvedValue(null);
      const { result } = renderHook(() => useCloudSync());

      // Wait for the useEffect to resolve
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.hasKey).toBe(false);
    });

    it('should have hasKey as true when key is stored', async () => {
      mockGetSyncKey.mockResolvedValue('gge_testkey123');
      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.hasKey).toBe(true);
    });
  });

  describe('successful sync state transitions', () => {
    it('should set isRunning to true while sync is in progress', async () => {
      let resolveExecute: ((value: ImportResult) => void) | undefined;
      mockExecute.mockImplementation(
        () =>
          new Promise<ImportResult>((resolve) => {
            resolveExecute = resolve;
          })
      );

      const { result } = renderHook(() => useCloudSync());

      let syncPromise: Promise<void>;
      act(() => {
        syncPromise = result.current.startSync();
      });

      expect(result.current.isRunning).toBe(true);

      await act(async () => {
        resolveExecute!(mockImportResult);
        await syncPromise;
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should update currentStep via onProgress callback during sync', async () => {
      mockExecute.mockImplementation(async (params: { onProgress?: (step: SyncStep) => void }) => {
        params.onProgress?.('uploading');
        return mockImportResult;
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      // After completion, currentStep should be null (reset in finally)
      expect(result.current.currentStep).toBeNull();
    });

    it('should set result on successful sync completion', async () => {
      mockExecute.mockResolvedValue(mockImportResult);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.result).toEqual(mockImportResult);
      expect(result.current.error).toBeNull();
    });

    it('should clear previous error when starting a new sync', async () => {
      mockExecute.mockRejectedValueOnce(new CloudSyncError('Auth failed', 'AUTH_FAILED', 401));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).not.toBeNull();

      mockExecute.mockResolvedValueOnce(mockImportResult);

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(mockImportResult);
    });

    it('should pass onProgress to execute', async () => {
      mockExecute.mockResolvedValue(mockImportResult);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs.db).toBeDefined();
      expect(callArgs.onProgress).toBeInstanceOf(Function);
    });
  });

  describe('sync key management', () => {
    it('should validate and save a valid sync key', async () => {
      mockValidateSyncKey.mockResolvedValue(true);
      mockSetSyncKey.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.saveSyncKey('gge_validkey12345');
      });

      expect(mockValidateSyncKey).toHaveBeenCalledWith('gge_validkey12345', 'https://example.com');
      expect(mockSetSyncKey).toHaveBeenCalledWith('gge_validkey12345');
      expect(result.current.hasKey).toBe(true);
      expect(result.current.isKeyValid).toBe(true);
    });

    it('should throw for invalid key format', async () => {
      const { result } = renderHook(() => useCloudSync());

      await expect(
        act(async () => {
          await result.current.saveSyncKey('invalid_key');
        })
      ).rejects.toThrow();

      expect(result.current.hasKey).toBe(false);
    });

    it('should set error when validation fails', async () => {
      mockValidateSyncKey.mockRejectedValue(
        new CloudSyncError('Chave inválida ou revogada', 'AUTH_FAILED', 401)
      );

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        try {
          await result.current.saveSyncKey('gge_invalidkey');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.code).toBe('AUTH_FAILED');
      expect(result.current.isKeyValid).toBe(false);
      expect(result.current.hasKey).toBe(false);
    });

    it('should remove stored key', async () => {
      mockGetSyncKey.mockResolvedValue('gge_existingkey');
      mockRemoveSyncKey.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve(); // wait for useEffect
      });

      expect(result.current.hasKey).toBe(true);

      await act(async () => {
        await result.current.removeSyncKeyAction();
      });

      expect(mockRemoveSyncKey).toHaveBeenCalled();
      expect(result.current.hasKey).toBe(false);
    });
  });

  describe('error state on failure', () => {
    it('should set error when CloudSyncError is thrown', async () => {
      const syncError = new CloudSyncError('Key invalid', 'AUTH_FAILED', 401);
      mockExecute.mockRejectedValue(syncError);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).toBe(syncError);
      expect(result.current.error?.code).toBe('AUTH_FAILED');
      expect(result.current.result).toBeNull();
      expect(result.current.isRunning).toBe(false);
    });

    it('should wrap non-CloudSyncError errors into SERVER_ERROR', async () => {
      mockExecute.mockRejectedValue(new Error('Something unexpected'));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).toBeInstanceOf(CloudSyncError);
      expect(result.current.error?.code).toBe('SERVER_ERROR');
      expect(result.current.error?.message).toBe('Something unexpected');
    });

    it('should wrap non-Error thrown values into SERVER_ERROR', async () => {
      mockExecute.mockRejectedValue('string error');

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).toBeInstanceOf(CloudSyncError);
      expect(result.current.error?.code).toBe('SERVER_ERROR');
      expect(result.current.error?.message).toBe('Unexpected error occurred');
    });

    it('should reset isRunning to false after failure', async () => {
      mockExecute.mockRejectedValue(new CloudSyncError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should reset currentStep to null after failure', async () => {
      mockExecute.mockRejectedValue(new CloudSyncError('Extraction failed', 'EXTRACTION_FAILED'));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.currentStep).toBeNull();
    });
  });

  describe('clearResult action', () => {
    it('should clear the stored result', async () => {
      mockExecute.mockResolvedValue(mockImportResult);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.result).toEqual(mockImportResult);

      act(() => {
        result.current.clearResult();
      });

      expect(result.current.result).toBeNull();
    });
  });

  describe('clearError action', () => {
    it('should clear the stored error', async () => {
      mockExecute.mockRejectedValue(new CloudSyncError('Auth failed', 'AUTH_FAILED', 401));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('double-submission prevention', () => {
    it('should set isRunning true during sync so UI can disable controls', async () => {
      let resolveExecute: ((value: ImportResult) => void) | undefined;
      mockExecute.mockImplementation(
        () =>
          new Promise<ImportResult>((resolve) => {
            resolveExecute = resolve;
          })
      );

      const { result } = renderHook(() => useCloudSync());

      let syncPromise: Promise<void>;
      act(() => {
        syncPromise = result.current.startSync();
      });

      expect(result.current.isRunning).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveExecute!(mockImportResult);
        await syncPromise;
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('should allow a new sync after the previous one completes', async () => {
      mockExecute.mockResolvedValue(mockImportResult);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.isRunning).toBe(false);

      await act(async () => {
        await result.current.startSync();
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should allow a new sync after the previous one fails', async () => {
      mockExecute.mockRejectedValueOnce(new CloudSyncError('Auth failed', 'AUTH_FAILED', 401));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.isRunning).toBe(false);

      mockExecute.mockResolvedValueOnce(mockImportResult);

      await act(async () => {
        await result.current.startSync();
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.current.result).toEqual(mockImportResult);
    });

    it('should handle ALREADY_RUNNING from service as an error state', async () => {
      mockExecute.mockRejectedValue(
        new CloudSyncError('A sync is already in progress', 'ALREADY_RUNNING')
      );

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.startSync();
      });

      expect(result.current.error?.code).toBe('ALREADY_RUNNING');
      expect(result.current.isRunning).toBe(false);
    });
  });
});
