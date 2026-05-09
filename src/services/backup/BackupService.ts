/**
 * BackupService - Database backup and restore operations
 *
 * Implements backup creation, upload to Google Drive, and status tracking.
 * Uses expo-file-system for database export and GoogleDriveClient for uploads.
 *
 * **Validates: Requirements 8, 9, 31**
 *
 * @module services/backup/BackupService
 */

import * as FileSystem from 'expo-file-system/legacy';
import { DATABASE_NAME } from '../../db/client';
import { oAuthService, OAuthError } from './OAuthService';
import {
  googleDriveClient,
  BACKUP_CONFIG,
  DriveError,
  type DriveFile,
  type UploadProgressCallback,
} from './GoogleDriveClient';
import type {
  BackupMetadata,
  BackupResult,
  BackupStatusInfo,
  UploadResult,
} from '../../types/backup';

/**
 * Error types for backup operations
 */
export type BackupErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'DATABASE_NOT_FOUND'
  | 'EXPORT_FAILED'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN';

/**
 * Backup error class
 */
export class BackupError extends Error {
  constructor(
    message: string,
    public readonly code: BackupErrorCode,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

/**
 * Progress callback for backup operations
 */
export interface BackupProgress {
  stage: 'exporting' | 'uploading' | 'complete';
  progress: number; // 0-1
  message: string;
}

export type BackupProgressCallback = (progress: BackupProgress) => void;

/**
 * Generate a backup file name with timestamp
 * Format: gg-economy-backup-YYYYMMDD-HHmmss.db
 */
export function generateBackupFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${BACKUP_CONFIG.FILE_PREFIX}${year}${month}${day}-${hours}${minutes}${seconds}${BACKUP_CONFIG.FILE_EXTENSION}`;
}

/**
 * Parse timestamp from backup file name
 */
export function parseBackupTimestamp(fileName: string): Date | null {
  const match = fileName.match(
    /gg-economy-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
    parseInt(seconds, 10)
  );
}

/**
 * BackupService for database backup operations
 */
export class BackupService {
  private backupsFolderId: string | null = null;

  /**
   * Get the path to the SQLite database file
   */
  getDatabasePath(): string {
    return `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
  }

  /**
   * Get the path for temporary backup files
   */
  getBackupTempPath(fileName: string): string {
    return `${FileSystem.cacheDirectory}${fileName}`;
  }

  /**
   * Check if the database file exists
   */
  async databaseExists(): Promise<boolean> {
    const dbPath = this.getDatabasePath();
    const info = await FileSystem.getInfoAsync(dbPath);
    return info.exists;
  }

  /**
   * Export the database to a temporary file
   */
  async exportDatabase(onProgress?: BackupProgressCallback): Promise<string> {
    const dbPath = this.getDatabasePath();
    const fileName = generateBackupFileName();
    const tempPath = this.getBackupTempPath(fileName);

    onProgress?.({
      stage: 'exporting',
      progress: 0,
      message: 'Preparing database export...',
    });

    // Check if database exists
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      throw new BackupError('Database file not found', 'DATABASE_NOT_FOUND');
    }

    try {
      onProgress?.({
        stage: 'exporting',
        progress: 0.3,
        message: 'Copying database...',
      });

      // Copy database to temp location
      await FileSystem.copyAsync({
        from: dbPath,
        to: tempPath,
      });

      onProgress?.({
        stage: 'exporting',
        progress: 1,
        message: 'Database exported successfully',
      });

      return tempPath;
    } catch (error) {
      throw new BackupError('Failed to export database', 'EXPORT_FAILED', error);
    }
  }

  /**
   * Upload a backup file to Google Drive
   */
  async uploadBackup(
    localPath: string,
    onProgress?: BackupProgressCallback
  ): Promise<UploadResult> {
    // Check authentication
    const accessToken = await oAuthService.getAccessToken();
    if (!accessToken) {
      throw new BackupError(
        'Not authenticated with Google Drive. Please sign in first.',
        'NOT_AUTHENTICATED'
      );
    }

    try {
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Preparing upload...',
      });

      // Ensure backup folder exists
      if (!this.backupsFolderId) {
        this.backupsFolderId = await googleDriveClient.ensureBackupFolder(accessToken);
      }

      onProgress?.({
        stage: 'uploading',
        progress: 0.1,
        message: 'Uploading to Google Drive...',
      });

      // Extract file name from path
      const fileName = localPath.split('/').pop() ?? generateBackupFileName();

      // Upload file
      const uploadProgressCallback: UploadProgressCallback = (progress) => {
        onProgress?.({
          stage: 'uploading',
          progress: 0.1 + progress * 0.9,
          message: `Uploading... ${Math.round(progress * 100)}%`,
        });
      };

      const driveFile = await googleDriveClient.uploadFile(
        accessToken,
        localPath,
        fileName,
        this.backupsFolderId,
        uploadProgressCallback
      );

      onProgress?.({
        stage: 'complete',
        progress: 1,
        message: 'Backup uploaded successfully',
      });

      return {
        success: true,
        fileId: driveFile.id,
      };
    } catch (error) {
      if (error instanceof OAuthError) {
        throw new BackupError(
          'Authentication error. Please sign in again.',
          'NOT_AUTHENTICATED',
          error
        );
      }
      if (error instanceof DriveError) {
        if (error.code === 'AUTH_ERROR') {
          throw new BackupError(
            'Authentication expired. Please sign in again.',
            'NOT_AUTHENTICATED',
            error
          );
        }
        if (error.code === 'QUOTA_EXCEEDED') {
          throw new BackupError('Google Drive storage is full.', 'STORAGE_ERROR', error);
        }
        throw new BackupError(error.message, 'UPLOAD_FAILED', error);
      }
      throw new BackupError('Failed to upload backup', 'UPLOAD_FAILED', error);
    }
  }

  /**
   * Create a backup and upload to Google Drive
   */
  async createBackup(onProgress?: BackupProgressCallback): Promise<BackupResult> {
    let tempPath: string | null = null;

    try {
      // Export database
      tempPath = await this.exportDatabase(onProgress);

      // Upload to Google Drive
      const uploadResult = await this.uploadBackup(tempPath, onProgress);

      if (!uploadResult.success) {
        return {
          success: false,
          errorMessage: uploadResult.errorMessage ?? 'Upload failed',
        };
      }

      const fileName = tempPath.split('/').pop() ?? '';
      const timestamp = parseBackupTimestamp(fileName) ?? new Date();

      return {
        success: true,
        backupId: uploadResult.fileId,
        fileName,
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof BackupError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error occurred';

      return {
        success: false,
        errorMessage,
      };
    } finally {
      // Clean up temp file
      if (tempPath) {
        try {
          await FileSystem.deleteAsync(tempPath, { idempotent: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * List available backups from Google Drive
   */
  async listBackups(): Promise<BackupMetadata[]> {
    const accessToken = await oAuthService.getAccessToken();
    if (!accessToken) {
      throw new BackupError('Not authenticated with Google Drive', 'NOT_AUTHENTICATED');
    }

    try {
      // Ensure backup folder exists
      if (!this.backupsFolderId) {
        this.backupsFolderId = await googleDriveClient.ensureBackupFolder(accessToken);
      }

      const files = await googleDriveClient.listBackups(accessToken, this.backupsFolderId);

      return files.map((file) => this.driveFileToBackupMetadata(file));
    } catch (error) {
      if (error instanceof DriveError && error.code === 'AUTH_ERROR') {
        throw new BackupError(
          'Authentication expired. Please sign in again.',
          'NOT_AUTHENTICATED',
          error
        );
      }
      throw new BackupError('Failed to list backups', 'NETWORK_ERROR', error);
    }
  }

  /**
   * Download a backup file from Google Drive
   */
  async downloadBackup(backupId: string, onProgress?: (progress: number) => void): Promise<string> {
    const accessToken = await oAuthService.getAccessToken();
    if (!accessToken) {
      throw new BackupError('Not authenticated with Google Drive', 'NOT_AUTHENTICATED');
    }

    const localPath = this.getBackupTempPath(`restore-${Date.now()}.db`);

    try {
      await googleDriveClient.downloadFile(accessToken, backupId, localPath, onProgress);
      return localPath;
    } catch (error) {
      if (error instanceof DriveError && error.code === 'AUTH_ERROR') {
        throw new BackupError(
          'Authentication expired. Please sign in again.',
          'NOT_AUTHENTICATED',
          error
        );
      }
      throw new BackupError('Failed to download backup', 'NETWORK_ERROR', error);
    }
  }

  /**
   * Convert DriveFile to BackupMetadata
   */
  private driveFileToBackupMetadata(file: DriveFile): BackupMetadata {
    const timestamp = parseBackupTimestamp(file.name);

    return {
      id: file.id,
      fileName: file.name,
      createdAt: timestamp ?? (file.createdTime ? new Date(file.createdTime) : new Date()),
      sizeBytes: file.size ? parseInt(file.size, 10) : 0,
      schemaVersion: 1, // TODO: Extract from backup metadata
    };
  }

  /**
   * Clear cached folder ID (useful for testing or after sign out)
   */
  clearCache(): void {
    this.backupsFolderId = null;
  }
}

// Export singleton instance
export const backupService = new BackupService();
