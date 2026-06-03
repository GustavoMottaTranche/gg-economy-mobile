/**
 * PendingSection Component
 *
 * Displays pending (unpaid) recurring occurrences on the Home screen,
 * grouped by category. Each category is collapsible and shows its pending total.
 * A summary footer displays overall total and per-category totals.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { OccurrenceStatusToggle } from '../ui/OccurrenceStatusToggle';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, formatDateLocale, getCurrentLocale } from '../../i18n';
import { spacing, borderRadius, shadows } from '../../constants/theme';
import { useThemeStore } from '../../stores/themeStore';
import type { PendingItem } from '../../types/paymentStatus';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the PendingSection component
 */
export interface PendingSectionProps {
  /** List of pending items to display */
  items: PendingItem[];
  /** Callback when the status toggle is tapped */
  onToggleStatus: (id: string, type: 'weekly' | 'monthly' | 'installment') => void;
  /** Callback when the item row (not the toggle) is tapped — receives the navigation ID */
  onItemPress: (navId: string, type: 'weekly' | 'monthly' | 'installment') => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Represents a group of pending items under a category.
 */
interface PendingCategoryGroup {
  categoryId: string;
  categoryName: string;
  items: PendingItem[];
  total: number;
}

/**
 * Custom LayoutAnimation config for expand/collapse
 */
const TOGGLE_ANIMATION = LayoutAnimation.create(
  250,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity
);

/**
 * Formats a date string (YYYY-MM-DD) into a short readable format.
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
 * Groups pending items by category and computes per-category totals.
 */
function groupByCategory(items: PendingItem[]): PendingCategoryGroup[] {
  const groupMap = new Map<string, PendingCategoryGroup>();

  for (const item of items) {
    const catId = item.categoryId ?? '__uncategorized__';
    const catName = item.categoryName ?? 'Sem categoria';

    const existing = groupMap.get(catId);
    if (existing) {
      existing.items.push(item);
      existing.total += Math.abs(item.amount);
    } else {
      groupMap.set(catId, {
        categoryId: catId,
        categoryName: catName,
        items: [item],
        total: Math.abs(item.amount),
      });
    }
  }

  // Sort groups by total descending (biggest pending first)
  return Array.from(groupMap.values()).sort((a, b) => b.total - a.total);
}

/**
 * PendingSection component
 *
 * Renders pending items grouped by category with collapsible sections
 * and a totals footer.
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

  // Track which categories are expanded (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Group items by category
  const groups = useMemo(() => groupByCategory(items), [items]);

  // Initialize all categories as expanded on first render with data
  useMemo(() => {
    if (!initialized && groups.length > 0) {
      setExpandedCategories(new Set(groups.map((g) => g.categoryId)));
      setInitialized(true);
    }
  }, [groups, initialized]);

  // Compute overall total
  const overallTotal = useMemo(
    () => items.reduce((sum, item) => sum + Math.abs(item.amount), 0),
    [items]
  );

  // Toggle category expansion
  const handleToggleCategory = useCallback((categoryId: string) => {
    LayoutAnimation.configureNext(TOGGLE_ANIMATION);
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Hide section when empty
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
        style={[styles.sectionTitle, { color: colors.text.primary }]}
        testID={testID ? `${testID}-title` : undefined}
      >
        {t('dashboard.pendingSection', { defaultValue: 'Contas pendentes' })}
      </Text>

      {/* Category Groups */}
      {groups.map((group) => {
        const isExpanded = expandedCategories.has(group.categoryId);
        const chevron = isExpanded ? '▼' : '▶';
        const formattedGroupTotal = formatCurrencyLocale(group.total / 100, locale);

        return (
          <View
            key={group.categoryId}
            style={[styles.categoryGroup, { borderBottomColor: colors.border.subtle }]}
            testID={testID ? `${testID}-group-${group.categoryId}` : undefined}
          >
            {/* Category Header (collapsible) */}
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => handleToggleCategory(group.categoryId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`${group.categoryName}, ${formattedGroupTotal}, ${group.items.length} ${group.items.length === 1 ? 'conta' : 'contas'}`}
              testID={testID ? `${testID}-group-header-${group.categoryId}` : undefined}
            >
              <View style={styles.categoryHeaderLeft}>
                <Text
                  style={[styles.chevron, { color: colors.text.secondary }]}
                  accessibilityElementsHidden
                >
                  {chevron}
                </Text>
                <Text
                  style={[styles.categoryName, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {group.categoryName}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.text.tertiary }]}>
                  ({group.items.length})
                </Text>
              </View>
              <Text style={[styles.categoryTotal, { color: colors.semantic.warning.dark }]}>
                {formattedGroupTotal}
              </Text>
            </TouchableOpacity>

            {/* Items within category (visible when expanded) */}
            {isExpanded && (
              <View style={styles.itemsList}>
                {group.items.map((item, index) => {
                  const isLast = index === group.items.length - 1;
                  const formattedAmount = formatCurrencyLocale(Math.abs(item.amount) / 100, locale);
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
            )}
          </View>
        );
      })}

      {/* Totals Footer */}
      <View
        style={[styles.totalsFooter, { borderTopColor: colors.border.default }]}
        testID={testID ? `${testID}-totals` : undefined}
      >
        {/* Per-category totals */}
        {groups.map((group) => (
          <View key={group.categoryId} style={styles.totalRow}>
            <Text
              style={[styles.totalCategoryName, { color: colors.text.secondary }]}
              numberOfLines={1}
            >
              {group.categoryName}
            </Text>
            <Text style={[styles.totalCategoryAmount, { color: colors.semantic.warning.dark }]}>
              {formatCurrencyLocale(group.total / 100, locale)}
            </Text>
          </View>
        ))}

        {/* Grand total */}
        <View style={[styles.grandTotalRow, { borderTopColor: colors.border.subtle }]}>
          <Text style={[styles.grandTotalLabel, { color: colors.text.primary }]}>
            {t('dashboard.pendingTotal', { defaultValue: 'Total pendente' })}
          </Text>
          <Text style={[styles.grandTotalAmount, { color: colors.semantic.warning.dark }]}>
            {formatCurrencyLocale(overallTotal / 100, locale)}
          </Text>
        </View>
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
  onToggleStatus: (id: string, type: 'weekly' | 'monthly' | 'installment') => void;
  onItemPress: (navId: string, type: 'weekly' | 'monthly' | 'installment') => void;
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
    const navId = item.type === 'weekly' ? item.groupId : item.id;
    onItemPress(navId, item.type);
  }, [onItemPress, item.groupId, item.id, item.type]);

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

      {/* Pressable content area */}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  // Category group
  categoryGroup: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  chevron: {
    fontSize: 10,
    marginRight: spacing.sm,
    width: 14,
    textAlign: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  categoryCount: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Items list
  itemsList: {
    paddingLeft: spacing.lg,
    paddingBottom: spacing.sm,
  },
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
    fontSize: 13,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 11,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Totals footer
  totalsFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalCategoryName: {
    fontSize: 12,
    flex: 1,
    marginRight: spacing.sm,
  },
  totalCategoryAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});

/**
 * Memoized PendingSection for performance optimization
 */
export const PendingSection = memo(PendingSectionComponent);

export default PendingSection;
