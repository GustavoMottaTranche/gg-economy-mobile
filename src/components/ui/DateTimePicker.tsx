/**
 * DateTimePicker Component
 *
 * A combined date and time picker component that uses @react-native-community/datetimepicker
 * for native date and time selection. Supports locale-aware formatting.
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

/**
 * Props for the DateTimePicker component
 */
export interface DateTimePickerProps {
  /** Currently selected date+time */
  value: Date;
  /** Callback when date or time is changed */
  onChange: (date: Date) => void;
  /** Locale string for formatting (e.g., 'pt-BR', 'en') */
  locale: string;
  /** Label text displayed above the picker */
  label?: string;
  /** Minimum selectable date */
  minimumDate?: Date;
  /** Maximum selectable date */
  maximumDate?: Date;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom label style */
  labelStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Formats a Date object according to the specified locale pattern.
 *
 * - pt-BR: "dd/MM/yyyy HH:mm"
 * - en: "MM/dd/yyyy hh:mm a"
 *
 * @param date - Date to format
 * @param locale - Locale string
 * @returns Formatted date+time string
 */
export function formatDateTimeForLocale(date: Date, locale: string): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (locale === 'pt-BR') {
    const hh = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${minutes}`;
  }

  // en format: MM/dd/yyyy hh:mm a
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const hh12 = String(hours12).padStart(2, '0');
  return `${month}/${day}/${year} ${hh12}:${minutes} ${period}`;
}

/**
 * DateTimePicker component for selecting both date and time.
 *
 * Uses @react-native-community/datetimepicker for native pickers on both platforms.
 * On Android, shows date picker first, then time picker sequentially.
 * On iOS, shows a combined datetime picker.
 *
 * @example
 * ```tsx
 * <DateTimePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   locale="pt-BR"
 *   label="Data da Compra"
 * />
 * ```
 */
function DateTimePickerComponent({
  value,
  onChange,
  locale,
  label,
  minimumDate,
  maximumDate,
  disabled = false,
  error,
  style,
  labelStyle,
  testID,
}: DateTimePickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Temporary date used during Android two-step flow (date then time)
  const [tempDate, setTempDate] = useState<Date>(value);

  const formattedDateTime = formatDateTimeForLocale(value, locale);

  const handlePress = useCallback(() => {
    if (!disabled) {
      setTempDate(value);
      setShowDatePicker(true);
    }
  }, [disabled, value]);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);

        if (event.type === 'dismissed') {
          return;
        }

        if (selectedDate) {
          // Store the selected date and show time picker
          setTempDate(selectedDate);
          setShowTimePicker(true);
        }
      } else {
        // iOS: combined datetime picker
        if (selectedDate) {
          onChange(selectedDate);
        }
      }
    },
    [onChange]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowTimePicker(false);

        if (event.type === 'dismissed') {
          // User dismissed time picker, still apply the date change
          onChange(tempDate);
          return;
        }

        if (selectedDate) {
          // Combine the date from step 1 with the time from step 2
          const combined = new Date(tempDate);
          combined.setHours(selectedDate.getHours());
          combined.setMinutes(selectedDate.getMinutes());
          combined.setSeconds(0);
          combined.setMilliseconds(0);
          onChange(combined);
        }
      }
    },
    [onChange, tempDate]
  );

  const handleIOSConfirm = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const accessibilityLabel = [label, formattedDateTime, error].filter(Boolean).join(', ');

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label && (
        <Text style={[styles.label, { color: colors.text.primary }, labelStyle]}>{label}</Text>
      )}

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface.card, borderColor: colors.border.strong },
          disabled && {
            backgroundColor: colors.background.tertiary,
            borderColor: colors.border.default,
          },
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
            disabled && { color: colors.text.tertiary },
          ]}
          numberOfLines={1}
        >
          {formattedDateTime}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {error && (
        <Text
          style={[styles.errorText, { color: colors.semantic.danger.base }]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      {/* Date Picker (Android: date only, iOS: datetime) */}
      {showDatePicker && (
        <View>
          <DateTimePickerNative
            value={value}
            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale={locale}
            testID={testID ? `${testID}-date-picker` : undefined}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleIOSConfirm}
              style={[styles.confirmButton, { borderTopColor: colors.border.default }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.confirm') || 'Confirm'}
              testID={testID ? `${testID}-confirm` : undefined}
            >
              <Text style={[styles.confirmButtonText, { color: colors.interactive.primary }]}>
                {t('common.confirm') || 'OK'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Time Picker (Android only - second step) */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePickerNative
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          locale={locale}
          testID={testID ? `${testID}-time-picker` : undefined}
        />
      )}
    </View>
  );
}

/**
 * Styles for DateTimePicker
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
  confirmButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  confirmButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

/**
 * Memoized DateTimePicker for performance optimization
 */
export const DateTimePicker = memo(DateTimePickerComponent);

export default DateTimePicker;
