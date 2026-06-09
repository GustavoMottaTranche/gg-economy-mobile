/**
 * Fund Configuration Settings Screen
 *
 * Configuration screen for fund management. Allows setting monthly income,
 * editing fund names/icons/colors, setting base balances, creating new funds,
 * and deactivating existing funds.
 * Auto-saves on valid input (matching budget goals config pattern).
 *
 * **Validates: Requirements 2.1, 2.3, 2.4, 5.4, 5.5, 7.1, 7.5, 15.4**
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography } from '../../../src/constants/theme';
import { PressableCard } from '../../../src/components/ui/PressableCard';
import { useFundStore } from '../../../src/stores/fundStore';
import { validateMonetaryInput, validateFundName } from '../../../src/validation/fundValidation';
import { getCurrentLocale } from '../../../src/i18n';
import type { Fund } from '../../../src/types/fund';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InputState {
  value: string;
  error: string | null;
  feedback: string | null;
}

// ─── AutoSaveInput Component ─────────────────────────────────────────────────

interface AutoSaveInputProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  onClear?: () => Promise<void>;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  validate: (value: string) => { valid: boolean; error?: string };
  testID?: string;
  accessibilityLabel?: string;
}

function AutoSaveInput({
  initialValue,
  onSave,
  onClear,
  placeholder,
  keyboardType = 'default',
  validate,
  testID,
  accessibilityLabel,
}: AutoSaveInputProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<InputState>(() => ({
    value: initialValue,
    error: null,
    feedback: null,
  }));

  // Sync with external state changes
  const prevInitialRef = useRef(initialValue);
  useEffect(() => {
    if (prevInitialRef.current !== initialValue) {
      prevInitialRef.current = initialValue;
      setState({
        value: initialValue,
        error: null,
        feedback: null,
      });
    }
  }, [initialValue]);

  const handleChangeText = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, value: text, error: null, feedback: null }));

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        const trimmed = text.trim();

        // Clear → remove
        if (trimmed === '' && onClear) {
          await onClear();
          setState((prev) => ({ ...prev, feedback: t('goals.removed'), error: null }));
          clearFeedbackAfterDelay(setState);
          return;
        }

        if (trimmed === '') return;

        // Validate
        const result = validate(trimmed);

        if (!result.valid) {
          setState((prev) => ({
            ...prev,
            error: t(result.error!),
            feedback: null,
          }));
          return;
        }

        // Save
        await onSave(trimmed);
        setState((prev) => ({ ...prev, feedback: t('goals.saved'), error: null }));
        clearFeedbackAfterDelay(setState);
      }, 800);
    },
    [onSave, onClear, validate, t]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View testID={testID}>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text.primary,
            backgroundColor: colors.background.tertiary,
            borderColor: state.error ? colors.semantic.danger.base : colors.border.default,
          },
        ]}
        value={state.value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        keyboardType={keyboardType}
        testID={testID ? `${testID}-input` : undefined}
        accessibilityLabel={accessibilityLabel}
      />
      {state.error && (
        <Text
          style={[styles.validationMessage, { color: colors.semantic.danger.base }]}
          testID={testID ? `${testID}-error` : undefined}
        >
          {state.error}
        </Text>
      )}
      {state.feedback && (
        <Text
          style={[styles.feedbackMessage, { color: colors.semantic.success.base }]}
          testID={testID ? `${testID}-feedback` : undefined}
        >
          {state.feedback}
        </Text>
      )}
    </View>
  );
}

// ─── Fund Row Component ──────────────────────────────────────────────────────

interface FundRowProps {
  fund: Fund;
  baseAmountCents: number | null;
  onSaveBaseBalance: (fundId: string, amountInCents: number) => Promise<void>;
  onSaveName: (fundId: string, name: string) => Promise<void>;
  onDeactivate: (fundId: string) => void;
}

function FundRow({
  fund,
  baseAmountCents,
  onSaveBaseBalance,
  onSaveName,
  onDeactivate,
}: FundRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const validateAmount = useCallback(
    (value: string) => {
      const result = validateMonetaryInput(value, locale, { allowZero: true });
      return { valid: result.valid, error: result.error };
    },
    [locale]
  );

  const validateName = useCallback((value: string) => {
    return validateFundName(value);
  }, []);

  const handleSaveBaseBalance = useCallback(
    async (value: string) => {
      const result = validateMonetaryInput(value, locale, { allowZero: true });
      if (result.valid && result.amountInCents !== undefined) {
        await onSaveBaseBalance(fund.id, result.amountInCents);
      }
    },
    [fund.id, locale, onSaveBaseBalance]
  );

  const handleSaveName = useCallback(
    async (value: string) => {
      await onSaveName(fund.id, value.trim());
    },
    [fund.id, onSaveName]
  );

  const handleDeactivate = useCallback(() => {
    onDeactivate(fund.id);
  }, [fund.id, onDeactivate]);

  return (
    <PressableCard
      variant="secondary"
      style={styles.fundCard}
      testID={`fund-config-card-${fund.id}`}
    >
      <View style={styles.fundCardContent}>
        {/* Fund identity */}
        <View style={styles.fundHeader}>
          {fund.icon && <Text style={styles.fundIcon}>{fund.icon}</Text>}
          {fund.color && <View style={[styles.fundColorDot, { backgroundColor: fund.color }]} />}
        </View>

        {/* Fund name input */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            {t('futurePlans.funds.name')}
          </Text>
          <AutoSaveInput
            initialValue={fund.name}
            onSave={handleSaveName}
            placeholder={t('futurePlans.funds.name')}
            keyboardType="default"
            validate={validateName}
            testID={`fund-name-${fund.id}`}
            accessibilityLabel={t('futurePlans.funds.name')}
          />
        </View>

        {/* Base balance input */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
            {t('futurePlans.funds.baseBalance')}
          </Text>
          <AutoSaveInput
            initialValue={
              baseAmountCents !== null ? formatCentsForDisplay(baseAmountCents, locale) : ''
            }
            onSave={handleSaveBaseBalance}
            placeholder={t('futurePlans.config.monthlyIncomePlaceholder')}
            keyboardType="decimal-pad"
            validate={validateAmount}
            testID={`fund-balance-${fund.id}`}
            accessibilityLabel={t('futurePlans.funds.baseBalance')}
          />
        </View>

        {/* Deactivate button */}
        <TouchableOpacity
          onPress={handleDeactivate}
          style={[styles.deactivateButton, { borderColor: colors.semantic.danger.base }]}
          testID={`fund-deactivate-${fund.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('futurePlans.funds.deactivate')}
        >
          <Text style={[styles.deactivateText, { color: colors.semantic.danger.base }]}>
            {t('futurePlans.funds.deactivate')}
          </Text>
        </TouchableOpacity>
      </View>
    </PressableCard>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function FundConfigScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();

  const {
    funds,
    monthlyIncome,
    balances,
    isLoading,
    loadFunds,
    setMonthlyIncome,
    removeMonthlyIncome,
    setBaseBalance,
    updateFund,
    deactivateFund,
    createFund,
  } = useFundStore();

  // Load funds on mount
  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  // ─── Monthly Income Handlers ─────────────────────────────────────────────

  const validateIncomeAmount = useCallback(
    (value: string) => {
      const result = validateMonetaryInput(value, locale);
      return { valid: result.valid, error: result.error };
    },
    [locale]
  );

  const handleSaveIncome = useCallback(
    async (value: string) => {
      const result = validateMonetaryInput(value, locale);
      if (result.valid && result.amountInCents !== undefined) {
        await setMonthlyIncome(result.amountInCents);
      }
    },
    [locale, setMonthlyIncome]
  );

  const handleRemoveIncome = useCallback(async () => {
    await removeMonthlyIncome();
  }, [removeMonthlyIncome]);

  // ─── Fund Handlers ───────────────────────────────────────────────────────

  const handleSaveBaseBalance = useCallback(
    async (fundId: string, amountInCents: number) => {
      await setBaseBalance(fundId, amountInCents);
    },
    [setBaseBalance]
  );

  const handleSaveFundName = useCallback(
    async (fundId: string, name: string) => {
      await updateFund(fundId, { name });
    },
    [updateFund]
  );

  const handleDeactivateFund = useCallback(
    (fundId: string) => {
      const fund = funds.find((f) => f.id === fundId);
      if (!fund) return;

      Alert.alert(t('futurePlans.funds.deactivate'), t('futurePlans.funds.deleteConfirmation'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await deactivateFund(fundId);
          },
        },
      ]);
    },
    [funds, deactivateFund, t]
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateFund = useCallback(async () => {
    const trimmed = newFundName.trim();
    const validation = validateFundName(trimmed);

    if (!validation.valid) {
      setCreateError(t(validation.error!));
      return;
    }

    try {
      await createFund(trimmed);
      setNewFundName('');
      setCreateError(null);
      setIsCreating(false);
    } catch {
      setCreateError(t('futurePlans.validation.invalidFormat'));
    }
  }, [newFundName, createFund, t]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}
        edges={['bottom']}
        testID="fund-config-loading"
      >
        <ActivityIndicator size="large" color={colors.interactive.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      edges={['bottom']}
      testID="fund-config-screen"
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Monthly Income Section */}
        <PressableCard variant="secondary" style={styles.incomeCard} testID="monthly-income-card">
          <View style={styles.incomeContent}>
            <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
              {t('futurePlans.config.monthlyIncomeLabel')}
            </Text>
            <AutoSaveInput
              initialValue={
                monthlyIncome !== null ? formatCentsForDisplay(monthlyIncome, locale) : ''
              }
              onSave={handleSaveIncome}
              onClear={handleRemoveIncome}
              placeholder={t('futurePlans.config.monthlyIncomePlaceholder')}
              keyboardType="decimal-pad"
              validate={validateIncomeAmount}
              testID="monthly-income"
              accessibilityLabel={t('futurePlans.config.monthlyIncomeLabel')}
            />
          </View>
        </PressableCard>

        {/* Funds Section Header */}
        <Text style={[styles.fundsHeaderLabel, { color: colors.text.secondary }]}>
          {t('futurePlans.funds.title')}
        </Text>

        {/* Fund List */}
        {funds.length === 0 && (
          <View style={styles.emptyContainer} testID="fund-config-empty">
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              {t('futurePlans.funds.noFunds')}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.text.tertiary }]}>
              {t('futurePlans.funds.noFundsHint')}
            </Text>
          </View>
        )}

        {funds.map((fund) => (
          <FundRow
            key={fund.id}
            fund={fund}
            baseAmountCents={balances.get(fund.id)?.baseAmount ?? null}
            onSaveBaseBalance={handleSaveBaseBalance}
            onSaveName={handleSaveFundName}
            onDeactivate={handleDeactivateFund}
          />
        ))}

        {/* Create Fund Section */}
        {isCreating ? (
          <PressableCard variant="secondary" style={styles.createCard} testID="create-fund-form">
            <View style={styles.createContent}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                {t('futurePlans.funds.name')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.background.tertiary,
                    borderColor: createError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                value={newFundName}
                onChangeText={(text) => {
                  setNewFundName(text);
                  setCreateError(null);
                }}
                placeholder={t('futurePlans.funds.name')}
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                testID="create-fund-name-input"
                accessibilityLabel={t('futurePlans.funds.name')}
              />
              {createError && (
                <Text
                  style={[styles.validationMessage, { color: colors.semantic.danger.base }]}
                  testID="create-fund-error"
                >
                  {createError}
                </Text>
              )}
              <View style={styles.createActions}>
                <TouchableOpacity
                  onPress={() => {
                    setIsCreating(false);
                    setNewFundName('');
                    setCreateError(null);
                  }}
                  style={[styles.cancelButton, { borderColor: colors.border.default }]}
                  testID="create-fund-cancel"
                  accessibilityRole="button"
                >
                  <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateFund}
                  style={[styles.confirmButton, { backgroundColor: colors.interactive.primary }]}
                  testID="create-fund-confirm"
                  accessibilityRole="button"
                >
                  <Text style={[styles.confirmText, { color: colors.text.inverse }]}>
                    {t('futurePlans.funds.create')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </PressableCard>
        ) : (
          <TouchableOpacity
            onPress={() => setIsCreating(true)}
            style={[styles.createButton, { borderColor: colors.interactive.primary }]}
            testID="create-fund-button"
            accessibilityRole="button"
            accessibilityLabel={t('futurePlans.funds.create')}
          >
            <Text style={[styles.createButtonText, { color: colors.interactive.primary }]}>
              + {t('futurePlans.funds.create')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats cents to display value based on locale.
 * e.g., 150000 cents → "1500,00" (pt-BR) or "1500.00" (en)
 */
function formatCentsForDisplay(cents: number, locale: string): string {
  const value = cents / 100;
  if (locale === 'pt-BR') {
    return value.toFixed(2).replace('.', ',');
  }
  return value.toFixed(2);
}

/**
 * Clears feedback message after a delay
 */
function clearFeedbackAfterDelay(setState: React.Dispatch<React.SetStateAction<InputState>>) {
  setTimeout(() => {
    setState((prev) => ({ ...prev, feedback: null }));
  }, 2500);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  incomeCard: {
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  incomeContent: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  fundsHeaderLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  fundCard: {
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  fundCardContent: {
    gap: spacing.md,
  },
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fundIcon: {
    fontSize: spacing.xl,
  },
  fundColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  input: {
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  validationMessage: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  feedbackMessage: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  deactivateButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  deactivateText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  emptyHint: {
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
  createButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.base,
  },
  createButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  createCard: {
    padding: spacing.base,
    marginTop: spacing.base,
  },
  createContent: {
    gap: spacing.sm,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  confirmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: 8,
  },
  confirmText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
