/**
 * FundCard Component
 *
 * Displays a fund allocation card with name, icon, color indicator,
 * monthly allocation input, and total accumulated balance.
 * Uses PressableCard with variant="secondary" pattern.
 * Tappable to expand and show linked transactions (controlled by parent).
 *
 * **Validates: Requirements 5.7, 6.1, 7.4, 15.2**
 */

import React, { memo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCurrencyLocale, getCurrentLocale } from '../../i18n';
import { spacing, typography } from '../../constants/theme';
import { PressableCard } from '../ui/PressableCard';
import type { FundWithBalance } from '../../types/fund';

/**
 * Props for the FundCard component.
 */
export interface FundCardProps {
  /** Fund data with calculated balance */
  fund: FundWithBalance;
  /** Callback when the allocation input value changes */
  onAllocationChange: (fundId: string, value: string) => void;
  /** Callback when the card is pressed (expand/collapse) */
  onPress: (fundId: string) => void;
  /** Whether the card is expanded to show linked transactions */
  expanded: boolean;
  /** Optional children rendered when expanded (e.g., FundTransactionList) */
  children?: React.ReactNode;
  /** Optional container style override */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * FundCard displays a single fund with its name, allocation input, and balance.
 * Tapping the card triggers onPress for expand/collapse behavior.
 * When expanded, children are rendered below the card content.
 */
function FundCardComponent({
  fund,
  onAllocationChange,
  onPress,
  expanded,
  children,
  style,
  testID,
}: FundCardProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const formattedBalance = formatCurrencyLocale(fund.totalBalance / 100, locale);

  const allocationDisplayValue =
    fund.monthlyAllocation > 0 ? (fund.monthlyAllocation / 100).toString() : '';

  const handlePress = useCallback(() => {
    onPress(fund.id);
  }, [onPress, fund.id]);

  const handleAllocationChange = useCallback(
    (value: string) => {
      onAllocationChange(fund.id, value);
    },
    [onAllocationChange, fund.id]
  );

  return (
    <PressableCard
      variant="secondary"
      onPress={handlePress}
      style={[styles.card, style]}
      testID={testID}
    >
      {/* Header row: color indicator + name + icon */}
      <View style={styles.header}>
        {fund.color && (
          <View
            style={[styles.colorIndicator, { backgroundColor: fund.color }]}
            testID={testID ? `${testID}-color` : undefined}
          />
        )}
        <View style={styles.nameContainer}>
          {fund.icon && (
            <Text
              style={styles.icon}
              testID={testID ? `${testID}-icon` : undefined}
              accessibilityLabel={fund.icon}
            >
              {fund.icon}
            </Text>
          )}
          <Text
            style={[styles.name, { color: colors.text.primary }]}
            numberOfLines={1}
            testID={testID ? `${testID}-name` : undefined}
          >
            {fund.name}
          </Text>
        </View>
        <Text
          style={[styles.expandIndicator, { color: colors.text.tertiary }]}
          accessibilityLabel={expanded ? t('common.collapse') : t('common.expand')}
        >
          {expanded ? '▲' : '▼'}
        </Text>
      </View>

      {/* Metrics row: allocation input + balance */}
      <View style={styles.metricsRow}>
        {/* Monthly allocation */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
            {t('futurePlans.funds.allocation')}
          </Text>
          <TextInput
            style={[
              styles.allocationInput,
              {
                color: colors.text.primary,
                borderColor: colors.border.default,
                backgroundColor: colors.surface.card,
              },
            ]}
            value={allocationDisplayValue}
            onChangeText={handleAllocationChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.text.tertiary}
            testID={testID ? `${testID}-allocation-input` : undefined}
            accessibilityLabel={t('futurePlans.funds.allocation')}
          />
        </View>

        {/* Total balance */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
            {t('futurePlans.funds.balance')}
          </Text>
          <Text
            style={[styles.balanceValue, { color: colors.text.primary }]}
            testID={testID ? `${testID}-balance` : undefined}
            accessibilityLabel={`${t('futurePlans.funds.balance')}: ${formattedBalance}`}
          >
            {formattedBalance}
          </Text>
        </View>
      </View>

      {/* Expanded content (linked transactions) */}
      {expanded && children && <View style={styles.expandedContent}>{children}</View>}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    flex: 1,
  },
  expandIndicator: {
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metricItem: {},
  metricLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    marginBottom: spacing.sm,
  },
  allocationInput: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 120,
  },
  balanceValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  expandedContent: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent', // overridden inline when rendered
    paddingTop: spacing.md,
  },
});

/**
 * Memoized FundCard for performance optimization.
 */
export const FundCard = memo(FundCardComponent);

export default FundCard;
