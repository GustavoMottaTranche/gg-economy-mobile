/**
 * Weekly Parcel Detail Screen
 *
 * Detail view for an individual weekly occurrence (parcel).
 * Shows occurrence date, amount, payment status, and allows editing the amount.
 * On save, calls weeklyRecurringStore.updateOccurrence and recalculates group total.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useWeeklyRecurringStore } from '../../src/stores/weeklyRecurringStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { PaymentStatusToggle } from '../../src/components/PaymentStatusToggle';
import { paymentStatusService } from '../../src/services/payment-status/PaymentStatusService';
import { weeklyOccurrenceRepository } from '../../src/repositories/WeeklyOccurrenceRepository';
import { weeklyRecurringService } from '../../src/services/weekly-recurring/WeeklyRecurringService';
import { validateParcelAmount } from '../../src/validation/parcelAmountValidation';
import { formatCurrencyLocale, getCurrentLocale } from '../../src/i18n';
import { spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { useToastStore } from '../../src/stores/toastStore';
import type { WeeklyOccurrence, WeeklyRecurringGroup } from '../../src/types/weeklyRecurring';

/**
 * Formats a date string (YYYY-MM-DD) into a localized long format.
 */
function formatOccurrenceDate(dateStr: string, locale: 'pt-BR' | 'en'): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Detail Row Component for displaying occurrence information
 */
interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  testID?: string;
}

function DetailRow({ label, value, valueColor, testID }: DetailRowProps): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View style={[detailStyles.row, { borderBottomColor: colors.border.subtle }]} testID={testID}>
      <Text style={[detailStyles.label, { color: colors.text.secondary }]}>{label}</Text>
      <Text
        style={[
          detailStyles.value,
          { color: colors.text.primary },
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    textAlign: 'right',
    flex: 2,
  },
});

/**
 * Main Parcel Detail Screen Component
 */
export default function ParcelDetailScreen(): React.ReactElement {
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId: string }>();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const locale = getCurrentLocale();
  const themeShadows = shadows[resolvedScheme];

  const { updateOccurrence } = useWeeklyRecurringStore();

  // Local state
  const [occurrence, setOccurrence] = useState<WeeklyOccurrence | null>(null);
  const [group, setGroup] = useState<WeeklyRecurringGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load occurrence data
  useEffect(() => {
    async function loadData() {
      if (!occurrenceId) return;
      setIsLoading(true);
      try {
        const occ = await weeklyOccurrenceRepository.getById(occurrenceId);
        setOccurrence(occ);

        if (occ) {
          const groupData = await weeklyRecurringService.getGroupById(occ.weeklyGroupId);
          setGroup(groupData);
        }
      } catch (error) {
        console.error('Failed to load occurrence:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [occurrenceId]);

  // Handle payment status toggle
  const handleTogglePaymentStatus = useCallback(async () => {
    if (!occurrence) return;
    try {
      await paymentStatusService.toggleWeeklyOccurrence(occurrence.id);
      // Reload occurrence
      const updated = await weeklyOccurrenceRepository.getById(occurrence.id);
      setOccurrence(updated);
      // Refresh store for the month
      useWeeklyRecurringStore.getState().loadOccurrencesForMonth(occurrence.referenceMonth);
    } catch (error) {
      useToastStore.getState().showError(
        t('paymentStatus.toggleError', {
          defaultValue: 'Não foi possível alterar o status de pagamento.',
        })
      );
    }
  }, [occurrence, t]);

  // Start editing amount
  const handleStartEdit = useCallback(() => {
    if (!occurrence) return;
    setEditAmount(String(occurrence.amount / 100));
    setValidationError(null);
    setIsEditing(true);
  }, [occurrence]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditAmount('');
    setValidationError(null);
  }, []);

  // Save edited amount
  const handleSave = useCallback(async () => {
    if (!occurrence) return;

    // Validate the amount using validateParcelAmount
    const parsed = editAmount.replace(',', '.');
    const result = validateParcelAmount(parsed);

    if (!result.valid) {
      setValidationError(result.error);
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      // Call store's updateOccurrence which handles isValueEdited and refreshes monthly total
      // Convert from currency units to cents for storage
      await updateOccurrence(occurrence.id, { amount: Math.round(result.amount * 100) });

      // Reload occurrence to reflect changes
      const updated = await weeklyOccurrenceRepository.getById(occurrence.id);
      setOccurrence(updated);

      setIsEditing(false);
      setEditAmount('');

      useToastStore.getState().showSuccess(
        t('weeklyRecurring.amountUpdated', {
          defaultValue: 'Valor atualizado com sucesso.',
        })
      );
    } catch (error) {
      Alert.alert(
        t('common.error', { defaultValue: 'Erro' }),
        t('weeklyRecurring.errors.updateFailed', {
          defaultValue: 'Não foi possível atualizar o valor.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  }, [occurrence, editAmount, updateOccurrence, t]);

  // Dynamic styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.secondary,
        },
        scrollContent: {
          padding: spacing.base,
          paddingBottom: spacing['2xl'],
        },
        amountContainer: {
          alignItems: 'center',
          paddingVertical: spacing.xl,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surface.card,
          marginBottom: spacing.base,
          ...themeShadows.sm,
        },
        amountLabel: {
          fontSize: typography.caption.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        amountValue: {
          fontSize: 38,
          fontWeight: '700',
          color: colors.semantic.danger.dark,
        },
        editedBadge: {
          marginTop: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.semantic.warning.light,
        },
        editedBadgeText: {
          fontSize: typography.overline.fontSize,
          fontWeight: '600',
          color: colors.semantic.warning.dark,
        },
        detailsCard: {
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          marginBottom: spacing.base,
          backgroundColor: colors.surface.card,
          ...themeShadows.sm,
        },
        paymentRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        paymentLabel: {
          fontSize: typography.caption.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
        },
        paymentStatusContainer: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        paymentStatusText: {
          fontSize: typography.caption.fontSize,
          fontWeight: '500',
          marginRight: spacing.sm,
        },
        editSection: {
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          marginBottom: spacing.base,
          backgroundColor: colors.surface.card,
          ...themeShadows.sm,
        },
        editTitle: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.primary,
          marginBottom: spacing.md,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: validationError ? colors.semantic.danger.base : colors.border.default,
          borderRadius: borderRadius.md,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.background.primary,
        },
        currencyPrefix: {
          fontSize: typography.body.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
          marginRight: spacing.xs,
        },
        input: {
          flex: 1,
          fontSize: typography.body.fontSize + 2,
          fontWeight: '600',
          color: colors.text.primary,
          paddingVertical: spacing.md,
        },
        errorText: {
          fontSize: typography.overline.fontSize,
          color: colors.semantic.danger.base,
          marginTop: spacing.sm,
        },
        editActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginTop: spacing.base,
          gap: spacing.md,
        },
        cancelButton: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
          backgroundColor: colors.background.tertiary,
        },
        cancelButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
        },
        saveButton: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
          backgroundColor: colors.interactive.primary,
        },
        saveButtonDisabled: {
          opacity: 0.5,
        },
        saveButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.inverse,
        },
        actions: {
          gap: spacing.md,
        },
        editAmountButton: {
          paddingVertical: 14,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          backgroundColor: colors.interactive.primary,
        },
        editAmountButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.inverse,
        },
      }),
    [colors, themeShadows, validationError]
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: t('weeklyRecurring.parcelDetail', { defaultValue: 'Detalhe da Parcela' }),
          }}
        />
        <LoadingIndicator size="large" testID="parcel-detail-loading" />
      </SafeAreaView>
    );
  }

  // Not found
  if (!occurrence) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: t('weeklyRecurring.parcelDetail', { defaultValue: 'Detalhe da Parcela' }),
          }}
        />
        <EmptyState
          icon="🔍"
          title={t('common.notFound', { defaultValue: 'Não encontrado' })}
          description={t('weeklyRecurring.occurrenceNotFound', {
            defaultValue: 'Parcela não encontrada.',
          })}
          testID="parcel-not-found"
        />
      </SafeAreaView>
    );
  }

  const isPaid = occurrence.isPaid ?? false;
  const formattedAmount = formatCurrencyLocale(occurrence.amount / 100, locale);
  const formattedDate = formatOccurrenceDate(occurrence.date, locale as 'pt-BR' | 'en');
  const paymentStatusLabel = isPaid
    ? t('paymentStatus.paid', { defaultValue: 'Pago' })
    : t('paymentStatus.pending', { defaultValue: 'Pendente' });
  const paymentStatusColor = isPaid ? colors.semantic.success.dark : colors.semantic.warning.dark;

  return (
    <SafeAreaView style={styles.container} testID="parcel-detail-screen">
      <Stack.Screen
        options={{
          title:
            group?.title ??
            t('weeklyRecurring.parcelDetail', { defaultValue: 'Detalhe da Parcela' }),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount Display */}
          <View style={styles.amountContainer} testID="parcel-amount-display">
            <Text style={styles.amountLabel}>
              {t('weeklyRecurring.parcelAmount', { defaultValue: 'Valor da Parcela' })}
            </Text>
            <Text style={styles.amountValue} testID="parcel-amount-value">
              {formattedAmount}
            </Text>
            {occurrence.isValueEdited && (
              <View style={styles.editedBadge} testID="parcel-edited-badge">
                <Text style={styles.editedBadgeText}>
                  {t('weeklyRecurring.valueEdited', { defaultValue: 'Valor editado' })}
                </Text>
              </View>
            )}
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard} testID="parcel-details-card">
            <DetailRow
              label={t('transactions.date', { defaultValue: 'Data' })}
              value={formattedDate}
              testID="parcel-detail-date"
            />
            <DetailRow
              label={t('weeklyRecurring.group', { defaultValue: 'Grupo' })}
              value={group?.title ?? '--'}
              testID="parcel-detail-group"
            />
            <DetailRow
              label={t('weeklyRecurring.referenceMonth', { defaultValue: 'Mês de referência' })}
              value={occurrence.referenceMonth}
              testID="parcel-detail-month"
            />

            {/* Payment Status Row with Toggle */}
            <View style={styles.paymentRow} testID="parcel-payment-row">
              <Text style={styles.paymentLabel}>
                {t('paymentStatus.status', { defaultValue: 'Status' })}
              </Text>
              <View style={styles.paymentStatusContainer}>
                <Text style={[styles.paymentStatusText, { color: paymentStatusColor }]}>
                  {paymentStatusLabel}
                </Text>
                <PaymentStatusToggle
                  isPaid={isPaid}
                  onToggle={handleTogglePaymentStatus}
                  size="small"
                  testID="parcel-payment-toggle"
                />
              </View>
            </View>
          </View>

          {/* Edit Amount Section */}
          {isEditing ? (
            <View style={styles.editSection} testID="parcel-edit-section">
              <Text style={styles.editTitle}>
                {t('weeklyRecurring.editAmount', { defaultValue: 'Editar Valor' })}
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={styles.input}
                  value={editAmount}
                  onChangeText={(text) => {
                    setEditAmount(text);
                    setValidationError(null);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus
                  testID="parcel-amount-input"
                />
              </View>
              {validationError && (
                <Text style={styles.errorText} testID="parcel-validation-error">
                  {validationError}
                </Text>
              )}
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  testID="parcel-cancel-edit"
                >
                  <Text style={styles.cancelButtonText}>
                    {t('common.cancel', { defaultValue: 'Cancelar' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  testID="parcel-save-button"
                >
                  <Text style={styles.saveButtonText}>
                    {t('common.save', { defaultValue: 'Salvar' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editAmountButton}
                onPress={handleStartEdit}
                testID="parcel-edit-amount-button"
              >
                <Text style={styles.editAmountButtonText}>
                  {t('weeklyRecurring.editAmount', { defaultValue: 'Editar Valor' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
