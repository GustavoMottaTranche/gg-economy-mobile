/**
 * ImportSummary Component
 *
 * Displays a summary of multi-file import results including:
 * - Total transactions imported (Requirement 7.2)
 * - Total duplicates found (Requirement 7.3)
 * - Per-file results with status (Requirement 7.4, 7.5)
 * - Review All action (Requirement 7.6)
 * - Error message when all files fail (Requirement 7.7)
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MultiFileImportResult, FileImportResult } from '../../services/import/types';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

/**
 * Props for the ImportSummary component
 */
export interface ImportSummaryProps {
  /** Import result */
  result: MultiFileImportResult;
  /** Callback to go to review */
  onGoToReview: () => void;
  /** Callback to retry failed files */
  onRetryFailed: () => void;
  /** Callback to close */
  onClose: () => void;
}

/**
 * Status type for file results
 */
type FileStatus = 'success' | 'failed' | 'partial';

/**
 * Get the status of a file result
 */
const getFileStatus = (result: FileImportResult): FileStatus => {
  if (!result.success) return 'failed';
  if (result.duplicatesFound > 0) return 'partial';
  return 'success';
};

/**
 * Status icons for different file states
 */
const STATUS_ICONS: Record<FileStatus, string> = {
  success: '✅',
  failed: '❌',
  partial: '⚠️',
};

/**
 * Individual file result item component
 */
const FileResultItem = memo(function FileResultItem({
  result,
}: {
  result: FileImportResult;
}): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const status = getFileStatus(result);
  const statusIcon = STATUS_ICONS[status];

  const getStatusText = (): string => {
    if (!result.success && result.error) {
      return result.error.message;
    }
    if (result.success) {
      const parts: string[] = [];
      parts.push(
        t('fileImport.summary.transactionsImported', {
          count: result.transactionsImported,
        })
      );
      if (result.duplicatesFound > 0) {
        parts.push(
          t('fileImport.summary.duplicatesSkipped', {
            count: result.duplicatesFound,
          })
        );
      }
      return parts.join(' • ');
    }
    return t('fileImport.summary.failed');
  };

  return (
    <View
      style={[
        styles.fileResultItem,
        { backgroundColor: colors.background.secondary },
        !result.success && { backgroundColor: colors.semantic.danger.light },
      ]}
      testID={`file-result-${result.fileName}`}
    >
      <View style={styles.fileResultContent}>
        <Text style={styles.fileResultIcon} testID={`file-status-icon-${result.fileName}`}>
          {statusIcon}
        </Text>
        <View style={styles.fileResultInfo}>
          <Text
            style={[
              styles.fileResultName,
              { color: colors.text.primary },
              !result.success && { color: colors.semantic.danger.dark },
            ]}
            numberOfLines={1}
          >
            {result.fileName}
          </Text>
          <Text
            style={[
              styles.fileResultStatus,
              { color: colors.text.secondary },
              !result.success && { color: colors.semantic.danger.base },
            ]}
            numberOfLines={2}
            testID={`file-status-text-${result.fileName}`}
          >
            {getStatusText()}
          </Text>
        </View>
      </View>
    </View>
  );
});

/**
 * Troubleshooting suggestions for when all files fail
 */
const TROUBLESHOOTING_SUGGESTIONS = [
  'checkFileFormat',
  'checkFileNotCorrupted',
  'checkFileNotPasswordProtected',
  'tryDifferentFile',
] as const;

/**
 * ImportSummary component
 *
 * Displays the summary of a multi-file import operation including:
 * - Total transactions imported (Requirement 7.2)
 * - Total duplicates found (Requirement 7.3)
 * - Per-file results listing (Requirement 7.4, 7.5)
 * - "Review All" action (Requirement 7.6)
 * - Error message when all fail (Requirement 7.7)
 *
 * @example
 * ```tsx
 * <ImportSummary
 *   result={{
 *     success: true,
 *     fileResults: [...],
 *     totalTransactionsImported: 150,
 *     totalDuplicatesInFile: 5,
 *     totalCrossFileDuplicates: 3,
 *     totalDatabaseDuplicates: 2,
 *     failedFiles: [],
 *     batchGroupId: 'batch-123',
 *   }}
 *   onGoToReview={() => navigation.navigate('Review')}
 *   onRetryFailed={() => retryFailedFiles()}
 *   onClose={() => navigation.goBack()}
 * />
 * ```
 */
function ImportSummaryComponent({
  result,
  onGoToReview,
  onRetryFailed,
  onClose,
}: ImportSummaryProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Calculate totals
  const totalDuplicates = useMemo(
    () =>
      result.totalDuplicatesInFile +
      result.totalCrossFileDuplicates +
      result.totalDatabaseDuplicates,
    [result.totalDuplicatesInFile, result.totalCrossFileDuplicates, result.totalDatabaseDuplicates]
  );

  const successfulFiles = useMemo(
    () => result.fileResults.filter((r) => r.success).length,
    [result.fileResults]
  );

  const failedFilesCount = result.failedFiles.length;
  const allFilesFailed = failedFilesCount === result.fileResults.length && failedFilesCount > 0;
  const hasFailedFiles = failedFilesCount > 0;
  const hasSuccessfulImports = result.totalTransactionsImported > 0;

  /**
   * Handles "Review All" button press (Requirement 7.6)
   */
  const handleGoToReview = useCallback(() => {
    onGoToReview();
  }, [onGoToReview]);

  /**
   * Handles "Retry Failed" button press
   */
  const handleRetryFailed = useCallback(() => {
    onRetryFailed();
  }, [onRetryFailed]);

  /**
   * Handles "Close" button press
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Renders a file result item
   */
  const renderFileResult = useCallback(
    ({ item }: { item: FileImportResult }) => <FileResultItem result={item} />,
    []
  );

  const keyExtractor = useCallback((item: FileImportResult) => item.fileName, []);

  // Determine the overall status icon and color
  const getOverallStatusIcon = (): string => {
    if (allFilesFailed) return '❌';
    if (hasFailedFiles) return '⚠️';
    return '✅';
  };

  const getOverallStatusText = (): string => {
    if (allFilesFailed) {
      return t('fileImport.summary.allFilesFailed');
    }
    if (hasFailedFiles) {
      return t('fileImport.summary.partialSuccess', {
        success: successfulFiles,
        total: result.fileResults.length,
      });
    }
    return t('fileImport.summary.allFilesSuccess');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.card }]} testID="import-summary">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with overall status */}
        <View style={styles.header}>
          <Text style={styles.statusIcon} testID="overall-status-icon">
            {getOverallStatusIcon()}
          </Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>{t('fileImport.summary.title')}</Text>
          <Text
            style={[
              styles.statusText,
              { color: colors.text.secondary },
              allFilesFailed && { color: colors.semantic.danger.base },
            ]}
            testID="overall-status-text"
          >
            {getOverallStatusText()}
          </Text>
        </View>

        {/* All Files Failed Error Message (Requirement 7.7) */}
        {allFilesFailed && (
          <View
            style={[styles.errorContainer, { backgroundColor: colors.semantic.danger.light, borderColor: colors.semantic.danger.base }]}
            testID="all-files-failed-error"
          >
            <Text style={[styles.errorTitle, { color: colors.semantic.danger.dark }]}>{t('fileImport.summary.errorTitle')}</Text>
            <Text style={[styles.errorMessage, { color: colors.semantic.danger.dark }]}>{t('fileImport.summary.errorMessage')}</Text>
            <View style={[styles.troubleshootingContainer, { borderTopColor: colors.semantic.danger.base }]}>
              <Text style={[styles.troubleshootingTitle, { color: colors.semantic.danger.dark }]}>
                {t('fileImport.summary.troubleshootingTitle')}
              </Text>
              {TROUBLESHOOTING_SUGGESTIONS.map((suggestion) => (
                <View key={suggestion} style={styles.suggestionItem}>
                  <Text style={[styles.suggestionBullet, { color: colors.semantic.danger.dark }]}>•</Text>
                  <Text style={[styles.suggestionText, { color: colors.semantic.danger.dark }]}>
                    {t(`import.summary.troubleshooting.${suggestion}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Statistics Section (Requirements 7.2, 7.3) */}
        {!allFilesFailed && (
          <View style={[styles.statsContainer, { backgroundColor: colors.background.secondary }]} testID="import-stats">
            {/* Total Transactions Imported (Requirement 7.2) */}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text.primary }]} testID="total-transactions">
                {result.totalTransactionsImported}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('fileImport.summary.totalTransactions')}</Text>
            </View>

            {/* Total Duplicates Found (Requirement 7.3) */}
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: colors.text.primary },
                  totalDuplicates > 0 && { color: colors.semantic.warning.base },
                ]}
                testID="total-duplicates"
              >
                {totalDuplicates}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('fileImport.summary.totalDuplicates')}</Text>
            </View>

            {/* Files Processed */}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text.primary }]} testID="files-processed">
                {successfulFiles}/{result.fileResults.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('fileImport.summary.filesProcessed')}</Text>
            </View>
          </View>
        )}

        {/* Duplicate Breakdown */}
        {!allFilesFailed && totalDuplicates > 0 && (
          <View
            style={[styles.duplicateBreakdown, { backgroundColor: colors.semantic.warning.light, borderColor: colors.semantic.warning.base }]}
            testID="duplicate-breakdown"
          >
            <Text style={[styles.breakdownTitle, { color: colors.semantic.warning.dark }]}>{t('fileImport.summary.duplicateBreakdown')}</Text>
            {result.totalDuplicatesInFile > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.semantic.warning.dark }]}>
                  {t('fileImport.summary.inFileDuplicates')}
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.semantic.warning.dark }]} testID="in-file-duplicates">
                  {result.totalDuplicatesInFile}
                </Text>
              </View>
            )}
            {result.totalCrossFileDuplicates > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.semantic.warning.dark }]}>
                  {t('fileImport.summary.crossFileDuplicates')}
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.semantic.warning.dark }]} testID="cross-file-duplicates">
                  {result.totalCrossFileDuplicates}
                </Text>
              </View>
            )}
            {result.totalDatabaseDuplicates > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownLabel, { color: colors.semantic.warning.dark }]}>
                  {t('fileImport.summary.databaseDuplicates')}
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.semantic.warning.dark }]} testID="database-duplicates">
                  {result.totalDatabaseDuplicates}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Per-File Results (Requirements 7.4, 7.5) */}
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsTitle, { color: colors.text.primary }]}>{t('fileImport.summary.fileResults')}</Text>
          <FlatList
            data={result.fileResults}
            renderItem={renderFileResult}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            testID="file-results-list"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { borderTopColor: colors.border.default }]}>
        {/* Retry Failed Button (when there are failed files) */}
        {hasFailedFiles && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.semantic.warning.light }]}
            onPress={handleRetryFailed}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('fileImport.summary.retryFailed')}
            testID="retry-failed-button"
          >
            <Text style={[styles.retryButtonText, { color: colors.semantic.warning.dark }]}>{t('fileImport.summary.retryFailed')}</Text>
          </TouchableOpacity>
        )}

        {/* Review All Button (Requirement 7.6) */}
        {hasSuccessfulImports && (
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: colors.interactive.primary }]}
            onPress={handleGoToReview}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('fileImport.summary.reviewAll')}
            testID="review-all-button"
          >
            <Text style={[styles.reviewButtonText, { color: colors.text.inverse }]}>{t('fileImport.summary.reviewAll')}</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={[
            styles.closeButton,
            { backgroundColor: colors.background.tertiary },
            !hasSuccessfulImports && !hasFailedFiles && { backgroundColor: colors.interactive.primary },
          ]}
          onPress={handleClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="close-button"
        >
          <Text
            style={[
              styles.closeButtonText,
              { color: colors.text.primary },
              !hasSuccessfulImports && !hasFailedFiles && { color: colors.text.inverse },
            ]}
          >
            {t('common.close')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Styles for ImportSummary
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.base,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  troubleshootingContainer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  suggestionBullet: {
    fontSize: 14,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  duplicateBreakdown: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  fileResultItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
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
    gap: 10,
  },
  retryButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Memoized ImportSummary for performance optimization
 */
export const ImportSummary = memo(ImportSummaryComponent);

export default ImportSummary;
