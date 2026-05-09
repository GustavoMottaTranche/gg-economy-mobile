/**
 * Transaction Detail Screen
 *
 * Modal screen for viewing and editing transaction details:
 * - View all transaction fields
 * - Edit transaction (navigate to edit mode)
 * - Delete transaction with confirmation
 *
 * **Validates: Requirements 19, 20, 30**
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTransactions } from '../../src/hooks/useTransactions';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  formatCurrencyLocale,
  formatDateLocale,
  getCurrentLocale,
  getMonthName,
} from '../../src/i18n';

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
 * Detail Row Component
 */
interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  testID?: string;
}

function DetailRow({ label, value, valueColor, testID }: DetailRowProps): React.ReactElement {
  return (
    <View style={styles.detailRow} testID={testID}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
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

  // Fetch all transactions and find the one we need
  const { transactions, isLoading, remove } = useTransactions();

  // Find the transaction by ID
  const transaction = useMemo(() => transactions.find((tx) => tx.id === id), [transactions, id]);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleEdit = useCallback(() => {
    // TODO: Implement edit functionality in a future task
    Alert.alert(t('common.edit'), 'Edit functionality will be implemented in a future update.', [
      { text: t('common.ok') },
    ]);
  }, [t]);

  const handleDelete = useCallback(() => {
    if (!transaction) return;

    Alert.alert(t('transactions.deleteTransaction'), t('transactions.deleteConfirmation'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(transaction.id);
            router.back();
          } catch (err) {
            Alert.alert(t('common.error'), t('errors.generic'));
          }
        },
      },
    ]);
  }, [t, transaction, remove]);

  const handleToggleExcluded = useCallback(() => {
    // TODO: Implement toggle excluded functionality
    Alert.alert(
      t('transactions.excludeFromTotals'),
      'Toggle excluded functionality will be implemented in a future update.',
      [{ text: t('common.ok') }]
    );
  }, [t]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('transactions.editTransaction')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <LoadingIndicator message={t('common.loading')} testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  // Transaction not found
  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('transactions.editTransaction')}</Text>
          <View style={styles.headerSpacer} />
        </View>
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
  const formattedDate = formatDateLocale(transaction.date, locale, {
    dateStyle: 'long',
  });
  const formattedReferenceMonth = formatReferenceMonth(transaction.referenceMonth, locale);

  const amountColor = isIncome ? '#166534' : '#991b1b';
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <SafeAreaView style={styles.container} testID="transaction-detail-screen">
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="close-button"
        >
          <Text style={styles.closeButtonText}>{t('common.close')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('transactions.editTransaction')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>
            {isIncome ? t('dashboard.income') : t('dashboard.expenses')}
          </Text>
          <Text style={[styles.amountValue, { color: amountColor }]} testID="amount-display">
            {amountPrefix}
            {formattedAmount}
          </Text>
        </View>

        {/* Transaction Details Card */}
        <View style={styles.detailsCard} testID="details-card">
          <DetailRow label={t('transactions.date')} value={formattedDate} testID="detail-date" />
          <DetailRow
            label={t('transactions.description')}
            value={transaction.description}
            testID="detail-description"
          />
          <DetailRow
            label={t('transactions.category')}
            value={transaction.category?.name ?? '--'}
            valueColor={transaction.category?.color}
            testID="detail-category"
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
          {transaction.duplicateOf && (
            <DetailRow
              label={t('transactions.duplicate')}
              value={t('transactions.duplicateOf')}
              valueColor="#F59E0B"
              testID="detail-duplicate"
            />
          )}
        </View>

        {/* Metadata Card */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>Metadata</Text>
          <Text style={styles.metadataText}>ID: {transaction.id}</Text>
          <Text style={styles.metadataText}>
            Created: {formatDateLocale(transaction.createdAt, locale, { includeTime: true })}
          </Text>
          <Text style={styles.metadataText}>
            Updated: {formatDateLocale(transaction.updatedAt, locale, { includeTime: true })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={handleToggleExcluded}
            accessibilityRole="button"
            accessibilityLabel={t('transactions.excludeFromTotals')}
            testID="toggle-excluded-button"
          >
            <Text style={styles.toggleButtonText}>
              {transaction.isExcludedFromTotals
                ? t('transactions.included')
                : t('transactions.excluded')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            testID="edit-button"
          >
            <Text style={styles.editButtonText}>{t('common.edit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            testID="delete-button"
          >
            <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  metadataCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  actions: {
    gap: 12,
  },
  toggleButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
