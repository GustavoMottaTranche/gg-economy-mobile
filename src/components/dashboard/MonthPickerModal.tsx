/**
 * MonthPickerModal Component
 *
 * A modal that displays a grid of months allowing the user to quickly jump
 * to any month without navigating one by one. Supports year navigation.
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMonthName, getCurrentLocale } from '../../i18n';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

/**
 * Props for the MonthPickerModal component
 */
export interface MonthPickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Currently selected month in YYYY-MM format */
  selectedMonth: string;
  /** Callback when a month is selected */
  onSelectMonth: (month: string) => void;
  /** Callback when the modal is dismissed */
  onClose: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Parses a YYYY-MM string into year and month number
 */
function parseYearMonth(monthStr: string): { year: number; month: number } {
  const parts = monthStr.split('-').map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    month: parts[1] ?? 1,
  };
}

/**
 * Formats year and month into YYYY-MM string
 */
function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * MonthPickerModal component
 */
function MonthPickerModalComponent({
  visible,
  selectedMonth,
  onSelectMonth,
  onClose,
  testID,
}: MonthPickerModalProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const { year: selectedYear, month: selectedMonthNum } = parseYearMonth(selectedMonth);

  // Local state for the displayed year (allows navigating years independently)
  const [displayYear, setDisplayYear] = useState(selectedYear);

  // Reset display year when modal opens with a new month
  React.useEffect(() => {
    if (visible) {
      setDisplayYear(selectedYear);
    }
  }, [visible, selectedYear]);

  const handlePreviousYear = useCallback(() => {
    setDisplayYear((prev) => prev - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setDisplayYear((prev) => prev + 1);
  }, []);

  const handleSelectMonth = useCallback(
    (monthNum: number) => {
      const newMonth = formatYearMonth(displayYear, monthNum);
      onSelectMonth(newMonth);
      onClose();
    },
    [displayYear, onSelectMonth, onClose]
  );

  // Generate month names for the grid
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const name = getMonthName(i, locale, 'short');
      // Capitalize first letter
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
  }, [locale]);

  // Check if a month cell is the currently selected one
  const isSelected = useCallback(
    (monthNum: number) => {
      return displayYear === selectedYear && monthNum === selectedMonthNum;
    },
    [displayYear, selectedYear, selectedMonthNum]
  );

  // Check if a month is the current month (today)
  const currentDate = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const isCurrent = useCallback(
    (monthNum: number) => {
      return displayYear === currentDate.year && monthNum === currentDate.month;
    },
    [displayYear, currentDate]
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        container: {
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          width: '100%',
          maxWidth: 340,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        yearNav: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.base,
          paddingHorizontal: spacing.sm,
        },
        yearButton: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
        },
        yearButtonText: {
          fontSize: 24,
          fontWeight: '300',
          color: colors.text.primary,
        },
        yearText: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text.primary,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        },
        monthCell: {
          width: '30%',
          paddingVertical: spacing.md,
          marginBottom: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.md,
        },
        monthCellSelected: {
          backgroundColor: colors.interactive.primary,
        },
        monthCellCurrent: {
          borderWidth: 1.5,
          borderColor: colors.interactive.primary,
        },
        monthText: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.text.primary,
        },
        monthTextSelected: {
          color: colors.text.inverse,
          fontWeight: '700',
        },
        monthTextCurrent: {
          color: colors.interactive.primary,
          fontWeight: '600',
        },
        closeButton: {
          marginTop: spacing.base,
          paddingVertical: spacing.sm,
          alignItems: 'center',
          borderRadius: borderRadius.md,
          backgroundColor: colors.background.secondary,
        },
        closeButtonText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.secondary,
        },
      }),
    [colors]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={dynamicStyles.overlay} onPress={onClose}>
        <Pressable
          style={dynamicStyles.container}
          onPress={() => {}}
          testID={`${testID}-container`}
        >
          {/* Year Navigation */}
          <View style={dynamicStyles.yearNav}>
            <TouchableOpacity
              style={dynamicStyles.yearButton}
              onPress={handlePreviousYear}
              accessibilityRole="button"
              accessibilityLabel={t('common.previous')}
              testID={`${testID}-prev-year`}
            >
              <Text style={dynamicStyles.yearButtonText}>‹</Text>
            </TouchableOpacity>

            <Text
              style={dynamicStyles.yearText}
              accessibilityRole="header"
              testID={`${testID}-year`}
            >
              {displayYear}
            </Text>

            <TouchableOpacity
              style={dynamicStyles.yearButton}
              onPress={handleNextYear}
              accessibilityRole="button"
              accessibilityLabel={t('common.next')}
              testID={`${testID}-next-year`}
            >
              <Text style={dynamicStyles.yearButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Month Grid */}
          <View style={dynamicStyles.grid} testID={`${testID}-grid`}>
            {months.map((name, index) => {
              const monthNum = index + 1;
              const selected = isSelected(monthNum);
              const current = isCurrent(monthNum);

              return (
                <TouchableOpacity
                  key={monthNum}
                  style={[
                    dynamicStyles.monthCell,
                    selected && dynamicStyles.monthCellSelected,
                    !selected && current && dynamicStyles.monthCellCurrent,
                  ]}
                  onPress={() => handleSelectMonth(monthNum)}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} ${displayYear}`}
                  accessibilityState={{ selected }}
                  testID={`${testID}-month-${monthNum}`}
                >
                  <Text
                    style={[
                      dynamicStyles.monthText,
                      selected && dynamicStyles.monthTextSelected,
                      !selected && current && dynamicStyles.monthTextCurrent,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={dynamicStyles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            testID={`${testID}-close`}
          >
            <Text style={dynamicStyles.closeButtonText}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Memoized MonthPickerModal for performance optimization
 */
export const MonthPickerModal = memo(MonthPickerModalComponent);

export default MonthPickerModal;
