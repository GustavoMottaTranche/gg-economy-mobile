/**
 * Hook to get the count of transactions pending review
 *
 * This hook provides a reactive count of transactions that need review,
 * used primarily for the navigation badge on the Review tab.
 *
 * **Validates: Requirements 28, 16**
 */
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { count } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { transactions } from '../db/schema';

/**
 * Hook to get the count of transactions pending review
 *
 * Uses Drizzle's useLiveQuery for reactive updates when
 * transactions are added, reviewed, or deleted.
 *
 * @returns The count of transactions with needsReview = true
 */
export function useReviewCount(): number {
  const [reviewCount, setReviewCount] = useState(0);

  // Try to use live query if database is ready
  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const db = getDb();
        const result = await db
          .select({ count: count() })
          .from(transactions)
          .where(eq(transactions.needsReview, true));

        if (mounted && result[0]) {
          setReviewCount(result[0].count);
        }
      } catch (_error) {
        // Database might not be ready yet, that's okay
        if (__DEV__) {
          console.log('[useReviewCount] Database not ready yet');
        }
      }
    }

    fetchCount();

    // Set up polling for updates (since useLiveQuery might not work in all contexts)
    const interval = setInterval(fetchCount, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return reviewCount;
}

/**
 * Hook to get the count of transactions pending review with live updates
 *
 * This version uses Drizzle's useLiveQuery for real-time updates.
 * Use this in components that are rendered within the DatabaseProvider.
 *
 * @returns The count of transactions with needsReview = true
 */
export function useReviewCountLive(): number {
  let query;
  let dbReady = true;
  try {
    const db = getDb();
    query = db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.needsReview, true));
  } catch {
    dbReady = false;
    query = null;
  }

  // useLiveQuery is always called (hooks rule), but with null query when db is not ready
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data } = useLiveQuery(query as Parameters<typeof useLiveQuery>[0]);

  if (!dbReady) return 0;
  return data?.[0]?.count ?? 0;
}

export default useReviewCount;
