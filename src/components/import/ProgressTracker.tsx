/**
 * ProgressTracker Component
 *
 * Displays progress during multi-file import operations.
 * Shows current file being processed, overall progress, and allows cancellation.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ImportProgress, FileImportResult } from '../../services/import/types';

/**
 * Props for the ProgressTracker component
 */
export interface ProgressTrackerProps {
  /** Current progress */
  progress: ImportProgress;
  /** Partial results */
  partialResults: FileImportResult[];
  /** Callback to cancel */
  onCancel: () => void;
}

/**
 * Status icons for different import states
 */
const STATUS_ICONS: Record<ImportProgress['status'], string> = {
  parsing: '📄',
  deduping: '🔍',
  saving: '💾',
  completed: '✅',
  failed: '❌',
};

/**
 * Individual file result item component
 */
const FileResultItem = memo(function FileResultItem({
  result,
  isCurrent,
}: {
  result: FileImportResult;
  isCurrent: boolean;
}): JSX.Element {
  const { t } = useTranslation();

  const getStatusIcon = (): string => {
    if (result.success) return '✅';
    if (result.error) return '⚠️'; // Warning icon for failed files (Requirement 6.5)
    return '⏳';
  };

  const getStatusText = (): string => {
    if (result.success) {
      return t('fileImport.progress.fileSuccess', {
        count: result.transactionsImported,
      });
    }
    if (result.error) {
      return result.error.message;
    }
    return t('fileImport.progress.processing');
  };

  return (
    <View
      style={[styles.fileResultItem, isCurrent && styles.fileResultItemCurrent]}
      testID={`file-result-${result.fileName}`}
    >
      <View style={styles.fileResultContent}>
        <Text style={styles.fileResultIcon}>{getStatusIcon()}</Text>
        <View style={styles.fileResultInfo}>
          <Text
            style={[styles.fileResultName, isCurrent && styles.fileResultNameCurrent]}
            numberOfLines={1}
          >
            {result.fileName}
          </Text>
          <Text
            style={[styles.fileResultStatus, result.error && styles.fileResultStatusError]}
            numberOfLines={1}
          >
            {getStatusText()}
          </Text>
        </View>
      </View>
    </View>
  );
});

/**
 * ProgressTracker component
 *
 * Displays the progress of a multi-file import operation including:
 * - Current file being processed (Requirement 6.1, 6.3)
 * - Progress as "File X of Y" (Requirement 6.2)
 * - Overall progress bar (Requirement 6.4)
 * - Warning icon for failed files (Requirement 6.5)
 * - Cancel button (Requirement 6.6)
 *
 * @example
 * ```tsx
 * <ProgressTracker
 *   progress={{
 *     currentFile: 'bank-statement.xlsx',
 *     currentIndex: 2,
 *     totalFiles: 5,
 *     status: 'parsing',
 *     overallProgress: 40,
 *   }}
 *   partialResults={[
 *     { fileName: 'file1.csv', success: true, transactionsImported: 50, duplicatesFound: 2 },
 *   ]}
 *   onCancel={() => handleCancel()}
 * />
 * ```
 */
function ProgressTrackerComponent({
  progress,
  partialResults,
  onCancel,
}: ProgressTrackerProps): JSX.Element {
  const { t } = useTranslation();

  /**
   * Handles cancel button press (Requirement 6.6)
   */
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  /**
   * Renders a file result item
   */
  const renderFileResult = useCallback(
    ({ item }: { item: FileImportResult }) => (
      <FileResultItem result={item} isCurrent={item.fileName === progress.currentFile} />
    ),
    [progress.currentFile]
  );

  const keyExtractor = useCallback((item: FileImportResult) => item.fileName, []);

  const statusIcon = STATUS_ICONS[progress.status] || '📄';
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const canCancel = !isCompleted && !isFailed;

  // Calculate failed files count for display
  const failedCount = partialResults.filter((r) => !r.success && r.error).length;

  return (
    <View style={styles.container} testID="progress-tracker">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('fileImport.progress.title')}</Text>
        <Text style={styles.subtitle}>{t('fileImport.progress.subtitle')}</Text>
      </View>

      {/* Current File Display (Requirement 6.1, 6.3) */}
      <View style={styles.currentFileContainer}>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
        <View style={styles.currentFileInfo}>
          <Text style={styles.currentFileLabel}>{t('fileImport.progress.currentFile')}</Text>
          <Text style={styles.currentFileName} numberOfLines={1} testID="current-file-name">
            {progress.currentFile}
          </Text>
        </View>
      </View>

      {/* Progress Counter (Requirement 6.2) */}
      <View style={styles.progressCounterContainer}>
        <Text style={styles.progressCounter} testID="progress-counter">
          {t('fileImport.progress.fileXofY', {
            current: progress.currentIndex + 1,
            total: progress.totalFiles,
          })}
        </Text>
        <Text style={styles.progressStatus}>{t(`import.progress.status.${progress.status}`)}</Text>
      </View>

      {/* Overall Progress Bar (Requirement 6.4) */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, progress.overallProgress))}%` },
              isFailed && styles.progressBarFillError,
              isCompleted && styles.progressBarFillSuccess,
            ]}
            testID="progress-bar-fill"
          />
        </View>
        <Text style={styles.progressPercentage} testID="progress-percentage">
          {Math.round(progress.overallProgress)}%
        </Text>
      </View>

      {/* Failed Files Warning (Requirement 6.5) */}
      {failedCount > 0 && (
        <View style={styles.warningContainer} testID="failed-files-warning">
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            {t('fileImport.progress.failedFiles', { count: failedCount })}
          </Text>
        </View>
      )}

      {/* File Results List */}
      {partialResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>{t('fileImport.progress.processedFiles')}</Text>
          <FlatList
            data={partialResults}
            renderItem={renderFileResult}
            keyExtractor={keyExtractor}
            style={styles.resultsList}
            contentContainerStyle={styles.resultsListContent}
            showsVerticalScrollIndicator={false}
            testID="file-results-list"
          />
        </View>
      )}

      {/* Cancel Button (Requirement 6.6) */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, !canCancel && styles.cancelButtonDisabled]}
          onPress={handleCancel}
          disabled={!canCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('fileImport.progress.cancel')}
          accessibilityState={{ disabled: !canCancel }}
          testID="cancel-import-button"
        >
          <Text style={[styles.cancelButtonText, !canCancel && styles.cancelButtonTextDisabled]}>
            {canCancel
              ? t('fileImport.progress.cancelRemaining')
              : isCompleted
                ? t('fileImport.progress.completed')
                : t('fileImport.progress.failed')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Styles for ProgressTracker
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bae6fd',
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  currentFileInfo: {
    flex: 1,
  },
  currentFileLabel: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
    marginBottom: 2,
  },
  currentFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  progressCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressStatus: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  progressBarFillError: {
    backgroundColor: '#ef4444',
  },
  progressBarFillSuccess: {
    backgroundColor: '#22c55e',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 45,
    textAlign: 'right',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fcd34d',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    paddingTop: 12,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 8,
  },
  fileResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fileResultItemCurrent: {
    backgroundColor: '#f0f9ff',
  },
  fileResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileResultIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fileResultInfo: {
    flex: 1,
  },
  fileResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  fileResultNameCurrent: {
    color: '#0369a1',
  },
  fileResultStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  fileResultStatusError: {
    color: '#dc2626',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    paddingVertical: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  cancelButtonTextDisabled: {
    color: '#9ca3af',
  },
});

/**
 * Memoized ProgressTracker for performance optimization
 */
export const ProgressTracker = memo(ProgressTrackerComponent);

export default ProgressTracker;
