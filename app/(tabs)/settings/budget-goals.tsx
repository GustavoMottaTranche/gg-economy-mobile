/**
 * Budget Goals Settings Screen
 *
 * Configuration screen for variable expense budget goals.
 * Allows setting a general variable expense goal and per-category goals.
 * Auto-saves on valid input, removes on clear.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 9.1, 9.3**
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography } from '../../../src/constants/theme';
import { PressableCard } from '../../../src/components/ui/PressableCard';
import { useGoalStore } from '../../../src/stores/goalStore';
import { useCategories } from '../../../src/hooks/useCategories';
import { validateGoalAmount } from '../../../src/validation/goalValidation';
import { getCurrentLocale } from '../../../src/i18n';
import type { Category } from '../../../src/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GoalInputState {
  value: string;
  error: string | null;
  feedback: string | null;
}

// ─── Goal Input Component ────────────────────────────────────────────────────

interface GoalInputProps {
  initialAmountCents: number | null;
  onSave: (amountInCents: number) => Promise<void>;
  onRemove: () => Promise<void>;
  testID?: string;
}

function GoalInput({ initialAmountCents, onSave, onRemove, testID }: GoalInputProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = getCurrentLocale();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<GoalInputState>(() => ({
    value: initialAmountCents ? formatCentsForDisplay(initialAmountCents, locale) : '',
    error: null,
    feedback: null,
  }));

  // Sync with external state changes (e.g., after loadGoals)
  const prevInitialRef = useRef(initialAmountCents);
  useEffect(() => {
    if (prevInitialRef.current !== initialAmountCents) {
      prevInitialRef.current = initialAmountCents;
      setState({
        value: initialAmountCents ? formatCentsForDisplay(initialAmountCents, locale) : '',
        error: null,
        feedback: null,
      });
    }
  }, [initialAmountCents, locale]);

  const handleChangeText = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, value: text, error: null, feedback: null }));

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        const trimmed = text.trim();

        // Clear → remove goal
        if (trimmed === '') {
          if (initialAmountCents !== null) {
            await onRemove();
            setState((prev) => ({ ...prev, feedback: t('goals.removed'), error: null }));
            clearFeedbackAfterDelay(setState);
          }
          return;
        }

        // Validate
        const result = validateGoalAmount(trimmed, locale);

        if (!result.valid) {
          setState((prev) => ({
            ...prev,
            error: t(result.error!),
            feedback: null,
          }));
          return;
        }

        // Save
        await onSave(result.amountInCents!);
        setState((prev) => ({ ...prev, feedback: t('goals.saved'), error: null }));
        clearFeedbackAfterDelay(setState);
      }, 800);
    },
    [initialAmountCents, locale, onSave, onRemove, t]
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
        placeholder={t('goals.inputPlaceholder')}
        placeholderTextColor={colors.text.tertiary}
        keyboardType="decimal-pad"
        testID={testID ? `${testID}-input` : undefined}
        accessibilityLabel={t('goals.generalGoalLabel')}
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

// ─── Category Goal Row ───────────────────────────────────────────────────────

interface CategoryGoalRowProps {
  category: Category;
  goalAmountCents: number | null;
  onSave: (categoryId: string, amountInCents: number) => Promise<void>;
  onRemove: (categoryId: string) => Promise<void>;
}

function CategoryGoalRow({ category, goalAmountCents, onSave, onRemove }: CategoryGoalRowProps) {
  const colors = useThemeColors();

  const handleSave = useCallback(
    async (amountInCents: number) => {
      await onSave(category.id, amountInCents);
    },
    [category.id, onSave]
  );

  const handleRemove = useCallback(async () => {
    await onRemove(category.id);
  }, [category.id, onRemove]);

  return (
    <PressableCard
      variant="secondary"
      style={styles.categoryCard}
      testID={`category-goal-card-${category.id}`}
    >
      <View style={styles.categoryCardContent}>
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text style={[styles.categoryName, { color: colors.text.primary }]} numberOfLines={1}>
            {category.name}
          </Text>
        </View>
        <GoalInput
          initialAmountCents={goalAmountCents}
          onSave={handleSave}
          onRemove={handleRemove}
          testID={`category-goal-${category.id}`}
        />
      </View>
    </PressableCard>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BudgetGoalsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const {
    generalGoal,
    categoryGoals,
    isLoading,
    loadGoals,
    setGeneralGoal,
    removeGeneralGoal,
    setCategoryGoal,
    removeCategoryGoal,
  } = useGoalStore();

  const { variableExpenseCategories } = useCategories();

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Sort categories alphabetically
  const sortedCategories = React.useMemo(
    () =>
      [...variableExpenseCategories].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [variableExpenseCategories]
  );

  const handleSaveGeneralGoal = useCallback(
    async (amountInCents: number) => {
      await setGeneralGoal(amountInCents);
    },
    [setGeneralGoal]
  );

  const handleRemoveGeneralGoal = useCallback(async () => {
    await removeGeneralGoal();
  }, [removeGeneralGoal]);

  const handleSaveCategoryGoal = useCallback(
    async (categoryId: string, amountInCents: number) => {
      await setCategoryGoal(categoryId, amountInCents);
    },
    [setCategoryGoal]
  );

  const handleRemoveCategoryGoal = useCallback(
    async (categoryId: string) => {
      await removeCategoryGoal(categoryId);
    },
    [removeCategoryGoal]
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryGoalRow
        category={item}
        goalAmountCents={categoryGoals.get(item.id) ?? null}
        onSave={handleSaveCategoryGoal}
        onRemove={handleRemoveCategoryGoal}
      />
    ),
    [categoryGoals, handleSaveCategoryGoal, handleRemoveCategoryGoal]
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}
        testID="budget-goals-loading"
      >
        <ActivityIndicator size="large" color={colors.interactive.primary} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      testID="budget-goals-screen"
    >
      <FlatList
        data={sortedCategories}
        keyExtractor={keyExtractor}
        renderItem={renderCategoryItem}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Explanatory Text */}
            <Text
              style={[styles.explanatoryText, { color: colors.text.secondary }]}
              testID="goals-explanatory-text"
            >
              {t('goals.explanatoryText')}
            </Text>

            {/* General Goal Section */}
            <PressableCard
              variant="secondary"
              style={styles.generalGoalCard}
              testID="general-goal-card"
            >
              <View style={styles.generalGoalContent}>
                <Text style={[styles.generalGoalLabel, { color: colors.text.primary }]}>
                  {t('goals.generalGoalLabel')}
                </Text>
                <GoalInput
                  initialAmountCents={generalGoal}
                  onSave={handleSaveGeneralGoal}
                  onRemove={handleRemoveGeneralGoal}
                  testID="general-goal"
                />
              </View>
            </PressableCard>

            {/* Category Goals Section Header */}
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              {t('goals.categoryGoalLabel')}
            </Text>
          </View>
        }
        testID="budget-goals-list"
      />
    </View>
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
function clearFeedbackAfterDelay(setState: React.Dispatch<React.SetStateAction<GoalInputState>>) {
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
  explanatoryText: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    marginBottom: spacing.base,
  },
  generalGoalCard: {
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  generalGoalContent: {
    gap: spacing.sm,
  },
  generalGoalLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryCard: {
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  categoryCardContent: {
    gap: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryIcon: {
    fontSize: spacing.lg,
  },
  categoryName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    flex: 1,
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
});
