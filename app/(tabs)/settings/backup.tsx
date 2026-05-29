/**
 * Backup Settings Screen
 *
 * Google Drive backup configuration:
 * - Google account connection/disconnection
 * - Backup frequency settings (daily, every 2/3 days, weekly, disabled)
 * - Preferred backup time selector
 * - Manual backup/restore actions
 * - Backup status display (last backup time, status)
 *
 * **Validates: Requirements 7, 8, 9, 10, 26, 30, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
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
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useBackup } from '../../../src/hooks/useBackup';
import { oAuthService } from '../../../src/services/backup/OAuthService';
import { useBackupConnection } from '../../../src/stores/backupStore';
import type { BackupMetadata } from '../../../src/types/backup';
import type { BackupFrequency } from '../../../src/stores/backupStore';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';
import { customServerSettingsStore } from '../../../src/services/backup/CustomServerSettingsStore';
import { testConnection, listBackups as fetchCustomBackups, mapServerToAppMetadata, deleteBackup } from '../../../src/services/backup/CustomServerClient';
import { createCustomServerBackup, restoreFromCustomServer } from '../../../src/services/backup/CustomServerIntegration';

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
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatBackupDate(date);
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

/**
 * Hour options for preferred backup time (0-23)
 */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export default function BackupSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    lastBackupTime,
    lastBackupStatus,
    lastBackupError,
    isBackingUp,
    isRestoring,
    backupProgress,
    restoreProgress,
    isConnected,
    connectedEmail,
    backupFrequency,
    preferredHour,
    backups,
    isLoadingBackups,
    connect,
    disconnect,
    backupNow,
    listBackups,
    restore,
    setBackupFrequency,
    setPreferredHour,
  } = useBackup();

  const { setConnectionStatus } = useBackupConnection();

  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [_selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Custom Server state
  const [customServerExpanded, setCustomServerExpanded] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customServerUrlError, setCustomServerUrlError] = useState<string | null>(null);
  const [customApiKeyError, setCustomApiKeyError] = useState<string | null>(null);
  const [customServerSaveSuccess, setCustomServerSaveSuccess] = useState(false);
  const [isSavingCustomServer, setIsSavingCustomServer] = useState(false);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);
  const [connectionTestError, setConnectionTestError] = useState<string | null>(null);

  // Custom server backup list state
  const [customBackups, setCustomBackups] = useState<BackupMetadata[]>([]);
  const [isLoadingCustomBackups, setIsLoadingCustomBackups] = useState(false);
  const [customBackupsError, setCustomBackupsError] = useState<string | null>(null);

  // Custom server action state
  const [isCustomBackingUp, setIsCustomBackingUp] = useState(false);
  const [isCustomRestoring, setIsCustomRestoring] = useState(false);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeConnectionState = async () => {
      try {
        const signedIn = await oAuthService.isSignedIn();
        if (signedIn) {
          const user = await oAuthService.getCurrentUser();
          if (user) {
            setConnectionStatus(true, user.email);
          } else {
            try {
              await oAuthService.getAccessToken();
              const refreshedUser = await oAuthService.getCurrentUser();
              if (refreshedUser) {
                setConnectionStatus(true, refreshedUser.email);
              } else {
                setConnectionStatus(false, null);
              }
            } catch {
              setConnectionStatus(false, null);
            }
          }
        } else {
          setConnectionStatus(false, null);
        }
      } catch (error) {
        console.error('[BackupSettings] Failed to initialize connection state:', error);
        setConnectionStatus(false, null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeConnectionState();
  }, [setConnectionStatus]);

  useEffect(() => {
    if (showRestoreModal && isConnected) {
      listBackups();
    }
  }, [showRestoreModal, isConnected, listBackups]);

  // Load custom server settings on mount
  useEffect(() => {
    const loadCustomServerSettings = async () => {
      try {
        const settings = await customServerSettingsStore.getSettings();
        if (settings.serverUrl) {
          setCustomServerUrl(settings.serverUrl);
        }
        if (settings.apiKey) {
          setCustomApiKey(settings.apiKey);
        }
      } catch (error) {
        console.error('[BackupSettings] Failed to load custom server settings:', error);
      }
    };

    loadCustomServerSettings();
  }, []);

  useEffect(() => {
    if (isBackingUp || isRestoring) {
      setShowProgressModal(true);
    }
  }, [isBackingUp, isRestoring]);

  const handleConnect = useCallback(async () => {
    try {
      const success = await connect();
      if (!success) {
        Alert.alert(t('common.error'), t('errors.oauthFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.oauthFailed'));
    }
  }, [connect, t]);

  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      t('backup.disconnect'),
      t('backup.disconnectConfirmation') ||
        'Are you sure you want to disconnect your Google account?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.disconnect'),
          style: 'destructive',
          onPress: async () => {
            await disconnect();
          },
        },
      ]
    );
  }, [disconnect, t]);

  const handleBackupNow = useCallback(async () => {
    const result = await backupNow();
    if (!result.success) {
      Alert.alert(t('common.error'), result.errorMessage ?? t('backup.error'));
    }
  }, [backupNow, t]);

  const handleRestore = useCallback(
    async (backup: BackupMetadata) => {
      setSelectedBackup(backup);
      setShowRestoreModal(false);
      Alert.alert(t('backup.confirmRestore'), t('backup.restoreWarning'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: async () => {
            const result = await restore(backup.id);
            if (!result.success) {
              Alert.alert(t('common.error'), result.errorMessage ?? t('backup.restoreError'));
            } else {
              Alert.alert(t('common.success'), t('backup.restoreSuccess'));
            }
          },
        },
      ]);
    },
    [restore, t]
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

  const handleSaveCustomServer = useCallback(async () => {
    setCustomServerUrlError(null);
    setCustomApiKeyError(null);
    setCustomServerSaveSuccess(false);

    const urlValidation = customServerSettingsStore.validateServerUrl(customServerUrl);
    const apiKeyValidation = customServerSettingsStore.validateApiKey(customApiKey);

    let hasError = false;
    if (!urlValidation.valid) {
      setCustomServerUrlError(urlValidation.error ?? t('backup.customServer.invalidUrl'));
      hasError = true;
    }
    if (!apiKeyValidation.valid) {
      setCustomApiKeyError(apiKeyValidation.error ?? t('backup.customServer.invalidApiKey'));
      hasError = true;
    }

    if (hasError) return;

    setIsSavingCustomServer(true);
    try {
      await customServerSettingsStore.saveSettings(customServerUrl, customApiKey);
      setCustomServerSaveSuccess(true);
      setTimeout(() => setCustomServerSaveSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('backup.errors.unknownError');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsSavingCustomServer(false);
    }
  }, [customServerUrl, customApiKey, t]);

  const fetchCustomBackupList = useCallback(async () => {
    setIsLoadingCustomBackups(true);
    setCustomBackupsError(null);

    try {
      const settings = await customServerSettingsStore.getSettings();
      const serverUrl = settings.serverUrl || customServerUrl;
      const apiKey = settings.apiKey || customApiKey;
      const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

      const backupList = await fetchCustomBackups({ serverUrl, apiKey, deviceId });
      // Limit display to 50 items (API already returns sorted by date descending)
      const mappedBackups = backupList.slice(0, 50).map(mapServerToAppMetadata);
      setCustomBackups(mappedBackups);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('backup.errors.unknownError');
      setCustomBackupsError(errorMessage);
    } finally {
      setIsLoadingCustomBackups(false);
    }
  }, [customServerUrl, customApiKey, t]);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setConnectionTestError(null);

    try {
      const settings = await customServerSettingsStore.getSettings();
      const serverUrl = settings.serverUrl || customServerUrl;
      const apiKey = settings.apiKey || customApiKey;
      const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

      // Use a 15-second timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t('backup.customServer.connectionFailed') + ': timeout')), 15000)
      );

      await Promise.race([
        testConnection({ serverUrl, apiKey, deviceId }),
        timeoutPromise,
      ]);

      setConnectionTestResult('success');

      // Automatically fetch backup list after successful connection test
      fetchCustomBackupList();
    } catch (error) {
      setConnectionTestResult('error');
      const errorMessage = error instanceof Error ? error.message : t('backup.customServer.connectionFailed');
      setConnectionTestError(errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  }, [customServerUrl, customApiKey, t, fetchCustomBackupList]);

  const handleCustomBackupNow = useCallback(async () => {
    setIsCustomBackingUp(true);
    try {
      const settings = await customServerSettingsStore.getSettings();
      const serverUrl = settings.serverUrl || customServerUrl;
      const apiKey = settings.apiKey || customApiKey;
      const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

      await createCustomServerBackup({ serverUrl, apiKey, deviceId });

      Alert.alert(t('common.success'), t('backup.customServer.backupSuccess'));
      // Refresh the backup list on success
      fetchCustomBackupList();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('backup.errors.unknownError');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsCustomBackingUp(false);
    }
  }, [customServerUrl, customApiKey, t, fetchCustomBackupList]);

  const handleCustomRestore = useCallback(async (item: BackupMetadata) => {
    Alert.alert(
      t('backup.customServer.confirmRestore'),
      t('backup.customServer.confirmRestoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.customServer.restore'),
          style: 'destructive',
          onPress: async () => {
            setIsCustomRestoring(true);
            try {
              const settings = await customServerSettingsStore.getSettings();
              const serverUrl = settings.serverUrl || customServerUrl;
              const apiKey = settings.apiKey || customApiKey;
              const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

              await restoreFromCustomServer(item.fileName, { serverUrl, apiKey, deviceId });

              Alert.alert(
                t('common.success'),
                t('backup.customServer.restoreSuccess') + '\n\nO app será reiniciado.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reload the app to pick up the restored database
                      const { DevSettings } = require('react-native');
                      if (DevSettings?.reload) {
                        DevSettings.reload();
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : t('backup.errors.unknownError');
              Alert.alert(t('common.error'), errorMessage);
            } finally {
              setIsCustomRestoring(false);
            }
          },
        },
      ]
    );
  }, [customServerUrl, customApiKey, t]);

  const handleCustomDelete = useCallback(async (item: BackupMetadata) => {
    Alert.alert(
      t('backup.customServer.confirmDelete'),
      t('backup.customServer.confirmDeleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.customServer.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const settings = await customServerSettingsStore.getSettings();
              const serverUrl = settings.serverUrl || customServerUrl;
              const apiKey = settings.apiKey || customApiKey;
              const deviceId = await customServerSettingsStore.getOrCreateDeviceId();

              await deleteBackup(item.fileName, { serverUrl, apiKey, deviceId });

              // Refresh the backup list on success
              fetchCustomBackupList();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : t('backup.errors.unknownError');
              Alert.alert(t('common.error'), errorMessage);
            }
          },
        },
      ]
    );
  }, [customServerUrl, customApiKey, t, fetchCustomBackupList]);

  const getBackupStatusDisplay = useCallback((): { text: string; color: string } => {
    if (lastBackupStatus === 'never') {
      return { text: t('backup.never'), color: colors.text.tertiary };
    }
    if (lastBackupStatus === 'failed') {
      return {
        text: lastBackupError ?? t('backup.error'),
        color: colors.semantic.danger.base,
      };
    }
    if (lastBackupTime) {
      return {
        text: formatRelativeTime(lastBackupTime),
        color: colors.semantic.success.base,
      };
    }
    return { text: t('backup.never'), color: colors.text.tertiary };
  }, [lastBackupStatus, lastBackupTime, lastBackupError, t, colors]);

  const renderBackupItem = useCallback(
    ({ item }: { item: BackupMetadata }) => (
      <TouchableOpacity
        style={[styles.backupItem, { borderBottomColor: colors.border.subtle }]}
        onPress={() => handleRestore(item)}
        accessibilityRole="button"
        accessibilityLabel={`${t('backup.restore')} ${formatBackupDate(item.createdAt)}`}
        testID={`backup-item-${item.id}`}
      >
        <View style={styles.backupItemInfo}>
          <Text style={[styles.backupItemDate, { color: colors.text.primary }]}>
            {formatBackupDate(item.createdAt)}
          </Text>
          <Text style={[styles.backupItemSize, { color: colors.text.tertiary }]}>
            {formatFileSize(item.sizeBytes)}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
      </TouchableOpacity>
    ),
    [handleRestore, t, colors]
  );

  const backupStatusDisplay = getBackupStatusDisplay();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background.secondary }]} edges={['bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background.secondary }]}
        contentContainerStyle={styles.contentContainer}
        testID="backup-settings-screen"
      >
        {/* Google Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.googleAccount')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <View style={styles.accountItem} testID="google-account-section">
              <Text style={styles.accountIcon}>👤</Text>
              <View style={styles.accountInfo}>
                {isInitializing ? (
                  <View style={styles.initializingContainer}>
                    <ActivityIndicator size="small" color={colors.interactive.primary} />
                    <Text style={[styles.initializingText, { color: colors.text.tertiary }]}>
                      {t('common.loading')}
                    </Text>
                  </View>
                ) : isConnected ? (
                  <>
                    <Text style={[styles.accountEmail, { color: colors.text.primary }]} testID="connected-email">
                      {connectedEmail}
                    </Text>
                    <Text style={[styles.accountStatus, { color: colors.text.tertiary }]}>
                      {t('backup.connected')}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.accountStatus, { color: colors.text.tertiary }]}>
                    {t('backup.notConnected')}
                  </Text>
                )}
              </View>
              {!isInitializing &&
                (isConnected ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.semantic.danger.base }]}
                    onPress={handleDisconnect}
                    accessibilityRole="button"
                    accessibilityLabel={t('backup.disconnect')}
                    testID="disconnect-button"
                  >
                    <Text style={[styles.actionBtnText, { color: colors.text.inverse }]}>
                      {t('backup.disconnect')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.interactive.primary }]}
                    onPress={handleConnect}
                    accessibilityRole="button"
                    accessibilityLabel={t('backup.connect')}
                    testID="connect-button"
                  >
                    <Text style={[styles.actionBtnText, { color: colors.text.inverse }]}>
                      {t('backup.connect')}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>

        {/* Backup Status Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.lastBackup')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <View style={styles.statusItem} testID="backup-status-section">
              <Text style={styles.statusIcon}>
                {lastBackupStatus === 'success' ? '✅' : lastBackupStatus === 'failed' ? '❌' : '📅'}
              </Text>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusText, { color: backupStatusDisplay.color }]} testID="backup-status-text">
                  {backupStatusDisplay.text}
                </Text>
                {lastBackupTime && lastBackupStatus === 'success' && (
                  <Text style={[styles.statusSubtext, { color: colors.text.tertiary }]} testID="backup-time-text">
                    {formatBackupDate(lastBackupTime)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Backup Frequency Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('backup.scheduledBackup')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <TouchableOpacity
              style={styles.frequencyItem}
              onPress={() => setShowFrequencyModal(true)}
              disabled={!isConnected}
              accessibilityRole="button"
              accessibilityLabel={t('backup.frequency')}
              accessibilityState={{ disabled: !isConnected }}
              testID="frequency-selector"
            >
              <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                {t('backup.frequency')}
              </Text>
              <View style={styles.frequencyValue}>
                <Text style={[styles.frequencyText, { color: colors.text.tertiary }, !isConnected && styles.disabledOpacity]}>
                  {getFrequencyText(backupFrequency)}
                </Text>
                <Text style={[styles.chevron, { color: colors.text.tertiary }, !isConnected && styles.disabledOpacity]}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.frequencyItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle }]}
              onPress={() => setShowTimeModal(true)}
              disabled={!isConnected || backupFrequency === 'disabled'}
              accessibilityRole="button"
              accessibilityLabel={t('backup.preferredTime')}
              accessibilityState={{ disabled: !isConnected || backupFrequency === 'disabled' }}
              testID="time-selector"
            >
              <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                {t('backup.preferredTime')}
              </Text>
              <View style={styles.frequencyValue}>
                <Text style={[styles.frequencyText, { color: colors.text.tertiary }, (!isConnected || backupFrequency === 'disabled') && styles.disabledOpacity]}>
                  {`${preferredHour.toString().padStart(2, '0')}:00`}
                </Text>
                <Text style={[styles.chevron, { color: colors.text.tertiary }, (!isConnected || backupFrequency === 'disabled') && styles.disabledOpacity]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border.subtle }, !isConnected && styles.actionButtonDisabled]}
              onPress={handleBackupNow}
              disabled={!isConnected || isBackingUp}
              accessibilityRole="button"
              accessibilityLabel={t('backup.backupNow')}
              accessibilityState={{ disabled: !isConnected || isBackingUp }}
              testID="backup-now-button"
            >
              <Text style={styles.actionIcon}>☁️</Text>
              <Text style={[styles.actionText, { color: colors.interactive.primary }, !isConnected && { color: colors.text.tertiary }]}>
                {t('backup.backupNow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
              onPress={() => setShowRestoreModal(true)}
              disabled={!isConnected || isRestoring}
              accessibilityRole="button"
              accessibilityLabel={t('backup.restore')}
              accessibilityState={{ disabled: !isConnected || isRestoring }}
              testID="restore-button"
            >
              <Text style={styles.actionIcon}>📥</Text>
              <Text style={[styles.actionText, { color: colors.interactive.primary }, !isConnected && { color: colors.text.tertiary }]}>
                {t('backup.restore')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          {t('settings.dataStorageDescription')}
        </Text>

        {/* Custom Server Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setCustomServerExpanded(!customServerExpanded)}
            accessibilityRole="button"
            accessibilityLabel={t('backup.customServer.title')}
            accessibilityState={{ expanded: customServerExpanded }}
            testID="custom-server-header"
          >
            <Text style={[styles.sectionTitle, { color: colors.text.secondary, marginBottom: 0, marginLeft: 0 }]}>
              {t('backup.customServer.title')}
            </Text>
            <Text style={[styles.chevron, { color: colors.text.tertiary, transform: [{ rotate: customServerExpanded ? '90deg' : '0deg' }] }]}>
              ›
            </Text>
          </TouchableOpacity>

          {customServerExpanded && (
            <View style={[styles.sectionContent, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]} testID="custom-server-section">
              {/* Server URL Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                  {t('backup.customServer.serverUrl')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.background.secondary, color: colors.text.primary, borderColor: customServerUrlError ? colors.semantic.danger.base : colors.border.default },
                  ]}
                  value={customServerUrl}
                  onChangeText={(text) => {
                    setCustomServerUrl(text);
                    if (customServerUrlError) setCustomServerUrlError(null);
                  }}
                  placeholder={t('backup.customServer.serverUrlPlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={2048}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  testID="custom-server-url-input"
                  accessibilityLabel={t('backup.customServer.serverUrl')}
                />
                {customServerUrlError && (
                  <Text style={[styles.errorText, { color: colors.semantic.danger.base }]} testID="custom-server-url-error">
                    {customServerUrlError}
                  </Text>
                )}
              </View>

              {/* API Key Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                  {t('backup.customServer.apiKey')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.background.secondary, color: colors.text.primary, borderColor: customApiKeyError ? colors.semantic.danger.base : colors.border.default },
                  ]}
                  value={customApiKey}
                  onChangeText={(text) => {
                    setCustomApiKey(text);
                    if (customApiKeyError) setCustomApiKeyError(null);
                  }}
                  placeholder={t('backup.customServer.apiKeyPlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={256}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  testID="custom-server-api-key-input"
                  accessibilityLabel={t('backup.customServer.apiKey')}
                />
                {customApiKeyError && (
                  <Text style={[styles.errorText, { color: colors.semantic.danger.base }]} testID="custom-server-api-key-error">
                    {customApiKeyError}
                  </Text>
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.interactive.primary }]}
                onPress={handleSaveCustomServer}
                disabled={isSavingCustomServer}
                accessibilityRole="button"
                accessibilityLabel={t('backup.customServer.save')}
                testID="custom-server-save-button"
              >
                {isSavingCustomServer ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>
                    {t('backup.customServer.save')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Success Message */}
              {customServerSaveSuccess && (
                <Text style={[styles.successText, { color: colors.semantic.success.base }]} testID="custom-server-save-success">
                  {t('backup.customServer.saveSuccess')}
                </Text>
              )}

              {/* Test Connection Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.interactive.primary, marginTop: spacing.xs }]}
                onPress={handleTestConnection}
                disabled={isTestingConnection}
                accessibilityRole="button"
                accessibilityLabel={t('backup.customServer.testConnection')}
                testID="custom-server-test-connection-button"
              >
                {isTestingConnection ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>
                    {t('backup.customServer.testConnection')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Connection Test Status */}
              {isTestingConnection && (
                <Text style={[styles.successText, { color: colors.text.tertiary }]} testID="custom-server-testing-indicator">
                  {t('backup.customServer.testing')}
                </Text>
              )}
              {connectionTestResult === 'success' && (
                <Text style={[styles.successText, { color: colors.semantic.success.base }]} testID="custom-server-connection-success">
                  ✓ {t('backup.customServer.connectionSuccess')}
                </Text>
              )}
              {connectionTestResult === 'error' && (
                <Text style={[styles.errorText, { color: colors.semantic.danger.base, textAlign: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.base }]} testID="custom-server-connection-error">
                  {connectionTestError ?? t('backup.customServer.connectionFailed')}
                </Text>
              )}

              {/* Custom Server Backup List */}
              {connectionTestResult === 'success' && (
                <View style={styles.customBackupListSection} testID="custom-server-backup-list-section">
                  {/* Backup Now Button */}
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.interactive.primary }]}
                    onPress={handleCustomBackupNow}
                    disabled={isCustomBackingUp || isCustomRestoring}
                    accessibilityRole="button"
                    accessibilityLabel={t('backup.customServer.backupNow')}
                    testID="custom-server-backup-now-button"
                  >
                    {isCustomBackingUp ? (
                      <ActivityIndicator size="small" color={colors.text.inverse} />
                    ) : (
                      <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>
                        {t('backup.customServer.backupNow')}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.customBackupListHeader}>
                    <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
                      {t('backup.customServer.backupList')}
                    </Text>
                    <TouchableOpacity
                      onPress={fetchCustomBackupList}
                      disabled={isLoadingCustomBackups}
                      accessibilityRole="button"
                      accessibilityLabel={t('backup.customServer.refresh')}
                      testID="custom-server-refresh-button"
                    >
                      <Text style={[styles.refreshButtonText, { color: colors.interactive.primary }, isLoadingCustomBackups && styles.disabledOpacity]}>
                        {t('backup.customServer.refresh')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isLoadingCustomBackups && (
                    <View style={styles.loadingContainer} testID="custom-server-backups-loading">
                      <ActivityIndicator size="small" color={colors.interactive.primary} />
                      <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
                        {t('backup.customServer.loadingBackups')}
                      </Text>
                    </View>
                  )}

                  {!isLoadingCustomBackups && customBackupsError && (
                    <Text style={[styles.errorText, { color: colors.semantic.danger.base, textAlign: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.base }]} testID="custom-server-backups-error">
                      {customBackupsError}
                    </Text>
                  )}

                  {!isLoadingCustomBackups && !customBackupsError && customBackups.length === 0 && (
                    <View style={styles.emptyContainer} testID="custom-server-no-backups">
                      <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                        {t('backup.customServer.noBackups')}
                      </Text>
                    </View>
                  )}

                  {!isLoadingCustomBackups && !customBackupsError && customBackups.length > 0 && (
                    <View testID="custom-server-backups-list">
                      {customBackups.map((item) => (
                        <View
                          key={item.id}
                          style={[styles.customBackupItem, { borderBottomColor: colors.border.subtle }]}
                          testID={`custom-backup-item-${item.id}`}
                        >
                          <View style={styles.backupItemInfo}>
                            <Text style={[styles.backupItemDate, { color: colors.text.primary }]} numberOfLines={1}>
                              {item.fileName}
                            </Text>
                            <View style={styles.customBackupItemMeta}>
                              <Text style={[styles.backupItemSize, { color: colors.text.tertiary }]}>
                                {formatBackupDate(item.createdAt)}
                              </Text>
                              <Text style={[styles.backupItemSize, { color: colors.text.tertiary }]}>
                                {' · '}
                                {formatFileSize(item.sizeBytes)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.customBackupItemActions}>
                            <TouchableOpacity
                              style={[styles.customBackupActionBtn, { backgroundColor: colors.interactive.primary }]}
                              onPress={() => handleCustomRestore(item)}
                              disabled={isCustomRestoring || isCustomBackingUp}
                              accessibilityRole="button"
                              accessibilityLabel={`${t('backup.customServer.restore')} ${item.fileName}`}
                              testID={`custom-backup-restore-${item.id}`}
                            >
                              {isCustomRestoring ? (
                                <ActivityIndicator size="small" color={colors.text.inverse} />
                              ) : (
                                <Text style={[styles.customBackupActionText, { color: colors.text.inverse }]}>
                                  {t('backup.customServer.restore')}
                                </Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.customBackupActionBtn, { backgroundColor: colors.semantic.danger.base }]}
                              onPress={() => handleCustomDelete(item)}
                              disabled={isCustomRestoring || isCustomBackingUp}
                              accessibilityRole="button"
                              accessibilityLabel={`${t('backup.customServer.delete')} ${item.fileName}`}
                              testID={`custom-backup-delete-${item.id}`}
                            >
                              <Text style={[styles.customBackupActionText, { color: colors.text.inverse }]}>
                                {t('backup.customServer.delete')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Frequency Selection Modal */}
        <Modal visible={showFrequencyModal} animationType="slide" transparent onRequestClose={() => setShowFrequencyModal(false)} testID="frequency-modal">
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('backup.frequency')}</Text>
                <TouchableOpacity onPress={() => setShowFrequencyModal(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="close-frequency-modal">
                  <Text style={[styles.modalClose, { color: colors.interactive.primary }]}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, { borderBottomColor: colors.border.subtle }]}
                  onPress={() => handleFrequencySelect(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: backupFrequency === option.value }}
                  testID={`frequency-option-${option.value}`}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text.primary }]}>{t(option.labelKey)}</Text>
                  {backupFrequency === option.value && <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Time Selection Modal */}
        <Modal visible={showTimeModal} animationType="slide" transparent onRequestClose={() => setShowTimeModal(false)} testID="time-modal">
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('backup.preferredTime')}</Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="close-time-modal">
                  <Text style={[styles.modalClose, { color: colors.interactive.primary }]}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={HOUR_OPTIONS}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalOption, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => handleTimeSelect(item.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: preferredHour === item.value }}
                    testID={`time-option-${item.value}`}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text.primary }]}>{item.label}</Text>
                    {preferredHour === item.value && <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>✓</Text>}
                  </TouchableOpacity>
                )}
                style={styles.timeList}
              />
            </View>
          </View>
        </Modal>

        {/* Restore Backup Modal */}
        <Modal visible={showRestoreModal} animationType="slide" transparent onRequestClose={() => setShowRestoreModal(false)} testID="restore-modal">
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('backup.selectBackup')}</Text>
                <TouchableOpacity onPress={() => setShowRestoreModal(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="close-restore-modal">
                  <Text style={[styles.modalClose, { color: colors.interactive.primary }]}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              {isLoadingBackups ? (
                <View style={styles.loadingContainer} testID="backups-loading">
                  <ActivityIndicator size="large" color={colors.interactive.primary} />
                  <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>{t('common.loading')}</Text>
                </View>
              ) : backups.length === 0 ? (
                <View style={styles.emptyContainer} testID="no-backups">
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>{t('backup.noBackupsFound')}</Text>
                </View>
              ) : (
                <FlatList data={backups} keyExtractor={(item) => item.id} renderItem={renderBackupItem} style={styles.backupList} testID="backups-list" />
              )}
            </View>
          </View>
        </Modal>

        {/* Progress Modal */}
        <Modal visible={showProgressModal && (isBackingUp || isRestoring)} animationType="fade" transparent onRequestClose={() => {}} testID="progress-modal">
          <View style={[styles.progressOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View style={[styles.progressContent, { backgroundColor: colors.surface.card }]}>
              <ActivityIndicator size="large" color={colors.interactive.primary} />
              <Text style={[styles.progressTitle, { color: colors.text.primary }]}>
                {isBackingUp ? t('backup.inProgress') : t('backup.restoreInProgress')}
              </Text>
              {backupProgress && (
                <Text style={[styles.progressMessage, { color: colors.text.tertiary }]} testID="backup-progress-message">
                  {backupProgress.message}
                </Text>
              )}
              {restoreProgress && (
                <Text style={[styles.progressMessage, { color: colors.text.tertiary }]} testID="restore-progress-message">
                  {restoreProgress.message}
                </Text>
              )}
              <View style={[styles.progressBar, { backgroundColor: colors.border.default }]}>
                <View
                  style={[styles.progressFill, { backgroundColor: colors.interactive.primary, width: `${Math.round((backupProgress?.progress ?? restoreProgress?.progress ?? 0) * 100)}%` } as const]}
                  testID="progress-bar-fill"
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  accountIcon: {
    fontSize: spacing['2xl'],
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  accountStatus: {
    fontSize: typography.caption.fontSize + 1,
    marginTop: 2,
  },
  initializingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initializingText: {
    fontSize: typography.caption.fontSize + 1,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  actionBtnText: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  statusIcon: {
    fontSize: spacing.lg,
    marginRight: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: typography.body.fontSize,
  },
  statusSubtext: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  frequencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  frequencyLabel: {
    fontSize: typography.body.fontSize,
  },
  frequencyValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: typography.body.fontSize,
    marginRight: spacing.sm,
  },
  disabledOpacity: {
    opacity: 0.4,
  },
  chevron: {
    fontSize: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: spacing.lg,
    marginRight: spacing.md,
  },
  actionText: {
    fontSize: typography.body.fontSize,
  },
  hint: {
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: typography.body.fontSize + 1,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: {
    fontSize: typography.body.fontSize + 1,
  },
  checkmark: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
  timeList: {
    maxHeight: 300,
  },
  backupList: {
    maxHeight: 400,
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backupItemInfo: {
    flex: 1,
  },
  backupItemDate: {
    fontSize: typography.body.fontSize,
  },
  backupItemSize: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  loadingContainer: {
    padding: spacing['2xl'] + spacing.sm,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body.fontSize,
  },
  emptyContainer: {
    padding: spacing['2xl'] + spacing.sm,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
  },
  // Progress modal styles
  progressOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '80%',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  progressMessage: {
    fontSize: typography.caption.fontSize + 1,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  progressBar: {
    width: '100%',
    height: spacing.xs,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Custom Server styles
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  textInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  saveButton: {
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  successText: {
    fontSize: typography.caption.fontSize + 1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  // Custom server backup list styles
  customBackupListSection: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: spacing.md,
  },
  customBackupListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  refreshButtonText: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
  },
  customBackupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customBackupItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customBackupItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customBackupActionBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  customBackupActionText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
