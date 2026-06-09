/**
 * WeeklyRecurringForm Component
 *
 * Form for creating and editing weekly recurring expense groups.
 * Supports both create mode (empty form) and edit mode (pre-filled with initialValues).
 * Integrates field-level validation using validateWeeklyGroup.
 *
 * **Validates: Requirements 1.1, 1.2, 4.7**
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../constants/theme';
import { validateWeeklyGroup } from '../../validation/weeklyRecurringValidation';
import { PaymentStatusOption } from './PaymentStatusOption';
import { FundSelector } from '../future-plans/FundSelector';
import { useFunds } from '../../stores/fundStore';
import type {
  CreateWeeklyGroupDTO,
  UpdateWeeklyGroupDTO,
  WeeklyRecurringGroup,
} from '../../types/weeklyRecurring';
import type { Category } from '../../types/category';
import type { Origin } from '../../types/origin';
import type { PaymentStatusCreationOption } from '../../types/paymentStatus';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_OF_WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface WeeklyRecurringFormProps {
  /** Initial values for edit mode. When provided, form is pre-filled. */
  initialValues?: WeeklyRecurringGroup;
  /** List of available categories for the category selector */
  categories: Category[];
  /** List of available origins for the origin selector (optional) */
  origins?: Origin[];
  /** Initially linked fund ID (for edit mode) */
  initialFundId?: string | null;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: CreateWeeklyGroupDTO | UpdateWeeklyGroupDTO) => void;
  /** Optional callback for cancel action */
  onCancel?: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ─── Field Error Map ─────────────────────────────────────────────────────────

interface FieldErrors {
  title?: string;
  amount?: string;
  dayOfWeek?: string;
  categoryId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WeeklyRecurringForm({
  initialValues,
  categories,
  origins,
  initialFundId,
  onSubmit,
  onCancel,
  testID,
}: WeeklyRecurringFormProps): React.JSX.Element {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isEditMode = !!initialValues;

  // ─── Form State ──────────────────────────────────────────────────────────

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [amountText, setAmountText] = useState(
    initialValues ? String(initialValues.amount / 100) : ''
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialValues?.dayOfWeek ?? 0);
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [originId, setOriginId] = useState<string | null>(initialValues?.originId ?? null);
  const [paymentStatusOption, setPaymentStatusOption] =
    useState<PaymentStatusCreationOption>('all_pending');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showOriginPicker, setShowOriginPicker] = useState(false);

  // Fund linking state (Requirements 11.4, 11.5, 11.6)
  const [selectedFundId, setSelectedFundId] = useState<string | null>(initialFundId ?? null);
  const [showFundSelector, setShowFundSelector] = useState(false);
  const funds = useFunds();

  // ─── Derived Values ──────────────────────────────────────────────────────

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const selectedOrigin = useMemo(
    () => (origins ?? []).find((o) => o.id === originId) ?? null,
    [origins, originId]
  );

  const selectedFundName = useMemo(() => {
    if (!selectedFundId) return null;
    const fund = funds.find((f) => f.id === selectedFundId);
    return fund?.name ?? null;
  }, [selectedFundId, funds]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const parseFieldErrors = useCallback((errors: string[]): FieldErrors => {
    const fieldErrs: FieldErrors = {};
    for (const error of errors) {
      const lowerErr = error.toLowerCase();
      if (lowerErr.includes('title')) {
        fieldErrs.title = error;
      } else if (lowerErr.includes('amount')) {
        fieldErrs.amount = error;
      } else if (lowerErr.includes('day')) {
        fieldErrs.dayOfWeek = error;
      } else if (lowerErr.includes('category')) {
        fieldErrs.categoryId = error;
      }
    }
    return fieldErrs;
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAmountChange = useCallback((text: string) => {
    // Replace comma with dot (Brazilian decimal separator)
    const normalized = text.replace(',', '.');
    // Allow only numeric input with up to 2 decimal places
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    // Limit decimal places to 2
    if (parts.length === 2 && (parts[1]?.length ?? 0) > 2) return;
    setAmountText(cleaned);
  }, []);

  const handleSubmit = useCallback(() => {
    const amountInUnits = parseFloat(amountText.replace(',', '.')) || 0;
    // Store in cents (same as transactions table) for consistency across the app
    const amount = Math.round(amountInUnits * 100);

    const validationResult = validateWeeklyGroup({
      title,
      amount,
      dayOfWeek,
      categoryId,
    });

    if (!validationResult.valid) {
      setFieldErrors(parseFieldErrors(validationResult.errors ?? []));
      return;
    }

    // Clear errors on successful validation
    setFieldErrors({});

    if (isEditMode) {
      const dto: UpdateWeeklyGroupDTO = {};
      if (title !== initialValues!.title) dto.title = title;
      if (amount !== initialValues!.amount) dto.amount = amount;
      if (dayOfWeek !== initialValues!.dayOfWeek) dto.dayOfWeek = dayOfWeek;
      if (categoryId !== initialValues!.categoryId) dto.categoryId = categoryId!;
      if (originId !== initialValues!.originId) dto.originId = originId;
      // Always include fundId so the caller can handle linking/unlinking
      dto.fundId = selectedFundId;
      onSubmit(dto);
    } else {
      const dto: CreateWeeklyGroupDTO = {
        title: title.trim(),
        amount,
        dayOfWeek,
        categoryId: categoryId!,
        originId: originId ?? undefined,
        fundId: selectedFundId,
        paymentStatusOption,
      };
      onSubmit(dto);
    }
  }, [
    title,
    amountText,
    dayOfWeek,
    categoryId,
    originId,
    paymentStatusOption,
    isEditMode,
    initialValues,
    onSubmit,
    parseFieldErrors,
    selectedFundId,
  ]);

  const handleCategorySelect = useCallback((category: Category) => {
    setCategoryId(category.id);
    setShowCategoryPicker(false);
    setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
  }, []);

  const handleOriginSelect = useCallback((origin: Origin | null) => {
    setOriginId(origin?.id ?? null);
    setShowOriginPicker(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        testID={testID}
      >
        {/* Title Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Nome</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: fieldErrors.title
                  ? colors.semantic.danger.base
                  : colors.border.default,
              },
            ]}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (fieldErrors.title) {
                setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            placeholder="Ex: Feira da semana"
            placeholderTextColor={colors.text.tertiary}
            maxLength={100}
            testID={testID ? `${testID}-title` : undefined}
            accessibilityLabel="Nome do gasto recorrente"
          />
          {fieldErrors.title && (
            <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
              {fieldErrors.title}
            </Text>
          )}
        </View>

        {/* Amount Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Valor (R$)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: fieldErrors.amount
                  ? colors.semantic.danger.base
                  : colors.border.default,
              },
            ]}
            value={amountText}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
            testID={testID ? `${testID}-amount` : undefined}
            accessibilityLabel="Valor do gasto"
          />
          {fieldErrors.amount && (
            <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
              {fieldErrors.amount}
            </Text>
          )}
        </View>

        {/* Day of Week Picker */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Dia da semana</Text>
          <View style={styles.dayPickerContainer}>
            {DAY_OF_WEEK_LABELS.map((label, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayChip,
                  { backgroundColor: colors.background.tertiary },
                  dayOfWeek === index && {
                    backgroundColor: colors.interactive.primary,
                  },
                ]}
                onPress={() => {
                  setDayOfWeek(index);
                  if (fieldErrors.dayOfWeek) {
                    setFieldErrors((prev) => ({ ...prev, dayOfWeek: undefined }));
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: dayOfWeek === index }}
                testID={testID ? `${testID}-day-${index}` : undefined}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    { color: colors.text.primary },
                    dayOfWeek === index && { color: colors.text.inverse },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {fieldErrors.dayOfWeek && (
            <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
              {fieldErrors.dayOfWeek}
            </Text>
          )}
        </View>

        {/* Category Selector */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Categoria</Text>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: colors.background.secondary,
                borderColor: fieldErrors.categoryId
                  ? colors.semantic.danger.base
                  : colors.border.default,
              },
            ]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            accessibilityRole="button"
            accessibilityLabel="Selecionar categoria"
            testID={testID ? `${testID}-category-selector` : undefined}
          >
            <Text
              style={[
                styles.selectorText,
                {
                  color: selectedCategory ? colors.text.primary : colors.text.tertiary,
                },
              ]}
            >
              {selectedCategory?.name ?? 'Selecione uma categoria'}
            </Text>
          </TouchableOpacity>
          {fieldErrors.categoryId && (
            <Text style={[styles.errorText, { color: colors.semantic.danger.base }]}>
              {fieldErrors.categoryId}
            </Text>
          )}
          {showCategoryPicker && (
            <View
              style={[
                styles.pickerList,
                {
                  backgroundColor: colors.surface.card,
                  borderColor: colors.border.default,
                },
              ]}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border.subtle },
                    category.id === categoryId && {
                      backgroundColor: colors.semantic.primary.light,
                    },
                  ]}
                  onPress={() => handleCategorySelect(category)}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  testID={testID ? `${testID}-category-${category.id}` : undefined}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <Text style={styles.categoryIconText}>{category.icon}</Text>
                  </View>
                  <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {categories.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  Nenhuma categoria disponível
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Origin Selector (Optional) */}
        {origins && origins.length > 0 && (
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Origem (opcional)</Text>
            <TouchableOpacity
              style={[
                styles.selectorButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={() => setShowOriginPicker(!showOriginPicker)}
              accessibilityRole="button"
              accessibilityLabel="Selecionar origem"
              testID={testID ? `${testID}-origin-selector` : undefined}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: selectedOrigin ? colors.text.primary : colors.text.tertiary,
                  },
                ]}
              >
                {selectedOrigin?.name ?? 'Nenhuma origem selecionada'}
              </Text>
            </TouchableOpacity>
            {showOriginPicker && (
              <View
                style={[
                  styles.pickerList,
                  {
                    backgroundColor: colors.surface.card,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                {/* Option to clear origin */}
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border.subtle },
                    originId === null && {
                      backgroundColor: colors.semantic.primary.light,
                    },
                  ]}
                  onPress={() => handleOriginSelect(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Nenhuma origem"
                  testID={testID ? `${testID}-origin-none` : undefined}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text.secondary }]}>
                    Nenhuma
                  </Text>
                </TouchableOpacity>
                {origins.map((origin) => (
                  <TouchableOpacity
                    key={origin.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.border.subtle },
                      origin.id === originId && {
                        backgroundColor: colors.semantic.primary.light,
                      },
                    ]}
                    onPress={() => handleOriginSelect(origin)}
                    accessibilityRole="button"
                    accessibilityLabel={origin.name}
                    testID={testID ? `${testID}-origin-${origin.id}` : undefined}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text.primary }]}>
                      {origin.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment Status Option (Create mode only) */}
        {!isEditMode && (
          <View style={styles.fieldContainer}>
            <PaymentStatusOption
              selected={paymentStatusOption}
              onSelect={setPaymentStatusOption}
              testID={testID ? `${testID}-payment-status` : undefined}
            />
          </View>
        )}

        {/* Fund Selector (Optional - Requirements 11.4, 11.5, 11.6) */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>
            {t('futurePlans.transactions.linkToFund', { defaultValue: 'Vincular a um fundo' })}
          </Text>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: colors.background.secondary,
                borderColor: colors.border.default,
              },
            ]}
            onPress={() => setShowFundSelector(true)}
            accessibilityRole="button"
            accessibilityLabel={t('futurePlans.transactions.linkToFund', {
              defaultValue: 'Vincular a um fundo',
            })}
            testID={testID ? `${testID}-fund-selector` : undefined}
          >
            <Text
              style={[
                styles.selectorText,
                {
                  color: selectedFundName ? colors.text.primary : colors.text.tertiary,
                },
              ]}
            >
              {selectedFundName ??
                t('futurePlans.transactions.noneFund', { defaultValue: 'Nenhum' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {onCancel && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.background.tertiary },
              ]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              testID={testID ? `${testID}-cancel` : undefined}
            >
              <Text style={[styles.buttonText, { color: colors.text.primary }]}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              { backgroundColor: colors.interactive.primary },
              !onCancel && styles.fullWidthButton,
            ]}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Salvar alterações' : 'Criar gasto recorrente'}
            testID={testID ? `${testID}-submit` : undefined}
          >
            <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
              {isEditMode ? 'Salvar' : 'Criar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FundSelector
        visible={showFundSelector}
        onSelect={(fundId) => {
          setSelectedFundId(fundId);
          setShowFundSelector(false);
        }}
        onClose={() => setShowFundSelector(false)}
        selectedFundId={selectedFundId}
        testID={testID ? `${testID}-fund-selector-modal` : undefined}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  dayPickerContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  selectorText: {
    fontSize: typography.body.fontSize,
  },
  pickerList: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: typography.body.fontSize - 1,
    fontWeight: '500',
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  categoryIconText: {
    fontSize: typography.caption.fontSize,
  },
  emptyText: {
    padding: spacing.base,
    textAlign: 'center',
    fontSize: typography.caption.fontSize,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  submitButton: {},
  fullWidthButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});

export default WeeklyRecurringForm;
