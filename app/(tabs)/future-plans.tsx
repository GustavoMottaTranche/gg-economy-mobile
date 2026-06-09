/**
 * Future Plans Screen (Tab: future-plans)
 *
 * Displays the savings management interface including:
 * - Month selector for navigating between months (unrestricted)
 * - Savings metrics (monthly income, savings goal, actual savings)
 * - Fund allocation cards with linked transactions
 * - Remaining distributable amount (negative = warning color)
 * - Prompt to configure monthly income if not set
 * - Empty state with "Create fund" button when no funds exist
 *
 * Layout order: MonthSelector → SavingsMetrics → FundCard list → Remaining distributable
 * Uses theme system for all colors, spacing, typography, and shadows.
 *
 * **Validates: Requirements 1.2, 2.6, 3.1, 4.1, 5.1, 6.3, 13.1, 13.2, 13.3, 13.4, 15.1, 15.5, 15.6**
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useFuturePlansData } from '../../src/hooks/useFuturePlansData';
import { useFundStore } from '../../src/stores/fundStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { formatCurrencyLocale, getCurrentLocale } from '../../src/i18n';
import { spacing, borderRadius, typography } from '../../src/constants/theme';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { MonthSelector, MonthPickerModal } from '../../src/components/dashboard';
import { SavingsMetrics } from '../../src/components/future-plans/SavingsMetrics';
import { FundCard } from '../../src/components/future-plans/FundCard';
import { FundTransactionList } from '../../src/components/future-plans/FundTransactionList';
import type { FundTransactionWithDetails } from '../../src/repositories/FundTransactionRepository';

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
 * Future Plans Screen Component
 */
export default function FuturePlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const locale = getCurrentLocale();

  // Data from the composing hook
  const {
    savingsGoal,
    actualSavings,
    fundsWithBalances,
    remainingDistributable,
    monthlyIncome,
    selectedMonth,
    isLoading,
    setSelectedMonth,
    previousMonth,
    nextMonth,
  } = useFuturePlansData();

  // Actions from the fund store
  const loadFunds = useFundStore((state) => state.loadFunds);
  const setAllocation = useFundStore((state) => state.setAllocation);
  const removeAllocation = useFundStore((state) => state.removeAllocation);
  const fundTransactions = useFundStore((state) => state.fundTransactions);
  const setMonthlyIncomeForMonth = useFundStore((state) => state.setMonthlyIncomeForMonth);

  // Load funds on mount
  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  // Month picker modal state
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);

  // Expanded fund card state
  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);

  // Check if selected month is in the future
  const currentMonth = getCurrentMonth();
  const isFutureMonth = selectedMonth > currentMonth;

  // Inline income input state
  const [incomeInputValue, setIncomeInputValue] = useState('');

  // Sync income input value when monthlyIncome or selectedMonth changes
  useEffect(() => {
    if (monthlyIncome !== null) {
      setIncomeInputValue((monthlyIncome / 100).toString());
    } else {
      setIncomeInputValue('');
    }
  }, [monthlyIncome, selectedMonth]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleOpenMonthPicker = useCallback(() => {
    setMonthPickerVisible(true);
  }, []);

  const handleCloseMonthPicker = useCallback(() => {
    setMonthPickerVisible(false);
  }, []);

  const handleSelectMonth = useCallback(
    (month: string) => {
      setSelectedMonth(month);
    },
    [setSelectedMonth]
  );

  const handleRefresh = useCallback(() => {
    loadFunds();
  }, [loadFunds]);

  const handleFundPress = useCallback((fundId: string) => {
    setExpandedFundId((prev) => (prev === fundId ? null : fundId));
  }, []);

  const handleAllocationChange = useCallback(
    (fundId: string, value: string) => {
      // Parse the value to cents
      const numericValue = parseFloat(value.replace(',', '.'));
      if (isNaN(numericValue) || numericValue <= 0) {
        // Remove allocation if value is empty or invalid
        if (value === '' || value === '0') {
          removeAllocation(fundId, selectedMonth);
        }
        return;
      }
      const amountInCents = Math.round(numericValue * 100);
      setAllocation(fundId, selectedMonth, amountInCents);
    },
    [selectedMonth, setAllocation, removeAllocation]
  );

  const handleIncomeChange = useCallback((value: string) => {
    setIncomeInputValue(value);
  }, []);

  const handleIncomeSubmit = useCallback(() => {
    const numericValue = parseFloat(incomeInputValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      // Reset to current monthlyIncome if invalid
      if (monthlyIncome !== null) {
        setIncomeInputValue((monthlyIncome / 100).toString());
      } else {
        setIncomeInputValue('');
      }
      return;
    }
    const amountInCents = Math.round(numericValue * 100);
    setMonthlyIncomeForMonth(selectedMonth, amountInCents);
  }, [incomeInputValue, monthlyIncome, selectedMonth, setMonthlyIncomeForMonth]);

  const handleGoToConfig = useCallback(() => {
    router.push('/settings/fund-config' as never);
  }, [router]);

  const handleCreateFund = useCallback(async () => {
    // Navigate to fund config for creating a fund
    router.push('/settings/fund-config' as never);
  }, [router]);

  // ─── Computed Values ─────────────────────────────────────────────────────────

  const formattedRemaining = formatCurrencyLocale(remainingDistributable / 100, locale);
  const isRemainingNegative = remainingDistributable < 0;

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.secondary,
        },
        contentContainer: {
          paddingHorizontal: spacing.base,
          paddingTop: spacing.base,
          paddingBottom: spacing['2xl'],
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.secondary,
        },
        monthSelector: {
          marginBottom: spacing.base,
        },
        savingsMetrics: {
          marginBottom: spacing.base,
        },
        fundsSection: {
          marginBottom: spacing.base,
        },
        fundsSectionTitle: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.primary,
          marginBottom: spacing.sm,
        },
        remainingContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.md,
          marginTop: spacing.sm,
        },
        remainingLabel: {
          fontSize: typography.body.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
        },
        remainingValue: {
          fontSize: typography.body.fontSize,
          fontWeight: '700',
          color: isRemainingNegative ? colors.semantic.warning.base : colors.text.primary,
        },
        incomePromptContainer: {
          marginBottom: spacing.base,
          padding: spacing.base,
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.lg,
          alignItems: 'center',
        },
        incomePromptText: {
          fontSize: typography.body.fontSize,
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        configButton: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.base,
          backgroundColor: colors.interactive.primary,
          borderRadius: borderRadius.md,
        },
        configButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.inverse,
        },
        emptyStateContainer: {
          marginTop: spacing['2xl'],
          alignItems: 'center',
        },
        incomeInlineContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.base,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.base,
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.md,
        },
        incomeInlineLabel: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight,
          color: colors.text.secondary,
          marginRight: spacing.sm,
        },
        incomeInlineInput: {
          flex: 1,
          fontSize: typography.body.fontSize,
          fontWeight: '500',
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border.default,
          borderRadius: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          backgroundColor: colors.surface.card,
        },
      }),
    [colors, isRemainingNegative]
  );

  // ─── Loading State ───────────────────────────────────────────────────────────

  if (isLoading && fundsWithBalances.length === 0 && monthlyIncome === null) {
    return (
      <View
        style={dynamicStyles.loadingContainer}
        accessible
        accessibilityLabel={t('common.loading')}
      >
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <LoadingIndicator size="large" />
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.interactive.primary}
          accessibilityLabel={t('common.refresh')}
        />
      }
      accessible
      accessibilityLabel={t('futurePlans.screenTitle')}
      accessibilityRole="scrollbar"
    >
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />

      {/* 1. Month Selector - unrestricted forward navigation */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        onMonthPress={handleOpenMonthPicker}
        isFutureMonth={isFutureMonth}
        style={dynamicStyles.monthSelector}
        testID="future-plans-month-selector"
      />

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={isMonthPickerVisible}
        selectedMonth={selectedMonth}
        onSelectMonth={handleSelectMonth}
        onClose={handleCloseMonthPicker}
        testID="future-plans-month-picker"
      />

      {/* Inline Monthly Income Input */}
      <View style={dynamicStyles.incomeInlineContainer} testID="future-plans-income-inline">
        <Text style={dynamicStyles.incomeInlineLabel}>
          {t('futurePlans.config.monthlyIncomeInline')}
        </Text>
        <TextInput
          style={dynamicStyles.incomeInlineInput}
          value={incomeInputValue}
          onChangeText={handleIncomeChange}
          onBlur={handleIncomeSubmit}
          onSubmitEditing={handleIncomeSubmit}
          keyboardType="decimal-pad"
          placeholder={t('futurePlans.config.monthlyIncomeInlinePlaceholder')}
          placeholderTextColor={colors.text.tertiary}
          testID="future-plans-income-inline-input"
          accessibilityLabel={t('futurePlans.config.monthlyIncomeInline')}
        />
      </View>

      {/* 2. Income not configured prompt */}
      {monthlyIncome === null && (
        <View style={dynamicStyles.incomePromptContainer} testID="future-plans-income-prompt">
          <Text style={dynamicStyles.incomePromptText}>
            {t('futurePlans.config.noIncomeConfigured')}
          </Text>
          <Text style={[dynamicStyles.incomePromptText, { marginBottom: spacing.md }]}>
            {t('futurePlans.config.noIncomeHint')}
          </Text>
          <TouchableOpacity
            style={dynamicStyles.configButton}
            onPress={handleGoToConfig}
            accessibilityRole="button"
            accessibilityLabel={t('futurePlans.config.goToConfig')}
            testID="future-plans-go-to-config"
          >
            <Text style={dynamicStyles.configButtonText}>{t('futurePlans.config.goToConfig')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Savings Metrics Card */}
      <SavingsMetrics
        monthlyIncome={monthlyIncome}
        savingsGoal={savingsGoal}
        actualSavings={actualSavings}
        style={dynamicStyles.savingsMetrics}
        testID="future-plans-savings-metrics"
      />

      {/* 4. Fund Cards or Empty State */}
      {fundsWithBalances.length === 0 ? (
        <View style={dynamicStyles.emptyStateContainer}>
          <EmptyState
            icon="🎯"
            title={t('futurePlans.funds.noFunds')}
            description={t('futurePlans.funds.noFundsHint')}
            action={{
              label: t('futurePlans.funds.create'),
              onPress: handleCreateFund,
            }}
          />
        </View>
      ) : (
        <View style={dynamicStyles.fundsSection}>
          <Text style={dynamicStyles.fundsSectionTitle}>{t('futurePlans.funds.title')}</Text>

          {fundsWithBalances.map((fund) => {
            const transactions: FundTransactionWithDetails[] = fundTransactions.get(fund.id) ?? [];

            return (
              <FundCard
                key={fund.id}
                fund={fund}
                onAllocationChange={handleAllocationChange}
                onPress={handleFundPress}
                expanded={expandedFundId === fund.id}
                testID={`future-plans-fund-card-${fund.id}`}
              >
                <FundTransactionList
                  transactions={transactions}
                  testID={`future-plans-fund-transactions-${fund.id}`}
                />
              </FundCard>
            );
          })}

          {/* 5. Remaining Distributable */}
          <View
            style={dynamicStyles.remainingContainer}
            testID="future-plans-remaining"
            accessibilityLabel={`${t('futurePlans.remaining')}: ${formattedRemaining}`}
          >
            <Text style={dynamicStyles.remainingLabel}>{t('futurePlans.remaining')}</Text>
            <Text style={dynamicStyles.remainingValue} testID="future-plans-remaining-value">
              {formattedRemaining}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
