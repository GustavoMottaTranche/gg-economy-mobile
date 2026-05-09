/**
 * Notification Settings Screen
 *
 * Notification configuration:
 * - Permission status banner (shown when permission denied)
 * - Enable/disable toggle switch
 * - Frequency selector (daily, every 2 days, every 3 days, weekly, disabled)
 * - Time picker for preferred hour and minute
 * - Next notification preview showing calculated next time
 *
 * **Validates: Requirements 1.1, 1.3, 2.1, 2.3, 5.2, 5.3, 5.4**
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useNotificationSettings,
  useNotificationPermission,
  type NotificationFrequency,
} from '../../../src/stores/notificationStore';
import { permissionHandler } from '../../../src/services/notifications/PermissionHandler';
import { notificationScheduler } from '../../../src/services/notifications/NotificationScheduler';

/**
 * Frequency options for notification scheduling
 */
const FREQUENCY_OPTIONS: { value: NotificationFrequency; labelKey: string }[] = [
  { value: 'daily', labelKey: 'notifications.frequencyDaily' },
  { value: 'every2days', labelKey: 'notifications.frequencyEvery2Days' },
  { value: 'every3days', labelKey: 'notifications.frequencyEvery3Days' },
  { value: 'weekly', labelKey: 'notifications.frequencyWeekly' },
  { value: 'disabled', labelKey: 'notifications.frequencyDisabled' },
];

/**
 * Hour options for preferred notification time (0-23)
 */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

/**
 * Minute options for preferred notification time (0, 15, 30, 45)
 */
const MINUTE_OPTIONS = [
  { value: 0, label: '00' },
  { value: 15, label: '15' },
  { value: 30, label: '30' },
  { value: 45, label: '45' },
];

/**
 * Format date for display
 */
function formatNextNotificationDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const {
    isEnabled,
    frequency,
    preferredHour,
    preferredMinute,
    setEnabled,
    setFrequency,
    setPreferredTime,
    setScheduledNotificationId,
  } = useNotificationSettings();

  const { permissionStatus, setPermissionStatus } = useNotificationPermission();

  // Modal states
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(preferredHour);
  const [selectedMinute, setSelectedMinute] = useState(preferredMinute);

  // Check permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await permissionHandler.checkPermission();
      setPermissionStatus(status);
    };
    checkPermission();
  }, [setPermissionStatus]);

  // Calculate next notification time
  const nextNotificationTime = notificationScheduler.calculateNextTime({
    isEnabled,
    frequency,
    preferredHour,
    preferredMinute,
    scheduledNotificationId: null,
    lastDeliveryTime: null,
  });

  /**
   * Handle enable/disable toggle
   */
  const handleToggleEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        // Request permission when enabling for the first time
        if (permissionStatus !== 'granted') {
          const status = await permissionHandler.requestPermission();
          setPermissionStatus(status);

          if (status !== 'granted') {
            // Permission denied, don't enable
            return;
          }
        }

        // Enable notifications
        setEnabled(true);

        // Schedule the next notification
        try {
          const settings = {
            isEnabled: true,
            frequency: frequency === 'disabled' ? ('daily' as NotificationFrequency) : frequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
          };
          const notificationId = await notificationScheduler.scheduleNext(settings);
          setScheduledNotificationId(notificationId);
        } catch (error) {
          console.warn('Failed to schedule notification:', error);
        }
      } else {
        // Disable notifications
        setEnabled(false);
        await notificationScheduler.cancelAll();
        setScheduledNotificationId(null);
      }
    },
    [
      permissionStatus,
      setPermissionStatus,
      setEnabled,
      frequency,
      preferredHour,
      preferredMinute,
      setScheduledNotificationId,
    ]
  );

  /**
   * Handle frequency selection
   */
  const handleFrequencySelect = useCallback(
    async (newFrequency: NotificationFrequency) => {
      setFrequency(newFrequency);
      setShowFrequencyModal(false);

      // Reschedule notification with new frequency
      if (isEnabled && newFrequency !== 'disabled') {
        try {
          await notificationScheduler.cancelAll();
          const settings = {
            isEnabled: true,
            frequency: newFrequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
          };
          const notificationId = await notificationScheduler.scheduleNext(settings);
          setScheduledNotificationId(notificationId);
        } catch (error) {
          console.warn('Failed to reschedule notification:', error);
        }
      }
    },
    [setFrequency, isEnabled, preferredHour, preferredMinute, setScheduledNotificationId]
  );

  /**
   * Handle time selection confirmation
   */
  const handleTimeConfirm = useCallback(async () => {
    setPreferredTime(selectedHour, selectedMinute);
    setShowTimeModal(false);

    // Reschedule notification with new time
    if (isEnabled && frequency !== 'disabled') {
      try {
        await notificationScheduler.cancelAll();
        const settings = {
          isEnabled: true,
          frequency,
          preferredHour: selectedHour,
          preferredMinute: selectedMinute,
          scheduledNotificationId: null,
          lastDeliveryTime: null,
        };
        const notificationId = await notificationScheduler.scheduleNext(settings);
        setScheduledNotificationId(notificationId);
      } catch (error) {
        console.warn('Failed to reschedule notification:', error);
      }
    }
  }, [
    setPreferredTime,
    selectedHour,
    selectedMinute,
    isEnabled,
    frequency,
    setScheduledNotificationId,
  ]);

  /**
   * Handle opening system settings
   */
  const handleOpenSettings = useCallback(async () => {
    try {
      await permissionHandler.openSettings();
    } catch (error) {
      console.warn('Failed to open settings:', error);
    }
  }, []);

  /**
   * Get frequency display text
   */
  const getFrequencyText = useCallback(
    (freq: NotificationFrequency): string => {
      const option = FREQUENCY_OPTIONS.find((opt) => opt.value === freq);
      return option ? t(option.labelKey) : t('notifications.frequencyDisabled');
    },
    [t]
  );

  /**
   * Format time for display
   */
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Check if controls should be disabled
  const isPermissionDenied = permissionStatus === 'denied';
  const areControlsDisabled = isPermissionDenied || !isEnabled;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        testID="notification-settings-screen"
      >
        {/* Permission Denied Banner */}
        {isPermissionDenied && (
          <View style={styles.permissionBanner} testID="permission-denied-banner">
            <Text style={styles.permissionBannerIcon}>🔕</Text>
            <View style={styles.permissionBannerContent}>
              <Text style={styles.permissionBannerText}>{t('notifications.permissionDenied')}</Text>
              <TouchableOpacity
                style={styles.openSettingsButton}
                onPress={handleOpenSettings}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.openSettings')}
                testID="open-settings-button"
              >
                <Text style={styles.openSettingsButtonText}>{t('notifications.openSettings')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enable/Disable Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.settingsTitle')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.toggleItem} testID="notification-toggle-section">
              <Text style={styles.toggleIcon}>🔔</Text>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t('notifications.settingsTitle')}</Text>
                <Text style={styles.toggleStatus}>
                  {isEnabled ? t('notifications.enabled') : t('notifications.disabled')}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggleEnabled}
                disabled={isPermissionDenied}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                accessibilityRole="switch"
                accessibilityLabel={t('notifications.settingsTitle')}
                accessibilityState={{ checked: isEnabled, disabled: isPermissionDenied }}
                testID="notification-toggle"
              />
            </View>
          </View>
        </View>

        {/* Frequency Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.frequency')}</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.frequencyItem}
              onPress={() => setShowFrequencyModal(true)}
              disabled={areControlsDisabled}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.frequency')}
              accessibilityState={{ disabled: areControlsDisabled }}
              testID="frequency-selector"
            >
              <Text style={styles.frequencyLabel}>{t('notifications.frequency')}</Text>
              <View style={styles.frequencyValue}>
                <Text style={[styles.frequencyText, areControlsDisabled && styles.disabledText]}>
                  {getFrequencyText(frequency)}
                </Text>
                <Text style={[styles.chevron, areControlsDisabled && styles.disabledText]}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.frequencyItem, styles.borderTop]}
              onPress={() => {
                setSelectedHour(preferredHour);
                setSelectedMinute(preferredMinute);
                setShowTimeModal(true);
              }}
              disabled={areControlsDisabled || frequency === 'disabled'}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.preferredTime')}
              accessibilityState={{ disabled: areControlsDisabled || frequency === 'disabled' }}
              testID="time-selector"
            >
              <Text style={styles.frequencyLabel}>{t('notifications.preferredTime')}</Text>
              <View style={styles.frequencyValue}>
                <Text
                  style={[
                    styles.frequencyText,
                    (areControlsDisabled || frequency === 'disabled') && styles.disabledText,
                  ]}
                >
                  {formatTime(preferredHour, preferredMinute)}
                </Text>
                <Text
                  style={[
                    styles.chevron,
                    (areControlsDisabled || frequency === 'disabled') && styles.disabledText,
                  ]}
                >
                  ›
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next Notification Preview */}
        {isEnabled && nextNotificationTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.nextNotification')}</Text>
            <View style={styles.sectionContent}>
              <View style={styles.previewItem} testID="next-notification-preview">
                <Text style={styles.previewIcon}>📅</Text>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewText} testID="next-notification-time">
                    {formatNextNotificationDate(nextNotificationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.hint}>{t('notifications.settingsDescription')}</Text>

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
                <Text style={styles.modalTitle}>{t('notifications.frequency')}</Text>
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
                  accessibilityState={{ selected: frequency === option.value }}
                  testID={`frequency-option-${option.value}`}
                >
                  <Text style={styles.modalOptionText}>{t(option.labelKey)}</Text>
                  {frequency === option.value && <Text style={styles.checkmark}>✓</Text>}
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
                <TouchableOpacity
                  onPress={() => setShowTimeModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  testID="cancel-time-modal"
                >
                  <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{t('notifications.selectTime')}</Text>
                <TouchableOpacity
                  onPress={handleTimeConfirm}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.done')}
                  testID="confirm-time-modal"
                >
                  <Text style={styles.modalDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.timePickerContainer}>
                {/* Hour Picker */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Hour</Text>
                  <FlatList
                    data={HOUR_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.timeOption,
                          selectedHour === item.value && styles.timeOptionSelected,
                        ]}
                        onPress={() => setSelectedHour(item.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedHour === item.value }}
                        testID={`hour-option-${item.value}`}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedHour === item.value && styles.timeOptionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.timeList}
                    showsVerticalScrollIndicator={false}
                    initialScrollIndex={Math.max(0, selectedHour - 2)}
                    getItemLayout={(_, index) => ({
                      length: 44,
                      offset: 44 * index,
                      index,
                    })}
                  />
                </View>

                {/* Minute Picker */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Minute</Text>
                  <FlatList
                    data={MINUTE_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.timeOption,
                          selectedMinute === item.value && styles.timeOptionSelected,
                        ]}
                        onPress={() => setSelectedMinute(item.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedMinute === item.value }}
                        testID={`minute-option-${item.value}`}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedMinute === item.value && styles.timeOptionTextSelected,
                          ]}
                        >
                          :{item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.minuteList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>

              <View style={styles.selectedTimePreview}>
                <Text style={styles.selectedTimeText}>
                  {formatTime(selectedHour, selectedMinute)}
                </Text>
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
  // Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  permissionBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionBannerContent: {
    flex: 1,
  },
  permissionBannerText: {
    fontSize: 14,
    color: '#664D03',
    lineHeight: 20,
    marginBottom: 12,
  },
  openSettingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  openSettingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Sections
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
  // Toggle Item
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  toggleStatus: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Frequency Item
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
  // Preview Item
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  previewIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewText: {
    fontSize: 16,
    color: '#000000',
  },
  // Hint
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
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalDone: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
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
  // Time Picker
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  timeColumn: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  timeColumnLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  timeList: {
    height: 200,
    width: 80,
  },
  minuteList: {
    height: 200,
    width: 80,
  },
  timeOption: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  timeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  timeOptionText: {
    fontSize: 20,
    color: '#000000',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedTimePreview: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  selectedTimeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#007AFF',
  },
});
