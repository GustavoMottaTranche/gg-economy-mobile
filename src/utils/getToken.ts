/**
 * Token fallback utility for the design system.
 *
 * Safely retrieves a design token value from an object, returning a fallback
 * if the key doesn't exist. In development mode, logs a warning to help
 * developers catch typos or version mismatches early.
 *
 * **Validates: Requirements 10.5, 10.6**
 */

/**
 * Retrieves a value from a token object by key, with a fallback for missing tokens.
 *
 * @param obj - The token object to look up (e.g., colors.background, spacing)
 * @param key - The token key to retrieve
 * @param fallback - The value to return if the key is not found
 * @returns The token value if found, otherwise the fallback
 *
 * @example
 * ```ts
 * import { getToken } from '../utils/getToken';
 * import { spacing } from '../constants/theme';
 *
 * const gap = getToken(spacing, 'md', 12); // returns 12 from spacing.md
 * const missing = getToken(spacing, 'huge', 64); // returns 64 fallback + warns in __DEV__
 * ```
 */
export function getToken<T>(
  obj: Record<string, T>,
  key: string,
  fallback: T
): T {
  if (key in obj) {
    return obj[key] as T;
  }
  if (__DEV__) {
    console.warn(`[Theme] Token "${key}" not found, using fallback`);
  }
  return fallback;
}
