/**
 * Integration tests for backup flow
 *
 * Tests the complete backup flow from database export to Google Drive upload.
 * Uses mocked Google Drive API responses.
 *
 * **Validates: Requirements 8, 9, 31**
 */

import * as FileSystem from 'expo-file-system';
import {
  BackupService,
  generateBackupFileName,
} from '../../../../src/services/backup/BackupService';
import {
  GoogleDriveClient,
  BACKUP_CONFIG,
} from '../../../../src/services/backup/GoogleDriveClient';
import { oAuthService } from '../../../../src/services/backup/OAuthService';
import { useBackupStore } from '../../../../src/stores/backupStore';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock dependencies
jest.mock('../../../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    getAccessToken: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

describe('Backup Flow Integration', () => {
  let backupService: BackupService;
  let driveClient: GoogleDriveClient;

  beforeEach(() => {
    jest.clearAllMocks();
    backupService = new BackupService();
    driveClient = new GoogleDriveClient();
    useBackupStore.getState().reset();

    // Default mock setup for successful operations
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1024,
    });
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(btoa('mock-db-content'));
    (oAuthService.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token');
    (oAuthService.isSignedIn as jest.Mock).mockResolvedValue(true);
  });

  describe('Complete Backup Flow', () => {
    beforeEach(() => {
      // Mock Google Drive API responses
      mockFetch
        // Find root folder (not found)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
        // Create root folder
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'root-folder-id',
              name: BACKUP_CONFIG.ROOT_FOLDER_NAME,
            }),
        })
        // Find backups folder (not found)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
        // Create backups folder
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'backups-folder-id',
              name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME,
            }),
        })
        // Upload file
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'uploaded-file-id',
              name: 'gg-economy-backup-20240115-103045.db',
              size: '1024',
              createdTime: '2024-01-15T10:30:45Z',
            }),
        });
    });

    it('should complete full backup flow successfully', async () => {
      const progressStages: string[] = [];
      const progressCallback = jest.fn((progress) => {
        progressStages.push(progress.stage);
      });

      const result = await backupService.createBackup(progressCallback);

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('uploaded-file-id');
      expect(result.fileName).toMatch(/^gg-economy-backup-\d{8}-\d{6}\.db$/);
      expect(result.timestamp).toBeInstanceOf(Date);

      // Verify progress stages
      expect(progressStages).toContain('exporting');
      expect(progressStages).toContain('uploading');

      // Verify cleanup
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should create folder structure on first backup', async () => {
      await backupService.createBackup();

      // Verify folder creation calls
      const fetchCalls = mockFetch.mock.calls;

      // Should have searched for root folder (URL encoded)
      expect(fetchCalls[0][0]).toContain('GG-Economy');

      // Should have created root folder
      expect(fetchCalls[1][1].method).toBe('POST');
      expect(JSON.parse(fetchCalls[1][1].body).name).toBe(BACKUP_CONFIG.ROOT_FOLDER_NAME);

      // Should have searched for backups folder
      expect(fetchCalls[2][0]).toContain('backups');

      // Should have created backups folder
      expect(fetchCalls[3][1].method).toBe('POST');
      expect(JSON.parse(fetchCalls[3][1].body).name).toBe(BACKUP_CONFIG.BACKUPS_FOLDER_NAME);
    });

    it('should reuse existing folders on subsequent backups', async () => {
      // Reset mocks for existing folders scenario
      mockFetch.mockReset();
      mockFetch
        // Find root folder (found)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'existing-root', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        // Find backups folder (found)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'existing-backups', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        })
        // Upload file
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'uploaded-file-id',
              name: 'gg-economy-backup-20240115-103045.db',
            }),
        });

      await backupService.createBackup();

      // Should only have 3 calls (2 finds + 1 upload), no creates
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Backup with Store Integration', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'root-id', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'backups-id', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'file-id',
              name: 'gg-economy-backup-20240115-103045.db',
            }),
        });
    });

    it('should update store on successful backup', async () => {
      const store = useBackupStore.getState();

      // Start backup with progress tracking
      store.setOperationInProgress('exporting', 0, 'Starting backup...');

      const result = await backupService.createBackup((progress) => {
        store.setOperationInProgress(progress.stage, progress.progress, progress.message);
      });

      if (result.success) {
        store.setOperationComplete(true);
      }

      const finalState = useBackupStore.getState();
      expect(finalState.lastBackupStatus).toBe('success');
      expect(finalState.lastBackupTime).not.toBeNull();
      expect(finalState.operation.stage).toBe('complete');
    });

    it('should update store on failed backup', async () => {
      // Make authentication fail
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      const store = useBackupStore.getState();
      store.setOperationInProgress('exporting', 0, 'Starting backup...');

      const result = await backupService.createBackup();

      if (!result.success) {
        store.setOperationComplete(false, result.errorMessage);
      }

      const finalState = useBackupStore.getState();
      expect(finalState.lastBackupStatus).toBe('failed');
      expect(finalState.lastBackupError).toContain('Not authenticated');
      expect(finalState.operation.stage).toBe('error');
    });
  });

  describe('List and Download Backups', () => {
    beforeEach(() => {
      mockFetch
        // Ensure backup folder
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'root-id', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'backups-id', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        });
    });

    it('should list available backups', async () => {
      // Clear previous mocks and set up fresh ones
      mockFetch.mockReset();
      mockFetch
        // Ensure backup folder - find root
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'root-id', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        // Ensure backup folder - find backups
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'backups-id', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        })
        // List backups
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: 'backup-1',
                  name: 'gg-economy-backup-20240115-103045.db',
                  size: '1024',
                  createdTime: '2024-01-15T10:30:45Z',
                },
                {
                  id: 'backup-2',
                  name: 'gg-economy-backup-20240114-093000.db',
                  size: '2048',
                  createdTime: '2024-01-14T09:30:00Z',
                },
              ],
            }),
        });

      // Clear the cached folder ID
      backupService.clearCache();

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0]!.id).toBe('backup-1');
      expect(backups[0]!.fileName).toBe('gg-economy-backup-20240115-103045.db');
      expect(backups[0]!.sizeBytes).toBe(1024);
      expect(backups[0]!.createdAt).toBeInstanceOf(Date);
    });

    it('should download backup file', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: '/mock/cache/restore-123.db',
      });

      const localPath = await backupService.downloadBackup('backup-1');

      expect(localPath).toMatch(/^\/mock\/cache\/restore-\d+\.db$/);
      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        expect.stringContaining('backup-1'),
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-access-token' },
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database not found error', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Database file not found');
    });

    it('should handle authentication error', async () => {
      (oAuthService.getAccessToken as jest.Mock).mockResolvedValue(null);

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should handle network error during upload', async () => {
      // Clear and set up mocks for network error scenario
      mockFetch.mockReset();
      mockFetch
        // Find root folder
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'root-id', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        // Find backups folder
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'backups-id', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        })
        // Upload fails with network error
        .mockRejectedValueOnce(new Error('Network error'));

      // Clear cached folder ID
      backupService.clearCache();

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle Google Drive quota exceeded', async () => {
      // Clear and set up mocks
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'root-id', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [{ id: 'backups-id', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 507,
          json: () => Promise.resolve({ error: { message: 'Quota exceeded' } }),
        });

      // Clear cached folder ID
      backupService.clearCache();

      const result = await backupService.createBackup();

      expect(result.success).toBe(false);
      // The error message should indicate storage issue
      expect(result.errorMessage).toBeDefined();
    });

    it('should clean up temp file even on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await backupService.createBackup();

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });
  });

  describe('Backup File Naming', () => {
    it('should generate unique file names with timestamps', () => {
      const date1 = new Date(2024, 0, 15, 10, 30, 45);
      const date2 = new Date(2024, 0, 15, 10, 30, 46);

      const name1 = generateBackupFileName(date1);
      const name2 = generateBackupFileName(date2);

      expect(name1).not.toBe(name2);
      expect(name1).toBe('gg-economy-backup-20240115-103045.db');
      expect(name2).toBe('gg-economy-backup-20240115-103046.db');
    });

    it('should follow naming convention', () => {
      const fileName = generateBackupFileName();

      expect(fileName).toMatch(/^gg-economy-backup-\d{8}-\d{6}\.db$/);
      expect(fileName.startsWith(BACKUP_CONFIG.FILE_PREFIX)).toBe(true);
      expect(fileName.endsWith(BACKUP_CONFIG.FILE_EXTENSION)).toBe(true);
    });
  });

  describe('Folder Management', () => {
    it('should create backup folder path: GG-Economy/backups/', async () => {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'root-id',
              name: BACKUP_CONFIG.ROOT_FOLDER_NAME,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'backups-id',
              name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME,
            }),
        });

      const folderId = await driveClient.ensureBackupFolder('mock-token');

      expect(folderId).toBe('backups-id');

      // Verify backups folder was created with root as parent
      const createBackupsCall = mockFetch.mock.calls[3];
      const createBackupsBody = JSON.parse(createBackupsCall[1].body);
      expect(createBackupsBody.parents).toEqual(['root-id']);
    });
  });
});
