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
}: CalendarPickerProps): JSX.Element {
  const { t } = useTranslation();
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
    <View style={calendarStyles.container}>
      {/* Header */}
      <View style={calendarStyles.header}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={calendarStyles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.previous')}
        >
          <Text style={calendarStyles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={calendarStyles.monthYear}>
          {monthName} {year}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={calendarStyles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.next')}
        >
          <Text style={calendarStyles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={calendarStyles.weekdayRow}>
        {weekdays.map((day, index) => (
          <View key={index} style={calendarStyles.weekdayCell}>
            <Text style={calendarStyles.weekdayText}>{day}</Text>
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
                  isSelectedDay(day) && calendarStyles.selectedDay,
                  isToday(day) && !isSelectedDay(day) && calendarStyles.todayDay,
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
                    isSelectedDay(day) && calendarStyles.selectedDayText,
                    isToday(day) && !isSelectedDay(day) && calendarStyles.todayDayText,
                    isDateDisabled(day) && calendarStyles.disabledDayText,
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
        style={calendarStyles.todayButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.today')}
      >
        <Text style={calendarStyles.todayButtonText}>{t('common.today')}</Text>
      </TouchableOpacity>
    </View>
  );
});

/**
 * Calendar styles
 */
const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 16,
    color: '#3b82f6',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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
    color: '#111827',
  },
  selectedDay: {
    backgroundColor: '#3b82f6',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  todayDayText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#9ca3af',
  },
  todayButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  todayButtonText: {
    fontSize: 16,
    color: '#3b82f6',
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
}: DatePickerProps): JSX.Element {
  const { t } = useTranslation();
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
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.inputContainer,
          disabled && styles.inputDisabled,
          error && styles.inputError,
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
            !value && styles.placeholder,
            disabled && styles.valueDisabled,
            valueStyle,
          ]}
          numberOfLines={1}
        >
          {formattedDate}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('manual.selectDate')}</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Text style={styles.closeButtonText}>{t('common.close')}</Text>
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  valueDisabled: {
    color: '#9ca3af',
  },
  icon: {
    fontSize: 18,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

/**
 * Memoized DatePicker for performance optimization
 */
export const DatePicker = memo(DatePickerComponent);

export default DatePicker;
