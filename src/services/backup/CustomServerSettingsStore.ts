/**
 * CustomServerSettingsStore - Manages persistence of custom backup server configuration
 *
 * Stores server URL in AsyncStorage (non-sensitive) and API key + device ID
 * in expo-secure-store (sensitive). Provides validation for inputs and
 * device ID generation using expo-crypto.
 *
 * Device ID Strategy:
 * The device ID is derived deterministically from the API key using SHA-256.
 * This ensures that different app variants (dev, preview, production) with the
 * same server configuration will produce the same device ID and see the same
 * backups on the server. If no API key is configured, a random device ID is
 * generated as fallback.
 *
 * @module services/backup/CustomServerSettingsStore
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Storage keys
const STORAGE_KEYS = {
  SERVER_URL: '@gg-economy/custom-server-url',
  API_KEY: 'custom-server-api-key',
  DEVICE_ID: 'custom-server-device-id',
} as const;

// Validation constants
const MAX_URL_LENGTH = 2048;
const MAX_API_KEY_LENGTH = 256;
const DEVICE_ID_BYTE_LENGTH = 16;

/**
 * Server settings interface with nullable fields
 */
export interface ServerSettings {
  serverUrl: string | null;
  apiKey: string | null;
  deviceId: string | null;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * CustomServerSettingsStore class
 *
 * Manages persistence of server configuration (URL, API key, device ID).
 * Server URL is stored in AsyncStorage, while API key and device ID
 * are stored securely in expo-secure-store.
 */
export class CustomServerSettingsStore {
  /**
   * Validate server URL format.
   * Accepts http:// or https:// URLs with a host component, ≤2048 characters.
   */
  validateServerUrl(url: string): ValidationResult {
    if (!url || url.length === 0) {
      return { valid: false, error: 'Server URL is required' };
    }

    if (url.length > MAX_URL_LENGTH) {
      return { valid: false, error: `Server URL must not exceed ${MAX_URL_LENGTH} characters` };
    }

    // Check scheme
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      return { valid: false, error: 'Server URL must start with http:// or https://' };
    }

    // Extract host portion after scheme
    const schemeEnd = url.indexOf('://') + 3;
    const afterScheme = url.substring(schemeEnd);

    // Must have a host (non-empty string before any path/port separator)
    const hostEnd = afterScheme.search(/[/:?#]/);
    const host = hostEnd === -1 ? afterScheme : afterScheme.substring(0, hostEnd);

    if (!host || host.trim().length === 0) {
      return { valid: false, error: 'Server URL must contain a valid host' };
    }

    return { valid: true };
  }

  /**
   * Validate API key.
   * Accepts trimmed length between 1 and 256 characters inclusive.
   */
  validateApiKey(apiKey: string): ValidationResult {
    const trimmed = apiKey.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'API key is required' };
    }

    if (trimmed.length > MAX_API_KEY_LENGTH) {
      return { valid: false, error: `API key must not exceed ${MAX_API_KEY_LENGTH} characters` };
    }

    return { valid: true };
  }

  /**
   * Save server URL and API key after validation.
   * Server URL is stored in AsyncStorage, API key in SecureStore.
   * Also regenerates the device ID based on the new API key.
   * Throws if validation fails.
   */
  async saveSettings(serverUrl: string, apiKey: string): Promise<void> {
    const urlValidation = this.validateServerUrl(serverUrl);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error ?? 'Invalid server URL');
    }

    const apiKeyValidation = this.validateApiKey(apiKey);
    if (!apiKeyValidation.valid) {
      throw new Error(apiKeyValidation.error ?? 'Invalid API key');
    }

    const trimmedApiKey = apiKey.trim();

    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, serverUrl);
    await SecureStore.setItemAsync(STORAGE_KEYS.API_KEY, trimmedApiKey);

    // Regenerate device ID based on the API key for cross-variant consistency
    const deviceId = await this.generateDeviceIdFromApiKey(trimmedApiKey);
    await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);
  }

  /**
   * Get all settings from storage.
   * Returns ServerSettings with nullable fields if not configured.
   */
  async getSettings(): Promise<ServerSettings> {
    const serverUrl = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);
    const deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);

    return {
      serverUrl: serverUrl ?? null,
      apiKey: apiKey ?? null,
      deviceId: deviceId ?? null,
    };
  }

  /**
   * Generate a deterministic device ID from the API key using SHA-256.
   * This ensures all app variants with the same API key produce the same device ID.
   * Returns first 32 hex characters of the hash.
   */
  private async generateDeviceIdFromApiKey(apiKey: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `gg-economy-device:${apiKey}`
    );
    // SHA-256 produces 64 hex chars, take first 32 for device ID
    return hash.substring(0, 32);
  }

  /**
   * Get or create device ID.
   * If an API key is stored, derives the device ID deterministically from it.
   * Otherwise generates a random 32-character hex string as fallback.
   */
  async getOrCreateDeviceId(): Promise<string> {
    const existingId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);

    if (existingId) {
      return existingId;
    }

    // Try to derive from API key for cross-variant consistency
    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);
    if (apiKey) {
      const deviceId = await this.generateDeviceIdFromApiKey(apiKey);
      await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);
      return deviceId;
    }

    // Fallback: generate random ID (will differ between app variants)
    const randomBytes = await Crypto.getRandomBytesAsync(DEVICE_ID_BYTE_LENGTH);
    const deviceId = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);

    return deviceId;
  }

  /**
   * Clear all settings from both AsyncStorage and SecureStore.
   */
  async clearSettings(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.API_KEY);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.DEVICE_ID);
  }

  /**
   * Check if all three values (URL, API key, device ID) are present.
   */
  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();

    return (
      settings.serverUrl !== null &&
      settings.serverUrl.length > 0 &&
      settings.apiKey !== null &&
      settings.apiKey.length > 0 &&
      settings.deviceId !== null &&
      settings.deviceId.length > 0
    );
  }
}

// Export singleton instance
export const customServerSettingsStore = new CustomServerSettingsStore();
