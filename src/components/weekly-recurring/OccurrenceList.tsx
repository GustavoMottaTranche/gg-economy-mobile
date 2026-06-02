/**
 * OccurrenceList Component
 *
 * Displays a chronologically ordered list of weekly occurrences for a group.
 * Each item shows the date, amount (formatted as currency), and an indicator
 * when the occurrence value was manually edited.
 * Optionally shows payment status toggles for each occurrence.
 *
 * **Validates: Requirements 3.1, 3.6, 6.1, 6.2**
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing } from '../../constants/theme';
import { OccurrenceStatusToggle } from '../ui/OccurrenceStatusToggle';
import type { WeeklyOccurrence } from '../../types/weeklyRecurring';

/**
 * Props for the OccurrenceList component
 */
export interface OccurrenceListProps {
  /** List of occurrences already sorted by date (chronological) */
  occurrences: WeeklyOccurrence[];
  /** Callback when user taps an occurrence to edit it */
  onEdit: (occurrence: WeeklyOccurrence) => void;
  /** Callback when user toggles payment status of an occurrence */
  onStatusToggle?: (occurrenceId: string) => void;
  /** Whether to show the payment status toggle for each occurrence */
  showStatusToggle?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Formats a date string (YYYY-MM-DD) into a locale-friendly short format.
 * For pt-BR: "15/01/2024", for en: "01/15/2024"
 */
function formatOccurrenceDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * OccurrenceList component
 *
 * Renders a FlatList of weekly occurrences for a specific group.
 * Each item is pressable and triggers the onEdit callback.
 * Items display date, formatted currency amount, an edited indicator badge,
 * and optionally a payment status toggle.
 *
 * @example
 * ```tsx
 * <OccurrenceList
 *   occurrences={groupOccurrences}
 *   onEdit={(occ) => openEditModal(occ)}
 *   onStatusToggle={(id) => handleToggle(id)}
 *   showStatusToggle
 *   testID="occurrence-list"
 * />
 * ```
 */
function OccurrenceListComponent({
  occurrences,
  onEdit,
  onStatusToggle,
  showStatusToggle = false,
  testID,
}: OccurrenceListProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing['2xl'],
        },
        emptyText: {
          fontSize: 14,
          color: colors.text.tertiary,
          fontStyle: 'italic',
        },
        itemContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        itemLeft: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        },
        toggleContainer: {
          marginRight: spacing.md,
        },
        dateText: {
          fontSize: 14,
          fontWeight: '400',
          color: colors.text.primary,
        },
        dateTextPaid: {
          color: colors.text.tertiary,
          textDecorationLine: 'line-through',
        },
        editedBadge: {
          marginLeft: spacing.sm,
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: colors.semantic.warning.light,
        },
        editedBadgeText: {
          fontSize: 10,
          fontWeight: '600',
          color: colors.semantic.warning.dark,
        },
        amountText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.primary,
        },
        amountTextPaid: {
          color: colors.text.tertiary,
        },
      }),
    [colors]
  );

  const keyExtractor = useCallback((item: WeeklyOccurrence) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: WeeklyOccurrence }) => {
      const formattedDate = formatOccurrenceDate(item.date);
      const formattedAmount = formatCurrencyLocale(item.amount, locale);
      const isPaid = item.isPaid ?? false;

      return (
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => onEdit(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('weeklyRecurring.occurrenceItem', {
            date: formattedDate,
            amount: formattedAmount,
            defaultValue: `Ocorrência ${formattedDate}, ${formattedAmount}`,
          })}
          testID={`${testID}-item-${item.id}`}
        >
          {showStatusToggle && onStatusToggle && (
            <View style={styles.toggleContainer}>
              <OccurrenceStatusToggle
                isPaid={isPaid}
                onToggle={() => onStatusToggle(item.id)}
                size="small"
                testID={`${testID}-toggle-${item.id}`}
              />
            </View>
          )}
          <View style={styles.itemLeft}>
            <Text style={[styles.dateText, showStatusToggle && isPaid && styles.dateTextPaid]}>
              {formattedDate}
            </Text>
            {item.isValueEdited && (
              <View style={styles.editedBadge} testID={`${testID}-edited-${item.id}`}>
                <Text style={styles.editedBadgeText}>
                  {t('weeklyRecurring.edited', { defaultValue: 'Editado' })}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.amountText, showStatusToggle && isPaid && styles.amountTextPaid]}>
            {formattedAmount}
          </Text>
        </TouchableOpacity>
      );
    },
    [styles, locale, onEdit, onStatusToggle, showStatusToggle, t, testID]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Text style={styles.emptyText}>
          {t('weeklyRecurring.noOccurrences', {
            defaultValue: 'Nenhuma ocorrência encontrada',
          })}
        </Text>
      </View>
    ),
    [styles, t, testID]
  );

  return (
    <FlatList
      data={occurrences}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      style={styles.container}
      testID={testID}
    />
  );
}

/**
 * Memoized OccurrenceList for performance optimization
 */
export const OccurrenceList = memo(OccurrenceListComponent);

export default OccurrenceList;
