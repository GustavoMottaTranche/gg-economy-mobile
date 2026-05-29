/**
 * Property-Based Tests: CustomServerClient
 *
 * Feature: app-backup-integration
 */
import * as fc from 'fast-check';
import {
  mapServerToAppMetadata,
  mapHttpError,
  CustomServerError,
  CustomServerErrorCode,
  ServerBackupMetadata,
} from '../../../../src/services/backup/CustomServerClient';

/**
 * Property 2: Server Response Mapping
 *
 * **Validates: Requirements 1.6, 4.3, 5.2**
 *
 * For any valid server backup metadata object containing a filename (non-empty string),
 * a createdAt (valid ISO 8601 string), and a sizeBytes (non-negative integer),
 * the mapping function SHALL produce a BackupMetadata object where:
 * - id === filename
 * - fileName === filename
 * - createdAt is a Date object representing the same instant
 * - sizeBytes is preserved as-is
 * - schemaVersion === 0
 */
describe('Property 2: Server Response Mapping', () => {
  /**
   * Arbitrary for generating valid ISO 8601 date strings
   */
  const iso8601DateArb = fc
    .tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 999 })
    )
    .map(([year, month, day, hour, minute, second, ms]) => {
      const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
      return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(ms, 3)}Z`;
    });

  /**
   * Arbitrary for generating valid filenames (non-empty strings resembling backup filenames)
   */
  const filenameCharsArb = fc.array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.split('')
    ),
    { minLength: 1, maxLength: 50 }
  );
  const filenameArb = filenameCharsArb.map((chars) => chars.join('') + '.db');

  /**
   * Arbitrary for generating non-negative integer sizeBytes
   */
  const sizeBytesArb = fc.nat({ max: 100_000_000 }); // 0 to 100MB

  /**
   * Arbitrary for generating valid ServerBackupMetadata objects
   */
  const serverBackupMetadataArb: fc.Arbitrary<ServerBackupMetadata> = fc.record({
    filename: filenameArb,
    createdAt: iso8601DateArb,
    sizeBytes: sizeBytesArb,
  });

  it('should map id to filename', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        expect(result.id).toBe(serverMetadata.filename);
      }),
      { numRuns: 100 }
    );
  });

  it('should map fileName to filename', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        expect(result.fileName).toBe(serverMetadata.filename);
      }),
      { numRuns: 100 }
    );
  });

  it('should convert createdAt ISO string to correct Date object', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        const expectedDate = new Date(serverMetadata.createdAt);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.createdAt.getTime()).toBe(expectedDate.getTime());
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve sizeBytes as-is', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        expect(result.sizeBytes).toBe(serverMetadata.sizeBytes);
      }),
      { numRuns: 100 }
    );
  });

  it('should set schemaVersion to 0', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        expect(result.schemaVersion).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should satisfy all mapping properties simultaneously', () => {
    fc.assert(
      fc.property(serverBackupMetadataArb, (serverMetadata) => {
        const result = mapServerToAppMetadata(serverMetadata);
        const expectedDate = new Date(serverMetadata.createdAt);

        // All properties must hold simultaneously
        expect(result.id).toBe(serverMetadata.filename);
        expect(result.fileName).toBe(serverMetadata.filename);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.createdAt.getTime()).toBe(expectedDate.getTime());
        expect(result.sizeBytes).toBe(serverMetadata.sizeBytes);
        expect(result.schemaVersion).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: HTTP Error Code Mapping', () => {
  /**
   * Arbitrary for generating non-2xx HTTP status codes.
   * Covers informational (1xx), redirection (3xx), client error (4xx), and server error (5xx).
   */
  const nonSuccessStatusArb = fc.oneof(
    // 1xx informational
    fc.integer({ min: 100, max: 199 }),
    // 3xx redirection
    fc.integer({ min: 300, max: 399 }),
    // 4xx client errors
    fc.integer({ min: 400, max: 499 }),
    // 5xx server errors
    fc.integer({ min: 500, max: 599 })
  );

  /**
   * Arbitrary for generating specifically-mapped status codes.
   */
  const knownStatusArb = fc.constantFrom(400, 401, 404, 413, 500);

  /**
   * Arbitrary for generating non-2xx status codes that are NOT in the known mapping.
   */
  const unknownStatusArb = nonSuccessStatusArb.filter(
    (status) => ![400, 401, 404, 413, 500].includes(status)
  );

  /**
   * Arbitrary for generating response body strings.
   */
  const responseBodyArb = fc.option(
    fc.string({ minLength: 1, maxLength: 200 }),
    { nil: undefined }
  );

  it('should map 401 to AUTH_FAILED for any response body', () => {
    fc.assert(
      fc.property(responseBodyArb, (responseBody) => {
        const error = mapHttpError(401, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('AUTH_FAILED');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  it('should map 413 to FILE_TOO_LARGE for any response body', () => {
    fc.assert(
      fc.property(responseBodyArb, (responseBody) => {
        const error = mapHttpError(413, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('FILE_TOO_LARGE');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(413);
      }),
      { numRuns: 100 }
    );
  });

  it('should map 400 to BAD_REQUEST for any response body', () => {
    fc.assert(
      fc.property(responseBodyArb, (responseBody) => {
        const error = mapHttpError(400, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('BAD_REQUEST');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(400);
      }),
      { numRuns: 100 }
    );
  });

  it('should map 404 to NOT_FOUND for any response body', () => {
    fc.assert(
      fc.property(responseBodyArb, (responseBody) => {
        const error = mapHttpError(404, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('NOT_FOUND');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(404);
      }),
      { numRuns: 100 }
    );
  });

  it('should map 500 to SERVER_ERROR for any response body', () => {
    fc.assert(
      fc.property(responseBodyArb, (responseBody) => {
        const error = mapHttpError(500, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('SERVER_ERROR');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(500);
      }),
      { numRuns: 100 }
    );
  });

  it('should map any other non-2xx status to UNKNOWN_ERROR', () => {
    fc.assert(
      fc.property(unknownStatusArb, responseBodyArb, (status, responseBody) => {
        const error = mapHttpError(status, responseBody);

        expect(error).toBeInstanceOf(CustomServerError);
        expect(error.code).toBe('UNKNOWN_ERROR');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBe(status);
      }),
      { numRuns: 100 }
    );
  });

  it('should always produce errors with both code and message fields for any non-2xx status', () => {
    fc.assert(
      fc.property(nonSuccessStatusArb, responseBodyArb, (status, responseBody) => {
        const error = mapHttpError(status, responseBody);

        // Every error must be a CustomServerError instance
        expect(error).toBeInstanceOf(CustomServerError);

        // Every error must have a code field that is a non-empty string
        expect(typeof error.code).toBe('string');
        expect(error.code.length).toBeGreaterThan(0);

        // Every error must have a message field that is a non-empty string
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);

        // The httpStatus should match the input status
        expect(error.httpStatus).toBe(status);

        // The code must be one of the valid CustomServerErrorCode values
        const validCodes: CustomServerErrorCode[] = [
          'AUTH_FAILED',
          'FILE_TOO_LARGE',
          'BAD_REQUEST',
          'NOT_FOUND',
          'SERVER_ERROR',
          'UNKNOWN_ERROR',
        ];
        expect(validCodes).toContain(error.code);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly map the complete set of known status codes', () => {
    const expectedMapping: Record<number, CustomServerErrorCode> = {
      401: 'AUTH_FAILED',
      413: 'FILE_TOO_LARGE',
      400: 'BAD_REQUEST',
      404: 'NOT_FOUND',
      500: 'SERVER_ERROR',
    };

    fc.assert(
      fc.property(knownStatusArb, responseBodyArb, (status, responseBody) => {
        const error = mapHttpError(status, responseBody);
        expect(error.code).toBe(expectedMapping[status]);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 7: Backup List Sorting
 *
 * **Validates: Requirements 5.1**
 *
 * For any non-empty array of server backup metadata objects with distinct createdAt timestamps,
 * the list returned by listBackups SHALL be sorted in descending order by createdAt (newest first),
 * such that for every consecutive pair of items, the earlier item's createdAt is greater than or
 * equal to the later item's createdAt.
 */
describe('Property 7: Backup List Sorting', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Arbitrary for generating distinct ISO 8601 timestamps.
   * Uses unique millisecond offsets from a base date to ensure distinctness.
   */
  const distinctTimestampsArb = (count: number) =>
    fc
      .uniqueArray(fc.integer({ min: 0, max: 1_000_000_000_000 }), {
        minLength: count,
        maxLength: count,
      })
      .map((offsets) =>
        offsets.map((offset) => new Date(946684800000 + offset).toISOString())
      );

  /**
   * Arbitrary for generating valid filenames
   */
  const filenameArb = fc
    .array(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
      ),
      { minLength: 1, maxLength: 30 }
    )
    .map((chars) => chars.join('') + '.db');

  /**
   * Arbitrary for generating non-negative sizeBytes
   */
  const sizeBytesArb = fc.nat({ max: 100_000_000 });

  /**
   * Arbitrary for generating arrays of ServerBackupMetadata with distinct createdAt timestamps.
   * Array length between 2 and 20 items.
   */
  const backupArrayArb = fc
    .integer({ min: 2, max: 20 })
    .chain((length) =>
      fc.tuple(
        fc.array(filenameArb, { minLength: length, maxLength: length }),
        distinctTimestampsArb(length),
        fc.array(sizeBytesArb, { minLength: length, maxLength: length })
      )
    )
    .map(([filenames, timestamps, sizes]) =>
      filenames.map((filename, i) => ({
        filename,
        createdAt: timestamps[i],
        sizeBytes: sizes[i],
      }))
    );

  /**
   * Valid config for calling listBackups
   */
  const validConfig = {
    serverUrl: 'http://localhost:3000',
    apiKey: 'test-api-key',
    deviceId: 'abcdef1234567890abcdef1234567890',
  };

  it('should return backups sorted by createdAt descending (newest first)', async () => {
    await fc.assert(
      fc.asyncProperty(backupArrayArb, async (unsortedBackups) => {
        // Mock fetch to return the unsorted array
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => [...unsortedBackups],
          text: async () => JSON.stringify(unsortedBackups),
        });

        // Import listBackups dynamically to use the mocked fetch
        const { listBackups } = require('../../../../src/services/backup/CustomServerClient');

        const result = await listBackups(validConfig);

        // Verify the result has the same length as input
        expect(result.length).toBe(unsortedBackups.length);

        // Verify descending sort: for every consecutive pair, earlier item's createdAt >= later item's createdAt
        for (let i = 0; i < result.length - 1; i++) {
          const currentTime = new Date(result[i].createdAt).getTime();
          const nextTime = new Date(result[i + 1].createdAt).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all items from the original array after sorting', async () => {
    await fc.assert(
      fc.asyncProperty(backupArrayArb, async (unsortedBackups) => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => [...unsortedBackups],
          text: async () => JSON.stringify(unsortedBackups),
        });

        const { listBackups } = require('../../../../src/services/backup/CustomServerClient');

        const result = await listBackups(validConfig);

        // All original items should be present (same set of createdAt values)
        const originalTimestamps = unsortedBackups
          .map((b: ServerBackupMetadata) => b.createdAt)
          .sort();
        const resultTimestamps = result
          .map((b: ServerBackupMetadata) => b.createdAt)
          .sort();
        expect(resultTimestamps).toEqual(originalTimestamps);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle a single-item array (trivially sorted)', async () => {
    const singleItemArb = fc.tuple(filenameArb, sizeBytesArb).map(([filename, sizeBytes]) => [
      {
        filename,
        createdAt: new Date(1700000000000).toISOString(),
        sizeBytes,
      },
    ]);

    await fc.assert(
      fc.asyncProperty(singleItemArb, async (backups) => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => [...backups],
          text: async () => JSON.stringify(backups),
        });

        const { listBackups } = require('../../../../src/services/backup/CustomServerClient');

        const result = await listBackups(validConfig);

        expect(result.length).toBe(1);
        expect(result[0].createdAt).toBe(backups[0].createdAt);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 1: Required Headers Invariant
 *
 * **Validates: Requirements 1.2, 1.3, 3.3**
 *
 * For any valid CustomServerConfig and for any operation (upload, list, download, delete, testConnection),
 * the outgoing HTTP request SHALL include both the `x-api-key` header set to the configured API key
 * and the `x-device-id` header set to the configured device ID.
 */
describe('Property 1: Required Headers Invariant', () => {
  const FileSystem = require('expo-file-system');

  /**
   * Arbitrary for generating non-empty strings suitable for config fields.
   * Ensures serverUrl starts with http:// or https://, and apiKey/deviceId are non-empty.
   */
  const serverUrlArb = fc
    .tuple(
      fc.constantFrom('http://', 'https://'),
      fc.stringMatching(/^[a-z][a-z0-9.-]{0,49}$/)
    )
    .map(([scheme, host]) => `${scheme}${host}`);

  const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0);

  const customServerConfigArb = fc.record({
    serverUrl: serverUrlArb,
    apiKey: nonEmptyStringArb,
    deviceId: nonEmptyStringArb,
  });

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('testConnection: every request includes x-api-key and x-device-id headers with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(customServerConfigArb, async (config) => {
        let capturedHeaders: Record<string, string> = {};

        global.fetch = jest.fn((_url: string, options?: RequestInit) => {
          const headers = options?.headers as Record<string, string> | undefined;
          if (headers) {
            capturedHeaders = { ...headers };
          }
          return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
        }) as jest.Mock;

        const { testConnection } = require('../../../../src/services/backup/CustomServerClient');
        await testConnection(config);

        expect(capturedHeaders['x-api-key']).toBe(config.apiKey);
        expect(capturedHeaders['x-device-id']).toBe(config.deviceId);
      }),
      { numRuns: 100 }
    );
  });

  it('listBackups: every request includes x-api-key and x-device-id headers with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(customServerConfigArb, async (config) => {
        let capturedHeaders: Record<string, string> = {};

        global.fetch = jest.fn((_url: string, options?: RequestInit) => {
          const headers = options?.headers as Record<string, string> | undefined;
          if (headers) {
            capturedHeaders = { ...headers };
          }
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
        }) as jest.Mock;

        const { listBackups } = require('../../../../src/services/backup/CustomServerClient');
        await listBackups(config);

        expect(capturedHeaders['x-api-key']).toBe(config.apiKey);
        expect(capturedHeaders['x-device-id']).toBe(config.deviceId);
      }),
      { numRuns: 100 }
    );
  });

  it('deleteBackup: every request includes x-api-key and x-device-id headers with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(customServerConfigArb, async (config) => {
        let capturedHeaders: Record<string, string> = {};

        global.fetch = jest.fn((_url: string, options?: RequestInit) => {
          const headers = options?.headers as Record<string, string> | undefined;
          if (headers) {
            capturedHeaders = { ...headers };
          }
          return Promise.resolve(
            new Response(JSON.stringify({ message: 'deleted' }), { status: 200 })
          );
        }) as jest.Mock;

        const { deleteBackup } = require('../../../../src/services/backup/CustomServerClient');
        await deleteBackup('test-backup.db', config);

        expect(capturedHeaders['x-api-key']).toBe(config.apiKey);
        expect(capturedHeaders['x-device-id']).toBe(config.deviceId);
      }),
      { numRuns: 100 }
    );
  });

  it('upload: every request includes x-api-key and x-device-id headers with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(customServerConfigArb, async (config) => {
        let capturedHeaders: Record<string, string> = {};

        FileSystem.uploadAsync.mockImplementation(
          (_url: string, _filePath: string, options?: { headers?: Record<string, string> }) => {
            if (options?.headers) {
              capturedHeaders = { ...options.headers };
            }
            return Promise.resolve({
              status: 200,
              body: JSON.stringify({ filename: 'backup.db', timestamp: '2025-01-01T00:00:00Z', sizeBytes: 1024 }),
              headers: {},
            });
          }
        );

        const { upload } = require('../../../../src/services/backup/CustomServerClient');
        await upload('/mock/path/backup.db', config);

        expect(capturedHeaders['x-api-key']).toBe(config.apiKey);
        expect(capturedHeaders['x-device-id']).toBe(config.deviceId);
      }),
      { numRuns: 100 }
    );
  });

  it('download: every request includes x-api-key and x-device-id headers with correct values', async () => {
    await fc.assert(
      fc.asyncProperty(customServerConfigArb, async (config) => {
        let capturedHeaders: Record<string, string> = {};

        FileSystem.downloadAsync.mockImplementation(
          (_url: string, _localUri: string, options?: { headers?: Record<string, string> }) => {
            if (options?.headers) {
              capturedHeaders = { ...options.headers };
            }
            return Promise.resolve({
              status: 200,
              uri: '/mock/cache/backup.db',
            });
          }
        );

        const { download } = require('../../../../src/services/backup/CustomServerClient');
        await download('backup.db', config);

        expect(capturedHeaders['x-api-key']).toBe(config.apiKey);
        expect(capturedHeaders['x-device-id']).toBe(config.deviceId);
      }),
      { numRuns: 100 }
    );
  });
});
