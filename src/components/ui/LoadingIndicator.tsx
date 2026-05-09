/**
 * LoadingIndicator Component
 *
 * Displays a loading spinner with optional message.
 * Supports different sizes and accessibility.
 *
 * **Validates: Requirements 30**
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Size variants for the loading indicator
 */
export type LoadingSize = 'small' | 'medium' | 'large';

/**
 * Props for the LoadingIndicator component
 */
export interface LoadingIndicatorProps {
  /** Optional loading message */
  message?: string;
  /** Size of the spinner */
  size?: LoadingSize;
  /** Color of the spinner */
  color?: string;
  /** Whether to display as a full-screen overlay */
  fullScreen?: boolean;
  /** Whether to display inline (no container styling) */
  inline?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom message style */
  messageStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Size mappings for ActivityIndicator
 */
const SIZE_MAP: Record<LoadingSize, 'small' | 'large'> = {
  small: 'small',
  medium: 'large',
  large: 'large',
};

/**
 * Spinner dimensions for different sizes
 */
const SPINNER_DIMENSIONS: Record<LoadingSize, number> = {
  small: 20,
  medium: 36,
  large: 48,
};

/**
 * Default colors
 */
const DEFAULT_COLOR = '#3b82f6';

/**
 * LoadingIndicator component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingIndicator />
 *
 * // With message
 * <LoadingIndicator message="Loading transactions..." />
 *
 * // Large size with custom color
 * <LoadingIndicator size="large" color="#10b981" />
 *
 * // Full screen overlay
 * <LoadingIndicator fullScreen message="Please wait..." />
 *
 * // Inline (no container)
 * <LoadingIndicator inline size="small" />
 * ```
 */
function LoadingIndicatorComponent({
  message,
  size = 'medium',
  color = DEFAULT_COLOR,
  fullScreen = false,
  inline = false,
  style,
  messageStyle,
  testID,
}: LoadingIndicatorProps): JSX.Element {
  const { t } = useTranslation();

  const displayMessage = message ?? t('common.loading');
  const accessibilityLabel = displayMessage;

  const spinnerSize = SIZE_MAP[size];

  // Inline rendering (just the spinner)
  if (inline) {
    return (
      <ActivityIndicator
        size={spinnerSize}
        color={color}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
    );
  }

  // Full screen overlay
  if (fullScreen) {
    return (
      <View
        style={[styles.fullScreenContainer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
        testID={testID}
      >
        <View style={styles.fullScreenContent}>
          <ActivityIndicator
            size={spinnerSize}
            color={color}
            style={{ transform: [{ scale: size === 'large' ? 1.5 : 1 }] }}
          />
          {message !== undefined && (
            <Text style={[styles.fullScreenMessage, messageStyle]}>{displayMessage}</Text>
          )}
        </View>
      </View>
    );
  }

  // Default container rendering
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <ActivityIndicator
        size={spinnerSize}
        color={color}
        style={{ transform: [{ scale: size === 'large' ? 1.3 : 1 }] }}
      />
      {message !== undefined && (
        <Text style={[styles.message, messageStyle]}>{displayMessage}</Text>
      )}
    </View>
  );
}

/**
 * Styles for LoadingIndicator
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 9999,
  },
  fullScreenContent: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullScreenMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
});

/**
 * Memoized LoadingIndicator for performance optimization
 */
export const LoadingIndicator = memo(LoadingIndicatorComponent);

/**
 * Convenience component for inline loading
 */
export const InlineLoader = memo(function InlineLoader(
  props: Omit<LoadingIndicatorProps, 'inline' | 'fullScreen'>
): JSX.Element {
  return <LoadingIndicator {...props} inline />;
});

/**
 * Convenience component for full-screen loading overlay
 */
export const FullScreenLoader = memo(function FullScreenLoader(
  props: Omit<LoadingIndicatorProps, 'inline' | 'fullScreen'>
): JSX.Element {
  return <LoadingIndicator {...props} fullScreen />;
});

/**
 * Convenience component for button loading state
 */
export const ButtonLoader = memo(function ButtonLoader({
  color = '#ffffff',
  ...props
}: Omit<LoadingIndicatorProps, 'inline' | 'fullScreen' | 'message' | 'size'>): JSX.Element {
  return <LoadingIndicator {...props} inline size="small" color={color} />;
});

export default LoadingIndicator;
