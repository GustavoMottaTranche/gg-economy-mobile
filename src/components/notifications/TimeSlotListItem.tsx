/**
 * TimeSlotListItem Component
 *
 * Renders a single time slot entry showing the formatted time in HH:MM 24-hour format
 * with an optional delete button. Used within the TimeSlotSection when the notification
 * frequency is set to "multipleDaily".
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type TimeSlot, timeSlotKey } from '../../stores/notificationStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography } from '../../constants/theme';

export interface TimeSlotListItemProps {
  /** The time slot to display */
  slot: TimeSlot;
  /** Whether the delete button should be shown */
  canDelete: boolean;
  /** Callback when the delete button is pressed */
  onDelete: (key: string) => void;
  /** Callback when the item is tapped for editing */
  onEdit?: (slot: TimeSlot) => void;
}

/**
 * Displays a time slot as a list item with formatted HH:MM time and conditional delete action.
 * Tapping the item triggers the onEdit callback to allow changing the time.
 */
export function TimeSlotListItem({ slot, canDelete, onDelete, onEdit }: TimeSlotListItemProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const key = timeSlotKey(slot);

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border.subtle }]}
      testID={`time-slot-item-${key}`}
      onPress={() => onEdit?.(slot)}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.editTimeSlot', { time: key })}
      activeOpacity={onEdit ? 0.6 : 1}
    >
      <Text style={styles.icon}>🕐</Text>
      <Text
        style={[styles.timeText, { color: colors.text.primary }]}
        testID={`time-slot-time-${key}`}
      >
        {key}
      </Text>
      {canDelete && (
        <TouchableOpacity
          onPress={() => onDelete(key)}
          style={[styles.deleteButton, { backgroundColor: colors.semantic.danger.light }]}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.removeTimeSlot', { time: key })}
          testID={`time-slot-delete-${key}`}
        >
          <Text style={[styles.deleteText, { color: colors.semantic.danger.base }]}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: spacing.lg,
    marginRight: spacing.md,
  },
  timeText: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});
