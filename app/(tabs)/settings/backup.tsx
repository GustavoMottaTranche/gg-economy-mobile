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
 * **Validates: Requirements 7, 8, 9, 10, 26, 30**
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useBackup, type RestoreProgress } from '../../../src/hooks/useBackup';
import { oAuthService } from '../../../src/services/backup/OAuthService';
import { useBackupConnection } from '../../../src/stores/backupStore';
import type { BackupMetadata } from '../../../src/types/backup';
import type { BackupFrequency } from '../../../src/stores/backupStore';

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
  const {
    // Status
    lastBackupTime,
    lastBackupStatus,
    lastBackupError,
    // Operation state
    isBackingUp,
    isRestoring,
    backupProgress,
    restoreProgress,
    // Connection state
    isConnected,
    connectedEmail,
    // Scheduled backup
    backupFrequency,
    preferredHour,
    // Available backups
    backups,
    isLoadingBackups,
    // Actions
    connect,
    disconnect,
    backupNow,
    listBackups,
    restore,
    setBackupFrequency,
    setPreferredHour,
  } = useBackup();

  // Get connection setter from store for initialization
  const { setConnectionStatus } = useBackupConnection();

  // Modal states
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Track if initialization has run
  const hasInitialized = useRef(false);

  /**
   * Initialize connection state from OAuthService on mount
   * This ensures the UI reflects the actual OAuth state (tokens may have expired)
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeConnectionState = async () => {
      try {
        // Check if user is actually signed in (has valid tokens)
        const signedIn = await oAuthService.isSignedIn();

        if (signedIn) {
          // Get current user info
          const user = await oAuthService.getCurrentUser();
          if (user) {
            setConnectionStatus(true, user.email);
          } else {
            // Tokens exist but can't get user - try to refresh
            try {
              await oAuthService.getAccessToken();
              const refreshedUser = await oAuthService.getCurrentUser();
              if (refreshedUser) {
                setConnectionStatus(true, refreshedUser.email);
              } else {
                // Can't get user info, mark as disconnected
                setConnectionStatus(false, null);
              }
            } catch {
              // Token refresh failed, mark as disconnected
              setConnectionStatus(false, null);
            }
          }
        } else {
          // Not signed in, ensure store reflects this
          setConnectionStatus(false, null);
        }
      } catch (error) {
        console.error('[BackupSettings] Failed to initialize connection state:', error);
        // On error, assume disconnected
        setConnectionStatus(false, null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeConnectionState();
  }, [setConnectionStatus]);

  // Load backups when restore modal opens
  useEffect(() => {
    if (showRestoreModal && isConnected) {
      listBackups();
    }
  }, [showRestoreModal, isConnected, listBackups]);

  // Show progress modal when backup/restore starts
  useEffect(() => {
    if (isBackingUp || isRestoring) {
      setShowProgressModal(true);
    }
  }, [isBackingUp, isRestoring]);

  /**
   * Handle Google account connection
   */
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

  /**
   * Handle Google account disconnection
   */
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

  /**
   * Handle backup now action
   */
  const handleBackupNow = useCallback(async () => {
    const result = await backupNow();
    if (!result.success) {
      Alert.alert(t('common.error'), result.errorMessage ?? t('backup.error'));
    }
  }, [backupNow, t]);

  /**
   * Handle restore action
   */
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

  /**
   * Handle frequency selection
   */
  const handleFrequencySelect = useCallback(
    (frequency: BackupFrequency) => {
      setBackupFrequency(frequency);
      setShowFrequencyModal(false);
    },
    [setBackupFrequency]
  );

  /**
   * Handle time selection
   */
  const handleTimeSelect = useCallback(
    (hour: number) => {
      setPreferredHour(hour);
      setShowTimeModal(false);
    },
    [setPreferredHour]
  );

  /**
   * Get frequency display text
   */
  const getFrequencyText = useCallback(
    (frequency: BackupFrequency): string => {
      const option = FREQUENCY_OPTIONS.find((opt) => opt.value === frequency);
      return option ? t(option.labelKey) : t('backup.frequencyDisabled');
    },
    [t]
  );

  /**
   * Get backup status display
   */
  const getBackupStatusDisplay = useCallback((): { text: string; color: string } => {
    if (lastBackupStatus === 'never') {
      return { text: t('backup.never'), color: '#8E8E93' };
    }
    if (lastBackupStatus === 'failed') {
      return {
        text: lastBackupError ?? t('backup.error'),
        color: '#FF3B30',
      };
    }
    if (lastBackupTime) {
      return {
        text: formatRelativeTime(lastBackupTime),
        color: '#34C759',
      };
    }
    return { text: t('backup.never'), color: '#8E8E93' };
  }, [lastBackupStatus, lastBackupTime, lastBackupError, t]);

  /**
   * Render backup item in restore list
   */
  const renderBackupItem = useCallback(
    ({ item }: { item: BackupMetadata }) => (
      <TouchableOpacity
        style={styles.backupItem}
        onPress={() => handleRestore(item)}
        accessibilityRole="button"
        accessibilityLabel={`${t('backup.restore')} ${formatBackupDate(item.createdAt)}`}
        testID={`backup-item-${item.id}`}
      >
        <View style={styles.backupItemInfo}>
          <Text style={styles.backupItemDate}>{formatBackupDate(item.createdAt)}</Text>
          <Text style={styles.backupItemSize}>{formatFileSize(item.sizeBytes)}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    ),
    [handleRestore, t]
  );

  const backupStatusDisplay = getBackupStatusDisplay();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        testID="backup-settings-screen"
      >
        {/* Google Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.googleAccount')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.accountItem} testID="google-account-section">
              <Text style={styles.accountIcon}>👤</Text>
              <View style={styles.accountInfo}>
                {isInitializing ? (
                  <View style={styles.initializingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.initializingText}>{t('common.loading')}</Text>
                  </View>
                ) : isConnected ? (
                  <>
                    <Text style={styles.accountEmail} testID="connected-email">
                      {connectedEmail}
                    </Text>
                    <Text style={styles.accountStatus}>{t('backup.connected')}</Text>
                  </>
                ) : (
                  <Text style={styles.accountStatus}>{t('backup.notConnected')}</Text>
                )}
              </View>
              {!isInitializing &&
                (isConnected ? (
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnect}
                    accessibilityRole="button"
                    accessibilityLabel={t('backup.disconnect')}
                    testID="disconnect-button"
                  >
                    <Text style={styles.disconnectButtonText}>{t('backup.disconnect')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={handleConnect}
                    accessibilityRole="button"
                    accessibilityLabel={t('backup.connect')}
                    testID="connect-button"
                  >
                    <Text style={styles.connectButtonText}>{t('backup.connect')}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>

        {/* Backup Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.lastBackup')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.statusItem} testID="backup-status-section">
              <Text style={styles.statusIcon}>
                {lastBackupStatus === 'success'
                  ? '✅'
                  : lastBackupStatus === 'failed'
                    ? '❌'
                    : '📅'}
              </Text>
              <View style={styles.statusInfo}>
                <Text
                  style={[styles.statusText, { color: backupStatusDisplay.color }]}
                  testID="backup-status-text"
                >
                  {backupStatusDisplay.text}
                </Text>
                {lastBackupTime && lastBackupStatus === 'success' && (
                  <Text style={styles.statusSubtext} testID="backup-time-text">
                    {formatBackupDate(lastBackupTime)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Backup Frequency Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup.scheduledBackup')}</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.frequencyItem}
              onPress={() => setShowFrequencyModal(true)}
              disabled={!isConnected}
              accessibilityRole="button"
              accessibilityLabel={t('backup.frequency')}
              accessibilityState={{ disabled: !isConnected }}
              testID="frequency-selector"
            >
              <Text style={styles.frequencyLabel}>{t('backup.frequency')}</Text>
              <View style={styles.frequencyValue}>
                <Text style={[styles.frequencyText, !isConnected && styles.disabledText]}>
                  {getFrequencyText(backupFrequency)}
                </Text>
                <Text style={[styles.chevron, !isConnected && styles.disabledText]}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.frequencyItem, styles.borderTop]}
              onPress={() => setShowTimeModal(true)}
              disabled={!isConnected || backupFrequency === 'disabled'}
              accessibilityRole="button"
              accessibilityLabel={t('backup.preferredTime')}
              accessibilityState={{ disabled: !isConnected || backupFrequency === 'disabled' }}
              testID="time-selector"
            >
              <Text style={styles.frequencyLabel}>{t('backup.preferredTime')}</Text>
              <View style={styles.frequencyValue}>
                <Text
                  style={[
                    styles.frequencyText,
                    (!isConnected || backupFrequency === 'disabled') && styles.disabledText,
                  ]}
                >
                  {`${preferredHour.toString().padStart(2, '0')}:00`}
                </Text>
                <Text
                  style={[
                    styles.chevron,
                    (!isConnected || backupFrequency === 'disabled') && styles.disabledText,
                  ]}
                >
                  ›
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.actionButton, !isConnected && styles.actionButtonDisabled]}
              onPress={handleBackupNow}
              disabled={!isConnected || isBackingUp}
              accessibilityRole="button"
              accessibilityLabel={t('backup.backupNow')}
              accessibilityState={{ disabled: !isConnected || isBackingUp }}
              testID="backup-now-button"
            >
              <Text style={styles.actionIcon}>☁️</Text>
              <Text style={[styles.actionText, !isConnected && styles.actionTextDisabled]}>
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
              <Text style={[styles.actionText, !isConnected && styles.actionTextDisabled]}>
                {t('backup.restore')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.hint}>{t('settings.dataStorageDescription')}</Text>

        {/* Frequency Selection Modal */}
        <Modal
          visible={showFrequencyModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFrequencyModal(false)}
          testID="frequency-modal"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('backup.frequency')}</Text>
                <TouchableOpacity
                  onPress={() => setShowFrequencyModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  testID="close-frequency-modal"
                >
                  <Text style={styles.modalClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => handleFrequencySelect(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: backupFrequency === option.value }}
                  testID={`frequency-option-${option.value}`}
                >
                  <Text style={styles.modalOptionText}>{t(option.labelKey)}</Text>
                  {backupFrequency === option.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Time Selection Modal */}
        <Modal
          visible={showTimeModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTimeModal(false)}
          testID="time-modal"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('backup.preferredTime')}</Text>
                <TouchableOpacity
                  onPress={() => setShowTimeModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  testID="close-time-modal"
                >
                  <Text style={styles.modalClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={HOUR_OPTIONS}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => handleTimeSelect(item.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: preferredHour === item.value }}
                    testID={`time-option-${item.value}`}
                  >
                    <Text style={styles.modalOptionText}>{item.label}</Text>
                    {preferredHour === item.value && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
                style={styles.timeList}
              />
            </View>
          </View>
        </Modal>

        {/* Restore Backup Modal */}
        <Modal
          visible={showRestoreModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowRestoreModal(false)}
          testID="restore-modal"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('backup.selectBackup')}</Text>
                <TouchableOpacity
                  onPress={() => setShowRestoreModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  testID="close-restore-modal"
                >
                  <Text style={styles.modalClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              {isLoadingBackups ? (
                <View style={styles.loadingContainer} testID="backups-loading">
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
              ) : backups.length === 0 ? (
                <View style={styles.emptyContainer} testID="no-backups">
                  <Text style={styles.emptyText}>{t('backup.noBackupsFound')}</Text>
                </View>
              ) : (
                <FlatList
                  data={backups}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBackupItem}
                  style={styles.backupList}
                  testID="backups-list"
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Progress Modal */}
        <Modal
          visible={showProgressModal && (isBackingUp || isRestoring)}
          animationType="fade"
          transparent
          onRequestClose={() => {}}
          testID="progress-modal"
        >
          <View style={styles.progressOverlay}>
            <View style={styles.progressContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.progressTitle}>
                {isBackingUp ? t('backup.inProgress') : t('backup.restoreInProgress')}
              </Text>
              {backupProgress && (
                <Text style={styles.progressMessage} testID="backup-progress-message">
                  {backupProgress.message}
                </Text>
              )}
              {restoreProgress && (
                <Text style={styles.progressMessage} testID="restore-progress-message">
                  {restoreProgress.message}
                </Text>
              )}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round((backupProgress?.progress ?? restoreProgress?.progress ?? 0) * 100)}%`,
                    } as const,
                  ]}
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
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  accountIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  accountStatus: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  initializingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initializingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  frequencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  frequencyLabel: {
    fontSize: 16,
    color: '#000000',
  },
  frequencyValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginRight: 8,
  },
  disabledText: {
    color: '#C7C7CC',
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#007AFF',
  },
  actionTextDisabled: {
    color: '#8E8E93',
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalClose: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalOptionText: {
    fontSize: 17,
    color: '#000000',
  },
  checkmark: {
    fontSize: 17,
    color: '#007AFF',
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backupItemInfo: {
    flex: 1,
  },
  backupItemDate: {
    fontSize: 16,
    color: '#000000',
  },
  backupItemSize: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  // Progress modal styles
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});
