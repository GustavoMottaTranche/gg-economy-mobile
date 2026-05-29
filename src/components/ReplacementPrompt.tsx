/**
 * ReplacementPrompt Component
 *
 * Bottom sheet modal displayed when a user attempts to delete a category
 * that has associated transactions. Offers two options:
 * 1. Choose a replacement category (transactions are reassigned)
 * 2. Proceed with soft delete (transactions keep original categoryId)
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 */

import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { CategorySelector } from './CategorySelector';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, typography } from '../constants/theme';
import type { Category } from '../types';

/**
 * Props for the ReplacementPrompt component
 */
export interface ReplacementPromptProps {
  /** Category being deleted */
  category: Category;
  /** Number of affected transactions */
  transactionCount: number;
  /** Callback when user chooses a replacement category */
  onReplace: (replacementCategoryId: string) => void;
  /** Callback when user chooses soft delete without replacement */
  onSoftDelete: () => void;
  /** Callback to cancel the operation */
  onCancel: () => void;
  /** Visibility of the prompt */
  visible: boolean;
}

/**
 * ReplacementPrompt — bottom sheet modal for safe category deletion
 *
 * @example
 * ```tsx
 * <ReplacementPrompt
 *   category={categoryToDelete}
 *   transactionCount={5}
 *   onReplace={(id) => handleReplace(id)}
 *   onSoftDelete={() => handleSoftDelete()}
 *   onCancel={() => setShowPrompt(false)}
 *   visible={showPrompt}
 * />
 * ```
 */
function ReplacementPromptComponent({
  category,
  transactionCount,
  onReplace,
  onSoftDelete,
  onCancel,
  visible,
}: ReplacementPromptProps): React.JSX.Element {
  const [selectedReplacementId, setSelectedReplacementId] = useState<string | null>(null);
  const colors = useThemeColors();

  const handleCategorySelect = useCallback(
    (selected: Category) => {
      // Prevent selecting the same category being deleted
      if (selected.id === category.id) {
        return;
      }
      setSelectedReplacementId(selected.id);
    },
    [category.id]
  );

  const handleReplace = useCallback(() => {
    if (selectedReplacementId) {
      onReplace(selectedReplacementId);
      setSelectedReplacementId(null);
    }
  }, [selectedReplacementId, onReplace]);

  const handleSoftDelete = useCallback(() => {
    setSelectedReplacementId(null);
    onSoftDelete();
  }, [onSoftDelete]);

  const handleCancel = useCallback(() => {
    setSelectedReplacementId(null);
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
      testID="replacement-prompt-modal"
    >
      <View style={styles.overlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.surface.card }]}>
          <SafeAreaView style={styles.safeArea}>
            {/* Handle indicator */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]} testID="replacement-prompt-title">
                Excluir categoria
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.primary }]} testID="replacement-prompt-subtitle">
                A categoria &quot;{category.name}&quot; possui{' '}
                <Text style={[styles.countHighlight, { color: colors.semantic.danger.base }]}>{transactionCount}</Text>{' '}
                {transactionCount === 1 ? 'transação associada' : 'transações associadas'}.
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                Escolha uma categoria substituta para reatribuir as transações, ou prossiga com a
                exclusão sem substituição.
              </Text>
            </View>

            {/* Category Selector */}
            <View style={styles.selectorContainer}>
              <Text style={[styles.selectorLabel, { color: colors.text.primary }]}>Categoria substituta:</Text>
              <CategorySelector
                selectedCategoryId={selectedReplacementId}
                onSelect={handleCategorySelect}
                includeIncome={category.type === 'income'}
                testID="replacement-category-selector"
              />
            </View>

            {/* Action Buttons */}
            <View style={[styles.actions, { borderTopColor: colors.border.default }]}>
              <TouchableOpacity
                style={[
                  styles.replaceButton,
                  { backgroundColor: colors.interactive.primary },
                  !selectedReplacementId && { backgroundColor: colors.interactive.disabled },
                ]}
                onPress={handleReplace}
                disabled={!selectedReplacementId}
                accessibilityRole="button"
                accessibilityLabel="Substituir e excluir"
                accessibilityState={{ disabled: !selectedReplacementId }}
                testID="replacement-prompt-replace-button"
              >
                <Text
                  style={[
                    styles.replaceButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  Substituir e excluir
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.softDeleteButton, { backgroundColor: colors.semantic.danger.light, borderColor: colors.semantic.danger.base }]}
                onPress={handleSoftDelete}
                accessibilityRole="button"
                accessibilityLabel="Excluir sem substituição"
                testID="replacement-prompt-soft-delete-button"
              >
                <Text style={[styles.softDeleteButtonText, { color: colors.semantic.danger.base }]}>Excluir sem substituição</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                testID="replacement-prompt-cancel-button"
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    maxHeight: '85%',
  },
  safeArea: {
    flex: 1,
  },
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  title: {
    fontSize: typography.title.fontSize - 2,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  countHighlight: {
    fontWeight: '700',
  },
  description: {
    fontSize: typography.caption.fontSize + 1,
    lineHeight: 20,
  },
  selectorContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    minHeight: 200,
  },
  selectorLabel: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    gap: 10,
  },
  replaceButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  replaceButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  softDeleteButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  softDeleteButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

/**
 * Memoized ReplacementPrompt for performance optimization
 */
export const ReplacementPrompt = memo(ReplacementPromptComponent);

export default ReplacementPrompt;
