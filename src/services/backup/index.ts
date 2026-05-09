/**
 * Backup services module
 *
 * Exports OAuth and backup-related services for Google Drive integration.
 *
 * @module services/backup
 */

export {
  OAuthService,
  oAuthService,
  OAuthError,
  type GoogleUser,
  type OAuthTokens,
  type OAuthErrorCode,
} from './OAuthService';

export {
  GoogleDriveClient,
  googleDriveClient,
  DriveError,
  BACKUP_CONFIG,
  type DriveFile,
  type DriveErrorCode,
  type UploadProgressCallback,
} from './GoogleDriveClient';

export {
  BackupService,
  backupService,
  BackupError,
  generateBackupFileName,
  parseBackupTimestamp,
  type BackupErrorCode,
  type BackupProgress,
  type BackupProgressCallback,
} from './BackupService';

export {
  ScheduledBackupService,
  scheduledBackupService,
  registerBackupTask,
  enableScheduledBackups,
  disableScheduledBackups,
  isScheduledBackupsEnabled,
  isBackgroundFetchAvailable,
  getBackgroundFetchStatus,
  BACKUP_TASK_NAME,
} from './ScheduledBackupService';

export {
  RestoreService,
  restoreService,
  RestoreError,
  type RestoreErrorCode,
  type RestoreProgress,
  type RestoreProgressCallback,
  type RestoreOptions,
} from './RestoreService';
