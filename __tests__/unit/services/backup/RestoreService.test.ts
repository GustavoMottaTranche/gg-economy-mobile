/**
 * Unit tests for RestoreService
 *
 * Tests backup listing, download, validation, and database restoration.
 *
 * **Validates: Requirements 10, 29, 32**
 */

import * as FileSystem from 'expo-file-system';
import { RestoreService, RestoreError } from '../../../../src/services/backup/RestoreService';
import { oAuthService } from '../../../../src/services/backup/OAuthService';
import { googleDriveClient } from '../../../../src/services/backup/GoogleDriveClient';
import * as migrate from '../../../../src/db/migrate';
import * as client from '../../../../src/db/client';

// Mock the dependencies
jest.mock('../../../../src/services/backup/OAuthService', () => {
  class MockOAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OAuthError';
    }
  }
  return {
    oAuthService: {
      getAccessToken: jest.fn(),
      isSignedIn: jest.fn(),
    },
    OAuthError: MockOAuthError,
  };
});

jest.mock('../../../../src/services/backup/GoogleDriveClient', () => {
  class MockDriveError extends Error {
    code: string;
    httpStatus?: number;
    constructor(message: string, code: string, httpStatus?: number) {
      super(message);
      this.name = 'DriveError';
      this.code = code;
      this.httpStatus = httpStatus;
    }
  }
  return {
    googleDriveClient: {
      ensureBackupFolder: jest.fn(),
      uploadFile: jest.fn(),
      listBackups: jest.fn(),
      downloadFile: jest.fn(),
    },
    DriveError: MockDriveError,
    BACKUP_CONFIG: {
      ROOT_FOLDER_NAME: 'GG-Economy',
      BACKUPS_FOLDER_NAME: 'backups',
      FILE_PREFIX: 'gg-economy-backup-',
      FILE_EXTENSION: '.db',
    },
  };
});

jest.mock('../../../../src/services/backup/BackupService', () => {
  class MockBackupError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'BackupError';
      this.code = code;
    }
  }
  return {
    backupService: {
      listBackups: jest.fn(),
      downloadBackup: jest.fn(),
    },
    BackupError: MockBackupError,
    parseBackupTimestamp: jest.fn((fileName: string) => {
      const match = fileName.match(
        /gg-economy-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/
      );
      if (!match) return null;
      const [, year, month, day, hours, minutes, seconds] = match;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10)
      );
    }),
  };
});

jest.mock('../../../../src/db/migrate', () => ({
  runMigrations: jest.fn(),
  getCurrentSchemaVersion: jest.fn(),
}));

jest.mock('../../../../src/db/client', () => ({
  DATABASE_NAME: 'gg-economy.db',
  resetDbClient: jest.fn(),
  getExpoDatabase: jest.fn(() => ({
    getFirstSync: jest.fn(() => ({ count: 42 })),
  })),
}));

describe('RestoreService', () => {
  let restoreService: RestoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    restoreService = new RestoreService();
  });

  describe('getDatabasePath', () => {
    it('should return correct database path', () => {
      const path = restoreService.getDatabasePath();
      expect(path).toBe('/mock/documents/SQLite/gg-economy.db');
    });
  });

  describe('getRestoreTempPath', () => {
    it('should return correct temp path', () => {
      const path = restoreService.getRestoreTempPath('test-restore.db');
      expect(path).toBe('/mock/cache/test-restore.db');
    });
  });

  describe('listBackups', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
    });

    it('should list backups from Google Drive sorted by date', async () => {
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([
        {
          id: 'file-1',
          name: 'gg-economy-backup-20240114-093000.db',
          size: '1024',
          createdTime: '2024-01-14T09:30:00Z',
        },
        {
          id: 'file-2',
          name: 'gg-economy-backup-20240115-103045.db',
          size: '2048',
          createdTime: '2024-01-15T10:30:45Z',
        },
      ]);

      const backups = await restoreService.listBackups();

      expect(backups).toHaveLength(2);
      // Should be sorted newest first
      expect(backups[0].id).toBe('file-2');
      expect(backups[0].fileName).toBe('gg-economy-backup-20240115-103045.db');
      expect(backups[0].sizeBytes).toBe(2048);
      expect(backups[1].id).toBe('file-1');
    });

    it('should throw error when not authenticated', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(restoreService.listBackups()).rejects.toThrow(RestoreError);
      await expect(restoreService.listBackups()).rejects.toMatchObject({
        code: 'NOT_AUTHENTICATED',
      });
    });

    it('should report progress during listing', async () => {
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([]);

      const progressCallback = jest.fn();
      await restoreService.listBackups(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({ stage: 'listing' }));
    });

    it('should return empty array when no backups exist', async () => {
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([]);

      const backups = await restoreService.listBackups();

      expect(backups).toHaveLength(0);
    });
  });

  describe('downloadBackup', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.downloadFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should download backup from Google Drive', async () => {
      const localPath = await restoreService.downloadBackup('mock-file-id');

      expect(localPath).toMatch(/^\/mock\/cache\/restore-\d+\.db$/);
      expect(googleDriveClient.downloadFile).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-file-id',
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should throw error when not authenticated', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(restoreService.downloadBackup('mock-file-id')).rejects.toThrow(RestoreError);
      await expect(restoreService.downloadBackup('mock-file-id')).rejects.toMatchObject({
        code: 'NOT_AUTHENTICATED',
      });
    });

    it('should report progress during download', async () => {
      const progressCallback = jest.fn();
      await restoreService.downloadBackup('mock-file-id', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'downloading' })
      );
    });

    it('should throw BACKUP_NOT_FOUND when file does not exist', async () => {
      const { DriveError } = jest.requireMock('../../../../src/services/backup/GoogleDriveClient');
      (googleDriveClient.downloadFile as jest.Mock).mockRejectedValue(
        new DriveError('Not found', 'NOT_FOUND', 404)
      );

      await expect(restoreService.downloadBackup('non-existent-id')).rejects.toMatchObject({
        code: 'BACKUP_NOT_FOUND',
      });
    });
  });

  describe('validateBackup', () => {
    it('should return true for valid backup file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const result = await restoreService.validateBackup('/mock/path/backup.db');

      expect(result).toBe(true);
    });

    it('should throw error when file does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await expect(restoreService.validateBackup('/mock/path/backup.db')).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });

    it('should throw error when file is empty', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 0,
      });

      await expect(restoreService.validateBackup('/mock/path/backup.db')).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });

    it('should report progress during validation', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });

      const progressCallback = jest.fn();
      await restoreService.validateBackup('/mock/path/backup.db', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'validating' })
      );
    });
  });

  describe('restoreDatabase', () => {
    beforeEach(() => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (migrate.runMigrations as jest.Mock).mockResolvedValue(undefined);
      (migrate.getCurrentSchemaVersion as jest.Mock).mockResolvedValue(1);
    });

    it('should restore database successfully', async () => {
      const result = await restoreService.restoreDatabase('/mock/path/backup.db');

      expect(result.success).toBe(true);
      expect(result.transactionCount).toBe(42);
      expect(result.schemaVersion).toBe(1);
      expect(client.resetDbClient).toHaveBeenCalled();
      expect(migrate.runMigrations).toHaveBeenCalled();
    });

    it('should create safety backup before restore', async () => {
      await restoreService.restoreDatabase('/mock/path/backup.db');

      // First copy should be the safety backup
      expect(FileSystem.copyAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '/mock/documents/SQLite/gg-economy.db',
          to: expect.stringMatching(/\.backup-\d+$/),
        })
      );
    });

    it('should restore safety backup when migration fails', async () => {
      (migrate.runMigrations as jest.Mock).mockRejectedValue(new Error('Migration failed'));

      const result = await restoreService.restoreDatabase('/mock/path/backup.db');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Migration failed');
      // Should have attempted to restore the safety backup
      expect(FileSystem.copyAsync).toHaveBeenCalledTimes(3); // safety backup, restore, rollback
    });

    it('should clean up safety backup after successful restore', async () => {
      await restoreService.restoreDatabase('/mock/path/backup.db');

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(expect.stringMatching(/\.backup-\d+$/), {
        idempotent: true,
      });
    });

    it('should report progress through all stages', async () => {
      const progressCallback = jest.fn();
      await restoreService.restoreDatabase('/mock/path/backup.db', progressCallback);

      const stages = progressCallback.mock.calls.map((call) => call[0].stage);
      expect(stages).toContain('restoring');
      expect(stages).toContain('migrating');
      expect(stages).toContain('complete');
    });
  });

  describe('restoreFromBackup', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.downloadFile as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (migrate.runMigrations as jest.Mock).mockResolvedValue(undefined);
      (migrate.getCurrentSchemaVersion as jest.Mock).mockResolvedValue(1);
    });

    it('should perform complete restore operation', async () => {
      const result = await restoreService.restoreFromBackup('mock-backup-id');

      expect(result.success).toBe(true);
      expect(googleDriveClient.downloadFile).toHaveBeenCalled();
      expect(migrate.runMigrations).toHaveBeenCalled();
    });

    it('should clean up temp file after restore', async () => {
      await restoreService.restoreFromBackup('mock-backup-id');

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringMatching(/^\/mock\/cache\/restore-\d+\.db$/),
        { idempotent: true }
      );
    });

    it('should return error result when download fails', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      const result = await restoreService.restoreFromBackup('mock-backup-id');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should return error result when validation fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await restoreService.restoreFromBackup('mock-backup-id');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not found');
    });

    it('should report progress through all stages', async () => {
      const progressCallback = jest.fn();
      await restoreService.restoreFromBackup('mock-backup-id', {
        onProgress: progressCallback,
      });

      const stages = progressCallback.mock.calls.map((call) => call[0].stage);
      expect(stages).toContain('downloading');
      expect(stages).toContain('validating');
      expect(stages).toContain('restoring');
    });
  });

  describe('getBackupDetails', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([
        {
          id: 'file-1',
          name: 'gg-economy-backup-20240115-103045.db',
          size: '1024',
          createdTime: '2024-01-15T10:30:45Z',
        },
      ]);
    });

    it('should return backup details for existing backup', async () => {
      const details = await restoreService.getBackupDetails('file-1');

      expect(details).not.toBeNull();
      expect(details?.id).toBe('file-1');
      expect(details?.fileName).toBe('gg-economy-backup-20240115-103045.db');
    });

    it('should return null for non-existent backup', async () => {
      const details = await restoreService.getBackupDetails('non-existent');

      expect(details).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cached folder ID', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([]);

      // First call caches the folder ID
      await restoreService.listBackups();

      // Clear the cache
      restoreService.clearCache();

      // Next call should fetch folder ID again
      await restoreService.listBackups();

      expect(googleDriveClient.ensureBackupFolder).toHaveBeenCalledTimes(2);
    });
  });
});

describe('RestoreError', () => {
  it('should create error with correct properties', () => {
    const error = new RestoreError('Test error', 'RESTORE_FAILED', new Error('Original'));

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('RESTORE_FAILED');
    expect(error.name).toBe('RestoreError');
    expect(error.originalError).toBeInstanceOf(Error);
  });
});
