/**
 * Property-Based Tests: CustomServerSettingsStore
 *
 * Property 4: URL Validation
 *
 * **Validates: Requirements 2.4, 2.5**
 *
 * For any string input, the URL validator SHALL accept it if and only if it starts
 * with `http://` or `https://`, contains a host component after the scheme, and has
 * a total length not exceeding 2048 characters. Invalid URLs SHALL produce a rejection
 * with an error indication.
 */
import * as fc from 'fast-check';
import { CustomServerSettingsStore } from '../../../../src/services/backup/CustomServerSettingsStore';

// Mock expo-secure-store (required by CustomServerSettingsStore import)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Mock expo-crypto (required by CustomServerSettingsStore import)
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(16)),
}));

describe('Property 4: URL Validation', () => {
  const store = new CustomServerSettingsStore();

  /**
   * Helper: determines if a URL should be valid according to the spec rules.
   * A URL is valid iff:
   * 1. Starts with http:// or https:// (case-insensitive)
   * 2. Contains a non-empty, non-whitespace host after the scheme
   * 3. Total length <= 2048 characters
   */
  function shouldBeValid(url: string): boolean {
    if (!url || url.length === 0) return false;
    if (url.length > 2048) return false;

    const lower = url.toLowerCase();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;

    const schemeEnd = url.indexOf('://') + 3;
    const afterScheme = url.substring(schemeEnd);

    const hostEnd = afterScheme.search(/[/:?#]/);
    const host = hostEnd === -1 ? afterScheme : afterScheme.substring(0, hostEnd);

    if (!host || host.trim().length === 0) return false;

    return true;
  }

  /**
   * Arbitrary: generates valid HTTP/HTTPS URLs with a host
   */
  const validUrlArb = fc
    .tuple(
      fc.constantFrom('http://', 'https://'),
      fc.stringMatching(/^[a-z0-9][a-z0-9.-]{0,62}[a-z0-9]$/).filter(
        (s) => s.length >= 1 && s.trim().length > 0
      ),
      fc.option(
        fc.tuple(
          fc.integer({ min: 1, max: 65535 }),
          fc.stringMatching(/^(\/[a-z0-9._-]*){0,5}$/)
        ),
        { nil: undefined }
      )
    )
    .map(([scheme, host, portAndPath]) => {
      let url = `${scheme}${host}`;
      if (portAndPath) {
        const [port, path] = portAndPath;
        url += `:${port}${path}`;
      }
      return url;
    })
    .filter((url) => url.length <= 2048);

  /**
   * Arbitrary: generates strings that do NOT start with http:// or https://
   */
  const noSchemeArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => {
      const lower = s.toLowerCase();
      return !lower.startsWith('http://') && !lower.startsWith('https://');
    });

  /**
   * Arbitrary: generates URLs with ftp:// scheme (invalid)
   */
  const ftpUrlArb = fc
    .stringMatching(/^[a-z0-9][a-z0-9.-]{0,30}[a-z0-9]$/)
    .filter((s) => s.length >= 1)
    .map((host) => `ftp://${host}`);

  /**
   * Arbitrary: generates URLs exceeding 2048 characters
   */
  const tooLongUrlArb = fc
    .string({ minLength: 2040, maxLength: 3000 })
    .map((suffix) => `https://example.com/${suffix}`)
    .filter((url) => url.length > 2048);

  /**
   * Arbitrary: generates URLs with no host (just scheme or empty host)
   */
  const noHostArb = fc.constantFrom(
    'http://',
    'https://',
    'http:// ',
    'https:// ',
    'http:///',
    'https:///',
    'http://:8080',
    'https://:443'
  );

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * Valid URLs with http/https scheme and a host within length limit are accepted.
   */
  it('should accept all valid URLs (http/https with host, <=2048 chars)', () => {
    fc.assert(
      fc.property(validUrlArb, (url) => {
        const result = store.validateServerUrl(url);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * Strings without http:// or https:// scheme are rejected.
   */
  it('should reject strings without http:// or https:// scheme', () => {
    fc.assert(
      fc.property(noSchemeArb, (url) => {
        const result = store.validateServerUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * URLs with ftp:// scheme are rejected.
   */
  it('should reject URLs with ftp:// scheme', () => {
    fc.assert(
      fc.property(ftpUrlArb, (url) => {
        const result = store.validateServerUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * URLs exceeding 2048 characters are rejected.
   */
  it('should reject URLs exceeding 2048 characters', () => {
    fc.assert(
      fc.property(tooLongUrlArb, (url) => {
        const result = store.validateServerUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * URLs with no host after scheme are rejected.
   */
  it('should reject URLs with no host after scheme', () => {
    fc.assert(
      fc.property(noHostArb, (url) => {
        const result = store.validateServerUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * Biconditional property: for any arbitrary string, the validator accepts it
   * if and only if it has a valid scheme (http/https), a non-empty host, and
   * length <= 2048.
   */
  it('should satisfy the biconditional: accepted iff valid scheme + host + length <=2048', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validUrlArb,
          noSchemeArb,
          ftpUrlArb,
          tooLongUrlArb,
          noHostArb,
          fc.string({ minLength: 0, maxLength: 2100 })
        ),
        (url) => {
          const result = store.validateServerUrl(url);
          const expectedValid = shouldBeValid(url);

          expect(result.valid).toBe(expectedValid);

          if (!expectedValid) {
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
