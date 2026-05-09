/**
 * useImport Hook
 *
 * Custom hook for orchestrating the import flow including file selection,
 * parsing, deduplication, and progress tracking.
 *
 * This hook delegates import business logic to ImportOrchestrator and
 * focuses only on React state management and subscribing to orchestrator events.
 *
 * **Validates: Requirements 6, 11, 12, 29**
 */
import { useState, useCallback, useRef } from 'react';
import {
  importService,
  type ImportOptions,
  type FileSelectionResult,
} from '../services/import/ImportService';
import {
  ImportOrchestrator,
  type ImportProgress as OrchestratorProgress,
  type ImportResult as OrchestratorResult,
  type ImportStage as OrchestratorStage,
} from '../services/import/ImportOrchestrator';
import { transactionRepository } from '../repositories/TransactionRepository';
import { importBatchRepository } from '../repositories/ImportBatchRepository';
import type { FileType } from '../types';

/**
 * Import stage for progress tracking
 */
export type ImportStage =
  | 'idle'
  | 'selecting'
  | 'reading'
  | 'parsing'
  | 'deduplicating'
  | 'saving'
  | 'complete'
  | 'error';

/**
 * Import progress state
 */
export interface ImportProgress {
  /** Current stage of the import process */
  stage: ImportStage;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Human-readable message */
  message: string;
  /** Number of transactions processed */
  transactionsProcessed: number;
  /** Total number of transactions */
  totalTransactions: number;
}

/**
 * Import result type (re-exported from orchestrator for backward compatibility)
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** Created import batch (if successful) */
  batch?: {
    id: string;
    fileName: string;
    fileType: FileType;
    transactionCount: number;
    status: string;
  };
  /** Number of transactions imported */
  transactionsImported: number;
  /** Number of duplicates found */
  duplicatesFound: number;
  /** Duplicate details */
  duplicates: OrchestratorResult['duplicates'];
  /** Parse errors encountered */
  parseErrors: Array<{ lineNumber?: number; message: string }>;
  /** Warnings */
  warnings: string[];
  /** Error (if failed) */
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Import state
 */
export interface ImportState {
  /** Whether an import is in progress */
  isImporting: boolean;
  /** Current progress */
  progress: ImportProgress;
  /** Last import result */
  result: ImportResult | null;
  /** Selected file info */
  selectedFile: {
    uri: string;
    fileName: string;
    fileType: FileType;
  } | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Return type for useImport hook
 */
export interface UseImportReturn extends ImportState {
  /** Select a file for import */
  selectFile: () => Promise<FileSelectionResult>;
  /** Import the selected file */
  importSelectedFile: (options?: ImportOptions) => Promise<ImportResult>;
  /** Select and import a file in one step */
  selectAndImport: (options?: ImportOptions) => Promise<ImportResult>;
  /** Import from a shared file URI */
  importFromUri: (
    uri: string,
    fileName: string,
    fileType?: FileType,
    options?: ImportOptions
  ) => Promise<ImportResult>;
  /** Cancel the current import */
  cancel: () => void;
  /** Reset the import state */
  reset: () => void;
}

/**
 * Initial progress state
 */
const initialProgress: ImportProgress = {
  stage: 'idle',
  percentage: 0,
  message: '',
  transactionsProcessed: 0,
  totalTransactions: 0,
};

/**
 * Initial import state
 */
const initialState: ImportState = {
  isImporting: false,
  progress: initialProgress,
  result: null,
  selectedFile: null,
  error: null,
};

/**
 * Maps orchestrator stage to hook stage
 */
function mapOrchestratorStage(stage: OrchestratorStage): ImportStage {
  switch (stage) {
    case 'idle':
      return 'idle';
    case 'reading':
      return 'reading';
    case 'parsing':
      return 'parsing';
    case 'deduplicating':
      return 'deduplicating';
    case 'saving':
      return 'saving';
    case 'complete':
      return 'complete';
    case 'error':
    case 'cancelled':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Converts orchestrator result to hook result format
 */
function mapOrchestratorResult(result: OrchestratorResult): ImportResult {
  return {
    success: result.success,
    batch: result.batch,
    transactionsImported: result.transactionsImported,
    duplicatesFound: result.duplicatesFound,
    duplicates: result.duplicates,
    parseErrors: result.parseErrors,
    warnings: result.warnings,
    error: result.error,
  };
}

/**
 * Hook for managing the import flow
 *
 * This hook delegates import business logic to ImportOrchestrator and
 * focuses only on React state management and subscribing to orchestrator events.
 *
 * @returns Import management interface
 *
 * @example
 * ```tsx
 * const { selectAndImport, progress, result, isImporting, error } = useImport();
 *
 * const handleImport = async () => {
 *   const result = await selectAndImport({ locale: 'pt-BR' });
 *   if (result.success) {
 *     // Navigate to review screen
 *   }
 * };
 * ```
 */
export function useImport(): UseImportReturn {
  const [state, setState] = useState<ImportState>(initialState);
  const cancelledRef = useRef(false);

  // Create orchestrator instance with repository singletons
  const orchestratorRef = useRef<ImportOrchestrator | null>(null);

  // Lazily create orchestrator to avoid issues during testing
  const getOrchestrator = useCallback(() => {
    if (!orchestratorRef.current) {
      orchestratorRef.current = new ImportOrchestrator(
        transactionRepository,
        importBatchRepository
      );
    }
    return orchestratorRef.current;
  }, []);

  /**
   * Update progress state from orchestrator events
   */
  const handleOrchestratorProgress = useCallback((progress: OrchestratorProgress) => {
    if (cancelledRef.current) return;

    setState((prev) => ({
      ...prev,
      progress: {
        stage: mapOrchestratorStage(progress.stage),
        percentage: progress.percentage,
        message: progress.message,
        transactionsProcessed: progress.transactionsProcessed,
        totalTransactions: progress.totalTransactions,
      },
    }));
  }, []);

  /**
   * Select a file for import
   */
  const selectFile = useCallback(async (): Promise<FileSelectionResult> => {
    cancelledRef.current = false;

    setState((prev) => ({
      ...prev,
      isImporting: true,
      error: null,
      progress: {
        ...initialProgress,
        stage: 'selecting',
        message: 'Selecting file...',
      },
    }));

    try {
      const result = await importService.selectFile();

      if (cancelledRef.current) {
        return { success: false, cancelled: true };
      }

      if (result.success && result.uri && result.fileName && result.fileType) {
        setState((prev) => ({
          ...prev,
          selectedFile: {
            uri: result.uri!,
            fileName: result.fileName!,
            fileType: result.fileType!,
          },
          isImporting: false,
          progress: {
            ...initialProgress,
            stage: 'idle',
            message: 'File selected',
          },
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isImporting: false,
          selectedFile: null,
          error: result.cancelled ? null : (result.error?.message ?? 'Failed to select file'),
          progress: initialProgress,
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select file';
      setState((prev) => ({
        ...prev,
        isImporting: false,
        error: errorMessage,
        progress: {
          ...initialProgress,
          stage: 'error',
          message: errorMessage,
        },
      }));

      return {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: errorMessage,
        },
      };
    }
  }, []);

  /**
   * Import the selected file using ImportOrchestrator
   */
  const importSelectedFile = useCallback(
    async (options: ImportOptions = {}): Promise<ImportResult> => {
      const { selectedFile } = state;

      if (!selectedFile) {
        const errorResult: ImportResult = {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'FILE_READ_ERROR',
            message: 'No file selected',
          },
        };

        setState((prev) => ({
          ...prev,
          error: 'No file selected',
          result: errorResult,
        }));

        return errorResult;
      }

      cancelledRef.current = false;

      setState((prev) => ({
        ...prev,
        isImporting: true,
        error: null,
        result: null,
      }));

      try {
        // Get orchestrator and subscribe to progress events
        const orchestrator = getOrchestrator();
        orchestrator.onProgress(handleOrchestratorProgress);

        // Delegate import to orchestrator
        const orchestratorResult = await orchestrator.importFile(
          selectedFile.uri,
          selectedFile.fileName,
          selectedFile.fileType,
          options
        );

        if (cancelledRef.current) {
          return createCancelledResult();
        }

        const result = mapOrchestratorResult(orchestratorResult);

        setState((prev) => ({
          ...prev,
          isImporting: false,
          result,
          error: result.success ? null : (result.error?.message ?? 'Import failed'),
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed';

        const errorResult: ImportResult = {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'DATABASE_ERROR',
            message: errorMessage,
          },
        };

        setState((prev) => ({
          ...prev,
          isImporting: false,
          error: errorMessage,
          result: errorResult,
          progress: {
            ...initialProgress,
            stage: 'error',
            message: errorMessage,
          },
        }));

        return errorResult;
      }
    },
    [state.selectedFile, getOrchestrator, handleOrchestratorProgress]
  );

  /**
   * Select and import a file in one step
   */
  const selectAndImport = useCallback(
    async (options: ImportOptions = {}): Promise<ImportResult> => {
      cancelledRef.current = false;

      setState((prev) => ({
        ...prev,
        isImporting: true,
        error: null,
        result: null,
      }));

      try {
        // Selecting stage (UI operation, not delegated to orchestrator)
        setState((prev) => ({
          ...prev,
          progress: {
            stage: 'selecting',
            percentage: 5,
            message: 'Selecting file...',
            transactionsProcessed: 0,
            totalTransactions: 0,
          },
        }));

        const selectionResult = await importService.selectFile();

        if (cancelledRef.current) {
          return createCancelledResult();
        }

        if (!selectionResult.success) {
          const errorResult: ImportResult = {
            success: false,
            transactionsImported: 0,
            duplicatesFound: 0,
            duplicates: [],
            parseErrors: [],
            warnings: [],
            error: selectionResult.error ?? {
              code: 'FILE_READ_ERROR',
              message: selectionResult.cancelled ? 'Selection cancelled' : 'Failed to select file',
            },
          };

          setState((prev) => ({
            ...prev,
            isImporting: false,
            error: selectionResult.cancelled ? null : (errorResult.error?.message ?? null),
            result: selectionResult.cancelled ? null : errorResult,
            progress: initialProgress,
          }));

          return errorResult;
        }

        // Update selected file
        setState((prev) => ({
          ...prev,
          selectedFile: {
            uri: selectionResult.uri!,
            fileName: selectionResult.fileName!,
            fileType: selectionResult.fileType!,
          },
        }));

        // Get orchestrator and subscribe to progress events
        const orchestrator = getOrchestrator();
        orchestrator.onProgress(handleOrchestratorProgress);

        // Delegate import to orchestrator
        const orchestratorResult = await orchestrator.importFile(
          selectionResult.uri!,
          selectionResult.fileName!,
          selectionResult.fileType,
          options
        );

        if (cancelledRef.current) {
          return createCancelledResult();
        }

        const result = mapOrchestratorResult(orchestratorResult);

        setState((prev) => ({
          ...prev,
          isImporting: false,
          result,
          error: result.success ? null : (result.error?.message ?? 'Import failed'),
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed';

        const errorResult: ImportResult = {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'DATABASE_ERROR',
            message: errorMessage,
          },
        };

        setState((prev) => ({
          ...prev,
          isImporting: false,
          error: errorMessage,
          result: errorResult,
          progress: {
            ...initialProgress,
            stage: 'error',
            message: errorMessage,
          },
        }));

        return errorResult;
      }
    },
    [getOrchestrator, handleOrchestratorProgress]
  );

  /**
   * Import from a shared file URI using ImportOrchestrator
   */
  const importFromUri = useCallback(
    async (
      uri: string,
      fileName: string,
      fileType?: FileType,
      options: ImportOptions = {}
    ): Promise<ImportResult> => {
      cancelledRef.current = false;

      setState((prev) => ({
        ...prev,
        isImporting: true,
        error: null,
        result: null,
        selectedFile: fileType ? { uri, fileName, fileType } : null,
      }));

      try {
        // Get orchestrator and subscribe to progress events
        const orchestrator = getOrchestrator();
        orchestrator.onProgress(handleOrchestratorProgress);

        // Delegate import to orchestrator
        const orchestratorResult = await orchestrator.importFile(uri, fileName, fileType, options);

        if (cancelledRef.current) {
          return createCancelledResult();
        }

        const result = mapOrchestratorResult(orchestratorResult);

        setState((prev) => ({
          ...prev,
          isImporting: false,
          result,
          error: result.success ? null : (result.error?.message ?? 'Import failed'),
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed';

        const errorResult: ImportResult = {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'DATABASE_ERROR',
            message: errorMessage,
          },
        };

        setState((prev) => ({
          ...prev,
          isImporting: false,
          error: errorMessage,
          result: errorResult,
          progress: {
            ...initialProgress,
            stage: 'error',
            message: errorMessage,
          },
        }));

        return errorResult;
      }
    },
    [getOrchestrator, handleOrchestratorProgress]
  );

  /**
   * Cancel the current import
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    // Also cancel the orchestrator
    if (orchestratorRef.current) {
      orchestratorRef.current.cancel();
    }
    setState((prev) => ({
      ...prev,
      isImporting: false,
      progress: initialProgress,
    }));
  }, []);

  /**
   * Reset the import state
   */
  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState(initialState);
  }, []);

  return {
    ...state,
    selectFile,
    importSelectedFile,
    selectAndImport,
    importFromUri,
    cancel,
    reset,
  };
}

/**
 * Create a cancelled result
 */
function createCancelledResult(): ImportResult {
  return {
    success: false,
    transactionsImported: 0,
    duplicatesFound: 0,
    duplicates: [],
    parseErrors: [],
    warnings: [],
    error: {
      code: 'FILE_READ_ERROR',
      message: 'Import cancelled',
    },
  };
}

export default useImport;
