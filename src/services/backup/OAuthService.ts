/**
 * OAuthService - Google OAuth Manager for Google Drive backup
 *
 * Uses expo-auth-session for OAuth flow and expo-secure-store for token storage.
 * Implements sign-in, sign-out, token refresh, and token management.
 *
 * @module services/backup/OAuthService
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

// Complete any pending auth sessions when the app loads
WebBrowser.maybeCompleteAuthSession();

// Google Drive API scope - only file access for backup
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Secure storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gg_economy_access_token',
  REFRESH_TOKEN: 'gg_economy_refresh_token',
  TOKEN_EXPIRY: 'gg_economy_token_expiry',
  USER_EMAIL: 'gg_economy_user_email',
  USER_NAME: 'gg_economy_user_name',
} as const;

// Token refresh buffer (5 minutes before expiry)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Get Google OAuth client IDs from environment
 */
function getGoogleClientIds(): {
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
} {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  };
}

/**
 * Google user information
 */
export interface GoogleUser {
  email: string;
  name: string | null;
}

/**
 * OAuth tokens
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

/**
 * OAuth error types
 */
export type OAuthErrorCode =
  | 'SIGN_IN_CANCELLED'
  | 'SIGN_IN_FAILED'
  | 'TOKEN_REFRESH_FAILED'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_CONFIGURATION';

/**
 * OAuth error class
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly code: OAuthErrorCode,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * OAuth Service for Google Drive authentication
 */
export class OAuthService {
  private discovery: AuthSession.DiscoveryDocument;

  constructor() {
    // Google OAuth discovery document
    this.discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };
  }

  /**
   * Get the appropriate client ID based on platform
   *
   * IMPORTANT: expo-auth-session on Android requires the WEB client ID
   * for the authorization request and token exchange (PKCE flow).
   * The Android client ID is only used by Google to validate the app's
   * package name and SHA-1 fingerprint, but the actual OAuth flow
   * must use the Web client ID.
   */
  private getClientId(): string {
    const clientIds = getGoogleClientIds();
    // Always use the web client ID for expo-auth-session OAuth flow
    return clientIds.webClientId;
  }

  /**
   * Create the redirect URI for OAuth
   */
  private getRedirectUri(): string {
    return AuthSession.makeRedirectUri({
      scheme: 'gg-economy',
      path: 'oauth',
    });
  }

  /**
   * Sign in with Google OAuth
   * Opens the Google sign-in flow and stores tokens on success
   */
  async signIn(): Promise<GoogleUser> {
    const clientId = this.getClientId();

    if (!clientId) {
      throw new OAuthError(
        'Google OAuth client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment.',
        'INVALID_CONFIGURATION'
      );
    }

    const redirectUri = this.getRedirectUri();

    // Create the auth request
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    });

    try {
      // Prompt the user to sign in
      const result = await request.promptAsync(this.discovery);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new OAuthError('Sign-in was cancelled by user', 'SIGN_IN_CANCELLED');
      }

      if (result.type !== 'success') {
        const errorDescription =
          'params' in result
            ? (result.params as Record<string, string>)?.error_description
            : undefined;
        throw new OAuthError(errorDescription ?? 'Sign-in failed', 'SIGN_IN_FAILED');
      }

      if (!result.params.code) {
        throw new OAuthError('No authorization code received', 'SIGN_IN_FAILED');
      }

      // Exchange the authorization code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier ?? '',
          },
        },
        this.discovery
      );

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokenResponse.expiresIn ?? 3600) * 1000);

      // Store tokens securely
      await this.storeTokens({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken ?? null,
        expiresAt,
      });

      // Fetch and store user info
      const user = await this.fetchUserInfo(tokenResponse.accessToken);
      await this.storeUserInfo(user);

      return user;
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError('Failed to complete sign-in', 'SIGN_IN_FAILED', error);
    }
  }

  /**
   * Sign out and clear all stored tokens
   */
  async signOut(): Promise<void> {
    try {
      // Get the current access token to revoke it
      const accessToken = await this.getStoredAccessToken();

      if (accessToken) {
        // Revoke the token with Google
        try {
          await AuthSession.revokeAsync({ token: accessToken }, this.discovery);
        } catch {
          // Ignore revocation errors - we'll clear local tokens anyway
        }
      }

      // Clear all stored tokens and user info
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRY),
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER_EMAIL),
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER_NAME),
      ]);
    } catch (error) {
      throw new OAuthError('Failed to sign out', 'STORAGE_ERROR', error);
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   * Returns null if not signed in
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const accessToken = await this.getStoredAccessToken();
      const expiryStr = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);

      if (!accessToken) {
        return null;
      }

      // Check if token is expired or about to expire
      if (expiryStr) {
        const expiry = new Date(expiryStr);
        const now = new Date();

        if (expiry.getTime() - now.getTime() < TOKEN_REFRESH_BUFFER_MS) {
          // Token is expired or about to expire, try to refresh
          const refreshedToken = await this.refreshToken();
          return refreshedToken;
        }
      }

      return accessToken;
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError('Failed to get access token', 'STORAGE_ERROR', error);
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      throw new OAuthError(
        'No refresh token available. Please sign in again.',
        'TOKEN_REFRESH_FAILED'
      );
    }

    const clientId = this.getClientId();

    try {
      const tokenResponse = await AuthSession.refreshAsync(
        {
          clientId,
          refreshToken,
        },
        this.discovery
      );

      // Calculate new expiry
      const expiresAt = new Date(Date.now() + (tokenResponse.expiresIn ?? 3600) * 1000);

      // Store the new tokens
      await this.storeTokens({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken ?? refreshToken,
        expiresAt,
      });

      return tokenResponse.accessToken;
    } catch (error) {
      throw new OAuthError(
        'Failed to refresh access token. Please sign in again.',
        'TOKEN_REFRESH_FAILED',
        error
      );
    }
  }

  /**
   * Check if the user is currently signed in
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const accessToken = await this.getStoredAccessToken();
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      // User is signed in if we have either a valid access token or a refresh token
      return !!(accessToken || refreshToken);
    } catch {
      return false;
    }
  }

  /**
   * Get the currently signed-in user, or null if not signed in
   */
  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const email = await SecureStore.getItemAsync(STORAGE_KEYS.USER_EMAIL);

      if (!email) {
        return null;
      }

      const name = await SecureStore.getItemAsync(STORAGE_KEYS.USER_NAME);

      return {
        email,
        name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch user info from Google API
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUser> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        email?: string;
        name?: string;
      };

      if (!data.email) {
        throw new Error('No email in response');
      }

      return {
        email: data.email,
        name: data.name ?? null,
      };
    } catch (error) {
      throw new OAuthError('Failed to fetch user information', 'NETWORK_ERROR', error);
    }
  }

  /**
   * Store tokens securely
   */
  private async storeTokens(tokens: OAuthTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);

      if (tokens.refreshToken) {
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRY, tokens.expiresAt.toISOString());
    } catch (error) {
      throw new OAuthError('Failed to store tokens securely', 'STORAGE_ERROR', error);
    }
  }

  /**
   * Store user info securely
   */
  private async storeUserInfo(user: GoogleUser): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_EMAIL, user.email);

      if (user.name) {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_NAME, user.name);
      }
    } catch (error) {
      throw new OAuthError('Failed to store user information', 'STORAGE_ERROR', error);
    }
  }

  /**
   * Get stored access token
   */
  private async getStoredAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  }
}

// Export singleton instance
export const oAuthService = new OAuthService();
