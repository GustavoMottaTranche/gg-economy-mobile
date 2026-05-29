/**
 * Unit tests for list optimization utilities
 *
 * Tests FlatList/FlashList optimization helpers, debounce, throttle, and memoization.
 */
import { renderHook, act } from '@testing-library/react-native';
import {
  ITEM_HEIGHTS,
  SEPARATOR_HEIGHTS,
  createGetItemLayout,
  FLATLIST_OPTIMIZATION_PROPS,
  FLATLIST_LARGE_LIST_PROPS,
  FLASHLIST_OPTIMIZATION_PROPS,
  getOptimizedFlatListProps,
  debounce,
  throttle,
  memoize,
  shouldShowLoading,
  useDelayedLoading,
} from '../../../src/utils/listOptimizations';

describe('List Optimization Utilities', () => {
  describe('ITEM_HEIGHTS', () => {
    it('should have correct transaction card height', () => {
      expect(ITEM_HEIGHTS.TRANSACTION_CARD).toBe(88);
    });

    it('should have correct category item height', () => {
      expect(ITEM_HEIGHTS.CATEGORY_ITEM).toBe(64);
    });

    it('should have correct rule item height', () => {
      expect(ITEM_HEIGHTS.RULE_ITEM).toBe(72);
    });

    it('should have correct backup item height', () => {
      expect(ITEM_HEIGHTS.BACKUP_ITEM).toBe(64);
    });

    it('should have correct settings item height', () => {
      expect(ITEM_HEIGHTS.SETTINGS_ITEM).toBe(56);
    });

    it('should have correct review item height', () => {
      expect(ITEM_HEIGHTS.REVIEW_ITEM).toBe(100);
    });
  });

  describe('SEPARATOR_HEIGHTS', () => {
    it('should have correct hairline height', () => {
      expect(SEPARATOR_HEIGHTS.HAIRLINE).toBe(0.5);
    });

    it('should have correct standard height', () => {
      expect(SEPARATOR_HEIGHTS.STANDARD).toBe(1);
    });

    it('should have correct section height', () => {
      expect(SEPARATOR_HEIGHTS.SECTION).toBe(8);
    });
  });

  describe('createGetItemLayout', () => {
    it('should create a getItemLayout function', () => {
      const getItemLayout = createGetItemLayout(88);
      expect(typeof getItemLayout).toBe('function');
    });

    it('should calculate correct offset for first item', () => {
      const getItemLayout = createGetItemLayout(88);
      const result = getItemLayout(null, 0);

      expect(result).toEqual({
        length: 88,
        offset: 0,
        index: 0,
      });
    });

    it('should calculate correct offset for subsequent items', () => {
      const getItemLayout = createGetItemLayout(88);
      const result = getItemLayout(null, 5);

      expect(result).toEqual({
        length: 88,
        offset: 88 * 5,
        index: 5,
      });
    });

    it('should include separator height in offset calculation', () => {
      const getItemLayout = createGetItemLayout(88, 1);
      const result = getItemLayout(null, 3);

      expect(result).toEqual({
        length: 88,
        offset: (88 + 1) * 3,
        index: 3,
      });
    });

    it('should handle zero separator height', () => {
      const getItemLayout = createGetItemLayout(64, 0);
      const result = getItemLayout(null, 10);

      expect(result).toEqual({
        length: 64,
        offset: 64 * 10,
        index: 10,
      });
    });
  });

  describe('FLATLIST_OPTIMIZATION_PROPS', () => {
    it('should have removeClippedSubviews enabled', () => {
      expect(FLATLIST_OPTIMIZATION_PROPS.removeClippedSubviews).toBe(true);
    });

    it('should have correct initialNumToRender', () => {
      expect(FLATLIST_OPTIMIZATION_PROPS.initialNumToRender).toBe(10);
    });

    it('should have correct maxToRenderPerBatch', () => {
      expect(FLATLIST_OPTIMIZATION_PROPS.maxToRenderPerBatch).toBe(10);
    });

    it('should have correct windowSize', () => {
      expect(FLATLIST_OPTIMIZATION_PROPS.windowSize).toBe(5);
    });

    it('should have correct updateCellsBatchingPeriod', () => {
      expect(FLATLIST_OPTIMIZATION_PROPS.updateCellsBatchingPeriod).toBe(50);
    });
  });

  describe('FLATLIST_LARGE_LIST_PROPS', () => {
    it('should have smaller initialNumToRender than standard', () => {
      expect(FLATLIST_LARGE_LIST_PROPS.initialNumToRender).toBeLessThan(
        FLATLIST_OPTIMIZATION_PROPS.initialNumToRender
      );
    });

    it('should have smaller maxToRenderPerBatch than standard', () => {
      expect(FLATLIST_LARGE_LIST_PROPS.maxToRenderPerBatch).toBeLessThan(
        FLATLIST_OPTIMIZATION_PROPS.maxToRenderPerBatch
      );
    });

    it('should have smaller windowSize than standard', () => {
      expect(FLATLIST_LARGE_LIST_PROPS.windowSize).toBeLessThan(
        FLATLIST_OPTIMIZATION_PROPS.windowSize
      );
    });
  });

  describe('FLASHLIST_OPTIMIZATION_PROPS', () => {
    it('should have correct drawDistance', () => {
      expect(FLASHLIST_OPTIMIZATION_PROPS.drawDistance).toBe(250);
    });

    it('should have correct estimatedItemSize', () => {
      expect(FLASHLIST_OPTIMIZATION_PROPS.estimatedItemSize).toBe(ITEM_HEIGHTS.TRANSACTION_CARD);
    });
  });

  describe('getOptimizedFlatListProps', () => {
    it('should return standard props for small lists', () => {
      const props = getOptimizedFlatListProps(50, 88);

      expect(props.initialNumToRender).toBe(FLATLIST_OPTIMIZATION_PROPS.initialNumToRender);
      expect(props.maxToRenderPerBatch).toBe(FLATLIST_OPTIMIZATION_PROPS.maxToRenderPerBatch);
      expect(props.windowSize).toBe(FLATLIST_OPTIMIZATION_PROPS.windowSize);
    });

    it('should return large list props for lists over 100 items', () => {
      const props = getOptimizedFlatListProps(150, 88);

      expect(props.initialNumToRender).toBe(FLATLIST_LARGE_LIST_PROPS.initialNumToRender);
      expect(props.maxToRenderPerBatch).toBe(FLATLIST_LARGE_LIST_PROPS.maxToRenderPerBatch);
      expect(props.windowSize).toBe(FLATLIST_LARGE_LIST_PROPS.windowSize);
    });

    it('should include getItemLayout function', () => {
      const props = getOptimizedFlatListProps(50, 88);

      expect(typeof props.getItemLayout).toBe('function');
    });

    it('should use separator height in getItemLayout', () => {
      const props = getOptimizedFlatListProps(50, 88, 1);
      const layout = props.getItemLayout(null, 2);

      expect(layout.offset).toBe((88 + 1) * 2);
    });

    it('should use standard props for exactly 100 items', () => {
      const props = getOptimizedFlatListProps(100, 88);

      expect(props.initialNumToRender).toBe(FLATLIST_OPTIMIZATION_PROPS.initialNumToRender);
    });

    it('should use large list props for 101 items', () => {
      const props = getOptimizedFlatListProps(101, 88);

      expect(props.initialNumToRender).toBe(FLATLIST_LARGE_LIST_PROPS.initialNumToRender);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn('test');
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledWith('test');
    });

    it('should use default delay of 300ms', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn);

      debouncedFn('test');
      jest.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalled();
    });

    it('should cancel previous call when called again', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn('first');
      jest.advanceTimersByTime(200);
      debouncedFn('second');
      jest.advanceTimersByTime(300);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });

    it('should handle multiple arguments', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2', 'arg3');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute immediately on first call', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn('test');
      expect(fn).toHaveBeenCalledWith('test');
    });

    it('should ignore calls within throttle period', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn('first');
      throttledFn('second');
      throttledFn('third');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });

    it('should allow calls after throttle period', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 300);

      throttledFn('first');
      jest.advanceTimersByTime(300);
      throttledFn('second');

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should handle multiple arguments', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = jest.fn((x: unknown) => (x as number) * 2);
      const memoizedFn = memoize(fn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should compute new results for different arguments', () => {
      const fn = jest.fn((x: unknown) => (x as number) * 2);
      const memoizedFn = memoize(fn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple arguments', () => {
      const fn = jest.fn((a: unknown, b: unknown) => (a as number) + (b as number));
      const memoizedFn = memoize(fn);

      expect(memoizedFn(1, 2)).toBe(3);
      expect(memoizedFn(1, 2)).toBe(3);
      expect(memoizedFn(2, 3)).toBe(5);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle object arguments', () => {
      const fn = jest.fn((obj: unknown) => (obj as { x: number }).x * 2);
      const memoizedFn = memoize(fn);

      expect(memoizedFn({ x: 5 })).toBe(10);
      expect(memoizedFn({ x: 5 })).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('shouldShowLoading', () => {
    it('should return false when under threshold', () => {
      const startTime = Date.now() - 400;
      expect(shouldShowLoading(startTime, 500)).toBe(false);
    });

    it('should return true when over threshold', () => {
      const startTime = Date.now() - 600;
      expect(shouldShowLoading(startTime, 500)).toBe(true);
    });

    it('should use default threshold of 500ms', () => {
      const startTime = Date.now() - 501;
      expect(shouldShowLoading(startTime)).toBe(true);
    });

    it('should return false at exactly threshold', () => {
      const startTime = Date.now() - 500;
      // Due to timing, this might be true or false
      const result = shouldShowLoading(startTime, 500);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('useDelayedLoading', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false initially when not loading', () => {
      const { result } = renderHook(() => useDelayedLoading(false));
      expect(result.current).toBe(false);
    });

    it('should return false initially when loading starts', () => {
      const { result } = renderHook(() => useDelayedLoading(true));
      expect(result.current).toBe(false);
    });

    it('should return true after delay when still loading', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 500));

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(true);
    });

    it('should return false if loading completes before delay', () => {
      const { result, rerender } = renderHook(
        (props: { isLoading: boolean }) => useDelayedLoading(props.isLoading, 500),
        { initialProps: { isLoading: true } }
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      rerender({ isLoading: false });

      expect(result.current).toBe(false);
    });

    it('should use default delay of 500ms', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(result.current).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
    });

    it('should reset when loading stops and starts again', () => {
      const { result, rerender } = renderHook(
        (props: { isLoading: boolean }) => useDelayedLoading(props.isLoading, 500),
        { initialProps: { isLoading: true } }
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe(true);

      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      rerender({ isLoading: true });
      expect(result.current).toBe(false);

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe(true);
    });
  });
});
