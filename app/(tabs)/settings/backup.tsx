/**
 * Backup Settings Screen
 *
 * Custom server backup configuration:
 * - Server URL and API key configuration
 * - Connection testing
 * - Manual backup/restore actions
 * - Backup list with restore and delete
 * - Backup frequency settings
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useBackup } from '../../../src/hooks/useBackup';
import type { BackupMetadata } from '../../../src/types/backup';
import type { BackupFrequency } from '../../../src/stores/backupStore';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';
import { customServerSettingsStore } from '../../../src/services/backup/CustomServerSettingsStore';

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date for display
 */
function formatBackupDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Frequency options for backup scheduling
 */
const FREQUENCY_OPTIONS: { value: BackupFrequency; labelKey: string }[] = [
  { value: 'daily', labelKey: 'backup.frequencyDaily' },
  { value: 'every2days', labelKey: 'backup.frequencyEvery2Days' },
  { value: 'every3days', labelKey: 'backup.frequencyEvery3Days' },
  { value: 'weekly', labelKey: 'backup.frequencyWeekly' },
  { value: 'disabled', labelKey: 'backup.frequencyDisabled' },
];

export default function BackupSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    lastBackupTime,
    lastBackupStatus,
    lastBackupError,
    isBackingUp,
    isRestoring,
    isConnected,
    backups,
    isLoadingBackups,
    backupFrequency,
    preferredHour,
    testServerConnection,
    backupNow,
    listBackups,
    restore,
    deleteBackup,
    setBackupFrequency,
    setPreferredHour,
    refreshBackups,
  } = useBackup();

  // Server config state
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [serverUrlError, setServerUrlError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Connection test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // UI state
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  const hasInitialized = useRef(false);

  // Load saved settings on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadSettings = async () => {
      try {
        const settings = await customServerSettingsStore.getSettings();
        if (settings.serverUrl) setServerUrl(settings.serverUrl);
        if (settings.apiKey) setApiKey(settings.apiKey);
      } catch (error) {
        console.error('[BackupSettings] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Auto-load backups when connected
  useEffect(() => {
    if (isConnected && testResult === 'success') {
      listBackups();
    }
  }, [isConnected, testResult, listBackups]);

  const handleSave = useCallback(async () => {
    setServerUrlError(null);
    setApiKeyError(null);
    setSaveSuccess(false);

    const urlValidation = customServerSettingsStore.validateServerUrl(serverUrl);
    const apiKeyValidation = customServerSettingsStore.validateApiKey(apiKey);

    let hasError = false;
    if (!urlValidation.valid) {
      setServerUrlError(urlValidation.error ?? t('backup.customServer.invalidUrl'));
      hasError = true;
    }
    if (!apiKeyValidation.valid) {
      setApiKeyError(apiKeyValidation.error ?? t('backup.customServer.invalidApiKey'));
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      await customServerSettingsStore.saveSettings(serverUrl, apiKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsSaving(false);
    }
  }, [serverUrl, apiKey, t]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const success = await testServerConnection();
      if (success) {
        setTestResult('success');
        listBackups();
      } else {
        setTestResult('error');
        setTestError(t('backup.customServer.connectionFailed'));
      }
    } catch (error) {
      setTestResult('error');
      setTestError(
        error instanceof Error ? error.message : t('backup.customServer.connectionFailed')
      );
    } finally {
      setIsTesting(false);
    }
  }, [testServerConnection, listBackups, t]);

  const handleBackupNow = useCallback(async () => {
    const result = await backupNow();
    if (result.success) {
      Alert.alert(t('common.success'), t('backup.customServer.backupSuccess'));
      refreshBackups();
    } else {
      Alert.alert(t('common.error'), result.errorMessage ?? t('backup.error'));
    }
  }, [backupNow, refreshBackups, t]);

  const handleRestore = useCallback(
    (item: BackupMetadata) => {
      Alert.alert(
        t('backup.customServer.confirmRestore'),
        t('backup.customServer.confirmRestoreMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backup.customServer.restore'),
            style: 'destructive',
            onPress: async () => {
              const result = await restore(item.fileName);
              if (result.success) {
                Alert.alert(t('common.success'), t('backup.customServer.restoreSuccess'));
              } else {
                Alert.alert(t('common.error'), result.errorMessage ?? t('backup.restoreError'));
              }
            },
          },
        ]
      );
    },
    [restore, t]
  );

  const handleDelete = useCallback(
    (item: BackupMetadata) => {
      Alert.alert(
        t('backup.customServer.confirmDelete'),
        t('backup.customServer.confirmDeleteMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backup.customServer.delete'),
            style: 'destructive',
            onPress: async () => {
              const success = await deleteBackup(item.fileName);
              if (!success) {
                Alert.alert(t('common.error'), t('backup.errors.unknownError'));
              }
            },
          },
        ]
      );
    },
    [deleteBackup, t]
  );

  const handleFrequencySelect = useCallback(
    (frequency: BackupFrequency) => {
      setBackupFrequency(frequency);
      setShowFrequencyModal(false);
    },
    [setBackupFrequency]
  );

  const handleTimeSelect = useCallback(
    (hour: number) => {
      setPreferredHour(hour);
      setShowTimeModal(false);
    },
    [setPreferredHour]
  );

  const getFrequencyText = useCallback(
    (frequency: BackupFrequency): string => {
      const option = FREQUENCY_OPTIONS.find((opt) => opt.value === frequency);
      return option ? t(option.labelKey) : t('backup.frequencyDisabled');
    },
    [t]
  );

  const getStatusDisplay = useCallback((): { text: string; color: string } => {
    if (lastBackupStatus === 'never') {
      return { text: t('backup.never'), color: colors.text.tertiary };
    }
    if (lastBackupStatus === 'failed') {
      return { text: lastBackupError ?? t('backup.error'), color: colors.semantic.danger.base };
    }
    if (lastBackupTime) {
      return { text: formatBackupDate(lastBackupTime), color: colors.semantic.success.base };
    }
    return { text: t('backup.never'), color: colors.text.tertiary };
  }, [lastBackupStatus, lastBackupTime, lastBackupError, t, colors]);

  const statusDisplay = getStatusDisplay();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.secondary }]}
      edges={['bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background.secondary }]}
        contentContainerStyle={styles.contentContainer}
        testID="backup-settings-screen"
      >
        {/* Server Configuration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.customServer.title')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surface.card, borderColor: colors.border.default },
            ]}
          >
            {/* Server URL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                {t('backup.customServer.serverUrl')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: serverUrlError
                      ? colors.semantic.danger.base
                      : colors.border.default,
                  },
                ]}
                value={serverUrl}
                onChangeText={(text) => {
                  setServerUrl(text);
                  if (serverUrlError) setServerUrlError(null);
                }}
                placeholder={t('backup.customServer.serverUrlPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                maxLength={2048}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                testID="server-url-input"
              />
              {serverUrlError && (
                <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
                  {serverUrlError}
                </Text>
              )}
            </View>

            {/* API Key */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                {t('backup.customServer.apiKey')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: apiKeyError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                value={apiKey}
                onChangeText={(text) => {
                  setApiKey(text);
                  if (apiKeyError) setApiKeyError(null);
                }}
                placeholder={t('backup.customServer.apiKeyPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                maxLength={256}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                testID="api-key-input"
              />
              {apiKeyError && (
                <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
                  {apiKeyError}
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.interactive.primary }]}
              onPress={handleSave}
              disabled={isSaving}
              testID="save-button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.text.inverse }]}>
                  {t('backup.customServer.save')}
                </Text>
              )}
            </TouchableOpacity>
            {saveSuccess && (
              <Text style={[styles.successText, { color: colors.semantic.success.base }]}>
                {t('backup.customServer.saveSuccess')}
              </Text>
            )}

            {/* Test Connection */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.interactive.primary, marginTop: spacing.xs },
              ]}
              onPress={handleTestConnection}
              disabled={isTesting}
              testID="test-connection-button"
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.text.inverse }]}>
                  {t('backup.customServer.testConnection')}
                </Text>
              )}
            </TouchableOpacity>
            {testResult === 'success' && (
              <Text style={[styles.successText, { color: colors.semantic.success.base }]}>
                ✓ {t('backup.customServer.connectionSuccess')}
              </Text>
            )}
            {testResult === 'error' && (
              <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
                {testError ?? t('backup.customServer.connectionFailed')}
              </Text>
            )}
          </View>
        </View>

        {/* Backup Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.lastBackup')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surface.card, borderColor: colors.border.default },
            ]}
          >
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>
                {lastBackupStatus === 'success'
                  ? '✅'
                  : lastBackupStatus === 'failed'
                    ? '❌'
                    : '📅'}
              </Text>
              <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                {statusDisplay.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Scheduled Backup */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.scheduledBackup')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surface.card, borderColor: colors.border.default },
            ]}
          >
            <TouchableOpacity
              style={styles.frequencyItem}
              onPress={() => setShowFrequencyModal(true)}
              disabled={!isConnected}
              testID="frequency-selector"
            >
              <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                {t('backup.frequency')}
              </Text>
              <Text
                style={[
                  styles.frequencyText,
                  { color: colors.text.tertiary },
                  !isConnected && styles.disabledOpacity,
                ]}
              >
                {getFrequencyText(backupFrequency)} ›
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.frequencyItem,
                { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
              ]}
              onPress={() => setShowTimeModal(true)}
              disabled={!isConnected || backupFrequency === 'disabled'}
              testID="time-selector"
            >
              <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                {t('backup.preferredTime')}
              </Text>
              <Text
                style={[
                  styles.frequencyText,
                  { color: colors.text.tertiary },
                  (!isConnected || backupFrequency === 'disabled') && styles.disabledOpacity,
                ]}
              >
                {`${preferredHour.toString().padStart(2, '0')}:00`} ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionContent,
              { backgroundColor: colors.surface.card, borderColor: colors.border.default },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border.subtle }]}
              onPress={handleBackupNow}
              disabled={!isConnected || isBackingUp}
              testID="backup-now-button"
            >
              <Text style={styles.actionIcon}>☁️</Text>
              <Text
                style={[
                  styles.actionText,
                  { color: isConnected ? colors.interactive.primary : colors.text.tertiary },
                ]}
              >
                {isBackingUp ? t('common.loading') : t('backup.customServer.backupNow')}
              </Text>
              {isBackingUp && (
                <ActivityIndicator
                  size="small"
                  color={colors.interactive.primary}
                  style={{ marginLeft: spacing.sm }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup List */}
        {isConnected && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                {t('backup.customServer.backupList')}
              </Text>
              <TouchableOpacity
                onPress={refreshBackups}
                disabled={isLoadingBackups}
                testID="refresh-button"
              >
                <Text
                  style={[
                    styles.refreshText,
                    { color: colors.interactive.primary },
                    isLoadingBackups && styles.disabledOpacity,
                  ]}
                >
                  {t('backup.customServer.refresh')}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                { backgroundColor: colors.surface.card, borderColor: colors.border.default },
              ]}
            >
              {isLoadingBackups && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.interactive.primary} />
                  <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
                    {t('common.loading')}
                  </Text>
                </View>
              )}
              {!isLoadingBackups && backups.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    {t('backup.customServer.noBackups')}
                  </Text>
                </View>
              )}
              {!isLoadingBackups &&
                backups.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.backupItem, { borderBottomColor: colors.border.subtle }]}
                  >
                    <View style={styles.backupItemInfo}>
                      <Text
                        style={[styles.backupItemName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {item.fileName}
                      </Text>
                      <Text style={[styles.backupItemMeta, { color: colors.text.tertiary }]}>
                        {formatBackupDate(item.createdAt)} · {formatFileSize(item.sizeBytes)}
                      </Text>
                    </View>
                    <View style={styles.backupItemActions}>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: colors.interactive.primary }]}
                        onPress={() => handleRestore(item)}
                        disabled={isRestoring || isBackingUp}
                      >
                        {isRestoring ? (
                          <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                          <Text style={[styles.smallBtnText, { color: colors.text.inverse }]}>
                            {t('backup.customServer.restore')}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: colors.semantic.danger.base }]}
                        onPress={() => handleDelete(item)}
                        disabled={isRestoring || isBackingUp}
                      >
                        <Text style={[styles.smallBtnText, { color: colors.text.inverse }]}>
                          {t('backup.customServer.delete')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Frequency Modal */}
        <Modal
          visible={showFrequencyModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFrequencyModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {t('backup.frequency')}
                </Text>
                <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
                  <Text style={[styles.modalClose, { color: colors.interactive.primary }]}>
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              </View>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, { borderBottomColor: colors.border.subtle }]}
                  onPress={() => handleFrequencySelect(option.value)}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text.primary }]}>
                    {t(option.labelKey)}
                  </Text>
                  {backupFrequency === option.value && (
                    <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Time Modal */}
        <Modal
          visible={showTimeModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTimeModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {t('backup.preferredTime')}
                </Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                  <Text style={[styles.modalClose, { color: colors.interactive.primary }]}>
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.timeList}>
                {Array.from({ length: 24 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.modalOption, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => handleTimeSelect(i)}
                  >
                    <Text
                      style={[styles.modalOptionText, { color: colors.text.primary }]}
                    >{`${i.toString().padStart(2, '0')}:00`}</Text>
                    {preferredHour === i && (
                      <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: spacing.base },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  sectionContent: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.body.fontSize,
  },
  actionBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  actionBtnText: { fontSize: typography.caption.fontSize, fontWeight: '600' },
  successText: {
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: { fontSize: typography.overline.fontSize, marginTop: spacing.xs },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusIcon: { fontSize: 20 },
  statusText: { fontSize: typography.body.fontSize },
  frequencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  frequencyLabel: { fontSize: typography.body.fontSize },
  frequencyText: { fontSize: typography.body.fontSize },
  disabledOpacity: { opacity: 0.4 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: { fontSize: 20, marginRight: spacing.sm },
  actionText: { fontSize: typography.body.fontSize, fontWeight: '500' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: { fontSize: typography.caption.fontSize },
  emptyContainer: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: typography.caption.fontSize },
  refreshText: { fontSize: typography.caption.fontSize, fontWeight: '500' },
  backupItem: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  backupItemInfo: { marginBottom: spacing.xs },
  backupItemName: { fontSize: typography.caption.fontSize, fontWeight: '500' },
  backupItemMeta: { fontSize: typography.overline.fontSize, marginTop: 2 },
  backupItemActions: { flexDirection: 'row', gap: spacing.xs },
  smallBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  smallBtnText: { fontSize: typography.overline.fontSize, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: typography.title.fontSize, fontWeight: '600' },
  modalClose: { fontSize: typography.body.fontSize, fontWeight: '500' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: { fontSize: typography.body.fontSize },
  checkmark: { fontSize: typography.title.fontSize, fontWeight: '600' },
  timeList: { maxHeight: 400 },
});
