/**
 * Unit Tests: CustomServerClient
 *
 * Tests all operations: testConnection, upload, download, listBackups,
 * deleteBackup, fetchWithTimeout, mapHttpError, validateConfig.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.9, 1.10, 1.11, 4.4, 4.6, 4.7, 4.8, 6.4, 6.5
 */
import {
  testConnection,
  upload,
  download,
  listBackups,
  deleteBackup,
  fetchWithTimeout,
  mapHttpError,
  validateConfig,
  CustomServerError,
  CustomServerConfig,
  ServerBackupResponse,
  ServerBackupMetadata,
} from '../../../../src/services/backup/CustomServerClient';
import * as FileSystem from 'expo-file-system';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('testConnection', () => {
  const validConfig: CustomServerConfig = {
    serverUrl: 'http://192.168.1.10:3000',
    apiKey: 'test-api-key-123',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve void on HTTP 200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: jest.fn().mockResolvedValue('{"status":"ok"}'),
    });

    await expect(testConnection(validConfig)).resolves.toBeUndefined();
  });

  it('should call GET {serverUrl}/api/health', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });

    await testConnection(validConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://192.168.1.10:3000/api/health',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('should include x-api-key and x-device-id headers', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });

    await testConnection(validConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-device-id': 'abcdef1234567890abcdef1234567890',
        },
      })
    );
  });

  it('should throw NOT_CONFIGURED when serverUrl is empty', async () => {
    const config: CustomServerConfig = { ...validConfig, serverUrl: '' };

    await expect(testConnection(config)).rejects.toThrow(CustomServerError);
    await expect(testConnection(config)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw NOT_CONFIGURED when apiKey is empty', async () => {
    const config: CustomServerConfig = { ...validConfig, apiKey: '' };

    await expect(testConnection(config)).rejects.toThrow(CustomServerError);
    await expect(testConnection(config)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw NOT_CONFIGURED when deviceId is empty', async () => {
    const config: CustomServerConfig = { ...validConfig, deviceId: '' };

    await expect(testConnection(config)).rejects.toThrow(CustomServerError);
    await expect(testConnection(config)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw AUTH_FAILED on HTTP 401', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      text: jest.fn().mockResolvedValue('{"error":"Unauthorized"}'),
    });

    try {
      await testConnection(validConfig);
      fail('Expected testConnection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomServerError);
      expect((error as CustomServerError).code).toBe('AUTH_FAILED');
    }
  });

  it('should throw SERVER_ERROR on HTTP 500', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      text: jest.fn().mockResolvedValue('{"error":"Internal server error"}'),
    });

    try {
      await testConnection(validConfig);
      fail('Expected testConnection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomServerError);
      expect((error as CustomServerError).code).toBe('SERVER_ERROR');
    }
  });

  it('should throw UNKNOWN_ERROR on unexpected HTTP status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 503,
      text: jest.fn().mockResolvedValue('Service Unavailable'),
    });

    try {
      await testConnection(validConfig);
      fail('Expected testConnection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomServerError);
      expect((error as CustomServerError).code).toBe('UNKNOWN_ERROR');
    }
  });

  it('should throw NETWORK_ERROR when fetch rejects with network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    try {
      await testConnection(validConfig);
      fail('Expected testConnection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomServerError);
      expect((error as CustomServerError).code).toBe('NETWORK_ERROR');
    }
  });

  it('should throw NETWORK_ERROR on timeout (AbortError)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    try {
      await testConnection(validConfig);
      fail('Expected testConnection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomServerError);
      expect((error as CustomServerError).code).toBe('NETWORK_ERROR');
      expect((error as CustomServerError).message).toBe('Request timed out');
    }
  });

  it('should use 10000ms timeout', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      text: jest.fn().mockResolvedValue(''),
    });

    await testConnection(validConfig);

    // Verify AbortController signal is passed
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });
});

describe('validateConfig', () => {
  it('should throw NOT_CONFIGURED when serverUrl is missing', () => {
    expect(() =>
      validateConfig({ serverUrl: '', apiKey: 'key', deviceId: 'device123' })
    ).toThrow(CustomServerError);
    expect(() =>
      validateConfig({ serverUrl: '', apiKey: 'key', deviceId: 'device123' })
    ).toThrow(expect.objectContaining({ code: 'NOT_CONFIGURED' }));
  });

  it('should throw NOT_CONFIGURED when apiKey is missing', () => {
    expect(() =>
      validateConfig({ serverUrl: 'http://localhost', apiKey: '', deviceId: 'device123' })
    ).toThrow(CustomServerError);
    expect(() =>
      validateConfig({ serverUrl: 'http://localhost', apiKey: '', deviceId: 'device123' })
    ).toThrow(expect.objectContaining({ code: 'NOT_CONFIGURED' }));
  });

  it('should throw NOT_CONFIGURED when deviceId is missing', () => {
    expect(() =>
      validateConfig({ serverUrl: 'http://localhost', apiKey: 'key', deviceId: '' })
    ).toThrow(CustomServerError);
    expect(() =>
      validateConfig({ serverUrl: 'http://localhost', apiKey: 'key', deviceId: '' })
    ).toThrow(expect.objectContaining({ code: 'NOT_CONFIGURED' }));
  });

  it('should not throw when all fields are present', () => {
    expect(() =>
      validateConfig({ serverUrl: 'http://localhost', apiKey: 'key', deviceId: 'dev' })
    ).not.toThrow();
  });
});

describe('mapHttpError', () => {
  it('should return AUTH_FAILED for status 401', () => {
    const error = mapHttpError(401, '{"error":"Unauthorized"}');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('AUTH_FAILED');
    expect(error.httpStatus).toBe(401);
    expect(error.message).toBe('Invalid API key');
  });

  it('should return FILE_TOO_LARGE for status 413', () => {
    const error = mapHttpError(413, '{"error":"Payload too large"}');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('FILE_TOO_LARGE');
    expect(error.httpStatus).toBe(413);
  });

  it('should return BAD_REQUEST for status 400 with body message', () => {
    const error = mapHttpError(400, '{"error":"Invalid file format"}');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid file format');
  });

  it('should return BAD_REQUEST with default message when body is not JSON', () => {
    const error = mapHttpError(400, 'not json');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Bad request');
  });

  it('should return NOT_FOUND for status 404', () => {
    const error = mapHttpError(404, '{"error":"Not found"}');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.httpStatus).toBe(404);
  });

  it('should return SERVER_ERROR for status 500', () => {
    const error = mapHttpError(500, '{"error":"Internal error"}');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.httpStatus).toBe(500);
  });

  it('should return UNKNOWN_ERROR for unhandled status codes', () => {
    const error = mapHttpError(503, 'Service Unavailable');
    expect(error).toBeInstanceOf(CustomServerError);
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.httpStatus).toBe(503);
    expect(error.message).toContain('503');
  });

  it('should return UNKNOWN_ERROR for status 418', () => {
    const error = mapHttpError(418, '');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.httpStatus).toBe(418);
  });
});

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NETWORK_ERROR with "Request timed out" on AbortError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(
      fetchWithTimeout('http://example.com', { method: 'GET' }, 5000)
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Request timed out',
    });
  });

  it('should throw NETWORK_ERROR on generic network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(
      fetchWithTimeout('http://example.com', { method: 'GET' }, 5000)
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('Failed to fetch'),
    });
  });

  it('should return response on success', async () => {
    const mockResponse = { status: 200, ok: true };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithTimeout('http://example.com', { method: 'GET' }, 5000);
    expect(result).toBe(mockResponse);
  });

  it('should pass AbortController signal to fetch', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 });

    await fetchWithTimeout('http://example.com', { method: 'GET' }, 10000);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle non-Error thrown objects', async () => {
    mockFetch.mockRejectedValueOnce('string error');

    await expect(
      fetchWithTimeout('http://example.com', { method: 'GET' }, 5000)
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Network error: unknown',
    });
  });
});

describe('upload', () => {
  const validConfig: CustomServerConfig = {
    serverUrl: 'http://192.168.1.10:3000',
    apiKey: 'test-api-key-123',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  const mockUploadAsync = FileSystem.uploadAsync as jest.MockedFunction<typeof FileSystem.uploadAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return ServerBackupResponse on successful upload', async () => {
    const serverResponse: ServerBackupResponse = {
      filename: 'backup-20250115-143022.db',
      timestamp: '2025-01-15T14:30:22.000Z',
      sizeBytes: 2048,
    };
    mockUploadAsync.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify(serverResponse),
      headers: {},
    });

    const result = await upload('/path/to/file.db', validConfig);

    expect(result).toEqual(serverResponse);
  });

  it('should call uploadAsync with correct parameters', async () => {
    mockUploadAsync.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ filename: 'f.db', timestamp: '2025-01-01T00:00:00Z', sizeBytes: 100 }),
      headers: {},
    });

    await upload('/path/to/file.db', validConfig);

    expect(mockUploadAsync).toHaveBeenCalledWith(
      'http://192.168.1.10:3000/api/backups',
      '/path/to/file.db',
      expect.objectContaining({
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'backup',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-device-id': 'abcdef1234567890abcdef1234567890',
        },
      })
    );
  });

  it('should invoke progress callback at start and end', async () => {
    mockUploadAsync.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ filename: 'f.db', timestamp: '2025-01-01T00:00:00Z', sizeBytes: 100 }),
      headers: {},
    });

    const onProgress = jest.fn();
    await upload('/path/to/file.db', validConfig, onProgress);

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'uploading', progress: 0 })
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'uploading', progress: 1, message: 'Upload complete' })
    );
  });

  it('should throw NOT_CONFIGURED when config is incomplete', async () => {
    const badConfig: CustomServerConfig = { serverUrl: '', apiKey: 'key', deviceId: 'dev' };

    await expect(upload('/path/to/file.db', badConfig)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockUploadAsync).not.toHaveBeenCalled();
  });

  it('should throw mapped error on non-200 response', async () => {
    mockUploadAsync.mockResolvedValueOnce({
      status: 401,
      body: '{"error":"Unauthorized"}',
      headers: {},
    });

    await expect(upload('/path/to/file.db', validConfig)).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('should throw FILE_TOO_LARGE on 413 response', async () => {
    mockUploadAsync.mockResolvedValueOnce({
      status: 413,
      body: '{"error":"File too large"}',
      headers: {},
    });

    await expect(upload('/path/to/file.db', validConfig)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });

  it('should throw NETWORK_ERROR on network failure', async () => {
    mockUploadAsync.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(upload('/path/to/file.db', validConfig)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('should re-throw CustomServerError without wrapping', async () => {
    const customError = new CustomServerError('Server-side error', 'SERVER_ERROR', 500);
    mockUploadAsync.mockRejectedValueOnce(customError);

    await expect(upload('/path/to/file.db', validConfig)).rejects.toBe(customError);
  });
});

describe('download', () => {
  const validConfig: CustomServerConfig = {
    serverUrl: 'http://192.168.1.10:3000',
    apiKey: 'test-api-key-123',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  const mockDownloadAsync = FileSystem.downloadAsync as jest.MockedFunction<typeof FileSystem.downloadAsync>;
  const mockDeleteAsync = FileSystem.deleteAsync as jest.MockedFunction<typeof FileSystem.deleteAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return file URI on successful download', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      status: 200,
      uri: '/mock/cache/backup-123-test.db',
      headers: {},
      md5: undefined,
    });

    const result = await download('test.db', validConfig);

    expect(result).toBe('/mock/cache/backup-123-test.db');
  });

  it('should call downloadAsync with correct URL and headers', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      status: 200,
      uri: '/mock/cache/backup-file.db',
      headers: {},
      md5: undefined,
    });

    await download('my-backup.db', validConfig);

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'http://192.168.1.10:3000/api/backups/my-backup.db',
      expect.stringContaining('/mock/cache/backup-'),
      expect.objectContaining({
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-device-id': 'abcdef1234567890abcdef1234567890',
        },
      })
    );
  });

  it('should invoke progress callback at start and end', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      status: 200,
      uri: '/mock/cache/backup-file.db',
      headers: {},
      md5: undefined,
    });

    const onProgress = jest.fn();
    await download('test.db', validConfig, onProgress);

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'downloading', progress: 0 })
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'downloading', progress: 1, message: 'Download complete' })
    );
  });

  it('should throw NOT_CONFIGURED when config is incomplete', async () => {
    const badConfig: CustomServerConfig = { serverUrl: 'http://localhost', apiKey: '', deviceId: 'dev' };

    await expect(download('test.db', badConfig)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it('should throw NOT_FOUND on 404 response and delete temp file', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      status: 404,
      uri: '/mock/cache/backup-temp.db',
      headers: {},
      md5: undefined,
    });

    await expect(download('missing.db', validConfig)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('/mock/cache/backup-'),
      { idempotent: true }
    );
  });

  it('should throw DOWNLOAD_FAILED on non-200/non-404 and delete temp file', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      status: 500,
      uri: '/mock/cache/backup-temp.db',
      headers: {},
      md5: undefined,
    });

    await expect(download('test.db', validConfig)).rejects.toMatchObject({
      code: 'DOWNLOAD_FAILED',
    });

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('/mock/cache/backup-'),
      { idempotent: true }
    );
  });

  it('should delete partial file on network error', async () => {
    mockDownloadAsync.mockRejectedValueOnce(new Error('Connection reset'));

    await expect(download('test.db', validConfig)).rejects.toMatchObject({
      code: 'DOWNLOAD_FAILED',
    });

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('/mock/cache/backup-'),
      { idempotent: true }
    );
  });

  it('should not fail if temp file deletion throws during cleanup', async () => {
    mockDownloadAsync.mockRejectedValueOnce(new Error('Connection reset'));
    mockDeleteAsync.mockRejectedValueOnce(new Error('File not found'));

    await expect(download('test.db', validConfig)).rejects.toMatchObject({
      code: 'DOWNLOAD_FAILED',
    });
  });
});

describe('listBackups', () => {
  const validConfig: CustomServerConfig = {
    serverUrl: 'http://192.168.1.10:3000',
    apiKey: 'test-api-key-123',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return sorted array of backups (newest first)', async () => {
    const backups: ServerBackupMetadata[] = [
      { filename: 'old.db', createdAt: '2025-01-01T00:00:00Z', sizeBytes: 100 },
      { filename: 'new.db', createdAt: '2025-01-15T00:00:00Z', sizeBytes: 200 },
      { filename: 'mid.db', createdAt: '2025-01-10T00:00:00Z', sizeBytes: 150 },
    ];

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue(backups),
      text: jest.fn().mockResolvedValue(JSON.stringify(backups)),
    });

    const result = await listBackups(validConfig);

    expect(result[0].filename).toBe('new.db');
    expect(result[1].filename).toBe('mid.db');
    expect(result[2].filename).toBe('old.db');
  });

  it('should return empty array when server returns empty list', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue([]),
      text: jest.fn().mockResolvedValue('[]'),
    });

    const result = await listBackups(validConfig);

    expect(result).toEqual([]);
  });

  it('should throw NOT_CONFIGURED when config is incomplete', async () => {
    const badConfig: CustomServerConfig = { serverUrl: '', apiKey: 'key', deviceId: 'dev' };

    await expect(listBackups(badConfig)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw AUTH_FAILED on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      text: jest.fn().mockResolvedValue('{"error":"Unauthorized"}'),
    });

    await expect(listBackups(validConfig)).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('should throw SERVER_ERROR on 500 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      text: jest.fn().mockResolvedValue('{"error":"Internal error"}'),
    });

    await expect(listBackups(validConfig)).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
  });

  it('should include x-api-key and x-device-id headers', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue([]),
      text: jest.fn().mockResolvedValue('[]'),
    });

    await listBackups(validConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://192.168.1.10:3000/api/backups',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-device-id': 'abcdef1234567890abcdef1234567890',
        },
      })
    );
  });
});

describe('deleteBackup', () => {
  const validConfig: CustomServerConfig = {
    serverUrl: 'http://192.168.1.10:3000',
    apiKey: 'test-api-key-123',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return message on successful deletion', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue({ message: 'Backup deleted successfully' }),
      text: jest.fn().mockResolvedValue('{"message":"Backup deleted successfully"}'),
    });

    const result = await deleteBackup('old-backup.db', validConfig);

    expect(result).toEqual({ message: 'Backup deleted successfully' });
  });

  it('should call DELETE {serverUrl}/api/backups/:filename', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: jest.fn().mockResolvedValue({ message: 'Deleted' }),
      text: jest.fn().mockResolvedValue('{"message":"Deleted"}'),
    });

    await deleteBackup('my-file.db', validConfig);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://192.168.1.10:3000/api/backups/my-file.db',
      expect.objectContaining({
        method: 'DELETE',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-device-id': 'abcdef1234567890abcdef1234567890',
        },
      })
    );
  });

  it('should throw NOT_CONFIGURED when config is incomplete', async () => {
    const badConfig: CustomServerConfig = { serverUrl: 'http://localhost', apiKey: 'key', deviceId: '' };

    await expect(deleteBackup('file.db', badConfig)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw NOT_FOUND on 404 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 404,
      text: jest.fn().mockResolvedValue('{"error":"Not found"}'),
    });

    await expect(deleteBackup('missing.db', validConfig)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('should throw AUTH_FAILED on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      text: jest.fn().mockResolvedValue('{"error":"Unauthorized"}'),
    });

    await expect(deleteBackup('file.db', validConfig)).rejects.toMatchObject({
      code: 'AUTH_FAILED',
    });
  });

  it('should throw SERVER_ERROR on 500 response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      text: jest.fn().mockResolvedValue('{"error":"Internal error"}'),
    });

    await expect(deleteBackup('file.db', validConfig)).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
  });

  it('should throw UNKNOWN_ERROR on unhandled status', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 503,
      text: jest.fn().mockResolvedValue('Service Unavailable'),
    });

    await expect(deleteBackup('file.db', validConfig)).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });
  });
});
