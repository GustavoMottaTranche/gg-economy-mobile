/**
 * TimeSlotSection Component
 *
 * Container for the time slot list, add button, and max-reached message.
 * Renders when the notification frequency is set to "multipleDaily".
 * Includes a time picker modal for adding new time slots.
 *
 * **Validates: Requirements 5.4, 5.5, 5.6, 5.7, 1.6**
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { type TimeSlot, timeSlotKey } from '../../stores/notificationStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { TimeSlotListItem } from './TimeSlotListItem';

/** Maximum number of time slots allowed */
const MAX_SLOTS = 5;

/** Available minute options for the time picker */
const MINUTE_OPTIONS = [
  { value: 0, label: '00' },
  { value: 15, label: '15' },
  { value: 30, label: '30' },
  { value: 45, label: '45' },
];

/** Available hour options for the time picker (0-23) */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export interface TimeSlotSectionProps {
  /** Current list of configured time slots */
  timeSlots: TimeSlot[];
  /** Callback when a new time slot is confirmed */
  onAddSlot: (slot: TimeSlot) => void;
  /** Callback when a time slot is removed */
  onRemoveSlot: (key: string) => void;
  /** Callback when a time slot is edited (oldKey, newSlot) */
  onEditSlot?: (oldKey: string, newSlot: TimeSlot) => void;
  /** Whether the section controls are disabled */
  disabled: boolean;
}

/**
 * Renders the time slot management section with a sorted list of slots,
 * an add button (when under max), and a max-reached message (when at max).
 */
export function TimeSlotSection({
  timeSlots,
  onAddSlot,
  onRemoveSlot,
  onEditSlot,
  disabled,
}: TimeSlotSectionProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [editingSlotKey, setEditingSlotKey] = useState<string | null>(null);

  // Sort time slots chronologically for display (store maintains order, but sort for safety)
  const sortedSlots = [...timeSlots].sort((a, b) => {
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });

  const isAtMax = timeSlots.length >= MAX_SLOTS;
  const canDelete = timeSlots.length > 1;

  const handleAddPress = useCallback(() => {
    setEditingSlotKey(null);
    setSelectedHour(9);
    setSelectedMinute(0);
    setShowTimePicker(true);
  }, []);

  const handleEditPress = useCallback((slot: TimeSlot) => {
    if (disabled) return;
    setEditingSlotKey(timeSlotKey(slot));
    setSelectedHour(slot.hour);
    setSelectedMinute(slot.minute);
    setShowTimePicker(true);
  }, [disabled]);

  const handleTimeConfirm = useCallback(() => {
    if (editingSlotKey && onEditSlot) {
      onEditSlot(editingSlotKey, { hour: selectedHour, minute: selectedMinute });
    } else {
      onAddSlot({ hour: selectedHour, minute: selectedMinute });
    }
    setEditingSlotKey(null);
    setShowTimePicker(false);
  }, [onAddSlot, onEditSlot, editingSlotKey, selectedHour, selectedMinute]);

  const handleTimeCancel = useCallback(() => {
    setEditingSlotKey(null);
    setShowTimePicker(false);
  }, []);

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <View testID="time-slot-section">
      {/* Time Slot List */}
      <View
        style={[
          styles.listContainer,
          {
            backgroundColor: colors.surface.card,
            borderColor: colors.border.default,
          },
        ]}
      >
        {sortedSlots.map((slot) => (
          <TimeSlotListItem
            key={timeSlotKey(slot)}
            slot={slot}
            canDelete={canDelete && !disabled}
            onDelete={onRemoveSlot}
            onEdit={!disabled ? handleEditPress : undefined}
          />
        ))}

        {/* Add Time Slot Button */}
        {!isAtMax && (
          <TouchableOpacity
            style={[
              styles.addButton,
              disabled && styles.disabledOpacity,
            ]}
            onPress={handleAddPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.addTimeSlot')}
            accessibilityState={{ disabled }}
            testID="add-time-slot-button"
          >
            <Text style={[styles.addIcon, { color: colors.interactive.primary }]}>+</Text>
            <Text style={[styles.addText, { color: colors.interactive.primary }]}>
              {t('notifications.addTimeSlot')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Max Reached Message */}
        {isAtMax && (
          <View style={styles.maxReachedContainer} testID="max-slots-message">
            <Text style={[styles.maxReachedText, { color: colors.text.tertiary }]}>
              {t('notifications.maxTimeSlotsReached')}
            </Text>
          </View>
        )}
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        animationType="slide"
        transparent
        onRequestClose={handleTimeCancel}
        testID="time-slot-picker-modal"
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}
            >
              <TouchableOpacity
                onPress={handleTimeCancel}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                testID="cancel-slot-time-modal"
              >
                <Text style={[styles.modalCancel, { color: colors.interactive.primary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {editingSlotKey ? t('notifications.editTime') : t('notifications.selectTime')}
              </Text>
              <TouchableOpacity
                onPress={handleTimeConfirm}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
                testID="confirm-slot-time-modal"
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
                  {t('notifications.hour')}
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
                      testID={`slot-hour-option-${item.value}`}
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
                  {t('notifications.minute')}
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
                      testID={`slot-minute-option-${item.value}`}
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
              style={[styles.selectedTimePreview, { borderTopColor: colors.border.subtle }]}
            >
              <Text style={[styles.selectedTimeText, { color: colors.interactive.primary }]}>
                {formatTime(selectedHour, selectedMinute)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  addIcon: {
    fontSize: spacing.xl,
    fontWeight: '500',
    marginRight: spacing.md,
  },
  addText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  disabledOpacity: {
    opacity: 0.4,
  },
  maxReachedContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  maxReachedText: {
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
  },
  // Modal styles (matching existing notification settings screen pattern)
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
  modalCancel: {
    fontSize: typography.body.fontSize + 1,
  },
  modalDone: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
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
