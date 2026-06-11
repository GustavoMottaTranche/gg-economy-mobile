/**
 * Cloud Sync Configuration Module
 *
 * Manages the base URL configuration for the cloud sync import feature.
 * Reads/writes the base URL from AsyncStorage and provides URL validation
 * and path construction utilities.
 *
 * @module services/cloud-sync/config
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CloudSyncError } from './CloudSyncError';

// Storage key for the custom base URL
const STORAGE_KEY = '@gg-economy/cloud-sync-base-url';

// Default base URL for the GG-Economy Web platform
const DEFAULT_BASE_URL = 'https://gg-economy.lovable.app';

// Validation constants
const MAX_URL_LENGTH = 2048;

/**
 * Configuration object returned by getCloudSyncConfig.
 */
export interface CloudSyncConfig {
  baseUrl: string;
}

/**
 * Validates a URL string against HTTP/HTTPS scheme + host requirements.
 * Returns true if valid, false otherwise.
 */
export function isValidBaseUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  if (url.length > MAX_URL_LENGTH) {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return false;
  }

  // Extract host portion after scheme
  const schemeEnd = url.indexOf('://') + 3;
  const afterScheme = url.substring(schemeEnd);

  // Must have a host (non-empty string before any path/port separator)
  const hostEnd = afterScheme.search(/[/:?#]/);
  const host = hostEnd === -1 ? afterScheme : afterScheme.substring(0, hostEnd);

  if (!host || host.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Constructs a full endpoint URL by joining baseUrl and path.
 * Normalizes trailing slashes to avoid double slashes.
 */
export function buildEndpointUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Reads the cloud sync base URL configuration from AsyncStorage.
 * Returns the stored URL or the default (empty string) if not configured.
 *
 * Throws CloudSyncError with NOT_CONFIGURED if the URL is empty or invalid.
 */
export async function getCloudSyncConfig(): Promise<CloudSyncConfig> {
  const storedUrl = await AsyncStorage.getItem(STORAGE_KEY);
  const baseUrl = storedUrl ?? DEFAULT_BASE_URL;

  if (!isValidBaseUrl(baseUrl)) {
    throw new CloudSyncError('Server URL not configured', 'NOT_CONFIGURED');
  }

  return { baseUrl };
}

/**
 * Persists a custom base URL to AsyncStorage after validation.
 *
 * Throws CloudSyncError with NOT_CONFIGURED if the URL is invalid.
 */
export async function setCloudSyncBaseUrl(url: string): Promise<void> {
  if (!isValidBaseUrl(url)) {
    throw new CloudSyncError('Server URL not configured', 'NOT_CONFIGURED');
  }

  await AsyncStorage.setItem(STORAGE_KEY, url);
}
