/**
 * CloudSyncScreen
 *
 * Dedicated screen for managing the cloud sync import process.
 * Users paste a sync key (generated on the web platform), validate it,
 * and trigger data sync. Shows real-time progress and results.
 *
 * @module screens/CloudSync/CloudSyncScreen
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useCloudSync } from '../../hooks/useCloudSync';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

// ============================================================================
// Component
// ============================================================================

export function CloudSyncScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    isRunning,
    currentStep,
    result,
    error,
    hasKey,
    isValidating,
    isKeyValid,
    saveSyncKey,
    removeSyncKeyAction,
    startSync,
    clearError,
  } = useCloudSync();

  const [keyInput, setKeyInput] = useState('');

  const isSaveDisabled = !keyInput.trim() || isValidating;
  const isSyncDisabled = !hasKey || isRunning;

  const handleSaveKey = useCallback(async () => {
    if (isSaveDisabled) return;
    clearError();
    try {
      await saveSyncKey(keyInput.trim());
      setKeyInput('');
      Alert.alert(t('cloudSync.keyValidTitle'), t('cloudSync.keyValidMessage'));
    } catch {
      // Error is already set in hook state
    }
  }, [isSaveDisabled, clearError, saveSyncKey, keyInput, t]);

  const handleRemoveKey = useCallback(async () => {
    await removeSyncKeyAction();
  }, [removeSyncKeyAction]);

  const handleStartSync = useCallback(() => {
    if (isSyncDisabled) return;
    clearError();
    startSync();
  }, [isSyncDisabled, clearError, startSync]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={styles.content}
      testID="cloud-sync-screen"
    >
      {/* Sync Key Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('cloudSync.syncKeyTitle')}
        </Text>
        <Text style={[styles.description, { color: colors.text.secondary }]}>
          {t('cloudSync.syncKeyDescription')}
        </Text>

        {/* Key Status */}
        {hasKey && (
          <View
            style={[styles.keyStatusContainer, { backgroundColor: colors.semantic.success.light }]}
            testID="key-status"
          >
            <Text style={[styles.keyStatusText, { color: colors.semantic.success.dark }]}>
              {isKeyValid ? t('cloudSync.keyConfigured') : t('cloudSync.keyStored')}
            </Text>
            <TouchableOpacity
              testID="remove-key-button"
              onPress={handleRemoveKey}
              activeOpacity={0.7}
            >
              <Text style={[styles.removeKeyText, { color: colors.semantic.danger.base }]}>
                {t('cloudSync.removeKey')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Key Input */}
        {!hasKey && (
          <TextInput
            testID="sync-key-input"
            style={[
              styles.input,
              {
                borderColor: colors.border.default,
                color: colors.text.primary,
                backgroundColor: colors.surface.card,
              },
            ]}
            value={keyInput}
            onChangeText={setKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('cloudSync.keyPlaceholder')}
            placeholderTextColor={colors.text.tertiary}
            editable={!isValidating}
          />
        )}

        {/* Save Key Button */}
        {!hasKey && (
          <TouchableOpacity
            testID="save-key-button"
            style={[
              styles.button,
              {
                backgroundColor: isSaveDisabled
                  ? colors.interactive.disabled
                  : colors.interactive.primary,
              },
            ]}
            onPress={handleSaveKey}
            disabled={isSaveDisabled}
            activeOpacity={0.7}
          >
            {isValidating ? (
              <ActivityIndicator
                testID="validating-indicator"
                size="small"
                color={colors.text.inverse}
              />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: isSaveDisabled ? colors.text.tertiary : colors.text.inverse },
                ]}
              >
                {t('cloudSync.saveKey')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Sync Section */}
      {hasKey && (
        <View style={styles.section}>
          <TouchableOpacity
            testID="start-sync-button"
            style={[
              styles.button,
              {
                backgroundColor: isSyncDisabled
                  ? colors.interactive.disabled
                  : colors.interactive.primary,
              },
            ]}
            onPress={handleStartSync}
            disabled={isSyncDisabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.buttonText,
                { color: isSyncDisabled ? colors.text.tertiary : colors.text.inverse },
              ]}
            >
              {t('cloudSync.startButton')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Indicator */}
      {isRunning && currentStep && (
        <View testID="sync-progress" style={styles.progressContainer}>
          <ActivityIndicator
            testID="sync-activity-indicator"
            size="small"
            color={colors.interactive.primary}
          />
          <Text
            testID="sync-step-text"
            style={[styles.progressText, { color: colors.text.secondary }]}
          >
            {t(`cloudSync.steps.${currentStep}`)}
          </Text>
        </View>
      )}

      {/* Success Summary */}
      {result && (
        <View
          testID="sync-success"
          style={[styles.resultContainer, { backgroundColor: colors.semantic.success.light }]}
        >
          <Text
            testID="sync-success-title"
            style={[styles.resultTitle, { color: colors.semantic.success.dark }]}
          >
            {t('cloudSync.successTitle')}
          </Text>
          <Text
            testID="sync-success-ok"
            style={[styles.resultText, { color: colors.semantic.success.base }]}
          >
            {t('cloudSync.successOk', { count: result.totals.ok })}
          </Text>
          <Text
            testID="sync-success-failed"
            style={[styles.resultText, { color: colors.semantic.success.base }]}
          >
            {t('cloudSync.successFailed', { count: result.totals.failed })}
          </Text>
          <Text
            testID="sync-success-skipped"
            style={[styles.resultText, { color: colors.semantic.success.base }]}
          >
            {t('cloudSync.successSkipped', { count: result.totals.skipped })}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View
          testID="sync-error"
          style={[styles.errorContainer, { backgroundColor: colors.semantic.danger.light }]}
        >
          <Text
            testID="sync-error-message"
            style={[styles.errorText, { color: colors.semantic.danger.base }]}
          >
            {error.message}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default CloudSyncScreen;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize + 2,
    fontWeight: '600',
  },
  description: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  keyStatusContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyStatusText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  removeKeyText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  progressText: {
    fontSize: typography.body.fontSize,
  },
  resultContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  resultTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  resultText: {
    fontSize: typography.body.fontSize,
  },
  errorContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.body.fontSize,
  },
});
