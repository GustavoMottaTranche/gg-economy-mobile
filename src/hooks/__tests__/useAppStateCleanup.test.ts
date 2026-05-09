/**
 * Tests for useAppStateCleanup hook
 *
 * Verifies that sensitive data is properly cleared when app goes to background.
 *
 * **Validates: Requirements 34 (Privacy and Security)**
 */

import { renderHook, act } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import {
  useAppStateCleanup,
  sensitiveDataCache,
  clearAllSensitiveData,
} from '../useAppStateCleanup';

// Mock AppState
let appStateCallback: ((state: AppStateStatus) => void) | null = null;
const mockAddEventListener = jest.fn((event: string, callback: (state: AppStateStatus) => void) => {
  if (event === 'change') {
    appStateCallback = callback;
  }
  return { remove: jest.fn() };
});

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (event: string, callback: (state: AppStateStatus) => void) =>
      mockAddEventListener(event, callback),
  },
}));

// Mock backup store
const mockResetOperation = jest.fn();
jest.mock('../../stores/backupStore', () => ({
  useBackupStore: (selector: (state: { resetOperation: () => void }) => unknown) =>
    selector({ resetOperation: mockResetOperation }),
}));

// Mock draft store - use mockDraftStoreReset prefix to satisfy Jest's variable naming rules
const mockDraftStoreReset = jest.fn();
jest.mock('../../stores/draftStore', () => {
  // Create a function that also has a getState property
  const mockFn = (selector: (state: { reset: () => void }) => unknown) =>
    selector({ reset: mockDraftStoreReset });
  (mockFn as unknown as { getState: () => { reset: () => void } }).getState = () => ({
    reset: mockDraftStoreReset,
  });
  return {
    useDraftStore: mockFn,
  };
});

describe('useAppStateCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sensitiveDataCache.clear();
    appStateCallback = null;
  });

  describe('sensitiveDataCache', () => {
    it('should store and retrieve values', () => {
      sensitiveDataCache.set('testKey', 'testValue');
      expect(sensitiveDataCache.get('testKey')).toBe('testValue');
    });

    it('should delete values', () => {
      sensitiveDataCache.set('testKey', 'testValue');
      sensitiveDataCache.delete('testKey');
      expect(sensitiveDataCache.get('testKey')).toBeUndefined();
    });

    it('should clear all values', () => {
      sensitiveDataCache.set('key1', 'value1');
      sensitiveDataCache.set('key2', 'value2');
      sensitiveDataCache.clear();
      expect(sensitiveDataCache.get('key1')).toBeUndefined();
      expect(sensitiveDataCache.get('key2')).toBeUndefined();
    });

    it('should report hasData correctly', () => {
      expect(sensitiveDataCache.hasData()).toBe(false);
      sensitiveDataCache.set('key', 'value');
      expect(sensitiveDataCache.hasData()).toBe(true);
      sensitiveDataCache.clear();
      expect(sensitiveDataCache.hasData()).toBe(false);
    });

    it('should call registered clear callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = sensitiveDataCache.onClear(callback);

      sensitiveDataCache.clear();
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe and verify callback is not called again
      unsubscribe();
      sensitiveDataCache.clear();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAllSensitiveData', () => {
    it('should clear the sensitive data cache', () => {
      sensitiveDataCache.set('key', 'value');
      clearAllSensitiveData();
      expect(sensitiveDataCache.hasData()).toBe(false);
    });

    it('should also clear the draft store', () => {
      mockDraftStoreReset.mockClear();
      clearAllSensitiveData();
      expect(mockDraftStoreReset).toHaveBeenCalled();
    });
  });

  describe('useAppStateCleanup hook', () => {
    it('should register app state listener on mount', () => {
      renderHook(() => useAppStateCleanup());
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clear sensitive data when app goes to background', () => {
      sensitiveDataCache.set('token', 'secret-token');

      renderHook(() => useAppStateCleanup());

      // Simulate app going to background
      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(sensitiveDataCache.hasData()).toBe(false);
    });

    it('should call onBackground callback when app goes to background', () => {
      const onBackground = jest.fn();

      renderHook(() => useAppStateCleanup({ onBackground }));

      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(onBackground).toHaveBeenCalledTimes(1);
    });

    it('should call onForeground callback when app comes to foreground', () => {
      const onForeground = jest.fn();

      renderHook(() => useAppStateCleanup({ onForeground }));

      // First go to background
      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      // Then come back to foreground
      act(() => {
        if (appStateCallback) {
          appStateCallback('active');
        }
      });

      expect(onForeground).toHaveBeenCalledTimes(1);
    });

    it('should not clear data if clearInMemoryTokensOnBackground is false', () => {
      sensitiveDataCache.set('token', 'secret-token');

      renderHook(() => useAppStateCleanup({ clearInMemoryTokensOnBackground: false }));

      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(sensitiveDataCache.hasData()).toBe(true);
    });

    it('should reset backup operation if clearBackupStatusOnBackground is true', () => {
      renderHook(() => useAppStateCleanup({ clearBackupStatusOnBackground: true }));

      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(mockResetOperation).toHaveBeenCalled();
    });

    it('should clear draft store when app goes to background by default', () => {
      renderHook(() => useAppStateCleanup());

      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(mockDraftStoreReset).toHaveBeenCalled();
    });

    it('should not clear draft store if clearDraftDataOnBackground is false', () => {
      mockDraftStoreReset.mockClear();

      renderHook(() => useAppStateCleanup({ clearDraftDataOnBackground: false }));

      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(mockDraftStoreReset).not.toHaveBeenCalled();
    });

    it('should provide performCleanup function for manual cleanup', () => {
      sensitiveDataCache.set('token', 'secret-token');

      const { result } = renderHook(() => useAppStateCleanup());

      act(() => {
        result.current.performCleanup();
      });

      expect(sensitiveDataCache.hasData()).toBe(false);
    });

    it('should handle inactive state as background', () => {
      sensitiveDataCache.set('token', 'secret-token');

      renderHook(() => useAppStateCleanup());

      act(() => {
        if (appStateCallback) {
          appStateCallback('inactive');
        }
      });

      expect(sensitiveDataCache.hasData()).toBe(false);
    });
  });

  describe('delayed cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay cleanup if cleanupDelayMs is set', () => {
      sensitiveDataCache.set('token', 'secret-token');

      renderHook(() => useAppStateCleanup({ cleanupDelayMs: 5000 }));

      // Go to background - should not clear immediately
      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      expect(sensitiveDataCache.hasData()).toBe(true);

      // Advance time and come back to foreground
      jest.advanceTimersByTime(6000);

      act(() => {
        if (appStateCallback) {
          appStateCallback('active');
        }
      });

      expect(sensitiveDataCache.hasData()).toBe(false);
    });

    it('should not cleanup if returning to foreground before delay', () => {
      sensitiveDataCache.set('token', 'secret-token');

      renderHook(() => useAppStateCleanup({ cleanupDelayMs: 5000 }));

      // Go to background
      act(() => {
        if (appStateCallback) {
          appStateCallback('background');
        }
      });

      // Return to foreground quickly (before delay)
      jest.advanceTimersByTime(2000);

      act(() => {
        if (appStateCallback) {
          appStateCallback('active');
        }
      });

      // Data should still be there
      expect(sensitiveDataCache.hasData()).toBe(true);
    });
  });
});
