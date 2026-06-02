/**
 * Category Management Screen
 *
 * Manage transaction categories:
 * - View all categories grouped by type (income/expense)
 * - Create new categories with name, type, icon, and color
 * - Edit existing categories
 * - Deactivate/activate categories (soft delete)
 *
 * **Validates: Requirements 17, 27, 30, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCategories, type CategoryWithCount } from '../../../src/hooks/useCategories';
import { ReplacementPrompt } from '../../../src/components/ReplacementPrompt';
import type {
  Category,
  CategoryType,
  ExpenseGroup,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../../src/types';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';

/**
 * Available icons for categories
 */
const CATEGORY_ICONS = [
  '🍔',
  '🍕',
  '🍜',
  '☕',
  '🛒',
  '🏠',
  '💡',
  '📱',
  '🚗',
  '⛽',
  '🚌',
  '✈️',
  '🏥',
  '💊',
  '🎬',
  '🎮',
  '📚',
  '👕',
  '💇',
  '🎁',
  '💰',
  '💵',
  '💳',
  '📈',
  '🏦',
  '💼',
  '🎓',
  '🏋️',
  '🎵',
  '🐕',
];

/**
 * Available colors for categories
 */
const CATEGORY_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
  '#30B0C7',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#A2845E',
  '#8E8E93',
  '#636366',
  '#48484A',
  '#3A3A3C',
];

type ExpenseGroupFilter = 'all' | 'fixed' | 'variable';

interface CategoryItemProps {
  category: CategoryWithCount;
  onEdit: (category: Category) => void;
  onToggleActive: (category: Category) => void;
  showGroupBadge?: boolean;
}

function CategoryItem({
  category,
  onEdit,
  onToggleActive,
  showGroupBadge = false,
}: CategoryItemProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.categoryItem,
        { borderBottomColor: colors.border.subtle },
        !category.isActive && styles.categoryItemInactive,
      ]}
      testID={`category-item-${category.id}`}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Text style={styles.categoryIconText}>{category.icon}</Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text
          style={[
            styles.categoryName,
            { color: colors.text.primary },
            !category.isActive && {
              color: colors.text.tertiary,
              textDecorationLine: 'line-through',
            },
          ]}
        >
          {category.name}
        </Text>
        <View style={styles.categoryMeta}>
          <Text style={[styles.categoryCount, { color: colors.text.tertiary }]}>
            {t('categories.transactionCount', { count: category.transactionCount })}
          </Text>
          {showGroupBadge && category.type === 'expense' && category.expenseGroup && (
            <View
              style={[
                styles.expenseGroupBadge,
                {
                  backgroundColor:
                    category.expenseGroup === 'fixed'
                      ? colors.semantic.success.light
                      : colors.semantic.warning.light,
                },
              ]}
              testID={`expense-group-badge-${category.id}`}
            >
              <Text
                style={[
                  styles.expenseGroupBadgeText,
                  {
                    color:
                      category.expenseGroup === 'fixed'
                        ? colors.semantic.success.dark
                        : colors.semantic.warning.dark,
                  },
                ]}
              >
                {category.expenseGroup === 'fixed'
                  ? t('categories.fixedCost')
                  : t('categories.variableCost')}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.catActionButton}
          onPress={() => onEdit(category)}
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          testID={`edit-category-${category.id}`}
        >
          <Text style={styles.catActionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.catActionButton}
          onPress={() => onToggleActive(category)}
          accessibilityRole="button"
          accessibilityLabel={
            category.isActive ? t('categories.deactivate') : t('categories.activate')
          }
          testID={`toggle-category-${category.id}`}
        >
          <Text style={styles.catActionIcon}>{category.isActive ? '🚫' : '✅'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface CategoryFormModalProps {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (data: CreateCategoryDTO | UpdateCategoryDTO) => Promise<void>;
  isLoading: boolean;
}

function CategoryFormModal({
  visible,
  category,
  onClose,
  onSave,
  isLoading,
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isEditing = category !== null;

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? 'expense');
  const [icon, setIcon] = useState(category?.icon ?? '🏷️');
  const [color, setColor] = useState(category?.color ?? '#007AFF');
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup | null>(
    category?.expenseGroup ?? null
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const resetForm = useCallback(() => {
    setName(category?.name ?? '');
    setType(category?.type ?? 'expense');
    setIcon(category?.icon ?? '🏷️');
    setColor(category?.color ?? '#007AFF');
    setExpenseGroup(category?.expenseGroup ?? null);
    setShowIconPicker(false);
    setShowColorPicker(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const categoryId = category?.id ?? null;
  useEffect(() => {
    resetForm();
  }, [categoryId, resetForm]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('categories.nameRequired'));
      return;
    }
    const data: CreateCategoryDTO | UpdateCategoryDTO = {
      name: name.trim(),
      type,
      icon,
      color,
      expenseGroup: type === 'expense' ? expenseGroup : null,
    };
    await onSave(data);
  }, [name, type, icon, color, expenseGroup, onSave, t]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      testID="category-form-modal"
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
            <TouchableOpacity onPress={handleClose} testID="close-category-modal">
              <Text style={[styles.modalCancel, { color: colors.interactive.primary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {isEditing ? t('categories.editCategory') : t('categories.addCategory')}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !name.trim()}
              testID="save-category-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.interactive.primary} />
              ) : (
                <Text
                  style={[
                    styles.modalSave,
                    { color: colors.interactive.primary },
                    !name.trim() && { color: colors.interactive.disabled },
                  ]}
                >
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('categories.name')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background.secondary, color: colors.text.primary },
                ]}
                value={name}
                onChangeText={setName}
                placeholder={t('categories.namePlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                testID="category-name-input"
              />
            </View>

            {/* Type Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('categories.type')}
              </Text>
              <View style={[styles.typeSelector, { backgroundColor: colors.background.secondary }]}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'expense' && [
                      styles.typeOptionSelected,
                      { backgroundColor: colors.surface.card },
                    ],
                  ]}
                  onPress={() => setType('expense')}
                  testID="type-expense-button"
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: colors.text.tertiary },
                      type === 'expense' && {
                        color: colors.interactive.primary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {t('categories.expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'income' && [
                      styles.typeOptionSelected,
                      { backgroundColor: colors.surface.card },
                    ],
                  ]}
                  onPress={() => {
                    setType('income');
                    setExpenseGroup(null);
                  }}
                  testID="type-income-button"
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: colors.text.tertiary },
                      type === 'income' && { color: colors.interactive.primary, fontWeight: '600' },
                    ]}
                  >
                    {t('categories.income')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Expense Group Selector */}
            {type === 'expense' && (
              <View style={styles.formGroup} testID="expense-group-selector">
                <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                  {t('categories.expenseGroup')}
                </Text>
                <View
                  style={[styles.typeSelector, { backgroundColor: colors.background.secondary }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      expenseGroup === 'fixed' && [
                        styles.typeOptionSelected,
                        { backgroundColor: colors.surface.card },
                      ],
                    ]}
                    onPress={() => setExpenseGroup(expenseGroup === 'fixed' ? null : 'fixed')}
                    testID="expense-group-fixed-button"
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: colors.text.tertiary },
                        expenseGroup === 'fixed' && {
                          color: colors.semantic.success.base,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {t('categories.fixedCost')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      expenseGroup === 'variable' && [
                        styles.typeOptionSelected,
                        { backgroundColor: colors.surface.card },
                      ],
                    ]}
                    onPress={() => setExpenseGroup(expenseGroup === 'variable' ? null : 'variable')}
                    testID="expense-group-variable-button"
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: colors.text.tertiary },
                        expenseGroup === 'variable' && {
                          color: colors.semantic.success.base,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {t('categories.variableCost')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Icon Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('categories.icon')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.background.secondary }]}
                onPress={() => setShowIconPicker(!showIconPicker)}
                testID="icon-picker-button"
              >
                <View style={[styles.selectedIcon, { backgroundColor: color }]}>
                  <Text style={styles.selectedIconText}>{icon}</Text>
                </View>
                <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                  {t('categories.selectIcon')}
                </Text>
                <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
              </TouchableOpacity>
              {showIconPicker && (
                <View
                  style={[styles.pickerGrid, { backgroundColor: colors.background.secondary }]}
                  testID="icon-picker-grid"
                >
                  {CATEGORY_ICONS.map((iconOption) => (
                    <TouchableOpacity
                      key={iconOption}
                      style={[
                        styles.pickerItem,
                        icon === iconOption && { backgroundColor: colors.surface.card },
                      ]}
                      onPress={() => {
                        setIcon(iconOption);
                        setShowIconPicker(false);
                      }}
                      testID={`icon-option-${iconOption}`}
                    >
                      <Text style={styles.pickerItemText}>{iconOption}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Color Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('categories.color')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.background.secondary }]}
                onPress={() => setShowColorPicker(!showColorPicker)}
                testID="color-picker-button"
              >
                <View style={[styles.selectedColor, { backgroundColor: color }]} />
                <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                  {t('categories.selectColor')}
                </Text>
                <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
              </TouchableOpacity>
              {showColorPicker && (
                <View
                  style={[styles.pickerGrid, { backgroundColor: colors.background.secondary }]}
                  testID="color-picker-grid"
                >
                  {CATEGORY_COLORS.map((colorOption) => (
                    <TouchableOpacity
                      key={colorOption}
                      style={[
                        styles.colorItem,
                        { backgroundColor: colorOption },
                        color === colorOption && styles.colorItemSelected,
                      ]}
                      onPress={() => {
                        setColor(colorOption);
                        setShowColorPicker(false);
                      }}
                      testID={`color-option-${colorOption}`}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Preview */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('categories.preview')}
              </Text>
              <View
                style={[styles.previewContainer, { backgroundColor: colors.background.secondary }]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                  <Text style={styles.categoryIconText}>{icon}</Text>
                </View>
                <Text style={[styles.previewName, { color: colors.text.primary }]}>
                  {name || t('categories.namePlaceholder')}
                </Text>
                <Text
                  style={[
                    styles.previewType,
                    { color: colors.text.tertiary, backgroundColor: colors.border.default },
                  ]}
                >
                  {type === 'income' ? t('categories.income') : t('categories.expense')}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Main Category Management Screen
 */
export default function CategoriesSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    categoriesWithCounts,
    isLoading,
    error,
    create,
    update,
    deactivate,
    activate,
    deleteWithReplacement,
  } = useCategories({ includeInactive: true });

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseGroupFilter, setExpenseGroupFilter] = useState<ExpenseGroupFilter>('all');
  const [showReplacementPrompt, setShowReplacementPrompt] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);

  const incomeCategoriesWithCounts = useMemo(
    () => categoriesWithCounts.filter((c) => c.type === 'income'),
    [categoriesWithCounts]
  );
  const expenseCategoriesWithCounts = useMemo(
    () => categoriesWithCounts.filter((c) => c.type === 'expense'),
    [categoriesWithCounts]
  );
  const filteredExpenseCategoriesWithCounts = useMemo(() => {
    if (expenseGroupFilter === 'all') return expenseCategoriesWithCounts;
    return expenseCategoriesWithCounts.filter((c) => c.expenseGroup === expenseGroupFilter);
  }, [expenseCategoriesWithCounts, expenseGroupFilter]);

  const handleAddCategory = useCallback(() => {
    setEditingCategory(null);
    setShowFormModal(true);
  }, []);
  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowFormModal(true);
  }, []);

  const handleToggleActive = useCallback(
    async (category: Category) => {
      if (!category.isActive) {
        Alert.alert(
          t('categories.activate'),
          t('categories.activateConfirmation', { name: category.name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('categories.activate'),
              style: 'default',
              onPress: async () => {
                try {
                  await activate(category.id);
                } catch (_err) {
                  Alert.alert(t('common.error'), t('categories.toggleError'));
                }
              },
            },
          ]
        );
        return;
      }
      const categoryWithCount = categoriesWithCounts.find((c) => c.id === category.id);
      const transactionCount = categoryWithCount?.transactionCount ?? 0;
      if (transactionCount > 0) {
        setCategoryToDelete(categoryWithCount ?? null);
        setShowReplacementPrompt(true);
      } else {
        Alert.alert(
          t('categories.deactivate'),
          t('categories.deactivateConfirmation', { name: category.name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('categories.deactivate'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await deactivate(category.id);
                } catch (_err) {
                  Alert.alert(t('common.error'), t('categories.toggleError'));
                }
              },
            },
          ]
        );
      }
    },
    [deactivate, activate, categoriesWithCounts, t]
  );

  const handleReplacementChosen = useCallback(
    async (replacementCategoryId: string) => {
      if (!categoryToDelete) return;
      try {
        await deleteWithReplacement(categoryToDelete.id, replacementCategoryId);
      } catch (_err) {
        Alert.alert(t('common.error'), t('categories.toggleError'));
      } finally {
        setShowReplacementPrompt(false);
        setCategoryToDelete(null);
      }
    },
    [categoryToDelete, deleteWithReplacement, t]
  );

  const handleSoftDeleteWithoutReplacement = useCallback(async () => {
    if (!categoryToDelete) return;
    try {
      await deactivate(categoryToDelete.id);
    } catch (_err) {
      Alert.alert(t('common.error'), t('categories.toggleError'));
    } finally {
      setShowReplacementPrompt(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deactivate, t]);

  const handleReplacementCancel = useCallback(() => {
    setShowReplacementPrompt(false);
    setCategoryToDelete(null);
  }, []);

  const handleSaveCategory = useCallback(
    async (data: CreateCategoryDTO | UpdateCategoryDTO) => {
      setIsSaving(true);
      try {
        if (editingCategory) {
          await update(editingCategory.id, data);
        } else {
          await create(data as CreateCategoryDTO);
        }
        setShowFormModal(false);
        setEditingCategory(null);
      } catch (_err) {
        Alert.alert(t('common.error'), t('categories.saveError'));
      } finally {
        setIsSaving(false);
      }
    },
    [editingCategory, create, update, t]
  );

  const handleCloseModal = useCallback(() => {
    setShowFormModal(false);
    setEditingCategory(null);
  }, []);

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}
        testID="categories-loading"
      >
        <ActivityIndicator size="large" color={colors.interactive.primary} />
        <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background.secondary }]}
        testID="categories-error"
      >
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      contentContainerStyle={styles.contentContainer}
      testID="categories-settings-screen"
    >
      {/* Add Category Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.interactive.primary }]}
        onPress={handleAddCategory}
        accessibilityRole="button"
        accessibilityLabel={t('categories.addCategory')}
        testID="add-category-button"
      >
        <Text style={[styles.addIcon, { color: colors.text.inverse }]}>+</Text>
        <Text style={[styles.addText, { color: colors.text.inverse }]}>
          {t('categories.addCategory')}
        </Text>
      </TouchableOpacity>

      {/* Income Categories Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
          {t('categories.incomeCategories')}
        </Text>
        <View
          style={[
            styles.sectionContent,
            { backgroundColor: colors.surface.card, borderColor: colors.border.default },
          ]}
        >
          {incomeCategoriesWithCounts.length === 0 ? (
            <View style={styles.emptyState} testID="income-categories-empty">
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                {t('categories.noCategories')}
              </Text>
            </View>
          ) : (
            incomeCategoriesWithCounts.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </View>
      </View>

      {/* Expense Categories Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
          {t('categories.expenseCategories')}
        </Text>

        {/* Expense Group Filter Tabs */}
        <View
          style={[styles.filterContainer, { backgroundColor: colors.background.secondary }]}
          testID="expense-group-filter"
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              expenseGroupFilter === 'all' && [
                styles.filterTabActive,
                { backgroundColor: colors.surface.card },
              ],
            ]}
            onPress={() => setExpenseGroupFilter('all')}
            accessibilityRole="button"
            accessibilityState={{ selected: expenseGroupFilter === 'all' }}
            testID="filter-tab-all"
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.text.tertiary },
                expenseGroupFilter === 'all' && {
                  color: colors.interactive.primary,
                  fontWeight: '600',
                },
              ]}
            >
              {t('categories.filterAll', { defaultValue: 'Todos' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              expenseGroupFilter === 'fixed' && [
                styles.filterTabActive,
                { backgroundColor: colors.surface.card },
              ],
            ]}
            onPress={() => setExpenseGroupFilter('fixed')}
            accessibilityRole="button"
            accessibilityState={{ selected: expenseGroupFilter === 'fixed' }}
            testID="filter-tab-fixed"
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.text.tertiary },
                expenseGroupFilter === 'fixed' && {
                  color: colors.interactive.primary,
                  fontWeight: '600',
                },
              ]}
            >
              {t('categories.fixedCost')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              expenseGroupFilter === 'variable' && [
                styles.filterTabActive,
                { backgroundColor: colors.surface.card },
              ],
            ]}
            onPress={() => setExpenseGroupFilter('variable')}
            accessibilityRole="button"
            accessibilityState={{ selected: expenseGroupFilter === 'variable' }}
            testID="filter-tab-variable"
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.text.tertiary },
                expenseGroupFilter === 'variable' && {
                  color: colors.interactive.primary,
                  fontWeight: '600',
                },
              ]}
            >
              {t('categories.variableCost')}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.sectionContent,
            { backgroundColor: colors.surface.card, borderColor: colors.border.default },
          ]}
        >
          {filteredExpenseCategoriesWithCounts.length === 0 ? (
            <View style={styles.emptyState} testID="expense-categories-empty">
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                {t('categories.noCategories')}
              </Text>
            </View>
          ) : (
            filteredExpenseCategoriesWithCounts.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onToggleActive={handleToggleActive}
                showGroupBadge={expenseGroupFilter === 'all'}
              />
            ))
          )}
        </View>
      </View>

      <CategoryFormModal
        visible={showFormModal}
        category={editingCategory}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        isLoading={isSaving}
      />
      {categoryToDelete && (
        <ReplacementPrompt
          category={categoryToDelete}
          transactionCount={categoryToDelete.transactionCount}
          onReplace={handleReplacementChosen}
          onSoftDelete={handleSoftDeleteWithoutReplacement}
          onCancel={handleReplacementCancel}
          visible={showReplacementPrompt}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  errorIcon: {
    fontSize: spacing['3xl'],
    marginBottom: spacing.base,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addIcon: {
    fontSize: spacing.lg,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  addText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyIcon: {
    fontSize: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.caption.fontSize + 1,
  },
  // Category Item styles
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryItemInactive: {
    opacity: 0.5,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIconText: {
    fontSize: spacing.lg,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryCount: {
    fontSize: typography.caption.fontSize,
  },
  expenseGroupBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: spacing.xs,
  },
  expenseGroupBadgeText: {
    fontSize: typography.overline.fontSize,
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  catActionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  catActionIcon: {
    fontSize: 18,
  },
  // Filter tabs styles
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  filterTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: typography.body.fontSize + 1,
  },
  modalSave: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
  formContainer: {
    padding: spacing.base,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeOptionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: typography.caption.fontSize + 2,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  selectedIcon: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  selectedIconText: {
    fontSize: 18,
  },
  selectedColor: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: 6,
    marginRight: spacing.md,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: typography.body.fontSize,
  },
  chevron: {
    fontSize: spacing.lg,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  pickerItem: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  pickerItemText: {
    fontSize: spacing.xl,
  },
  colorItem: {
    width: '16.66%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    margin: '0.83%',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  previewName: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginLeft: spacing.md,
  },
  previewType: {
    fontSize: typography.caption.fontSize,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
});
