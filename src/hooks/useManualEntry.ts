/**
 * useManualEntry Hook
 *
 * Custom hook for handling manual transaction entry including:
 * - Creating transactions in the database
 * - Displaying success confirmation
 * - Error handling
 * - Duplicate detection against existing transactions
 * - Remembering last used category for repeated entries
 *
 * **Validates: Requirements 15.6, 15.7, 15.10, 15.11, 15.12**
 */
import { useState, useCallback } from 'react';
import { createTransaction, getAllTransactions } from '../db/queries/transactions';
import { useToastActions } from '../stores/toastStore';
import { DedupeEngine, DuplicateResult } from '../services/import/DedupeEngine';
import { setLastManualCategorySync } from './useImportPreferences';
import type { CreateTransactionDTO, Transaction, RawTransaction } from '../types';

/**
 * State for manual entry operations
 */
export interface ManualEntryState {
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether duplicate check is in progress */
  isCheckingDuplicate: boolean;
  /** Error message if save failed */
  error: string | null;
  /** Last saved transaction */
  lastSavedTransaction: Transaction | null;
  /** Potential duplicate found during check */
  duplicateWarning: DuplicateResult | null;
  /** Pending transaction data waiting for user confirmation */
  pendingTransaction: CreateTransactionDTO | null;
}

/**
 * Return type for useManualEntry hook
 */
export interface UseManualEntryReturn extends ManualEntryState {
  /**
   * Checks for potential duplicates before saving
   *
   * **Validates: Requirements 15.10**
   * - Requirement 15.10: Check manual entries against existing transactions
   *
   * @param data - Transaction data to check
   * @returns True if a duplicate was found (warning will be shown), false otherwise
   */
  checkForDuplicate: (data: CreateTransactionDTO) => Promise<boolean>;

  /**
   * Saves a manual transaction to the database
   *
   * **Validates: Requirements 15.6, 15.7, 15.12**
   * - Requirement 15.6: Creates a Transaction in the database
   * - Requirement 15.7: Displays a success confirmation
   * - Requirement 15.12: Remembers last used category for repeated entries
   *
   * @param data - Transaction data to save
   * @returns The created transaction or null if failed
   */
  saveTransaction: (data: CreateTransactionDTO) => Promise<Transaction | null>;

  /**
   * Confirms saving despite duplicate warning
   *
   * **Validates: Requirements 15.11**
   * - Requirement 15.11: Allow user to proceed with saving despite duplicate warning
   *
   * @returns The created transaction or null if failed
   */
  confirmSaveDespiteDuplicate: () => Promise<Transaction | null>;

  /**
   * Cancels the pending save operation (dismisses duplicate warning)
   *
   * **Validates: Requirements 15.11**
   * - Requirement 15.11: Allow user to cancel when duplicate is detected
   */
  cancelDuplicateSave: () => void;

  /**
   * Resets the error state
   */
  clearError: () => void;

  /**
   * Resets the entire state
   */
  reset: () => void;
}

/**
 * Initial state for manual entry
 */
const initialState: ManualEntryState = {
  isSaving: false,
  isCheckingDuplicate: false,
  error: null,
  lastSavedTransaction: null,
  duplicateWarning: null,
  pendingTransaction: null,
};

/**
 * DedupeEngine instance for duplicate detection
 */
const dedupeEngine = new DedupeEngine();

/**
 * Hook for managing manual transaction entry
 *
 * Handles the database creation of manual transactions and displays
 * success/error feedback to the user.
 *
 * @returns Manual entry management interface
 *
 * @example
 * ```tsx
 * const { saveTransaction, isSaving, error } = useManualEntry();
 *
 * const handleSave = async (data: CreateTransactionDTO) => {
 *   const transaction = await saveTransaction(data);
 *   if (transaction) {
 *     // Navigate back or reset form
 *   }
 * };
 * ```
 */
export function useManualEntry(): UseManualEntryReturn {
  const [state, setState] = useState<ManualEntryState>(initialState);
  const { showSuccess, showError } = useToastActions();

  /**
   * Checks for potential duplicates before saving
   *
   * **Validates: Requirements 15.10**
   */
  const checkForDuplicate = useCallback(async (data: CreateTransactionDTO): Promise<boolean> => {
    setState((prev) => ({
      ...prev,
      isCheckingDuplicate: true,
      duplicateWarning: null,
      pendingTransaction: null,
    }));

    try {
      // Get all existing transactions from database
      const existingTransactions = await getAllTransactions();

      // Convert CreateTransactionDTO to RawTransaction for dedupe check
      const rawTransaction: RawTransaction = {
        date: data.date,
        amount: data.amount,
        description: data.description,
      };

      // Use DedupeEngine to find duplicates
      const result = dedupeEngine.findDuplicates([rawTransaction], existingTransactions, {
        confidenceThreshold: 0.5,
      });

      if (result.duplicates.length > 0) {
        // Duplicate found - store warning and pending transaction
        const duplicateResult = result.duplicates[0];
        if (duplicateResult) {
          setState((prev) => ({
            ...prev,
            isCheckingDuplicate: false,
            duplicateWarning: duplicateResult,
            pendingTransaction: data,
          }));
          return true;
        }
      }

      // No duplicate found
      setState((prev) => ({
        ...prev,
        isCheckingDuplicate: false,
        duplicateWarning: null,
        pendingTransaction: null,
      }));
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'errors.database';

      setState((prev) => ({
        ...prev,
        isCheckingDuplicate: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  /**
   * Saves a manual transaction to the database
   *
   * **Validates: Requirements 15.6, 15.7, 15.12**
   */
  const saveTransaction = useCallback(
    async (data: CreateTransactionDTO): Promise<Transaction | null> => {
      setState((prev) => ({
        ...prev,
        isSaving: true,
        error: null,
      }));

      try {
        // Requirement 15.6: Create Transaction in the database
        const transaction = await createTransaction(data);

        // Requirement 15.12: Remember last used category for repeated entries
        if (data.categoryId) {
          setLastManualCategorySync(data.categoryId);
        }

        setState((prev) => ({
          ...prev,
          isSaving: false,
          lastSavedTransaction: transaction,
          duplicateWarning: null,
          pendingTransaction: null,
        }));

        // Requirement 15.7: Display success confirmation
        showSuccess('manual.transactionSaved');

        return transaction;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'errors.database';

        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMessage,
        }));

        // Show error toast
        showError(errorMessage);

        return null;
      }
    },
    [showSuccess, showError]
  );

  /**
   * Confirms saving despite duplicate warning
   *
   * **Validates: Requirements 15.11**
   */
  const confirmSaveDespiteDuplicate = useCallback(async (): Promise<Transaction | null> => {
    if (!state.pendingTransaction) {
      return null;
    }

    return saveTransaction(state.pendingTransaction);
  }, [state.pendingTransaction, saveTransaction]);

  /**
   * Cancels the pending save operation
   *
   * **Validates: Requirements 15.11**
   */
  const cancelDuplicateSave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      duplicateWarning: null,
      pendingTransaction: null,
    }));
  }, []);

  /**
   * Clears the error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Resets the entire state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    checkForDuplicate,
    saveTransaction,
    confirmSaveDespiteDuplicate,
    cancelDuplicateSave,
    clearError,
    reset,
  };
}

export default useManualEntry;
