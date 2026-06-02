/**
 * BackupService - Local database export operations
 *
 * Handles database file export to temporary location for upload.
 * No external service dependency - purely local file operations.
 *
 * @module services/backup/BackupService
 */

import * as FileSystem from 'expo-file-system/legacy';
import { DATABASE_NAME } from '../../db/client';

/**
 * Error types for backup operations
 */
export type BackupErrorCode = 'DATABASE_NOT_FOUND' | 'EXPORT_FAILED' | 'UNKNOWN';

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

/** Backup file naming config */
export const BACKUP_CONFIG = {
  FILE_PREFIX: 'gg-economy-backup-',
  FILE_EXTENSION: '.db',
} as const;

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

  const [, yearStr, monthStr, dayStr, hoursStr, minutesStr, secondsStr] = match;
  if (!yearStr || !monthStr || !dayStr || !hoursStr || !minutesStr || !secondsStr) {
    return null;
  }
  return new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10),
    parseInt(hoursStr, 10),
    parseInt(minutesStr, 10),
    parseInt(secondsStr, 10)
  );
}

/**
 * BackupService for local database export operations
 */
export class BackupService {
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
   * Clear cached state (useful for testing)
   */
  clearCache(): void {
    // No-op, kept for API compatibility
  }
}

// Export singleton instance
export const backupService = new BackupService();
