/**
 * Transaction Detail Screen
 *
 * Modal screen for viewing and editing transaction details:
 * - View all transaction fields with redesigned card layout
 * - Edit transaction (navigate to edit mode)
 * - Delete transaction with confirmation
 * - Group-aware delete and edit for installment parcels
 * - Editable category via bottom sheet with CategorySelector
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.2**
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { eq } from 'drizzle-orm';

import { useTransactions, type TransactionWithCategory } from '../../src/hooks/useTransactions';
import { getTransactionWithRelations } from '../../src/db/queries/transactions';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { InputPromptDialog } from '../../src/components/ui/InputPromptDialog';
import { CategorySelector } from '../../src/components/CategorySelector';
import { PaymentStatusToggle } from '../../src/components/PaymentStatusToggle';
import { FundSelector } from '../../src/components/future-plans/FundSelector';
import {
  formatCurrencyLocale,
  formatDateLocale,
  getCurrentLocale,
  getMonthName,
} from '../../src/i18n';
import {
  setTransactionCategory,
  setCategoryWithPropagation,
} from '../../src/db/queries/transactions';
import {
  deleteAllInGroup,
  deleteSingleParcel,
  recalculateGroup,
  updateGroupField,
} from '../../src/services/installment/InstallmentGroupManager';
import {
  updateRecurringAmount,
  deactivateAndDeleteFuture,
} from '../../src/services/recurring/RecurringTransactionService';
import { paymentStatusService } from '../../src/services/payment-status/PaymentStatusService';
import { useFundStore, useFunds } from '../../src/stores/fundStore';
import { fundTransactionRepository } from '../../src/repositories/FundTransactionRepository';
import { getDb } from '../../src/db/client';
import { transactions as transactionsTable } from '../../src/db/schema';
import type { Category } from '../../src/types';

/**
 * Parses a YYYY-MM string into a display format
 */
function formatReferenceMonth(monthStr: string, locale: 'pt-BR' | 'en'): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return monthStr;

  const monthName = getMonthName(month - 1, locale, 'long');
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `${capitalizedMonth} ${year}`;
}

/**
 * Types for the input prompt dialog state
 */
type PromptMode =
  | 'amount-single'
  | 'amount-recalculate'
  | 'amount-recurring-single'
  | 'amount-recurring-future'
  | 'description-single'
  | 'description-all'
  | 'amount-standard'
  | 'description-standard';

/**
 * Detail Row Component — tappable variant for category editing
 */
interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  testID?: string;
  onPress?: () => void;
}

function DetailRow({
  label,
  value,
  valueColor,
  testID,
  onPress,
}: DetailRowProps): React.ReactElement {
  const colors = useThemeColors();

  const rowContent = (
    <>
      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text
          style={[
            styles.detailValue,
            { color: colors.text.primary },
            valueColor ? { color: valueColor } : undefined,
          ]}
        >
          {value}
        </Text>
        {onPress && <Text style={[styles.detailChevron, { color: colors.text.tertiary }]}>›</Text>}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint="Tap to change"
        testID={testID ? `${testID}-touchable` : undefined}
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]} testID={testID}>
      {rowContent}
    </View>
  );
}

/**
 * Main Transaction Detail Screen Component
 */
export default function TransactionDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const themeShadows = shadows[resolvedScheme];

  // Fetch all transactions and find the one we need
  const { transactions, isLoading, remove, update } = useTransactions();

  // Find the transaction by ID from paginated list
  const transactionFromList = useMemo(
    () => transactions.find((tx) => tx.id === id),
    [transactions, id]
  );

  // If not found in paginated list, fetch directly from DB
  const [directFetchedTx, setDirectFetchedTx] = useState<TransactionWithCategory | null>(null);
  const [isDirectFetching, setIsDirectFetching] = useState(false);

  useEffect(() => {
    if (transactionFromList || isLoading || !id) return;

    let cancelled = false;
    setIsDirectFetching(true);

    async function fetchDirect() {
      try {
        const result = await getTransactionWithRelations(id);
        if (!cancelled && result) {
          setDirectFetchedTx(result as TransactionWithCategory);
        }
      } catch {
        // Will show not found state
      } finally {
        if (!cancelled) setIsDirectFetching(false);
      }
    }

    fetchDirect();
    return () => {
      cancelled = true;
    };
  }, [transactionFromList, isLoading, id]);

  // Use whichever source has the transaction
  const transaction = transactionFromList ?? directFetchedTx;

  // State for the input prompt dialog
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptMode, setPromptMode] = useState<PromptMode>('amount-single');
  const [promptTitle, setPromptTitle] = useState('');
  const [promptMessage, setPromptMessage] = useState('');
  const [promptDefaultValue, setPromptDefaultValue] = useState('');
  const [promptKeyboardType, setPromptKeyboardType] = useState<'default' | 'decimal-pad'>(
    'default'
  );

  // State for category edit bottom sheet
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [isCategoryUpdating, setIsCategoryUpdating] = useState(false);

  // State for payment status (Requirement 5.1, 5.2, 5.3)
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [isPaymentToggling, setIsPaymentToggling] = useState(false);

  // State for fund linking (Requirements 8.1, 8.6, 8.8)
  const [fundSelectorVisible, setFundSelectorVisible] = useState(false);
  const [linkedFundId, setLinkedFundId] = useState<string | null>(null);
  const funds = useFunds();

  // Load the isPaid status from the database when the transaction is available
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadPaymentStatus() {
      try {
        const db = getDb();
        const results = await db
          .select({ isPaid: transactionsTable.isPaid })
          .from(transactionsTable)
          .where(eq(transactionsTable.id, id))
          .limit(1);

        if (!cancelled && results[0] != null) {
          setIsPaid(results[0].isPaid);
        }
      } catch {
        // If we can't load, leave as null (row won't show toggle)
      }
    }

    loadPaymentStatus();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load the linked fund for this transaction
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadLinkedFund() {
      try {
        const fundTx = await fundTransactionRepository.getByTransactionId(id);
        if (!cancelled) {
          setLinkedFundId(fundTx ? fundTx.fundId : null);
        }
      } catch {
        // If we can't load, leave as null
      }
    }

    loadLinkedFund();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load funds list on mount for displaying fund name
  useEffect(() => {
    useFundStore.getState().loadFunds();
  }, []);

  /**
   * Handles toggling the payment status with optimistic update.
   * Validates: Requirements 5.2, 5.3
   */
  const handleTogglePaymentStatus = useCallback(async () => {
    if (!transaction || isPaid === null || isPaymentToggling) return;

    // Optimistic update
    const previousValue = isPaid;
    setIsPaid(!isPaid);
    setIsPaymentToggling(true);

    try {
      await paymentStatusService.toggleMonthlyTransaction(transaction.id);
    } catch {
      // Rollback on failure
      setIsPaid(previousValue);
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setIsPaymentToggling(false);
    }
  }, [transaction, isPaid, isPaymentToggling, t]);

  /**
   * Handles opening the fund selector modal.
   * Validates: Requirements 8.1, 8.8
   */
  const handleOpenFundSelector = useCallback(() => {
    setFundSelectorVisible(true);
  }, []);

  /**
   * Handles fund selection: links or unlinks the transaction from a fund.
   * Validates: Requirements 8.1, 8.6, 8.8
   */
  const handleFundSelect = useCallback(
    async (fundId: string | null) => {
      if (!transaction) return;
      setFundSelectorVisible(false);

      try {
        if (fundId === null) {
          // Unlink transaction from current fund
          if (linkedFundId !== null) {
            await useFundStore.getState().unlinkTransaction(transaction.id);
            setLinkedFundId(null);
          }
        } else {
          // If already linked to a different fund, unlink first
          if (linkedFundId !== null && linkedFundId !== fundId) {
            await useFundStore.getState().unlinkTransaction(transaction.id);
          }
          // Link to selected fund
          if (linkedFundId !== fundId) {
            await useFundStore.getState().linkTransaction(fundId, transaction.id);
            setLinkedFundId(fundId);
          }
        }
      } catch {
        Alert.alert(t('common.error'), t('errors.generic'));
      }
    },
    [transaction, linkedFundId, t]
  );

  /**
   * Handles closing the fund selector modal.
   */
  const handleCloseFundSelector = useCallback(() => {
    setFundSelectorVisible(false);
  }, []);

  /**
   * Gets the display name of the currently linked fund.
   */
  const linkedFundName = useMemo(() => {
    if (!linkedFundId) return null;
    const fund = funds.find((f) => f.id === linkedFundId);
    return fund?.name ?? null;
  }, [linkedFundId, funds]);

  /**
   * Opens the input prompt dialog with the specified configuration.
   */
  const openPrompt = useCallback(
    (
      mode: PromptMode,
      title: string,
      message: string,
      defaultValue: string,
      keyboardType: 'default' | 'decimal-pad' = 'default'
    ) => {
      setPromptMode(mode);
      setPromptTitle(title);
      setPromptMessage(message);
      setPromptDefaultValue(defaultValue);
      setPromptKeyboardType(keyboardType);
      setPromptVisible(true);
    },
    []
  );

  /**
   * Handles the confirm action from the input prompt dialog.
   */
  const handlePromptConfirm = useCallback(
    async (value: string) => {
      if (!transaction) return;
      setPromptVisible(false);

      switch (promptMode) {
        case 'amount-single':
        case 'amount-standard':
        case 'amount-recurring-single': {
          const parsed = parseFloat(value.replace(',', '.'));
          if (isNaN(parsed) || parsed <= 0) {
            Alert.alert(t('common.error'), t('manual.installment.invalidAmount'));
            return;
          }
          const amountInCents = Math.round(parsed * 100);
          const signedAmount = transaction.amount < 0 ? -amountInCents : amountInCents;
          try {
            await update(transaction.id, { amount: signedAmount });
          } catch (_err) {
            Alert.alert(
              t('common.error'),
              promptMode === 'amount-single'
                ? t('manual.installment.editError')
                : t('errors.generic')
            );
          }
          break;
        }

        case 'amount-recurring-future': {
          const parsed = parseFloat(value.replace(',', '.'));
          if (isNaN(parsed) || parsed <= 0) {
            Alert.alert(t('common.error'), t('manual.installment.invalidAmount'));
            return;
          }
          const amountInCents = Math.round(parsed * 100);
          const signedAmount = transaction.amount < 0 ? -amountInCents : amountInCents;
          try {
            await update(transaction.id, { amount: signedAmount });
            await updateRecurringAmount(
              transaction.recurringId!,
              Math.abs(signedAmount),
              transaction.referenceMonth
            );
            Alert.alert(t('common.success'), t('manual.installment.recurringUpdateSuccess'));
          } catch (_err) {
            Alert.alert(t('common.error'), t('manual.installment.recurringUpdateError'));
          }
          break;
        }

        case 'amount-recalculate': {
          const parsed = parseFloat(value.replace(',', '.'));
          if (isNaN(parsed) || parsed <= 0) {
            Alert.alert(t('common.error'), t('manual.installment.invalidAmount'));
            return;
          }
          const totalInCents = Math.round(parsed * 100);
          try {
            await recalculateGroup(transaction.installmentGroupId!, totalInCents);
            Alert.alert(t('common.success'), t('manual.installment.recalculateSuccess'));
          } catch (_err) {
            Alert.alert(t('common.error'), t('manual.installment.editError'));
          }
          break;
        }

        case 'description-single': {
          if (!value || value.trim().length === 0) return;
          try {
            await update(transaction.id, { description: value.trim() });
          } catch (_err) {
            Alert.alert(t('common.error'), t('manual.installment.editError'));
          }
          break;
        }

        case 'description-all': {
          if (!value || value.trim().length === 0) return;
          try {
            await updateGroupField(transaction.installmentGroupId!, 'description', value.trim());
            Alert.alert(t('common.success'), t('manual.installment.updateAllSuccess'));
          } catch (_err) {
            Alert.alert(t('common.error'), t('manual.installment.editError'));
          }
          break;
        }

        case 'description-standard': {
          if (!value || value.trim().length === 0) return;
          try {
            await update(transaction.id, { description: value.trim() });
          } catch (_err) {
            Alert.alert(t('common.error'), t('errors.generic'));
          }
          break;
        }
      }
    },
    [transaction, promptMode, t, update]
  );

  const handlePromptCancel = useCallback(() => {
    setPromptVisible(false);
  }, []);

  /**
   * Opens the category edit bottom sheet
   */
  const handleOpenCategorySheet = useCallback(() => {
    setCategorySheetOpen(true);
  }, []);

  /**
   * Handles category selection from the bottom sheet.
   * For installment group transactions, prompts for scope (this parcel vs all parcels).
   */
  const handleCategorySelect = useCallback(
    (category: Category) => {
      if (!transaction) return;

      // If same category, do nothing
      if (transaction.categoryId === category.id) {
        setCategorySheetOpen(false);
        return;
      }

      if (transaction.installmentGroupId) {
        // Close sheet first, then show scope alert
        setCategorySheetOpen(false);
        Alert.alert(t('categoryEdit.changeCategory'), t('categoryEdit.installmentPrompt'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('categoryEdit.applyToThisParcel'),
            onPress: async () => {
              setIsCategoryUpdating(true);
              try {
                await setTransactionCategory(transaction.id, category.id);
              } catch (_err) {
                Alert.alert(t('common.error'), t('categoryEdit.updateError'));
              } finally {
                setIsCategoryUpdating(false);
              }
            },
          },
          {
            text: t('categoryEdit.applyToAllParcels'),
            onPress: async () => {
              setIsCategoryUpdating(true);
              try {
                await updateGroupField(transaction.installmentGroupId!, 'categoryId', category.id);
              } catch (_err) {
                Alert.alert(t('common.error'), t('categoryEdit.updateError'));
              } finally {
                setIsCategoryUpdating(false);
              }
            },
          },
        ]);
      } else if (transaction.recurringId) {
        // Recurring transaction: ask if should propagate to future occurrences
        setCategorySheetOpen(false);
        Alert.alert(t('categoryEdit.changeCategory'), t('categoryEdit.recurringPrompt'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('categoryEdit.applyToThisOnly'),
            onPress: async () => {
              setIsCategoryUpdating(true);
              try {
                await setTransactionCategory(transaction.id, category.id);
              } catch (_err) {
                Alert.alert(t('common.error'), t('categoryEdit.updateError'));
              } finally {
                setIsCategoryUpdating(false);
              }
            },
          },
          {
            text: t('categoryEdit.applyToAllFuture'),
            onPress: async () => {
              setIsCategoryUpdating(true);
              try {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                await setCategoryWithPropagation(transaction.id, category.id, currentMonth);
              } catch (_err) {
                Alert.alert(t('common.error'), t('categoryEdit.updateError'));
              } finally {
                setIsCategoryUpdating(false);
              }
            },
          },
        ]);
      } else {
        // Non-installment, non-recurring: update directly
        setCategorySheetOpen(false);
        setIsCategoryUpdating(true);
        setTransactionCategory(transaction.id, category.id)
          .catch(() => {
            Alert.alert(t('common.error'), t('categoryEdit.updateError'));
          })
          .finally(() => {
            setIsCategoryUpdating(false);
          });
      }
    },
    [transaction, t]
  );

  const handleCloseCategorySheet = useCallback(() => {
    setCategorySheetOpen(false);
  }, []);

  /**
   * Handles editing a transaction value with group-aware dialog for installment parcels.
   */
  const handleEditValue = useCallback(() => {
    if (!transaction) return;

    if (transaction.recurringId) {
      Alert.alert(
        t('manual.installment.recurringEditTitle'),
        t('manual.installment.recurringEditMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('manual.installment.applyToThisOccurrence'),
            onPress: () => {
              openPrompt(
                'amount-recurring-single',
                t('transactions.amount'),
                t('manual.enterAmount'),
                '',
                'decimal-pad'
              );
            },
          },
          {
            text: t('manual.installment.applyToAllFuture'),
            onPress: () => {
              openPrompt(
                'amount-recurring-future',
                t('transactions.amount'),
                t('manual.enterAmount'),
                '',
                'decimal-pad'
              );
            },
          },
        ]
      );
    } else if (transaction.installmentGroupId) {
      Alert.alert(
        t('manual.installment.editValueTitle'),
        t('manual.installment.editValueMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('manual.installment.applyToThisOnly'),
            onPress: () => {
              openPrompt(
                'amount-single',
                t('transactions.amount'),
                t('manual.enterAmount'),
                '',
                'decimal-pad'
              );
            },
          },
          {
            text: t('manual.installment.recalculateAll'),
            onPress: () => {
              openPrompt(
                'amount-recalculate',
                t('manual.installment.enterNewTotal'),
                t('manual.installment.enterNewTotalMessage'),
                '',
                'decimal-pad'
              );
            },
          },
        ]
      );
    } else {
      openPrompt(
        'amount-standard',
        t('transactions.amount'),
        t('manual.enterAmount'),
        '',
        'decimal-pad'
      );
    }
  }, [t, transaction, openPrompt]);

  /**
   * Handles editing a transaction description with group-aware dialog.
   */
  const handleEditDescription = useCallback(() => {
    if (!transaction) return;

    if (transaction.installmentGroupId) {
      Alert.alert(
        t('manual.installment.editFieldTitle'),
        t('manual.installment.editFieldMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('manual.installment.applyToThisOnly'),
            onPress: () => {
              openPrompt(
                'description-single',
                t('transactions.description'),
                t('manual.enterDescription'),
                transaction.description
              );
            },
          },
          {
            text: t('manual.installment.applyToAll'),
            onPress: () => {
              openPrompt(
                'description-all',
                t('transactions.description'),
                t('manual.enterDescription'),
                transaction.description
              );
            },
          },
        ]
      );
    } else {
      openPrompt(
        'description-standard',
        t('transactions.description'),
        t('manual.enterDescription'),
        transaction.description
      );
    }
  }, [t, transaction, openPrompt]);

  /**
   * Main edit handler that shows edit options for the transaction.
   */
  const handleEdit = useCallback(() => {
    if (!transaction) return;

    Alert.alert(t('common.edit'), t('transactions.editTransaction'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('transactions.amount'), onPress: handleEditValue },
      { text: t('transactions.description'), onPress: handleEditDescription },
    ]);
  }, [t, transaction, handleEditValue, handleEditDescription]);

  /**
   * Handles deleting a transaction with group-aware dialog for installment parcels
   * and recurring-aware dialog for recurring transactions.
   */
  const handleDelete = useCallback(() => {
    if (!transaction) return;

    if (transaction.installmentGroupId) {
      Alert.alert(t('manual.installment.deleteTitle'), t('manual.installment.deleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('manual.installment.deleteThisOnly'),
          onPress: async () => {
            try {
              await deleteSingleParcel(transaction.id, transaction.installmentGroupId!);
              router.back();
            } catch (_err) {
              Alert.alert(t('common.error'), t('manual.installment.editError'));
            }
          },
        },
        {
          text: t('manual.installment.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllInGroup(transaction.installmentGroupId!);
              router.back();
            } catch (_err) {
              Alert.alert(t('common.error'), t('manual.installment.editError'));
            }
          },
        },
      ]);
    } else if (transaction.recurringId) {
      // Recurring transaction: ask scope
      Alert.alert(
        t('manual.installment.recurringDeleteTitle'),
        t('manual.installment.recurringDeleteMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('manual.installment.applyToThisOccurrence'),
            onPress: async () => {
              try {
                await remove(transaction.id);
                router.back();
              } catch (_err) {
                Alert.alert(t('common.error'), t('errors.generic'));
              }
            },
          },
          {
            text: t('manual.installment.recurringDeleteFuture'),
            style: 'destructive',
            onPress: async () => {
              try {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                await remove(transaction.id);
                await deactivateAndDeleteFuture(transaction.recurringId!, currentMonth);
                router.back();
              } catch (_err) {
                Alert.alert(t('common.error'), t('errors.generic'));
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(t('transactions.deleteTransaction'), t('transactions.deleteConfirmation'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(transaction.id);
              router.back();
            } catch (_err) {
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ]);
    }
  }, [t, transaction, remove]);

  const handleToggleExcluded = useCallback(() => {
    Alert.alert(
      t('transactions.excludeFromTotals'),
      'Toggle excluded functionality will be implemented in a future update.',
      [{ text: t('common.ok') }]
    );
  }, [t]);

  // Loading state
  if (isLoading || isDirectFetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <LoadingIndicator message={t('common.loading')} testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  // Transaction not found
  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <EmptyState
          icon="🔍"
          title={t('errors.notFound')}
          description={`Transaction ID: ${id}`}
          testID="not-found-state"
        />
      </SafeAreaView>
    );
  }

  // Format values for display
  const isIncome = transaction.amount > 0;
  const formattedAmount = formatCurrencyLocale(Math.abs(transaction.amount) / 100, locale);
  const formattedDate = formatDateLocale(transaction.date, locale, { dateStyle: 'long' });
  const formattedReferenceMonth = formatReferenceMonth(transaction.referenceMonth, locale);

  const amountColor = isIncome ? colors.semantic.success.dark : colors.semantic.danger.dark;
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      testID="transaction-detail-screen"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display — prominent at top with color-coded formatting */}
        <View
          style={[
            styles.amountContainer,
            { backgroundColor: colors.surface.card },
            themeShadows.sm,
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.text.secondary }]}>
            {isIncome ? t('dashboard.income') : t('dashboard.expenses')}
          </Text>
          <Text style={[styles.amountValue, { color: amountColor }]} testID="amount-display">
            {amountPrefix}
            {formattedAmount}
          </Text>
        </View>

        {/* Transaction Details Card */}
        <View
          style={[styles.detailsCard, { backgroundColor: colors.surface.card }, themeShadows.sm]}
          testID="details-card"
        >
          <DetailRow label={t('transactions.date')} value={formattedDate} testID="detail-date" />
          <DetailRow
            label={t('transactions.description')}
            value={transaction.description}
            testID="detail-description"
          />
          <DetailRow
            label={t('transactions.category')}
            value={isCategoryUpdating ? '...' : (transaction.category?.name ?? '--')}
            valueColor={transaction.category?.color}
            testID="detail-category"
            onPress={handleOpenCategorySheet}
          />
          <DetailRow
            label={t('transactions.referenceMonth')}
            value={formattedReferenceMonth}
            testID="detail-reference-month"
          />
          <DetailRow
            label={t('transactions.excludeFromTotals')}
            value={
              transaction.isExcludedFromTotals
                ? t('transactions.excluded')
                : t('transactions.included')
            }
            testID="detail-excluded"
          />
          <DetailRow
            label={t('futurePlans.transactions.linked')}
            value={linkedFundName ?? t('futurePlans.transactions.noneFund')}
            testID="detail-fund"
            onPress={handleOpenFundSelector}
          />
          {isPaid !== null && (
            <TouchableOpacity
              style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}
              onPress={handleTogglePaymentStatus}
              disabled={isPaymentToggling}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
              testID="detail-payment-status-touchable"
            >
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Status</Text>
              <View style={styles.detailValueContainer}>
                <Text
                  style={[
                    styles.detailValue,
                    { color: isPaid ? colors.semantic.success.dark : colors.semantic.warning.base },
                  ]}
                  testID="detail-payment-status-text"
                >
                  {isPaid ? 'Pago' : 'Pendente'}
                </Text>
                <View style={styles.paymentToggleContainer}>
                  <PaymentStatusToggle
                    isPaid={isPaid}
                    onToggle={handleTogglePaymentStatus}
                    disabled={isPaymentToggling}
                    size="small"
                    testID="detail-payment-status-toggle"
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
          {transaction.duplicateOf && (
            <DetailRow
              label={t('transactions.duplicate')}
              value={t('transactions.duplicateOf')}
              valueColor={colors.semantic.warning.base}
              testID="detail-duplicate"
            />
          )}
        </View>

        {/* Metadata Card */}
        <View
          style={[
            styles.metadataCard,
            { backgroundColor: colors.background.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <Text style={[styles.metadataTitle, { color: colors.text.tertiary }]}>Metadata</Text>
          <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
            ID: {transaction.id}
          </Text>
          <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
            Created: {formatDateLocale(transaction.createdAt, locale, { includeTime: true })}
          </Text>
          <Text style={[styles.metadataText, { color: colors.text.secondary }]}>
            Updated: {formatDateLocale(transaction.updatedAt, locale, { includeTime: true })}
          </Text>
        </View>

        {/* Action Buttons — clear visual hierarchy */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.interactive.primary }]}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            testID="edit-button"
          >
            <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
              {t('common.edit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.background.tertiary }]}
            onPress={handleToggleExcluded}
            accessibilityRole="button"
            accessibilityLabel={t('transactions.excludeFromTotals')}
            testID="toggle-excluded-button"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text.primary }]}>
              {transaction.isExcludedFromTotals
                ? t('transactions.included')
                : t('transactions.excluded')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dangerButton,
              { backgroundColor: colors.surface.card, borderColor: colors.semantic.danger.base },
            ]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            testID="delete-button"
          >
            <Text style={[styles.dangerButtonText, { color: colors.semantic.danger.base }]}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Edit Bottom Sheet */}
      <Modal
        visible={categorySheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCategorySheet}
        testID="category-edit-modal"
      >
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface.card }]}>
            <SafeAreaView style={styles.bottomSheetSafeArea}>
              {/* Handle indicator */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: colors.text.primary }]}>
                  {t('categoryEdit.changeCategory')}
                </Text>
                <Text style={[styles.bottomSheetSubtitle, { color: colors.text.secondary }]}>
                  {t('categoryEdit.selectNewCategory')}
                </Text>
              </View>

              {/* Category Selector */}
              <View style={styles.selectorContainer}>
                <CategorySelector
                  selectedCategoryId={transaction.categoryId}
                  onSelect={handleCategorySelect}
                  includeIncome={true}
                  testID="category-edit-selector"
                />
              </View>

              {/* Cancel Button */}
              <View style={[styles.bottomSheetActions, { borderTopColor: colors.border.default }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseCategorySheet}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  testID="category-edit-cancel"
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Fund Selector Modal */}
      <FundSelector
        visible={fundSelectorVisible}
        onSelect={handleFundSelect}
        onClose={handleCloseFundSelector}
        selectedFundId={linkedFundId}
        testID="fund-selector-modal"
      />

      {/* Input Prompt Dialog for editing values/descriptions */}
      <InputPromptDialog
        visible={promptVisible}
        title={promptTitle}
        message={promptMessage}
        defaultValue={promptDefaultValue}
        keyboardType={promptKeyboardType}
        confirmText={t('common.save')}
        cancelText={t('common.cancel')}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
        testID="edit-prompt-dialog"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  // Amount display — prominent at top
  amountContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  amountLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '700',
  },

  // Details card
  detailsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    flex: 1,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  detailValue: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    textAlign: 'right',
  },
  detailChevron: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  paymentToggleContainer: {
    marginLeft: spacing.sm,
  },
  // Metadata card
  metadataCard: {
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metadataTitle: {
    fontSize: typography.overline.fontSize,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataText: {
    fontSize: typography.overline.fontSize,
    marginBottom: spacing.xs,
  },

  // Action buttons — clear visual hierarchy
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  dangerButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  // Bottom sheet styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    maxHeight: '80%',
    minHeight: 400,
  },
  bottomSheetSafeArea: {},
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  bottomSheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  bottomSheetTitle: {
    fontSize: typography.title.fontSize - 2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  bottomSheetSubtitle: {
    fontSize: typography.caption.fontSize + 1,
    lineHeight: 20,
  },
  selectorContainer: {
    minHeight: 200,
    paddingHorizontal: spacing.lg,
  },
  bottomSheetActions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});
