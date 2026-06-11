/**
 * Cloud Sync Import module
 *
 * Provides one-way data migration from the local SQLite database
 * to the GG-Economy Web platform via a sequential pipeline:
 * authenticate → extract → build payload → upload.
 *
 * @module services/cloud-sync
 */

export { CloudSyncError, type CloudSyncErrorCode } from './CloudSyncError';

export { camelToSnake, buildPayload } from './SyncPayloadBuilder';

export { uploadImport } from './SyncImportClient';

export {
  getSyncKey,
  setSyncKey,
  removeSyncKey,
  validateSyncKey,
  isValidSyncKeyFormat,
} from './SyncKeyStorage';

export type {
  LoginCredentials,
  LoginResult,
  ExtractedData,
  ImportPayload,
  ImportResult,
  ImportResultTotals,
  SyncStep,
  SyncProgressCallback,
} from './types';
