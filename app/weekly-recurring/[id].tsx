/**
 * Weekly Recurring Group Detail Screen (Entry_Screen)
 *
 * Shows the OccurrenceList for a specific group with edit form access.
 * When `?edit=true` query param is present, shows the edit form instead.
 * Provides occurrence editing via OccurrenceEditModal.
 * Displays payment status toggles, group payment summary, and bulk mark action.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 6.1, 6.2, 6.3**
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OccurrenceList } from '../../src/components/weekly-recurring/OccurrenceList';
import { OccurrenceEditModal } from '../../src/components/weekly-recurring/OccurrenceEditModal';
import { WeeklyRecurringForm } from '../../src/components/weekly-recurring/WeeklyRecurringForm';
import { useWeeklyRecurringStore } from '../../src/stores/weeklyRecurringStore';
import { usePaymentStatusStore } from '../../src/stores/paymentStatusStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCategories } from '../../src/hooks/useCategories';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { weeklyRecurringService } from '../../src/services/weekly-recurring/WeeklyRecurringService';
import { weeklyOccurrenceRepository } from '../../src/repositories/WeeklyOccurrenceRepository';
import { paymentStatusService } from '../../src/services/payment-status/PaymentStatusService';
import { useToastStore } from '../../src/stores/toastStore';
import { spacing } from '../../src/constants/theme';
import type {
  WeeklyRecurringGroup,
  WeeklyOccurrence,
  UpdateWeeklyGroupDTO,
  CreateWeeklyGroupDTO,
  UpdateOccurrenceDTO,
} from '../../src/types/weeklyRecurring';
import type { GroupPaymentSummary } from '../../src/types/paymentStatus';

export default function WeeklyRecurringDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  const { updateGroup, updateOccurrence } = useWeeklyRecurringStore();
  const { bulkMarkAsPaid } = usePaymentStatusStore();
  const { expenseCategories } = useCategories();

  // Local state
  const [group, setGroup] = useState<WeeklyRecurringGroup | null>(null);
  const [occurrences, setOccurrences] = useState<WeeklyOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(edit === 'true');

  // Payment status state
  const [paymentSummary, setPaymentSummary] = useState<GroupPaymentSummary | null>(null);

  // Occurrence edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<WeeklyOccurrence | null>(null);

  // Load group and occurrences
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const groupData = await weeklyRecurringService.getGroupById(id);
        setGroup(groupData);

        if (groupData) {
          const groupOccurrences = await weeklyOccurrenceRepository.getByGroupId(id);
          // Sort chronologically
          const sorted = [...groupOccurrences].sort((a, b) => a.date.localeCompare(b.date));
          setOccurrences(sorted);

          // Load payment summary
          const summary = await paymentStatusService.getGroupPaymentSummary(id, 'weekly');
          setPaymentSummary(summary);
        }
      } catch (error) {
        console.error('Failed to load weekly recurring group:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Handle occurrence status toggle
  const handleStatusToggle = useCallback(
    async (occurrenceId: string) => {
      try {
        await paymentStatusService.toggleWeeklyOccurrence(occurrenceId);

        // Reload occurrences and summary
        if (id) {
          const updated = await weeklyOccurrenceRepository.getByGroupId(id);
          const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date));
          setOccurrences(sorted);

          const summary = await paymentStatusService.getGroupPaymentSummary(id, 'weekly');
          setPaymentSummary(summary);
        }
      } catch (error) {
        console.error('Failed to toggle payment status:', error);
        useToastStore.getState().showError(
          t('paymentStatus.toggleError', {
            defaultValue: 'Não foi possível alterar o status de pagamento.',
          })
        );
      }
    },
    [id, t]
  );

  // Handle bulk mark as paid
  const handleBulkMark = useCallback(async () => {
    if (!id) return;

    try {
      const result = await bulkMarkAsPaid(id, 'weekly');

      if (result.markedCount > 0) {
        // Show success confirmation with count
        useToastStore.getState().showSuccess(
          t('paymentStatus.bulkMarkSuccess', {
            count: result.markedCount,
            defaultValue: `${result.markedCount} ocorrências marcadas como pagas`,
          })
        );

        // Reload occurrences and summary
        const updated = await weeklyOccurrenceRepository.getByGroupId(id);
        const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date));
        setOccurrences(sorted);

        const summary = await paymentStatusService.getGroupPaymentSummary(id, 'weekly');
        setPaymentSummary(summary);
      } else {
        useToastStore.getState().showInfo(
          t('paymentStatus.allAlreadyPaid', {
            defaultValue: 'Todas as ocorrências já estão pagas.',
          })
        );
      }
    } catch (error) {
      console.error('Failed to bulk mark as paid:', error);
    }
  }, [id, bulkMarkAsPaid, t]);

  // Handle occurrence edit
  const handleOccurrenceEdit = useCallback((occurrence: WeeklyOccurrence) => {
    setSelectedOccurrence(occurrence);
    setEditModalVisible(true);
  }, []);

  // Handle occurrence save
  const handleOccurrenceSave = useCallback(
    async (occurrenceId: string, dto: UpdateOccurrenceDTO) => {
      await updateOccurrence(occurrenceId, dto);
      // Reload occurrences after save
      if (id) {
        const updated = await weeklyOccurrenceRepository.getByGroupId(id);
        const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date));
        setOccurrences(sorted);
      }
    },
    [id, updateOccurrence]
  );

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setEditModalVisible(false);
    setSelectedOccurrence(null);
  }, []);

  // Handle group edit submit
  const handleGroupEditSubmit = useCallback(
    (data: UpdateWeeklyGroupDTO | CreateWeeklyGroupDTO) => {
      if (!id) return;
      updateGroup(id, data as UpdateWeeklyGroupDTO)
        .then(() => {
          router.back();
        })
        .catch(() => {
          Alert.alert(
            t('common.error', { defaultValue: 'Erro' }),
            t('weeklyRecurring.errors.updateFailed', {
              defaultValue: 'Não foi possível atualizar o grupo.',
            })
          );
        });
    },
    [id, updateGroup, router, t]
  );

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (edit === 'true') {
      router.back();
    } else {
      setIsEditMode(false);
    }
  }, [edit, router]);

  // Dynamic header title
  const headerTitle = useMemo(() => {
    if (isEditMode) {
      return t('weeklyRecurring.editTitle', { defaultValue: 'Editar Grupo' });
    }
    return group?.title ?? t('weeklyRecurring.occurrencesTitle', { defaultValue: 'Ocorrências' });
  }, [isEditMode, group, t]);

  // Payment summary text
  const summaryText = useMemo(() => {
    if (!paymentSummary) return '';
    return t('paymentStatus.groupSummary', {
      paid: paymentSummary.paidCount,
      total: paymentSummary.totalCount,
      defaultValue: `${paymentSummary.paidCount} de ${paymentSummary.totalCount} pagas`,
    });
  }, [paymentSummary, t]);

  // Check if there are pending items for bulk mark
  const hasPendingItems = useMemo(() => {
    return (paymentSummary?.pendingCount ?? 0) > 0;
  }, [paymentSummary]);

  // Dynamic styles
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        summaryContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          backgroundColor: colors.background.primary,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        summaryText: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.text.secondary,
        },
        bulkMarkButton: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: 8,
          backgroundColor: colors.semantic.success.light,
        },
        bulkMarkButtonDisabled: {
          opacity: 0.5,
        },
        bulkMarkText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.semantic.success.dark,
        },
        occurrenceItemContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        occurrenceToggle: {
          marginRight: spacing.md,
        },
        occurrenceContent: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        occurrenceDateText: {
          fontSize: 14,
          fontWeight: '400',
          color: colors.text.primary,
        },
        occurrenceDateTextPaid: {
          color: colors.text.tertiary,
          textDecorationLine: 'line-through',
        },
        occurrenceAmountText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text.primary,
        },
        occurrenceAmountTextPaid: {
          color: colors.text.tertiary,
        },
        editedBadge: {
          marginLeft: spacing.sm,
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: colors.semantic.warning.light,
        },
        editedBadgeText: {
          fontSize: 10,
          fontWeight: '600',
          color: colors.semantic.warning.dark,
        },
        listContainer: {
          flex: 1,
        },
      }),
    [colors]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen options={{ title: headerTitle }} />
        <LoadingIndicator size="large" />
      </View>
    );
  }

  // Group not found
  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen options={{ title: headerTitle }} />
        <EmptyState
          icon="🔍"
          title={t('common.notFound', { defaultValue: 'Não encontrado' })}
          description={t('weeklyRecurring.groupNotFound', {
            defaultValue: 'Grupo não encontrado.',
          })}
          testID="group-not-found"
        />
      </View>
    );
  }

  // Edit mode: show form
  if (isEditMode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <Stack.Screen options={{ title: headerTitle }} />
        <WeeklyRecurringForm
          initialValues={group}
          categories={expenseCategories}
          onSubmit={handleGroupEditSubmit}
          onCancel={handleCancelEdit}
          testID="weekly-recurring-edit-form"
        />
      </View>
    );
  }

  // Default: show occurrences list with payment status
  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <Stack.Screen options={{ title: headerTitle }} />

      {/* Payment Summary and Bulk Mark */}
      <View style={dynamicStyles.summaryContainer} testID="payment-summary-section">
        <Text style={dynamicStyles.summaryText} testID="payment-summary-text">
          {summaryText}
        </Text>
        <TouchableOpacity
          style={[
            dynamicStyles.bulkMarkButton,
            !hasPendingItems && dynamicStyles.bulkMarkButtonDisabled,
          ]}
          onPress={handleBulkMark}
          disabled={!hasPendingItems}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('paymentStatus.bulkMarkLabel', {
            defaultValue: 'Marcar todas como pagas',
          })}
          testID="bulk-mark-button"
        >
          <Text style={dynamicStyles.bulkMarkText}>
            {t('paymentStatus.bulkMarkButton', {
              defaultValue: 'Marcar todas como pagas',
            })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Occurrences list with status toggles */}
      <View style={dynamicStyles.listContainer}>
        <OccurrenceList
          occurrences={occurrences}
          onEdit={handleOccurrenceEdit}
          onStatusToggle={handleStatusToggle}
          showStatusToggle
          testID="weekly-recurring-occurrences"
        />
      </View>

      <OccurrenceEditModal
        occurrence={selectedOccurrence}
        visible={editModalVisible}
        onClose={handleModalClose}
        onSave={handleOccurrenceSave}
        testID="weekly-recurring-edit-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
