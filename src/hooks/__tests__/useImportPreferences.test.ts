/**
 * useImportPreferences Hook Tests
 *
 * Tests for the import preferences hook that manages:
 * - Last import mode (single/multiple)
 * - Sheet preferences by file pattern
 * - Last used category for manual entry
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Import after mocks
import {
  useImportPreferences,
  useLastManualCategory,
  useSetLastManualCategory,
  useImportPreferencesStore,
  getLastManualCategorySync,
  setLastManualCategorySync,
} from '../useImportPreferences';

describe('useImportPreferences', () => {
  beforeEach(() => {
    // Reset the store before each test
    useImportPreferencesStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useImportPreferences());

      expect(result.current.preferences.lastImportMode).toBe('single');
      expect(result.current.preferences.sheetPreferences).toEqual({});
      expect(result.current.preferences.lastManualCategoryId).toBeNull();
    });
  });

  describe('setLastImportMode', () => {
    it('should update last import mode to multiple', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
      });

      expect(result.current.preferences.lastImportMode).toBe('multiple');
    });

    it('should update last import mode to single', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
      });

      act(() => {
        result.current.setLastImportMode('single');
      });

      expect(result.current.preferences.lastImportMode).toBe('single');
    });
  });

  describe('setSheetPreference', () => {
    it('should set sheet preference for a file pattern', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('bank_statement.xlsx', 'Transactions');
      });

      expect(result.current.preferences.sheetPreferences['bank_statement.xlsx']).toBe(
        'Transactions'
      );
    });

    it('should update existing sheet preference', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('bank_statement.xlsx', 'Sheet1');
      });

      act(() => {
        result.current.setSheetPreference('bank_statement.xlsx', 'Sheet2');
      });

      expect(result.current.preferences.sheetPreferences['bank_statement.xlsx']).toBe('Sheet2');
    });

    it('should store multiple sheet preferences', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('file1.xlsx', 'Sheet1');
        result.current.setSheetPreference('file2.xlsx', 'Sheet2');
      });

      expect(result.current.preferences.sheetPreferences['file1.xlsx']).toBe('Sheet1');
      expect(result.current.preferences.sheetPreferences['file2.xlsx']).toBe('Sheet2');
    });
  });

  describe('getSheetPreference', () => {
    it('should return sheet preference for existing pattern', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('bank_statement.xlsx', 'Transactions');
      });

      expect(result.current.getSheetPreference('bank_statement.xlsx')).toBe('Transactions');
    });

    it('should return undefined for non-existing pattern', () => {
      const { result } = renderHook(() => useImportPreferences());

      expect(result.current.getSheetPreference('unknown.xlsx')).toBeUndefined();
    });
  });

  describe('setLastManualCategory', () => {
    /**
     * **Validates: Requirements 15.12**
     * - Requirement 15.12: Remember last used category for manual entry
     */
    it('should set last manual category ID', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastManualCategory('category-123');
      });

      expect(result.current.preferences.lastManualCategoryId).toBe('category-123');
    });

    it('should clear last manual category when set to null', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastManualCategory('category-123');
      });

      act(() => {
        result.current.setLastManualCategory(null);
      });

      expect(result.current.preferences.lastManualCategoryId).toBeNull();
    });

    it('should update last manual category', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastManualCategory('category-1');
      });

      act(() => {
        result.current.setLastManualCategory('category-2');
      });

      expect(result.current.preferences.lastManualCategoryId).toBe('category-2');
    });
  });

  describe('clearSheetPreferences', () => {
    it('should clear all sheet preferences', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('file1.xlsx', 'Sheet1');
        result.current.setSheetPreference('file2.xlsx', 'Sheet2');
      });

      act(() => {
        result.current.clearSheetPreferences();
      });

      expect(result.current.preferences.sheetPreferences).toEqual({});
    });
  });

  describe('reset', () => {
    it('should reset all preferences to defaults', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
        result.current.setSheetPreference('file.xlsx', 'Sheet1');
        result.current.setLastManualCategory('category-123');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.preferences.lastImportMode).toBe('single');
      expect(result.current.preferences.sheetPreferences).toEqual({});
      expect(result.current.preferences.lastManualCategoryId).toBeNull();
    });
  });
});

describe('useLastManualCategory', () => {
  beforeEach(() => {
    useImportPreferencesStore.getState().reset();
  });

  it('should return null initially', () => {
    const { result } = renderHook(() => useLastManualCategory());
    expect(result.current).toBeNull();
  });

  it('should return the last manual category ID', () => {
    act(() => {
      useImportPreferencesStore.getState().setLastManualCategory('category-456');
    });

    const { result } = renderHook(() => useLastManualCategory());
    expect(result.current).toBe('category-456');
  });
});

describe('useSetLastManualCategory', () => {
  beforeEach(() => {
    useImportPreferencesStore.getState().reset();
  });

  it('should return a function to set the last manual category', () => {
    const { result } = renderHook(() => useSetLastManualCategory());
    expect(typeof result.current).toBe('function');
  });

  it('should update the last manual category when called', () => {
    const { result: setterResult } = renderHook(() => useSetLastManualCategory());
    const { result: valueResult } = renderHook(() => useLastManualCategory());

    act(() => {
      setterResult.current('category-789');
    });

    expect(valueResult.current).toBe('category-789');
  });
});

describe('sync functions', () => {
  beforeEach(() => {
    useImportPreferencesStore.getState().reset();
  });

  describe('getLastManualCategorySync', () => {
    it('should return null initially', () => {
      expect(getLastManualCategorySync()).toBeNull();
    });

    it('should return the last manual category ID', () => {
      setLastManualCategorySync('category-sync');
      expect(getLastManualCategorySync()).toBe('category-sync');
    });
  });

  describe('setLastManualCategorySync', () => {
    it('should set the last manual category ID', () => {
      setLastManualCategorySync('category-sync-test');
      expect(getLastManualCategorySync()).toBe('category-sync-test');
    });

    it('should clear the last manual category when set to null', () => {
      setLastManualCategorySync('category-to-clear');
      setLastManualCategorySync(null);
      expect(getLastManualCategorySync()).toBeNull();
    });
  });
});

/**
 * Persistence Between Reinitializations Tests
 *
 * These tests verify that preferences persist across app restarts/reinitializations.
 * They simulate the persistence behavior by testing the store's partialize and
 * rehydration mechanisms.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
 */
describe('persistence between reinitializations', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  beforeEach(() => {
    useImportPreferencesStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('store configuration', () => {
    /**
     * **Validates: Requirements 11.4**
     * - Requirement 11.4: Preferences SHALL be stored in local storage and persist across app restarts
     */
    it('should have persistence configured with correct storage key', () => {
      // The store should be configured with persist middleware
      // We verify this by checking that setItem is called when state changes
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
      });

      // AsyncStorage.setItem should be called with the correct key
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'gg-economy-import-preferences',
        expect.any(String)
      );
    });

    it('should persist lastImportMode changes to storage', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
      });

      // Verify the persisted data contains the correct value
      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.lastImportMode).toBe('multiple');
    });

    it('should persist sheetPreferences changes to storage', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setSheetPreference('bank_export.xlsx', 'Transactions');
      });

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.sheetPreferences['bank_export.xlsx']).toBe('Transactions');
    });

    it('should persist lastManualCategoryId changes to storage', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastManualCategory('category-persist-test');
      });

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.lastManualCategoryId).toBe('category-persist-test');
    });
  });

  describe('partialize behavior', () => {
    /**
     * **Validates: Requirements 11.1, 11.2, 11.4, 15.12**
     * - Requirement 11.1: Remember last used import mode
     * - Requirement 11.2: Remember last selected worksheet name
     * - Requirement 11.4: Persist across app restarts
     * - Requirement 15.12: Remember last used category
     */
    it('should persist all preference fields except isHydrated', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
        result.current.setSheetPreference('file.xlsx', 'Sheet1');
        result.current.setLastManualCategory('cat-123');
      });

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      // Should include these fields
      expect(persistedData.state).toHaveProperty('lastImportMode');
      expect(persistedData.state).toHaveProperty('sheetPreferences');
      expect(persistedData.state).toHaveProperty('lastManualCategoryId');

      // Should NOT include isHydrated (it's excluded from partialize)
      expect(persistedData.state).not.toHaveProperty('isHydrated');
    });

    it('should not persist isHydrated state', () => {
      const { result } = renderHook(() => useImportPreferences());

      // Trigger a state change to cause persistence
      act(() => {
        result.current.setLastImportMode('multiple');
      });

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      // isHydrated should not be in the persisted state
      expect(persistedData.state.isHydrated).toBeUndefined();
    });
  });

  describe('rehydration simulation', () => {
    /**
     * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 15.12**
     * - Simulates app restart by manually setting persisted state
     */
    it('should restore lastImportMode after simulated reinitialization', () => {
      // First, set a value
      act(() => {
        useImportPreferencesStore.getState().setLastImportMode('multiple');
      });

      // Capture the current state
      const savedMode = useImportPreferencesStore.getState().lastImportMode;

      // Reset the store (simulating app close)
      act(() => {
        useImportPreferencesStore.getState().reset();
      });

      // Verify it's reset
      expect(useImportPreferencesStore.getState().lastImportMode).toBe('single');

      // Simulate rehydration by setting the state directly (as persist middleware would)
      act(() => {
        useImportPreferencesStore.setState({ lastImportMode: savedMode });
      });

      // Verify the value is restored
      expect(useImportPreferencesStore.getState().lastImportMode).toBe('multiple');
    });

    it('should restore sheetPreferences after simulated reinitialization', () => {
      // Set preferences
      act(() => {
        useImportPreferencesStore
          .getState()
          .setSheetPreference('bank_statement.xlsx', 'Transactions');
        useImportPreferencesStore.getState().setSheetPreference('credit_card.xlsx', 'Purchases');
      });

      // Capture the current state
      const savedPreferences = { ...useImportPreferencesStore.getState().sheetPreferences };

      // Reset the store
      act(() => {
        useImportPreferencesStore.getState().reset();
      });

      // Verify it's reset
      expect(useImportPreferencesStore.getState().sheetPreferences).toEqual({});

      // Simulate rehydration
      act(() => {
        useImportPreferencesStore.setState({ sheetPreferences: savedPreferences });
      });

      // Verify the values are restored
      expect(useImportPreferencesStore.getState().sheetPreferences['bank_statement.xlsx']).toBe(
        'Transactions'
      );
      expect(useImportPreferencesStore.getState().sheetPreferences['credit_card.xlsx']).toBe(
        'Purchases'
      );
    });

    it('should restore lastManualCategoryId after simulated reinitialization', () => {
      // Set category
      act(() => {
        useImportPreferencesStore.getState().setLastManualCategory('food-category');
      });

      // Capture the current state
      const savedCategoryId = useImportPreferencesStore.getState().lastManualCategoryId;

      // Reset the store
      act(() => {
        useImportPreferencesStore.getState().reset();
      });

      // Verify it's reset
      expect(useImportPreferencesStore.getState().lastManualCategoryId).toBeNull();

      // Simulate rehydration
      act(() => {
        useImportPreferencesStore.setState({ lastManualCategoryId: savedCategoryId });
      });

      // Verify the value is restored
      expect(useImportPreferencesStore.getState().lastManualCategoryId).toBe('food-category');
    });

    it('should restore all preferences together after simulated reinitialization', () => {
      // Set all preferences
      act(() => {
        useImportPreferencesStore.getState().setLastImportMode('multiple');
        useImportPreferencesStore.getState().setSheetPreference('file1.xlsx', 'Data');
        useImportPreferencesStore.getState().setLastManualCategory('transport-cat');
      });

      // Capture the full state
      const savedState = {
        lastImportMode: useImportPreferencesStore.getState().lastImportMode,
        sheetPreferences: { ...useImportPreferencesStore.getState().sheetPreferences },
        lastManualCategoryId: useImportPreferencesStore.getState().lastManualCategoryId,
      };

      // Reset the store
      act(() => {
        useImportPreferencesStore.getState().reset();
      });

      // Verify all are reset
      expect(useImportPreferencesStore.getState().lastImportMode).toBe('single');
      expect(useImportPreferencesStore.getState().sheetPreferences).toEqual({});
      expect(useImportPreferencesStore.getState().lastManualCategoryId).toBeNull();

      // Simulate rehydration with all values
      act(() => {
        useImportPreferencesStore.setState(savedState);
      });

      // Verify all values are restored
      expect(useImportPreferencesStore.getState().lastImportMode).toBe('multiple');
      expect(useImportPreferencesStore.getState().sheetPreferences['file1.xlsx']).toBe('Data');
      expect(useImportPreferencesStore.getState().lastManualCategoryId).toBe('transport-cat');
    });
  });

  describe('isReady state', () => {
    /**
     * Tests for the isReady/isHydrated state that indicates when
     * preferences have been loaded from storage
     */
    it('should report isReady as false initially before hydration', () => {
      // Reset to initial state
      act(() => {
        useImportPreferencesStore.getState().reset();
        useImportPreferencesStore.getState().setHydrated(false);
      });

      const { result } = renderHook(() => useImportPreferences());
      expect(result.current.isReady).toBe(false);
    });

    it('should report isReady as true after hydration', () => {
      act(() => {
        useImportPreferencesStore.getState().setHydrated(true);
      });

      const { result } = renderHook(() => useImportPreferences());
      expect(result.current.isReady).toBe(true);
    });

    it('should allow components to wait for hydration before using preferences', () => {
      // Simulate pre-hydration state
      act(() => {
        useImportPreferencesStore.getState().reset();
        useImportPreferencesStore.getState().setHydrated(false);
      });

      const { result, rerender } = renderHook(() => useImportPreferences());

      // Before hydration, isReady should be false
      expect(result.current.isReady).toBe(false);

      // Simulate hydration completing
      act(() => {
        useImportPreferencesStore.getState().setHydrated(true);
      });

      rerender();

      // After hydration, isReady should be true
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('persistence with hook interface', () => {
    /**
     * Tests that verify persistence works correctly through the hook interface
     */
    it('should persist changes made through the hook', () => {
      const { result } = renderHook(() => useImportPreferences());

      act(() => {
        result.current.setLastImportMode('multiple');
        result.current.setSheetPreference('test.xlsx', 'TestSheet');
        result.current.setLastManualCategory('test-category');
      });

      // Verify AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Get the last persisted state
      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.lastImportMode).toBe('multiple');
      expect(persistedData.state.sheetPreferences['test.xlsx']).toBe('TestSheet');
      expect(persistedData.state.lastManualCategoryId).toBe('test-category');
    });

    it('should persist reset action', () => {
      const { result } = renderHook(() => useImportPreferences());

      // Set some values first
      act(() => {
        result.current.setLastImportMode('multiple');
        result.current.setLastManualCategory('some-category');
      });

      // Clear mock to track only reset
      AsyncStorage.setItem.mockClear();

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset was persisted
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.lastImportMode).toBe('single');
      expect(persistedData.state.sheetPreferences).toEqual({});
      expect(persistedData.state.lastManualCategoryId).toBeNull();
    });

    it('should persist clearSheetPreferences action', () => {
      const { result } = renderHook(() => useImportPreferences());

      // Set some sheet preferences
      act(() => {
        result.current.setSheetPreference('file1.xlsx', 'Sheet1');
        result.current.setSheetPreference('file2.xlsx', 'Sheet2');
      });

      // Clear mock
      AsyncStorage.setItem.mockClear();

      // Clear sheet preferences
      act(() => {
        result.current.clearSheetPreferences();
      });

      // Verify clear was persisted
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const setItemCalls = AsyncStorage.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const persistedData = JSON.parse(lastCall[1]);

      expect(persistedData.state.sheetPreferences).toEqual({});
    });
  });
});
