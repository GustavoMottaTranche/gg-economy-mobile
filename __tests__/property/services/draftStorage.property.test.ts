/**
 * Property-Based Test: Draft Storage Round-Trip (Property 13)
 *
 * **Validates: Requirements 24.1-24.4**
 *
 * Property: For any valid form data, saving to draft storage and then
 * restoring SHALL produce form data equivalent to the original.
 */
import * as fc from 'fast-check';
import {
  DraftStorage,
  type ManualEntryDraft,
  type CategoryDraft,
  type RuleDraft,
  type DraftFormType,
} from '../../../src/services/draft';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store with in-memory storage
jest.mock('expo-secure-store', () => {
  const storage = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return storage.get(key) ?? null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      storage.delete(key);
    }),
    __clearStorage: () => storage.clear(),
    __getStorage: () => storage,
  };
});

describe('Property 13: Draft Storage Round-Trip', () => {
  let draftStorage: DraftStorage;

  beforeEach(() => {
    draftStorage = new DraftStorage();
    // Clear the mock storage
    (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();
  });

  /**
   * Arbitrary for ManualEntryDraft
   */
  const manualEntryDraftArb = fc.record({
    date: fc.option(
      fc
        .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true })
        .map((d) => d.toISOString().split('T')[0]),
      { nil: undefined }
    ),
    amount: fc.option(
      fc.oneof(
        fc.integer({ min: -1000000, max: 1000000 }).map(String),
        fc.double({ min: -1000000, max: 1000000, noNaN: true }).map((n) => n.toFixed(2))
      ),
      { nil: undefined }
    ),
    description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    categoryId: fc.option(fc.oneof(fc.uuid(), fc.constant(null)), { nil: undefined }),
    referenceMonth: fc.option(
      fc
        .tuple(fc.integer({ min: 2000, max: 2100 }), fc.integer({ min: 1, max: 12 }))
        .map(([year, month]) => `${year}-${month.toString().padStart(2, '0')}`),
      { nil: undefined }
    ),
    type: fc.option(fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>, {
      nil: undefined,
    }),
  });

  /**
   * Arbitrary for hex color string
   */
  const hexColorArb = fc
    .array(
      fc.constantFrom(
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F'
      ),
      {
        minLength: 6,
        maxLength: 6,
      }
    )
    .map((chars) => `#${chars.join('')}`);

  /**
   * Arbitrary for CategoryDraft
   */
  const categoryDraftArb = fc.record({
    name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
    type: fc.option(fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>, {
      nil: undefined,
    }),
    icon: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
    color: fc.option(hexColorArb, { nil: undefined }),
  });

  /**
   * Arbitrary for RuleDraft
   */
  const ruleDraftArb = fc.record({
    pattern: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
    categoryId: fc.option(fc.uuid(), { nil: undefined }),
    matchType: fc.option(
      fc.constantFrom('contains', 'starts_with', 'ends_with', 'exact', 'regex') as fc.Arbitrary<
        'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex'
      >,
      { nil: undefined }
    ),
    priority: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
  });

  /**
   * Helper to filter out undefined values for comparison
   * (JSON serialization removes undefined values)
   */
  function normalizeForComparison<T extends object>(obj: T): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result as T;
  }

  /**
   * Property: ManualEntryDraft round-trip preserves data
   */
  it('should preserve ManualEntryDraft data through save and restore cycle', async () => {
    await fc.assert(
      fc.asyncProperty(manualEntryDraftArb, async (originalDraft) => {
        // Clear storage before each iteration
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        // Save the draft
        const saveResult = await draftStorage.saveDraft<ManualEntryDraft>(
          'manual-entry',
          originalDraft
        );
        expect(saveResult.success).toBe(true);

        // Restore the draft
        const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');
        expect(getResult.success).toBe(true);
        expect(getResult.draft).toBeDefined();

        // Compare normalized data (JSON removes undefined values)
        const normalizedOriginal = normalizeForComparison(originalDraft);
        const normalizedRestored = normalizeForComparison(getResult.draft!.data);

        expect(normalizedRestored).toEqual(normalizedOriginal);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: CategoryDraft round-trip preserves data
   */
  it('should preserve CategoryDraft data through save and restore cycle', async () => {
    await fc.assert(
      fc.asyncProperty(categoryDraftArb, async (originalDraft) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const saveResult = await draftStorage.saveDraft<CategoryDraft>(
          'category-create',
          originalDraft
        );
        expect(saveResult.success).toBe(true);

        const getResult = await draftStorage.getDraft<CategoryDraft>('category-create');
        expect(getResult.success).toBe(true);

        const normalizedOriginal = normalizeForComparison(originalDraft);
        const normalizedRestored = normalizeForComparison(getResult.draft!.data);

        expect(normalizedRestored).toEqual(normalizedOriginal);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: RuleDraft round-trip preserves data
   */
  it('should preserve RuleDraft data through save and restore cycle', async () => {
    await fc.assert(
      fc.asyncProperty(ruleDraftArb, async (originalDraft) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const saveResult = await draftStorage.saveDraft<RuleDraft>('rule-create', originalDraft);
        expect(saveResult.success).toBe(true);

        const getResult = await draftStorage.getDraft<RuleDraft>('rule-create');
        expect(getResult.success).toBe(true);

        const normalizedOriginal = normalizeForComparison(originalDraft);
        const normalizedRestored = normalizeForComparison(getResult.draft!.data);

        expect(normalizedRestored).toEqual(normalizedOriginal);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Draft with formId round-trip preserves data and formId
   */
  it('should preserve draft data and formId through save and restore cycle', async () => {
    await fc.assert(
      fc.asyncProperty(categoryDraftArb, fc.uuid(), async (originalDraft, formId) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const saveResult = await draftStorage.saveDraft<CategoryDraft>(
          'category-edit',
          originalDraft,
          formId
        );
        expect(saveResult.success).toBe(true);
        expect(saveResult.draft?.formId).toBe(formId);

        const getResult = await draftStorage.getDraft<CategoryDraft>('category-edit', formId);
        expect(getResult.success).toBe(true);
        expect(getResult.draft?.formId).toBe(formId);

        const normalizedOriginal = normalizeForComparison(originalDraft);
        const normalizedRestored = normalizeForComparison(getResult.draft!.data);

        expect(normalizedRestored).toEqual(normalizedOriginal);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple drafts with different formIds are isolated
   */
  it('should isolate drafts with different formIds', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryDraftArb,
        categoryDraftArb,
        fc.uuid(),
        fc.uuid().filter((id2) => true), // Different UUIDs
        async (draft1, draft2, formId1, formId2) => {
          // Ensure different formIds
          if (formId1 === formId2) return;

          (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

          // Save both drafts
          await draftStorage.saveDraft<CategoryDraft>('category-edit', draft1, formId1);
          await draftStorage.saveDraft<CategoryDraft>('category-edit', draft2, formId2);

          // Restore and verify isolation
          const result1 = await draftStorage.getDraft<CategoryDraft>('category-edit', formId1);
          const result2 = await draftStorage.getDraft<CategoryDraft>('category-edit', formId2);

          expect(normalizeForComparison(result1.draft!.data)).toEqual(
            normalizeForComparison(draft1)
          );
          expect(normalizeForComparison(result2.draft!.data)).toEqual(
            normalizeForComparison(draft2)
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Clearing a draft removes it completely
   */
  it('should completely remove draft after clearing', async () => {
    await fc.assert(
      fc.asyncProperty(manualEntryDraftArb, async (originalDraft) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        // Save the draft
        await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', originalDraft);

        // Verify it exists
        const beforeClear = await draftStorage.hasDraft('manual-entry');
        expect(beforeClear).toBe(true);

        // Clear the draft
        const clearResult = await draftStorage.clearDraft('manual-entry');
        expect(clearResult.success).toBe(true);

        // Verify it's gone
        const afterClear = await draftStorage.hasDraft('manual-entry');
        expect(afterClear).toBe(false);

        const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');
        expect(getResult.draft).toBeUndefined();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Overwriting a draft replaces the previous data
   */
  it('should replace previous draft data when saving again', async () => {
    await fc.assert(
      fc.asyncProperty(
        manualEntryDraftArb,
        manualEntryDraftArb,
        async (firstDraft, secondDraft) => {
          (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

          // Save first draft
          await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', firstDraft);

          // Save second draft (overwrite)
          await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', secondDraft);

          // Restore and verify it's the second draft
          const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

          const normalizedSecond = normalizeForComparison(secondDraft);
          const normalizedRestored = normalizeForComparison(getResult.draft!.data);

          expect(normalizedRestored).toEqual(normalizedSecond);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Special characters in strings are preserved
   */
  it('should preserve special characters in draft data', async () => {
    const specialStringArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.constant('"quotes"'),
      fc.constant("'apostrophes'"),
      fc.constant('back\\slash'),
      fc.constant('new\nline'),
      fc.constant('tab\there'),
      fc.constant('carriage\rreturn'),
      fc.constant('slash/forward'),
      fc.constant('<angle>brackets'),
      fc.constant('ampersand&symbol'),
      fc.constant('emoji🎉test'),
      fc.constant('unicode: café, naïve, 日本語')
    );

    await fc.assert(
      fc.asyncProperty(specialStringArb, async (specialString) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const draft: ManualEntryDraft = {
          description: specialString,
        };

        await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', draft);
        const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

        expect(getResult.draft!.data.description).toBe(specialString);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Numeric precision is preserved for amounts
   */
  it('should preserve numeric precision in amount strings', async () => {
    const amountArb = fc
      .double({
        min: -999999.99,
        max: 999999.99,
        noNaN: true,
        noDefaultInfinity: true,
      })
      .map((n) => n.toFixed(2));

    await fc.assert(
      fc.asyncProperty(amountArb, async (amount) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const draft: ManualEntryDraft = { amount };

        await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', draft);
        const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

        expect(getResult.draft!.data.amount).toBe(amount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: savedAt timestamp is always set and valid
   */
  it('should always set a valid savedAt timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(manualEntryDraftArb, async (draft) => {
        (SecureStore as unknown as { __clearStorage: () => void }).__clearStorage();

        const beforeSave = new Date();
        const saveResult = await draftStorage.saveDraft<ManualEntryDraft>('manual-entry', draft);
        const afterSave = new Date();

        expect(saveResult.draft?.savedAt).toBeDefined();

        const savedAt = new Date(saveResult.draft!.savedAt);
        expect(savedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
        expect(savedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      }),
      { numRuns: 50 }
    );
  });
});
