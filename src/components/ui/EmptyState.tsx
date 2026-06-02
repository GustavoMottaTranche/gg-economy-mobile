/**
 * EmptyState Component
 *
 * Displays an empty state with icon, title, description, and optional action button.
 * Provides accessibility support and i18n.
 *
 * **Validates: Requirements 30**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /** Icon to display (emoji or text) */
  icon?: string;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button configuration */
  action?: {
    /** Button label */
    label: string;
    /** Button press handler */
    onPress: () => void;
  };
  /** Whether to display in compact mode */
  compact?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom icon style */
  iconStyle?: TextStyle;
  /** Custom title style */
  titleStyle?: TextStyle;
  /** Custom description style */
  descriptionStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * EmptyState component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState
 *   icon="📭"
 *   title="No transactions yet"
 *   description="Import a statement or add manually"
 * />
 *
 * // With action button
 * <EmptyState
 *   icon="📥"
 *   title="No backups"
 *   description="Connect your Google account to backup"
 *   action={{
 *     label: "Connect",
 *     onPress: () => handleConnect(),
 *   }}
 * />
 *
 * // Compact mode
 * <EmptyState
 *   icon="🔍"
 *   title="No results"
 *   compact
 * />
 * ```
 */
function EmptyStateComponent({
  icon = '📭',
  title,
  description,
  action,
  compact = false,
  style,
  iconStyle,
  titleStyle,
  descriptionStyle,
  testID,
}: EmptyStateProps): React.JSX.Element {
  const accessibilityLabel = [title, description].filter(Boolean).join('. ');
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, compact && styles.containerCompact, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {/* Icon */}
      <Text
        style={[styles.icon, compact && styles.iconCompact, iconStyle]}
        accessibilityElementsHidden
      >
        {icon}
      </Text>

      {/* Title */}
      <Text
        style={[
          styles.title,
          { color: colors.text.primary },
          compact && styles.titleCompact,
          titleStyle,
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text
          style={[
            styles.description,
            { color: colors.text.secondary },
            compact && styles.descriptionCompact,
            descriptionStyle,
          ]}
          numberOfLines={3}
        >
          {description}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.interactive.primary },
            compact && styles.actionButtonCompact,
          ]}
          onPress={action.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          testID={testID ? `${testID}-action` : undefined}
        >
          <Text style={[styles.actionButtonText, { color: colors.text.inverse }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Styles for EmptyState
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  containerCompact: {
    padding: spacing.base,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  iconCompact: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize - 2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleCompact: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.caption.fontSize + 1,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  descriptionCompact: {
    fontSize: typography.caption.fontSize,
    lineHeight: 18,
    maxWidth: 240,
  },
  actionButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 120,
  },
  actionButtonCompact: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minWidth: 100,
  },
  actionButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/**
 * Memoized EmptyState for performance optimization
 */
export const EmptyState = memo(EmptyStateComponent);

/**
 * Pre-configured empty state for transactions
 */
export const EmptyTransactions = memo(function EmptyTransactions({
  onImport,
  onAddManual,
}: {
  onImport?: () => void;
  onAddManual?: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      icon="📊"
      title="No transactions yet"
      description="Import a statement or add manually"
      action={
        onImport
          ? { label: 'Import', onPress: onImport }
          : onAddManual
            ? { label: 'Add Transaction', onPress: onAddManual }
            : undefined
      }
      testID="empty-transactions"
    />
  );
});

/**
 * Pre-configured empty state for review queue
 */
export const EmptyReview = memo(function EmptyReview({
  onImport,
}: {
  onImport?: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      icon="✅"
      title="Nothing to review"
      description="Import transactions to get started"
      action={onImport ? { label: 'Import', onPress: onImport } : undefined}
      testID="empty-review"
    />
  );
});

/**
 * Pre-configured empty state for categories
 */
export const EmptyCategories = memo(function EmptyCategories({
  onAdd,
}: {
  onAdd?: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      icon="🏷️"
      title="No categories"
      description="Add categories to organize your transactions"
      action={onAdd ? { label: 'Add Category', onPress: onAdd } : undefined}
      testID="empty-categories"
    />
  );
});

/**
 * Pre-configured empty state for backups
 */
export const EmptyBackups = memo(function EmptyBackups({
  onConnect,
}: {
  onConnect?: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      icon="☁️"
      title="No backups"
      description="Connect your Google account to backup"
      action={onConnect ? { label: 'Connect', onPress: onConnect } : undefined}
      testID="empty-backups"
    />
  );
});

/**
 * Pre-configured empty state for search results
 */
export const EmptySearchResults = memo(function EmptySearchResults({
  onClear,
}: {
  onClear?: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description="Try adjusting your search or filters"
      action={onClear ? { label: 'Clear Search', onPress: onClear } : undefined}
      compact
      testID="empty-search"
    />
  );
});

export default EmptyState;
