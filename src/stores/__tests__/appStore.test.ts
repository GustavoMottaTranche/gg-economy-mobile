/**
 * App Store Tests
 *
 * Tests for the global app state Zustand store.
 * Validates:
 * - Current month management
 * - Review queue count management
 * - Month navigation (previous/next)
 * - Store persistence
 *
 * **Validates: Requirements 28, 29**
 */

import { act, renderHook } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Import after mocks
import {
  useAppStore,
  useCurrentMonth,
  useReviewQueueCount,
  useAppInitialized,
  useAppStoreReady,
  getCurrentMonthSync,
  setReviewQueueCountSync,
} from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.getState().reset();
  });

  describe('Current Month', () => {
    it('initializes with current month', () => {
      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      const { result } = renderHook(() => useCurrentMonth());

      expect(result.current.currentMonth).toBe(expectedMonth);
    });

    it('sets current month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2024-06');
      });

      expect(result.current.currentMonth).toBe('2024-06');
    });

    it('validates month format', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useCurrentMonth());

      const originalMonth = result.current.currentMonth;

      act(() => {
        result.current.setCurrentMonth('invalid');
      });

      // Should not change the month
      expect(result.current.currentMonth).toBe(originalMonth);
      // Logger outputs in format: [timestamp] [WARN] message, context
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Invalid month format'),
        expect.objectContaining({ month: 'invalid', expected: 'YYYY-MM' })
      );

      consoleSpy.mockRestore();
    });

    it('navigates to previous month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2024-06');
      });

      act(() => {
        result.current.goToPreviousMonth();
      });

      expect(result.current.currentMonth).toBe('2024-05');
    });

    it('navigates to next month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2024-06');
      });

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentMonth).toBe('2024-07');
    });

    it('handles year boundary when going to previous month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2024-01');
      });

      act(() => {
        result.current.goToPreviousMonth();
      });

      expect(result.current.currentMonth).toBe('2023-12');
    });

    it('handles year boundary when going to next month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2024-12');
      });

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentMonth).toBe('2025-01');
    });

    it('resets to current month', () => {
      const { result } = renderHook(() => useCurrentMonth());

      act(() => {
        result.current.setCurrentMonth('2020-01');
      });

      act(() => {
        result.current.resetToCurrentMonth();
      });

      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      expect(result.current.currentMonth).toBe(expectedMonth);
    });
  });

  describe('Review Queue Count', () => {
    it('initializes with zero count', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      expect(result.current.count).toBe(0);
    });

    it('sets review queue count', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(5);
      });

      expect(result.current.count).toBe(5);
    });

    it('does not allow negative count', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(-5);
      });

      expect(result.current.count).toBe(0);
    });

    it('increments count', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(5);
      });

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(6);
    });

    it('increments count by specified amount', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(5);
      });

      act(() => {
        result.current.increment(3);
      });

      expect(result.current.count).toBe(8);
    });

    it('decrements count', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(5);
      });

      act(() => {
        result.current.decrement();
      });

      expect(result.current.count).toBe(4);
    });

    it('decrements count by specified amount', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(5);
      });

      act(() => {
        result.current.decrement(3);
      });

      expect(result.current.count).toBe(2);
    });

    it('does not decrement below zero', () => {
      const { result } = renderHook(() => useReviewQueueCount());

      act(() => {
        result.current.setCount(2);
      });

      act(() => {
        result.current.decrement(5);
      });

      expect(result.current.count).toBe(0);
    });
  });

  describe('App Initialization', () => {
    it('initializes as not initialized', () => {
      const { result } = renderHook(() => useAppInitialized());

      expect(result.current).toBe(false);
    });

    it('can be marked as initialized', () => {
      act(() => {
        useAppStore.getState().setInitialized(true);
      });

      const { result } = renderHook(() => useAppInitialized());

      expect(result.current).toBe(true);
    });
  });

  describe('Store Hydration', () => {
    it('initializes as not hydrated', () => {
      const { result } = renderHook(() => useAppStoreReady());

      expect(result.current).toBe(false);
    });

    it('can be marked as hydrated', () => {
      act(() => {
        useAppStore.getState().setHydrated(true);
      });

      const { result } = renderHook(() => useAppStoreReady());

      expect(result.current).toBe(true);
    });
  });

  describe('Synchronous Functions', () => {
    it('getCurrentMonthSync returns current month', () => {
      act(() => {
        useAppStore.getState().setCurrentMonth('2024-06');
      });

      expect(getCurrentMonthSync()).toBe('2024-06');
    });

    it('setReviewQueueCountSync sets count', () => {
      act(() => {
        setReviewQueueCountSync(10);
      });

      const { result } = renderHook(() => useReviewQueueCount());

      expect(result.current.count).toBe(10);
    });
  });

  describe('Store Reset', () => {
    it('resets all state to initial values', () => {
      // Set some values
      act(() => {
        useAppStore.getState().setCurrentMonth('2020-01');
        useAppStore.getState().setReviewQueueCount(10);
        useAppStore.getState().setInitialized(true);
      });

      // Reset
      act(() => {
        useAppStore.getState().reset();
      });

      const state = useAppStore.getState();

      // Current month should be reset to current calendar month
      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      expect(state.currentMonth).toBe(expectedMonth);
      expect(state.reviewQueueCount).toBe(0);
      expect(state.isInitialized).toBe(false);
    });
  });
});
