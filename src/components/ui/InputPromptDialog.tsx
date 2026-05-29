/**
 * InputPromptDialog Component
 *
 * A cross-platform modal dialog with a text input field.
 * Used as a replacement for Alert.prompt (which is iOS-only).
 *
 * @module InputPromptDialog
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../constants/theme';

export interface InputPromptDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Default value for the input */
  defaultValue?: string;
  /** Keyboard type for the input */
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Called when the user confirms with the input value */
  onConfirm: (value: string) => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Cross-platform input prompt dialog using React Native Modal.
 */
export function InputPromptDialog({
  visible,
  title,
  message,
  placeholder,
  defaultValue = '',
  keyboardType = 'default',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  testID = 'input-prompt-dialog',
}: InputPromptDialogProps): React.ReactElement {
  const [inputValue, setInputValue] = useState(defaultValue);
  const colors = useThemeColors();

  // Reset input value when dialog becomes visible with a new default
  useEffect(() => {
    if (visible) {
      setInputValue(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleConfirm = useCallback(() => {
    onConfirm(inputValue);
  }, [inputValue, onConfirm]);

  const handleCancel = useCallback(() => {
    setInputValue(defaultValue);
    onCancel();
  }, [defaultValue, onCancel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.dialogContainer, { backgroundColor: colors.surface.card, shadowColor: '#000' }]} testID={`${testID}-container`}>
          <Text style={[styles.title, { color: colors.text.primary }]} testID={`${testID}-title`}>
            {title}
          </Text>
          {message && (
            <Text style={[styles.message, { color: colors.text.secondary }]} testID={`${testID}-message`}>
              {message}
            </Text>
          )}
          <TextInput
            style={[styles.input, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.background.secondary }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            keyboardType={keyboardType}
            autoFocus
            selectTextOnFocus
            testID={`${testID}-input`}
            accessibilityLabel={placeholder ?? title}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background.tertiary }]}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
              testID={`${testID}-cancel`}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.interactive.primary }]}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
              testID={`${testID}-confirm`}
            >
              <Text style={[styles.confirmButtonText, { color: colors.text.inverse }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  message: {
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
    marginBottom: spacing.base,
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
  },
  cancelButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});

export default InputPromptDialog;
