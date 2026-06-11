/**
 * Unit tests for cloud sync configuration module.
 *
 * Tests URL validation, URL path construction, getCloudSyncConfig,
 * and setCloudSyncBaseUrl behaviors.
 *
 * Feature: cloud-sync-import
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fc from 'fast-check';

import { CloudSyncError } from '../CloudSyncError';
import {
  buildEndpointUrl,
  getCloudSyncConfig,
  isValidBaseUrl,
  setCloudSyncBaseUrl,
} from '../config';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

describe('cloud-sync/config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidBaseUrl', () => {
    it('returns true for valid HTTPS URL', () => {
      expect(isValidBaseUrl('https://example.com')).toBe(true);
    });

    it('returns true for valid HTTP URL', () => {
      expect(isValidBaseUrl('http://example.com')).toBe(true);
    });

    it('returns true for URL with port', () => {
      expect(isValidBaseUrl('https://example.com:3000')).toBe(true);
    });

    it('returns true for URL with path', () => {
      expect(isValidBaseUrl('https://example.com/api')).toBe(true);
    });

    it('returns true for URL with trailing slash', () => {
      expect(isValidBaseUrl('https://example.com/')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidBaseUrl('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isValidBaseUrl('   ')).toBe(false);
    });

    it('returns false for URL without scheme', () => {
      expect(isValidBaseUrl('example.com')).toBe(false);
    });

    it('returns false for ftp scheme', () => {
      expect(isValidBaseUrl('ftp://example.com')).toBe(false);
    });

    it('returns false for URL without host', () => {
      expect(isValidBaseUrl('https://')).toBe(false);
    });

    it('returns false for URL exceeding 2048 characters', () => {
      const longUrl = 'https://' + 'a'.repeat(2041) + '.com';
      expect(isValidBaseUrl(longUrl)).toBe(false);
    });

    it('returns true for URL at exactly 2048 characters', () => {
      // "https://a...a.com" needs to be exactly 2048 chars
      // "https://" = 8 chars, ".com" = 4 chars, so host part = 2048 - 8 - 4 = 2036
      const url = 'https://' + 'a'.repeat(2036) + '.com';
      expect(url.length).toBe(2048);
      expect(isValidBaseUrl(url)).toBe(true);
    });
  });

  describe('buildEndpointUrl', () => {
    it('joins base URL and path with single slash', () => {
      expect(buildEndpointUrl('https://example.com', '/api/sync/login')).toBe(
        'https://example.com/api/sync/login'
      );
    });

    it('normalizes trailing slash on base URL', () => {
      expect(buildEndpointUrl('https://example.com/', '/api/sync/login')).toBe(
        'https://example.com/api/sync/login'
      );
    });

    it('adds leading slash to path if missing', () => {
      expect(buildEndpointUrl('https://example.com', 'api/sync/login')).toBe(
        'https://example.com/api/sync/login'
      );
    });

    it('handles base URL with trailing slash and path without leading slash', () => {
      expect(buildEndpointUrl('https://example.com/', 'api/sync/login')).toBe(
        'https://example.com/api/sync/login'
      );
    });

    it('handles base URL with port', () => {
      expect(buildEndpointUrl('https://example.com:3000', '/api/sync')).toBe(
        'https://example.com:3000/api/sync'
      );
    });

    it('handles base URL with existing path', () => {
      expect(buildEndpointUrl('https://example.com/v1', '/api/sync')).toBe(
        'https://example.com/v1/api/sync'
      );
    });
  });

  describe('getCloudSyncConfig', () => {
    it('returns config with stored URL when valid', async () => {
      mockGetItem.mockResolvedValue('https://my-server.com');

      const config = await getCloudSyncConfig();

      expect(config.baseUrl).toBe('https://my-server.com');
    });

    it('returns default base URL when no URL is stored', async () => {
      mockGetItem.mockResolvedValue(null);

      const config = await getCloudSyncConfig();
      expect(config.baseUrl).toBe('https://gg-economy.lovable.app');
    });

    it('throws NOT_CONFIGURED when stored URL is empty', async () => {
      mockGetItem.mockResolvedValue('');

      await expect(getCloudSyncConfig()).rejects.toThrow(CloudSyncError);
      await expect(getCloudSyncConfig()).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });
    });

    it('throws NOT_CONFIGURED when stored URL is invalid', async () => {
      mockGetItem.mockResolvedValue('not-a-url');

      await expect(getCloudSyncConfig()).rejects.toThrow(CloudSyncError);
      await expect(getCloudSyncConfig()).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });
    });

    it('reads from the correct storage key', async () => {
      mockGetItem.mockResolvedValue('https://example.com');

      await getCloudSyncConfig();

      expect(mockGetItem).toHaveBeenCalledWith('@gg-economy/cloud-sync-base-url');
    });
  });

  describe('setCloudSyncBaseUrl', () => {
    it('persists a valid URL to AsyncStorage', async () => {
      mockSetItem.mockResolvedValue(undefined);

      await setCloudSyncBaseUrl('https://my-server.com');

      expect(mockSetItem).toHaveBeenCalledWith(
        '@gg-economy/cloud-sync-base-url',
        'https://my-server.com'
      );
    });

    it('throws NOT_CONFIGURED for empty URL', async () => {
      await expect(setCloudSyncBaseUrl('')).rejects.toThrow(CloudSyncError);
      await expect(setCloudSyncBaseUrl('')).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });
    });

    it('throws NOT_CONFIGURED for invalid URL', async () => {
      await expect(setCloudSyncBaseUrl('ftp://invalid')).rejects.toThrow(CloudSyncError);
      await expect(setCloudSyncBaseUrl('ftp://invalid')).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });
    });

    it('throws NOT_CONFIGURED for URL exceeding max length', async () => {
      const longUrl = 'https://' + 'a'.repeat(2041) + '.com';

      await expect(setCloudSyncBaseUrl(longUrl)).rejects.toThrow(CloudSyncError);
      await expect(setCloudSyncBaseUrl(longUrl)).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });
    });

    it('does not call AsyncStorage when URL is invalid', async () => {
      try {
        await setCloudSyncBaseUrl('invalid');
      } catch {
        // expected
      }

      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Property 6: URL path construction normalization
// ============================================================================

/**
 * **Validates: Requirements 7.4**
 */
describe('Feature: cloud-sync-import, Property 6: URL path construction normalization', () => {
  // Generator for valid base URLs with/without trailing slashes
  const arbScheme = fc.constantFrom('http://', 'https://');
  const arbHost = fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
      fc.constantFrom('.com', '.io', '.org', '.dev', '.net')
    )
    .map(([name, tld]) => `${name}${tld}`);
  const arbPort = fc.option(
    fc.integer({ min: 1000, max: 9999 }).map((p) => `:${p}`),
    {
      nil: '',
    }
  );
  const arbBasePath = fc.option(
    fc
      .array(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), { minLength: 1, maxLength: 3 })
      .map((segments) => '/' + segments.join('/')),
    { nil: '' }
  );
  const arbTrailingSlash = fc.constantFrom('', '/');

  const arbBaseUrl = fc
    .tuple(arbScheme, arbHost, arbPort, arbBasePath, arbTrailingSlash)
    .map(
      ([scheme, host, port, basePath, trailing]) => `${scheme}${host}${port}${basePath}${trailing}`
    );

  // Generator for API paths (with/without leading slash)
  const arbApiPath = fc
    .tuple(
      fc.constantFrom('', '/'),
      fc
        .array(fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/), { minLength: 1, maxLength: 4 })
        .map((segments) => segments.join('/'))
    )
    .map(([leadingSlash, pathBody]) => `${leadingSlash}${pathBody}`);

  it('constructed URL never contains double slashes except in protocol', () => {
    fc.assert(
      fc.property(arbBaseUrl, arbApiPath, (baseUrl, path) => {
        const result = buildEndpointUrl(baseUrl, path);

        // Remove the protocol part (http:// or https://) before checking
        const protocolEnd = result.indexOf('://') + 3;
        const afterProtocol = result.substring(protocolEnd);

        expect(afterProtocol).not.toContain('//');
      }),
      { numRuns: 100 }
    );
  });

  it('base URL and path are joined with exactly one slash separator', () => {
    fc.assert(
      fc.property(arbBaseUrl, arbApiPath, (baseUrl, path) => {
        const result = buildEndpointUrl(baseUrl, path);

        // The result should start with the base URL (without trailing slash)
        // and the path should be connected with exactly one slash
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const expected = `${normalizedBase}${normalizedPath}`;

        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});
