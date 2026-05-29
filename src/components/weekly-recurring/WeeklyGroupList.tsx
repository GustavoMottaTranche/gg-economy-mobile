/**
 * WeeklyGroupList Component
 *
 * Displays all active weekly recurring groups in a FlatList.
 * Each item shows title, formatted amount (R$ X.XX), day of week name (Portuguese),
 * and category name. Provides edit and delete action buttons on each item.
 *
 * **Validates: Requirements 4.1, 5.1**
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, typography } from '../../constants/theme';
import type { WeeklyRecurringGroup } from '../../types/weeklyRecurring';

/**
 * Day of week abbreviations in Portuguese.
 * Index 0 = Sunday (Dom), 6 = Saturday (Sáb).
 */
const DAY_OF_WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/**
 * Props for the WeeklyGroupList component
 */
export interface WeeklyGroupListProps {
  /** Array of active weekly recurring groups to display */
  groups: WeeklyRecurringGroup[];
  /** Callback when the edit button is pressed for a group */
  onEdit: (group: WeeklyRecurringGroup) => void;
  /** Callback when the delete button is pressed for a group */
  onDelete: (group: WeeklyRecurringGroup) => void;
  /** Optional callback when a group item is pressed (e.g., navigate to occurrences) */
  onPress?: (group: WeeklyRecurringGroup) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * WeeklyGroupList component
 *
 * Renders a FlatList of weekly recurring groups with edit/delete actions.
 *
 * @example
 * ```tsx
 * <WeeklyGroupList
 *   groups={activeGroups}
 *   onEdit={(group) => navigateToEdit(group.id)}
 *   onDelete={(group) => confirmDelete(group)}
 *   onPress={(group) => navigateToOccurrences(group.id)}
 *   testID="weekly-group-list"
 * />
 * ```
 */
function WeeklyGroupListComponent({
  groups,
  onEdit,
  onDelete,
  onPress,
  testID,
}: WeeklyGroupListProps): React.ReactElement {
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
          justifyContent: 'center',
          paddingVertical: spacing['3xl'],
          paddingHorizontal: spacing.base,
        },
        emptyText: {
          fontSize: typography.body.fontSize,
          color: colors.text.tertiary,
          textAlign: 'center',
        },
        itemContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        itemContent: {
          flex: 1,
          marginRight: spacing.sm,
        },
        itemTitle: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.primary,
        },
        itemDetails: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.xs,
          gap: spacing.sm,
        },
        itemAmount: {
          fontSize: typography.caption.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
        },
        itemDayOfWeek: {
          fontSize: typography.caption.fontSize,
          color: colors.text.tertiary,
        },
        itemCategory: {
          fontSize: typography.caption.fontSize,
          color: colors.text.tertiary,
        },
        detailSeparator: {
          fontSize: typography.caption.fontSize,
          color: colors.text.tertiary,
        },
        actionsContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        editButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.semantic.primary.light,
        },
        editButtonText: {
          fontSize: typography.body.fontSize,
          color: colors.semantic.primary.base,
        },
        deleteButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.semantic.danger.light,
        },
        deleteButtonText: {
          fontSize: typography.body.fontSize,
          color: colors.semantic.danger.base,
        },
      }),
    [colors]
  );

  const renderItem = useCallback(
    ({ item }: { item: WeeklyRecurringGroup }) => {
      const formattedAmount = formatCurrencyLocale(item.amount, locale);
      const dayLabel = DAY_OF_WEEK_LABELS[item.dayOfWeek] ?? '';

      return (
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={onPress ? () => onPress(item) : undefined}
          activeOpacity={onPress ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${formattedAmount}, ${dayLabel}`}
          testID={`${testID}-item-${item.id}`}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.itemDetails}>
              <Text style={styles.itemAmount}>{formattedAmount}</Text>
              <Text style={styles.detailSeparator}>•</Text>
              <Text style={styles.itemDayOfWeek}>{dayLabel}</Text>
              <Text style={styles.detailSeparator}>•</Text>
              <Text style={styles.itemCategory} numberOfLines={1}>
                {item.categoryId}
              </Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={t('common.edit', { defaultValue: 'Editar' })}
              testID={`${testID}-edit-${item.id}`}
            >
              <Text style={styles.editButtonText}>✎</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete', { defaultValue: 'Excluir' })}
              testID={`${testID}-delete-${item.id}`}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, locale, onEdit, onDelete, onPress, testID, t]
  );

  const keyExtractor = useCallback((item: WeeklyRecurringGroup) => item.id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Text style={styles.emptyText}>
          {t('weeklyRecurring.noGroups', {
            defaultValue: 'Nenhum gasto semanal recorrente cadastrado',
          })}
        </Text>
      </View>
    ),
    [styles, testID, t]
  );

  return (
    <FlatList
      style={styles.container}
      data={groups}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      testID={testID}
    />
  );
}

/**
 * Memoized WeeklyGroupList for performance optimization
 */
export const WeeklyGroupList = memo(WeeklyGroupListComponent);

export default WeeklyGroupList;
