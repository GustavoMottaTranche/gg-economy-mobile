/**
 * Unit tests for useDraftStorage hook
 *
 * Tests the custom hook for managing form drafts with debounced auto-save.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDraftStorage } from '../../../src/hooks/useDraftStorage';
import { useDraftStore } from '../../../src/stores/draftStore';
import { draftStorage } from '../../../src/services/draft';
import type { ManualEntryDraft } from '../../../src/services/draft';

// Mock the draft storage service
jest.mock('../../../src/services/draft', () => ({
  draftStorage: {
    saveDraft: jest.fn(),
    getDraft: jest.fn(),
    clearDraft: jest.fn(),
    hasDraft: jest.fn(),
  },
}));

describe('useDraftStorage', () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: undefined,
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      expect(result.current.draft).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should auto-restore draft on mount when autoRestore is true', async () => {
      const storedDraft = {
        formType: 'manual-entry',
        data: { description: 'Restored draft' },
        savedAt: '2024-01-15T12:00:00.000Z',
      };

      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: storedDraft,
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: true })
      );

      await waitFor(() => {
        expect(result.current.draft?.description).toBe('Restored draft');
      });
    });

    it('should not auto-restore when autoRestore is false', async () => {
      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      // Wait a bit to ensure no restoration happens
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(draftStorage.getDraft).not.toHaveBeenCalled();
      expect(result.current.draft).toBeNull();
    });
  });

  describe('updateDraft', () => {
    it('should update draft data', () => {
      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: undefined,
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      act(() => {
        result.current.updateDraft({ description: 'Updated' });
      });

      expect(result.current.draft?.description).toBe('Updated');
      expect(result.current.isDirty).toBe(true);
    });

    it('should merge partial updates', () => {
      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      act(() => {
        result.current.updateDraft({ description: 'First' });
      });

      act(() => {
        result.current.updateDraft({ amount: '100' });
      });

      expect(result.current.draft?.description).toBe('First');
      expect(result.current.draft?.amount).toBe('100');
    });
  });

  describe('setDraft', () => {
    it('should set complete draft data', () => {
      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      const completeDraft: ManualEntryDraft = {
        date: '2024-01-15',
        amount: '50.00',
        description: 'Complete draft',
        type: 'expense',
      };

      act(() => {
        result.current.setDraft(completeDraft);
      });

      expect(result.current.draft).toEqual(completeDraft);
    });
  });

  describe('clearDraft', () => {
    it('should clear draft', async () => {
      (draftStorage.clearDraft as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      act(() => {
        result.current.updateDraft({ description: 'To be cleared' });
      });

      expect(result.current.draft?.description).toBe('To be cleared');

      await act(async () => {
        await result.current.clearDraft();
      });

      expect(result.current.draft).toBeNull();
      expect(draftStorage.clearDraft).toHaveBeenCalledWith('manual-entry', undefined);
    });

    it('should call onClear callback', async () => {
      (draftStorage.clearDraft as jest.Mock).mockResolvedValue({ success: true });
      const onClear = jest.fn();

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
          autoRestore: false,
          onClear,
        })
      );

      act(() => {
        result.current.updateDraft({ description: 'Test' });
      });

      await act(async () => {
        await result.current.clearDraft();
      });

      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('saveNow', () => {
    it('should save draft immediately', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      act(() => {
        result.current.updateDraft({ description: 'Immediate save' });
      });

      await act(async () => {
        await result.current.saveNow();
      });

      expect(draftStorage.saveDraft).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should manually restore draft', async () => {
      const storedDraft = {
        formType: 'manual-entry',
        data: { description: 'Manually restored' },
        savedAt: '2024-01-15T12:00:00.000Z',
      };

      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: storedDraft,
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, { autoRestore: false })
      );

      let restoredData: ManualEntryDraft | null | undefined = null;
      await act(async () => {
        restoredData = await result.current.restore();
      });

      expect((restoredData as ManualEntryDraft | null)?.description).toBe('Manually restored');
      expect(result.current.draft?.description).toBe('Manually restored');
    });

    it('should call onRestore callback', async () => {
      const storedDraft = {
        formType: 'manual-entry',
        data: { description: 'Restored' },
        savedAt: '2024-01-15T12:00:00.000Z',
      };

      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: storedDraft,
      });

      const onRestore = jest.fn();

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
          autoRestore: false,
          onRestore,
        })
      );

      await act(async () => {
        await result.current.restore();
      });

      expect(onRestore).toHaveBeenCalledWith(storedDraft.data);
    });
  });

  describe('debounce interval', () => {
    it('should use custom debounce interval', async () => {
      (draftStorage.saveDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: { formType: 'manual-entry', data: {}, savedAt: new Date().toISOString() },
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
          autoRestore: false,
          debounceInterval: 500,
        })
      );

      act(() => {
        result.current.updateDraft({ description: 'Test' });
      });

      // Should not have saved yet at 400ms
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(draftStorage.saveDraft).not.toHaveBeenCalled();

      // Should have saved at 600ms
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(draftStorage.saveDraft).toHaveBeenCalled();
    });
  });

  describe('formId support', () => {
    it('should handle drafts with formId', async () => {
      const storedDraft = {
        formType: 'category-edit',
        data: { name: 'Edited Category' },
        savedAt: '2024-01-15T12:00:00.000Z',
        formId: 'cat-123',
      };

      (draftStorage.getDraft as jest.Mock).mockResolvedValue({
        success: true,
        draft: storedDraft,
      });

      const { result } = renderHook(() =>
        useDraftStorage<ManualEntryDraft>('category-edit', 'cat-123', { autoRestore: true })
      );

      await waitFor(() => {
        expect(result.current.draft).toBeDefined();
      });

      expect(draftStorage.getDraft).toHaveBeenCalledWith('category-edit', 'cat-123');
    });
  });

  describe('error handling', () => {
    it('should call onError callback when error occurs', async () => {
      (draftStorage.getDraft as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const onError = jest.fn();

      renderHook(() =>
        useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
          autoRestore: true,
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Storage error');
      });
    });
  });
});
