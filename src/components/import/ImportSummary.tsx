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
}): JSX.Element {
  const { t } = useTranslation();
  const status = getFileStatus(result);
  const statusIcon = STATUS_ICONS[status];

  const getStatusText = (): string => {
    if (!result.success && result.error) {
      return result.error.message;
    }
    if (result.success) {
      const parts: string[] = [];
      parts.push(
        t('import.summary.transactionsImported', {
          count: result.transactionsImported,
        })
      );
      if (result.duplicatesFound > 0) {
        parts.push(
          t('import.summary.duplicatesSkipped', {
            count: result.duplicatesFound,
          })
        );
      }
      return parts.join(' • ');
    }
    return t('import.summary.failed');
  };

  return (
    <View
      style={[styles.fileResultItem, !result.success && styles.fileResultItemFailed]}
      testID={`file-result-${result.fileName}`}
    >
      <View style={styles.fileResultContent}>
        <Text style={styles.fileResultIcon} testID={`file-status-icon-${result.fileName}`}>
          {statusIcon}
        </Text>
        <View style={styles.fileResultInfo}>
          <Text
            style={[styles.fileResultName, !result.success && styles.fileResultNameFailed]}
            numberOfLines={1}
          >
            {result.fileName}
          </Text>
          <Text
            style={[styles.fileResultStatus, !result.success && styles.fileResultStatusError]}
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
}: ImportSummaryProps): JSX.Element {
  const { t } = useTranslation();

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
      return t('import.summary.allFilesFailed');
    }
    if (hasFailedFiles) {
      return t('import.summary.partialSuccess', {
        success: successfulFiles,
        total: result.fileResults.length,
      });
    }
    return t('import.summary.allFilesSuccess');
  };

  return (
    <View style={styles.container} testID="import-summary">
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
          <Text style={styles.title}>{t('import.summary.title')}</Text>
          <Text
            style={[styles.statusText, allFilesFailed && styles.statusTextError]}
            testID="overall-status-text"
          >
            {getOverallStatusText()}
          </Text>
        </View>

        {/* All Files Failed Error Message (Requirement 7.7) */}
        {allFilesFailed && (
          <View style={styles.errorContainer} testID="all-files-failed-error">
            <Text style={styles.errorTitle}>{t('import.summary.errorTitle')}</Text>
            <Text style={styles.errorMessage}>{t('import.summary.errorMessage')}</Text>
            <View style={styles.troubleshootingContainer}>
              <Text style={styles.troubleshootingTitle}>
                {t('import.summary.troubleshootingTitle')}
              </Text>
              {TROUBLESHOOTING_SUGGESTIONS.map((suggestion) => (
                <View key={suggestion} style={styles.suggestionItem}>
                  <Text style={styles.suggestionBullet}>•</Text>
                  <Text style={styles.suggestionText}>
                    {t(`import.summary.troubleshooting.${suggestion}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Statistics Section (Requirements 7.2, 7.3) */}
        {!allFilesFailed && (
          <View style={styles.statsContainer} testID="import-stats">
            {/* Total Transactions Imported (Requirement 7.2) */}
            <View style={styles.statItem}>
              <Text style={styles.statValue} testID="total-transactions">
                {result.totalTransactionsImported}
              </Text>
              <Text style={styles.statLabel}>{t('import.summary.totalTransactions')}</Text>
            </View>

            {/* Total Duplicates Found (Requirement 7.3) */}
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, totalDuplicates > 0 && styles.statValueWarning]}
                testID="total-duplicates"
              >
                {totalDuplicates}
              </Text>
              <Text style={styles.statLabel}>{t('import.summary.totalDuplicates')}</Text>
            </View>

            {/* Files Processed */}
            <View style={styles.statItem}>
              <Text style={styles.statValue} testID="files-processed">
                {successfulFiles}/{result.fileResults.length}
              </Text>
              <Text style={styles.statLabel}>{t('import.summary.filesProcessed')}</Text>
            </View>
          </View>
        )}

        {/* Duplicate Breakdown */}
        {!allFilesFailed && totalDuplicates > 0 && (
          <View style={styles.duplicateBreakdown} testID="duplicate-breakdown">
            <Text style={styles.breakdownTitle}>{t('import.summary.duplicateBreakdown')}</Text>
            {result.totalDuplicatesInFile > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{t('import.summary.inFileDuplicates')}</Text>
                <Text style={styles.breakdownValue} testID="in-file-duplicates">
                  {result.totalDuplicatesInFile}
                </Text>
              </View>
            )}
            {result.totalCrossFileDuplicates > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{t('import.summary.crossFileDuplicates')}</Text>
                <Text style={styles.breakdownValue} testID="cross-file-duplicates">
                  {result.totalCrossFileDuplicates}
                </Text>
              </View>
            )}
            {result.totalDatabaseDuplicates > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{t('import.summary.databaseDuplicates')}</Text>
                <Text style={styles.breakdownValue} testID="database-duplicates">
                  {result.totalDatabaseDuplicates}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Per-File Results (Requirements 7.4, 7.5) */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>{t('import.summary.fileResults')}</Text>
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
      <View style={styles.actionContainer}>
        {/* Retry Failed Button (when there are failed files) */}
        {hasFailedFiles && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryFailed}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('import.summary.retryFailed')}
            testID="retry-failed-button"
          >
            <Text style={styles.retryButtonText}>{t('import.summary.retryFailed')}</Text>
          </TouchableOpacity>
        )}

        {/* Review All Button (Requirement 7.6) */}
        {hasSuccessfulImports && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={handleGoToReview}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('import.summary.reviewAll')}
            testID="review-all-button"
          >
            <Text style={styles.reviewButtonText}>{t('import.summary.reviewAll')}</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={[
            styles.closeButton,
            !hasSuccessfulImports && !hasFailedFiles && styles.closeButtonPrimary,
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
              !hasSuccessfulImports && !hasFailedFiles && styles.closeButtonTextPrimary,
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
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  statusTextError: {
    color: '#dc2626',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 20,
    marginBottom: 16,
  },
  troubleshootingContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  suggestionBullet: {
    fontSize: 14,
    color: '#b91c1c',
    marginRight: 8,
    lineHeight: 20,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statValueWarning: {
    color: '#d97706',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  duplicateBreakdown: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#92400e',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  resultsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  fileResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileResultItemFailed: {
    backgroundColor: '#fef2f2',
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
  fileResultNameFailed: {
    color: '#991b1b',
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
    gap: 10,
  },
  retryButton: {
    paddingVertical: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  reviewButton: {
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  closeButtonTextPrimary: {
    color: '#ffffff',
  },
});

/**
 * Memoized ImportSummary for performance optimization
 */
export const ImportSummary = memo(ImportSummaryComponent);

export default ImportSummary;
