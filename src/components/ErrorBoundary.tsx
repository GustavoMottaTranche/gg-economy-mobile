/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays a fallback UI with retry functionality.
 * Logs errors for debugging while preserving user data.
 *
 * **Validates: Requirements 35, 29**
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../constants/theme';
import { AppError, logError } from '../errors';

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details in development */
  showDetails?: boolean;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** Error info from React */
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary class component that catches React errors
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method to derive state from error
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    const appError = AppError.from(error, 'React component error');
    logError(appError);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  /**
   * Resets the error state to allow retry
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = __DEV__ } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleReset);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          onReset={this.handleReset}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

/**
 * Props for the ErrorFallback component
 */
interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Error info from React */
  errorInfo: ErrorInfo | null;
  /** Callback to reset the error state */
  onReset: () => void;
  /** Whether to show error details */
  showDetails?: boolean;
}

/**
 * Default fallback UI component
 */
function ErrorFallback({
  error,
  errorInfo,
  onReset,
  showDetails = false,
}: ErrorFallbackProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      accessibilityRole="alert"
      accessibilityLabel={t('errors.generic')}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>{t('common.error')}</Text>
        <Text style={[styles.message, { color: colors.text.secondary }]}>{t('errors.generic')}</Text>

        {showDetails && (
          <ScrollView style={[styles.detailsContainer, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Text style={[styles.detailsTitle, { color: colors.text.primary }]}>Error Details:</Text>
            <Text style={[styles.detailsText, { color: colors.text.secondary }]}>{error.message}</Text>
            {errorInfo?.componentStack && (
              <>
                <Text style={[styles.detailsTitle, { color: colors.text.primary }]}>Component Stack:</Text>
                <Text style={[styles.detailsText, { color: colors.text.secondary }]}>{errorInfo.componentStack}</Text>
              </>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.interactive.primary }]}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Styles for the ErrorBoundary components
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.title.fontSize + 2,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  detailsContainer: {
    maxHeight: 200,
    width: '100%',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: typography.overline.fontSize + 1,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  detailsText: {
    fontSize: typography.overline.fontSize,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 120,
  },
  buttonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/**
 * ErrorBoundary component export
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With error callback
 * <ErrorBoundary onError={(error) => reportError(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export const ErrorBoundary = ErrorBoundaryClass;

/**
 * Hook to create an error boundary reset function
 * Useful for programmatically resetting error boundaries
 */
export function useErrorBoundary(): {
  showBoundary: (error: Error) => void;
} {
  const [, setError] = React.useState<Error | null>(null);

  const showBoundary = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return { showBoundary };
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 *
 * @param WrappedComponent - Component to wrap
 * @param errorBoundaryProps - Props for the ErrorBoundary
 * @returns Wrapped component
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
