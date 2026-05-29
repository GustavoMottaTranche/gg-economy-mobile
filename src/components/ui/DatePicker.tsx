/**
 * DatePicker Component
 *
 * A date picker component that uses native date picker functionality.
 * Supports locale-aware date formatting and accessibility.
 *
 * **Validates: Requirements 30**
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDateLocale, getCurrentLocale, type DateStyle } from '../../i18n';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

/**
 * Props for the DatePicker component
 */
export interface DatePickerProps {
  /** Currently selected date */
  value: Date;
  /** Callback when date is changed */
  onChange: (date: Date) => void;
  /** Minimum selectable date */
  minimumDate?: Date;
  /** Maximum selectable date */
  maximumDate?: Date;
  /** Date display style */
  dateStyle?: DateStyle;
  /** Label text */
  label?: string;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom label style */
  labelStyle?: TextStyle;
  /** Custom value style */
  valueStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Simple calendar picker component for selecting dates
 */
interface CalendarPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  onClose: () => void;
}

/**
 * Calendar month view component
 */
const CalendarPicker = memo(function CalendarPicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  onClose,
}: CalendarPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const [viewDate, setViewDate] = useState(value);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Generate calendar days
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Get month name using Intl
  const monthNames =
    locale === 'pt-BR'
      ? [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro',
        ]
      : [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
  const monthName = monthNames[month];

  const goToPreviousMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const selectDay = (day: number) => {
    const selectedDate = new Date(year, month, day);
    onChange(selectedDate);
    onClose();
  };

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(year, month, day);
    if (minimumDate && date < minimumDate) return true;
    if (maximumDate && date > maximumDate) return true;
    return false;
  };

  const isSelectedDay = (day: number): boolean => {
    return value.getFullYear() === year && value.getMonth() === month && value.getDate() === day;
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  // Weekday headers
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  if (locale === 'pt-BR') {
    weekdays.splice(0, 7, 'D', 'S', 'T', 'Q', 'Q', 'S', 'S');
  }

  return (
    <View style={[calendarStyles.container, { backgroundColor: colors.surface.card }]}>
      {/* Header */}
      <View style={calendarStyles.header}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={calendarStyles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.previous')}
        >
          <Text style={[calendarStyles.navButtonText, { color: colors.interactive.primary }]}>◀</Text>
        </TouchableOpacity>
        <Text style={[calendarStyles.monthYear, { color: colors.text.primary }]}>
          {monthName} {year}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={calendarStyles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.next')}
        >
          <Text style={[calendarStyles.navButtonText, { color: colors.interactive.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={calendarStyles.weekdayRow}>
        {weekdays.map((day, index) => (
          <View key={index} style={calendarStyles.weekdayCell}>
            <Text style={[calendarStyles.weekdayText, { color: colors.text.secondary }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={calendarStyles.grid}>
        {days.map((day, index) => (
          <View key={index} style={calendarStyles.dayCell}>
            {day !== null && (
              <TouchableOpacity
                onPress={() => selectDay(day)}
                disabled={isDateDisabled(day)}
                style={[
                  calendarStyles.dayButton,
                  isSelectedDay(day) && { backgroundColor: colors.interactive.primary },
                  isToday(day) && !isSelectedDay(day) && { borderWidth: 1, borderColor: colors.interactive.primary },
                  isDateDisabled(day) && calendarStyles.disabledDay,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${day}`}
                accessibilityState={{
                  selected: isSelectedDay(day),
                  disabled: isDateDisabled(day),
                }}
              >
                <Text
                  style={[
                    calendarStyles.dayText,
                    { color: colors.text.primary },
                    isSelectedDay(day) && { color: colors.text.inverse, fontWeight: '600' },
                    isToday(day) && !isSelectedDay(day) && { color: colors.interactive.primary, fontWeight: '600' },
                    isDateDisabled(day) && { color: colors.text.tertiary },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Today button */}
      <TouchableOpacity
        onPress={() => {
          const today = new Date();
          onChange(today);
          onClose();
        }}
        style={[calendarStyles.todayButton, { borderTopColor: colors.border.default }]}
        accessibilityRole="button"
        accessibilityLabel={t('common.today')}
      >
        <Text style={[calendarStyles.todayButtonText, { color: colors.interactive.primary }]}>{t('common.today')}</Text>
      </TouchableOpacity>
    </View>
  );
});

/**
 * Calendar styles
 */
const calendarStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.base,
    width: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  navButton: {
    padding: spacing.sm,
  },
  navButtonText: {
    fontSize: typography.body.fontSize,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
  },
  disabledDay: {
    opacity: 0.3,
  },
  todayButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  todayButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

/**
 * DatePicker component
 *
 * @example
 * ```tsx
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   label="Transaction Date"
 *   maximumDate={new Date()}
 * />
 * ```
 */
function DatePickerComponent({
  value,
  onChange,
  minimumDate,
  maximumDate,
  dateStyle = 'medium',
  label,
  placeholder,
  disabled = false,
  error,
  style,
  labelStyle,
  valueStyle,
  testID,
}: DatePickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const formattedDate = value
    ? formatDateLocale(value, locale, { dateStyle })
    : placeholder || t('manual.selectDate');

  const handlePress = useCallback(() => {
    if (!disabled) {
      setIsPickerVisible(true);
    }
  }, [disabled]);

  const handleDateChange = useCallback(
    (date: Date) => {
      onChange(date);
    },
    [onChange]
  );

  const handleClose = useCallback(() => {
    setIsPickerVisible(false);
  }, []);

  const accessibilityLabel = [label, formattedDate, error].filter(Boolean).join(', ');

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label && <Text style={[styles.label, { color: colors.text.primary }, labelStyle]}>{label}</Text>}

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface.card, borderColor: colors.border.strong },
          disabled && { backgroundColor: colors.background.tertiary, borderColor: colors.border.default },
          error && { borderColor: colors.semantic.danger.base },
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('manual.selectDate')}
        accessibilityState={{ disabled }}
        testID={testID ? `${testID}-button` : undefined}
      >
        <Text
          style={[
            styles.value,
            { color: colors.text.primary },
            !value && { color: colors.text.tertiary },
            disabled && { color: colors.text.tertiary },
            valueStyle,
          ]}
          numberOfLines={1}
        >
          {formattedDate}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.semantic.danger.base }]} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        testID={testID ? `${testID}-modal` : undefined}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} activeOpacity={1} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface.card },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('manual.selectDate')}</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Text style={[styles.closeButtonText, { color: colors.interactive.primary }]}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <CalendarPicker
              value={value || new Date()}
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onClose={handleClose}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/**
 * Styles for DatePicker
 */
const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  value: {
    flex: 1,
    fontSize: typography.body.fontSize,
  },
  icon: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

/**
 * Memoized DatePicker for performance optimization
 */
export const DatePicker = memo(DatePickerComponent);

export default DatePicker;
