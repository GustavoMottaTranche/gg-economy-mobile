/**
 * WeeklyGroupItem Component
 *
 * Collapsible row representing a weekly recurring expense group in the statement list.
 * Displays the group title, category icon, and monthly total in the header.
 * When expanded, renders WeeklyParcelRow items for each occurrence.
 * When pendingOnly is active, shows only pending parcels count and pending total.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 4.3, 4.4**
 */
import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from 'react-native';

import { useThemeColors } from '../hooks/useThemeColors';
import { useCategories } from '../hooks/useCategories';
import { formatCurrencyLocale, getCurrentLocale } from '../i18n';
import { spacing, typography, borderRadius } from '../constants/theme';
import { WeeklyParcelRow } from './WeeklyParcelRow';
import type { WeeklyRecurringGroup, WeeklyOccurrence } from '../types/weeklyRecurring';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the WeeklyGroupItem component
 */
export interface WeeklyGroupItemProps {
  /** The weekly recurring group data */
  group: WeeklyRecurringGroup;
  /** All occurrences for this group in the current month */
  occurrences: WeeklyOccurrence[];
  /** Whether the group is currently expanded */
  isExpanded: boolean;
  /** Callback when the header is tapped to toggle expand/collapse */
  onToggleExpand: (groupId: string) => void;
  /** Callback when a parcel row is pressed (navigate to detail) */
  onParcelPress: (occurrence: WeeklyOccurrence) => void;
  /** Callback when the payment status toggle is tapped on a parcel */
  onTogglePaymentStatus: (occurrenceId: string) => void;
  /** Whether the pending-only filter is active */
  pendingOnly: boolean;
  /** Callback when the user chooses to edit the group (long-press menu) */
  onEditGroup?: (groupId: string) => void;
  /** Callback when the user chooses to delete the group (long-press menu) */
  onDeleteGroup?: (groupId: string) => void;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Custom LayoutAnimation config for smooth expand/collapse
 */
const TOGGLE_ANIMATION = LayoutAnimation.create(
  280,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);

/**
 * WeeklyGroupItem component
 *
 * Renders a collapsible group header with:
 * - Category icon (colored circle with emoji)
 * - Group title
 * - Parcel count or pending count subtitle
 * - Monthly total or pending total
 * - Chevron indicator for expand/collapse state
 *
 * When expanded, renders WeeklyParcelRow for each occurrence (filtered by pending when pendingOnly is active).
 *
 * @example
 * ```tsx
 * <WeeklyGroupItem
 *   group={weeklyGroup}
 *   occurrences={groupOccurrences}
 *   isExpanded={expandedIds.has(weeklyGroup.id)}
 *   onToggleExpand={(id) => toggleExpand(id)}
 *   onParcelPress={(occ) => navigateToDetail(occ)}
 *   onTogglePaymentStatus={(id) => handleToggle(id)}
 *   pendingOnly={false}
 * />
 * ```
 */
function WeeklyGroupItemComponent({
  group,
  occurrences,
  isExpanded,
  onToggleExpand,
  onParcelPress,
  onTogglePaymentStatus,
  pendingOnly,
  onEditGroup,
  onDeleteGroup,
  testID,
}: WeeklyGroupItemProps): React.ReactElement {
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const { categories } = useCategories();

  // Find the category for this group to get icon and color
  const category = useMemo(
    () => categories.find((c) => c.id === group.categoryId) ?? null,
    [categories, group.categoryId]
  );

  // Filter occurrences based on pendingOnly
  const displayedOccurrences = useMemo(() => {
    if (pendingOnly) {
      return occurrences.filter((occ) => !occ.isPaid);
    }
    return occurrences;
  }, [occurrences, pendingOnly]);

  // Calculate totals
  const monthlyTotal = useMemo(
    () => occurrences.reduce((sum, occ) => sum + occ.amount, 0),
    [occurrences]
  );

  const pendingTotal = useMemo(
    () => occurrences.filter((occ) => !occ.isPaid).reduce((sum, occ) => sum + occ.amount, 0),
    [occurrences]
  );

  const pendingCount = useMemo(
    () => occurrences.filter((occ) => !occ.isPaid).length,
    [occurrences]
  );

  // Display total: pending total when pendingOnly, otherwise monthly total
  const displayTotal = pendingOnly ? pendingTotal : monthlyTotal;
  const formattedTotal = formatCurrencyLocale(displayTotal / 100, locale);

  // Subtitle text: pending count when pendingOnly, otherwise total count
  const subtitle = pendingOnly
    ? `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`
    : `${occurrences.length} parcela${occurrences.length !== 1 ? 's' : ''}`;

  // Chevron indicator
  const chevron = isExpanded ? '▼' : '▶';

  // Handle header tap with animation
  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(TOGGLE_ANIMATION);
    onToggleExpand(group.id);
  }, [onToggleExpand, group.id]);

  // Handle long-press on header to show edit/delete options
  const handleLongPress = useCallback(() => {
    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];

    if (onEditGroup) {
      buttons.push({ text: 'Editar grupo', onPress: () => onEditGroup(group.id) });
    }
    if (onDeleteGroup) {
      buttons.push({ text: 'Excluir grupo', style: 'destructive', onPress: () => onDeleteGroup(group.id) });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(group.title, '', buttons);
  }, [group.id, group.title, onEditGroup, onDeleteGroup]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }]}
      testID={testID}
    >
      {/* Group Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${group.title}, ${formattedTotal}, ${isExpanded ? 'expandido' : 'colapsado'}`}
        accessibilityState={{ expanded: isExpanded }}
        testID={testID ? `${testID}-header` : undefined}
      >
        {/* Category Icon */}
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: category?.color ?? colors.semantic.neutral[200] },
          ]}
          testID={testID ? `${testID}-icon` : undefined}
        >
          <Text style={styles.categoryIconText}>
            {category?.icon ?? '📅'}
          </Text>
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: colors.text.primary }]}
            numberOfLines={1}
            testID={testID ? `${testID}-title` : undefined}
          >
            {group.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.text.tertiary }]}
            testID={testID ? `${testID}-subtitle` : undefined}
          >
            {subtitle}
          </Text>
        </View>

        {/* Total and Chevron */}
        <View style={styles.rightContainer}>
          <Text
            style={[styles.total, { color: colors.text.primary }]}
            testID={testID ? `${testID}-total` : undefined}
          >
            {formattedTotal}
          </Text>
          <Text
            style={[styles.chevron, { color: colors.text.secondary }]}
            accessibilityElementsHidden
          >
            {chevron}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Parcel List */}
      {isExpanded && displayedOccurrences.length > 0 && (
        <View
          style={[styles.parcelList, { borderTopColor: colors.border.subtle }]}
          testID={testID ? `${testID}-parcels` : undefined}
        >
          {displayedOccurrences.map((occurrence) => (
            <WeeklyParcelRow
              key={occurrence.id}
              occurrence={occurrence}
              onPress={onParcelPress}
              onTogglePaymentStatus={onTogglePaymentStatus}
              testID={testID ? `${testID}-parcel-${occurrence.id}` : undefined}
            />
          ))}
        </View>
      )}

      {/* Expanded but no parcels to show (all paid with pendingOnly) */}
      {isExpanded && displayedOccurrences.length === 0 && (
        <View
          style={[styles.emptyState, { borderTopColor: colors.border.subtle }]}
          testID={testID ? `${testID}-empty` : undefined}
        >
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Nenhuma parcela pendente
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIconText: {
    fontSize: typography.body.fontSize,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  total: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  parcelList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyState: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: typography.caption.fontSize,
  },
});

/**
 * Memoized WeeklyGroupItem for performance optimization.
 * Re-renders only when group data, occurrences, or expansion state changes.
 */
export const WeeklyGroupItem = memo(WeeklyGroupItemComponent);

export default WeeklyGroupItem;
