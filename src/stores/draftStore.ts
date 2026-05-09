/**
 * Zustand store for draft state management
 *
 * Manages in-memory draft state with debounced persistence to secure storage.
 * Provides reactive state updates for form components.
 *
 * **Validates: Requirements 24.1-24.6**
 */
import { create } from 'zustand';
import {
  draftStorage,
  type DraftFormType,
  type ManualEntryDraft,
  type CategoryDraft,
  type RuleDraft,
  type DraftData,
  type StoredDraft,
} from '../services/draft';

/**
 * Debounce timer references for each form type
 */
type DebounceTimers = Partial<Record<string, ReturnType<typeof setTimeout>>>;

/**
 * Draft state for a specific form
 */
interface FormDraftState<T extends DraftData = DraftData> {
  data: T;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  error: string | null;
}

/**
 * Draft store state
 */
interface DraftStoreState {
  // Draft states keyed by form type and optional formId
  drafts: Record<string, FormDraftState>;

  // Loading states for initial draft restoration
  isLoading: Record<string, boolean>;

  // Debounce interval in milliseconds (default: 2000ms)
  debounceInterval: number;
}

/**
 * Draft store actions
 */
interface DraftStoreActions {
  /**
   * Updates draft data for a form (triggers debounced save)
   */
  updateDraft: <T extends DraftData>(
    formType: DraftFormType,
    data: Partial<T>,
    formId?: string
  ) => void;

  /**
   * Sets the complete draft data for a form
   */
  setDraft: <T extends DraftData>(formType: DraftFormType, data: T, formId?: string) => void;

  /**
   * Restores draft from secure storage
   */
  restoreDraft: <T extends DraftData>(
    formType: DraftFormType,
    formId?: string
  ) => Promise<T | null>;

  /**
   * Clears draft for a form
   */
  clearDraft: (formType: DraftFormType, formId?: string) => Promise<void>;

  /**
   * Forces immediate save of draft
   */
  saveDraftNow: <T extends DraftData>(formType: DraftFormType, formId?: string) => Promise<void>;

  /**
   * Gets the current draft data for a form
   */
  getDraftData: <T extends DraftData>(formType: DraftFormType, formId?: string) => T | null;

  /**
   * Checks if a form has unsaved changes
   */
  isDirty: (formType: DraftFormType, formId?: string) => boolean;

  /**
   * Sets the debounce interval
   */
  setDebounceInterval: (interval: number) => void;

  /**
   * Resets the store state (useful for testing)
   */
  reset: () => void;
}

type DraftStore = DraftStoreState & DraftStoreActions;

/**
 * Generates a unique key for a form draft
 */
function getDraftStateKey(formType: DraftFormType, formId?: string): string {
  return formId ? `${formType}_${formId}` : formType;
}

/**
 * Default empty draft state
 */
function createEmptyDraftState<T extends DraftData>(data: T = {} as T): FormDraftState<T> {
  return {
    data,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    error: null,
  };
}

// Store debounce timers outside of Zustand state to avoid serialization issues
const debounceTimers: DebounceTimers = {};

/**
 * Initial state
 */
const initialState: DraftStoreState = {
  drafts: {},
  isLoading: {},
  debounceInterval: 2000, // 2 seconds as per requirement
};

/**
 * Zustand store for draft management
 */
export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  updateDraft: <T extends DraftData>(
    formType: DraftFormType,
    data: Partial<T>,
    formId?: string
  ) => {
    const key = getDraftStateKey(formType, formId);
    const currentState = get().drafts[key] || createEmptyDraftState<T>();

    // Merge the new data with existing data
    const mergedData = {
      ...currentState.data,
      ...data,
    } as T;

    // Update state immediately
    set((state) => ({
      drafts: {
        ...state.drafts,
        [key]: {
          ...currentState,
          data: mergedData,
          isDirty: true,
          error: null,
        },
      },
    }));

    // Clear existing debounce timer
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }

    // Set up debounced save
    debounceTimers[key] = setTimeout(async () => {
      await get().saveDraftNow<T>(formType, formId);
    }, get().debounceInterval);
  },

  setDraft: <T extends DraftData>(formType: DraftFormType, data: T, formId?: string) => {
    const key = getDraftStateKey(formType, formId);

    set((state) => ({
      drafts: {
        ...state.drafts,
        [key]: {
          data,
          isDirty: true,
          isSaving: false,
          lastSavedAt: null,
          error: null,
        },
      },
    }));

    // Clear existing debounce timer
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }

    // Set up debounced save
    debounceTimers[key] = setTimeout(async () => {
      await get().saveDraftNow<T>(formType, formId);
    }, get().debounceInterval);
  },

  restoreDraft: async <T extends DraftData>(
    formType: DraftFormType,
    formId?: string
  ): Promise<T | null> => {
    const key = getDraftStateKey(formType, formId);

    // Set loading state
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [key]: true,
      },
    }));

    try {
      const result = await draftStorage.getDraft<T>(formType, formId);

      if (result.success && result.draft) {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: {
              data: result.draft!.data,
              isDirty: false,
              isSaving: false,
              lastSavedAt: result.draft!.savedAt,
              error: null,
            },
          },
          isLoading: {
            ...state.isLoading,
            [key]: false,
          },
        }));

        return result.draft.data;
      }

      // No draft found or error
      set((state) => ({
        drafts: {
          ...state.drafts,
          [key]: createEmptyDraftState<T>(),
        },
        isLoading: {
          ...state.isLoading,
          [key]: false,
        },
      }));

      return null;
    } catch (error) {
      set((state) => ({
        drafts: {
          ...state.drafts,
          [key]: {
            ...createEmptyDraftState<T>(),
            error: error instanceof Error ? error.message : 'Failed to restore draft',
          },
        },
        isLoading: {
          ...state.isLoading,
          [key]: false,
        },
      }));

      return null;
    }
  },

  clearDraft: async (formType: DraftFormType, formId?: string) => {
    const key = getDraftStateKey(formType, formId);

    // Clear debounce timer
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
      delete debounceTimers[key];
    }

    // Clear from secure storage
    await draftStorage.clearDraft(formType, formId);

    // Clear from state
    set((state) => {
      const newDrafts = { ...state.drafts };
      delete newDrafts[key];

      return {
        drafts: newDrafts,
      };
    });
  },

  saveDraftNow: async <T extends DraftData>(formType: DraftFormType, formId?: string) => {
    const key = getDraftStateKey(formType, formId);
    const currentState = get().drafts[key];

    if (!currentState || !currentState.isDirty) {
      return;
    }

    // Set saving state
    set((state) => ({
      drafts: {
        ...state.drafts,
        [key]: {
          ...currentState,
          isSaving: true,
        },
      },
    }));

    try {
      const result = await draftStorage.saveDraft<T>(formType, currentState.data as T, formId);

      if (result.success) {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: {
              ...state.drafts[key],
              isDirty: false,
              isSaving: false,
              lastSavedAt: result.draft?.savedAt || new Date().toISOString(),
              error: null,
            },
          },
        }));
      } else {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: {
              ...state.drafts[key],
              isSaving: false,
              error: result.error || 'Failed to save draft',
            },
          },
        }));
      }
    } catch (error) {
      set((state) => ({
        drafts: {
          ...state.drafts,
          [key]: {
            ...state.drafts[key],
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to save draft',
          },
        },
      }));
    }
  },

  getDraftData: <T extends DraftData>(formType: DraftFormType, formId?: string): T | null => {
    const key = getDraftStateKey(formType, formId);
    const draftState = get().drafts[key];

    if (!draftState || Object.keys(draftState.data).length === 0) {
      return null;
    }

    return draftState.data as T;
  },

  isDirty: (formType: DraftFormType, formId?: string): boolean => {
    const key = getDraftStateKey(formType, formId);
    return get().drafts[key]?.isDirty ?? false;
  },

  setDebounceInterval: (interval: number) => {
    set({ debounceInterval: interval });
  },

  reset: () => {
    // Clear all debounce timers
    Object.keys(debounceTimers).forEach((key) => {
      if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
        delete debounceTimers[key];
      }
    });

    set(initialState);
  },
}));

/**
 * Selector hooks for specific draft types
 */
export function useManualEntryDraft() {
  const draft = useDraftStore((state) => state.drafts['manual-entry']);
  const updateDraft = useDraftStore((state) => state.updateDraft);
  const restoreDraft = useDraftStore((state) => state.restoreDraft);
  const clearDraft = useDraftStore((state) => state.clearDraft);
  const saveDraftNow = useDraftStore((state) => state.saveDraftNow);
  const isLoading = useDraftStore((state) => state.isLoading['manual-entry'] ?? false);

  return {
    draft: draft?.data as ManualEntryDraft | undefined,
    isDirty: draft?.isDirty ?? false,
    isSaving: draft?.isSaving ?? false,
    lastSavedAt: draft?.lastSavedAt ?? null,
    error: draft?.error ?? null,
    isLoading,
    updateDraft: (data: Partial<ManualEntryDraft>) => updateDraft('manual-entry', data),
    restoreDraft: () => restoreDraft<ManualEntryDraft>('manual-entry'),
    clearDraft: () => clearDraft('manual-entry'),
    saveDraftNow: () => saveDraftNow<ManualEntryDraft>('manual-entry'),
  };
}

export function useCategoryDraft(formId?: string) {
  const key = formId ? `category-edit_${formId}` : 'category-create';
  const formType: DraftFormType = formId ? 'category-edit' : 'category-create';

  const draft = useDraftStore((state) => state.drafts[key]);
  const updateDraft = useDraftStore((state) => state.updateDraft);
  const restoreDraft = useDraftStore((state) => state.restoreDraft);
  const clearDraft = useDraftStore((state) => state.clearDraft);
  const saveDraftNow = useDraftStore((state) => state.saveDraftNow);
  const isLoading = useDraftStore((state) => state.isLoading[key] ?? false);

  return {
    draft: draft?.data as CategoryDraft | undefined,
    isDirty: draft?.isDirty ?? false,
    isSaving: draft?.isSaving ?? false,
    lastSavedAt: draft?.lastSavedAt ?? null,
    error: draft?.error ?? null,
    isLoading,
    updateDraft: (data: Partial<CategoryDraft>) => updateDraft(formType, data, formId),
    restoreDraft: () => restoreDraft<CategoryDraft>(formType, formId),
    clearDraft: () => clearDraft(formType, formId),
    saveDraftNow: () => saveDraftNow<CategoryDraft>(formType, formId),
  };
}

export function useRuleDraft(formId?: string) {
  const key = formId ? `rule-edit_${formId}` : 'rule-create';
  const formType: DraftFormType = formId ? 'rule-edit' : 'rule-create';

  const draft = useDraftStore((state) => state.drafts[key]);
  const updateDraft = useDraftStore((state) => state.updateDraft);
  const restoreDraft = useDraftStore((state) => state.restoreDraft);
  const clearDraft = useDraftStore((state) => state.clearDraft);
  const saveDraftNow = useDraftStore((state) => state.saveDraftNow);
  const isLoading = useDraftStore((state) => state.isLoading[key] ?? false);

  return {
    draft: draft?.data as RuleDraft | undefined,
    isDirty: draft?.isDirty ?? false,
    isSaving: draft?.isSaving ?? false,
    lastSavedAt: draft?.lastSavedAt ?? null,
    error: draft?.error ?? null,
    isLoading,
    updateDraft: (data: Partial<RuleDraft>) => updateDraft(formType, data, formId),
    restoreDraft: () => restoreDraft<RuleDraft>(formType, formId),
    clearDraft: () => clearDraft(formType, formId),
    saveDraftNow: () => saveDraftNow<RuleDraft>(formType, formId),
  };
}
