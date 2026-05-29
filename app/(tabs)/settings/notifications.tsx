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
 * **Validates: Requirements 1.1, 1.3, 2.1, 2.3, 5.2, 5.3, 5.4, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
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
  type TimeSlot,
} from '../../../src/stores/notificationStore';
import { permissionHandler } from '../../../src/services/notifications/PermissionHandler';
import { notificationScheduler } from '../../../src/services/notifications/NotificationScheduler';
import { TimeSlotSection } from '../../../src/components/notifications/TimeSlotSection';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';

/**
 * Frequency options for notification scheduling
 */
const FREQUENCY_OPTIONS: { value: NotificationFrequency; labelKey: string }[] = [
  { value: 'multipleDaily', labelKey: 'notifications.frequencyMultipleDaily' },
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
  const colors = useThemeColors();
  const {
    isEnabled,
    frequency,
    preferredHour,
    preferredMinute,
    timeSlots,
    setEnabled,
    setFrequency,
    setPreferredTime,
    setScheduledNotificationId,
    addTimeSlot,
    removeTimeSlot,
    setTimeSlotNotificationIds,
  } = useNotificationSettings();

  const { permissionStatus, setPermissionStatus } = useNotificationPermission();

  // Modal states
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(preferredHour);
  const [selectedMinute, setSelectedMinute] = useState(preferredMinute);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  // Check permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await permissionHandler.checkPermission();
      setPermissionStatus(status);
    };
    checkPermission();
  }, [setPermissionStatus]);

  // Calculate next notification time
  const nextNotificationTime =
    frequency === 'multipleDaily'
      ? notificationScheduler.calculateNextTimeMultiSlot(timeSlots)
      : notificationScheduler.calculateNextTime({
          isEnabled,
          frequency,
          preferredHour,
          preferredMinute,
          scheduledNotificationId: null,
          lastDeliveryTime: null,
          timeSlots: [],
          timeSlotNotificationIds: {},
        });

  /**
   * Handle enable/disable toggle
   */
  const handleToggleEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        if (permissionStatus !== 'granted') {
          const status = await permissionHandler.requestPermission();
          setPermissionStatus(status);

          if (status !== 'granted') {
            return;
          }
        }

        setEnabled(true);

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
   *
   * - Switching TO multipleDaily: initializes timeSlots from preferredHour/preferredMinute if empty, calls scheduleAllSlots
   * - Switching FROM multipleDaily to another frequency: cancels all, schedules single notification with preferredHour/preferredMinute
   * - Switching to disabled: cancels all notifications
   * - Preserves timeSlots data in store when switching away (does not clear)
   *
   * **Validates: Requirements 2.3, 2.4, 2.5, 3.1**
   */
  const handleFrequencySelect = useCallback(
    async (newFrequency: NotificationFrequency) => {
      setFrequency(newFrequency);
      setShowFrequencyModal(false);

      if (!isEnabled) {
        return;
      }

      if (newFrequency === 'disabled') {
        // Cancel all notifications when switching to disabled (including multi-slot)
        try {
          await notificationScheduler.cancelAll();
          setScheduledNotificationId(null);
          setTimeSlotNotificationIds({});
        } catch (error) {
          console.warn('Failed to cancel notifications:', error);
        }
        return;
      }

      try {
        await notificationScheduler.cancelAll();

        if (newFrequency === 'multipleDaily') {
          // Initialize time slots from preferredHour/preferredMinute when switching to multipleDaily with empty list
          let slotsToSchedule = timeSlots;
          if (timeSlots.length === 0) {
            addTimeSlot({ hour: preferredHour, minute: preferredMinute });
            slotsToSchedule = [{ hour: preferredHour, minute: preferredMinute }];
          }

          const settings = {
            isEnabled: true,
            frequency: newFrequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
            timeSlots: slotsToSchedule,
            timeSlotNotificationIds: {},
          };
          const result = await notificationScheduler.scheduleAllSlots(slotsToSchedule, settings);
          setTimeSlotNotificationIds(result);
        } else {
          // Switching from multipleDaily (or any other) to a single-notification frequency:
          // Schedule single notification using preferredHour/preferredMinute with new frequency
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
          setTimeSlotNotificationIds({});
        }
      } catch (error) {
        console.warn('Failed to reschedule notification:', error);
      }
    },
    [setFrequency, isEnabled, preferredHour, preferredMinute, setScheduledNotificationId, timeSlots, addTimeSlot, setTimeSlotNotificationIds]
  );

  /**
   * Handle time selection confirmation
   */
  const handleTimeConfirm = useCallback(async () => {
    setPreferredTime(selectedHour, selectedMinute);
    setShowTimeModal(false);

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
   * Handle adding a time slot in multipleDaily mode
   */
  const handleAddSlot = useCallback(
    async (slot: TimeSlot) => {
      setDuplicateMessage(null);
      const success = addTimeSlot(slot);

      if (!success) {
        // Show duplicate validation message
        setDuplicateMessage(t('notifications.duplicateTimeSlot'));
        return;
      }

      // Schedule all slots after successful add
      if (isEnabled && frequency === 'multipleDaily') {
        try {
          const updatedSlots = [...timeSlots, slot].sort((a, b) => {
            if (a.hour !== b.hour) return a.hour - b.hour;
            return a.minute - b.minute;
          });
          const settings = {
            isEnabled: true,
            frequency: frequency as NotificationFrequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
            timeSlots: updatedSlots,
            timeSlotNotificationIds: {},
          };
          const result = await notificationScheduler.scheduleAllSlots(updatedSlots, settings);
          setTimeSlotNotificationIds(result);
        } catch (error) {
          console.warn('Failed to reschedule notifications after adding slot:', error);
        }
      }
    },
    [addTimeSlot, isEnabled, frequency, timeSlots, preferredHour, preferredMinute, setTimeSlotNotificationIds, t]
  );

  /**
   * Handle removing a time slot in multipleDaily mode
   */
  const handleRemoveSlot = useCallback(
    async (key: string) => {
      setDuplicateMessage(null);
      const success = removeTimeSlot(key);

      if (!success) {
        return;
      }

      // Schedule all remaining slots after successful remove
      if (isEnabled && frequency === 'multipleDaily') {
        try {
          const updatedSlots = timeSlots.filter(
            (s) => `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}` !== key
          );
          const settings = {
            isEnabled: true,
            frequency: frequency as NotificationFrequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
            timeSlots: updatedSlots,
            timeSlotNotificationIds: {},
          };
          const result = await notificationScheduler.scheduleAllSlots(updatedSlots, settings);
          setTimeSlotNotificationIds(result);
        } catch (error) {
          console.warn('Failed to reschedule notifications after removing slot:', error);
        }
      }
    },
    [removeTimeSlot, isEnabled, frequency, timeSlots, preferredHour, preferredMinute, setTimeSlotNotificationIds]
  );

  /**
   * Handle editing a time slot (remove old, add new)
   */
  const handleEditSlot = useCallback(
    async (oldKey: string, newSlot: TimeSlot) => {
      setDuplicateMessage(null);

      // If the time didn't change, do nothing
      const newKey = `${newSlot.hour.toString().padStart(2, '0')}:${newSlot.minute.toString().padStart(2, '0')}`;
      if (oldKey === newKey) return;

      // Check if the new time already exists (excluding the one being edited)
      const existsAlready = timeSlots.some(
        (s) => `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}` === newKey &&
               `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}` !== oldKey
      );
      if (existsAlready) {
        setDuplicateMessage(t('notifications.duplicateTimeSlot'));
        return;
      }

      // Remove old slot and add new one
      removeTimeSlot(oldKey);
      const success = addTimeSlot(newSlot);

      if (!success) {
        // Shouldn't happen since we checked for duplicates, but handle gracefully
        // Re-add the old slot back
        const [hourStr, minStr] = oldKey.split(':');
        addTimeSlot({ hour: parseInt(hourStr, 10), minute: parseInt(minStr, 10) });
        setDuplicateMessage(t('notifications.duplicateTimeSlot'));
        return;
      }

      // Reschedule all slots
      if (isEnabled && frequency === 'multipleDaily') {
        try {
          const updatedSlots = timeSlots
            .filter((s) => `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}` !== oldKey)
            .concat(newSlot)
            .sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute);
          const settings = {
            isEnabled: true,
            frequency: frequency as NotificationFrequency,
            preferredHour,
            preferredMinute,
            scheduledNotificationId: null,
            lastDeliveryTime: null,
            timeSlots: updatedSlots,
            timeSlotNotificationIds: {},
          };
          const result = await notificationScheduler.scheduleAllSlots(updatedSlots, settings);
          setTimeSlotNotificationIds(result);
        } catch (error) {
          console.warn('Failed to reschedule notifications after editing slot:', error);
        }
      }
    },
    [timeSlots, removeTimeSlot, addTimeSlot, isEnabled, frequency, preferredHour, preferredMinute, setTimeSlotNotificationIds, t]
  );

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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.secondary }]}
      edges={['bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background.secondary }]}
        contentContainerStyle={styles.contentContainer}
        testID="notification-settings-screen"
      >
        {/* Permission Denied Banner */}
        {isPermissionDenied && (
          <View
            style={[
              styles.permissionBanner,
              {
                backgroundColor: colors.semantic.warning.light,
                borderColor: colors.semantic.warning.base,
              },
            ]}
            testID="permission-denied-banner"
          >
            <Text style={styles.permissionBannerIcon}>🔕</Text>
            <View style={styles.permissionBannerContent}>
              <Text
                style={[styles.permissionBannerText, { color: colors.semantic.warning.dark }]}
              >
                {t('notifications.permissionDenied')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.openSettingsButton,
                  { backgroundColor: colors.interactive.primary },
                ]}
                onPress={handleOpenSettings}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.openSettings')}
                testID="open-settings-button"
              >
                <Text style={[styles.openSettingsButtonText, { color: colors.text.inverse }]}>
                  {t('notifications.openSettings')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enable/Disable Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('notifications.settingsTitle')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              {
                backgroundColor: colors.surface.card,
                borderColor: colors.border.default,
              },
            ]}
          >
            <View style={styles.toggleItem} testID="notification-toggle-section">
              <Text style={styles.toggleIcon}>🔔</Text>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.text.primary }]}>
                  {t('notifications.settingsTitle')}
                </Text>
                <Text style={[styles.toggleStatus, { color: colors.text.tertiary }]}>
                  {isEnabled ? t('notifications.enabled') : t('notifications.disabled')}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggleEnabled}
                disabled={isPermissionDenied}
                trackColor={{ false: colors.border.default, true: colors.semantic.success.base }}
                thumbColor={colors.background.primary}
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
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {t('notifications.frequency')}
          </Text>
          <View
            style={[
              styles.sectionContent,
              {
                backgroundColor: colors.surface.card,
                borderColor: colors.border.default,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.frequencyItem}
              onPress={() => setShowFrequencyModal(true)}
              disabled={areControlsDisabled}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.frequency')}
              accessibilityState={{ disabled: areControlsDisabled }}
              testID="frequency-selector"
            >
              <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                {t('notifications.frequency')}
              </Text>
              <View style={styles.frequencyValue}>
                <Text
                  style={[
                    styles.frequencyText,
                    { color: colors.text.tertiary },
                    areControlsDisabled && styles.disabledOpacity,
                  ]}
                >
                  {getFrequencyText(frequency)}
                </Text>
                <Text
                  style={[
                    styles.chevron,
                    { color: colors.text.tertiary },
                    areControlsDisabled && styles.disabledOpacity,
                  ]}
                >
                  ›
                </Text>
              </View>
            </TouchableOpacity>

            {/* Single time picker - hidden when frequency is multipleDaily */}
            {frequency !== 'multipleDaily' && (
              <TouchableOpacity
                style={[styles.frequencyItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle }]}
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
                <Text style={[styles.frequencyLabel, { color: colors.text.primary }]}>
                  {t('notifications.preferredTime')}
                </Text>
                <View style={styles.frequencyValue}>
                  <Text
                    style={[
                      styles.frequencyText,
                      { color: colors.text.tertiary },
                      (areControlsDisabled || frequency === 'disabled') && styles.disabledOpacity,
                    ]}
                  >
                    {formatTime(preferredHour, preferredMinute)}
                  </Text>
                  <Text
                    style={[
                      styles.chevron,
                      { color: colors.text.tertiary },
                      (areControlsDisabled || frequency === 'disabled') && styles.disabledOpacity,
                    ]}
                  >
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Slot Section - shown when frequency is multipleDaily */}
        {frequency === 'multipleDaily' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
              {t('notifications.preferredTime')}
            </Text>
            <TimeSlotSection
              timeSlots={timeSlots}
              onAddSlot={handleAddSlot}
              onRemoveSlot={handleRemoveSlot}
              onEditSlot={handleEditSlot}
              disabled={areControlsDisabled}
            />
            {duplicateMessage && (
              <Text
                style={[styles.duplicateMessage, { color: colors.semantic.warning.dark }]}
                testID="duplicate-time-slot-message"
              >
                {duplicateMessage}
              </Text>
            )}
          </View>
        )}

        {/* Next Notification Preview */}
        {isEnabled && nextNotificationTime && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
              {t('notifications.nextNotification')}
            </Text>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <View style={styles.previewItem} testID="next-notification-preview">
                <Text style={styles.previewIcon}>📅</Text>
                <View style={styles.previewInfo}>
                  <Text
                    style={[styles.previewText, { color: colors.text.primary }]}
                    testID="next-notification-time"
                  >
                    {formatNextNotificationDate(nextNotificationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          {t('notifications.settingsDescription')}
        </Text>

        {/* Frequency Selection Modal */}
        <Modal
          visible={showFrequencyModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFrequencyModal(false)}
          testID="frequency-modal"
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface.card }]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border.subtle },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {t('notifications.frequency')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFrequencyModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  testID="close-frequency-modal"
                >
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
                  accessibilityRole="radio"
                  accessibilityState={{ selected: frequency === option.value }}
                  testID={`frequency-option-${option.value}`}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text.primary }]}>
                    {t(option.labelKey)}
                  </Text>
                  {frequency === option.value && (
                    <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>
                      ✓
                    </Text>
                  )}
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
          <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface.card }]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border.subtle },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setShowTimeModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  testID="cancel-time-modal"
                >
                  <Text style={[styles.modalCancel, { color: colors.interactive.primary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {t('notifications.selectTime')}
                </Text>
                <TouchableOpacity
                  onPress={handleTimeConfirm}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.done')}
                  testID="confirm-time-modal"
                >
                  <Text style={[styles.modalDone, { color: colors.interactive.primary }]}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.timePickerContainer}>
                {/* Hour Picker */}
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeColumnLabel, { color: colors.text.tertiary }]}>
                    Hour
                  </Text>
                  <FlatList
                    data={HOUR_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.timeOption,
                          selectedHour === item.value && [
                            styles.timeOptionSelected,
                            { backgroundColor: colors.interactive.primary },
                          ],
                        ]}
                        onPress={() => setSelectedHour(item.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedHour === item.value }}
                        testID={`hour-option-${item.value}`}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: colors.text.primary },
                            selectedHour === item.value && {
                              color: colors.text.inverse,
                              fontWeight: '600',
                            },
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
                  <Text style={[styles.timeColumnLabel, { color: colors.text.tertiary }]}>
                    Minute
                  </Text>
                  <FlatList
                    data={MINUTE_OPTIONS}
                    keyExtractor={(item) => item.value.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.timeOption,
                          selectedMinute === item.value && [
                            styles.timeOptionSelected,
                            { backgroundColor: colors.interactive.primary },
                          ],
                        ]}
                        onPress={() => setSelectedMinute(item.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedMinute === item.value }}
                        testID={`minute-option-${item.value}`}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            { color: colors.text.primary },
                            selectedMinute === item.value && {
                              color: colors.text.inverse,
                              fontWeight: '600',
                            },
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

              <View
                style={[
                  styles.selectedTimePreview,
                  { borderTopColor: colors.border.subtle },
                ]}
              >
                <Text style={[styles.selectedTimeText, { color: colors.interactive.primary }]}>
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
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.lg,
  },
  // Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  permissionBannerIcon: {
    fontSize: spacing.xl,
    marginRight: spacing.md,
  },
  permissionBannerContent: {
    flex: 1,
  },
  permissionBannerText: {
    fontSize: typography.caption.fontSize + 1,
    lineHeight: spacing.lg,
    marginBottom: spacing.md,
  },
  openSettingsButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  openSettingsButtonText: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
  },
  // Sections
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
  // Toggle Item
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  toggleIcon: {
    fontSize: spacing.xl,
    marginRight: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  toggleStatus: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  // Frequency Item
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
  // Preview Item
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  previewIcon: {
    fontSize: spacing.lg,
    marginRight: spacing.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewText: {
    fontSize: typography.body.fontSize,
  },
  // Hint
  hint: {
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.sm,
  },
  // Duplicate message
  duplicateMessage: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.sm,
    marginHorizontal: spacing.base,
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
  modalCancel: {
    fontSize: typography.body.fontSize + 1,
  },
  modalDone: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
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
  // Time Picker
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.base,
  },
  timeColumn: {
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  timeColumnLabel: {
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.sm,
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
    borderRadius: borderRadius.sm,
  },
  timeOptionSelected: {},
  timeOptionText: {
    fontSize: spacing.lg,
  },
  selectedTimePreview: {
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectedTimeText: {
    fontSize: spacing['2xl'],
    fontWeight: '600',
  },
});
