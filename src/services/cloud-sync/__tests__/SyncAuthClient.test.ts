import { CloudSyncError } from '../CloudSyncError';
import { login } from '../SyncAuthClient';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE_URL = 'https://api.example.com';

function mockResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    redirected: false,
    statusText: '',
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    text: jest.fn(),
    bytes: jest.fn(),
  } as unknown as Response;
}

describe('SyncAuthClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('login', () => {
    it('should return accessToken on successful login (HTTP 200)', async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { access_token: 'jwt-token-123' }));

      const result = await login({ email: 'user@test.com', password: 'pass123' }, BASE_URL);

      expect(result).toEqual({ accessToken: 'jwt-token-123' });
    });

    it('should send POST to correct URL with JSON body', async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { access_token: 'token' }));

      await login({ email: 'user@test.com', password: 'secret' }, BASE_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/public/sync/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@test.com', password: 'secret' }),
        })
      );
    });

    it('should include AbortController signal in fetch request', async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { access_token: 'token' }));

      await login({ email: 'user@test.com', password: 'pass' }, BASE_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should normalize base URL trailing slash', async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { access_token: 'token' }));

      await login({ email: 'a@b.com', password: 'p' }, 'https://api.example.com/');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/public/sync/login',
        expect.any(Object)
      );
    });

    describe('validation errors', () => {
      it('should throw AUTH_FAILED when email is empty', async () => {
        await expect(login({ email: '', password: 'pass' }, BASE_URL)).rejects.toThrow(
          CloudSyncError
        );
        await expect(login({ email: '', password: 'pass' }, BASE_URL)).rejects.toMatchObject({
          code: 'AUTH_FAILED',
          message: 'Email and password are required',
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should throw AUTH_FAILED when email is whitespace only', async () => {
        await expect(login({ email: '   ', password: 'pass' }, BASE_URL)).rejects.toMatchObject({
          code: 'AUTH_FAILED',
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should throw AUTH_FAILED when password is empty', async () => {
        await expect(login({ email: 'a@b.com', password: '' }, BASE_URL)).rejects.toThrow(
          CloudSyncError
        );
        await expect(login({ email: 'a@b.com', password: '' }, BASE_URL)).rejects.toMatchObject({
          code: 'AUTH_FAILED',
          message: 'Email and password are required',
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should throw AUTH_FAILED when password is whitespace only', async () => {
        await expect(login({ email: 'a@b.com', password: '   ' }, BASE_URL)).rejects.toMatchObject({
          code: 'AUTH_FAILED',
        });
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('HTTP error responses', () => {
      it('should throw AUTH_FAILED on HTTP 401', async () => {
        mockFetch.mockResolvedValue(mockResponse(401, { error: 'unauthorized' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'AUTH_FAILED',
          httpStatus: 401,
          message: 'Invalid email or password',
        });
      });

      it('should throw SERVER_ERROR on HTTP 400', async () => {
        mockFetch.mockResolvedValue(mockResponse(400, { error: 'bad request' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 400,
          message: 'Invalid request format',
        });
      });

      it('should throw SERVER_ERROR on HTTP 500', async () => {
        mockFetch.mockResolvedValue(mockResponse(500, { error: 'internal error' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 500,
          message: 'Server is not configured or unavailable',
        });
      });

      it('should throw SERVER_ERROR on unexpected HTTP status', async () => {
        mockFetch.mockResolvedValue(mockResponse(403, { error: 'forbidden' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 403,
        });
      });
    });

    describe('missing access_token in 200 response', () => {
      it('should throw SERVER_ERROR when access_token is missing', async () => {
        mockFetch.mockResolvedValue(mockResponse(200, { token: 'wrong-field' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 200,
          message: 'Unexpected server response',
        });
      });

      it('should throw SERVER_ERROR when access_token is null', async () => {
        mockFetch.mockResolvedValue(mockResponse(200, { access_token: null }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 200,
        });
      });

      it('should throw SERVER_ERROR when access_token is empty string', async () => {
        mockFetch.mockResolvedValue(mockResponse(200, { access_token: '' }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 200,
        });
      });

      it('should throw SERVER_ERROR when access_token is a number', async () => {
        mockFetch.mockResolvedValue(mockResponse(200, { access_token: 12345 }));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'SERVER_ERROR',
          httpStatus: 200,
        });
      });
    });

    describe('network errors', () => {
      it('should throw NETWORK_ERROR on fetch TypeError (network failure)', async () => {
        mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'NETWORK_ERROR',
          message: 'Connection failed. Check your internet and try again',
        });
      });

      it('should throw NETWORK_ERROR on AbortError (timeout)', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValue(abortError);

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'NETWORK_ERROR',
          message: 'Connection failed. Check your internet and try again',
        });
      });

      it('should throw NETWORK_ERROR on generic network error', async () => {
        mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

        await expect(login({ email: 'a@b.com', password: 'p' }, BASE_URL)).rejects.toMatchObject({
          code: 'NETWORK_ERROR',
        });
      });
    });
  });
});
