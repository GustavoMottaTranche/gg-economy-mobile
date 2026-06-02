/**
 * Backup services module
 *
 * Exports backup-related services for custom server integration.
 *
 * @module services/backup
 */

export {
  BackupService,
  backupService,
  BackupError,
  BACKUP_CONFIG,
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

export { createCustomServerBackup, restoreFromCustomServer } from './CustomServerIntegration';

export {
  CustomServerSettingsStore,
  customServerSettingsStore,
  type ServerSettings,
  type ValidationResult,
} from './CustomServerSettingsStore';

export {
  CustomServerError,
  customServerClient,
  testConnection,
  listBackups,
  upload,
  download,
  deleteBackup,
  validateConfig,
  mapServerToAppMetadata,
  type CustomServerConfig,
  type CustomServerErrorCode,
  type ServerBackupMetadata,
  type ServerBackupResponse,
  type UploadProgressCallback,
  type DownloadProgressCallback,
} from './CustomServerClient';
