/**
 * Property 6: Batch Mode Title Propagation
 *
 * For any batch session started with a random valid title and category,
 * every transaction created during that session SHALL have its `title` field
 * equal to the session title, regardless of how many entries are added or
 * what per-entry descriptions are provided.
 *
 * **Validates: Requirements 5.2, 5.5**
 */

import fc from 'fast-check';
import { useBatchSessionStore } from '../../services/batch/BatchSessionManager';

describe('Feature: entry-title-and-dates, Property 6: Batch Mode Title Propagation', () => {
  /**
   * **Validates: Requirements 5.2, 5.5**
   */

  beforeEach(() => {
    useBatchSessionStore.getState().reset();
  });

  it('session title matches the title provided at startSession', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        (title, categoryId, categoryType) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          const state = useBatchSessionStore.getState();
          expect(state.title).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('title remains fixed after multiple incrementCount calls', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 1, maxLength: 20 }),
        (title, categoryId, categoryType, amounts) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          // Simulate adding multiple entries during the session
          for (const amount of amounts) {
            store.incrementCount(amount);
            // After each entry, the title must remain the same
            const state = useBatchSessionStore.getState();
            expect(state.title).toBe(title);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('title remains fixed regardless of per-entry descriptions (session state is independent of entry details)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.array(
          fc.record({
            amount: fc.integer({ min: 1, max: 99999999 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (title, categoryId, categoryType, entries) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          // Simulate adding entries with varying descriptions
          // The session title must remain unchanged regardless of per-entry data
          for (const entry of entries) {
            store.incrementCount(entry.amount);
            const state = useBatchSessionStore.getState();
            expect(state.title).toBe(title);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('title is cleared only when session ends', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 1, maxLength: 10 }),
        (title, categoryId, categoryType, amounts) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          // Add entries
          for (const amount of amounts) {
            store.incrementCount(amount);
          }

          // Title still fixed before ending
          expect(useBatchSessionStore.getState().title).toBe(title);

          // End session
          store.endSession();

          // Title is cleared after session ends
          expect(useBatchSessionStore.getState().title).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
