/**
 * FundSelector Component
 *
 * A modal overlay displaying a list of active funds for selection.
 * Used in transaction edit/create screens to link or unlink a transaction
 * from a fund. Includes a "None" option to unlink.
 *
 * **Validates: Requirements 8.1, 8.8**
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useFunds } from '../../stores/fundStore';
import { spacing, borderRadius, typography } from '../../constants/theme';
import type { Fund } from '../../types/fund';

// ─── Props ───────────────────────────────────────────────────────────────────

/**
 * Props for the FundSelector component
 */
export interface FundSelectorProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when a fund is selected (null = unlink / "None") */
  onSelect: (fundId: string | null) => void;
  /** Callback when the modal is closed without selection */
  onClose: () => void;
  /** Currently selected fund ID (null = no fund linked) */
  selectedFundId: string | null;
  /** Test ID for testing */
  testID?: string;
}

// ─── Fund Item ───────────────────────────────────────────────────────────────

interface FundItemProps {
  fund: Fund;
  isSelected: boolean;
  onPress: (fundId: string) => void;
}

const FundItem = memo(function FundItem({
  fund,
  isSelected,
  onPress,
}: FundItemProps): React.ReactElement {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    onPress(fund.id);
  }, [fund.id, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.fundItem,
        { borderBottomColor: colors.border.subtle },
        isSelected && { backgroundColor: colors.semantic.primary.light },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={fund.name}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.fundItemContent}>
        {fund.color && <View style={[styles.colorIndicator, { backgroundColor: fund.color }]} />}
        {fund.icon && <Text style={styles.fundIcon}>{fund.icon}</Text>}
        <Text
          style={[
            styles.fundName,
            { color: colors.text.primary },
            isSelected && { color: colors.interactive.primary, fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {fund.name}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: colors.interactive.primary }]}>
          <Text style={[styles.checkmarkText, { color: colors.text.inverse }]}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

function FundSelectorComponent({
  visible,
  onSelect,
  onClose,
  selectedFundId,
  testID,
}: FundSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const funds = useFunds();

  const activeFunds = useMemo(() => funds.filter((f) => f.isActive), [funds]);

  const handleSelectNone = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  const handleSelectFund = useCallback(
    (fundId: string) => {
      onSelect(fundId);
    },
    [onSelect]
  );

  const renderItem = useCallback(
    ({ item }: { item: Fund }) => (
      <FundItem fund={item} isSelected={item.id === selectedFundId} onPress={handleSelectFund} />
    ),
    [selectedFundId, handleSelectFund]
  );

  const keyExtractor = useCallback((item: Fund) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <Pressable
          style={[styles.container, { backgroundColor: colors.surface.card }]}
          onPress={undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('futurePlans.transactions.selectFund')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.closeButtonText, { color: colors.interactive.primary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* None option */}
          <TouchableOpacity
            style={[
              styles.noneItem,
              { borderBottomColor: colors.border.subtle },
              selectedFundId === null && { backgroundColor: colors.semantic.primary.light },
            ]}
            onPress={handleSelectNone}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('futurePlans.transactions.noneFund')}
            accessibilityState={{ selected: selectedFundId === null }}
            testID={testID ? `${testID}-none` : undefined}
          >
            <Text
              style={[
                styles.noneFundText,
                { color: colors.text.secondary },
                selectedFundId === null && {
                  color: colors.interactive.primary,
                  fontWeight: '600',
                },
              ]}
            >
              {t('futurePlans.transactions.noneFund')}
            </Text>
            {selectedFundId === null && (
              <View style={[styles.checkmark, { backgroundColor: colors.interactive.primary }]}>
                <Text style={[styles.checkmarkText, { color: colors.text.inverse }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Fund list */}
          <FlatList
            data={activeFunds}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            testID={testID ? `${testID}-list` : undefined}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  noneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  noneFundText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  list: {
    flexGrow: 0,
  },
  fundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  fundItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  fundIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  fundName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

/**
 * Memoized FundSelector for performance optimization
 */
export const FundSelector = memo(FundSelectorComponent);

export default FundSelector;
