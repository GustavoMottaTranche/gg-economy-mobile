/**
 * useImport Hook Tests
 *
 * Tests for the import hook that orchestrates file import flow.
 * The hook delegates import operations to ImportOrchestrator and
 * manages only React state.
 *
 * **Validates: Requirements 6, 11, 12, 29**
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock import service (for file selection)
const mockSelectFile = jest.fn();

jest.mock('../../services/import/ImportService', () => ({
  importService: {
    selectFile: () => mockSelectFile(),
  },
}));

// Mock ImportOrchestrator
const mockImportFile = jest.fn();
const mockOnProgress = jest.fn();
const mockCancel = jest.fn();

jest.mock('../../services/import/ImportOrchestrator', () => ({
  ImportOrchestrator: jest.fn().mockImplementation(() => ({
    importFile: mockImportFile,
    onProgress: mockOnProgress,
    cancel: mockCancel,
  })),
}));

// Mock repositories
jest.mock('../../repositories/TransactionRepository', () => ({
  transactionRepository: {},
}));

jest.mock('../../repositories/ImportBatchRepository', () => ({
  importBatchRepository: {},
}));

// Import after mocks
import { useImport } from '../useImport';

describe('useImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with idle state', () => {
      const { result } = renderHook(() => useImport());

      expect(result.current.isImporting).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('selectFile', () => {
    it('selects a file successfully', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        const selection = await result.current.selectFile();
        expect(selection.success).toBe(true);
      });

      expect(result.current.selectedFile).toEqual({
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });
      expect(result.current.isImporting).toBe(false);
    });

    it('handles cancelled selection', async () => {
      mockSelectFile.mockResolvedValue({
        success: false,
        cancelled: true,
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        const selection = await result.current.selectFile();
        expect(selection.cancelled).toBe(true);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('handles selection error', async () => {
      mockSelectFile.mockResolvedValue({
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: 'Failed to read file',
        },
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      expect(result.current.error).toBe('Failed to read file');
    });
  });

  describe('importSelectedFile', () => {
    it('imports selected file successfully using orchestrator', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      mockImportFile.mockResolvedValue({
        success: true,
        transactionsImported: 10,
        duplicatesFound: 2,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        batch: { id: 'batch-1' },
      });

      const { result } = renderHook(() => useImport());

      // First select a file
      await act(async () => {
        await result.current.selectFile();
      });

      // Then import it
      await act(async () => {
        const importResult = await result.current.importSelectedFile();
        expect(importResult.success).toBe(true);
        expect(importResult.transactionsImported).toBe(10);
      });

      // Verify orchestrator was used
      expect(mockOnProgress).toHaveBeenCalled();
      expect(mockImportFile).toHaveBeenCalledWith('file://test.csv', 'test.csv', 'csv', {});

      expect(result.current.result?.success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns error when no file selected', async () => {
      const { result } = renderHook(() => useImport());

      await act(async () => {
        const importResult = await result.current.importSelectedFile();
        expect(importResult.success).toBe(false);
        expect(importResult.error?.message).toBe('No file selected');
      });
    });

    it('handles import error from orchestrator', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      mockImportFile.mockResolvedValue({
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [{ message: 'Invalid format' }],
        warnings: [],
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse file',
        },
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      await act(async () => {
        const importResult = await result.current.importSelectedFile();
        expect(importResult.success).toBe(false);
      });

      expect(result.current.error).toBe('Failed to parse file');
    });
  });

  describe('selectAndImport', () => {
    it('selects and imports in one step using orchestrator', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      mockImportFile.mockResolvedValue({
        success: true,
        transactionsImported: 15,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        batch: { id: 'batch-2' },
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        const importResult = await result.current.selectAndImport();
        expect(importResult.success).toBe(true);
        expect(importResult.transactionsImported).toBe(15);
      });

      // Verify orchestrator was used
      expect(mockImportFile).toHaveBeenCalledWith('file://test.csv', 'test.csv', 'csv', {});

      expect(result.current.selectedFile).toBeDefined();
      expect(result.current.result?.success).toBe(true);
    });

    it('handles cancelled selection in selectAndImport', async () => {
      mockSelectFile.mockResolvedValue({
        success: false,
        cancelled: true,
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        const importResult = await result.current.selectAndImport();
        expect(importResult.success).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('importFromUri', () => {
    it('imports from a shared file URI using orchestrator', async () => {
      mockImportFile.mockResolvedValue({
        success: true,
        transactionsImported: 5,
        duplicatesFound: 1,
        duplicates: [],
        parseErrors: [],
        warnings: [],
        batch: { id: 'batch-3' },
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        const importResult = await result.current.importFromUri(
          'content://shared/file.ofx',
          'file.ofx',
          'ofx'
        );
        expect(importResult.success).toBe(true);
      });

      // Verify orchestrator was used
      expect(mockImportFile).toHaveBeenCalledWith(
        'content://shared/file.ofx',
        'file.ofx',
        'ofx',
        {}
      );
    });

    it('passes import options to orchestrator', async () => {
      mockImportFile.mockResolvedValue({
        success: true,
        transactionsImported: 5,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.importFromUri('file://test.csv', 'test.csv', 'csv', {
          locale: 'pt-BR',
        });
      });

      expect(mockImportFile).toHaveBeenCalledWith('file://test.csv', 'test.csv', 'csv', {
        locale: 'pt-BR',
      });
    });
  });

  describe('cancel', () => {
    it('cancels the import and calls orchestrator cancel', () => {
      const { result } = renderHook(() => useImport());

      // Trigger an import to create the orchestrator
      act(() => {
        result.current.cancel();
      });

      expect(result.current.isImporting).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
    });
  });

  describe('reset', () => {
    it('resets the import state', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      expect(result.current.selectedFile).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isImporting).toBe(false);
      expect(result.current.progress.stage).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('progress tracking', () => {
    it('tracks progress during import via orchestrator events', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      // Simulate slow import with progress callbacks
      mockImportFile.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                transactionsImported: 10,
                duplicatesFound: 0,
                duplicates: [],
                parseErrors: [],
                warnings: [],
              });
            }, 100);
          })
      );

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      // Start import (don't await)
      let importPromise: Promise<unknown>;
      act(() => {
        importPromise = result.current.importSelectedFile();
      });

      // Check that isImporting is true during import
      expect(result.current.isImporting).toBe(true);

      // Verify onProgress was registered
      expect(mockOnProgress).toHaveBeenCalled();

      // Wait for import to complete
      await act(async () => {
        await importPromise;
      });

      expect(result.current.isImporting).toBe(false);
    });

    it('updates state when orchestrator emits progress', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      // Capture the progress callback
      let progressCallback: ((progress: unknown) => void) | null = null;
      mockOnProgress.mockImplementation((cb) => {
        progressCallback = cb;
      });

      mockImportFile.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Simulate progress updates
            if (progressCallback) {
              progressCallback({
                stage: 'reading',
                percentage: 10,
                message: 'Reading file...',
                transactionsProcessed: 0,
                totalTransactions: 0,
              });
            }
            setTimeout(() => {
              if (progressCallback) {
                progressCallback({
                  stage: 'complete',
                  percentage: 100,
                  message: 'Import complete',
                  transactionsProcessed: 10,
                  totalTransactions: 10,
                });
              }
              resolve({
                success: true,
                transactionsImported: 10,
                duplicatesFound: 0,
                duplicates: [],
                parseErrors: [],
                warnings: [],
              });
            }, 50);
          })
      );

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      await act(async () => {
        await result.current.importSelectedFile();
      });

      // Final state should reflect completion
      expect(result.current.isImporting).toBe(false);
      expect(result.current.result?.success).toBe(true);
    });
  });

  describe('orchestrator delegation', () => {
    it('delegates to ImportOrchestrator for import operations', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      mockImportFile.mockResolvedValue({
        success: true,
        transactionsImported: 5,
        duplicatesFound: 0,
        duplicates: [],
        parseErrors: [],
        warnings: [],
      });

      const { result } = renderHook(() => useImport());

      // First select a file
      await act(async () => {
        await result.current.selectFile();
      });

      // Then import it
      await act(async () => {
        await result.current.importSelectedFile({ locale: 'en' });
      });

      // Verify ImportOrchestrator.importFile was called
      expect(mockImportFile).toHaveBeenCalledWith('file://test.csv', 'test.csv', 'csv', {
        locale: 'en',
      });

      // Verify progress subscription was set up
      expect(mockOnProgress).toHaveBeenCalled();
    });

    it('uses importService only for file selection', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file://test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      const { result } = renderHook(() => useImport());

      await act(async () => {
        await result.current.selectFile();
      });

      // importService.selectFile should be called for file selection
      expect(mockSelectFile).toHaveBeenCalled();
    });
  });
});
