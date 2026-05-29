/**
 * ChartFilter Component
 *
 * Provides filter options for the expense chart: "Todos", "Somente Fixo", "Somente Variável".
 * Visually indicates the active option with a highlighted background.
 *
 * **Validates: Requirements 4.1, 4.5, 4.6**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../constants/theme';

/**
 * Available chart filter options
 */
export type ChartFilterOption = 'all' | 'fixed' | 'variable';

/**
 * Props for the ChartFilter component
 */
export interface ChartFilterProps {
  /** Currently selected filter option */
  selected: ChartFilterOption;
  /** Callback when user selects a filter option */
  onSelect: (option: ChartFilterOption) => void;
  /** Optional container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Filter option configuration
 */
interface FilterOptionConfig {
  key: ChartFilterOption;
  label: string;
}

const FILTER_OPTIONS: FilterOptionConfig[] = [
  { key: 'all', label: 'Todos' },
  { key: 'fixed', label: 'Somente Fixo' },
  { key: 'variable', label: 'Somente Variável' },
];

/**
 * ChartFilter component
 *
 * Renders three filter buttons in a row. The active option has a highlighted
 * background (primary color with white text), while inactive options have a
 * subtle/transparent background.
 *
 * @example
 * ```tsx
 * <ChartFilter
 *   selected="all"
 *   onSelect={(option) => setChartFilter(option)}
 * />
 * ```
 */
function ChartFilterComponent({
  selected,
  onSelect,
  style,
  testID,
}: ChartFilterProps): React.ReactElement {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.tertiary }, style]}
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel="Filtro do gráfico"
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = selected === option.key;

        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.option,
              isActive && [styles.optionActive, { backgroundColor: colors.interactive.primary }],
            ]}
            onPress={() => onSelect(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            testID={testID ? `${testID}-${option.key}` : undefined}
          >
            <Text
              style={[
                styles.optionText,
                { color: colors.text.secondary },
                isActive && [styles.optionTextActive, { color: colors.text.inverse }],
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  optionActive: {
    // backgroundColor set dynamically
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionTextActive: {
    fontWeight: '600',
  },
});

/**
 * Memoized ChartFilter for performance optimization
 */
export const ChartFilter = memo(ChartFilterComponent);

export default ChartFilter;
