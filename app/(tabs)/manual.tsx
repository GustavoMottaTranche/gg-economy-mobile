/**
 * Manual Entry Screen (Tab: manual)
 *
 * Form for manually adding transactions with:
 * - Date, amount, description, category, reference_month fields
 * - Income/expense type toggle
 * - Form validation
 * - Draft auto-save functionality
 * - Clear Draft action
 * - Success confirmation and form reset
 *
 * **Validates: Requirements 23, 24, 30**
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDraftStorage } from '../../src/hooks/useDraftStorage';
import { useCategories } from '../../src/hooks/useCategories';
import { createTransaction } from '../../src/db/queries/transactions';
import { DatePicker } from '../../src/components/ui/DatePicker';
import { CategoryPicker } from '../../src/components/ui/CategoryPicker';
import { AmountDisplay } from '../../src/components/ui/AmountDisplay';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { getCurrentLocale, getDecimalSeparator, parseNumberLocale } from '../../src/i18n';
import type { ManualEntryDraft } from '../../src/services/draft';
import type { Category, CategoryType } from '../../src/types';

/**
 * Transaction type for the form
 */
type TransactionType = 'income' | 'expense';

/**
 * Form validation errors
 */
interface FormErrors {
  amount?: string;
  description?: string;
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format reference month for display
 */
function formatReferenceMonth(referenceMonth: string, locale: string): string {
  const [year, month] = referenceMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Generate list of reference months (current + 11 previous months)
 */
function generateReferenceMonths(): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months;
}

export default function ManualEntryScreen() {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const decimalSeparator = getDecimalSeparator(locale);

  // Draft storage integration
  const { draft, isDirty, isSaving, isLoading, updateDraft, clearDraft } =
    useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
      autoRestore: true,
      debounceInterval: 2000,
    });

  // Categories hook
  const {
    categories,
    incomeCategories,
    expenseCategories,
    isLoading: categoriesLoading,
  } = useCategories();

  // Form state
  const [transactionType, setTransactionType] = useState<TransactionType>(draft?.type ?? 'expense');
  const [date, setDate] = useState<Date>(() => {
    if (draft?.date) {
      return new Date(draft.date);
    }
    return new Date();
  });
  const [amount, setAmount] = useState<string>(draft?.amount ?? '');
  const [description, setDescription] = useState<string>(draft?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(draft?.categoryId ?? null);
  const [referenceMonth, setReferenceMonth] = useState<string>(
    draft?.referenceMonth ?? getCurrentMonth()
  );

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reference months list
  const referenceMonths = useMemo(() => generateReferenceMonths(), []);

  // Filtered categories based on transaction type
  const filteredCategories = useMemo(() => {
    return transactionType === 'income' ? incomeCategories : expenseCategories;
  }, [transactionType, incomeCategories, expenseCategories]);

  // Selected category object
  const selectedCategory = useMemo(() => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId) ?? null;
  }, [categoryId, categories]);

  // Restore draft data when it loads
  useEffect(() => {
    if (draft && !isLoading) {
      if (draft.type) setTransactionType(draft.type);
      if (draft.date) setDate(new Date(draft.date));
      if (draft.amount !== undefined) setAmount(draft.amount);
      if (draft.description !== undefined) setDescription(draft.description);
      if (draft.categoryId !== undefined) setCategoryId(draft.categoryId ?? null);
      if (draft.referenceMonth) setReferenceMonth(draft.referenceMonth);
    }
  }, [draft, isLoading]);

  // Update draft when form values change
  const handleUpdateDraft = useCallback(() => {
    updateDraft({
      type: transactionType,
      date: date.toISOString(),
      amount,
      description,
      categoryId,
      referenceMonth,
    });
  }, [updateDraft, transactionType, date, amount, description, categoryId, referenceMonth]);

  // Debounced draft update
  useEffect(() => {
    const timer = setTimeout(() => {
      handleUpdateDraft();
    }, 500);
    return () => clearTimeout(timer);
  }, [transactionType, date, amount, description, categoryId, referenceMonth]);

  // Handle transaction type change
  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      setTransactionType(type);
      // Clear category if it doesn't match the new type
      if (selectedCategory && selectedCategory.type !== type) {
        setCategoryId(null);
      }
    },
    [selectedCategory]
  );

  // Handle date change
  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Handle amount change
  const handleAmountChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal separator
      const cleanedText = text.replace(/[^0-9.,]/g, '');
      setAmount(cleanedText);
      if (errors.amount) {
        setErrors((prev) => ({ ...prev, amount: undefined }));
      }
    },
    [errors.amount]
  );

  // Handle description change
  const handleDescriptionChange = useCallback(
    (text: string) => {
      setDescription(text);
      if (errors.description) {
        setErrors((prev) => ({ ...prev, description: undefined }));
      }
    },
    [errors.description]
  );

  // Handle category selection
  const handleCategorySelect = useCallback((category: Category) => {
    setCategoryId(category.id);
    setShowCategoryPicker(false);
  }, []);

  // Handle reference month selection
  const handleMonthSelect = useCallback((month: string) => {
    setReferenceMonth(month);
    setShowMonthPicker(false);
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = t('validation.required');
    } else {
      const parsedAmount = parseNumberLocale(amount, locale);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        newErrors.amount = t('validation.invalidAmount');
      }
    }

    // Validate description
    if (!description.trim()) {
      newErrors.description = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amount, description, locale, t]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert(t('common.error'), t('manual.validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse amount
      const parsedAmount = parseNumberLocale(amount, locale);
      // Convert to cents and apply sign based on transaction type
      const amountInCents = Math.round(parsedAmount * 100);
      const signedAmount = transactionType === 'expense' ? -amountInCents : amountInCents;

      // Create transaction
      await createTransaction({
        date,
        amount: signedAmount,
        description: description.trim(),
        categoryId: categoryId ?? undefined,
        referenceMonth,
        needsReview: false, // Manual entries don't need review
        isExcludedFromTotals: false,
      });

      // Show success message
      Alert.alert(t('common.success'), t('manual.transactionSaved'));

      // Clear draft and reset form
      await clearDraft();
      resetForm();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert(t('common.error'), t('errors.database'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm,
    amount,
    locale,
    transactionType,
    date,
    description,
    categoryId,
    referenceMonth,
    clearDraft,
    t,
  ]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setTransactionType('expense');
    setDate(new Date());
    setAmount('');
    setDescription('');
    setCategoryId(null);
    setReferenceMonth(getCurrentMonth());
    setErrors({});
  }, []);

  // Handle clear draft
  const handleClearDraft = useCallback(async () => {
    Alert.alert(t('manual.clearDraft'), t('manual.clearDraft'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await clearDraft();
          resetForm();
        },
      },
    ]);
  }, [clearDraft, resetForm, t]);

  // Parse amount for preview
  const previewAmount = useMemo(() => {
    if (!amount.trim()) return 0;
    const parsed = parseNumberLocale(amount, locale);
    if (isNaN(parsed)) return 0;
    const cents = Math.round(parsed * 100);
    return transactionType === 'expense' ? -cents : cents;
  }, [amount, locale, transactionType]);

  // Show loading state
  if (isLoading || categoriesLoading) {
    return (
      <View style={styles.container} testID="manual-screen-loading">
        <LoadingIndicator message={t('common.loading')} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        testID="manual-screen"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('manual.title')}</Text>
              <Text style={styles.subtitle}>{t('manual.newTransaction')}</Text>
              {isDirty && (
                <Text style={styles.draftIndicator} testID="draft-indicator">
                  {isSaving ? t('common.loading') : t('manual.draftSaved')}
                </Text>
              )}
            </View>

            {/* Transaction Type Toggle */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('manual.transactionType')}</Text>
              <View style={styles.typeToggle} testID="type-toggle">
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'expense' && styles.typeButtonActiveExpense,
                  ]}
                  onPress={() => handleTypeChange('expense')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: transactionType === 'expense' }}
                  testID="type-expense"
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'expense' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('manual.expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'income' && styles.typeButtonActiveIncome,
                  ]}
                  onPress={() => handleTypeChange('income')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: transactionType === 'income' }}
                  testID="type-income"
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'income' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('manual.income')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('transactions.amount')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.amount && styles.inputError]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder={t('manual.enterAmount')}
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                accessibilityLabel={t('transactions.amount')}
                accessibilityHint={t('manual.enterAmount')}
                returnKeyType="next"
                blurOnSubmit={false}
                testID="amount-input"
              />
              {errors.amount && (
                <Text style={styles.errorText} testID="amount-error">
                  {errors.amount}
                </Text>
              )}
              {previewAmount !== 0 && (
                <View style={styles.amountPreview}>
                  <AmountDisplay
                    amount={previewAmount}
                    size="large"
                    colorVariant="auto"
                    showSign
                    testID="amount-preview"
                  />
                </View>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('transactions.description')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={description}
                onChangeText={handleDescriptionChange}
                placeholder={t('manual.enterDescription')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('transactions.description')}
                accessibilityHint={t('manual.enterDescription')}
                returnKeyType="done"
                blurOnSubmit={true}
                testID="description-input"
              />
              {errors.description && (
                <Text style={styles.errorText} testID="description-error">
                  {errors.description}
                </Text>
              )}
            </View>

            {/* Date Picker */}
            <View style={styles.section}>
              <DatePicker
                value={date}
                onChange={handleDateChange}
                label={t('transactions.date')}
                maximumDate={new Date()}
                testID="date-picker"
              />
            </View>

            {/* Category Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.category')}</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowCategoryPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('manual.selectCategory')}
                testID="category-selector"
              >
                {selectedCategory ? (
                  <View style={styles.selectedCategory}>
                    <View
                      style={[styles.categoryIcon, { backgroundColor: selectedCategory.color }]}
                    >
                      <Text style={styles.categoryIconText}>{selectedCategory.icon}</Text>
                    </View>
                    <Text style={styles.selectorText}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>{t('manual.selectCategory')}</Text>
                )}
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Reference Month Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.referenceMonth')}</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowMonthPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('manual.selectMonth')}
                testID="month-selector"
              >
                <Text style={styles.selectorText}>
                  {formatReferenceMonth(referenceMonth, locale)}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={t('manual.saveTransaction')}
                testID="submit-button"
              >
                {isSubmitting ? (
                  <Text style={styles.submitButtonText}>{t('common.loading')}</Text>
                ) : (
                  <Text style={styles.submitButtonText}>{t('manual.saveTransaction')}</Text>
                )}
              </TouchableOpacity>

              {isDirty && (
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={handleClearDraft}
                  accessibilityRole="button"
                  accessibilityLabel={t('manual.clearDraft')}
                  testID="clear-draft-button"
                >
                  <Text style={styles.clearButtonText}>{t('manual.clearDraft')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Category Picker Modal */}
        <CategoryPicker
          categories={filteredCategories}
          selectedCategoryId={categoryId}
          onSelect={handleCategorySelect}
          visible={showCategoryPicker}
          onClose={() => setShowCategoryPicker(false)}
          filterType={transactionType}
          asModal
          testID="category-picker"
        />

        {/* Reference Month Picker Modal */}
        {showMonthPicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setShowMonthPicker(false)}
              activeOpacity={1}
            />
            <View style={styles.monthPickerModal} testID="month-picker-modal">
              <View style={styles.monthPickerHeader}>
                <Text style={styles.monthPickerTitle}>{t('manual.selectMonth')}</Text>
                <TouchableOpacity
                  onPress={() => setShowMonthPicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Text style={styles.monthPickerClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.monthList}>
                {referenceMonths.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthItem, month === referenceMonth && styles.monthItemSelected]}
                    onPress={() => handleMonthSelect(month)}
                    testID={`month-option-${month}`}
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        month === referenceMonth && styles.monthItemTextSelected,
                      ]}
                    >
                      {formatReferenceMonth(month, locale)}
                    </Text>
                    {month === referenceMonth && <Text style={styles.monthItemCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  draftIndicator: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  amountPreview: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActiveExpense: {
    backgroundColor: '#fee2e2',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#dcfce7',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  selectorArrow: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryIconText: {
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  // Month Picker Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  monthPickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  monthPickerClose: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  monthList: {
    maxHeight: 300,
  },
  monthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthItemSelected: {
    backgroundColor: '#eff6ff',
  },
  monthItemText: {
    fontSize: 16,
    color: '#111827',
  },
  monthItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  monthItemCheck: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
