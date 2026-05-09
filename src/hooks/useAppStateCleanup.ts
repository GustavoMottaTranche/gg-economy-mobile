/**
 * useAppStateCleanup Hook
 *
 * Handles sensitive data cleanup when the app goes to background.
 * This is a security measure to prevent sensitive data from being
 * accessible if the device is compromised while the app is backgrounded.
 *
 * **Validates: Requirements 34 (Privacy and Security)**
 *
 * Cleanup actions:
 * - Clears in-memory OAuth tokens (not persisted tokens in SecureStore)
 * - Clears any cached sensitive data in Zustand stores
 * - Clears in-memory draft data from draftStore (persisted drafts in SecureStore remain)
 * - Does NOT clear persisted data (database, SecureStore)
 * - Does NOT clear OAuth tokens in SecureStore (they're secure)
 *
 * @module hooks/useAppStateCleanup
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBackupStore } from '../stores/backupStore';
import { useDraftStore } from '../stores/draftStore';

/**
 * Configuration for app state cleanup
 */
export interface AppStateCleanupConfig {
  /** Whether to clear backup status on background (default: false) */
  clearBackupStatusOnBackground?: boolean;
  /** Whether to clear in-memory tokens on background (default: true) */
  clearInMemoryTokensOnBackground?: boolean;
  /** Whether to clear in-memory draft data on background (default: true) */
  clearDraftDataOnBackground?: boolean;
  /** Callback when app goes to background */
  onBackground?: () => void;
  /** Callback when app comes to foreground */
  onForeground?: () => void;
  /** Minimum time in background before cleanup (ms, default: 0) */
  cleanupDelayMs?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<AppStateCleanupConfig> = {
  clearBackupStatusOnBackground: false,
  clearInMemoryTokensOnBackground: true,
  clearDraftDataOnBackground: true,
  onBackground: () => {},
  onForeground: () => {},
  cleanupDelayMs: 0,
};

/**
 * In-memory sensitive data cache that should be cleared on background
 * This is used by services that need to cache sensitive data temporarily
 */
class SensitiveDataCache {
  private static instance: SensitiveDataCache;
  private cache: Map<string, unknown> = new Map();
  private clearCallbacks: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): SensitiveDataCache {
    if (!SensitiveDataCache.instance) {
      SensitiveDataCache.instance = new SensitiveDataCache();
    }
    return SensitiveDataCache.instance;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: unknown): void {
    this.cache.set(key, value);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Remove a value from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    // Call all registered clear callbacks
    this.clearCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        // Silently ignore callback errors
        if (__DEV__) {
          console.warn('[SensitiveDataCache] Clear callback error:', error);
        }
      }
    });
  }

  /**
   * Register a callback to be called when cache is cleared
   */
  onClear(callback: () => void): () => void {
    this.clearCallbacks.add(callback);
    return () => {
      this.clearCallbacks.delete(callback);
    };
  }

  /**
   * Check if cache has any data
   */
  hasData(): boolean {
    return this.cache.size > 0;
  }
}

// Export singleton instance
export const sensitiveDataCache = SensitiveDataCache.getInstance();

/**
 * Hook to handle app state changes and cleanup sensitive data
 *
 * @param config - Configuration options
 * @returns Object with current app state and cleanup function
 */
export function useAppStateCleanup(config: AppStateCleanupConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);
  const resetBackupOperation = useBackupStore((state) => state.resetOperation);
  const resetDraftStore = useDraftStore((state) => state.reset);

  /**
   * Perform cleanup of sensitive data
   */
  const performCleanup = useCallback(() => {
    // Clear in-memory sensitive data cache
    if (mergedConfig.clearInMemoryTokensOnBackground) {
      sensitiveDataCache.clear();
    }

    // Clear in-memory draft data (persisted drafts in SecureStore remain)
    if (mergedConfig.clearDraftDataOnBackground) {
      resetDraftStore();
      if (__DEV__) {
        console.log('[useAppStateCleanup] Draft store cleared on background');
      }
    }

    // Clear backup progress (not status) if configured
    if (mergedConfig.clearBackupStatusOnBackground) {
      resetBackupOperation();
    }

    if (__DEV__) {
      console.log('[useAppStateCleanup] Sensitive data cleared on background');
    }
  }, [
    mergedConfig.clearInMemoryTokensOnBackground,
    mergedConfig.clearDraftDataOnBackground,
    mergedConfig.clearBackupStatusOnBackground,
    resetBackupOperation,
    resetDraftStore,
  ]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      // App going to background
      if (
        previousState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        backgroundTimestamp.current = Date.now();

        if (mergedConfig.cleanupDelayMs === 0) {
          performCleanup();
        }

        mergedConfig.onBackground();

        if (__DEV__) {
          console.log('[useAppStateCleanup] App went to background');
        }
      }

      // App coming to foreground
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Check if cleanup should happen based on time in background
        if (mergedConfig.cleanupDelayMs > 0 && backgroundTimestamp.current !== null) {
          const timeInBackground = Date.now() - backgroundTimestamp.current;
          if (timeInBackground >= mergedConfig.cleanupDelayMs) {
            performCleanup();
          }
        }

        backgroundTimestamp.current = null;
        mergedConfig.onForeground();

        if (__DEV__) {
          console.log('[useAppStateCleanup] App came to foreground');
        }
      }

      appState.current = nextAppState;
    },
    [mergedConfig, performCleanup]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  return {
    /** Current app state */
    currentState: appState.current,
    /** Manually trigger cleanup */
    performCleanup,
    /** Sensitive data cache instance */
    sensitiveDataCache,
  };
}

/**
 * Utility function to clear all sensitive data
 * Can be called from anywhere in the app
 */
export function clearAllSensitiveData(): void {
  sensitiveDataCache.clear();
  // Also clear draft store in-memory data
  useDraftStore.getState().reset();
}

export default useAppStateCleanup;
