/**
 * PendingSection Component
 *
 * Displays a list of pending (unpaid) recurring occurrences on the Home screen.
 * Each item shows the group name, formatted amount, date, and an OccurrenceStatusToggle.
 * Tapping the toggle marks the item as paid; tapping the row navigates to the group detail.
 * The section is hidden (returns null) when the items list is empty.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OccurrenceStatusToggle } from '../ui/OccurrenceStatusToggle';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, formatDateLocale, getCurrentLocale } from '../../i18n';
import { spacing, borderRadius, shadows } from '../../constants/theme';
import { useThemeStore } from '../../stores/themeStore';
import type { PendingItem } from '../../types/paymentStatus';

/**
 * Props for the PendingSection component
 */
export interface PendingSectionProps {
  /** List of pending items to display */
  items: PendingItem[];
  /** Callback when the status toggle is tapped */
  onToggleStatus: (id: string, type: 'weekly' | 'monthly') => void;
  /** Callback when the item row (not the toggle) is tapped */
  onItemPress: (groupId: string, type: 'weekly' | 'monthly') => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Formats a date string (YYYY-MM-DD) into a short readable format (DD/MM).
 */
function formatShortDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return formatDateLocale(date, locale as 'pt-BR' | 'en', { dateStyle: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * PendingSection component
 *
 * Renders a section with a title and a list of pending items.
 * Returns null when items list is empty (hides the section).
 *
 * @example
 * ```tsx
 * <PendingSection
 *   items={pendingItems}
 *   onToggleStatus={(id, type) => store.togglePaymentStatus(id, type)}
 *   onItemPress={(groupId, type) => navigation.navigate('Entry', { groupId, type })}
 *   testID="pending-section"
 * />
 * ```
 */
function PendingSectionComponent({
  items,
  onToggleStatus,
  onItemPress,
  testID,
}: PendingSectionProps): React.ReactElement | null {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const locale = getCurrentLocale();
  const sectionShadow = shadows[resolvedScheme].sm;

  // Hide section when items list is empty (Requirement 4.3)
  if (items.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, sectionShadow]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={t('dashboard.pendingSection', { defaultValue: 'Contas pendentes' })}
    >
      {/* Section Title */}
      <Text
        style={[styles.title, { color: colors.text.primary }]}
        testID={testID ? `${testID}-title` : undefined}
      >
        {t('dashboard.pendingSection', { defaultValue: 'Contas pendentes' })}
      </Text>

      {/* Pending Items List */}
      <View style={styles.list} testID={testID ? `${testID}-list` : undefined}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const formattedAmount = formatCurrencyLocale(item.amount / 100, locale);
          const formattedDate = formatShortDate(item.date, locale);

          return (
            <PendingItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              formattedAmount={formattedAmount}
              formattedDate={formattedDate}
              isLast={isLast}
              onToggleStatus={onToggleStatus}
              onItemPress={onItemPress}
              borderColor={colors.border.subtle}
              textPrimaryColor={colors.text.primary}
              textSecondaryColor={colors.text.secondary}
              textTertiaryColor={colors.text.tertiary}
              testID={testID ? `${testID}-item-${item.id}` : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Props for the PendingItemRow sub-component
 */
interface PendingItemRowProps {
  item: PendingItem;
  formattedAmount: string;
  formattedDate: string;
  isLast: boolean;
  onToggleStatus: (id: string, type: 'weekly' | 'monthly') => void;
  onItemPress: (groupId: string, type: 'weekly' | 'monthly') => void;
  borderColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  textTertiaryColor: string;
  testID?: string;
}

/**
 * Individual pending item row with toggle and pressable area.
 */
const PendingItemRow = memo(function PendingItemRow({
  item,
  formattedAmount,
  formattedDate,
  isLast,
  onToggleStatus,
  onItemPress,
  borderColor,
  textPrimaryColor,
  textSecondaryColor,
  textTertiaryColor,
  testID,
}: PendingItemRowProps) {
  const handleToggle = useCallback(() => {
    onToggleStatus(item.id, item.type);
  }, [onToggleStatus, item.id, item.type]);

  const handlePress = useCallback(() => {
    onItemPress(item.groupId, item.type);
  }, [onItemPress, item.groupId, item.type]);

  return (
    <View
      style={[
        styles.itemContainer,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
      ]}
      testID={testID}
    >
      {/* Toggle (left side) */}
      <OccurrenceStatusToggle
        isPaid={false}
        onToggle={handleToggle}
        size="small"
        testID={testID ? `${testID}-toggle` : undefined}
      />

      {/* Pressable content area (Requirement 4.6) */}
      <TouchableOpacity
        style={styles.itemContent}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.groupName}, ${formattedAmount}, ${formattedDate}`}
        testID={testID ? `${testID}-pressable` : undefined}
      >
        <View style={styles.itemTextContainer}>
          <Text style={[styles.itemName, { color: textPrimaryColor }]} numberOfLines={1}>
            {item.groupName}
          </Text>
          <Text style={[styles.itemDate, { color: textTertiaryColor }]}>{formattedDate}</Text>
        </View>
        <Text style={[styles.itemAmount, { color: textSecondaryColor }]}>{formattedAmount}</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  list: {},
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: spacing.md,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * Memoized PendingSection for performance optimization
 */
export const PendingSection = memo(PendingSectionComponent);

export default PendingSection;
