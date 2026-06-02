/**
 * CategorySelector Component
 *
 * Reusable component with two cascading inline selects:
 * 1. First select: expense group ('Custo Fixo', 'Variável', optionally 'Receita')
 * 2. Second select: category name filtered by the selected group
 *
 * Supports auto-population of the group select when a category is chosen directly,
 * and resets to all active expense categories when the group is cleared.
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10**
 */

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { useCategories } from '../hooks/useCategories';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, typography } from '../constants/theme';
import type { Category, ExpenseGroup } from '../types';

/**
 * Group selection type — expense groups plus optional income
 */
export type GroupSelection = ExpenseGroup | 'income' | null;

/**
 * Props for the CategorySelector component
 */
export interface CategorySelectorProps {
  /** Currently selected category ID */
  selectedCategoryId?: string | null;
  /** Callback when a category is selected */
  onSelect: (category: Category) => void;
  /** Include income categories (adds 'Receita' option in first select) */
  includeIncome?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Display labels for expense groups
 */
const GROUP_LABELS = {
  fixed: 'Custo Fixo',
  variable: 'Variável',
  income: 'Receita',
} as const;

/**
 * CategorySelector component with two cascading inline selects
 *
 * @example
 * ```tsx
 * <CategorySelector
 *   selectedCategoryId={selectedId}
 *   onSelect={(category) => setSelectedId(category.id)}
 *   includeIncome={true}
 * />
 * ```
 */
function CategorySelectorComponent({
  selectedCategoryId,
  onSelect,
  includeIncome = false,
  style,
  testID,
}: CategorySelectorProps): React.JSX.Element {
  const { expenseCategories, incomeCategories, fixedExpenseCategories, variableExpenseCategories } =
    useCategories();
  const colors = useThemeColors();

  const [selectedGroup, setSelectedGroup] = useState<GroupSelection>(null);

  // Auto-populate group when selectedCategoryId changes externally
  useEffect(() => {
    if (selectedCategoryId) {
      const allCategories = [...expenseCategories, ...incomeCategories];
      const category = allCategories.find((c) => c.id === selectedCategoryId);
      if (category) {
        if (category.type === 'income') {
          setSelectedGroup('income');
        } else if (category.expenseGroup) {
          setSelectedGroup(category.expenseGroup);
        }
      }
    }
  }, [selectedCategoryId, expenseCategories, incomeCategories]);

  // Build group options for first select
  const groupOptions = useMemo(() => {
    const options: Array<{ value: GroupSelection; label: string }> = [
      { value: 'fixed', label: GROUP_LABELS.fixed },
      { value: 'variable', label: GROUP_LABELS.variable },
    ];

    if (includeIncome) {
      options.push({ value: 'income', label: GROUP_LABELS.income });
    }

    return options;
  }, [includeIncome]);

  // Filter categories for second select based on group selection
  const filteredCategories = useMemo(() => {
    let result: Category[];

    switch (selectedGroup) {
      case 'fixed':
        result = [...fixedExpenseCategories];
        break;
      case 'variable':
        result = [...variableExpenseCategories];
        break;
      case 'income':
        result = [...incomeCategories];
        break;
      default:
        // No group selected: show all active expense categories
        result = [...expenseCategories];
        break;
    }

    // Always sort alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    selectedGroup,
    fixedExpenseCategories,
    variableExpenseCategories,
    incomeCategories,
    expenseCategories,
  ]);

  // Handle group selection
  const handleGroupSelect = useCallback(
    (group: GroupSelection) => {
      if (selectedGroup === group) {
        // Clear group selection — reset to all expense categories
        setSelectedGroup(null);
      } else {
        setSelectedGroup(group);
      }
    },
    [selectedGroup]
  );

  // Handle category selection
  const handleCategorySelect = useCallback(
    (category: Category) => {
      // Auto-populate group when selecting a category directly
      if (category.type === 'income') {
        setSelectedGroup('income');
      } else if (category.expenseGroup) {
        setSelectedGroup(category.expenseGroup);
      }

      onSelect(category);
    },
    [onSelect]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, style]}
      testID={testID}
    >
      {/* First Select: Expense Group */}
      <View
        style={[styles.groupContainer, { borderBottomColor: colors.border.default }]}
        testID={testID ? `${testID}-group` : undefined}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupScrollContent}
        >
          {groupOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.groupChip,
                { backgroundColor: colors.background.tertiary },
                selectedGroup === option.value && { backgroundColor: colors.interactive.primary },
              ]}
              onPress={() => handleGroupSelect(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: selectedGroup === option.value }}
              testID={testID ? `${testID}-group-${option.value}` : undefined}
            >
              <Text
                style={[
                  styles.groupChipText,
                  { color: colors.text.primary },
                  selectedGroup === option.value && { color: colors.text.inverse },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Second Select: Category Name */}
      <ScrollView
        style={styles.categoryList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        testID={testID ? `${testID}-categories` : undefined}
      >
        {filteredCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              { borderBottomColor: colors.border.subtle },
              category.id === selectedCategoryId && {
                backgroundColor: colors.semantic.primary.light,
              },
            ]}
            onPress={() => handleCategorySelect(category)}
            accessibilityRole="button"
            accessibilityLabel={category.name}
            accessibilityState={{ selected: category.id === selectedCategoryId }}
            testID={testID ? `${testID}-category-${category.id}` : undefined}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
              <Text style={styles.categoryIconText}>{category.icon}</Text>
            </View>
            <Text
              style={[
                styles.categoryName,
                { color: colors.text.primary },
                category.id === selectedCategoryId && {
                  color: colors.interactive.primary,
                  fontWeight: '600',
                },
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
            {category.id === selectedCategoryId && (
              <View style={[styles.checkmark, { backgroundColor: colors.interactive.primary }]}>
                <Text style={[styles.checkmarkText, { color: colors.text.inverse }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {filteredCategories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Nenhuma categoria encontrada
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Styles for CategorySelector
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  groupContainer: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  groupScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  groupChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  groupChipText: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '500',
  },
  categoryList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
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
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: typography.overline.fontSize + 1,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.caption.fontSize + 1,
  },
});

/**
 * Memoized CategorySelector for performance optimization
 */
export const CategorySelector = memo(CategorySelectorComponent);

export default CategorySelector;
