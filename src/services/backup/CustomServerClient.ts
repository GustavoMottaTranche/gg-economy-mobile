import * as FileSystem from 'expo-file-system/legacy';
import { BackupMetadata } from '../../types/backup';

// Error codes matching Requirement 8
export type CustomServerErrorCode =
  | 'AUTH_FAILED'
  | 'FILE_TOO_LARGE'
  | 'NETWORK_ERROR'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR'
  | 'DATABASE_NOT_FOUND'
  | 'EXPORT_FAILED'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED';

export class CustomServerError extends Error {
  constructor(
    message: string,
    public readonly code: CustomServerErrorCode,
    public readonly httpStatus?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'CustomServerError';
  }
}

export interface CustomServerConfig {
  serverUrl: string;
  apiKey: string;
  deviceId: string;
}

export interface ServerBackupMetadata {
  filename: string;
  createdAt: string; // ISO 8601
  sizeBytes: number;
}

export interface ServerBackupResponse {
  filename: string;
  timestamp: string; // ISO 8601
  sizeBytes: number;
}

export interface UploadProgressCallback {
  (progress: { stage: 'exporting' | 'uploading'; progress: number; message: string }): void;
}

export interface DownloadProgressCallback {
  (progress: { stage: 'downloading'; progress: number; message: string }): void;
}

/**
 * Maps server backup metadata to the app's BackupMetadata interface.
 * Sets schemaVersion to 0 since it's unknown for server backups.
 */
export function mapServerToAppMetadata(server: ServerBackupMetadata): BackupMetadata {
  return {
    id: server.filename,
    fileName: server.filename,
    createdAt: new Date(server.createdAt),
    sizeBytes: server.sizeBytes,
    schemaVersion: 0,
  };
}

/**
 * Maps an HTTP status code to a CustomServerError.
 * Parses the response body for error messages when available.
 */
export function mapHttpError(status: number, responseBody: string): CustomServerError {
  let errorMessage: string;

  switch (status) {
    case 401:
      return new CustomServerError('Invalid API key', 'AUTH_FAILED', status);
    case 413:
      return new CustomServerError('File exceeds 50 MB limit', 'FILE_TOO_LARGE', status);
    case 400: {
      // Use error message from response body
      let bodyMessage = 'Bad request';
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.error) {
          bodyMessage = parsed.error;
        }
      } catch {
        // If body isn't valid JSON, use default message
      }
      return new CustomServerError(bodyMessage, 'BAD_REQUEST', status);
    }
    case 404:
      return new CustomServerError('Backup not found', 'NOT_FOUND', status);
    case 500:
      return new CustomServerError('Server-side error', 'SERVER_ERROR', status);
    default:
      errorMessage = `Unexpected status: ${status}`;
      return new CustomServerError(errorMessage, 'UNKNOWN_ERROR', status);
  }
}

/**
 * Performs a fetch request with a timeout using AbortController.
 * Throws NETWORK_ERROR if the request times out or a network error occurs.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CustomServerError('Request timed out', 'NETWORK_ERROR');
    }
    const message =
      error instanceof Error ? `Network error: ${error.message}` : 'Network error: unknown';
    throw new CustomServerError(message, 'NETWORK_ERROR', undefined, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validates that the configuration is complete.
 * Throws NOT_CONFIGURED if serverUrl, apiKey, or deviceId is missing or empty.
 */
export function validateConfig(config: CustomServerConfig): void {
  if (!config.serverUrl || !config.apiKey || !config.deviceId) {
    throw new CustomServerError('Server not configured', 'NOT_CONFIGURED');
  }
}

/**
 * Tests the connection to the backup server by hitting the /api/health endpoint.
 * Timeout: 10 seconds.
 * Returns void on success (HTTP 200), throws CustomServerError on failure.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function testConnection(config: CustomServerConfig): Promise<void> {
  validateConfig(config);

  const url = `${config.serverUrl}/api/health`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
    },
    10000
  );

  if (response.status === 200) {
    return;
  }

  const body = await response.text();
  throw mapHttpError(response.status, body);
}

/**
 * Lists all backups for this device from the server, sorted by createdAt descending (newest first).
 * Timeout: 30 seconds.
 *
 * Validates: Requirements 1.2, 1.3, 1.6, 5.1, 5.3
 */
export async function listBackups(config: CustomServerConfig): Promise<ServerBackupMetadata[]> {
  validateConfig(config);

  const url = `${config.serverUrl}/api/backups`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
    },
    30000
  );

  if (response.status !== 200) {
    const body = await response.text();
    throw mapHttpError(response.status, body);
  }

  const backups: ServerBackupMetadata[] = await response.json();

  backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return backups;
}

/**
 * Uploads a .db file to the backup server using multipart/form-data.
 * Timeout: 60 seconds.
 * Reports progress via callback and returns ServerBackupResponse on success.
 *
 * Validates: Requirements 1.2, 1.3, 1.5, 4.2, 4.3, 4.5
 */
export async function upload(
  localFilePath: string,
  config: CustomServerConfig,
  onProgress?: UploadProgressCallback
): Promise<ServerBackupResponse> {
  validateConfig(config);

  onProgress?.({ stage: 'uploading', progress: 0, message: 'Starting upload...' });

  const url = `${config.serverUrl}/api/backups`;

  try {
    const response = await FileSystem.uploadAsync(url, localFilePath, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'application/octet-stream',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
    });

    if (response.status === 200) {
      const parsed: ServerBackupResponse = JSON.parse(response.body);
      onProgress?.({ stage: 'uploading', progress: 1, message: 'Upload complete' });
      return parsed;
    }

    throw mapHttpError(response.status, response.body);
  } catch (error: unknown) {
    if (error instanceof CustomServerError) {
      throw error;
    }
    const message =
      error instanceof Error ? `Network error: ${error.message}` : 'Network error: unknown';
    throw new CustomServerError(message, 'NETWORK_ERROR', undefined, error);
  }
}



/**
 * Delete a backup from the server.
 * Sends DELETE to {serverUrl}/api/backups/:filename with auth headers.
 * Timeout: 30 seconds.
 * Returns success object on HTTP 200.
 *
 * Validates: Requirements 1.2, 1.3, 1.8, 7.1, 7.2, 7.3, 7.4
 */
export async function deleteBackup(
  filename: string,
  config: CustomServerConfig
): Promise<{ message: string }> {
  validateConfig(config);

  const url = `${config.serverUrl}/api/backups/${filename}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'DELETE',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
    },
    30000
  );

  if (response.status === 200) {
    const data = await response.json();
    return { message: data.message };
  }

  const body = await response.text();
  throw mapHttpError(response.status, body);
}

/**
 * Downloads a backup file from the server to the device cache directory.
 * Timeout: 120 seconds.
 * Returns the local file URI on success.
 * Deletes partial file on failure.
 *
 * Validates: Requirements 1.2, 1.3, 1.7, 6.1, 6.2, 6.3, 6.5, 6.6
 */
export async function download(
  filename: string,
  config: CustomServerConfig,
  onProgress?: DownloadProgressCallback
): Promise<string> {
  validateConfig(config);

  onProgress?.({ stage: 'downloading', progress: 0, message: 'Starting download...' });

  const url = `${config.serverUrl}/api/backups/${filename}`;
  const localUri = `${FileSystem.cacheDirectory}backup-${Date.now()}-${filename}`;

  try {
    const result = await FileSystem.downloadAsync(url, localUri, {
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
    });

    if (result.status !== 200) {
      // Delete the temp file on non-200 status
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      } catch {
        // Ignore delete errors
      }

      if (result.status === 404) {
        throw new CustomServerError('Backup not found', 'NOT_FOUND', 404);
      }
      throw new CustomServerError(
        `Download failed with status ${result.status}`,
        'DOWNLOAD_FAILED',
        result.status
      );
    }

    onProgress?.({ stage: 'downloading', progress: 1, message: 'Download complete' });

    return result.uri;
  } catch (error: unknown) {
    // If it's already a CustomServerError, re-throw without deleting again
    if (error instanceof CustomServerError) {
      throw error;
    }

    // Delete partial file on any other error
    try {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch {
      // Ignore delete errors
    }

    throw new CustomServerError(
      'Download failed',
      'DOWNLOAD_FAILED',
      undefined,
      error
    );
  }
}

/**
 * Singleton instance providing all custom server client operations.
 */
export const customServerClient = {
  testConnection,
  upload,
  listBackups,
  download,
  deleteBackup,
};
