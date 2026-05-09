/**
 * Import Screen
 *
 * File selection screen for importing transactions:
 * - Single file import via document picker
 * - Multi-file import via MultiFileSelector (Requirement 4.1)
 * - Progress tracking via ProgressTracker (Requirement 6.1)
 * - Sheet selection for Excel files via SheetSelector (Requirement 9.1)
 * - Import summary via ImportSummary (Requirement 7.1)
 *
 * **Validates: Requirements 4.1, 6.1, 7.1, 9.1, 11, 12, 30**
 */
import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useImport } from '../../src/hooks/useImport';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import {
  MultiFileSelector,
  ProgressTracker,
  SheetSelector,
  ImportSummary,
} from '../../src/components/import';
import type {
  SelectedFile,
  ImportProgress,
  FileImportResult,
  MultiFileImportResult,
  SheetInfo,
} from '../../src/services/import/types';
import { useImportPreferences, useLastManualCategory } from '../../src/hooks/useImportPreferences';
import { useManualEntry } from '../../src/hooks/useManualEntry';
import { ManualEntryForm } from '../../src/components/import/ManualEntryForm';
import type { CreateTransactionDTO } from '../../src/types/transaction';

/**
 * Import screen view states
 */
type ImportViewState =
  | 'selection' // Initial file selection view
  | 'multiFileSelection' // Multi-file selection view
  | 'sheetSelection' // Excel sheet selection view
  | 'progress' // Import progress view
  | 'summary' // Import summary view
  | 'manualEntry'; // Manual entry form view (Requirement 15.1)

/**
 * Supported file format information
 */
const SUPPORTED_FORMATS = [
  {
    extension: 'CSV',
    description: 'Comma-separated values',
    icon: '📊',
  },
  {
    extension: 'OFX',
    description: 'Open Financial Exchange',
    icon: '🏦',
  },
  {
    extension: 'QIF',
    description: 'Quicken Interchange Format',
    icon: '💰',
  },
  {
    extension: 'XLSX',
    description: 'Excel Spreadsheet',
    icon: '📗',
  },
  {
    extension: 'XLS',
    description: 'Excel Spreadsheet (Legacy)',
    icon: '📗',
  },
];

export default function ImportScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ sharedUri?: string; sharedFileName?: string }>();
  const { selectFile, isImporting, progress, error, reset } = useImport();

  const { setLastImportMode, setLastManualCategory } = useImportPreferences();

  // Get last used category for manual entry (Requirement 15.12)
  const lastManualCategoryId = useLastManualCategory();

  // Manual entry hook (Requirement 15.1)
  const {
    isSaving: isManualSaving,
    isCheckingDuplicate,
    duplicateWarning,
    checkForDuplicate,
    saveTransaction,
    confirmSaveDespiteDuplicate,
    cancelDuplicateSave,
    reset: resetManualEntry,
  } = useManualEntry();

  // View state management
  const [viewState, setViewState] = useState<ImportViewState>('selection');

  // Multi-file import state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [partialResults, setPartialResults] = useState<FileImportResult[]>([]);
  const [importResult, setImportResult] = useState<MultiFileImportResult | null>(null);

  // Sheet selection state
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [currentExcelFile, setCurrentExcelFile] = useState<SelectedFile | null>(null);

  // Abort controller for cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  /**
   * Handle shared file from Share Intent (Android)
   */
  useEffect(() => {
    if (params.sharedUri && params.sharedFileName) {
      // Navigate to progress screen with shared file info
      router.push({
        pathname: '/import/progress',
        params: {
          uri: params.sharedUri,
          fileName: params.sharedFileName,
          isShared: 'true',
        },
      });
    }
  }, [params.sharedUri, params.sharedFileName]);

  /**
   * Handle single file selection
   */
  const handleSelectFile = useCallback(async () => {
    const result = await selectFile();

    if (result.success && result.uri && result.fileName) {
      // Navigate to progress screen with selected file info
      router.push({
        pathname: '/import/progress',
        params: {
          uri: result.uri,
          fileName: result.fileName,
          fileType: result.fileType ?? '',
        },
      });
    }
    // If cancelled or error, stay on this screen
    // Error will be displayed via the error state
  }, [selectFile]);

  /**
   * Handle multi-file mode selection (Requirement 4.1)
   */
  const handleMultiFileMode = useCallback(() => {
    setLastImportMode('multiple');
    setViewState('multiFileSelection');
  }, [setLastImportMode]);

  /**
   * Handle manual entry mode selection (Requirement 15.1)
   */
  const handleManualEntryMode = useCallback(() => {
    setViewState('manualEntry');
  }, []);

  /**
   * Handle manual entry save (Requirement 15.1, 15.6, 15.10)
   */
  const handleManualEntrySave = useCallback(
    async (transaction: CreateTransactionDTO) => {
      // First check for duplicates (Requirement 15.10)
      const hasDuplicate = await checkForDuplicate(transaction);

      if (!hasDuplicate) {
        // No duplicate found, save directly
        const saved = await saveTransaction(transaction);
        if (saved) {
          // Update last used category (Requirement 15.12)
          if (transaction.categoryId) {
            setLastManualCategory(transaction.categoryId);
          }
          // Return to selection view after successful save
          setViewState('selection');
          resetManualEntry();
        }
      }
      // If duplicate found, the warning modal will be shown by ManualEntryForm
    },
    [checkForDuplicate, saveTransaction, setLastManualCategory, resetManualEntry]
  );

  /**
   * Handle confirm save despite duplicate (Requirement 15.11)
   */
  const handleConfirmDuplicate = useCallback(async () => {
    const saved = await confirmSaveDespiteDuplicate();
    if (saved) {
      // Return to selection view after successful save
      setViewState('selection');
      resetManualEntry();
    }
  }, [confirmSaveDespiteDuplicate, resetManualEntry]);

  /**
   * Handle cancel duplicate save (Requirement 15.11)
   */
  const handleCancelDuplicate = useCallback(() => {
    cancelDuplicateSave();
  }, [cancelDuplicateSave]);

  /**
   * Handle manual entry cancel (Requirement 15.9)
   */
  const handleManualEntryCancel = useCallback(() => {
    setViewState('selection');
    resetManualEntry();
  }, [resetManualEntry]);

  /**
   * Handle files selected from MultiFileSelector (Requirement 4.1)
   */
  const handleFilesSelected = useCallback(async (files: SelectedFile[]) => {
    setSelectedFiles(files);

    // Check if any Excel files need sheet selection
    const excelFiles = files.filter((f) => f.fileType === 'xlsx' || f.fileType === 'xls');

    if (excelFiles.length > 0 && excelFiles[0]) {
      // For now, we'll handle sheet selection for the first Excel file
      // In a more complete implementation, we'd handle each Excel file
      // TODO: Implement sheet listing from ExcelParser
      setCurrentExcelFile(excelFiles[0]);
      // For now, proceed directly to import
    }

    // Start import process
    setViewState('progress');
    await startMultiFileImport(files);
  }, []);

  /**
   * Start multi-file import process (Requirement 5.1, 6.1)
   */
  const startMultiFileImport = useCallback(async (files: SelectedFile[]) => {
    const controller = new AbortController();
    setAbortController(controller);

    const firstFile = files[0];
    if (!firstFile) {
      return;
    }

    // Initialize progress
    setImportProgress({
      currentFile: firstFile.fileName,
      currentIndex: 0,
      totalFiles: files.length,
      status: 'parsing',
      overallProgress: 0,
    });
    setPartialResults([]);

    // Simulate import process for each file
    // In a real implementation, this would use MultiFileImporter
    const results: FileImportResult[] = [];
    let totalTransactions = 0;
    const totalDuplicates = 0;

    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) {
        break;
      }

      const file = files[i];
      if (!file) {
        continue;
      }

      // Update progress
      setImportProgress({
        currentFile: file.fileName,
        currentIndex: i,
        totalFiles: files.length,
        status: 'parsing',
        overallProgress: (i / files.length) * 100,
      });

      try {
        // Navigate to progress screen for actual import
        // This is a simplified version - in production, use MultiFileImporter
        router.push({
          pathname: '/import/progress',
          params: {
            uri: file.uri,
            fileName: file.fileName,
            fileType: file.fileType,
          },
        });
        return; // Exit after navigating to progress screen
      } catch (err) {
        const result: FileImportResult = {
          fileName: file.fileName,
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          error: {
            code: 'PARSE_ERROR',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        };
        results.push(result);
        setPartialResults([...results]);
      }
    }

    // Set final result
    const finalResult: MultiFileImportResult = {
      success: results.some((r) => r.success),
      fileResults: results,
      totalTransactionsImported: totalTransactions,
      totalDuplicatesInFile: totalDuplicates,
      totalCrossFileDuplicates: 0,
      totalDatabaseDuplicates: 0,
      failedFiles: results.filter((r) => !r.success).map((r) => r.fileName),
      batchGroupId: `batch-${Date.now()}`,
    };

    setImportResult(finalResult);
    setImportProgress((prev) =>
      prev
        ? {
            ...prev,
            status: 'completed',
            overallProgress: 100,
          }
        : null
    );
    setViewState('summary');
  }, []);

  /**
   * Handle cancel from MultiFileSelector
   */
  const handleMultiFileSelectorCancel = useCallback(() => {
    setViewState('selection');
    setSelectedFiles([]);
  }, []);

  /**
   * Handle sheet selection (Requirement 9.1)
   */
  const handleSheetSelect = useCallback((_sheetName: string) => {
    // Store selected sheet and proceed with import
    setViewState('progress');
    // TODO: Pass selected sheet to import process
  }, []);

  /**
   * Handle sheet selection timeout (Requirement 9.4)
   */
  const handleSheetTimeout = useCallback(() => {
    // Use first sheet by default
    if (availableSheets.length > 0 && availableSheets[0]) {
      handleSheetSelect(availableSheets[0].name);
    }
  }, [availableSheets, handleSheetSelect]);

  /**
   * Handle cancel import (Requirement 6.6)
   */
  const handleCancelImport = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setViewState('selection');
    setImportProgress(null);
    setPartialResults([]);
    reset();
  }, [abortController, reset]);

  /**
   * Handle go to review from summary (Requirement 7.6)
   */
  const handleGoToReview = useCallback(() => {
    router.push('/review');
  }, []);

  /**
   * Handle retry failed files (Requirement 10.5)
   */
  const handleRetryFailed = useCallback(() => {
    if (importResult) {
      const failedFiles = selectedFiles.filter((f) =>
        importResult.failedFiles.includes(f.fileName)
      );
      if (failedFiles.length > 0) {
        setViewState('progress');
        startMultiFileImport(failedFiles);
      }
    }
  }, [importResult, selectedFiles, startMultiFileImport]);

  /**
   * Handle close summary
   */
  const handleCloseSummary = useCallback(() => {
    setViewState('selection');
    setImportResult(null);
    setSelectedFiles([]);
    setPartialResults([]);
    setCurrentExcelFile(null);
    setAvailableSheets([]);
    reset();
  }, [reset]);

  /**
   * Handle close button press
   */
  const handleClose = useCallback(() => {
    reset();
    router.back();
  }, [reset]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  // Show loading state while selecting file
  if (isImporting && progress.stage === 'selecting') {
    return (
      <View style={styles.container} testID="import-screen-loading">
        <LoadingIndicator message={t('fileImport.selectFile')} testID="import-loading-indicator" />
      </View>
    );
  }

  // Render MultiFileSelector view (Requirement 4.1)
  if (viewState === 'multiFileSelection') {
    return (
      <View style={styles.container} testID="import-screen-multi-file">
        <MultiFileSelector
          maxFiles={10}
          onFilesSelected={handleFilesSelected}
          onCancel={handleMultiFileSelectorCancel}
        />
      </View>
    );
  }

  // Render SheetSelector view (Requirement 9.1)
  if (viewState === 'sheetSelection' && availableSheets.length > 0) {
    return (
      <View style={styles.container} testID="import-screen-sheet-selection">
        <SheetSelector
          sheets={availableSheets}
          onSelect={handleSheetSelect}
          onTimeout={handleSheetTimeout}
          timeout={5}
          fileName={currentExcelFile?.fileName}
        />
      </View>
    );
  }

  // Render ProgressTracker view (Requirement 6.1)
  if (viewState === 'progress' && importProgress) {
    return (
      <View style={styles.container} testID="import-screen-progress">
        <ProgressTracker
          progress={importProgress}
          partialResults={partialResults}
          onCancel={handleCancelImport}
        />
      </View>
    );
  }

  // Render ImportSummary view (Requirement 7.1)
  if (viewState === 'summary' && importResult) {
    return (
      <View style={styles.container} testID="import-screen-summary">
        <ImportSummary
          result={importResult}
          onGoToReview={handleGoToReview}
          onRetryFailed={handleRetryFailed}
          onClose={handleCloseSummary}
        />
      </View>
    );
  }

  // Render ManualEntryForm view (Requirement 15.1)
  if (viewState === 'manualEntry') {
    return (
      <View style={styles.container} testID="import-screen-manual-entry">
        <ManualEntryForm
          onSave={handleManualEntrySave}
          onCancel={handleManualEntryCancel}
          defaultCategoryId={lastManualCategoryId ?? undefined}
          isSaving={isManualSaving}
          isCheckingDuplicate={isCheckingDuplicate}
          duplicateWarning={duplicateWarning}
          onConfirmDuplicate={handleConfirmDuplicate}
          onCancelDuplicate={handleCancelDuplicate}
        />
      </View>
    );
  }

  // Default selection view
  return (
    <View style={styles.container} testID="import-screen">
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        testID="import-close-button"
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Icon */}
          <Text style={styles.icon}>📁</Text>

          {/* Title */}
          <Text style={styles.title}>{t('fileImport.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{t('fileImport.supportedFormats')}</Text>

          {/* Supported formats list */}
          <View style={styles.formatsContainer}>
            {SUPPORTED_FORMATS.map((format) => (
              <View key={format.extension} style={styles.formatItem}>
                <Text style={styles.formatIcon}>{format.icon}</Text>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatExtension}>.{format.extension}</Text>
                  <Text style={styles.formatDescription}>{format.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Error display */}
          {error && (
            <View style={styles.errorContainer} testID="import-error">
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
                testID="import-retry-button"
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Select file button */}
          <TouchableOpacity
            style={[styles.selectButton, isImporting && styles.selectButtonDisabled]}
            onPress={handleSelectFile}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel={t('fileImport.selectFile')}
            accessibilityState={{ disabled: isImporting }}
            testID="import-select-button"
          >
            <Text style={styles.selectButtonText}>{t('fileImport.selectFile')}</Text>
          </TouchableOpacity>

          {/* Multi-file import button (Requirement 4.1) */}
          <TouchableOpacity
            style={[styles.multiFileButton, isImporting && styles.selectButtonDisabled]}
            onPress={handleMultiFileMode}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel={t('fileImport.multiFile.selectMultiple')}
            accessibilityState={{ disabled: isImporting }}
            testID="import-multi-file-button"
          >
            <Text style={styles.multiFileButtonText}>{t('fileImport.multiFile.selectMultiple')}</Text>
          </TouchableOpacity>

          {/* Manual entry button (Requirement 15.1) */}
          <TouchableOpacity
            style={[styles.manualEntryButton, isImporting && styles.selectButtonDisabled]}
            onPress={handleManualEntryMode}
            disabled={isImporting}
            accessibilityRole="button"
            accessibilityLabel={t('manual.title')}
            accessibilityState={{ disabled: isImporting }}
            testID="import-manual-entry-button"
          >
            <Text style={styles.manualEntryButtonText}>✏️ {t('manual.title')}</Text>
          </TouchableOpacity>

          {/* Platform-specific hint */}
          {Platform.OS === 'android' && (
            <Text style={styles.hint}>{t('fileImport.supportedFormats')}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  formatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  formatIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  formatInfo: {
    flex: 1,
  },
  formatExtension: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  formatDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  selectButtonDisabled: {
    backgroundColor: '#A0A0A0',
    shadowOpacity: 0,
    elevation: 0,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  multiFileButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  multiFileButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  manualEntryButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
});
