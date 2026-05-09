/**
 * Unit tests for draftStore (Zustand)
 *
 * Tests the draft state management with debounced auto-save.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  useDraftStore,
  useManualEntryDraft,
  useCategoryDraft,
  useRuleDraft,
} from '../../../src/stores/draftStore';
import { draftStorage } from '../../../src/services/draft';
import type { ManualEntryDraft, CategoryDraft, RuleDraft } from '../../../src/services/draft';

// Mock the draft storage service
jest.mock('../../../src/services/draft', () => ({
  draftStorage: {
    saveDraft: jest.fn(),
    getDraft: jest.fn(),
    clearDraft: jest.fn(),
    hasDraft: jest.fn(),
  },
}));

describe('draftStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useDraftStore.getState().reset();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('updateDraft', () => {
    it('should update draft data immediately', () => {
      const { updateDraft, getDraftData } = useDraftStore.getState();

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });

      const draft = getDraftData<ManualEntryDraft>('manual-entry');
      expect(draft?.description).toBe('Test');
    });

    it('should merge partial updates with existing data', () => {
      const { updateDraft, getDraftData } = useDraftStore.getState();

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'First' });
      updateDraft<ManualEntryDraft>('manual-entry', { amount: '100' });

      const draft = getDraftData<ManualEntryDraft>('manual-entry');
      expect(draft?.description).toBe('First');
      expect(draft?.amount).toBe('100');
    });

    it('should mark draft as dirty after update', () => {
      const { updateDraft, isDirty } = useDraftStore.getState();

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });

      expect(isDirty('manual-entry')).toBe(true);
    });

    it('should trigger debounced save after interval', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { updateDraft, setDebounceInterval } = useDraftStore.getState();
      setDebounceInterval(100); // Short interval for testing

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });

      // Should not have saved yet
      expect(draftStorage.saveDraft).not.toHaveBeenCalled();

      // Advance timers past debounce interval
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(draftStorage.saveDraft).toHaveBeenCalledWith(
        'manual-entry',
        expect.objectContaining({ description: 'Test' }),
        undefined
      );
    });

    it('should reset debounce timer on subsequent updates', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { updateDraft, setDebounceInterval } = useDraftStore.getState();
      setDebounceInterval(100);

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'First' });

      // Advance 50ms (not enough to trigger save)
      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      // Update again - should reset timer
      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Second' });

      // Advance another 50ms (total 100ms from first update, but only 50ms from second)
      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      // Should not have saved yet
      expect(draftStorage.saveDraft).not.toHaveBeenCalled();

      // Advance past the debounce interval from second update
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Now it should have saved with the latest data
      expect(draftStorage.saveDraft).toHaveBeenCalledTimes(1);
      expect(draftStorage.saveDraft).toHaveBeenCalledWith(
        'manual-entry',
        expect.objectContaining({ description: 'Second' }),
        undefined
      );
    });
  });

  describe('setDraft', () => {
    it('should set complete draft data', () => {
      const { setDraft, getDraftData } = useDraftStore.getState();

      const draft: ManualEntryDraft = {
        date: '2024-01-15',
        amount: '50.00',
        description: 'Complete draft',
        type: 'expense',
      };

      setDraft('manual-entry', draft);

      expect(getDraftData<ManualEntryDraft>('manual-entry')).toEqual(draft);
    });

    it('should replace existing draft data completely', () => {
      const { setDraft, getDraftData } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', {
        description: 'First',
        amount: '100',
      });

      setDraft<ManualEntryDraft>('manual-entry', {
        description: 'Second',
      });

      const draft = getDraftData<ManualEntryDraft>('manual-entry');
      expect(draft?.description).toBe('Second');
      expect(draft?.amount).toBeUndefined();
    });
  });

  describe('restoreDraft', () => {
    it('should restore draft from storage', async () => {
      const storedDraft = {
        formType: 'manual-entry',
        data: { description: 'Restored', amount: '200' },
        savedAt: '2024-01-15T12:00:00.000Z',
      };

      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: storedDraft,
      });

      const { restoreDraft, getDraftData } = useDraftStore.getState();

      const result = await restoreDraft<ManualEntryDraft>('manual-entry');

      expect(result).toEqual(storedDraft.data);
      expect(getDraftData<ManualEntryDraft>('manual-entry')).toEqual(storedDraft.data);
    });

    it('should return null when no draft exists', async () => {
      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: undefined,
      });

      const { restoreDraft } = useDraftStore.getState();

      const result = await restoreDraft<ManualEntryDraft>('manual-entry');

      expect(result).toBeNull();
    });

    it('should set loading state during restoration', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (draftStorage.getDraft as jest.Mock).mockReturnValue(promise);

      const { restoreDraft } = useDraftStore.getState();

      // Start restoration
      const restorePromise = restoreDraft<ManualEntryDraft>('manual-entry');

      // Check loading state
      expect(useDraftStore.getState().isLoading['manual-entry']).toBe(true);

      // Resolve the promise
      resolvePromise!({ success: true, draft: undefined });
      await restorePromise;

      // Loading should be false
      expect(useDraftStore.getState().isLoading['manual-entry']).toBe(false);
    });

    it('should handle restoration errors', async () => {
      (draftStorage.getDraft as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { restoreDraft } = useDraftStore.getState();

      const result = await restoreDraft<ManualEntryDraft>('manual-entry');

      expect(result).toBeNull();
      expect(useDraftStore.getState().drafts['manual-entry']?.error).toBe('Storage error');
    });
  });

  describe('clearDraft', () => {
    it('should clear draft from state and storage', async () => {
      (draftStorage.clearDraft as jest.Mock).mockResolvedValue({ success: true });

      const { setDraft, clearDraft, getDraftData } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'To be cleared' });
      await clearDraft('manual-entry');

      expect(getDraftData<ManualEntryDraft>('manual-entry')).toBeNull();
      expect(draftStorage.clearDraft).toHaveBeenCalledWith('manual-entry', undefined);
    });

    it('should clear draft with formId', async () => {
      (draftStorage.clearDraft as jest.Mock).mockResolvedValue({ success: true });

      const { setDraft, clearDraft } = useDraftStore.getState();

      setDraft<CategoryDraft>('category-edit', { name: 'Test' }, 'cat-123');
      await clearDraft('category-edit', 'cat-123');

      expect(draftStorage.clearDraft).toHaveBeenCalledWith('category-edit', 'cat-123');
    });

    it('should cancel pending debounced save', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({ success: true });
      (draftStorage.clearDraft as jest.Mock).mockResolvedValue({ success: true });

      const { updateDraft, clearDraft, setDebounceInterval } = useDraftStore.getState();
      setDebounceInterval(100);

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });

      // Clear before debounce triggers
      await clearDraft('manual-entry');

      // Advance past debounce interval
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // Save should not have been called
      expect(draftStorage.saveDraft).not.toHaveBeenCalled();
    });
  });

  describe('saveDraftNow', () => {
    it('should save draft immediately', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { setDraft, saveDraftNow } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'Immediate save' });

      // Don't wait for debounce
      await saveDraftNow<ManualEntryDraft>('manual-entry');

      expect(draftStorage.saveDraft).toHaveBeenCalled();
    });

    it('should not save if draft is not dirty', async () => {
      const { saveDraftNow } = useDraftStore.getState();

      await saveDraftNow<ManualEntryDraft>('manual-entry');

      expect(draftStorage.saveDraft).not.toHaveBeenCalled();
    });

    it('should update lastSavedAt on successful save', async () => {
      const savedAt = '2024-01-15T14:30:00.000Z';
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt },
      });

      const { setDraft, saveDraftNow } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });
      await saveDraftNow<ManualEntryDraft>('manual-entry');

      expect(useDraftStore.getState().drafts['manual-entry']?.lastSavedAt).toBe(savedAt);
    });

    it('should set error on failed save', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Save failed',
      });

      const { setDraft, saveDraftNow } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });
      await saveDraftNow<ManualEntryDraft>('manual-entry');

      expect(useDraftStore.getState().drafts['manual-entry']?.error).toBe('Save failed');
    });
  });

  describe('isDirty', () => {
    it('should return false for non-existent draft', () => {
      const { isDirty } = useDraftStore.getState();
      expect(isDirty('manual-entry')).toBe(false);
    });

    it('should return true after update', () => {
      const { updateDraft, isDirty } = useDraftStore.getState();

      updateDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });

      expect(isDirty('manual-entry')).toBe(true);
    });

    it('should return false after successful save', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { setDraft, saveDraftNow, isDirty } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });
      expect(isDirty('manual-entry')).toBe(true);

      await saveDraftNow<ManualEntryDraft>('manual-entry');
      expect(isDirty('manual-entry')).toBe(false);
    });
  });

  describe('setDebounceInterval', () => {
    it('should update debounce interval', () => {
      const { setDebounceInterval } = useDraftStore.getState();

      setDebounceInterval(5000);

      expect(useDraftStore.getState().debounceInterval).toBe(5000);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { setDraft, reset } = useDraftStore.getState();

      setDraft<ManualEntryDraft>('manual-entry', { description: 'Test' });
      reset();

      expect(useDraftStore.getState().drafts).toEqual({});
      expect(useDraftStore.getState().isLoading).toEqual({});
      expect(useDraftStore.getState().debounceInterval).toBe(2000);
    });
  });
});

describe('Selector hooks', () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('useManualEntryDraft', () => {
    it('should return manual entry draft state', () => {
      useDraftStore.getState().setDraft<ManualEntryDraft>('manual-entry', {
        description: 'Test',
        amount: '100',
      });

      const { result } = renderHook(() => useManualEntryDraft());

      expect(result.current.draft?.description).toBe('Test');
      expect(result.current.draft?.amount).toBe('100');
    });

    it('should provide update function', () => {
      const { result } = renderHook(() => useManualEntryDraft());

      act(() => {
        result.current.updateDraft({ description: 'Updated' });
      });

      expect(result.current.draft?.description).toBe('Updated');
    });
  });

  describe('useCategoryDraft', () => {
    it('should return category create draft when no formId', () => {
      useDraftStore.getState().setDraft<CategoryDraft>('category-create', {
        name: 'New Category',
        type: 'expense',
      });

      const { result } = renderHook(() => useCategoryDraft());

      expect(result.current.draft?.name).toBe('New Category');
    });

    it('should return category edit draft with formId', () => {
      useDraftStore
        .getState()
        .setDraft<CategoryDraft>('category-edit', { name: 'Edited Category' }, 'cat-123');

      const { result } = renderHook(() => useCategoryDraft('cat-123'));

      expect(result.current.draft?.name).toBe('Edited Category');
    });
  });

  describe('useRuleDraft', () => {
    it('should return rule create draft when no formId', () => {
      useDraftStore.getState().setDraft<RuleDraft>('rule-create', {
        pattern: 'UBER',
        matchType: 'contains',
      });

      const { result } = renderHook(() => useRuleDraft());

      expect(result.current.draft?.pattern).toBe('UBER');
    });

    it('should return rule edit draft with formId', () => {
      useDraftStore
        .getState()
        .setDraft<RuleDraft>('rule-edit', { pattern: 'EDITED', priority: 5 }, 'rule-456');

      const { result } = renderHook(() => useRuleDraft('rule-456'));

      expect(result.current.draft?.pattern).toBe('EDITED');
      expect(result.current.draft?.priority).toBe(5);
    });
  });
});
