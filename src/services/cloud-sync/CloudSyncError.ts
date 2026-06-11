/**
 * CloudSyncError - Typed error class for the cloud sync import feature.
 *
 * Defines all possible error codes and provides a structured error with
 * code and optional HTTP status for the UI and orchestration layers.
 *
 * @module services/cloud-sync/CloudSyncError
 */

export type CloudSyncErrorCode =
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'EXTRACTION_FAILED'
  | 'PAYLOAD_ERROR'
  | 'IMPORT_FAILED'
  | 'NOT_CONFIGURED'
  | 'SERVER_ERROR'
  | 'ALREADY_RUNNING';

export class CloudSyncError extends Error {
  constructor(
    message: string,
    public readonly code: CloudSyncErrorCode,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = 'CloudSyncError';
  }
}
