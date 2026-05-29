/**
 * NotificationsModuleLoader - Centralized lazy loader for expo-notifications
 *
 * Encapsulates the dynamic import logic for expo-notifications and provides
 * a test hook (__setTestModule) to allow tests to bypass the dynamic import.
 *
 * In production, the module is lazily loaded on first use and cached.
 * In Expo Go, returns null to prevent crashes (notifications not supported since SDK 53).
 *
 * @module services/notifications/NotificationsModuleLoader
 */

import Constants from 'expo-constants';

// Check if running in Expo Go (notifications not supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Cached notifications module
let Notifications: typeof import('expo-notifications') | null = null;

// Test hook module override
let _testModule: typeof import('expo-notifications') | null = null;

/**
 * Test hook to set a mock notifications module.
 * This allows tests to bypass the dynamic import entirely.
 *
 * @param mod - The mock module to use, or null to reset
 */
export function __setTestModule(mod: typeof import('expo-notifications') | null): void {
  _testModule = mod;
}

/**
 * Get the expo-notifications module, lazily loading it if needed.
 *
 * Returns null in Expo Go environment.
 * In tests, returns the module set via __setTestModule if available.
 * In production, dynamically imports and caches the module.
 *
 * @returns The expo-notifications module or null
 */
export async function getNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (_testModule) return _testModule;
  if (isExpoGo) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
}
