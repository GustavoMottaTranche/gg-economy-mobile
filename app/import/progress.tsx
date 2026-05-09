/**
 * Import Progress Screen
 *
 * Shows import progress with:
 * - Real-time parsing status updates
 * - Transaction count display
 * - Duplicate detection results
 * - Error display for parsing failures
 * - Navigation to Review screen after successful import
 *
 * **Validates: Requirements 11, 12, 30**
 */
import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useImport, type ImportStage } from '../../src/hooks/useImport';
import type { FileType } from '../../src/types';

/**
 * Progress step configuration
 */
interface ProgressStep {
  stage: ImportStage;
  icon: string;
  iconComplete: string;
  labelKey: string;
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    stage: 'reading',
    icon: '📄',
    iconComplete: '✅',
    labelKey: 'import.parsing',
  },
  {
    stage: 'parsing',
    icon: '🔍',
    iconComplete: '✅',
    labelKey: 'import.parsing',
  },
  {
    stage: 'deduplicating',
    icon: '🔎',
    iconComplete: '✅',
    labelKey: 'import.checkingDuplicates',
  },
  {
    stage: 'saving',
    icon: '💾',
    iconComplete: '✅',
    labelKey: 'import.processing',
  },
];

/**
 * Get the index of the current stage in the progress steps
 */
function getStageIndex(stage: ImportStage): number {
  const stageOrder: ImportStage[] = [
    'idle',
    'selecting',
    'reading',
    'parsing',
    'deduplicating',
    'saving',
    'complete',
    'error',
  ];
  return stageOrder.indexOf(stage);
}

/**
 * Check if a step is complete based on current stage
 */
function isStepComplete(stepStage: ImportStage, currentStage: ImportStage): boolean {
  return getStageIndex(currentStage) > getStageIndex(stepStage);
}

/**
 * Check if a step is active (currently in progress)
 */
function isStepActive(stepStage: ImportStage, currentStage: ImportStage): boolean {
  return stepStage === currentStage;
}

export default function ImportProgressScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    uri: string;
    fileName: string;
    fileType?: string;
    isShared?: string;
  }>();

  const { importFromUri, isImporting, progress, result, error, reset, cancel } = useImport();

  const [hasStarted, setHasStarted] = useState(false);

  /**
   * Start import when screen mounts with file params
   */
  useEffect(() => {
    if (params.uri && params.fileName && !hasStarted) {
      setHasStarted(true);
      const fileType = params.fileType as FileType | undefined;
      importFromUri(params.uri, params.fileName, fileType);
    }
  }, [params.uri, params.fileName, params.fileType, hasStarted, importFromUri]);

  /**
   * Navigate to Review screen after successful import
   */
  const handleGoToReview = useCallback(() => {
    reset();
    // Use replace to dismiss the modal and go to review tab
    router.replace('/(tabs)/review');
  }, [reset]);

  /**
   * Handle cancel button press
   */
  const handleCancel = useCallback(() => {
    cancel();
    router.back();
  }, [cancel]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setHasStarted(false);
    reset();
    // Re-trigger import
    setTimeout(() => {
      if (params.uri && params.fileName) {
        setHasStarted(true);
        const fileType = params.fileType as FileType | undefined;
        importFromUri(params.uri, params.fileName, fileType);
      }
    }, 100);
  }, [reset, params.uri, params.fileName, params.fileType, importFromUri]);

  /**
   * Handle going back to file selection
   */
  const handleSelectDifferentFile = useCallback(() => {
    reset();
    router.back();
  }, [reset]);

  // Determine current state
  const isComplete = progress.stage === 'complete' && result?.success;
  const hasError = progress.stage === 'error' || (result && !result.success);
  const isProcessing = isImporting && !isComplete && !hasError;

  return (
    <View style={styles.container} testID="import-progress-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Status indicator */}
          {isProcessing && (
            <ActivityIndicator
              size="large"
              color="#007AFF"
              style={styles.spinner}
              testID="import-progress-spinner"
            />
          )}

          {isComplete && (
            <Text style={styles.successIcon} testID="import-success-icon">
              ✅
            </Text>
          )}

          {hasError && (
            <Text style={styles.errorIcon} testID="import-error-icon">
              ❌
            </Text>
          )}

          {/* Title */}
          <Text style={styles.title} testID="import-progress-title">
            {isComplete
              ? t('import.success')
              : hasError
                ? t('import.error')
                : t('import.importing')}
          </Text>

          {/* File name */}
          <Text style={styles.fileName} testID="import-file-name">
            {params.fileName}
          </Text>

          {/* Progress steps */}
          <View style={styles.progressContainer} testID="import-progress-steps">
            {PROGRESS_STEPS.map((step, index) => {
              const complete = isStepComplete(step.stage, progress.stage) || isComplete;
              const active = isStepActive(step.stage, progress.stage);
              const hasStepError = hasError && active;

              return (
                <View
                  key={step.stage}
                  style={[
                    styles.progressItem,
                    index === PROGRESS_STEPS.length - 1 && styles.progressItemLast,
                  ]}
                  testID={`import-progress-step-${step.stage}`}
                >
                  <Text style={styles.progressIcon}>
                    {hasStepError ? '❌' : complete ? step.iconComplete : step.icon}
                  </Text>
                  <Text
                    style={[
                      styles.progressText,
                      complete && styles.progressTextComplete,
                      active && styles.progressTextActive,
                      hasStepError && styles.progressTextError,
                    ]}
                  >
                    {t(step.labelKey)}
                  </Text>
                  {active && isProcessing && (
                    <ActivityIndicator size="small" color="#007AFF" style={styles.stepSpinner} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Progress percentage */}
          {isProcessing && (
            <View style={styles.percentageContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
              </View>
              <Text style={styles.percentageText}>{progress.percentage}%</Text>
            </View>
          )}

          {/* Success results */}
          {isComplete && result && (
            <View style={styles.resultsContainer} testID="import-results">
              <View style={styles.resultItem}>
                <Text style={styles.resultIcon}>📥</Text>
                <Text style={styles.resultText}>
                  {t('import.transactionsFound', { count: result.transactionsImported })}
                </Text>
              </View>

              {result.duplicatesFound > 0 && (
                <View style={styles.resultItem}>
                  <Text style={styles.resultIcon}>🔄</Text>
                  <Text style={styles.resultText}>
                    {t('import.duplicatesFound', { count: result.duplicatesFound })}
                  </Text>
                </View>
              )}

              {result.parseErrors.length > 0 && (
                <View style={styles.resultItem}>
                  <Text style={styles.resultIcon}>⚠️</Text>
                  <Text style={styles.resultWarningText}>
                    {result.parseErrors.length} row(s) skipped
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Error display */}
          {hasError && (
            <View style={styles.errorContainer} testID="import-error-container">
              <Text style={styles.errorTitle}>{t('import.importFailed')}</Text>
              <Text style={styles.errorMessage}>
                {error || result?.error?.message || t('errors.generic')}
              </Text>

              {/* Parse errors list */}
              {result?.parseErrors && result.parseErrors.length > 0 && (
                <View style={styles.parseErrorsContainer}>
                  <Text style={styles.parseErrorsTitle}>{t('import.parseError')}:</Text>
                  {result.parseErrors.slice(0, 5).map((parseError, index) => (
                    <Text key={index} style={styles.parseErrorItem}>
                      {parseError.lineNumber
                        ? t('errors.parseErrorLine', {
                            line: parseError.lineNumber,
                            message: parseError.message,
                          })
                        : parseError.message}
                    </Text>
                  ))}
                  {result.parseErrors.length > 5 && (
                    <Text style={styles.parseErrorMore}>
                      +{result.parseErrors.length - 5} more errors
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonsContainer}>
            {isComplete && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoToReview}
                accessibilityRole="button"
                accessibilityLabel={t('import.goToReview')}
                testID="import-go-to-review-button"
              >
                <Text style={styles.primaryButtonText}>{t('import.goToReview')}</Text>
              </TouchableOpacity>
            )}

            {hasError && (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.retry')}
                  testID="import-retry-button"
                >
                  <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSelectDifferentFile}
                  accessibilityRole="button"
                  accessibilityLabel={t('import.selectFile')}
                  testID="import-select-different-button"
                >
                  <Text style={styles.secondaryButtonText}>{t('import.selectFile')}</Text>
                </TouchableOpacity>
              </>
            )}

            {isProcessing && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                testID="import-cancel-button"
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
  },
  spinner: {
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
    textAlign: 'center',
  },
  fileName: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
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
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  progressItemLast: {
    borderBottomWidth: 0,
  },
  progressIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  progressTextComplete: {
    color: '#22C55E',
  },
  progressTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  progressTextError: {
    color: '#DC2626',
  },
  stepSpinner: {
    marginLeft: 8,
  },
  percentageContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  resultsContainer: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#166534',
    flex: 1,
  },
  resultWarningText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991B1B',
  },
  parseErrorsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FECACA',
  },
  parseErrorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  parseErrorItem: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 4,
  },
  parseErrorMore: {
    fontSize: 12,
    color: '#B91C1C',
    fontStyle: 'italic',
    marginTop: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: '100%',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
