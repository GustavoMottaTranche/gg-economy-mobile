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
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

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
}): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

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
      style={[
        styles.fileResultItem,
        { borderBottomColor: colors.border.subtle },
        isCurrent && { backgroundColor: colors.semantic.info.light },
      ]}
      testID={`file-result-${result.fileName}`}
    >
      <View style={styles.fileResultContent}>
        <Text style={styles.fileResultIcon}>{getStatusIcon()}</Text>
        <View style={styles.fileResultInfo}>
          <Text
            style={[
              styles.fileResultName,
              { color: colors.text.primary },
              isCurrent && { color: colors.semantic.info.dark },
            ]}
            numberOfLines={1}
          >
            {result.fileName}
          </Text>
          <Text
            style={[
              styles.fileResultStatus,
              { color: colors.text.secondary },
              result.error && { color: colors.semantic.danger.base },
            ]}
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
}: ProgressTrackerProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

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
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }]}
      testID="progress-tracker"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('fileImport.progress.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {t('fileImport.progress.subtitle')}
        </Text>
      </View>

      {/* Current File Display (Requirement 6.1, 6.3) */}
      <View
        style={[
          styles.currentFileContainer,
          { backgroundColor: colors.semantic.info.light, borderColor: colors.semantic.info.base },
        ]}
      >
        <Text style={styles.statusIcon}>{statusIcon}</Text>
        <View style={styles.currentFileInfo}>
          <Text style={[styles.currentFileLabel, { color: colors.semantic.info.dark }]}>
            {t('fileImport.progress.currentFile')}
          </Text>
          <Text
            style={[styles.currentFileName, { color: colors.semantic.info.dark }]}
            numberOfLines={1}
            testID="current-file-name"
          >
            {progress.currentFile}
          </Text>
        </View>
      </View>

      {/* Progress Counter (Requirement 6.2) */}
      <View style={styles.progressCounterContainer}>
        <Text
          style={[styles.progressCounter, { color: colors.text.primary }]}
          testID="progress-counter"
        >
          {t('fileImport.progress.fileXofY', {
            current: progress.currentIndex + 1,
            total: progress.totalFiles,
          })}
        </Text>
        <Text style={[styles.progressStatus, { color: colors.text.secondary }]}>
          {t(`import.progress.status.${progress.status}`)}
        </Text>
      </View>

      {/* Overall Progress Bar (Requirement 6.4) */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.border.default }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, progress.overallProgress))}%`,
                backgroundColor: colors.interactive.primary,
              },
              isFailed && { backgroundColor: colors.semantic.danger.base },
              isCompleted && { backgroundColor: colors.semantic.success.base },
            ]}
            testID="progress-bar-fill"
          />
        </View>
        <Text
          style={[styles.progressPercentage, { color: colors.text.primary }]}
          testID="progress-percentage"
        >
          {Math.round(progress.overallProgress)}%
        </Text>
      </View>

      {/* Failed Files Warning (Requirement 6.5) */}
      {failedCount > 0 && (
        <View
          style={[
            styles.warningContainer,
            {
              backgroundColor: colors.semantic.warning.light,
              borderColor: colors.semantic.warning.base,
            },
          ]}
          testID="failed-files-warning"
        >
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, { color: colors.semantic.warning.dark }]}>
            {t('fileImport.progress.failedFiles', { count: failedCount })}
          </Text>
        </View>
      )}

      {/* File Results List */}
      {partialResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsTitle, { color: colors.text.primary }]}>
            {t('fileImport.progress.processedFiles')}
          </Text>
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
      <View style={[styles.actionContainer, { borderTopColor: colors.border.default }]}>
        <TouchableOpacity
          style={[
            styles.cancelButton,
            { backgroundColor: colors.semantic.danger.light },
            !canCancel && { backgroundColor: colors.background.tertiary },
          ]}
          onPress={handleCancel}
          disabled={!canCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('fileImport.progress.cancel')}
          accessibilityState={{ disabled: !canCancel }}
          testID="cancel-import-button"
        >
          <Text
            style={[
              styles.cancelButtonText,
              { color: colors.semantic.danger.base },
              !canCancel && { color: colors.text.tertiary },
            ]}
          >
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
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statusIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  currentFileInfo: {
    flex: 1,
  },
  currentFileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  currentFileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  progressCounter: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressStatus: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: spacing.sm,
  },
  fileResultItem: {
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  fileResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileResultIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  fileResultInfo: {
    flex: 1,
  },
  fileResultName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileResultStatus: {
    fontSize: 12,
  },
  actionContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Memoized ProgressTracker for performance optimization
 */
export const ProgressTracker = memo(ProgressTrackerComponent);

export default ProgressTracker;
