/**
 * useReviewCount Hook Tests
 *
 * Tests for the review count hook used in navigation badge.
 *
 * **Validates: Requirements 28, 16**
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock the database client
const mockGetDb = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => mockGetDb(),
}));

jest.mock('../../db/schema', () => ({
  transactions: {
    needsReview: 'needs_review',
  },
}));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: jest.fn(() => ({ data: [{ count: 0 }] })),
}));

jest.mock('drizzle-orm', () => ({
  count: jest.fn(() => 'count'),
  eq: jest.fn(() => 'eq'),
}));

// Import after mocks
import { useReviewCount, useReviewCountLive } from '../useReviewCount';

describe('useReviewCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock chain
    mockWhere.mockResolvedValue([{ count: 0 }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockGetDb.mockReturnValue({ select: mockSelect });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 initially', () => {
    const { result } = renderHook(() => useReviewCount());
    expect(result.current).toBe(0);
  });

  it('fetches count from database', async () => {
    mockWhere.mockResolvedValue([{ count: 5 }]);

    const { result } = renderHook(() => useReviewCount());

    await waitFor(() => {
      expect(result.current).toBe(5);
    });
  });

  it('handles database errors gracefully', async () => {
    mockGetDb.mockImplementation(() => {
      throw new Error('Database not ready');
    });

    const { result } = renderHook(() => useReviewCount());

    // Should not throw and return 0
    expect(result.current).toBe(0);
  });

  it('polls for updates', async () => {
    mockWhere.mockResolvedValue([{ count: 3 }]);

    const { result } = renderHook(() => useReviewCount());

    await waitFor(() => {
      expect(result.current).toBe(3);
    });

    // Update mock to return different value
    mockWhere.mockResolvedValue([{ count: 7 }]);

    // Advance timer to trigger poll
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current).toBe(7);
    });
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useReviewCount());
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

describe('useReviewCountLive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns count from live query', () => {
    const { useLiveQuery } = require('drizzle-orm/expo-sqlite');
    useLiveQuery.mockReturnValue({ data: [{ count: 10 }] });

    const { result } = renderHook(() => useReviewCountLive());
    expect(result.current).toBe(10);
  });

  it('returns 0 when data is null', () => {
    const { useLiveQuery } = require('drizzle-orm/expo-sqlite');
    useLiveQuery.mockReturnValue({ data: null });

    const { result } = renderHook(() => useReviewCountLive());
    expect(result.current).toBe(0);
  });

  it('returns 0 when database throws', () => {
    mockGetDb.mockImplementation(() => {
      throw new Error('Database not ready');
    });

    const { result } = renderHook(() => useReviewCountLive());
    expect(result.current).toBe(0);
  });
});
