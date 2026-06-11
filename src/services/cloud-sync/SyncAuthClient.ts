/**
 * SyncAuthClient - Authentication client for the Cloud Sync Import feature.
 *
 * Handles email/password authentication with the remote sync API.
 * Uses fetch with AbortController for timeout management.
 *
 * @module services/cloud-sync/SyncAuthClient
 */

import { CloudSyncError } from './CloudSyncError';
import { buildEndpointUrl } from './config';
import type { LoginCredentials, LoginResult } from './types';

/** Timeout for authentication requests in milliseconds (30 seconds). */
const AUTH_TIMEOUT_MS = 30_000;

/** API path for the login endpoint. */
const LOGIN_PATH = '/api/public/sync/login';

/**
 * Authenticates with the sync server using email and password credentials.
 *
 * Validates credentials locally before sending the request.
 * Applies a 30-second timeout via AbortController.
 *
 * @param credentials - Email and password for authentication
 * @param baseUrl - The validated base URL of the sync server
 * @returns LoginResult containing the access token
 * @throws CloudSyncError with AUTH_FAILED on invalid credentials (HTTP 401)
 * @throws CloudSyncError with SERVER_ERROR on HTTP 400, 500, or missing token
 * @throws CloudSyncError with NETWORK_ERROR on network failure or timeout
 */
export async function login(credentials: LoginCredentials, baseUrl: string): Promise<LoginResult> {
  // Validate credentials locally before making network request
  if (!credentials.email || credentials.email.trim().length === 0) {
    throw new CloudSyncError('Email and password are required', 'AUTH_FAILED');
  }

  if (!credentials.password || credentials.password.trim().length === 0) {
    throw new CloudSyncError('Email and password are required', 'AUTH_FAILED');
  }

  const url = buildEndpointUrl(baseUrl, LOGIN_PATH);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      throw new CloudSyncError('Invalid email or password', 'AUTH_FAILED', 401);
    }

    if (response.status === 400) {
      throw new CloudSyncError('Invalid request format', 'SERVER_ERROR', 400);
    }

    if (response.status === 500) {
      throw new CloudSyncError('Server is not configured or unavailable', 'SERVER_ERROR', 500);
    }

    if (response.status === 200) {
      const body = await response.json();

      if (!body.access_token || typeof body.access_token !== 'string') {
        throw new CloudSyncError('Unexpected server response', 'SERVER_ERROR', 200);
      }

      return { accessToken: body.access_token };
    }

    // Any other unexpected status code
    throw new CloudSyncError(
      `Unexpected server response (status: ${response.status})`,
      'SERVER_ERROR',
      response.status
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Re-throw CloudSyncError instances as-is
    if (error instanceof CloudSyncError) {
      throw error;
    }

    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudSyncError(
        'Connection failed. Check your internet and try again',
        'NETWORK_ERROR'
      );
    }

    // Handle network errors (TypeError from fetch on network failure)
    throw new CloudSyncError(
      'Connection failed. Check your internet and try again',
      'NETWORK_ERROR'
    );
  }
}
