/**
 * Backup metadata stored in Google Drive
 */
export interface BackupMetadata {
  /** Unique identifier (Google Drive file ID) */
  id: string;
  /** Backup file name */
  fileName: string;
  /** Creation timestamp */
  createdAt: Date;
  /** File size in bytes */
  sizeBytes: number;
  /** Database schema version at backup time */
  schemaVersion: number;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  backupId?: string;
  fileName?: string;
  timestamp?: Date;
  errorMessage?: string;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  transactionCount?: number;
  schemaVersion?: number;
  errorMessage?: string;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  success: boolean;
  fileId?: string;
  errorMessage?: string;
}

/**
 * Current backup status
 */
export interface BackupStatusInfo {
  lastBackupTime: Date | null;
  status: 'success' | 'failed' | 'never';
  errorMessage?: string;
}
