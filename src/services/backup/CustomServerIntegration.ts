/**
 * CustomServerIntegration - Orchestrates backup/restore flows using the custom server.
 *
 * Reuses BackupService.exportDatabase() for DB export and CustomServerClient for upload.
 * Reuses RestoreService for database validation and restoration.
 * Handles temp file cleanup in finally blocks.
 *
 * @module services/backup/CustomServerIntegration
 */

import * as FileSystem from 'expo-file-system/legacy';
import { backupService, BackupError } from './BackupService';
import { restoreService } from './RestoreService';
import {
  upload,
  download,
  CustomServerError,
  type CustomServerConfig,
  type UploadProgressCallback,
  type DownloadProgressCallback,
  type ServerBackupResponse,
} from './CustomServerClient';
import type { RestoreResult } from '../../types/backup';

/**
 * Creates a backup and uploads it to the custom server.
 *
 * Flow:
 * 1. Reports exporting progress
 * 2. Exports the database to a temp file via BackupService.exportDatabase()
 * 3. Reports export complete
 * 4. Uploads the temp file to the custom server
 * 5. Deletes the temp file in a finally block
 * 6. Returns the ServerBackupResponse from the upload
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
export async function createCustomServerBackup(
  config: CustomServerConfig,
  onProgress?: UploadProgressCallback
): Promise<ServerBackupResponse> {
  let tempPath: string | null = null;

  try {
    // Step 1: Report exporting progress
    onProgress?.({ stage: 'exporting', progress: 0, message: 'Exporting database...' });

    // Step 2: Export the database to a temp file
    try {
      tempPath = await backupService.exportDatabase();
    } catch (error) {
      if (error instanceof BackupError && error.code === 'DATABASE_NOT_FOUND') {
        throw new CustomServerError(
          'Database file not found',
          'DATABASE_NOT_FOUND',
          undefined,
          error
        );
      }
      throw new CustomServerError(
        'Failed to export database',
        'EXPORT_FAILED',
        undefined,
        error
      );
    }

    // Step 3: Report export complete
    onProgress?.({ stage: 'exporting', progress: 1, message: 'Export complete' });

    // Step 4: Upload to the custom server
    const response = await upload(tempPath, config, onProgress);

    // Step 5: Return the server response
    return response;
  } finally {
    // Step 6: Always delete the temp file
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
 * Downloads a backup from the custom server and restores the database.
 *
 * Flow:
 * 1. Downloads the backup file from the custom server to a local temp path
 * 2. Validates the downloaded backup file
 * 3. Restores the database from the downloaded file
 * 4. Deletes the temp file in a finally block (regardless of success/failure)
 * 5. Returns RestoreResult with success status and details
 *
 * Error handling:
 * - If download fails: the CustomServerError from download propagates directly
 * - If validation/restore fails: the RestoreService error propagates
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export async function restoreFromCustomServer(
  filename: string,
  config: CustomServerConfig,
  onProgress?: DownloadProgressCallback
): Promise<RestoreResult> {
  let tempPath: string | null = null;

  try {
    // Step 1: Download the backup file from the custom server
    tempPath = await download(filename, config, onProgress);

    // Step 2: Validate the downloaded backup file
    await restoreService.validateBackup(tempPath);

    // Step 3: Restore the database from the downloaded file
    const result = await restoreService.restoreDatabase(tempPath);

    return result;
  } finally {
    // Step 4: Always delete the temp file
    if (tempPath) {
      try {
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
