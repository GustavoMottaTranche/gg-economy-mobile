/**
 * Unit tests for OAuthService
 *
 * Tests Google OAuth sign-in, sign-out, token management, and error handling.
 * Uses mocked expo-auth-session and expo-secure-store.
 */

import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { OAuthService, OAuthError } from '../../../../src/services/backup/OAuthService';

// Mock fetch for user info API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OAuthService', () => {
  let oAuthService: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables for testing BEFORE creating the service
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '';

    oAuthService = new OAuthService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  });

  describe('signIn', () => {
    it('should successfully sign in and return user info', async () => {
      // Mock successful auth flow
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          params: { code: 'test-auth-code' },
        }),
        codeVerifier: 'test-code-verifier',
      };

      (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

      (AuthSession.exchangeCodeAsync as jest.Mock).mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      });

      // Mock user info fetch
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            email: 'test@example.com',
            name: 'Test User',
          }),
      });

      const user = await oAuthService.signIn();

      expect(user).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Verify tokens were stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_access_token',
        'test-access-token'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_refresh_token',
        'test-refresh-token'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_user_email',
        'test@example.com'
      );
    });

    it('should throw SIGN_IN_CANCELLED when user cancels', async () => {
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'cancel',
        }),
        codeVerifier: 'test-code-verifier',
      };

      (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

      await expect(oAuthService.signIn()).rejects.toThrow(OAuthError);
      await expect(oAuthService.signIn()).rejects.toMatchObject({
        code: 'SIGN_IN_CANCELLED',
      });
    });

    it('should throw SIGN_IN_CANCELLED when user dismisses', async () => {
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'dismiss',
        }),
        codeVerifier: 'test-code-verifier',
      };

      (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

      await expect(oAuthService.signIn()).rejects.toMatchObject({
        code: 'SIGN_IN_CANCELLED',
      });
    });

    it('should throw SIGN_IN_FAILED when auth fails', async () => {
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'error',
          params: { error_description: 'Access denied' },
        }),
        codeVerifier: 'test-code-verifier',
      };

      (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

      await expect(oAuthService.signIn()).rejects.toMatchObject({
        code: 'SIGN_IN_FAILED',
      });
    });

    it('should throw INVALID_CONFIGURATION when client ID is not set', async () => {
      // Clear all client IDs
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = '';
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = '';
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '';

      // Create a new instance to pick up the empty env vars
      const service = new OAuthService();

      await expect(service.signIn()).rejects.toMatchObject({
        code: 'INVALID_CONFIGURATION',
      });
    });

    it('should handle user info without name', async () => {
      const mockAuthRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          params: { code: 'test-auth-code' },
        }),
        codeVerifier: 'test-code-verifier',
      };

      (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

      (AuthSession.exchangeCodeAsync as jest.Mock).mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            email: 'test@example.com',
            // No name field
          }),
      });

      const user = await oAuthService.signIn();

      expect(user).toEqual({
        email: 'test@example.com',
        name: null,
      });
    });
  });

  describe('signOut', () => {
    it('should revoke token and clear storage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-access-token');
      (AuthSession.revokeAsync as jest.Mock).mockResolvedValue(undefined);

      await oAuthService.signOut();

      // Verify token was revoked
      expect(AuthSession.revokeAsync).toHaveBeenCalledWith(
        { token: 'test-access-token' },
        expect.any(Object)
      );

      // Verify all storage was cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gg_economy_access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gg_economy_refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gg_economy_token_expiry');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gg_economy_user_email');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gg_economy_user_name');
    });

    it('should clear storage even if revocation fails', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-access-token');
      (AuthSession.revokeAsync as jest.Mock).mockRejectedValue(new Error('Network error'));

      await oAuthService.signOut();

      // Storage should still be cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
    });

    it('should handle sign out when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await oAuthService.signOut();

      // Should not try to revoke
      expect(AuthSession.revokeAsync).not.toHaveBeenCalled();

      // Storage should still be cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
    });
  });

  describe('getAccessToken', () => {
    it('should return valid token when not expired', async () => {
      const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_access_token') return 'test-access-token';
        if (key === 'gg_economy_token_expiry') return futureExpiry;
        return null;
      });

      const token = await oAuthService.getAccessToken();

      expect(token).toBe('test-access-token');
    });

    it('should return null when not signed in', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await oAuthService.getAccessToken();

      expect(token).toBeNull();
    });

    it('should refresh token when about to expire', async () => {
      // Token expires in 2 minutes (less than 5 minute buffer)
      const nearExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_access_token') return 'old-access-token';
        if (key === 'gg_economy_token_expiry') return nearExpiry;
        if (key === 'gg_economy_refresh_token') return 'test-refresh-token';
        return null;
      });

      (AuthSession.refreshAsync as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      const token = await oAuthService.getAccessToken();

      expect(token).toBe('new-access-token');
      expect(AuthSession.refreshAsync).toHaveBeenCalled();
    });

    it('should refresh token when expired', async () => {
      // Token expired 1 hour ago
      const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();

      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_access_token') return 'old-access-token';
        if (key === 'gg_economy_token_expiry') return pastExpiry;
        if (key === 'gg_economy_refresh_token') return 'test-refresh-token';
        return null;
      });

      (AuthSession.refreshAsync as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      const token = await oAuthService.getAccessToken();

      expect(token).toBe('new-access-token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh and store new tokens', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_refresh_token') return 'test-refresh-token';
        return null;
      });

      (AuthSession.refreshAsync as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      const token = await oAuthService.refreshToken();

      expect(token).toBe('new-access-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_access_token',
        'new-access-token'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_refresh_token',
        'new-refresh-token'
      );
    });

    it('should throw TOKEN_REFRESH_FAILED when no refresh token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(oAuthService.refreshToken()).rejects.toMatchObject({
        code: 'TOKEN_REFRESH_FAILED',
      });
    });

    it('should throw TOKEN_REFRESH_FAILED when refresh fails', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_refresh_token') return 'test-refresh-token';
        return null;
      });

      (AuthSession.refreshAsync as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

      await expect(oAuthService.refreshToken()).rejects.toMatchObject({
        code: 'TOKEN_REFRESH_FAILED',
      });
    });

    it('should keep old refresh token if new one not provided', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_refresh_token') return 'old-refresh-token';
        return null;
      });

      (AuthSession.refreshAsync as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        // No new refresh token
        expiresIn: 3600,
      });

      await oAuthService.refreshToken();

      // Should store the old refresh token
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'gg_economy_refresh_token',
        'old-refresh-token'
      );
    });
  });

  describe('isSignedIn', () => {
    it('should return true when access token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_access_token') return 'test-access-token';
        return null;
      });

      const isSignedIn = await oAuthService.isSignedIn();

      expect(isSignedIn).toBe(true);
    });

    it('should return true when only refresh token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_refresh_token') return 'test-refresh-token';
        return null;
      });

      const isSignedIn = await oAuthService.isSignedIn();

      expect(isSignedIn).toBe(true);
    });

    it('should return false when no tokens exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const isSignedIn = await oAuthService.isSignedIn();

      expect(isSignedIn).toBe(false);
    });

    it('should return false on storage error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const isSignedIn = await oAuthService.isSignedIn();

      expect(isSignedIn).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when signed in', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_user_email') return 'test@example.com';
        if (key === 'gg_economy_user_name') return 'Test User';
        return null;
      });

      const user = await oAuthService.getCurrentUser();

      expect(user).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return user with null name when name not stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gg_economy_user_email') return 'test@example.com';
        return null;
      });

      const user = await oAuthService.getCurrentUser();

      expect(user).toEqual({
        email: 'test@example.com',
        name: null,
      });
    });

    it('should return null when not signed in', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const user = await oAuthService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null on storage error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const user = await oAuthService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('OAuthError', () => {
    it('should create error with correct properties', () => {
      const error = new OAuthError(
        'Test error message',
        'SIGN_IN_FAILED',
        new Error('Original error')
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('SIGN_IN_FAILED');
      expect(error.name).toBe('OAuthError');
      expect(error.originalError).toBeInstanceOf(Error);
    });

    it('should work without original error', () => {
      const error = new OAuthError('Test error', 'NETWORK_ERROR');

      expect(error.originalError).toBeUndefined();
    });
  });
});

describe('OAuthService - User Info Fetch', () => {
  let oAuthService: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables for testing
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '';

    oAuthService = new OAuthService();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  });

  it('should throw NETWORK_ERROR when user info fetch fails', async () => {
    const mockAuthRequest = {
      promptAsync: jest.fn().mockResolvedValue({
        type: 'success',
        params: { code: 'test-auth-code' },
      }),
      codeVerifier: 'test-code-verifier',
    };

    (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

    (AuthSession.exchangeCodeAsync as jest.Mock).mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    });

    // Mock failed user info fetch
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(oAuthService.signIn()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('should throw NETWORK_ERROR when user info has no email', async () => {
    const mockAuthRequest = {
      promptAsync: jest.fn().mockResolvedValue({
        type: 'success',
        params: { code: 'test-auth-code' },
      }),
      codeVerifier: 'test-code-verifier',
    };

    (AuthSession.AuthRequest as jest.Mock).mockImplementation(() => mockAuthRequest);

    (AuthSession.exchangeCodeAsync as jest.Mock).mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    });

    // Mock user info without email
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          name: 'Test User',
          // No email
        }),
    });

    await expect(oAuthService.signIn()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
