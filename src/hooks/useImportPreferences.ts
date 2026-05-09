/**
 * useImportPreferences Hook
 *
 * Custom hook for managing import preferences with persistence.
 * Uses Zustand with AsyncStorage for lightweight preference storage.
 *
 * Preferences include:
 * - Last import mode (single/multiple)
 * - Sheet preferences by file pattern
 * - Last used category for manual entry
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

/**
 * Import mode type
 */
export type ImportMode = 'single' | 'multiple';

/**
 * Import preferences state
 */
export interface ImportPreferencesState {
  /** Last used import mode (single file or multiple files) */
  lastImportMode: ImportMode;
  /** Mapping of file name patterns to preferred sheet names */
  sheetPreferences: Record<string, string>;
  /** Last used category ID for manual entry */
  lastManualCategoryId: string | null;
  /** Whether the store has been hydrated from persistence */
  isHydrated: boolean;
}

/**
 * Import preferences actions
 */
export interface ImportPreferencesActions {
  /**
   * Set the last used import mode
   * @param mode - Import mode ('single' or 'multiple')
   */
  setLastImportMode: (mode: ImportMode) => void;

  /**
   * Set the preferred sheet for a file pattern
   * @param filePattern - File name pattern (e.g., 'bank_statement_*.xlsx')
   * @param sheetName - Preferred sheet name
   */
  setSheetPreference: (filePattern: string, sheetName: string) => void;

  /**
   * Get the preferred sheet for a file pattern
   * @param filePattern - File name pattern
   * @returns Preferred sheet name or undefined
   */
  getSheetPreference: (filePattern: string) => string | undefined;

  /**
   * Set the last used category for manual entry
   * @param categoryId - Category ID or null to clear
   */
  setLastManualCategory: (categoryId: string | null) => void;

  /**
   * Clear all sheet preferences
   */
  clearSheetPreferences: () => void;

  /**
   * Mark the store as hydrated
   */
  setHydrated: (hydrated: boolean) => void;

  /**
   * Reset all preferences to defaults
   */
  reset: () => void;
}

type ImportPreferencesStore = ImportPreferencesState & ImportPreferencesActions;

/**
 * Initial state for import preferences
 */
const initialState: ImportPreferencesState = {
  lastImportMode: 'single',
  sheetPreferences: {},
  lastManualCategoryId: null,
  isHydrated: false,
};

/**
 * Zustand store for import preferences with persistence
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
 */
export const useImportPreferencesStore = create<ImportPreferencesStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLastImportMode: (mode: ImportMode) => {
        set({ lastImportMode: mode });
      },

      setSheetPreference: (filePattern: string, sheetName: string) => {
        set((state) => ({
          sheetPreferences: {
            ...state.sheetPreferences,
            [filePattern]: sheetName,
          },
        }));
      },

      getSheetPreference: (filePattern: string) => {
        return get().sheetPreferences[filePattern];
      },

      setLastManualCategory: (categoryId: string | null) => {
        set({ lastManualCategoryId: categoryId });
      },

      clearSheetPreferences: () => {
        set({ sheetPreferences: {} });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'gg-economy-import-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist all preferences except hydration state
        lastImportMode: state.lastImportMode,
        sheetPreferences: state.sheetPreferences,
        lastManualCategoryId: state.lastManualCategoryId,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when rehydration completes
        state?.setHydrated(true);
      },
    }
  )
);

/**
 * Return type for useImportPreferences hook
 */
export interface UseImportPreferencesReturn {
  /** Current import preferences */
  preferences: {
    lastImportMode: ImportMode;
    sheetPreferences: Record<string, string>;
    lastManualCategoryId: string | null;
  };
  /** Whether the preferences have been loaded from storage */
  isReady: boolean;
  /** Set the last used import mode */
  setLastImportMode: (mode: ImportMode) => void;
  /** Set the preferred sheet for a file pattern */
  setSheetPreference: (filePattern: string, sheetName: string) => void;
  /** Get the preferred sheet for a file pattern */
  getSheetPreference: (filePattern: string) => string | undefined;
  /** Set the last used category for manual entry */
  setLastManualCategory: (categoryId: string | null) => void;
  /** Clear all sheet preferences */
  clearSheetPreferences: () => void;
  /** Reset all preferences */
  reset: () => void;
}

/**
 * Hook for managing import preferences
 *
 * Provides access to import preferences with persistence across app restarts.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
 *
 * @returns Import preferences management interface
 *
 * @example
 * ```tsx
 * const { preferences, setLastManualCategory } = useImportPreferences();
 *
 * // Use last category as default
 * const defaultCategoryId = preferences.lastManualCategoryId;
 *
 * // Save category when transaction is saved
 * const handleSave = (transaction) => {
 *   if (transaction.categoryId) {
 *     setLastManualCategory(transaction.categoryId);
 *   }
 * };
 * ```
 */
export function useImportPreferences(): UseImportPreferencesReturn {
  // Get state
  const lastImportMode = useImportPreferencesStore((state) => state.lastImportMode);
  const sheetPreferences = useImportPreferencesStore((state) => state.sheetPreferences);
  const lastManualCategoryId = useImportPreferencesStore((state) => state.lastManualCategoryId);
  const isHydrated = useImportPreferencesStore((state) => state.isHydrated);

  // Get actions
  const setLastImportModeAction = useImportPreferencesStore((state) => state.setLastImportMode);
  const setSheetPreferenceAction = useImportPreferencesStore((state) => state.setSheetPreference);
  const getSheetPreferenceAction = useImportPreferencesStore((state) => state.getSheetPreference);
  const setLastManualCategoryAction = useImportPreferencesStore(
    (state) => state.setLastManualCategory
  );
  const clearSheetPreferencesAction = useImportPreferencesStore(
    (state) => state.clearSheetPreferences
  );
  const resetAction = useImportPreferencesStore((state) => state.reset);

  // Memoized callbacks
  const setLastImportMode = useCallback(
    (mode: ImportMode) => {
      setLastImportModeAction(mode);
    },
    [setLastImportModeAction]
  );

  const setSheetPreference = useCallback(
    (filePattern: string, sheetName: string) => {
      setSheetPreferenceAction(filePattern, sheetName);
    },
    [setSheetPreferenceAction]
  );

  const getSheetPreference = useCallback(
    (filePattern: string) => {
      return getSheetPreferenceAction(filePattern);
    },
    [getSheetPreferenceAction]
  );

  const setLastManualCategory = useCallback(
    (categoryId: string | null) => {
      setLastManualCategoryAction(categoryId);
    },
    [setLastManualCategoryAction]
  );

  const clearSheetPreferences = useCallback(() => {
    clearSheetPreferencesAction();
  }, [clearSheetPreferencesAction]);

  const reset = useCallback(() => {
    resetAction();
  }, [resetAction]);

  return {
    preferences: {
      lastImportMode,
      sheetPreferences,
      lastManualCategoryId,
    },
    isReady: isHydrated,
    setLastImportMode,
    setSheetPreference,
    getSheetPreference,
    setLastManualCategory,
    clearSheetPreferences,
    reset,
  };
}

/**
 * Hook to get only the last manual category ID
 *
 * Lightweight hook for components that only need the last category.
 *
 * **Validates: Requirements 15.12**
 *
 * @returns Last used category ID or null
 */
export function useLastManualCategory(): string | null {
  return useImportPreferencesStore((state) => state.lastManualCategoryId);
}

/**
 * Hook to get the action to set the last manual category
 *
 * **Validates: Requirements 15.12**
 *
 * @returns Function to set the last manual category
 */
export function useSetLastManualCategory(): (categoryId: string | null) => void {
  return useImportPreferencesStore((state) => state.setLastManualCategory);
}

/**
 * Get the last manual category ID synchronously (for non-React contexts)
 *
 * @returns Last used category ID or null
 */
export function getLastManualCategorySync(): string | null {
  return useImportPreferencesStore.getState().lastManualCategoryId;
}

/**
 * Set the last manual category synchronously (for non-React contexts)
 *
 * @param categoryId - Category ID or null to clear
 */
export function setLastManualCategorySync(categoryId: string | null): void {
  useImportPreferencesStore.getState().setLastManualCategory(categoryId);
}

export default useImportPreferences;
