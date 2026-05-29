import fc from 'fast-check';
import { useBatchSessionStore } from '../../services/batch/BatchSessionManager';

/**
 * Property 6: Batch entry category and type derivation
 *
 * For any session with category type T (income or expense), every transaction
 * created during that session SHALL have categoryId equal to the session's
 * category and the amount sign consistent with type T.
 *
 * After startSession(categoryId, categoryType):
 * - The store's categoryId matches the input categoryId
 * - The store's categoryType matches the input categoryType
 * - After incrementCount(amount), the session maintains the same categoryId and categoryType
 *
 * **Validates: Requirements 5.2, 6.1**
 */
describe('Property 6: Batch entry category and type derivation', () => {
  beforeEach(() => {
    useBatchSessionStore.getState().reset();
  });

  it('store categoryId matches the input categoryId after startSession', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.string({ minLength: 1, maxLength: 100 }),
        (categoryId, categoryType, title) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          const state = useBatchSessionStore.getState();
          expect(state.categoryId).toBe(categoryId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('store categoryType matches the input categoryType after startSession', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.string({ minLength: 1, maxLength: 100 }),
        (categoryId, categoryType, title) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          const state = useBatchSessionStore.getState();
          expect(state.categoryType).toBe(categoryType);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('session maintains categoryId and categoryType after incrementCount', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.integer({ min: 1, max: 99999999999 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (categoryId, categoryType, amount, title) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);
          store.incrementCount(amount);

          const state = useBatchSessionStore.getState();
          expect(state.categoryId).toBe(categoryId);
          expect(state.categoryType).toBe(categoryType);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('session maintains categoryId and categoryType after multiple incrementCount calls', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.constant('income' as const), fc.constant('expense' as const)),
        fc.array(fc.integer({ min: 1, max: 99999999 }), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (categoryId, categoryType, amounts, title) => {
          const store = useBatchSessionStore.getState();
          store.startSession(categoryId, categoryType, title);

          for (const amount of amounts) {
            store.incrementCount(amount);
          }

          const state = useBatchSessionStore.getState();
          expect(state.categoryId).toBe(categoryId);
          expect(state.categoryType).toBe(categoryType);
        },
      ),
      { numRuns: 100 },
    );
  });
});
