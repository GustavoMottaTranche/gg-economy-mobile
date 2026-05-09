/**
 * Categorization Rules Screen
 *
 * Manage automatic categorization rules:
 * - View all rules with associated categories
 * - Create new rules with pattern, match type, category, and priority
 * - Edit existing rules
 * - Delete rules
 *
 * **Validates: Requirements 18, 27, 30**
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
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useCategorizationRules,
  type CategorizationRuleWithCategory,
} from '../../../src/hooks/useCategorizationRules';
import { useCategories } from '../../../src/hooks/useCategories';
import type {
  CategorizationRule,
  CreateCategorizationRuleDTO,
  UpdateCategorizationRuleDTO,
  MatchType,
  Category,
} from '../../../src/types';

/**
 * Match type options
 */
const MATCH_TYPE_OPTIONS: { value: MatchType; labelKey: string }[] = [
  { value: 'contains', labelKey: 'rules.matchContains' },
  { value: 'starts_with', labelKey: 'rules.matchStartsWith' },
  { value: 'ends_with', labelKey: 'rules.matchEndsWith' },
  { value: 'exact', labelKey: 'rules.matchExact' },
  { value: 'regex', labelKey: 'rules.matchRegex' },
];

/**
 * Rule item component
 */
interface RuleItemProps {
  rule: CategorizationRuleWithCategory;
  onEdit: (rule: CategorizationRule) => void;
  onDelete: (rule: CategorizationRule) => void;
  t: (key: string) => string;
}

function RuleItem({ rule, onEdit, onDelete, t }: RuleItemProps) {
  const matchTypeLabel =
    MATCH_TYPE_OPTIONS.find((opt) => opt.value === rule.matchType)?.labelKey ??
    'rules.matchContains';

  return (
    <View
      style={[styles.ruleItem, !rule.isActive && styles.ruleItemInactive]}
      testID={`rule-item-${rule.id}`}
    >
      <View style={styles.ruleContent}>
        <View style={styles.ruleHeader}>
          <Text style={styles.rulePattern} numberOfLines={1}>
            "{rule.pattern}"
          </Text>
          <Text style={styles.rulePriority}>#{rule.priority}</Text>
        </View>
        <View style={styles.ruleDetails}>
          <Text style={styles.ruleMatchType}>{t(matchTypeLabel)}</Text>
          <Text style={styles.ruleArrow}>→</Text>
          {rule.category ? (
            <View style={styles.ruleCategoryBadge}>
              <View style={[styles.categoryDot, { backgroundColor: rule.category.color }]} />
              <Text style={styles.ruleCategoryName}>{rule.category.name}</Text>
            </View>
          ) : (
            <Text style={styles.ruleCategoryMissing}>{t('rules.categoryDeleted')}</Text>
          )}
        </View>
      </View>
      <View style={styles.ruleActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(rule)}
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          testID={`edit-rule-${rule.id}`}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(rule)}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          testID={`delete-rule-${rule.id}`}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Rule form modal component
 */
interface RuleFormModalProps {
  visible: boolean;
  rule: CategorizationRule | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: CreateCategorizationRuleDTO | UpdateCategorizationRuleDTO) => Promise<void>;
  isLoading: boolean;
}

function RuleFormModal({
  visible,
  rule,
  categories,
  onClose,
  onSave,
  isLoading,
}: RuleFormModalProps) {
  const { t } = useTranslation();
  const isEditing = rule !== null;

  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? 'contains');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [priority, setPriority] = useState(rule?.priority?.toString() ?? '0');
  const [showMatchTypePicker, setShowMatchTypePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Reset form when modal opens with new rule
  const resetForm = useCallback(() => {
    setPattern(rule?.pattern ?? '');
    setMatchType(rule?.matchType ?? 'contains');
    setCategoryId(rule?.categoryId ?? '');
    setPriority(rule?.priority?.toString() ?? '0');
    setShowMatchTypePicker(false);
    setShowCategoryPicker(false);
  }, [rule]);

  // Reset when rule changes
  useState(() => {
    resetForm();
  });

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const handleSave = useCallback(async () => {
    if (!pattern.trim()) {
      Alert.alert(t('common.error'), t('rules.patternRequired'));
      return;
    }
    if (!categoryId) {
      Alert.alert(t('common.error'), t('rules.categoryRequired'));
      return;
    }

    const data: CreateCategorizationRuleDTO | UpdateCategorizationRuleDTO = {
      pattern: pattern.trim(),
      matchType,
      categoryId,
      priority: parseInt(priority, 10) || 0,
    };

    await onSave(data);
  }, [pattern, matchType, categoryId, priority, onSave, t]);

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
      testID="rule-form-modal"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} testID="close-rule-modal">
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? t('rules.editRule') : t('rules.addRule')}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !pattern.trim() || !categoryId}
              testID="save-rule-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text
                  style={[
                    styles.modalSave,
                    (!pattern.trim() || !categoryId) && styles.modalSaveDisabled,
                  ]}
                >
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Pattern Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('rules.pattern')}</Text>
              <TextInput
                style={styles.textInput}
                value={pattern}
                onChangeText={setPattern}
                placeholder={t('rules.patternPlaceholder')}
                placeholderTextColor="#C7C7CC"
                autoFocus
                testID="rule-pattern-input"
              />
              <Text style={styles.formHint}>{t('rules.patternHint')}</Text>
            </View>

            {/* Match Type Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('rules.matchType')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowMatchTypePicker(!showMatchTypePicker)}
                testID="match-type-picker-button"
              >
                <Text style={styles.pickerButtonText}>
                  {t(
                    MATCH_TYPE_OPTIONS.find((opt) => opt.value === matchType)?.labelKey ??
                      'rules.matchContains'
                  )}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {showMatchTypePicker && (
                <View style={styles.pickerOptions} testID="match-type-picker">
                  {MATCH_TYPE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        matchType === option.value && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setMatchType(option.value);
                        setShowMatchTypePicker(false);
                      }}
                      testID={`match-type-option-${option.value}`}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          matchType === option.value && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                      {matchType === option.value && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Category Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('rules.category')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                testID="category-picker-button"
              >
                {selectedCategory ? (
                  <View style={styles.selectedCategoryContainer}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]}
                    />
                    <Text style={styles.pickerButtonText}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.pickerPlaceholder}>{t('rules.selectCategory')}</Text>
                )}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.categoryPickerContainer} testID="category-picker">
                  <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerOption,
                          categoryId === item.id && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          setCategoryId(item.id);
                          setShowCategoryPicker(false);
                        }}
                        testID={`category-option-${item.id}`}
                      >
                        <View style={styles.categoryOptionContent}>
                          <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                          <Text
                            style={[
                              styles.pickerOptionText,
                              categoryId === item.id && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.categoryType}>
                            {item.type === 'income' ? '💰' : '💸'}
                          </Text>
                        </View>
                        {categoryId === item.id && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    )}
                    style={styles.categoryList}
                  />
                </View>
              )}
            </View>

            {/* Priority Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('rules.priority')}</Text>
              <TextInput
                style={styles.textInput}
                value={priority}
                onChangeText={setPriority}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                testID="rule-priority-input"
              />
              <Text style={styles.formHint}>{t('rules.priorityHint')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Main Rules Management Screen
 */
export default function RulesSettingsScreen() {
  const { t } = useTranslation();
  const { rules, isLoading, error, create, update, remove } = useCategorizationRules();
  const { categories } = useCategories();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle opening the create form
   */
  const handleAddRule = useCallback(() => {
    setEditingRule(null);
    setShowFormModal(true);
  }, []);

  /**
   * Handle opening the edit form
   */
  const handleEditRule = useCallback((rule: CategorizationRule) => {
    setEditingRule(rule);
    setShowFormModal(true);
  }, []);

  /**
   * Handle deleting a rule
   */
  const handleDeleteRule = useCallback(
    (rule: CategorizationRule) => {
      Alert.alert(t('rules.deleteRule'), t('rules.deleteConfirmation', { pattern: rule.pattern }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(rule.id);
            } catch (err) {
              Alert.alert(t('common.error'), t('rules.deleteError'));
            }
          },
        },
      ]);
    },
    [remove, t]
  );

  /**
   * Handle saving a rule (create or update)
   */
  const handleSaveRule = useCallback(
    async (data: CreateCategorizationRuleDTO | UpdateCategorizationRuleDTO) => {
      setIsSaving(true);
      try {
        if (editingRule) {
          await update(editingRule.id, data);
        } else {
          await create(data as CreateCategorizationRuleDTO);
        }
        setShowFormModal(false);
        setEditingRule(null);
      } catch (err) {
        Alert.alert(t('common.error'), t('rules.saveError'));
      } finally {
        setIsSaving(false);
      }
    },
    [editingRule, create, update, t]
  );

  /**
   * Handle closing the form modal
   */
  const handleCloseModal = useCallback(() => {
    setShowFormModal(false);
    setEditingRule(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="rules-loading">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer} testID="rules-error">
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="rules-settings-screen"
    >
      {/* Add Rule Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddRule}
        accessibilityRole="button"
        accessibilityLabel={t('rules.addRule')}
        testID="add-rule-button"
      >
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addText}>{t('rules.addRule')}</Text>
      </TouchableOpacity>

      {/* Rules List Section */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          {rules.length === 0 ? (
            <View style={styles.emptyState} testID="rules-empty">
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{t('rules.noRules')}</Text>
              <Text style={styles.emptyHint}>{t('settings.rulesDescription')}</Text>
            </View>
          ) : (
            rules.map((rule) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                t={t}
              />
            ))
          )}
        </View>
      </View>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>{t('rules.matchTypeHelp')}</Text>
        <View style={styles.helpContent}>
          {MATCH_TYPE_OPTIONS.map((option) => (
            <View key={option.value} style={styles.helpItem}>
              <Text style={styles.helpLabel}>{t(option.labelKey)}</Text>
              <Text style={styles.helpDescription}>{t(`rules.${option.value}Description`)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Rule Form Modal */}
      <RuleFormModal
        visible={showFormModal}
        rule={editingRule}
        categories={categories}
        onClose={handleCloseModal}
        onSave={handleSaveRule}
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
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  // Rule Item styles
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  ruleItemInactive: {
    opacity: 0.5,
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rulePattern: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  rulePriority: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  ruleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleMatchType: {
    fontSize: 12,
    color: '#8E8E93',
  },
  ruleArrow: {
    fontSize: 12,
    color: '#C7C7CC',
    marginHorizontal: 8,
  },
  ruleCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  ruleCategoryName: {
    fontSize: 12,
    color: '#000000',
  },
  ruleCategoryMissing: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  ruleActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 18,
  },
  // Help Section styles
  helpSection: {
    marginHorizontal: 16,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  helpContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
  },
  helpItem: {
    marginBottom: 12,
  },
  helpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: 12,
    color: '#8E8E93',
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
  formHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#C7C7CC',
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pickerOptionSelected: {
    backgroundColor: '#FFFFFF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedCategoryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryPickerContainer: {
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 200,
  },
  categoryList: {
    maxHeight: 200,
  },
  categoryOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryType: {
    fontSize: 12,
    marginLeft: 8,
  },
});
