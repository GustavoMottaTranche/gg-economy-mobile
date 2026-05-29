/**
 * Unit tests for GoogleDriveClient
 *
 * Tests Google Drive API operations including folder management and file upload.
 *
 * **Validates: Requirements 8, 31**
 */

import * as FileSystem from 'expo-file-system';
import {
  GoogleDriveClient,
  DriveError,
  BACKUP_CONFIG,
} from '../../../../src/services/backup/GoogleDriveClient';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GoogleDriveClient', () => {
  let client: GoogleDriveClient;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GoogleDriveClient();
  });

  describe('findFolder', () => {
    it('should find existing folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: 'folder-123',
                name: 'GG-Economy',
                mimeType: 'application/vnd.google-apps.folder',
              },
            ],
          }),
      });

      const folder = await client.findFolder(mockAccessToken, 'GG-Economy');

      expect(folder).toEqual({
        id: 'folder-123',
        name: 'GG-Economy',
        mimeType: 'application/vnd.google-apps.folder',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('drive/v3/files'),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
      );
    });

    it('should return null when folder not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      const folder = await client.findFolder(mockAccessToken, 'NonExistent');

      expect(folder).toBeNull();
    });

    it('should search within parent folder when parentId provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await client.findFolder(mockAccessToken, 'backups', 'parent-123');

      // URL is encoded, so check for the encoded version
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('parent-123'),
        expect.any(Object)
      );
    });

    it('should throw DriveError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      });

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toThrow(DriveError);
    });
  });

  describe('createFolder', () => {
    it('should create folder successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'new-folder-123',
            name: 'GG-Economy',
            mimeType: 'application/vnd.google-apps.folder',
          }),
      });

      const folder = await client.createFolder(mockAccessToken, 'GG-Economy');

      expect(folder.id).toBe('new-folder-123');
      expect(folder.name).toBe('GG-Economy');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('drive/v3/files'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should create folder with parent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'subfolder-123',
            name: 'backups',
            mimeType: 'application/vnd.google-apps.folder',
          }),
      });

      await client.createFolder(mockAccessToken, 'backups', 'parent-123');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.parents).toEqual(['parent-123']);
    });

    it('should throw DriveError on creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Permission denied' } }),
      });

      await expect(client.createFolder(mockAccessToken, 'Test')).rejects.toThrow(DriveError);
      await expect(client.createFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'FOLDER_CREATE_FAILED',
      });
    });
  });

  describe('ensureBackupFolder', () => {
    it('should create folder structure when none exists', async () => {
      // First call: find root folder (not found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // Second call: create root folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'root-folder-123',
            name: BACKUP_CONFIG.ROOT_FOLDER_NAME,
          }),
      });
      // Third call: find backups folder (not found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // Fourth call: create backups folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'backups-folder-123',
            name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME,
          }),
      });

      const folderId = await client.ensureBackupFolder(mockAccessToken);

      expect(folderId).toBe('backups-folder-123');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should use existing folders when they exist', async () => {
      // First call: find root folder (found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [{ id: 'existing-root', name: BACKUP_CONFIG.ROOT_FOLDER_NAME }],
          }),
      });
      // Second call: find backups folder (found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [{ id: 'existing-backups', name: BACKUP_CONFIG.BACKUPS_FOLDER_NAME }],
          }),
      });

      const folderId = await client.ensureBackupFolder(mockAccessToken);

      expect(folderId).toBe('existing-backups');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(btoa('mock-file-content'));
    });

    it('should upload small file using simple upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'uploaded-file-123',
            name: 'test-backup.db',
            mimeType: 'application/octet-stream',
            size: '1024',
            createdTime: '2024-01-15T10:30:45Z',
          }),
      });

      const result = await client.uploadFile(
        mockAccessToken,
        '/mock/path/test-backup.db',
        'test-backup.db',
        'folder-123'
      );

      expect(result.id).toBe('uploaded-file-123');
      expect(result.name).toBe('test-backup.db');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('uploadType=multipart'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error when local file not found', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      await expect(
        client.uploadFile(mockAccessToken, '/mock/path/missing.db', 'missing.db', 'folder-123')
      ).rejects.toThrow(DriveError);
      await expect(
        client.uploadFile(mockAccessToken, '/mock/path/missing.db', 'missing.db', 'folder-123')
      ).rejects.toMatchObject({
        code: 'UPLOAD_FAILED',
      });
    });

    it('should call progress callback during upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'uploaded-file-123',
            name: 'test-backup.db',
          }),
      });

      const progressCallback = jest.fn();

      await client.uploadFile(
        mockAccessToken,
        '/mock/path/test-backup.db',
        'test-backup.db',
        'folder-123',
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('listBackups', () => {
    it('should list backup files in folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
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
            ],
          }),
      });

      const files = await client.listBackups(mockAccessToken, 'folder-123');

      expect(files).toHaveLength(2);
      expect(files[0]!.id).toBe('file-1');
      expect(files[1]!.id).toBe('file-2');
    });

    it('should return empty array when no backups exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      const files = await client.listBackups(mockAccessToken, 'folder-123');

      expect(files).toEqual([]);
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: '/mock/download/file.db',
      });

      await client.downloadFile(mockAccessToken, 'file-123', '/mock/local/file.db');

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        expect.stringContaining('file-123'),
        '/mock/local/file.db',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
      );
    });

    it('should throw error on download failure', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 404,
        uri: '',
      });

      await expect(
        client.downloadFile(mockAccessToken, 'file-123', '/mock/local/file.db')
      ).rejects.toThrow(DriveError);
      await expect(
        client.downloadFile(mockAccessToken, 'file-123', '/mock/local/file.db')
      ).rejects.toMatchObject({
        code: 'DOWNLOAD_FAILED',
      });
    });

    it('should call progress callback', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: '/mock/download/file.db',
      });

      const progressCallback = jest.fn();

      await client.downloadFile(
        mockAccessToken,
        'file-123',
        '/mock/local/file.db',
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await expect(client.deleteFile(mockAccessToken, 'file-123')).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('file-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Not found' } }),
      });

      await expect(client.deleteFile(mockAccessToken, 'file-123')).rejects.toThrow(DriveError);
    });
  });

  describe('error handling', () => {
    it('should handle 401 as AUTH_ERROR', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      });

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        httpStatus: 401,
      });
    });

    it('should handle 403 as PERMISSION_DENIED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
      });

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
        httpStatus: 403,
      });
    });

    it('should handle 404 as NOT_FOUND', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Not found' } }),
      });

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        httpStatus: 404,
      });
    });

    it('should handle 507 as QUOTA_EXCEEDED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 507,
        json: () => Promise.resolve({ error: { message: 'Quota exceeded' } }),
      });

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'QUOTA_EXCEEDED',
        httpStatus: 507,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toThrow(DriveError);
      await expect(client.findFolder(mockAccessToken, 'Test')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });
});

describe('DriveError', () => {
  it('should create error with correct properties', () => {
    const error = new DriveError('Test error', 'AUTH_ERROR', 401, new Error('Original'));

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.httpStatus).toBe(401);
    expect(error.name).toBe('DriveError');
    expect(error.originalError).toBeInstanceOf(Error);
  });
});

describe('BACKUP_CONFIG', () => {
  it('should have correct configuration values', () => {
    expect(BACKUP_CONFIG.ROOT_FOLDER_NAME).toBe('GG-Economy');
    expect(BACKUP_CONFIG.BACKUPS_FOLDER_NAME).toBe('backups');
    expect(BACKUP_CONFIG.FILE_PREFIX).toBe('gg-economy-backup-');
    expect(BACKUP_CONFIG.FILE_EXTENSION).toBe('.db');
  });
});
