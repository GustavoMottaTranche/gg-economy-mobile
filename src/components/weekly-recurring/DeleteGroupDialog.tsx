/**
 * DeleteGroupDialog Component
 *
 * Confirmation dialog for deleting a weekly recurring group.
 * Displays the group name prominently and warns the user that the action
 * is irreversible (future occurrences will be removed).
 *
 * **Validates: Requirements 5.1, 5.5**
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';
import type { WeeklyRecurringGroup } from '../../types/weeklyRecurring';

/**
 * Props for the DeleteGroupDialog component
 */
export interface DeleteGroupDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** The group to delete (null when dialog is hidden) */
  group: WeeklyRecurringGroup | null;
  /** Callback when the user confirms deletion, receives the group ID */
  onConfirm: (groupId: string) => void;
  /** Callback when the user cancels the deletion */
  onCancel: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * DeleteGroupDialog component
 *
 * Renders a centered modal dialog asking the user to confirm deletion
 * of a weekly recurring group. Shows the group name and an irreversibility warning.
 *
 * @example
 * ```tsx
 * <DeleteGroupDialog
 *   visible={showDeleteDialog}
 *   group={selectedGroup}
 *   onConfirm={(groupId) => handleDelete(groupId)}
 *   onCancel={() => setShowDeleteDialog(false)}
 *   testID="delete-group-dialog"
 * />
 * ```
 */
function DeleteGroupDialogComponent({
  visible,
  group,
  onConfirm,
  onCancel,
  testID = 'delete-group-dialog',
}: DeleteGroupDialogProps): React.ReactElement {
  const colors = useThemeColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        dialogContainer: {
          borderRadius: 14,
          padding: spacing.lg,
          width: '100%',
          maxWidth: 320,
          backgroundColor: colors.surface.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        title: {
          fontSize: 17,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: spacing.sm,
          color: colors.text.primary,
        },
        groupName: {
          fontSize: typography.body.fontSize,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: spacing.md,
          color: colors.text.primary,
        },
        warningText: {
          fontSize: typography.caption.fontSize,
          textAlign: 'center',
          marginBottom: spacing.lg,
          lineHeight: 18,
          color: colors.text.secondary,
        },
        buttonRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        cancelButton: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          backgroundColor: colors.background.tertiary,
        },
        cancelButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '500',
          color: colors.text.primary,
        },
        confirmButton: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          backgroundColor: colors.semantic.danger.base,
        },
        confirmButtonText: {
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: colors.text.inverse,
        },
      }),
    [colors]
  );

  const handleConfirm = useCallback(() => {
    if (group) {
      onConfirm(group.id);
    }
  }, [group, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContainer} testID={`${testID}-container`}>
          <Text style={styles.title} testID={`${testID}-title`}>
            Excluir grupo
          </Text>

          {group && (
            <Text style={styles.groupName} testID={`${testID}-group-name`}>
              {group.title}
            </Text>
          )}

          <Text style={styles.warningText} testID={`${testID}-warning`}>
            Esta ação é irreversível. Ocorrências futuras serão removidas.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              testID={`${testID}-cancel`}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Excluir"
              testID={`${testID}-confirm`}
            >
              <Text style={styles.confirmButtonText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Memoized DeleteGroupDialog for performance optimization
 */
export const DeleteGroupDialog = memo(DeleteGroupDialogComponent);

export default DeleteGroupDialog;
