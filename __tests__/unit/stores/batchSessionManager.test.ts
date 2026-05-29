/**
 * Unit tests for BatchSessionManager Zustand store
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6, 6.3**
 */

import { act, renderHook } from '@testing-library/react-native';
import { useBatchSessionStore } from '../../../src/services/batch/BatchSessionManager';

describe('BatchSessionManager', () => {
  beforeEach(() => {
    act(() => {
      useBatchSessionStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('should have inactive session with null category and null title', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      expect(result.current.isActive).toBe(false);
      expect(result.current.categoryId).toBeNull();
      expect(result.current.categoryType).toBeNull();
      expect(result.current.title).toBeNull();
      expect(result.current.entryCount).toBe(0);
      expect(result.current.maxEntries).toBe(50);
      expect(result.current.totalValue).toBe(0);
    });
  });

  describe('startSession', () => {
    it('should activate session with category info, title, and reset counter', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Supermercado');
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.categoryId).toBe('cat-123');
      expect(result.current.categoryType).toBe('expense');
      expect(result.current.title).toBe('Supermercado');
      expect(result.current.entryCount).toBe(0);
      expect(result.current.totalValue).toBe(0);
    });

    it('should reset counter when starting a new session', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-1', 'income', 'Salário');
        result.current.incrementCount(1000);
        result.current.incrementCount(2000);
      });

      expect(result.current.entryCount).toBe(2);

      act(() => {
        result.current.startSession('cat-2', 'expense', 'Uber');
      });

      expect(result.current.entryCount).toBe(0);
      expect(result.current.totalValue).toBe(0);
      expect(result.current.categoryId).toBe('cat-2');
      expect(result.current.categoryType).toBe('expense');
      expect(result.current.title).toBe('Uber');
    });
  });

  describe('incrementCount', () => {
    it('should increment entry count and add to totalValue', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Test');
      });

      act(() => {
        result.current.incrementCount(1500);
      });

      expect(result.current.entryCount).toBe(1);
      expect(result.current.totalValue).toBe(1500);
    });

    it('should accumulate totalValue across multiple increments', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'income', 'Salário');
        result.current.incrementCount(1000);
        result.current.incrementCount(2500);
        result.current.incrementCount(500);
      });

      expect(result.current.entryCount).toBe(3);
      expect(result.current.totalValue).toBe(4000);
    });

    it('should enforce max 50 entries limit', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Compras');
        for (let i = 0; i < 50; i++) {
          result.current.incrementCount(100);
        }
      });

      expect(result.current.entryCount).toBe(50);
      expect(result.current.totalValue).toBe(5000);

      // 51st entry should be blocked
      act(() => {
        result.current.incrementCount(100);
      });

      expect(result.current.entryCount).toBe(50);
      expect(result.current.totalValue).toBe(5000);
    });
  });

  describe('endSession', () => {
    it('should return summary with totalEntries and totalValue', () => {
      const { result } = renderHook(() => useBatchSessionStore());
      let summary: { totalEntries: number; totalValue: number } | undefined;

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Mercado');
        result.current.incrementCount(1000);
        result.current.incrementCount(2000);
        result.current.incrementCount(3000);
        summary = result.current.endSession();
      });

      expect(summary).toEqual({
        totalEntries: 3,
        totalValue: 6000,
      });
    });

    it('should reset state after ending session', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Uber');
        result.current.incrementCount(1000);
        result.current.endSession();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.categoryId).toBeNull();
      expect(result.current.categoryType).toBeNull();
      expect(result.current.title).toBeNull();
      expect(result.current.entryCount).toBe(0);
      expect(result.current.totalValue).toBe(0);
    });

    it('should return zero summary when no entries were added', () => {
      const { result } = renderHook(() => useBatchSessionStore());
      let summary: { totalEntries: number; totalValue: number } | undefined;

      act(() => {
        result.current.startSession('cat-123', 'income', 'Salário');
        summary = result.current.endSession();
      });

      expect(summary).toEqual({
        totalEntries: 0,
        totalValue: 0,
      });
    });
  });

  describe('reset', () => {
    it('should clear all session state including title', () => {
      const { result } = renderHook(() => useBatchSessionStore());

      act(() => {
        result.current.startSession('cat-123', 'expense', 'Compras');
        result.current.incrementCount(5000);
        result.current.incrementCount(3000);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.title).toBe('Compras');

      act(() => {
        result.current.reset();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.categoryId).toBeNull();
      expect(result.current.categoryType).toBeNull();
      expect(result.current.title).toBeNull();
      expect(result.current.entryCount).toBe(0);
      expect(result.current.totalValue).toBe(0);
    });
  });
});
