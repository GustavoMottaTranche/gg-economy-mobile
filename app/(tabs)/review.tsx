/**
 * Review Screen (Tab: review)
 *
 * Displays transactions pending review with:
 * - Transactions grouped by import batch
 * - Category assignment with suggestions from CategorizationEngine
 * - Description editing
 * - Exclude from totals toggle
 * - Duplicate resolution UI
 *
 * Uses useReviewQueue hook with Drizzle Live Queries for reactive updates.
 *
 * **Validates: Requirements 16, 17, 30**
 */
import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { useReviewQueue, type ReviewTransaction } from '../../src/hooks/useReviewQueue';
import { useCategories } from '../../src/hooks/useCategories';
import { TransactionCard } from '../../src/components/ui/TransactionCard';
import { CategoryPicker } from '../../src/components/ui/CategoryPicker';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { categorizationEngine } from '../../src/services/CategorizationEngine';
import { getActiveCategorizationRules } from '../../src/db/queries/categorizationRules';
import { formatCurrencyLocale, formatDateLocale, getCurrentLocale } from '../../src/i18n';
import type { Category } from '../../src/types/category';
import type { CategorizationRule } from '../../src/types/categorizationRule';

/**
 * Section data for SectionList
 */
interface ReviewSection {
  title: string;
  batchId: string | null;
  batchFileName: string | null;
  batchDate: Date | null;
  data: ReviewTransaction[];
  count: number;
}

/**
 * Props for ReviewItemModal
 */
interface ReviewItemModalProps {
  visible: boolean;
  transaction: ReviewTransaction | null;
  categories: Category[];
  suggestedCategoryId: string | null;
  onClose: () => void;
  onSave: (updates: {
    categoryId: string | null;
    description: string;
    isExcludedFromTotals: boolean;
  }) => Promise<void>;
  onMarkAsReviewed: () => Promise<void>;
  onDelete: () => Promise<void>;
  onResolveDuplicate: (action: 'keep_both' | 'keep_existing' | 'keep_new') => Promise<void>;
}

/**
 * ReviewItemModal Component
 * Modal for editing and categorizing a single transaction
 */
const ReviewItemModal = memo(function ReviewItemModal({
  visible,
  transaction,
  categories,
  suggestedCategoryId,
  onClose,
  onSave,
  onMarkAsReviewed,
  onDelete,
  onResolveDuplicate,
}: ReviewItemModalProps): React.ReactElement | null {
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isExcludedFromTotals, setIsExcludedFromTotals] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when transaction changes
  React.useEffect(() => {
    if (transaction) {
      setSelectedCategoryId(transaction.categoryId);
      setDescription(transaction.description);
      setIsExcludedFromTotals(transaction.isExcludedFromTotals);
    }
  }, [transaction]);

  if (!transaction) return null;

  const isIncome = transaction.amount > 0;
  const isDuplicate = !!transaction.duplicateOf;
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const suggestedCategory = suggestedCategoryId
    ? categories.find((c) => c.id === suggestedCategoryId)
    : null;

  const handleSaveAndReview = async () => {
    setIsSaving(true);
    try {
      await onSave({
        categoryId: selectedCategoryId,
        description,
        isExcludedFromTotals,
      });
      await onMarkAsReviewed();
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t('transactions.deleteTransaction'), t('transactions.deleteConfirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await onDelete();
          onClose();
        },
      },
    ]);
  };

  const handleSelectSuggested = () => {
    if (suggestedCategoryId) {
      setSelectedCategoryId(suggestedCategoryId);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryId(category.id);
    setShowCategoryPicker(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="review-item-modal"
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('review.reviewItem')}</Text>
            <TouchableOpacity
              onPress={handleSaveAndReview}
              style={styles.headerButton}
              disabled={isSaving}
            >
              <Text style={[styles.headerButtonText, styles.saveButtonText]}>
                {isSaving ? t('common.loading') : t('review.markAsReviewed')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Transaction Info */}
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDate}>
                {formatDateLocale(transaction.date, locale, { dateStyle: 'long' })}
              </Text>
              <Text style={[styles.transactionAmount, { color: isIncome ? '#166534' : '#991b1b' }]}>
                {isIncome ? '+' : '-'}
                {formatCurrencyLocale(Math.abs(transaction.amount) / 100, locale)}
              </Text>
            </View>

            {/* Duplicate Warning */}
            {isDuplicate && (
              <View style={styles.duplicateWarning}>
                <Text style={styles.duplicateWarningIcon}>⚠️</Text>
                <Text style={styles.duplicateWarningText}>{t('review.duplicateDetected')}</Text>
              </View>
            )}

            {/* Duplicate Resolution */}
            {isDuplicate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('review.duplicateDetected')}</Text>
                <View style={styles.duplicateActions}>
                  <TouchableOpacity
                    style={styles.duplicateButton}
                    onPress={() => onResolveDuplicate('keep_both')}
                  >
                    <Text style={styles.duplicateButtonText}>{t('review.keepBoth')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateButton}
                    onPress={() => onResolveDuplicate('keep_existing')}
                  >
                    <Text style={styles.duplicateButtonText}>{t('review.keepExisting')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.duplicateButton, styles.duplicateButtonPrimary]}
                    onPress={() => onResolveDuplicate('keep_new')}
                  >
                    <Text style={[styles.duplicateButtonText, styles.duplicateButtonTextPrimary]}>
                      {t('review.keepNew')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('transactions.description')}</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder={t('manual.enterDescription')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                testID="description-input"
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('transactions.category')}</Text>

              {/* Suggested Category */}
              {suggestedCategory && suggestedCategoryId !== selectedCategoryId && (
                <TouchableOpacity
                  style={styles.suggestedCategory}
                  onPress={handleSelectSuggested}
                  testID="suggested-category"
                >
                  <View style={styles.suggestedCategoryContent}>
                    <Text style={styles.suggestedLabel}>{t('review.suggestedCategory')}</Text>
                    <View style={styles.categoryDisplay}>
                      <View
                        style={[styles.categoryIcon, { backgroundColor: suggestedCategory.color }]}
                      >
                        <Text style={styles.categoryIconText}>{suggestedCategory.icon}</Text>
                      </View>
                      <Text style={styles.categoryName}>{suggestedCategory.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.useSuggested}>{t('common.select')}</Text>
                </TouchableOpacity>
              )}

              {/* Selected Category */}
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryPicker(true)}
                testID="category-selector"
              >
                {selectedCategory ? (
                  <View style={styles.categoryDisplay}>
                    <View
                      style={[styles.categoryIcon, { backgroundColor: selectedCategory.color }]}
                    >
                      <Text style={styles.categoryIconText}>{selectedCategory.icon}</Text>
                    </View>
                    <Text style={styles.categoryName}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.categoryPlaceholder}>{t('manual.selectCategory')}</Text>
                )}
                <Text style={styles.categoryArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Exclude from Totals */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{t('transactions.excludeFromTotals')}</Text>
                  <Text style={styles.toggleDescription}>
                    {isExcludedFromTotals ? t('transactions.excluded') : t('transactions.included')}
                  </Text>
                </View>
                <Switch
                  value={isExcludedFromTotals}
                  onValueChange={setIsExcludedFromTotals}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={isExcludedFromTotals ? '#3b82f6' : '#f4f4f5'}
                  testID="exclude-toggle"
                />
              </View>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              testID="delete-button"
            >
              <Text style={styles.deleteButtonText}>{t('transactions.deleteTransaction')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category Picker Modal */}
        <CategoryPicker
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelect={handleCategorySelect}
          visible={showCategoryPicker}
          onClose={() => setShowCategoryPicker(false)}
          filterType={isIncome ? 'income' : 'expense'}
          asModal
          testID="category-picker"
        />
      </SafeAreaView>
    </Modal>
  );
});

/**
 * BatchHeader Component
 * Displays the header for each import batch section
 */
const BatchHeader = memo(function BatchHeader({
  title,
  count,
  batchDate,
  onMarkAllReviewed,
}: {
  title: string;
  count: number;
  batchDate: Date | null;
  onMarkAllReviewed: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderCount}>{t('review.transactionsToReview', { count })}</Text>
        {batchDate && (
          <Text style={styles.sectionHeaderDate}>
            {formatDateLocale(batchDate, locale, { dateStyle: 'medium' })}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.markAllButton}
        onPress={onMarkAllReviewed}
        accessibilityLabel={t('review.reviewAll')}
      >
        <Text style={styles.markAllButtonText}>{t('review.reviewAll')}</Text>
      </TouchableOpacity>
    </View>
  );
});

/**
 * ReviewScreen Component
 * Main screen for reviewing imported transactions
 */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    transactions: reviewTransactions,
    groupedByBatch,
    count: reviewCount,
    isLoading,
    error,
    markAsReviewed,
    markBatchAsReviewed,
    update,
    remove,
  } = useReviewQueue();

  const { categories } = useCategories({ includeInactive: false });

  const [selectedTransaction, setSelectedTransaction] = useState<ReviewTransaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [categorizationRules, setCategorizationRules] = useState<CategorizationRule[]>([]);

  // Load categorization rules on mount
  React.useEffect(() => {
    const loadRules = async () => {
      try {
        const rules = await getActiveCategorizationRules();
        setCategorizationRules(rules);
      } catch (err) {
        console.error('Failed to load categorization rules:', err);
      }
    };
    loadRules();
  }, []);

  // Convert grouped data to sections for SectionList
  const sections = useMemo<ReviewSection[]>(() => {
    return groupedByBatch.map((group) => ({
      title: group.batch?.fileName ?? t('review.importBatch'),
      batchId: group.batchId,
      batchFileName: group.batch?.fileName ?? null,
      batchDate: group.batch?.importedAt ?? null,
      data: group.transactions,
      count: group.count,
    }));
  }, [groupedByBatch, t]);

  // Handle transaction press - open modal
  const handleTransactionPress = useCallback(
    async (transaction: ReviewTransaction) => {
      setSelectedTransaction(transaction);

      // Get category suggestion from CategorizationEngine
      if (categorizationRules.length > 0) {
        const result = categorizationEngine.categorize(
          transaction.description,
          categorizationRules
        );
        setSuggestedCategoryId(result.categoryId);
      } else {
        setSuggestedCategoryId(null);
      }

      setModalVisible(true);
    },
    [categorizationRules]
  );

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedTransaction(null);
    setSuggestedCategoryId(null);
  }, []);

  // Handle save transaction updates
  const handleSaveTransaction = useCallback(
    async (updates: {
      categoryId: string | null;
      description: string;
      isExcludedFromTotals: boolean;
    }) => {
      if (!selectedTransaction) return;

      await update(selectedTransaction.id, {
        categoryId: updates.categoryId,
        description: updates.description,
        isExcludedFromTotals: updates.isExcludedFromTotals,
      });
    },
    [selectedTransaction, update]
  );

  // Handle mark as reviewed
  const handleMarkAsReviewed = useCallback(async () => {
    if (!selectedTransaction) return;
    await markAsReviewed(selectedTransaction.id);
  }, [selectedTransaction, markAsReviewed]);

  // Handle delete transaction
  const handleDeleteTransaction = useCallback(async () => {
    if (!selectedTransaction) return;
    await remove(selectedTransaction.id);
  }, [selectedTransaction, remove]);

  // Handle duplicate resolution
  const handleResolveDuplicate = useCallback(
    async (action: 'keep_both' | 'keep_existing' | 'keep_new') => {
      if (!selectedTransaction) return;

      switch (action) {
        case 'keep_both':
          // Clear duplicate reference and mark as reviewed
          await update(selectedTransaction.id, { needsReview: false });
          break;
        case 'keep_existing':
          // Delete the new transaction
          await remove(selectedTransaction.id);
          break;
        case 'keep_new':
          // Delete the existing duplicate and keep this one
          if (selectedTransaction.duplicateOf) {
            await remove(selectedTransaction.duplicateOf);
          }
          await update(selectedTransaction.id, { needsReview: false });
          break;
      }

      handleModalClose();
    },
    [selectedTransaction, update, remove, handleModalClose]
  );

  // Handle mark batch as reviewed
  const handleMarkBatchAsReviewed = useCallback(
    async (batchId: string | null) => {
      if (batchId) {
        await markBatchAsReviewed(batchId);
      } else {
        // For manual entries (no batch), mark all in that section
        const manualTransactions = reviewTransactions.filter((tx) => !tx.batchId);
        for (const tx of manualTransactions) {
          await markAsReviewed(tx.id);
        }
      }
    },
    [markBatchAsReviewed, markAsReviewed, reviewTransactions]
  );

  // Navigate to import screen
  const handleNavigateToImport = useCallback(() => {
    router.push('/import');
  }, [router]);

  // Render transaction item
  const renderItem = useCallback(
    ({ item }: { item: ReviewTransaction }) => (
      <TransactionCard
        transaction={item}
        category={item.category}
        onPress={() => handleTransactionPress(item)}
        showDuplicateIndicator
        showExcludedIndicator
        testID={`review-transaction-${item.id}`}
      />
    ),
    [handleTransactionPress]
  );

  // Render section header
  const renderSectionHeader = useCallback(
    ({ section }: { section: ReviewSection }) => (
      <BatchHeader
        title={section.title}
        count={section.count}
        batchDate={section.batchDate}
        onMarkAllReviewed={() => handleMarkBatchAsReviewed(section.batchId)}
      />
    ),
    [handleMarkBatchAsReviewed]
  );

  // Key extractor
  const keyExtractor = useCallback((item: ReviewTransaction) => item.id, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID="review-screen-loading">
        <LoadingIndicator message={t('common.loading')} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container} testID="review-screen-error">
        <EmptyState
          icon="❌"
          title={t('common.error')}
          description={error}
          action={{
            label: t('common.retry'),
            onPress: () => {
              // Refresh will be triggered by the hook
            },
          }}
        />
      </View>
    );
  }

  // Empty state
  if (reviewCount === 0) {
    return (
      <View style={styles.container} testID="review-screen-empty">
        <EmptyState
          icon="✅"
          title={t('empty.review')}
          description={t('empty.reviewHint')}
          action={{
            label: t('fileImport.selectFile'),
            onPress: handleNavigateToImport,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="review-screen">
      {/* Header with count */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('review.title')}</Text>
        <Text style={styles.headerCount}>
          {t('review.transactionsToReview', { count: reviewCount })}
        </Text>
      </View>

      {/* Transaction List grouped by batch */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        testID="review-list"
      />

      {/* Review Item Modal */}
      <ReviewItemModal
        visible={modalVisible}
        transaction={selectedTransaction}
        categories={categories}
        suggestedCategoryId={suggestedCategoryId}
        onClose={handleModalClose}
        onSave={handleSaveTransaction}
        onMarkAsReviewed={handleMarkAsReviewed}
        onDelete={handleDeleteTransaction}
        onResolveDuplicate={handleResolveDuplicate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  sectionHeaderCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionHeaderDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#3b82f6',
  },
  saveButtonText: {
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  transactionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  duplicateWarningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  duplicateWarningText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  suggestedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  suggestedCategoryContent: {
    flex: 1,
  },
  suggestedLabel: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 4,
  },
  useSuggested: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  categoryArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  duplicateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  duplicateButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  duplicateButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  duplicateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  duplicateButtonTextPrimary: {
    color: '#ffffff',
  },
  deleteButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '500',
  },
});
