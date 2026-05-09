/**
 * Category Management Screen
 *
 * Manage transaction categories:
 * - View all categories grouped by type (income/expense)
 * - Create new categories with name, type, icon, and color
 * - Edit existing categories
 * - Deactivate/activate categories (soft delete)
 *
 * **Validates: Requirements 17, 27, 30**
 */
import { useState, useCallback, useMemo } from 'react';
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
import type {
  Category,
  CategoryType,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../../src/types';

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

/**
 * Category item component
 */
interface CategoryItemProps {
  category: CategoryWithCount;
  onEdit: (category: Category) => void;
  onToggleActive: (category: Category) => void;
}

function CategoryItem({ category, onEdit, onToggleActive }: CategoryItemProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[styles.categoryItem, !category.isActive && styles.categoryItemInactive]}
      testID={`category-item-${category.id}`}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Text style={styles.categoryIconText}>{category.icon}</Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, !category.isActive && styles.categoryNameInactive]}>
          {category.name}
        </Text>
        <Text style={styles.categoryCount}>
          {t('categories.transactionCount', { count: category.transactionCount })}
        </Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(category)}
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          testID={`edit-category-${category.id}`}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onToggleActive(category)}
          accessibilityRole="button"
          accessibilityLabel={
            category.isActive ? t('categories.deactivate') : t('categories.activate')
          }
          testID={`toggle-category-${category.id}`}
        >
          <Text style={styles.actionIcon}>{category.isActive ? '🚫' : '✅'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Category form modal component
 */
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
  const isEditing = category !== null;

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? 'expense');
  const [icon, setIcon] = useState(category?.icon ?? '🏷️');
  const [color, setColor] = useState(category?.color ?? '#007AFF');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Reset form when modal opens with new category
  const resetForm = useCallback(() => {
    setName(category?.name ?? '');
    setType(category?.type ?? 'expense');
    setIcon(category?.icon ?? '🏷️');
    setColor(category?.color ?? '#007AFF');
    setShowIconPicker(false);
    setShowColorPicker(false);
  }, [category]);

  // Reset when category changes
  useState(() => {
    resetForm();
  });

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
    };

    await onSave(data);
  }, [name, type, icon, color, onSave, t]);

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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} testID="close-category-modal">
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? t('categories.editCategory') : t('categories.addCategory')}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !name.trim()}
              testID="save-category-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={[styles.modalSave, !name.trim() && styles.modalSaveDisabled]}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.name')}</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={t('categories.namePlaceholder')}
                placeholderTextColor="#C7C7CC"
                autoFocus
                testID="category-name-input"
              />
            </View>

            {/* Type Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.type')}</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeOption, type === 'expense' && styles.typeOptionSelected]}
                  onPress={() => setType('expense')}
                  testID="type-expense-button"
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      type === 'expense' && styles.typeOptionTextSelected,
                    ]}
                  >
                    {t('categories.expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, type === 'income' && styles.typeOptionSelected]}
                  onPress={() => setType('income')}
                  testID="type-income-button"
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      type === 'income' && styles.typeOptionTextSelected,
                    ]}
                  >
                    {t('categories.income')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Icon Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.icon')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowIconPicker(!showIconPicker)}
                testID="icon-picker-button"
              >
                <View style={[styles.selectedIcon, { backgroundColor: color }]}>
                  <Text style={styles.selectedIconText}>{icon}</Text>
                </View>
                <Text style={styles.pickerButtonText}>{t('categories.selectIcon')}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {showIconPicker && (
                <View style={styles.pickerGrid} testID="icon-picker-grid">
                  {CATEGORY_ICONS.map((iconOption) => (
                    <TouchableOpacity
                      key={iconOption}
                      style={[styles.pickerItem, icon === iconOption && styles.pickerItemSelected]}
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
              <Text style={styles.formLabel}>{t('categories.color')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowColorPicker(!showColorPicker)}
                testID="color-picker-button"
              >
                <View style={[styles.selectedColor, { backgroundColor: color }]} />
                <Text style={styles.pickerButtonText}>{t('categories.selectColor')}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {showColorPicker && (
                <View style={styles.pickerGrid} testID="color-picker-grid">
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
              <Text style={styles.formLabel}>{t('categories.preview')}</Text>
              <View style={styles.previewContainer}>
                <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                  <Text style={styles.categoryIconText}>{icon}</Text>
                </View>
                <Text style={styles.previewName}>{name || t('categories.namePlaceholder')}</Text>
                <Text style={styles.previewType}>
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
  const {
    categoriesWithCounts,
    incomeCategories,
    expenseCategories,
    isLoading,
    error,
    create,
    update,
    deactivate,
    activate,
  } = useCategories({ includeInactive: true });

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Separate categories by type with counts
  const incomeCategoriesWithCounts = useMemo(
    () => categoriesWithCounts.filter((c) => c.type === 'income'),
    [categoriesWithCounts]
  );

  const expenseCategoriesWithCounts = useMemo(
    () => categoriesWithCounts.filter((c) => c.type === 'expense'),
    [categoriesWithCounts]
  );

  /**
   * Handle opening the create form
   */
  const handleAddCategory = useCallback(() => {
    setEditingCategory(null);
    setShowFormModal(true);
  }, []);

  /**
   * Handle opening the edit form
   */
  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowFormModal(true);
  }, []);

  /**
   * Handle toggling category active state
   */
  const handleToggleActive = useCallback(
    async (category: Category) => {
      const action = category.isActive ? t('categories.deactivate') : t('categories.activate');
      const message = category.isActive
        ? t('categories.deactivateConfirmation', { name: category.name })
        : t('categories.activateConfirmation', { name: category.name });

      Alert.alert(action, message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: action,
          style: category.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (category.isActive) {
                await deactivate(category.id);
              } else {
                await activate(category.id);
              }
            } catch (err) {
              Alert.alert(t('common.error'), t('categories.toggleError'));
            }
          },
        },
      ]);
    },
    [deactivate, activate, t]
  );

  /**
   * Handle saving a category (create or update)
   */
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
      } catch (err) {
        Alert.alert(t('common.error'), t('categories.saveError'));
      } finally {
        setIsSaving(false);
      }
    },
    [editingCategory, create, update, t]
  );

  /**
   * Handle closing the form modal
   */
  const handleCloseModal = useCallback(() => {
    setShowFormModal(false);
    setEditingCategory(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="categories-loading">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer} testID="categories-error">
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="categories-settings-screen"
    >
      {/* Add Category Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddCategory}
        accessibilityRole="button"
        accessibilityLabel={t('categories.addCategory')}
        testID="add-category-button"
      >
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addText}>{t('categories.addCategory')}</Text>
      </TouchableOpacity>

      {/* Income Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('categories.incomeCategories')}</Text>
        <View style={styles.sectionContent}>
          {incomeCategoriesWithCounts.length === 0 ? (
            <View style={styles.emptyState} testID="income-categories-empty">
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>{t('categories.noCategories')}</Text>
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
        <Text style={styles.sectionTitle}>{t('categories.expenseCategories')}</Text>
        <View style={styles.sectionContent}>
          {expenseCategoriesWithCounts.length === 0 ? (
            <View style={styles.emptyState} testID="expense-categories-empty">
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyText}>{t('categories.noCategories')}</Text>
            </View>
          ) : (
            expenseCategoriesWithCounts.map((category) => (
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

      {/* Category Form Modal */}
      <CategoryFormModal
        visible={showFormModal}
        category={editingCategory}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        isLoading={isSaving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 8,
  },
  addText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // Category Item styles
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  categoryItemInactive: {
    opacity: 0.5,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  categoryNameInactive: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  categoryCount: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalSave: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalSaveDisabled: {
    color: '#C7C7CC',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  typeOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedIconText: {
    fontSize: 18,
  },
  selectedColor: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 8,
  },
  pickerItem: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#FFFFFF',
  },
  pickerItemText: {
    fontSize: 24,
  },
  colorItem: {
    width: '16.66%',
    aspectRatio: 1,
    borderRadius: 8,
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
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 16,
  },
  previewName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 12,
  },
  previewType: {
    fontSize: 13,
    color: '#8E8E93',
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
