/**
 * useManualEntry Hook Tests
 *
 * Tests for the manual entry hook that handles database creation
 * and success confirmation for manual transactions.
 *
 * **Validates: Requirements 15.6, 15.7, 15.10, 15.11, 15.12**
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock the createTransaction and getAllTransactions functions
const mockCreateTransaction = jest.fn();
const mockGetAllTransactions = jest.fn();

jest.mock('../../db/queries/transactions', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  getAllTransactions: () => mockGetAllTransactions(),
}));

// Mock the toast store
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../stores/toastStore', () => ({
  useToastActions: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showToast: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    dismissToast: jest.fn(),
    dismissAllToasts: jest.fn(),
  }),
}));

// Mock the import preferences store
const mockSetLastManualCategorySync = jest.fn();

jest.mock('../useImportPreferences', () => ({
  setLastManualCategorySync: (...args: unknown[]) => mockSetLastManualCategorySync(...args),
}));

// Import after mocks
import { useManualEntry } from '../useManualEntry';
import type { CreateTransactionDTO } from '../../types';

describe('useManualEntry', () => {
  const mockTransactionData: CreateTransactionDTO = {
    date: new Date('2024-01-15'),
    amount: -5000, // -50.00 in cents
    description: 'Test manual transaction',
    categoryId: 'cat-1',
    referenceMonth: '2024-01',
    needsReview: true,
  };

  const mockCreatedTransaction = {
    id: 'tx-new-1',
    date: new Date('2024-01-15'),
    amount: -5000,
    description: 'Test manual transaction',
    categoryId: 'cat-1',
    originId: null,
    batchId: null,
    referenceMonth: '2024-01',
    needsReview: true,
    isExcludedFromTotals: false,
    duplicateOf: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransaction.mockResolvedValue(mockCreatedTransaction);
    mockGetAllTransactions.mockResolvedValue([]);
    mockSetLastManualCategorySync.mockClear();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useManualEntry());

      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSavedTransaction).toBeNull();
    });
  });

  describe('saveTransaction', () => {
    /**
     * **Validates: Requirement 15.6**
     * WHEN the user submits a valid manual entry, THE Import_Service SHALL create a Transaction in the database
     */
    it('should create transaction in database when saving valid entry', async () => {
      const { result } = renderHook(() => useManualEntry());

      let savedTransaction;
      await act(async () => {
        savedTransaction = await result.current.saveTransaction(mockTransactionData);
      });

      expect(mockCreateTransaction).toHaveBeenCalledWith(mockTransactionData);
      expect(savedTransaction).toEqual(mockCreatedTransaction);
      expect(result.current.lastSavedTransaction).toEqual(mockCreatedTransaction);
    });

    /**
     * **Validates: Requirement 15.7**
     * WHEN the user submits a valid manual entry, THE App SHALL display a success confirmation
     */
    it('should display success confirmation after saving', async () => {
      const { result } = renderHook(() => useManualEntry());

      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('manual.transactionSaved');
    });

    /**
     * **Validates: Requirement 15.12**
     * THE manual entry form SHALL remember the last used category to speed up repeated entries
     */
    it('should save last used category when transaction has categoryId', async () => {
      const { result } = renderHook(() => useManualEntry());

      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(mockSetLastManualCategorySync).toHaveBeenCalledWith('cat-1');
    });

    /**
     * **Validates: Requirement 15.12**
     * THE manual entry form SHALL remember the last used category to speed up repeated entries
     */
    it('should not save last category when transaction has no categoryId', async () => {
      const { result } = renderHook(() => useManualEntry());

      const transactionWithoutCategory: CreateTransactionDTO = {
        ...mockTransactionData,
        categoryId: undefined,
      };

      await act(async () => {
        await result.current.saveTransaction(transactionWithoutCategory);
      });

      expect(mockSetLastManualCategorySync).not.toHaveBeenCalled();
    });

    it('should set isSaving to true while saving', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockCreateTransaction.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useManualEntry());

      // Start the save operation
      let savePromise: Promise<unknown>;
      act(() => {
        savePromise = result.current.saveTransaction(mockTransactionData);
      });

      // Check that isSaving is true while the operation is pending
      expect(result.current.isSaving).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockCreatedTransaction);
        await savePromise;
      });

      // Check that isSaving is false after completion
      expect(result.current.isSaving).toBe(false);
    });

    it('should handle errors and show error toast', async () => {
      const errorMessage = 'Database error';
      mockCreateTransaction.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useManualEntry());

      let savedTransaction;
      await act(async () => {
        savedTransaction = await result.current.saveTransaction(mockTransactionData);
      });

      expect(savedTransaction).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isSaving).toBe(false);
      expect(mockShowError).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      mockCreateTransaction.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useManualEntry());

      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(result.current.error).toBe('errors.database');
      expect(mockShowError).toHaveBeenCalledWith('errors.database');
    });
  });

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockCreateTransaction.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useManualEntry());

      // First, create an error
      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(result.current.error).toBe('Test error');

      // Then clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useManualEntry());

      // First, save a transaction
      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(result.current.lastSavedTransaction).not.toBeNull();

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSavedTransaction).toBeNull();
    });
  });

  describe('multiple saves', () => {
    it('should handle multiple consecutive saves', async () => {
      const { result } = renderHook(() => useManualEntry());

      const secondTransaction = {
        ...mockTransactionData,
        description: 'Second transaction',
      };

      const secondCreatedTransaction = {
        ...mockCreatedTransaction,
        id: 'tx-new-2',
        description: 'Second transaction',
      };

      // First save
      await act(async () => {
        await result.current.saveTransaction(mockTransactionData);
      });

      expect(result.current.lastSavedTransaction?.id).toBe('tx-new-1');

      // Second save
      mockCreateTransaction.mockResolvedValue(secondCreatedTransaction);

      await act(async () => {
        await result.current.saveTransaction(secondTransaction);
      });

      expect(result.current.lastSavedTransaction?.id).toBe('tx-new-2');
      expect(mockShowSuccess).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkForDuplicate', () => {
    const existingTransaction = {
      id: 'tx-existing-1',
      date: new Date('2024-01-15'),
      amount: -5000,
      description: 'Test manual transaction',
      categoryId: 'cat-1',
      originId: null,
      batchId: null,
      referenceMonth: '2024-01',
      needsReview: false,
      isExcludedFromTotals: false,
      duplicateOf: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    /**
     * **Validates: Requirement 15.10**
     * THE Dedupe_Engine SHALL check manual entries against existing transactions to warn about potential duplicates
     */
    it('should detect duplicate when matching transaction exists', async () => {
      mockGetAllTransactions.mockResolvedValue([existingTransaction]);

      const { result } = renderHook(() => useManualEntry());

      let isDuplicate: boolean;
      await act(async () => {
        isDuplicate = await result.current.checkForDuplicate(mockTransactionData);
      });

      expect(isDuplicate!).toBe(true);
      expect(result.current.duplicateWarning).not.toBeNull();
      expect(result.current.pendingTransaction).toEqual(mockTransactionData);
    });

    it('should not detect duplicate when no matching transaction exists', async () => {
      mockGetAllTransactions.mockResolvedValue([]);

      const { result } = renderHook(() => useManualEntry());

      let isDuplicate: boolean;
      await act(async () => {
        isDuplicate = await result.current.checkForDuplicate(mockTransactionData);
      });

      expect(isDuplicate!).toBe(false);
      expect(result.current.duplicateWarning).toBeNull();
      expect(result.current.pendingTransaction).toBeNull();
    });

    it('should set isCheckingDuplicate to true while checking', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetAllTransactions.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useManualEntry());

      let checkPromise: Promise<boolean>;
      act(() => {
        checkPromise = result.current.checkForDuplicate(mockTransactionData);
      });

      expect(result.current.isCheckingDuplicate).toBe(true);

      await act(async () => {
        resolvePromise!([]);
        await checkPromise;
      });

      expect(result.current.isCheckingDuplicate).toBe(false);
    });

    it('should handle errors during duplicate check', async () => {
      mockGetAllTransactions.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useManualEntry());

      let isDuplicate: boolean;
      await act(async () => {
        isDuplicate = await result.current.checkForDuplicate(mockTransactionData);
      });

      expect(isDuplicate!).toBe(false);
      expect(result.current.error).toBe('Database error');
      expect(result.current.isCheckingDuplicate).toBe(false);
    });
  });

  describe('confirmSaveDespiteDuplicate', () => {
    const existingTransaction = {
      id: 'tx-existing-1',
      date: new Date('2024-01-15'),
      amount: -5000,
      description: 'Test manual transaction',
      categoryId: 'cat-1',
      originId: null,
      batchId: null,
      referenceMonth: '2024-01',
      needsReview: false,
      isExcludedFromTotals: false,
      duplicateOf: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    /**
     * **Validates: Requirement 15.11**
     * WHEN a potential duplicate is detected, THE App SHALL display a warning and allow the user to proceed
     */
    it('should save transaction when user confirms despite duplicate', async () => {
      mockGetAllTransactions.mockResolvedValue([existingTransaction]);

      const { result } = renderHook(() => useManualEntry());

      // First, check for duplicate
      await act(async () => {
        await result.current.checkForDuplicate(mockTransactionData);
      });

      expect(result.current.duplicateWarning).not.toBeNull();

      // Then confirm save
      let savedTransaction;
      await act(async () => {
        savedTransaction = await result.current.confirmSaveDespiteDuplicate();
      });

      expect(mockCreateTransaction).toHaveBeenCalledWith(mockTransactionData);
      expect(savedTransaction).toEqual(mockCreatedTransaction);
      expect(result.current.duplicateWarning).toBeNull();
      expect(result.current.pendingTransaction).toBeNull();
    });

    it('should return null if no pending transaction', async () => {
      const { result } = renderHook(() => useManualEntry());

      let savedTransaction;
      await act(async () => {
        savedTransaction = await result.current.confirmSaveDespiteDuplicate();
      });

      expect(savedTransaction).toBeNull();
      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('cancelDuplicateSave', () => {
    const existingTransaction = {
      id: 'tx-existing-1',
      date: new Date('2024-01-15'),
      amount: -5000,
      description: 'Test manual transaction',
      categoryId: 'cat-1',
      originId: null,
      batchId: null,
      referenceMonth: '2024-01',
      needsReview: false,
      isExcludedFromTotals: false,
      duplicateOf: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    /**
     * **Validates: Requirement 15.11**
     * WHEN a potential duplicate is detected, THE App SHALL display a warning and allow the user to cancel
     */
    it('should clear duplicate warning and pending transaction when cancelled', async () => {
      mockGetAllTransactions.mockResolvedValue([existingTransaction]);

      const { result } = renderHook(() => useManualEntry());

      // First, check for duplicate
      await act(async () => {
        await result.current.checkForDuplicate(mockTransactionData);
      });

      expect(result.current.duplicateWarning).not.toBeNull();
      expect(result.current.pendingTransaction).not.toBeNull();

      // Then cancel
      act(() => {
        result.current.cancelDuplicateSave();
      });

      expect(result.current.duplicateWarning).toBeNull();
      expect(result.current.pendingTransaction).toBeNull();
      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });
  });
});
