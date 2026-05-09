/**
 * ManualEntryForm Component
 *
 * Form for manual transaction entry with fields for:
 * - Date picker (Requirement 15.2)
 * - Amount input (Requirement 15.2)
 * - Description text input (Requirement 15.2)
 * - Category selector (Requirement 15.2)
 * - Duplicate detection warning (Requirements 15.10, 15.11)
 *
 * **Validates: Requirements 15.1, 15.2, 15.10, 15.11**
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useCategories';
import type { CreateTransactionDTO } from '../../types/transaction';
import type { Category } from '../../types/category';
import type { DuplicateResult } from '../../services/import/DedupeEngine';

/**
 * Props for the ManualEntryForm component
 */
export interface ManualEntryFormProps {
  /** Callback when transaction is saved */
  onSave: (transaction: CreateTransactionDTO) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Default category ID (last used) */
  defaultCategoryId?: string;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Whether duplicate check is in progress */
  isCheckingDuplicate?: boolean;
  /** Potential duplicate warning from dedupe check */
  duplicateWarning?: DuplicateResult | null;
  /** Callback when user confirms save despite duplicate */
  onConfirmDuplicate?: () => void;
  /** Callback when user cancels due to duplicate */
  onCancelDuplicate?: () => void;
}

/**
 * Form state for manual entry
 */
export interface ManualEntryFormState {
  date: Date;
  amount: string;
  description: string;
  categoryId: string | null;
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Formats a date for display
 */
function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats amount for display (converts cents to currency string)
 */
function formatAmountDisplay(value: string): string {
  // Remove non-numeric characters except minus and decimal
  const cleaned = value.replace(/[^\d.,-]/g, '');
  return cleaned;
}

/**
 * Parses amount string to cents (integer)
 */
function parseAmountToCents(value: string): number | null {
  // Replace comma with dot for decimal parsing
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return null;
  }

  // Convert to cents (multiply by 100 and round)
  return Math.round(parsed * 100);
}

/**
 * Gets the reference month from a date (YYYY-MM format)
 */
function getReferenceMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats amount from cents to display string
 */
function formatAmountFromCents(cents: number, locale: string): string {
  const value = cents / 100;
  return value.toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Category item component for the selector
 */
const CategoryItem = memo(function CategoryItem({
  category,
  isSelected,
  onSelect,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  const handlePress = useCallback(() => {
    onSelect(category.id);
  }, [category.id, onSelect]);

  return (
    <TouchableOpacity
      style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`category-item-${category.id}`}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Text style={styles.categoryIconText}>{category.icon}</Text>
      </View>
      <Text
        style={[styles.categoryName, isSelected && styles.categoryNameSelected]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      {isSelected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
});

/**
 * ManualEntryForm component
 *
 * Provides a form for manual transaction entry accessible from the import screen.
 * Includes fields for date, amount, description, and category.
 *
 * @example
 * ```tsx
 * <ManualEntryForm
 *   onSave={(transaction) => handleSave(transaction)}
 *   onCancel={() => navigation.goBack()}
 *   defaultCategoryId="category-123"
 * />
 * ```
 */
function ManualEntryFormComponent({
  onSave,
  onCancel,
  defaultCategoryId,
  isSaving = false,
  isCheckingDuplicate = false,
  duplicateWarning = null,
  onConfirmDuplicate,
  onCancelDuplicate,
}: ManualEntryFormProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { categories } = useCategories();

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI state
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  // Determine if duplicate warning modal should be shown
  const showDuplicateWarning = duplicateWarning !== null;

  // Get selected category
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) ?? null;
  }, [categories, categoryId]);

  /**
   * Validates the form and returns errors
   *
   * **Validates: Requirements 15.3, 15.4, 15.5**
   */
  const validateForm = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Requirement 15.5: Date is required before allowing submission
    if (!date) {
      newErrors.date = t('validation.required');
    } else {
      // Requirement 15.3: Validate that date contains a valid date
      const dateTime = date.getTime();
      if (isNaN(dateTime)) {
        newErrors.date = t('validation.invalidDate');
      }
    }

    // Requirement 15.5: Amount is required before allowing submission
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      newErrors.amount = t('validation.required');
    } else {
      // Requirement 15.4: Validate that amount contains a valid numeric value
      const amountCents = parseAmountToCents(trimmedAmount);
      if (amountCents === null) {
        newErrors.amount = t('validation.invalidAmount');
      }
    }

    return newErrors;
  }, [date, amount, t]);

  /**
   * Handles date change from picker
   */
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
      // Clear date error if present
      setErrors((prev) => {
        const { date: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  /**
   * Handles amount input change
   */
  const handleAmountChange = useCallback((value: string) => {
    const formatted = formatAmountDisplay(value);
    setAmount(formatted);
    // Clear amount error if present
    setErrors((prev) => {
      const { amount: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Handles description input change
   */
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
  }, []);

  /**
   * Handles category selection
   */
  const handleCategorySelect = useCallback((id: string) => {
    setCategoryId(id);
    setShowCategoryModal(false);
  }, []);

  /**
   * Opens the date picker
   */
  const handleOpenDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  /**
   * Closes the date picker (iOS)
   */
  const handleCloseDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  /**
   * Opens the category selector modal
   */
  const handleOpenCategoryModal = useCallback(() => {
    setShowCategoryModal(true);
  }, []);

  /**
   * Closes the category selector modal
   */
  const handleCloseCategoryModal = useCallback(() => {
    setShowCategoryModal(false);
  }, []);

  /**
   * Handles form submission
   */
  const handleSave = useCallback(() => {
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      return;
    }

    const transaction: CreateTransactionDTO = {
      date,
      amount: amountCents,
      description: description.trim(),
      categoryId: categoryId ?? undefined,
      referenceMonth: getReferenceMonth(date),
      needsReview: true,
    };

    onSave(transaction);
  }, [validateForm, date, amount, description, categoryId, onSave]);

  /**
   * Handles cancel action
   */
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  /**
   * Renders a category item in the list
   */
  const renderCategoryItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryItem
        category={item}
        isSelected={item.id === categoryId}
        onSelect={handleCategorySelect}
      />
    ),
    [categoryId, handleCategorySelect]
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  const hasErrors = Object.keys(errors).length > 0;
  const isLoading = isSaving || isCheckingDuplicate;

  /**
   * Gets the existing transaction info for display in duplicate warning
   */
  const existingTransactionInfo = useMemo(() => {
    if (!duplicateWarning) return null;

    const existing = duplicateWarning.existingTransaction;
    return {
      date: formatDate(existing.date, i18n.language),
      amount: formatAmountFromCents(existing.amount, i18n.language),
      description: existing.description,
      confidence: Math.round(duplicateWarning.confidence * 100),
    };
  }, [duplicateWarning, i18n.language]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="manual-entry-form"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('manual.newTransaction')}</Text>
          <Text style={styles.subtitle}>{t('manual.title')}</Text>
        </View>

        {/* Date Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('transactions.date')} *</Text>
          <TouchableOpacity
            style={[styles.fieldInput, errors.date && styles.fieldInputError]}
            onPress={handleOpenDatePicker}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('manual.selectDate')}
            testID="date-picker-button"
          >
            <Text style={styles.fieldInputText}>{formatDate(date, i18n.language)}</Text>
            <Text style={styles.fieldIcon}>📅</Text>
          </TouchableOpacity>
          {errors.date && (
            <Text style={styles.errorText} testID="date-error">
              {errors.date}
            </Text>
          )}
        </View>

        {/* Amount Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('transactions.amount')} *</Text>
          <View style={[styles.amountInputContainer, errors.amount && styles.fieldInputError]}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder={t('manual.enterAmount')}
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              accessibilityLabel={t('transactions.amount')}
              testID="amount-input"
            />
          </View>
          {errors.amount && (
            <Text style={styles.errorText} testID="amount-error">
              {errors.amount}
            </Text>
          )}
          <Text style={styles.fieldHint}>
            {t('validation.positiveNumber')}. Use - para despesas.
          </Text>
        </View>

        {/* Description Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('transactions.description')}</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder={t('manual.enterDescription')}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel={t('transactions.description')}
            testID="description-input"
          />
        </View>

        {/* Category Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('transactions.category')}</Text>
          <TouchableOpacity
            style={styles.fieldInput}
            onPress={handleOpenCategoryModal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('manual.selectCategory')}
            testID="category-picker-button"
          >
            {selectedCategory ? (
              <View style={styles.selectedCategory}>
                <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color }]}>
                  <Text style={styles.categoryIconText}>{selectedCategory.icon}</Text>
                </View>
                <Text style={styles.fieldInputText}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>{t('manual.selectCategory')}</Text>
            )}
            <Text style={styles.fieldIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          testID="cancel-button"
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (hasErrors || isLoading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
          testID="save-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" testID="save-loading" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal (iOS) / Inline (Android) */}
      {showDatePicker &&
        (Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={handleCloseDatePicker}
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={handleCloseDatePicker}>
                    <Text style={styles.datePickerDone}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  locale={i18n.language}
                  testID="date-picker"
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
            testID="date-picker"
          />
        ))}

      {/* Category Selector Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCategoryModal}
      >
        <View style={styles.categoryModal}>
          <View style={styles.categoryModalContent}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>{t('manual.selectCategory')}</Text>
              <TouchableOpacity
                onPress={handleCloseCategoryModal}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                testID="close-category-modal"
              >
                <Text style={styles.categoryModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {categories.length > 0 ? (
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={keyExtractor}
                style={styles.categoryList}
                showsVerticalScrollIndicator={false}
                testID="category-list"
              />
            ) : (
              <View style={styles.emptyCategoryContainer}>
                <Text style={styles.emptyCategoryText}>{t('categories.noCategories')}</Text>
              </View>
            )}

            {/* Clear selection option */}
            {categoryId && (
              <TouchableOpacity
                style={styles.clearCategoryButton}
                onPress={() => {
                  setCategoryId(null);
                  setShowCategoryModal(false);
                }}
                activeOpacity={0.7}
                testID="clear-category-button"
              >
                <Text style={styles.clearCategoryText}>
                  {t('common.clear')} {t('transactions.category')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Duplicate Warning Modal */}
      <Modal
        visible={showDuplicateWarning}
        transparent
        animationType="fade"
        onRequestClose={onCancelDuplicate}
        testID="duplicate-warning-modal"
      >
        <View style={styles.duplicateModal}>
          <View style={styles.duplicateModalContent}>
            {/* Warning Icon */}
            <View style={styles.duplicateWarningIcon}>
              <Text style={styles.duplicateWarningIconText}>⚠️</Text>
            </View>

            {/* Title */}
            <Text style={styles.duplicateModalTitle}>{t('manual.duplicateWarning.title')}</Text>

            {/* Description */}
            <Text style={styles.duplicateModalDescription}>
              {t('manual.duplicateWarning.description')}
            </Text>

            {/* Existing Transaction Info */}
            {existingTransactionInfo && (
              <View style={styles.existingTransactionCard}>
                <Text style={styles.existingTransactionLabel}>
                  {t('manual.duplicateWarning.existingTransaction')}
                </Text>
                <View style={styles.existingTransactionRow}>
                  <Text style={styles.existingTransactionField}>{t('transactions.date')}:</Text>
                  <Text style={styles.existingTransactionValue}>
                    {existingTransactionInfo.date}
                  </Text>
                </View>
                <View style={styles.existingTransactionRow}>
                  <Text style={styles.existingTransactionField}>{t('transactions.amount')}:</Text>
                  <Text style={styles.existingTransactionValue}>
                    {existingTransactionInfo.amount}
                  </Text>
                </View>
                <View style={styles.existingTransactionRow}>
                  <Text style={styles.existingTransactionField}>
                    {t('transactions.description')}:
                  </Text>
                  <Text style={styles.existingTransactionValue} numberOfLines={2}>
                    {existingTransactionInfo.description || '-'}
                  </Text>
                </View>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {t('manual.duplicateWarning.confidence', {
                      percent: existingTransactionInfo.confidence,
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.duplicateModalActions}>
              <TouchableOpacity
                style={styles.duplicateCancelButton}
                onPress={onCancelDuplicate}
                activeOpacity={0.7}
                testID="duplicate-cancel-button"
              >
                <Text style={styles.duplicateCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.duplicateSaveButton}
                onPress={onConfirmDuplicate}
                activeOpacity={0.7}
                testID="duplicate-save-anyway-button"
              >
                <Text style={styles.duplicateSaveButtonText}>
                  {t('manual.duplicateWarning.saveAnyway')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/**
 * Styles for ManualEntryForm
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fieldContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  fieldInputText: {
    fontSize: 16,
    color: '#111827',
  },
  fieldIcon: {
    fontSize: 16,
    color: '#6b7280',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
  },
  descriptionInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Date Picker Modal (iOS)
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // Category Modal
  categoryModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  categoryModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  categoryModalClose: {
    fontSize: 20,
    color: '#6b7280',
    padding: 4,
  },
  categoryList: {
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryItemSelected: {
    backgroundColor: '#eff6ff',
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  categoryNameSelected: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  checkmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '600',
  },
  emptyCategoryContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  clearCategoryButton: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  clearCategoryText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
  // Duplicate Warning Modal
  duplicateModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
  },
  duplicateModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  duplicateWarningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  duplicateWarningIconText: {
    fontSize: 32,
  },
  duplicateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  duplicateModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  existingTransactionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  existingTransactionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  existingTransactionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  existingTransactionField: {
    fontSize: 14,
    color: '#6b7280',
    width: 90,
  },
  existingTransactionValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  duplicateModalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  duplicateCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  duplicateCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  duplicateSaveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    alignItems: 'center',
  },
  duplicateSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

/**
 * Memoized ManualEntryForm for performance optimization
 */
export const ManualEntryForm = memo(ManualEntryFormComponent);

export default ManualEntryForm;
