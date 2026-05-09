/**
 * Unit tests for DraftStorage service
 *
 * Tests the secure storage operations for form drafts.
 */
import {
  DraftStorage,
  type ManualEntryDraft,
  type CategoryDraft,
  type RuleDraft,
} from '../../../../src/services/draft';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('DraftStorage', () => {
  let draftStorage: DraftStorage;

  beforeEach(() => {
    draftStorage = new DraftStorage();
    jest.clearAllMocks();
  });

  describe('saveDraft', () => {
    it('should save a manual entry draft successfully', async () => {
      const draft: ManualEntryDraft = {
        date: '2024-01-15',
        amount: '100.50',
        description: 'Test transaction',
        categoryId: 'cat-123',
        referenceMonth: '2024-01',
        type: 'expense',
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.saveDraft('manual-entry', draft);

      expect(result.success).toBe(true);
      expect(result.draft).toBeDefined();
      expect(result.draft?.formType).toBe('manual-entry');
      expect(result.draft?.data).toEqual(draft);
      expect(result.draft?.savedAt).toBeDefined();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'draft_manual-entry',
        expect.any(String)
      );
    });

    it('should save a category draft with formId', async () => {
      const draft: CategoryDraft = {
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        color: '#FF5733',
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.saveDraft('category-edit', draft, 'cat-456');

      expect(result.success).toBe(true);
      expect(result.draft?.formId).toBe('cat-456');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'draft_category-edit_cat-456',
        expect.any(String)
      );
    });

    it('should save a rule draft successfully', async () => {
      const draft: RuleDraft = {
        pattern: 'UBER',
        categoryId: 'cat-transport',
        matchType: 'contains',
        priority: 10,
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.saveDraft('rule-create', draft);

      expect(result.success).toBe(true);
      expect(result.draft?.data).toEqual(draft);
    });

    it('should return error for invalid draft data (null)', async () => {
      const result = await draftStorage.saveDraft(
        'manual-entry',
        null as unknown as ManualEntryDraft
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid draft data: must be a non-null object');
    });

    it('should return error for invalid draft data (array)', async () => {
      const result = await draftStorage.saveDraft(
        'manual-entry',
        [] as unknown as ManualEntryDraft
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid draft data: must be a non-null object');
    });

    it('should handle SecureStore errors gracefully', async () => {
      const draft: ManualEntryDraft = { description: 'Test' };
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const result = await draftStorage.saveDraft('manual-entry', draft);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');
    });

    it('should include timestamp in saved draft', async () => {
      const draft: ManualEntryDraft = { description: 'Test' };
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const beforeSave = new Date().toISOString();
      const result = await draftStorage.saveDraft('manual-entry', draft);
      const afterSave = new Date().toISOString();

      expect(result.draft?.savedAt).toBeDefined();
      expect(result.draft!.savedAt >= beforeSave).toBe(true);
      expect(result.draft!.savedAt <= afterSave).toBe(true);
    });
  });

  describe('getDraft', () => {
    it('should retrieve a saved draft successfully', async () => {
      const storedDraft = {
        formType: 'manual-entry',
        data: {
          date: '2024-01-15',
          amount: '50.00',
          description: 'Lunch',
        },
        savedAt: '2024-01-15T12:00:00.000Z',
      };

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(storedDraft));

      const result = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

      expect(result.success).toBe(true);
      expect(result.draft).toEqual(storedDraft);
    });

    it('should return undefined draft when no draft exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await draftStorage.getDraft('manual-entry');

      expect(result.success).toBe(true);
      expect(result.draft).toBeUndefined();
    });

    it('should retrieve draft with formId', async () => {
      const storedDraft = {
        formType: 'category-edit',
        data: { name: 'Updated Category' },
        savedAt: '2024-01-15T12:00:00.000Z',
        formId: 'cat-789',
      };

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(storedDraft));

      const result = await draftStorage.getDraft<CategoryDraft>('category-edit', 'cat-789');

      expect(result.success).toBe(true);
      expect(result.draft?.formId).toBe('cat-789');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('draft_category-edit_cat-789');
    });

    it('should return error for invalid stored draft structure', async () => {
      const invalidDraft = { invalid: 'structure' };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(invalidDraft));

      const result = await draftStorage.getDraft('manual-entry');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid stored draft structure');
    });

    it('should handle JSON parse errors', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid json{');

      const result = await draftStorage.getDraft('manual-entry');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const result = await draftStorage.getDraft('manual-entry');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('clearDraft', () => {
    it('should clear a draft successfully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.clearDraft('manual-entry');

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('draft_manual-entry');
    });

    it('should clear a draft with formId', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.clearDraft('category-edit', 'cat-123');

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('draft_category-edit_cat-123');
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await draftStorage.clearDraft('manual-entry');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('hasDraft', () => {
    it('should return true when draft exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{"some": "data"}');

      const result = await draftStorage.hasDraft('manual-entry');

      expect(result).toBe(true);
    });

    it('should return false when draft does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await draftStorage.hasDraft('manual-entry');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await draftStorage.hasDraft('manual-entry');

      expect(result).toBe(false);
    });

    it('should check with formId', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{"data": "exists"}');

      const result = await draftStorage.hasDraft('rule-edit', 'rule-456');

      expect(result).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('draft_rule-edit_rule-456');
    });
  });

  describe('clearAllDraftsForType', () => {
    it('should clear base draft for form type', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await draftStorage.clearAllDraftsForType('manual-entry');

      expect(result.success).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('draft_manual-entry');
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('Clear failed'));

      const result = await draftStorage.clearAllDraftsForType('category-create');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear failed');
    });
  });

  describe('round-trip operations', () => {
    it('should preserve data through save and get cycle', async () => {
      const originalDraft: ManualEntryDraft = {
        date: '2024-03-20',
        amount: '1234.56',
        description: 'Complete transaction with all fields',
        categoryId: 'cat-food',
        referenceMonth: '2024-03',
        type: 'expense',
      };

      let storedValue: string | null = null;

      (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_key, value) => {
        storedValue = value;
      });

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async () => storedValue);

      // Save the draft
      const saveResult = await draftStorage.saveDraft('manual-entry', originalDraft);
      expect(saveResult.success).toBe(true);

      // Retrieve the draft
      const getResult = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');
      expect(getResult.success).toBe(true);
      expect(getResult.draft?.data).toEqual(originalDraft);
    });

    it('should preserve empty string values', async () => {
      const draftWithEmptyStrings: ManualEntryDraft = {
        date: '',
        amount: '',
        description: '',
        categoryId: null,
        referenceMonth: '',
        type: 'income',
      };

      let storedValue: string | null = null;

      (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_key, value) => {
        storedValue = value;
      });

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async () => storedValue);

      await draftStorage.saveDraft('manual-entry', draftWithEmptyStrings);
      const result = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

      expect(result.draft?.data).toEqual(draftWithEmptyStrings);
    });

    it('should preserve special characters in description', async () => {
      const draftWithSpecialChars: ManualEntryDraft = {
        description: 'Test with "quotes", \'apostrophes\', and émojis 🎉',
        amount: '100',
      };

      let storedValue: string | null = null;

      (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (_key, value) => {
        storedValue = value;
      });

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async () => storedValue);

      await draftStorage.saveDraft('manual-entry', draftWithSpecialChars);
      const result = await draftStorage.getDraft<ManualEntryDraft>('manual-entry');

      expect(result.draft?.data.description).toBe(draftWithSpecialChars.description);
    });
  });
});
