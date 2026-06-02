/**
 * CategoryPicker Component
 *
 * Displays a list of categories with search/filter functionality.
 * Supports selection callback and shows category icon and color.
 * Provides accessibility support and i18n.
 *
 * **Validates: Requirements 30**
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Category, CategoryType } from '../../types/category';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

/**
 * Props for the CategoryPicker component
 */
export interface CategoryPickerProps {
  /** List of categories to display */
  categories: Category[];
  /** Currently selected category ID */
  selectedCategoryId?: string | null;
  /** Callback when a category is selected */
  onSelect: (category: Category) => void;
  /** Whether the picker is visible (for modal mode) */
  visible?: boolean;
  /** Callback to close the picker (for modal mode) */
  onClose?: () => void;
  /** Filter by category type */
  filterType?: CategoryType;
  /** Whether to show inactive categories */
  showInactive?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Whether to render as a modal */
  asModal?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Props for individual category item
 */
interface CategoryItemProps {
  category: Category;
  isSelected: boolean;
  onPress: (category: Category) => void;
}

/**
 * Individual category item component
 */
const CategoryItem = memo(function CategoryItem({
  category,
  isSelected,
  onPress,
}: CategoryItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    onPress(category);
  }, [category, onPress]);

  const accessibilityLabel = [
    category.name,
    category.type === 'income' ? t('manual.income') : t('manual.expense'),
    isSelected ? t('common.selected') : '',
    !category.isActive ? t('categories.inactive') : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { borderBottomColor: colors.border.subtle },
        isSelected && { backgroundColor: colors.semantic.primary.light },
        !category.isActive && styles.categoryItemInactive,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.categoryItemContent}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
          <Text style={styles.categoryIconText}>{category.icon}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text
            style={[
              styles.categoryName,
              { color: colors.text.primary },
              !category.isActive && { color: colors.text.tertiary },
            ]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
          <Text style={[styles.categoryType, { color: colors.text.secondary }]}>
            {category.type === 'income' ? t('manual.income') : t('manual.expense')}
          </Text>
        </View>
      </View>
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: colors.interactive.primary }]}>
          <Text style={[styles.checkmarkText, { color: colors.text.inverse }]}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

/**
 * Section header component
 */
const SectionHeader = memo(function SectionHeader({ title }: { title: string }): React.JSX.Element {
  const colors = useThemeColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background.secondary }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.text.secondary }]}>{title}</Text>
    </View>
  );
});

/**
 * CategoryPicker component
 *
 * @example
 * ```tsx
 * // Inline mode
 * <CategoryPicker
 *   categories={categories}
 *   selectedCategoryId={selectedId}
 *   onSelect={(category) => setSelectedId(category.id)}
 * />
 *
 * // Modal mode
 * <CategoryPicker
 *   categories={categories}
 *   selectedCategoryId={selectedId}
 *   onSelect={(category) => {
 *     setSelectedId(category.id);
 *     setModalVisible(false);
 *   }}
 *   visible={modalVisible}
 *   onClose={() => setModalVisible(false)}
 *   asModal
 * />
 * ```
 */
function CategoryPickerComponent({
  categories,
  selectedCategoryId,
  onSelect,
  visible = true,
  onClose,
  filterType,
  showInactive = false,
  searchPlaceholder,
  style,
  asModal = false,
  testID,
}: CategoryPickerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and group categories
  const { incomeCategories, expenseCategories } = useMemo(() => {
    let filtered = categories;

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter((c) => c.isActive);
    }

    // Filter by type if specified
    if (filterType) {
      filtered = filtered.filter((c) => c.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Group by type
    const income = filtered.filter((c) => c.type === 'income');
    const expense = filtered.filter((c) => c.type === 'expense');

    return {
      incomeCategories: income,
      expenseCategories: expense,
    };
  }, [categories, filterType, showInactive, searchQuery]);

  // Build sections for FlatList
  const sections = useMemo(() => {
    const result: Array<{ type: 'header' | 'item'; data: Category | string }> = [];

    if (incomeCategories.length > 0 && !filterType) {
      result.push({ type: 'header', data: t('categories.incomeCategories') });
      incomeCategories.forEach((c) => result.push({ type: 'item', data: c }));
    } else if (filterType === 'income') {
      incomeCategories.forEach((c) => result.push({ type: 'item', data: c }));
    }

    if (expenseCategories.length > 0 && !filterType) {
      result.push({ type: 'header', data: t('categories.expenseCategories') });
      expenseCategories.forEach((c) => result.push({ type: 'item', data: c }));
    } else if (filterType === 'expense') {
      expenseCategories.forEach((c) => result.push({ type: 'item', data: c }));
    }

    return result;
  }, [incomeCategories, expenseCategories, filterType, t]);

  const handleCategoryPress = useCallback(
    (category: Category) => {
      onSelect(category);
    },
    [onSelect]
  );

  const renderItem = useCallback(
    ({ item }: { item: { type: 'header' | 'item'; data: Category | string } }) => {
      if (item.type === 'header') {
        return <SectionHeader title={item.data as string} />;
      }

      const category = item.data as Category;
      return (
        <CategoryItem
          category={category}
          isSelected={category.id === selectedCategoryId}
          onPress={handleCategoryPress}
        />
      );
    },
    [selectedCategoryId, handleCategoryPress]
  );

  const keyExtractor = useCallback(
    (item: { type: 'header' | 'item'; data: Category | string }, index: number) => {
      if (item.type === 'header') {
        return `header-${index}`;
      }
      return (item.data as Category).id;
    },
    []
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {t('categories.noCategories')}
        </Text>
      </View>
    ),
    [t, colors]
  );

  const content = (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }, style]}
      testID={testID}
    >
      {/* Search Input */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border.default }]}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.background.tertiary, color: colors.text.primary },
          ]}
          placeholder={searchPlaceholder || t('common.search')}
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={t('common.search')}
          accessibilityHint={t('categories.title')}
          testID={testID ? `${testID}-search` : undefined}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
          >
            <Text style={[styles.clearButtonText, { color: colors.text.secondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category List */}
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        testID={testID ? `${testID}-list` : undefined}
      />
    </View>
  );

  // Render as modal if specified
  if (asModal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        testID={testID ? `${testID}-modal` : undefined}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface.card }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {t('manual.selectCategory')}
              </Text>
              {onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Text style={[styles.closeButtonText, { color: colors.interactive.primary }]}>
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {content}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  // Render inline if not visible in non-modal mode
  if (!visible) {
    return null;
  }

  return content;
}

/**
 * Styles for CategoryPicker
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.xl,
    padding: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.body.fontSize,
  },
  listContent: {
    paddingBottom: spacing.base,
  },
  sectionHeader: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  categoryItemInactive: {
    opacity: 0.5,
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryType: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
  },
});

/**
 * Memoized CategoryPicker for performance optimization
 */
export const CategoryPicker = memo(CategoryPickerComponent);

export default CategoryPicker;
