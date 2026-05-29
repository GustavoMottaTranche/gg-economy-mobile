/**
 * OccurrenceEditModal Component
 *
 * Modal for editing individual weekly occurrence value and date.
 * Integrates field-level validation using validateOccurrenceValue and validateOccurrenceDate.
 * On successful save, calls onSave callback and closes the modal.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../constants/theme';
import {
  validateOccurrenceValue,
  validateOccurrenceDate,
} from '../../validation/weeklyRecurringValidation';
import type { WeeklyOccurrence, UpdateOccurrenceDTO } from '../../types/weeklyRecurring';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OccurrenceEditModalProps {
  /** The occurrence to edit (null = modal hidden) */
  occurrence: WeeklyOccurrence | null;
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when save is successful */
  onSave: (id: string, dto: UpdateOccurrenceDTO) => void;
  /** Test ID for testing */
  testID?: string;
}

// ─── Field Error Map ─────────────────────────────────────────────────────────

interface FieldErrors {
  amount?: string;
  date?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * OccurrenceEditModal component
 *
 * Renders a modal with fields for editing an occurrence's amount and date.
 * Validates input using the validation module and shows field-level errors.
 * On successful validation, calls onSave with the occurrence id and updated DTO.
 *
 * @example
 * ```tsx
 * <OccurrenceEditModal
 *   occurrence={selectedOccurrence}
 *   visible={isModalVisible}
 *   onClose={() => setModalVisible(false)}
 *   onSave={(id, dto) => store.updateOccurrence(id, dto)}
 *   testID="occurrence-edit-modal"
 * />
 * ```
 */
export function OccurrenceEditModal({
  occurrence,
  visible,
  onClose,
  onSave,
  testID,
}: OccurrenceEditModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // ─── Form State ──────────────────────────────────────────────────────────

  const [amountText, setAmountText] = useState('');
  const [dateText, setDateText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // ─── Reset form when occurrence changes ──────────────────────────────────

  useEffect(() => {
    if (occurrence) {
      setAmountText(String(occurrence.amount));
      setDateText(occurrence.date);
      setFieldErrors({});
      setShowSuccess(false);
    }
  }, [occurrence]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAmountChange = useCallback((text: string) => {
    // Allow numeric input with optional negative sign and up to 2 decimal places
    const cleaned = text.replace(/[^0-9.\-]/g, '');
    // Allow only one negative sign at the start
    const hasNegative = cleaned.startsWith('-');
    const withoutNegative = cleaned.replace(/-/g, '');
    // Prevent multiple dots
    const parts = withoutNegative.split('.');
    if (parts.length > 2) return;
    // Limit decimal places to 2
    if (parts.length === 2 && (parts[1]?.length ?? 0) > 2) return;
    setAmountText(hasNegative ? `-${withoutNegative}` : withoutNegative);
    if (fieldErrors.amount) {
      setFieldErrors((prev) => ({ ...prev, amount: undefined }));
    }
  }, [fieldErrors.amount]);

  const handleDateChange = useCallback((text: string) => {
    setDateText(text);
    if (fieldErrors.date) {
      setFieldErrors((prev) => ({ ...prev, date: undefined }));
    }
  }, [fieldErrors.date]);

  const handleSave = useCallback(() => {
    if (!occurrence) return;

    const errors: FieldErrors = {};
    const dto: UpdateOccurrenceDTO = {};
    let hasChanges = false;

    // Validate amount if changed
    const parsedAmount = parseFloat(amountText);
    if (isNaN(parsedAmount)) {
      errors.amount = t('weeklyRecurring.validation.invalidAmount', {
        defaultValue: 'Valor deve ser um número válido',
      });
    } else if (parsedAmount !== occurrence.amount) {
      const amountResult = validateOccurrenceValue({ amount: parsedAmount });
      if (!amountResult.valid) {
        errors.amount = amountResult.errors?.[0] ?? t('weeklyRecurring.validation.invalidAmount', {
          defaultValue: 'Valor inválido',
        });
      } else {
        dto.amount = parsedAmount;
        hasChanges = true;
      }
    }

    // Validate date if changed
    const trimmedDate = dateText.trim();
    if (trimmedDate !== occurrence.date) {
      const dateResult = validateOccurrenceDate({ date: trimmedDate });
      if (!dateResult.valid) {
        errors.date = dateResult.errors?.[0] ?? t('weeklyRecurring.validation.invalidDate', {
          defaultValue: 'Data inválida',
        });
      } else {
        dto.date = trimmedDate;
        hasChanges = true;
      }
    }

    // If there are validation errors, show them
    if (errors.amount || errors.date) {
      setFieldErrors(errors);
      return;
    }

    // If no changes, just close
    if (!hasChanges) {
      onClose();
      return;
    }

    // Save and show confirmation
    onSave(occurrence.id, dto);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 800);
  }, [occurrence, amountText, dateText, onSave, onClose, t]);

  const handleClose = useCallback(() => {
    setFieldErrors({});
    setShowSuccess(false);
    onClose();
  }, [onClose]);

  // ─── Styles ──────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.surface.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.base,
        },
        container: {
          width: '100%',
          maxWidth: 400,
          backgroundColor: colors.surface.card,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
        },
        title: {
          fontSize: typography.title.fontSize,
          fontWeight: typography.title.fontWeight,
          color: colors.text.primary,
          marginBottom: spacing.lg,
        },
        fieldContainer: {
          marginBottom: spacing.base,
        },
        label: {
          fontSize: typography.caption.fontSize,
          fontWeight: '500',
          color: colors.text.secondary,
          marginBottom: spacing.xs,
        },
        input: {
          borderWidth: 1,
          borderRadius: borderRadius.sm,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          fontSize: typography.body.fontSize,
          backgroundColor: colors.background.secondary,
          color: colors.text.primary,
        },
        inputError: {
          borderColor: colors.semantic.danger.base,
        },
        inputDefault: {
          borderColor: colors.border.default,
        },
        errorText: {
          fontSize: typography.caption.fontSize,
          color: colors.semantic.danger.base,
          marginTop: spacing.xs,
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
        cancelButton: {
          backgroundColor: colors.background.tertiary,
        },
        saveButton: {
          backgroundColor: colors.interactive.primary,
        },
        buttonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
        },
        cancelButtonText: {
          color: colors.text.primary,
        },
        saveButtonText: {
          color: colors.text.inverse,
        },
        successContainer: {
          alignItems: 'center',
          paddingVertical: spacing.lg,
        },
        successText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.semantic.success.base,
        },
        hint: {
          fontSize: typography.caption.fontSize,
          color: colors.text.tertiary,
          marginTop: spacing.xs,
        },
      }),
    [colors]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('weeklyRecurring.closeModal', {
            defaultValue: 'Fechar modal',
          })}
        />
        <View style={styles.container} testID={testID ? `${testID}-content` : undefined}>
          {showSuccess ? (
            <View style={styles.successContainer} testID={testID ? `${testID}-success` : undefined}>
              <Text style={styles.successText}>
                {t('weeklyRecurring.occurrenceSaved', {
                  defaultValue: 'Ocorrência atualizada com sucesso!',
                })}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>
                {t('weeklyRecurring.editOccurrence', {
                  defaultValue: 'Editar Ocorrência',
                })}
              </Text>

              {/* Amount Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  {t('weeklyRecurring.amountLabel', { defaultValue: 'Valor' })}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.amount ? styles.inputError : styles.inputDefault,
                  ]}
                  value={amountText}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                  testID={testID ? `${testID}-amount` : undefined}
                  accessibilityLabel={t('weeklyRecurring.amountLabel', {
                    defaultValue: 'Valor da ocorrência',
                  })}
                />
                {fieldErrors.amount && (
                  <Text style={styles.errorText} testID={testID ? `${testID}-amount-error` : undefined}>
                    {fieldErrors.amount}
                  </Text>
                )}
              </View>

              {/* Date Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  {t('weeklyRecurring.dateLabel', { defaultValue: 'Data' })}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.date ? styles.inputError : styles.inputDefault,
                  ]}
                  value={dateText}
                  onChangeText={handleDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="default"
                  testID={testID ? `${testID}-date` : undefined}
                  accessibilityLabel={t('weeklyRecurring.dateLabel', {
                    defaultValue: 'Data da ocorrência',
                  })}
                />
                <Text style={styles.hint}>
                  {t('weeklyRecurring.dateHint', {
                    defaultValue: 'Formato: AAAA-MM-DD (ex: 2024-06-15)',
                  })}
                </Text>
                {fieldErrors.date && (
                  <Text style={styles.errorText} testID={testID ? `${testID}-date-error` : undefined}>
                    {fieldErrors.date}
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('weeklyRecurring.cancel', {
                    defaultValue: 'Cancelar',
                  })}
                  testID={testID ? `${testID}-cancel` : undefined}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    {t('weeklyRecurring.cancel', { defaultValue: 'Cancelar' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  accessibilityRole="button"
                  accessibilityLabel={t('weeklyRecurring.save', {
                    defaultValue: 'Salvar',
                  })}
                  testID={testID ? `${testID}-save` : undefined}
                >
                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                    {t('weeklyRecurring.save', { defaultValue: 'Salvar' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default OccurrenceEditModal;
