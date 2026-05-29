/**
 * Toast Notification Component
 *
 * Displays toast notifications with:
 * - Different severity levels (error, warning, info, success)
 * - Auto-dismiss with configurable timeout
 * - Accessibility support (announcements, focus management)
 * - i18n support for messages
 * - Swipe to dismiss gesture
 *
 * **Validates: Requirements 35, 26, 29**
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../constants/theme';
import { useToasts, useToastStore, Toast as ToastType, ToastSeverity } from '../stores/toastStore';

/**
 * Severity icon mapping
 */
const SEVERITY_ICONS: Record<ToastSeverity, string> = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  success: '✓',
};

/**
 * Accessibility role mapping for toast severities
 */
const SEVERITY_ROLES: Record<ToastSeverity, 'alert' | 'none'> = {
  error: 'alert',
  warning: 'alert',
  info: 'none',
  success: 'none',
};

/**
 * Props for individual Toast component
 */
interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

/**
 * Individual Toast notification component
 */
function ToastItem({ toast, onDismiss }: ToastItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const themeColors = useThemeColors();

  // Derive severity colors from theme
  const severityColorMap: Record<ToastSeverity, { background: string; text: string }> = {
    error: { background: themeColors.semantic.danger.light, text: themeColors.semantic.danger.dark },
    warning: { background: themeColors.semantic.warning.light, text: themeColors.semantic.warning.dark },
    info: { background: themeColors.semantic.info.light, text: themeColors.semantic.info.dark },
    success: { background: themeColors.semantic.success.light, text: themeColors.semantic.success.dark },
  };
  const colors = severityColorMap[toast.severity];
  const icon = SEVERITY_ICONS[toast.severity];

  // Animate in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Announce to screen readers for error/warning
    if (toast.severity === 'error' || toast.severity === 'warning') {
      const message = toast.params
        ? t(toast.message, toast.params)
        : t(toast.message, { defaultValue: toast.message });
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [fadeAnim, t, toast.message, toast.params, toast.severity]);

  // Handle dismiss animation
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: Dimensions.get('window').width,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          handleDismiss();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Get translated message
  const message = toast.params
    ? t(toast.message, toast.params)
    : t(toast.message, { defaultValue: toast.message });

  const title = toast.title ? t(toast.title, { defaultValue: toast.title }) : undefined;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.background },
        {
          opacity: fadeAnim,
          transform: [{ translateX }],
        },
      ]}
      accessibilityRole={SEVERITY_ROLES[toast.severity]}
      accessibilityLabel={`${toast.severity}: ${message}`}
      accessibilityLiveRegion={toast.severity === 'error' ? 'assertive' : 'polite'}
      {...panResponder.panHandlers}
    >
      <View style={styles.toastContent}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {toast.action && (
          <TouchableOpacity
            onPress={() => {
              toast.action?.onPress();
              handleDismiss();
            }}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={t(toast.action.label, { defaultValue: toast.action.label })}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>
              {t(toast.action.label, { defaultValue: toast.action.label })}
            </Text>
          </TouchableOpacity>
        )}

        {toast.dismissible && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dismissText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Toast container component that renders all active toasts
 */
export function ToastContainer(): React.JSX.Element | null {
  const toasts = useToasts();
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </View>
  );
}

/**
 * Styles for Toast components
 */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 400,
    width: '90%',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: typography.caption.fontSize + 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  actionText: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: '600',
  },
  dismissButton: {
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

export default ToastContainer;
