/**
 * useDraftStorage Hook
 *
 * Custom hook for managing form drafts with debounced auto-save.
 * Provides a simple interface for form components to persist and restore drafts.
 *
 * **Validates: Requirements 24.1-24.6**
 */
import { useCallback, useEffect, useRef } from 'react';
import { useDraftStore } from '../stores/draftStore';
import type { DraftFormType, DraftData } from '../services/draft';

/**
 * Options for the useDraftStorage hook
 */
export interface UseDraftStorageOptions {
  /**
   * Whether to automatically restore draft on mount
   * @default true
   */
  autoRestore?: boolean;

  /**
   * Custom debounce interval in milliseconds
   * @default 2000 (2 seconds)
   */
  debounceInterval?: number;

  /**
   * Callback when draft is restored
   */
  onRestore?: (data: DraftData | null) => void;

  /**
   * Callback when draft is saved
   */
  onSave?: () => void;

  /**
   * Callback when draft is cleared
   */
  onClear?: () => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

/**
 * Return type for the useDraftStorage hook
 */
export interface UseDraftStorageReturn<T extends DraftData> {
  /**
   * Current draft data
   */
  draft: T | null;

  /**
   * Whether the draft has unsaved changes
   */
  isDirty: boolean;

  /**
   * Whether the draft is currently being saved
   */
  isSaving: boolean;

  /**
   * Whether the draft is being loaded/restored
   */
  isLoading: boolean;

  /**
   * Timestamp of last successful save
   */
  lastSavedAt: string | null;

  /**
   * Error message if any operation failed
   */
  error: string | null;

  /**
   * Updates the draft data (triggers debounced save)
   */
  updateDraft: (data: Partial<T>) => void;

  /**
   * Sets the complete draft data
   */
  setDraft: (data: T) => void;

  /**
   * Clears the draft
   */
  clearDraft: () => Promise<void>;

  /**
   * Forces immediate save
   */
  saveNow: () => Promise<void>;

  /**
   * Manually restores draft from storage
   */
  restore: () => Promise<T | null>;
}

/**
 * Hook for managing form drafts with debounced auto-save
 *
 * @param formType - The type of form to manage drafts for
 * @param formId - Optional identifier for edit forms
 * @param options - Configuration options
 * @returns Draft management interface
 *
 * @example
 * ```tsx
 * const { draft, updateDraft, clearDraft, isDirty } = useDraftStorage<ManualEntryDraft>(
 *   'manual-entry',
 *   undefined,
 *   { autoRestore: true }
 * );
 *
 * // Update draft on form change
 * const handleChange = (field: string, value: string) => {
 *   updateDraft({ [field]: value });
 * };
 *
 * // Clear draft on successful submit
 * const handleSubmit = async () => {
 *   await saveTransaction(draft);
 *   await clearDraft();
 * };
 * ```
 */
export function useDraftStorage<T extends DraftData>(
  formType: DraftFormType,
  formId?: string,
  options: UseDraftStorageOptions = {}
): UseDraftStorageReturn<T> {
  const { autoRestore = true, debounceInterval, onRestore, onSave, onClear, onError } = options;

  // Track if we've already restored to prevent double restoration
  const hasRestored = useRef(false);

  // Get store actions and state
  const updateDraftAction = useDraftStore((state) => state.updateDraft);
  const setDraftAction = useDraftStore((state) => state.setDraft);
  const restoreDraftAction = useDraftStore((state) => state.restoreDraft);
  const clearDraftAction = useDraftStore((state) => state.clearDraft);
  const saveDraftNowAction = useDraftStore((state) => state.saveDraftNow);
  const getDraftData = useDraftStore((state) => state.getDraftData);
  const isDirtyCheck = useDraftStore((state) => state.isDirty);
  const setDebounceInterval = useDraftStore((state) => state.setDebounceInterval);

  // Generate the state key
  const stateKey = formId ? `${formType}_${formId}` : formType;

  // Get current draft state
  const draftState = useDraftStore((state) => state.drafts[stateKey]);
  const isLoading = useDraftStore((state) => state.isLoading[stateKey] ?? false);

  // Set custom debounce interval if provided
  useEffect(() => {
    if (debounceInterval !== undefined) {
      setDebounceInterval(debounceInterval);
    }
  }, [debounceInterval, setDebounceInterval]);

  // Auto-restore draft on mount
  useEffect(() => {
    if (autoRestore && !hasRestored.current) {
      hasRestored.current = true;
      restoreDraftAction<T>(formType, formId).then((data) => {
        onRestore?.(data);
      });
    }
  }, [autoRestore, formType, formId, restoreDraftAction, onRestore]);

  // Watch for errors
  useEffect(() => {
    if (draftState?.error && onError) {
      onError(draftState.error);
    }
  }, [draftState?.error, onError]);

  // Watch for successful saves
  const prevSavingRef = useRef(false);
  useEffect(() => {
    if (prevSavingRef.current && !draftState?.isSaving && !draftState?.error) {
      onSave?.();
    }
    prevSavingRef.current = draftState?.isSaving ?? false;
  }, [draftState?.isSaving, draftState?.error, onSave]);

  // Memoized update function
  const updateDraft = useCallback(
    (data: Partial<T>) => {
      updateDraftAction<T>(formType, data, formId);
    },
    [updateDraftAction, formType, formId]
  );

  // Memoized set function
  const setDraft = useCallback(
    (data: T) => {
      setDraftAction<T>(formType, data, formId);
    },
    [setDraftAction, formType, formId]
  );

  // Memoized clear function
  const clearDraft = useCallback(async () => {
    await clearDraftAction(formType, formId);
    onClear?.();
  }, [clearDraftAction, formType, formId, onClear]);

  // Memoized save now function
  const saveNow = useCallback(async () => {
    await saveDraftNowAction<T>(formType, formId);
  }, [saveDraftNowAction, formType, formId]);

  // Memoized restore function
  const restore = useCallback(async () => {
    const data = await restoreDraftAction<T>(formType, formId);
    onRestore?.(data);
    return data;
  }, [restoreDraftAction, formType, formId, onRestore]);

  return {
    draft: getDraftData<T>(formType, formId),
    isDirty: isDirtyCheck(formType, formId),
    isSaving: draftState?.isSaving ?? false,
    isLoading,
    lastSavedAt: draftState?.lastSavedAt ?? null,
    error: draftState?.error ?? null,
    updateDraft,
    setDraft,
    clearDraft,
    saveNow,
    restore,
  };
}

export default useDraftStorage;
