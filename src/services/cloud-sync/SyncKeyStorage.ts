/**
 * SyncKeyStorage - Manages sync key persistence using expo-secure-store.
 *
 * Stores and retrieves the sync key used for X-Sync-Key authentication
 * with the GG-Economy Web platform.
 *
 * @module services/cloud-sync/SyncKeyStorage
 */

import * as SecureStore from 'expo-secure-store';

import { CloudSyncError } from './CloudSyncError';
import { buildEndpointUrl } from './config';

/** Storage key for the sync key in SecureStore. */
const SYNC_KEY_STORAGE_KEY = 'gg-economy-sync-key';

/** Expected prefix for valid sync keys. */
const SYNC_KEY_PREFIX = 'gge_';

/** Timeout for validation request in milliseconds (15 seconds). */
const VALIDATION_TIMEOUT_MS = 15_000;

/** API path for the import endpoint (used for validation). */
const IMPORT_PATH = '/api/public/sync/import';

/**
 * Retrieves the stored sync key from secure storage.
 * Returns null if no key is stored.
 */
export async function getSyncKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SYNC_KEY_STORAGE_KEY);
}

/**
 * Stores a sync key in secure storage.
 * Validates the key format before storing.
 *
 * @throws CloudSyncError with AUTH_FAILED if key format is invalid
 */
export async function setSyncKey(key: string): Promise<void> {
  const trimmed = key.trim();

  if (!isValidSyncKeyFormat(trimmed)) {
    throw new CloudSyncError(
      'Formato de chave inválido. A chave deve começar com "gge_"',
      'AUTH_FAILED'
    );
  }

  await SecureStore.setItemAsync(SYNC_KEY_STORAGE_KEY, trimmed);
}

/**
 * Removes the stored sync key from secure storage.
 */
export async function removeSyncKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SYNC_KEY_STORAGE_KEY);
}

/**
 * Validates the sync key format (must start with "gge_" and have content after prefix).
 */
export function isValidSyncKeyFormat(key: string): boolean {
  return key.startsWith(SYNC_KEY_PREFIX) && key.length > SYNC_KEY_PREFIX.length;
}

/**
 * Validates a sync key against the server by sending a test request
 * with an empty tables payload.
 *
 * @param syncKey - The sync key to validate
 * @param baseUrl - The base URL of the sync server
 * @returns true if the key is valid (server returns 200)
 * @throws CloudSyncError with AUTH_FAILED if key is invalid or revoked (401)
 * @throws CloudSyncError with NETWORK_ERROR on network failure
 */
export async function validateSyncKey(syncKey: string, baseUrl: string): Promise<boolean> {
  const url = buildEndpointUrl(baseUrl, IMPORT_PATH);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey,
      },
      body: JSON.stringify({ tables: {} }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401 = key is invalid or revoked
    if (response.status === 401) {
      throw new CloudSyncError(
        'Chave inválida ou revogada — gere uma nova no web',
        'AUTH_FAILED',
        401
      );
    }

    // Any other response (200, 400, etc.) means the key itself is valid
    // (400 may happen with empty tables payload, but auth passed)
    return true;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof CloudSyncError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudSyncError(
        'Conexão falhou. Verifique sua internet e tente novamente',
        'NETWORK_ERROR'
      );
    }

    throw new CloudSyncError(
      'Conexão falhou. Verifique sua internet e tente novamente',
      'NETWORK_ERROR'
    );
  }
}
