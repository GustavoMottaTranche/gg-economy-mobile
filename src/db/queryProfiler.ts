/**
 * Database Query Profiler
 *
 * Utilities for profiling and optimizing database queries.
 * Use in development to identify slow queries.
 *
 * **Validates: Requirements 36**
 */

/**
 * Query timing result
 */
export interface QueryTiming {
  queryName: string;
  durationMs: number;
  timestamp: Date;
  rowCount?: number;
}

/**
 * Query profiler configuration
 */
export interface ProfilerConfig {
  /** Enable profiling (default: false in production) */
  enabled: boolean;
  /** Log queries slower than this threshold (ms) */
  slowQueryThreshold: number;
  /** Maximum number of timings to keep in history */
  maxHistorySize: number;
}

/**
 * Default profiler configuration
 */
const DEFAULT_CONFIG: ProfilerConfig = {
  enabled: __DEV__,
  slowQueryThreshold: 100, // 100ms
  maxHistorySize: 100,
};

/**
 * Query profiler singleton
 */
class QueryProfiler {
  private config: ProfilerConfig;
  private history: QueryTiming[] = [];

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update profiler configuration
   */
  configure(config: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Profile a query execution
   *
   * @param queryName - Name/description of the query
   * @param queryFn - Async function that executes the query
   * @returns Query result
   *
   * @example
   * ```ts
   * const result = await profiler.profile('getTransactionsByMonth', async () => {
   *   return db.select().from(transactions).where(eq(transactions.referenceMonth, '2024-06'));
   * });
   * ```
   */
  async profile<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return queryFn();
    }

    const startTime = performance.now();
    const result = await queryFn();
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const timing: QueryTiming = {
      queryName,
      durationMs,
      timestamp: new Date(),
      rowCount: Array.isArray(result) ? result.length : undefined,
    };

    this.recordTiming(timing);

    if (durationMs > this.config.slowQueryThreshold) {
      console.warn(
        `[QueryProfiler] Slow query detected: "${queryName}" took ${durationMs.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Profile a synchronous query execution
   */
  profileSync<T>(queryName: string, queryFn: () => T): T {
    if (!this.config.enabled) {
      return queryFn();
    }

    const startTime = performance.now();
    const result = queryFn();
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const timing: QueryTiming = {
      queryName,
      durationMs,
      timestamp: new Date(),
      rowCount: Array.isArray(result) ? result.length : undefined,
    };

    this.recordTiming(timing);

    if (durationMs > this.config.slowQueryThreshold) {
      console.warn(
        `[QueryProfiler] Slow query detected: "${queryName}" took ${durationMs.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Record a timing in history
   */
  private recordTiming(timing: QueryTiming): void {
    this.history.push(timing);

    // Trim history if needed
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * Get query timing history
   */
  getHistory(): QueryTiming[] {
    return [...this.history];
  }

  /**
   * Get slow queries from history
   */
  getSlowQueries(): QueryTiming[] {
    return this.history.filter((t) => t.durationMs > this.config.slowQueryThreshold);
  }

  /**
   * Get average query time by name
   */
  getAverageTime(queryName: string): number | null {
    const timings = this.history.filter((t) => t.queryName === queryName);
    if (timings.length === 0) return null;

    const total = timings.reduce((sum, t) => sum + t.durationMs, 0);
    return total / timings.length;
  }

  /**
   * Get query statistics
   */
  getStats(): {
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
    maxTime: number;
    minTime: number;
  } {
    if (this.history.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: 0,
      };
    }

    const times = this.history.map((t) => t.durationMs);
    const total = times.reduce((sum, t) => sum + t, 0);

    return {
      totalQueries: this.history.length,
      slowQueries: this.getSlowQueries().length,
      averageTime: total / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Print stats to console
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('[QueryProfiler] Statistics:');
    console.log(`  Total queries: ${stats.totalQueries}`);
    console.log(`  Slow queries: ${stats.slowQueries}`);
    console.log(`  Average time: ${stats.averageTime.toFixed(2)}ms`);
    console.log(`  Max time: ${stats.maxTime.toFixed(2)}ms`);
    console.log(`  Min time: ${stats.minTime.toFixed(2)}ms`);
  }
}

/**
 * Global query profiler instance
 */
export const queryProfiler = new QueryProfiler();

/**
 * Convenience function to profile a query
 */
export async function profileQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  return queryProfiler.profile(queryName, queryFn);
}

/**
 * Convenience function to profile a sync query
 */
export function profileQuerySync<T>(queryName: string, queryFn: () => T): T {
  return queryProfiler.profileSync(queryName, queryFn);
}

/**
 * Query optimization recommendations
 */
export const QUERY_OPTIMIZATION_TIPS = {
  /**
   * Use indexes for frequently queried columns
   */
  useIndexes: `
    Ensure indexes exist for:
    - transactions.reference_month (monthly views)
    - transactions.date (sorting, pagination)
    - transactions.needs_review (review queue)
    - transactions.category_id (category filtering)
  `,

  /**
   * Use pagination for large result sets
   */
  usePagination: `
    For lists with 100+ items:
    - Use cursor-based pagination (date + id)
    - Load 50 items per page
    - Implement infinite scroll
  `,

  /**
   * Avoid N+1 queries
   */
  avoidNPlusOne: `
    Use JOINs instead of separate queries:
    - Join transactions with categories
    - Join rules with categories
    - Use Drizzle relations
  `,

  /**
   * Use Live Queries for reactive data
   */
  useLiveQueries: `
    Drizzle Live Queries provide:
    - Automatic updates on data changes
    - No manual polling needed
    - Efficient subscriptions
  `,

  /**
   * Batch operations
   */
  batchOperations: `
    For bulk operations:
    - Use transactions for atomicity
    - Batch inserts/updates
    - Avoid individual queries in loops
  `,
};
