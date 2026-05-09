/**
 * List Optimization Utilities
 *
 * Provides optimizations for FlatList and FlashList components:
 * - getItemLayout for fixed-height items
 * - removeClippedSubviews configuration
 * - windowSize and maxToRenderPerBatch settings
 *
 * **Validates: Requirements 36**
 */

/**
 * Standard item heights for different list types
 */
export const ITEM_HEIGHTS = {
  /** Transaction card height including margins */
  TRANSACTION_CARD: 88,
  /** Category item height */
  CATEGORY_ITEM: 64,
  /** Rule item height */
  RULE_ITEM: 72,
  /** Backup item height */
  BACKUP_ITEM: 64,
  /** Settings item height */
  SETTINGS_ITEM: 56,
  /** Review item height */
  REVIEW_ITEM: 100,
} as const;

/**
 * Separator heights
 */
export const SEPARATOR_HEIGHTS = {
  /** Standard hairline separator */
  HAIRLINE: 0.5,
  /** Standard separator */
  STANDARD: 1,
  /** Section separator */
  SECTION: 8,
} as const;

/**
 * Creates a getItemLayout function for fixed-height items
 *
 * @param itemHeight - Height of each item in pixels
 * @param separatorHeight - Height of separator between items (default 0)
 * @returns getItemLayout function for FlatList
 *
 * @example
 * ```tsx
 * <FlatList
 *   data={transactions}
 *   getItemLayout={createGetItemLayout(ITEM_HEIGHTS.TRANSACTION_CARD)}
 *   // ...
 * />
 * ```
 */
export function createGetItemLayout(
  itemHeight: number,
  separatorHeight: number = 0
): (data: unknown, index: number) => { length: number; offset: number; index: number } {
  const totalItemHeight = itemHeight + separatorHeight;

  return (_data: unknown, index: number) => ({
    length: itemHeight,
    offset: totalItemHeight * index,
    index,
  });
}

/**
 * Default FlatList optimization props for better performance
 *
 * @example
 * ```tsx
 * <FlatList
 *   {...FLATLIST_OPTIMIZATION_PROPS}
 *   data={items}
 *   renderItem={renderItem}
 * />
 * ```
 */
export const FLATLIST_OPTIMIZATION_PROPS = {
  /** Remove items that are off-screen */
  removeClippedSubviews: true,
  /** Number of items to render in initial batch */
  initialNumToRender: 10,
  /** Maximum number of items to render per batch */
  maxToRenderPerBatch: 10,
  /** Number of items to keep rendered outside visible area */
  windowSize: 5,
  /** Update cell batch period in ms */
  updateCellsBatchingPeriod: 50,
} as const;

/**
 * FlatList optimization props for large lists (100+ items)
 */
export const FLATLIST_LARGE_LIST_PROPS = {
  ...FLATLIST_OPTIMIZATION_PROPS,
  /** Fewer items in initial render for faster startup */
  initialNumToRender: 8,
  /** Smaller batches for smoother scrolling */
  maxToRenderPerBatch: 5,
  /** Smaller window for memory efficiency */
  windowSize: 3,
} as const;

/**
 * FlashList optimization props
 * Note: FlashList handles most optimizations automatically
 */
export const FLASHLIST_OPTIMIZATION_PROPS = {
  /** Draw distance for pre-rendering items */
  drawDistance: 250,
  /** Estimated item size for better initial render */
  estimatedItemSize: ITEM_HEIGHTS.TRANSACTION_CARD,
} as const;

/**
 * Creates optimized props for a FlatList based on list size
 *
 * @param itemCount - Number of items in the list
 * @param itemHeight - Height of each item
 * @param separatorHeight - Height of separator (optional)
 * @returns Optimized FlatList props
 */
export function getOptimizedFlatListProps(
  itemCount: number,
  itemHeight: number,
  separatorHeight: number = 0
) {
  const baseProps = itemCount > 100 ? FLATLIST_LARGE_LIST_PROPS : FLATLIST_OPTIMIZATION_PROPS;

  return {
    ...baseProps,
    getItemLayout: createGetItemLayout(itemHeight, separatorHeight),
  };
}

/**
 * Debounce function for search/filter inputs
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds (default 300ms)
 * @returns Debounced function
 *
 * @example
 * ```tsx
 * const debouncedSearch = useMemo(
 *   () => debounce((text: string) => setSearchQuery(text), 300),
 *   []
 * );
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function for scroll handlers
 *
 * @param func - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoization helper for expensive computations
 *
 * @param fn - Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);

    return result;
  }) as T;
}

/**
 * Check if we should show a loading indicator based on operation duration
 *
 * @param startTime - Start time of the operation
 * @param threshold - Threshold in milliseconds (default 500ms)
 * @returns Whether to show loading indicator
 */
export function shouldShowLoading(startTime: number, threshold: number = 500): boolean {
  return Date.now() - startTime > threshold;
}

/**
 * Create a delayed loading state hook helper
 * Shows loading only if operation takes longer than threshold
 *
 * @param isLoading - Current loading state
 * @param delay - Delay before showing loading (default 500ms)
 * @returns Whether to show loading indicator
 */
export function useDelayedLoading(isLoading: boolean, delay: number = 500): boolean {
  const [showLoading, setShowLoading] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setShowLoading(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, delay]);

  return showLoading;
}

// Import React for the hook
import React from 'react';
