/**
 * RestoreService - Database restore operations
 *
 * Handles backup validation and database restoration with
 * Drizzle migration support. No external service dependency.
 *
 * @module services/backup/RestoreService
 */

import * as FileSystem from 'expo-file-system/legacy';
import { DATABASE_NAME, resetDbClient, getExpoDatabase } from '../../db/client';
import { runMigrations, getCurrentSchemaVersion } from '../../db/migrate';
import type { RestoreResult } from '../../types/backup';

/**
 * Error types for restore operations
 */
export type RestoreErrorCode =
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
   * Clear cached state (useful for testing)
   */
  clearCache(): void {
    // No-op, kept for API compatibility
  }
}

// Export singleton instance
export const restoreService = new RestoreService();
