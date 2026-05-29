/**
 * Unit Tests: CustomServerIntegration
 *
 * Tests the integration helpers: createCustomServerBackup and restoreFromCustomServer.
 * These orchestrate the full backup/restore flows using BackupService, RestoreService,
 * and CustomServerClient.
 *
 * Validates: Requirements 4.1, 4.4, 6.5
 */
import {
  createCustomServerBackup,
  restoreFromCustomServer,
} from '../../../../src/services/backup/CustomServerIntegration';
import { backupService, BackupError } from '../../../../src/services/backup/BackupService';
import { restoreService } from '../../../../src/services/backup/RestoreService';
import {
  CustomServerError,
  CustomServerConfig,
  ServerBackupResponse,
} from '../../../../src/services/backup/CustomServerClient';
import * as FileSystem from 'expo-file-system';
import type { RestoreResult } from '../../../../src/types/backup';

// Mock BackupService
jest.mock('../../../../src/services/backup/BackupService', () => ({
  backupService: {
    exportDatabase: jest.fn(),
  },
  BackupError: class BackupError extends Error {
    code: string;
    constructor(message: string, code: string, originalError?: unknown) {
      super(message);
      this.name = 'BackupError';
      this.code = code;
    }
  },
}));

// Mock RestoreService
jest.mock('../../../../src/services/backup/RestoreService', () => ({
  restoreService: {
    validateBackup: jest.fn(),
    restoreDatabase: jest.fn(),
  },
}));

// Mock CustomServerClient upload and download
jest.mock('../../../../src/services/backup/CustomServerClient', () => {
  const actual = jest.requireActual('../../../../src/services/backup/CustomServerClient');
  return {
    ...actual,
    upload: jest.fn(),
    download: jest.fn(),
  };
});

import { upload, download } from '../../../../src/services/backup/CustomServerClient';

const mockExportDatabase = backupService.exportDatabase as jest.MockedFunction<
  typeof backupService.exportDatabase
>;
const mockValidateBackup = restoreService.validateBackup as jest.MockedFunction<
  typeof restoreService.validateBackup
>;
const mockRestoreDatabase = restoreService.restoreDatabase as jest.MockedFunction<
  typeof restoreService.restoreDatabase
>;
const mockUpload = upload as jest.MockedFunction<typeof upload>;
const mockDownload = download as jest.MockedFunction<typeof download>;
const mockGetInfoAsync = FileSystem.getInfoAsync as jest.MockedFunction<
  typeof FileSystem.getInfoAsync
>;
const mockDeleteAsync = FileSystem.deleteAsync as jest.MockedFunction<
  typeof FileSystem.deleteAsync
>;

const validConfig: CustomServerConfig = {
  serverUrl: 'http://192.168.1.10:3000',
  apiKey: 'test-api-key-123',
  deviceId: 'abcdef1234567890abcdef1234567890',
};

describe('createCustomServerBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full backup flow: export → upload → cleanup → return response', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    const serverResponse: ServerBackupResponse = {
      filename: 'gg-economy-backup-20250115-143022.db',
      timestamp: '2025-01-15T14:30:22.000Z',
      sizeBytes: 2048,
    };

    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048, isDirectory: false, uri: tempPath, modificationTime: 0 } as any);
    mockUpload.mockResolvedValueOnce(serverResponse);

    const result = await createCustomServerBackup(validConfig);

    expect(mockExportDatabase).toHaveBeenCalledTimes(1);
    expect(mockGetInfoAsync).toHaveBeenCalledWith(tempPath);
    expect(mockUpload).toHaveBeenCalledWith(tempPath, validConfig, undefined);
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
    expect(result).toEqual(serverResponse);
  });

  it('should throw EXPORT_FAILED when export fails with generic error', async () => {
    mockExportDatabase.mockRejectedValueOnce(new Error('Disk full'));

    await expect(createCustomServerBackup(validConfig)).rejects.toMatchObject({
      code: 'EXPORT_FAILED',
      message: 'Failed to export database',
    });
  });

  it('should throw DATABASE_NOT_FOUND when BackupError has DATABASE_NOT_FOUND code', async () => {
    const { BackupError: MockedBackupError } = jest.requireMock(
      '../../../../src/services/backup/BackupService'
    );
    mockExportDatabase.mockRejectedValueOnce(
      new MockedBackupError('Database file not found', 'DATABASE_NOT_FOUND')
    );

    await expect(createCustomServerBackup(validConfig)).rejects.toMatchObject({
      code: 'DATABASE_NOT_FOUND',
    });
  });

  it('should throw DATABASE_NOT_FOUND when exported file does not exist', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false, isDirectory: false, uri: tempPath } as any);

    await expect(createCustomServerBackup(validConfig)).rejects.toMatchObject({
      code: 'DATABASE_NOT_FOUND',
      message: 'Database file not found after export',
    });

    // Temp file should still be cleaned up
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
  });

  it('should cleanup temp file when upload fails', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048, isDirectory: false, uri: tempPath, modificationTime: 0 } as any);
    mockUpload.mockRejectedValueOnce(
      new CustomServerError('Upload failed', 'UPLOAD_FAILED', 500)
    );

    await expect(createCustomServerBackup(validConfig)).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
    });

    // Temp file should be cleaned up even on upload failure
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
  });

  it('should cleanup temp file when export fails', async () => {
    // When export fails, tempPath is null so deleteAsync should NOT be called
    mockExportDatabase.mockRejectedValueOnce(new Error('Export error'));

    await expect(createCustomServerBackup(validConfig)).rejects.toThrow();

    // tempPath is null when export fails before assignment, so no cleanup needed
    // But if export succeeds and then something else fails, cleanup happens
    // In this case, export itself fails so tempPath remains null
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('should invoke progress callback at export start and export complete', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    const serverResponse: ServerBackupResponse = {
      filename: 'gg-economy-backup-20250115-143022.db',
      timestamp: '2025-01-15T14:30:22.000Z',
      sizeBytes: 2048,
    };

    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048, isDirectory: false, uri: tempPath, modificationTime: 0 } as any);
    mockUpload.mockResolvedValueOnce(serverResponse);

    const onProgress = jest.fn();
    await createCustomServerBackup(validConfig, onProgress);

    // Should report exporting start (progress: 0)
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'exporting',
        progress: 0,
        message: 'Exporting database...',
      })
    );

    // Should report export complete (progress: 1)
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'exporting',
        progress: 1,
        message: 'Export complete',
      })
    );
  });

  it('should pass progress callback to upload', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    const serverResponse: ServerBackupResponse = {
      filename: 'gg-economy-backup-20250115-143022.db',
      timestamp: '2025-01-15T14:30:22.000Z',
      sizeBytes: 2048,
    };

    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048, isDirectory: false, uri: tempPath, modificationTime: 0 } as any);
    mockUpload.mockResolvedValueOnce(serverResponse);

    const onProgress = jest.fn();
    await createCustomServerBackup(validConfig, onProgress);

    // Upload should receive the progress callback
    expect(mockUpload).toHaveBeenCalledWith(tempPath, validConfig, onProgress);
  });

  it('should not fail if temp file deletion throws during cleanup', async () => {
    const tempPath = '/mock/cache/gg-economy-backup-20250115-143022.db';
    const serverResponse: ServerBackupResponse = {
      filename: 'gg-economy-backup-20250115-143022.db',
      timestamp: '2025-01-15T14:30:22.000Z',
      sizeBytes: 2048,
    };

    mockExportDatabase.mockResolvedValueOnce(tempPath);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048, isDirectory: false, uri: tempPath, modificationTime: 0 } as any);
    mockUpload.mockResolvedValueOnce(serverResponse);
    mockDeleteAsync.mockRejectedValueOnce(new Error('Permission denied'));

    // Should still succeed even if cleanup fails
    const result = await createCustomServerBackup(validConfig);
    expect(result).toEqual(serverResponse);
  });
});

describe('restoreFromCustomServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full restore flow: download → validate → restore → cleanup → return result', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    const restoreResult: RestoreResult = {
      success: true,
      transactionCount: 42,
      schemaVersion: 1,
    };

    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockResolvedValueOnce(true);
    mockRestoreDatabase.mockResolvedValueOnce(restoreResult);

    const result = await restoreFromCustomServer('test-backup.db', validConfig);

    expect(mockDownload).toHaveBeenCalledWith('test-backup.db', validConfig, undefined);
    expect(mockValidateBackup).toHaveBeenCalledWith(tempPath);
    expect(mockRestoreDatabase).toHaveBeenCalledWith(tempPath);
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
    expect(result).toEqual(restoreResult);
  });

  it('should propagate download error and not attempt cleanup (tempPath is null)', async () => {
    const downloadError = new CustomServerError('Backup not found', 'NOT_FOUND', 404);
    mockDownload.mockRejectedValueOnce(downloadError);

    await expect(
      restoreFromCustomServer('missing.db', validConfig)
    ).rejects.toBe(downloadError);

    // No temp file to clean since download failed before returning a path
    expect(mockDeleteAsync).not.toHaveBeenCalled();
    expect(mockValidateBackup).not.toHaveBeenCalled();
    expect(mockRestoreDatabase).not.toHaveBeenCalled();
  });

  it('should cleanup temp file when restore fails', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockResolvedValueOnce(true);
    mockRestoreDatabase.mockRejectedValueOnce(new Error('Restore failed'));

    await expect(
      restoreFromCustomServer('test-backup.db', validConfig)
    ).rejects.toThrow('Restore failed');

    // Temp file should be cleaned up
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
  });

  it('should cleanup temp file when validation fails', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockRejectedValueOnce(new Error('Backup file is empty'));

    await expect(
      restoreFromCustomServer('test-backup.db', validConfig)
    ).rejects.toThrow('Backup file is empty');

    // Temp file should be cleaned up
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
    // restoreDatabase should not have been called
    expect(mockRestoreDatabase).not.toHaveBeenCalled();
  });

  it('should pass progress callback to download', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    const restoreResult: RestoreResult = { success: true, transactionCount: 10, schemaVersion: 1 };

    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockResolvedValueOnce(true);
    mockRestoreDatabase.mockResolvedValueOnce(restoreResult);

    const onProgress = jest.fn();
    await restoreFromCustomServer('test-backup.db', validConfig, onProgress);

    expect(mockDownload).toHaveBeenCalledWith('test-backup.db', validConfig, onProgress);
  });

  it('should not fail if temp file deletion throws during cleanup', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    const restoreResult: RestoreResult = { success: true, transactionCount: 5, schemaVersion: 1 };

    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockResolvedValueOnce(true);
    mockRestoreDatabase.mockResolvedValueOnce(restoreResult);
    mockDeleteAsync.mockRejectedValueOnce(new Error('Permission denied'));

    // Should still succeed even if cleanup fails
    const result = await restoreFromCustomServer('test-backup.db', validConfig);
    expect(result).toEqual(restoreResult);
  });

  it('should cleanup temp file even when restore returns failure result', async () => {
    const tempPath = '/mock/cache/backup-123-test.db';
    const restoreResult: RestoreResult = {
      success: false,
      errorMessage: 'Migration failed',
    };

    mockDownload.mockResolvedValueOnce(tempPath);
    mockValidateBackup.mockResolvedValueOnce(true);
    mockRestoreDatabase.mockResolvedValueOnce(restoreResult);

    const result = await restoreFromCustomServer('test-backup.db', validConfig);

    expect(result).toEqual(restoreResult);
    expect(mockDeleteAsync).toHaveBeenCalledWith(tempPath, { idempotent: true });
  });
});
