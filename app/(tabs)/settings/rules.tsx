/**
 * Categorization Rules Screen
 *
 * Manage automatic categorization rules:
 * - View all rules with associated categories
 * - Create new rules with pattern, match type, category, and priority
 * - Edit existing rules
 * - Delete rules
 *
 * **Validates: Requirements 18, 27, 30, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
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
import {
  useCategorizationRules,
  type CategorizationRuleWithCategory,
} from '../../../src/hooks/useCategorizationRules';
import { useCategories } from '../../../src/hooks/useCategories';
import { CategorySelector } from '../../../src/components/CategorySelector';
import type {
  CategorizationRule,
  CreateCategorizationRuleDTO,
  UpdateCategorizationRuleDTO,
  MatchType,
  Category,
} from '../../../src/types';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';

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
  const colors = useThemeColors();
  const matchTypeLabel =
    MATCH_TYPE_OPTIONS.find((opt) => opt.value === rule.matchType)?.labelKey ??
    'rules.matchContains';

  return (
    <View
      style={[
        styles.ruleItem,
        { borderBottomColor: colors.border.subtle },
        !rule.isActive && styles.ruleItemInactive,
      ]}
      testID={`rule-item-${rule.id}`}
    >
      <View style={styles.ruleContent}>
        <View style={styles.ruleHeader}>
          <Text style={[styles.rulePattern, { color: colors.text.primary }]} numberOfLines={1}>
            "{rule.pattern}"
          </Text>
          <Text
            style={[
              styles.rulePriority,
              { color: colors.text.tertiary, backgroundColor: colors.background.secondary },
            ]}
          >
            #{rule.priority}
          </Text>
        </View>
        <View style={styles.ruleDetails}>
          <Text style={[styles.ruleMatchType, { color: colors.text.tertiary }]}>
            {t(matchTypeLabel)}
          </Text>
          <Text style={[styles.ruleArrow, { color: colors.text.tertiary }]}>→</Text>
          {rule.category ? (
            <View style={styles.ruleCategoryBadge}>
              <View style={[styles.categoryDot, { backgroundColor: rule.category.color }]} />
              <Text style={[styles.ruleCategoryName, { color: colors.text.primary }]}>
                {rule.category.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.ruleCategoryMissing, { color: colors.semantic.danger.base }]}>
              {t('rules.categoryDeleted')}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.ruleActions}>
        <TouchableOpacity
          style={styles.ruleActionButton}
          onPress={() => onEdit(rule)}
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          testID={`edit-rule-${rule.id}`}
        >
          <Text style={styles.ruleActionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ruleActionButton}
          onPress={() => onDelete(rule)}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          testID={`delete-rule-${rule.id}`}
        >
          <Text style={styles.ruleActionIcon}>🗑️</Text>
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
  const colors = useThemeColors();
  const isEditing = rule !== null;

  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? 'contains');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [priority, setPriority] = useState(rule?.priority?.toString() ?? '0');
  const [showMatchTypePicker, setShowMatchTypePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const resetForm = useCallback(() => {
    setPattern(rule?.pattern ?? '');
    setMatchType(rule?.matchType ?? 'contains');
    setCategoryId(rule?.categoryId ?? '');
    setPriority(rule?.priority?.toString() ?? '0');
    setShowMatchTypePicker(false);
    setShowCategoryPicker(false);
  }, [rule]);

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
      <View style={[styles.modalOverlay, { backgroundColor: colors.surface.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
            <TouchableOpacity onPress={handleClose} testID="close-rule-modal">
              <Text style={[styles.modalCancel, { color: colors.interactive.primary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {isEditing ? t('rules.editRule') : t('rules.addRule')}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !pattern.trim() || !categoryId}
              testID="save-rule-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.interactive.primary} />
              ) : (
                <Text
                  style={[
                    styles.modalSave,
                    { color: colors.interactive.primary },
                    (!pattern.trim() || !categoryId) && { color: colors.interactive.disabled },
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
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('rules.pattern')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background.secondary, color: colors.text.primary },
                ]}
                value={pattern}
                onChangeText={setPattern}
                placeholder={t('rules.patternPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                testID="rule-pattern-input"
              />
              <Text style={[styles.formHint, { color: colors.text.tertiary }]}>
                {t('rules.patternHint')}
              </Text>
            </View>

            {/* Match Type Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('rules.matchType')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.background.secondary }]}
                onPress={() => setShowMatchTypePicker(!showMatchTypePicker)}
                testID="match-type-picker-button"
              >
                <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                  {t(
                    MATCH_TYPE_OPTIONS.find((opt) => opt.value === matchType)?.labelKey ??
                      'rules.matchContains'
                  )}
                </Text>
                <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
              </TouchableOpacity>
              {showMatchTypePicker && (
                <View
                  style={[styles.pickerOptions, { backgroundColor: colors.background.secondary }]}
                  testID="match-type-picker"
                >
                  {MATCH_TYPE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        { borderBottomColor: colors.border.subtle },
                        matchType === option.value && { backgroundColor: colors.surface.card },
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
                          { color: colors.text.primary },
                          matchType === option.value && {
                            color: colors.interactive.primary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                      {matchType === option.value && (
                        <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Category Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('rules.category')}
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.background.secondary }]}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                testID="category-picker-button"
              >
                {selectedCategory ? (
                  <View style={styles.selectedCategoryContainer}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]}
                    />
                    <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.pickerPlaceholder, { color: colors.text.tertiary }]}>
                    {t('rules.selectCategory')}
                  </Text>
                )}
                <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
              </TouchableOpacity>
              {showCategoryPicker && (
                <View
                  style={[
                    styles.categoryPickerContainer,
                    { backgroundColor: colors.background.secondary },
                  ]}
                  testID="category-picker"
                >
                  <CategorySelector
                    selectedCategoryId={categoryId || null}
                    onSelect={(category: Category) => {
                      setCategoryId(category.id);
                      setShowCategoryPicker(false);
                    }}
                    includeIncome
                    testID="category-selector"
                  />
                </View>
              )}
            </View>

            {/* Priority Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                {t('rules.priority')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background.secondary, color: colors.text.primary },
                ]}
                value={priority}
                onChangeText={setPriority}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                testID="rule-priority-input"
              />
              <Text style={[styles.formHint, { color: colors.text.tertiary }]}>
                {t('rules.priorityHint')}
              </Text>
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
  const colors = useThemeColors();
  const { rules, isLoading, error, create, update, remove } = useCategorizationRules();
  const { categories } = useCategories();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddRule = useCallback(() => {
    setEditingRule(null);
    setShowFormModal(true);
  }, []);
  const handleEditRule = useCallback((rule: CategorizationRule) => {
    setEditingRule(rule);
    setShowFormModal(true);
  }, []);

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

  const handleCloseModal = useCallback(() => {
    setShowFormModal(false);
    setEditingRule(null);
  }, []);

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}
        testID="rules-loading"
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
        testID="rules-error"
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
      testID="rules-settings-screen"
    >
      {/* Add Rule Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.interactive.primary }]}
        onPress={handleAddRule}
        accessibilityRole="button"
        accessibilityLabel={t('rules.addRule')}
        testID="add-rule-button"
      >
        <Text style={[styles.addIcon, { color: colors.text.inverse }]}>+</Text>
        <Text style={[styles.addText, { color: colors.text.inverse }]}>{t('rules.addRule')}</Text>
      </TouchableOpacity>

      {/* Rules List Section */}
      <View style={styles.section}>
        <View
          style={[
            styles.sectionContent,
            { backgroundColor: colors.surface.card, borderColor: colors.border.default },
          ]}
        >
          {rules.length === 0 ? (
            <View style={styles.emptyState} testID="rules-empty">
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                {t('rules.noRules')}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.text.tertiary }]}>
                {t('settings.rulesDescription')}
              </Text>
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
        <Text style={[styles.helpTitle, { color: colors.text.secondary }]}>
          {t('rules.matchTypeHelp')}
        </Text>
        <View style={[styles.helpContent, { backgroundColor: colors.surface.card }]}>
          {MATCH_TYPE_OPTIONS.map((option) => (
            <View key={option.value} style={styles.helpItem}>
              <Text style={[styles.helpLabel, { color: colors.text.primary }]}>
                {t(option.labelKey)}
              </Text>
              <Text style={[styles.helpDescription, { color: colors.text.tertiary }]}>
                {t(`rules.${option.value}Description`)}
              </Text>
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
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: spacing['2xl'],
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.caption.fontSize + 1,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    fontSize: typography.overline.fontSize + 1,
    textAlign: 'center',
  },
  // Rule Item styles
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginBottom: spacing.xs,
  },
  rulePattern: {
    flex: 1,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  rulePriority: {
    fontSize: typography.overline.fontSize + 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: spacing.xs,
    marginLeft: spacing.sm,
  },
  ruleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleMatchType: {
    fontSize: typography.overline.fontSize + 1,
  },
  ruleArrow: {
    fontSize: typography.overline.fontSize + 1,
    marginHorizontal: spacing.sm,
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
    fontSize: typography.overline.fontSize + 1,
  },
  ruleCategoryMissing: {
    fontSize: typography.overline.fontSize + 1,
    fontStyle: 'italic',
  },
  ruleActions: {
    flexDirection: 'row',
  },
  ruleActionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  ruleActionIcon: {
    fontSize: 18,
  },
  // Help Section styles
  helpSection: {
    marginHorizontal: spacing.base,
  },
  helpTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  helpContent: {
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  helpItem: {
    marginBottom: spacing.md,
  },
  helpLabel: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: typography.overline.fontSize + 1,
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
  formHint: {
    fontSize: typography.overline.fontSize + 1,
    marginTop: spacing.xs,
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: typography.body.fontSize,
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: typography.body.fontSize,
  },
  chevron: {
    fontSize: spacing.lg,
  },
  pickerOptions: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: {
    fontSize: typography.body.fontSize,
  },
  checkmark: {
    fontSize: typography.body.fontSize + 1,
    fontWeight: '600',
  },
  selectedCategoryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryPickerContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    maxHeight: 200,
  },
});
