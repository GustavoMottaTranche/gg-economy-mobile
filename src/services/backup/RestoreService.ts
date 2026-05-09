/**
 * RestoreService - Database restore operations from Google Drive backups
 *
 * Implements backup listing, download, and database restoration with
 * Drizzle migration support.
 *
 * **Validates: Requirements 10, 29, 32**
 *
 * @module services/backup/RestoreService
 */

import * as FileSystem from 'expo-file-system/legacy';
import { DATABASE_NAME, resetDbClient, getExpoDatabase } from '../../db/client';
import { runMigrations, getCurrentSchemaVersion } from '../../db/migrate';
import { oAuthService, OAuthError } from './OAuthService';
import { googleDriveClient, DriveError, BACKUP_CONFIG } from './GoogleDriveClient';
import { backupService, BackupError, parseBackupTimestamp } from './BackupService';
import type { BackupMetadata, RestoreResult } from '../../types/backup';

/**
 * Error types for restore operations
 */
export type RestoreErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'BACKUP_NOT_FOUND'
  | 'DOWNLOAD_FAILED'
  | 'RESTORE_FAILED'
  | 'MIGRATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Restore error class
 */
export class RestoreError extends Error {
  constructor(
    message: string,
    public readonly code: RestoreErrorCode,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'RestoreError';
  }
}

/**
 * Progress callback for restore operations
 */
export interface RestoreProgress {
  stage: 'listing' | 'downloading' | 'validating' | 'restoring' | 'migrating' | 'complete';
  progress: number; // 0-1
  message: string;
}

export type RestoreProgressCallback = (progress: RestoreProgress) => void;

/**
 * Options for restore operation
 */
export interface RestoreOptions {
  /** Skip confirmation (for testing) */
  skipConfirmation?: boolean;
  /** Progress callback */
  onProgress?: RestoreProgressCallback;
}

/**
 * RestoreService for database restore operations
 */
export class RestoreService {
  private backupsFolderId: string | null = null;

  /**
   * Get the path to the SQLite database file
   */
  getDatabasePath(): string {
    return `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
  }

  /**
   * Get the path for temporary restore files
   */
  getRestoreTempPath(fileName: string): string {
    return `${FileSystem.cacheDirectory}${fileName}`;
  }

  /**
   * List available backups from Google Drive
   *
   * @returns Array of backup metadata sorted by creation date (newest first)
   */
  async listBackups(onProgress?: RestoreProgressCallback): Promise<BackupMetadata[]> {
    onProgress?.({
      stage: 'listing',
      progress: 0,
      message: 'Connecting to Google Drive...',
    });

    const accessToken = await oAuthService.getAccessToken();
    if (!accessToken) {
      throw new RestoreError(
        'Not authenticated with Google Drive. Please sign in first.',
        'NOT_AUTHENTICATED'
      );
    }

    try {
      onProgress?.({
        stage: 'listing',
        progress: 0.3,
        message: 'Finding backup folder...',
      });

      // Ensure backup folder exists
      if (!this.backupsFolderId) {
        this.backupsFolderId = await googleDriveClient.ensureBackupFolder(accessToken);
      }

      onProgress?.({
        stage: 'listing',
        progress: 0.6,
        message: 'Fetching backup list...',
      });

      const files = await googleDriveClient.listBackups(accessToken, this.backupsFolderId);

      onProgress?.({
        stage: 'listing',
        progress: 1,
        message: `Found ${files.length} backup(s)`,
      });

      // Convert to BackupMetadata and sort by date (newest first)
      return files
        .map((file) => {
          const timestamp = parseBackupTimestamp(file.name);
          return {
            id: file.id,
            fileName: file.name,
            createdAt: timestamp ?? (file.createdTime ? new Date(file.createdTime) : new Date()),
            sizeBytes: file.size ? parseInt(file.size, 10) : 0,
            schemaVersion: 1, // TODO: Extract from backup metadata
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      if (error instanceof OAuthError) {
        throw new RestoreError(
          'Authentication error. Please sign in again.',
          'NOT_AUTHENTICATED',
          error
        );
      }
      if (error instanceof DriveError) {
        if (error.code === 'AUTH_ERROR') {
          throw new RestoreError(
            'Authentication expired. Please sign in again.',
            'NOT_AUTHENTICATED',
            error
          );
        }
        throw new RestoreError(error.message, 'NETWORK_ERROR', error);
      }
      throw new RestoreError('Failed to list backups', 'NETWORK_ERROR', error);
    }
  }

  /**
   * Download a backup file from Google Drive
   *
   * @param backupId - Google Drive file ID
   * @param onProgress - Progress callback
   * @returns Local path to downloaded file
   */
  async downloadBackup(backupId: string, onProgress?: RestoreProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'downloading',
      progress: 0,
      message: 'Preparing download...',
    });

    const accessToken = await oAuthService.getAccessToken();
    if (!accessToken) {
      throw new RestoreError('Not authenticated with Google Drive', 'NOT_AUTHENTICATED');
    }

    const localPath = this.getRestoreTempPath(`restore-${Date.now()}.db`);

    try {
      onProgress?.({
        stage: 'downloading',
        progress: 0.1,
        message: 'Downloading backup...',
      });

      await googleDriveClient.downloadFile(accessToken, backupId, localPath, (progress) => {
        onProgress?.({
          stage: 'downloading',
          progress: 0.1 + progress * 0.9,
          message: `Downloading... ${Math.round(progress * 100)}%`,
        });
      });

      onProgress?.({
        stage: 'downloading',
        progress: 1,
        message: 'Download complete',
      });

      return localPath;
    } catch (error) {
      if (error instanceof DriveError) {
        if (error.code === 'AUTH_ERROR') {
          throw new RestoreError(
            'Authentication expired. Please sign in again.',
            'NOT_AUTHENTICATED',
            error
          );
        }
        if (error.code === 'NOT_FOUND') {
          throw new RestoreError(
            'Backup file not found. It may have been deleted.',
            'BACKUP_NOT_FOUND',
            error
          );
        }
      }
      throw new RestoreError('Failed to download backup', 'DOWNLOAD_FAILED', error);
    }
  }

  /**
   * Validate a backup file before restoration
   *
   * @param localPath - Path to the backup file
   * @returns true if valid, throws RestoreError if invalid
   */
  async validateBackup(localPath: string, onProgress?: RestoreProgressCallback): Promise<boolean> {
    onProgress?.({
      stage: 'validating',
      progress: 0,
      message: 'Validating backup file...',
    });

    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) {
        throw new RestoreError('Backup file not found', 'VALIDATION_FAILED');
      }

      onProgress?.({
        stage: 'validating',
        progress: 0.5,
        message: 'Checking file integrity...',
      });

      // Check file size (should be > 0)
      if (fileInfo.size === 0) {
        throw new RestoreError('Backup file is empty', 'VALIDATION_FAILED');
      }

      onProgress?.({
        stage: 'validating',
        progress: 1,
        message: 'Backup file is valid',
      });

      return true;
    } catch (error) {
      if (error instanceof RestoreError) {
        throw error;
      }
      throw new RestoreError('Failed to validate backup file', 'VALIDATION_FAILED', error);
    }
  }

  /**
   * Restore the database from a backup file
   *
   * This operation:
   * 1. Closes the current database connection
   * 2. Backs up the current database (for safety)
   * 3. Replaces the database with the backup
   * 4. Runs any necessary migrations
   * 5. Reopens the database connection
   *
   * @param localPath - Path to the backup file
   * @param onProgress - Progress callback
   * @returns RestoreResult with success status and details
   */
  async restoreDatabase(
    localPath: string,
    onProgress?: RestoreProgressCallback
  ): Promise<RestoreResult> {
    const dbPath = this.getDatabasePath();
    const backupPath = `${dbPath}.backup-${Date.now()}`;

    try {
      onProgress?.({
        stage: 'restoring',
        progress: 0,
        message: 'Preparing restoration...',
      });

      // Step 1: Close current database connection
      resetDbClient();

      onProgress?.({
        stage: 'restoring',
        progress: 0.2,
        message: 'Creating safety backup...',
      });

      // Step 2: Create safety backup of current database
      const currentDbInfo = await FileSystem.getInfoAsync(dbPath);
      if (currentDbInfo.exists) {
        await FileSystem.copyAsync({
          from: dbPath,
          to: backupPath,
        });
      }

      onProgress?.({
        stage: 'restoring',
        progress: 0.4,
        message: 'Replacing database...',
      });

      // Step 3: Replace database with backup
      await FileSystem.copyAsync({
        from: localPath,
        to: dbPath,
      });

      onProgress?.({
        stage: 'migrating',
        progress: 0.6,
        message: 'Running migrations...',
      });

      // Step 4: Run migrations if needed
      try {
        await runMigrations();
      } catch (migrationError) {
        // Migration failed - restore the safety backup
        onProgress?.({
          stage: 'restoring',
          progress: 0.8,
          message: 'Migration failed, restoring previous database...',
        });

        if (currentDbInfo.exists) {
          await FileSystem.copyAsync({
            from: backupPath,
            to: dbPath,
          });
        }

        throw new RestoreError(
          'Migration failed after restore. Previous database has been restored.',
          'MIGRATION_FAILED',
          migrationError
        );
      }

      onProgress?.({
        stage: 'complete',
        progress: 0.9,
        message: 'Cleaning up...',
      });

      // Step 5: Clean up safety backup
      try {
        await FileSystem.deleteAsync(backupPath, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }

      // Get schema version after restore
      const schemaVersion = await getCurrentSchemaVersion();

      // Count transactions in restored database
      const transactionCount = await this.countTransactions();

      onProgress?.({
        stage: 'complete',
        progress: 1,
        message: 'Restore complete',
      });

      return {
        success: true,
        transactionCount,
        schemaVersion,
      };
    } catch (error) {
      // Ensure database client is reset even on error
      resetDbClient();

      if (error instanceof RestoreError) {
        return {
          success: false,
          errorMessage: error.message,
        };
      }

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error during restore',
      };
    }
  }

  /**
   * Count transactions in the current database
   */
  private async countTransactions(): Promise<number> {
    try {
      const sqlite = getExpoDatabase();
      const result = sqlite.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions'
      );
      return result?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Perform a complete restore operation from a backup
   *
   * This is the main entry point for restore operations.
   * It handles the full flow: download, validate, restore.
   *
   * @param backupId - Google Drive file ID of the backup
   * @param options - Restore options
   * @returns RestoreResult with success status and details
   */
  async restoreFromBackup(backupId: string, options: RestoreOptions = {}): Promise<RestoreResult> {
    const { onProgress } = options;
    let tempPath: string | null = null;

    try {
      // Step 1: Download backup
      tempPath = await this.downloadBackup(backupId, onProgress);

      // Step 2: Validate backup
      await this.validateBackup(tempPath, onProgress);

      // Step 3: Restore database
      const result = await this.restoreDatabase(tempPath, onProgress);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof RestoreError
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
   * Get backup details by ID
   *
   * @param backupId - Google Drive file ID
   * @returns BackupMetadata or null if not found
   */
  async getBackupDetails(backupId: string): Promise<BackupMetadata | null> {
    const backups = await this.listBackups();
    return backups.find((b) => b.id === backupId) ?? null;
  }

  /**
   * Clear cached folder ID (useful for testing or after sign out)
   */
  clearCache(): void {
    this.backupsFolderId = null;
  }
}

// Export singleton instance
export const restoreService = new RestoreService();
