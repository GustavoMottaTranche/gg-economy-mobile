/**
 * Unit tests for BackupService
 *
 * Tests database export, backup file naming, and backup operations.
 *
 * **Validates: Requirements 8, 9, 31**
 */

import * as FileSystem from 'expo-file-system';
import {
  BackupService,
  BackupError,
  generateBackupFileName,
  parseBackupTimestamp,
} from '../../../../src/services/backup/BackupService';
import { oAuthService } from '../../../../src/services/backup/OAuthService';
import { googleDriveClient } from '../../../../src/services/backup/GoogleDriveClient';

// Mock the dependencies
jest.mock('../../../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    getAccessToken: jest.fn(),
    isSignedIn: jest.fn(),
  },
}));

jest.mock('../../../../src/services/backup/GoogleDriveClient', () => ({
  googleDriveClient: {
    ensureBackupFolder: jest.fn(),
    uploadFile: jest.fn(),
    listBackups: jest.fn(),
    downloadFile: jest.fn(),
  },
  BACKUP_CONFIG: {
    ROOT_FOLDER_NAME: 'GG-Economy',
    BACKUPS_FOLDER_NAME: 'backups',
    FILE_PREFIX: 'gg-economy-backup-',
    FILE_EXTENSION: '.db',
  },
}));

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    jest.clearAllMocks();
    backupService = new BackupService();
  });

  describe('generateBackupFileName', () => {
    it('should generate file name with correct format', () => {
      const date = new Date(2024, 0, 15, 10, 30, 45); // Jan 15, 2024 10:30:45
      const fileName = generateBackupFileName(date);

      expect(fileName).toBe('gg-economy-backup-20240115-103045.db');
    });

    it('should pad single digit values with zeros', () => {
      const date = new Date(2024, 0, 5, 9, 5, 5); // Jan 5, 2024 09:05:05
      const fileName = generateBackupFileName(date);

      expect(fileName).toBe('gg-economy-backup-20240105-090505.db');
    });

    it('should use current date when no date provided', () => {
      const fileName = generateBackupFileName();

      expect(fileName).toMatch(/^gg-economy-backup-\d{8}-\d{6}\.db$/);
    });
  });

  describe('parseBackupTimestamp', () => {
    it('should parse valid backup file name', () => {
      const fileName = 'gg-economy-backup-20240115-103045.db';
      const timestamp = parseBackupTimestamp(fileName);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.getFullYear()).toBe(2024);
      expect(timestamp?.getMonth()).toBe(0); // January
      expect(timestamp?.getDate()).toBe(15);
      expect(timestamp?.getHours()).toBe(10);
      expect(timestamp?.getMinutes()).toBe(30);
      expect(timestamp?.getSeconds()).toBe(45);
    });

    it('should return null for invalid file name', () => {
      expect(parseBackupTimestamp('invalid-file.db')).toBeNull();
      expect(parseBackupTimestamp('gg-economy-backup.db')).toBeNull();
      expect(parseBackupTimestamp('backup-20240115.db')).toBeNull();
    });

    it('should handle edge cases in date parsing', () => {
      const fileName = 'gg-economy-backup-20241231-235959.db';
      const timestamp = parseBackupTimestamp(fileName);

      expect(timestamp?.getMonth()).toBe(11); // December
      expect(timestamp?.getDate()).toBe(31);
      expect(timestamp?.getHours()).toBe(23);
      expect(timestamp?.getMinutes()).toBe(59);
      expect(timestamp?.getSeconds()).toBe(59);
    });
  });

  describe('getDatabasePath', () => {
    it('should return correct database path', () => {
      const path = backupService.getDatabasePath();

      expect(path).toBe('/mock/documents/SQLite/gg-economy.db');
    });
  });

  describe('getBackupTempPath', () => {
    it('should return correct temp path', () => {
      const path = backupService.getBackupTempPath('test-backup.db');

      expect(path).toBe('/mock/cache/test-backup.db');
    });
  });

  describe('databaseExists', () => {
    it('should return true when database exists', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

      const exists = await backupService.databaseExists();

      expect(exists).toBe(true);
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith('/mock/documents/SQLite/gg-economy.db');
    });

    it('should return false when database does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const exists = await backupService.databaseExists();

      expect(exists).toBe(false);
    });
  });

  describe('exportDatabase', () => {
    it('should export database to temp file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);

      const progressCallback = jest.fn();
      const tempPath = await backupService.exportDatabase(progressCallback);

      expect(tempPath).toMatch(/^\/mock\/cache\/gg-economy-backup-\d{8}-\d{6}\.db$/);
      expect(FileSystem.copyAsync).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'exporting' })
      );
    });

    it('should throw error when database does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      await expect(backupService.exportDatabase()).rejects.toThrow(BackupError);
      await expect(backupService.exportDatabase()).rejects.toMatchObject({
        code: 'DATABASE_NOT_FOUND',
      });
    });

    it('should throw error when copy fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.copyAsync as jest.Mock).mockRejectedValue(new Error('Copy failed'));

      await expect(backupService.exportDatabase()).rejects.toThrow(BackupError);
      await expect(backupService.exportDatabase()).rejects.toMatchObject({
        code: 'EXPORT_FAILED',
      });
    });
  });

  describe('uploadBackup', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
      (googleDriveClient.uploadFile as jest.Mock).mockResolvedValue({
        id: 'mock-file-id',
        name: 'test-backup.db',
      });
    });

    it('should upload backup file to Google Drive', async () => {
      const result = await backupService.uploadBackup('/mock/path/test-backup.db');

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('mock-file-id');
      expect(googleDriveClient.ensureBackupFolder).toHaveBeenCalledWith('mock-access-token');
      expect(googleDriveClient.uploadFile).toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(backupService.uploadBackup('/mock/path/test-backup.db')).rejects.toThrow(
        BackupError
      );
      await expect(backupService.uploadBackup('/mock/path/test-backup.db')).rejects.toMatchObject({
        code: 'NOT_AUTHENTICATED',
      });
    });

    it('should report progress during upload', async () => {
      const progressCallback = jest.fn();

      await backupService.uploadBackup('/mock/path/test-backup.db', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'uploading' })
      );
    });
  });

  describe('createBackup', () => {
    beforeEach(() => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
      (googleDriveClient.uploadFile as jest.Mock).mockResolvedValue({
        id: 'mock-file-id',
        name: 'gg-economy-backup-20240115-103045.db',
      });
    });

    it('should create and upload backup successfully', async () => {
      const result = await backupService.createBackup();

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('mock-file-id');
      expect(result.fileName).toMatch(/^gg-economy-backup-\d{8}-\d{6}\.db$/);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should clean up temp file after backup', async () => {
      await backupService.createBackup();

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should return error result when export fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should return error result when upload fails', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should report progress through all stages', async () => {
      const progressCallback = jest.fn();

      await backupService.createBackup(progressCallback);

      const stages = progressCallback.mock.calls.map((call) => call[0].stage);
      expect(stages).toContain('exporting');
      expect(stages).toContain('uploading');
    });
  });

  describe('listBackups', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
    });

    it('should list backups from Google Drive', async () => {
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([
        {
          id: 'file-1',
          name: 'gg-economy-backup-20240115-103045.db',
          size: '1024',
          createdTime: '2024-01-15T10:30:45Z',
        },
        {
          id: 'file-2',
          name: 'gg-economy-backup-20240114-093000.db',
          size: '2048',
          createdTime: '2024-01-14T09:30:00Z',
        },
      ]);

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBe('file-1');
      expect(backups[0].fileName).toBe('gg-economy-backup-20240115-103045.db');
      expect(backups[0].sizeBytes).toBe(1024);
    });

    it('should throw error when not authenticated', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(backupService.listBackups()).rejects.toThrow(BackupError);
      await expect(backupService.listBackups()).rejects.toMatchObject({
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  describe('downloadBackup', () => {
    beforeEach(() => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.downloadFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should download backup from Google Drive', async () => {
      const localPath = await backupService.downloadBackup('mock-file-id');

      expect(localPath).toMatch(/^\/mock\/cache\/restore-\d+\.db$/);
      expect(googleDriveClient.downloadFile).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-file-id',
        expect.any(String),
        undefined
      );
    });

    it('should throw error when not authenticated', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(backupService.downloadBackup('mock-file-id')).rejects.toThrow(BackupError);
      await expect(backupService.downloadBackup('mock-file-id')).rejects.toMatchObject({
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear cached folder ID', async () => {
      // First, set up the cache by calling a method that uses it
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
      (googleDriveClient.ensureBackupFolder as jest.Mock).mockResolvedValue('mock-folder-id');
      (googleDriveClient.listBackups as jest.Mock).mockResolvedValue([]);

      await backupService.listBackups();

      // Clear the cache
      backupService.clearCache();

      // Next call should fetch folder ID again
      await backupService.listBackups();

      expect(googleDriveClient.ensureBackupFolder).toHaveBeenCalledTimes(2);
    });
  });
});

describe('BackupError', () => {
  it('should create error with correct properties', () => {
    const error = new BackupError('Test error', 'UPLOAD_FAILED', new Error('Original'));

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('UPLOAD_FAILED');
    expect(error.name).toBe('BackupError');
    expect(error.originalError).toBeInstanceOf(Error);
  });
});
