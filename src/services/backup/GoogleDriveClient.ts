/**
 * GoogleDriveClient - REST API client for Google Drive operations
 *
 * Implements file upload, folder management, and file listing for backup operations.
 * Uses Google Drive REST API v3.
 *
 * @module services/backup/GoogleDriveClient
 */

import * as FileSystem from 'expo-file-system/legacy';

// Google Drive API base URL
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// MIME types
const MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  SQLITE: 'application/x-sqlite3',
  OCTET_STREAM: 'application/octet-stream',
} as const;

// Backup folder configuration
export const BACKUP_CONFIG = {
  ROOT_FOLDER_NAME: 'GG-Economy',
  BACKUPS_FOLDER_NAME: 'backups',
  FILE_PREFIX: 'gg-economy-backup-',
  FILE_EXTENSION: '.db',
} as const;

/**
 * Google Drive file metadata
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

/**
 * Google Drive file list response
 */
interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Error types for Google Drive operations
 */
export type DriveErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'FOLDER_CREATE_FAILED'
  | 'UNKNOWN';

/**
 * Google Drive error class
 */
export class DriveError extends Error {
  constructor(
    message: string,
    public readonly code: DriveErrorCode,
    public readonly httpStatus?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Google Drive API client for backup operations
 */
export class GoogleDriveClient {
  /**
   * Find a folder by name within a parent folder
   */
  async findFolder(
    accessToken: string,
    folderName: string,
    parentId?: string
  ): Promise<DriveFile | null> {
    const parentQuery = parentId ? ` and '${parentId}' in parents` : '';
    const query = `name='${folderName}' and mimeType='${MIME_TYPES.FOLDER}' and trashed=false${parentQuery}`;

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as DriveFileListResponse;
      return data.files.length > 0 ? data.files[0] : null;
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to search for folder', 'NETWORK_ERROR', undefined, error);
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(
    accessToken: string,
    folderName: string,
    parentId?: string
  ): Promise<DriveFile> {
    const metadata: Record<string, unknown> = {
      name: folderName,
      mimeType: MIME_TYPES.FOLDER,
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    try {
      const response = await fetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return (await response.json()) as DriveFile;
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to create folder', 'FOLDER_CREATE_FAILED', undefined, error);
    }
  }

  /**
   * Ensure the backup folder structure exists (GG-Economy/backups/)
   * Returns the ID of the backups folder
   */
  async ensureBackupFolder(accessToken: string): Promise<string> {
    // Find or create root folder (GG-Economy)
    let rootFolder = await this.findFolder(accessToken, BACKUP_CONFIG.ROOT_FOLDER_NAME);

    if (!rootFolder) {
      rootFolder = await this.createFolder(accessToken, BACKUP_CONFIG.ROOT_FOLDER_NAME);
    }

    // Find or create backups subfolder
    let backupsFolder = await this.findFolder(
      accessToken,
      BACKUP_CONFIG.BACKUPS_FOLDER_NAME,
      rootFolder.id
    );

    if (!backupsFolder) {
      backupsFolder = await this.createFolder(
        accessToken,
        BACKUP_CONFIG.BACKUPS_FOLDER_NAME,
        rootFolder.id
      );
    }

    return backupsFolder.id;
  }

  /**
   * Upload a file to Google Drive using resumable upload
   */
  async uploadFile(
    accessToken: string,
    localPath: string,
    fileName: string,
    parentFolderId: string,
    onProgress?: UploadProgressCallback
  ): Promise<DriveFile> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      if (!fileInfo.exists) {
        throw new DriveError('Local file not found', 'UPLOAD_FAILED');
      }

      const fileSize = fileInfo.size ?? 0;

      // Create file metadata
      const metadata = {
        name: fileName,
        parents: [parentFolderId],
      };

      // For smaller files, use simple upload
      if (fileSize < 5 * 1024 * 1024) {
        // Less than 5MB
        return await this.simpleUpload(accessToken, localPath, metadata, onProgress);
      }

      // For larger files, use resumable upload
      return await this.resumableUpload(accessToken, localPath, metadata, fileSize, onProgress);
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to upload file', 'UPLOAD_FAILED', undefined, error);
    }
  }

  /**
   * Simple upload for small files (< 5MB)
   */
  private async simpleUpload(
    accessToken: string,
    localPath: string,
    metadata: { name: string; parents: string[] },
    onProgress?: UploadProgressCallback
  ): Promise<DriveFile> {
    // Read file content as base64
    const fileContent = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create multipart body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataString = JSON.stringify(metadata);

    // Build multipart request body
    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadataString +
      delimiter +
      `Content-Type: ${MIME_TYPES.OCTET_STREAM}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileContent +
      closeDelimiter;

    onProgress?.(0.5); // Indicate upload started

    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    onProgress?.(1); // Upload complete

    return (await response.json()) as DriveFile;
  }

  /**
   * Resumable upload for larger files
   */
  private async resumableUpload(
    accessToken: string,
    localPath: string,
    metadata: { name: string; parents: string[] },
    fileSize: number,
    onProgress?: UploadProgressCallback
  ): Promise<DriveFile> {
    // Step 1: Initiate resumable upload session
    const initResponse = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=resumable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': MIME_TYPES.OCTET_STREAM,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify(metadata),
    });

    if (!initResponse.ok) {
      throw await this.handleErrorResponse(initResponse);
    }

    const uploadUri = initResponse.headers.get('Location');
    if (!uploadUri) {
      throw new DriveError('No upload URI received', 'UPLOAD_FAILED');
    }

    // Step 2: Upload file content
    const fileContent = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary for upload
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    onProgress?.(0.5);

    const uploadResponse = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Type': MIME_TYPES.OCTET_STREAM,
        'Content-Length': fileSize.toString(),
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      throw await this.handleErrorResponse(uploadResponse);
    }

    onProgress?.(1);

    return (await uploadResponse.json()) as DriveFile;
  }

  /**
   * List backup files in the backups folder
   */
  async listBackups(accessToken: string, backupsFolderId: string): Promise<DriveFile[]> {
    const query = `'${backupsFolderId}' in parents and trashed=false and name contains '${BACKUP_CONFIG.FILE_PREFIX}'`;

    try {
      const response = await fetch(
        `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime)&orderBy=createdTime desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as DriveFileListResponse;
      return data.files;
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to list backup files', 'NETWORK_ERROR', undefined, error);
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(
    accessToken: string,
    fileId: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      onProgress?.(0);

      const downloadResult = await FileSystem.downloadAsync(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        localPath,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (downloadResult.status !== 200) {
        throw new DriveError(
          `Download failed with status ${downloadResult.status}`,
          'DOWNLOAD_FAILED',
          downloadResult.status
        );
      }

      onProgress?.(1);
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to download file', 'DOWNLOAD_FAILED', undefined, error);
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(accessToken: string, fileId: string): Promise<void> {
    try {
      const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        throw await this.handleErrorResponse(response);
      }
    } catch (error) {
      if (error instanceof DriveError) {
        throw error;
      }
      throw new DriveError('Failed to delete file', 'NETWORK_ERROR', undefined, error);
    }
  }

  /**
   * Handle error responses from Google Drive API
   */
  private async handleErrorResponse(response: Response): Promise<DriveError> {
    let errorMessage = `HTTP ${response.status}`;
    let errorCode: DriveErrorCode = 'UNKNOWN';

    try {
      const errorData = (await response.json()) as {
        error?: { message?: string; code?: number };
      };
      errorMessage = errorData.error?.message ?? errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        errorCode = 'AUTH_ERROR';
        errorMessage = 'Authentication failed. Please sign in again.';
        break;
      case 403:
        errorCode = 'PERMISSION_DENIED';
        errorMessage = 'Permission denied. Please check Google Drive access.';
        break;
      case 404:
        errorCode = 'NOT_FOUND';
        errorMessage = 'File or folder not found.';
        break;
      case 507:
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'Google Drive storage quota exceeded.';
        break;
    }

    return new DriveError(errorMessage, errorCode, response.status);
  }
}

// Export singleton instance
export const googleDriveClient = new GoogleDriveClient();
