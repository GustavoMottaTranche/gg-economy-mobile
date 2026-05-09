/**
 * Zustand store for toast notification management
 *
 * Manages toast state including:
 * - Multiple toast support with queue
 * - Different severity levels (error, warning, info, success)
 * - Auto-dismiss with configurable timeout
 * - Accessibility support
 *
 * **Validates: Requirements 35, 26, 29**
 */

import { create } from 'zustand';

/**
 * Toast severity levels
 */
export type ToastSeverity = 'error' | 'warning' | 'info' | 'success';

/**
 * Toast notification data
 */
export interface Toast {
  /** Unique identifier for the toast */
  id: string;
  /** Toast message (can be i18n key or plain text) */
  message: string;
  /** Severity level */
  severity: ToastSeverity;
  /** Optional title */
  title?: string;
  /** Duration in milliseconds (0 for no auto-dismiss) */
  duration: number;
  /** Whether the toast can be dismissed by user */
  dismissible: boolean;
  /** Optional action button */
  action?: {
    label: string;
    onPress: () => void;
  };
  /** Timestamp when toast was created */
  createdAt: number;
  /** i18n interpolation params */
  params?: Record<string, string | number>;
}

/**
 * Options for showing a toast
 */
export interface ShowToastOptions {
  /** Toast message (can be i18n key or plain text) */
  message: string;
  /** Severity level (default: 'info') */
  severity?: ToastSeverity;
  /** Optional title */
  title?: string;
  /** Duration in milliseconds (default: 4000, 0 for no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be dismissed by user (default: true) */
  dismissible?: boolean;
  /** Optional action button */
  action?: {
    label: string;
    onPress: () => void;
  };
  /** i18n interpolation params */
  params?: Record<string, string | number>;
}

/**
 * Toast store state
 */
interface ToastStoreState {
  /** Array of active toasts */
  toasts: Toast[];
  /** Maximum number of toasts to show at once */
  maxToasts: number;
}

/**
 * Toast store actions
 */
interface ToastStoreActions {
  /**
   * Shows a new toast notification
   */
  showToast: (options: ShowToastOptions) => string;

  /**
   * Shows an error toast
   */
  showError: (message: string, options?: Partial<ShowToastOptions>) => string;

  /**
   * Shows a warning toast
   */
  showWarning: (message: string, options?: Partial<ShowToastOptions>) => string;

  /**
   * Shows an info toast
   */
  showInfo: (message: string, options?: Partial<ShowToastOptions>) => string;

  /**
   * Shows a success toast
   */
  showSuccess: (message: string, options?: Partial<ShowToastOptions>) => string;

  /**
   * Dismisses a specific toast by ID
   */
  dismissToast: (id: string) => void;

  /**
   * Dismisses all toasts
   */
  dismissAllToasts: () => void;

  /**
   * Updates the maximum number of toasts
   */
  setMaxToasts: (max: number) => void;

  /**
   * Resets the store (useful for testing)
   */
  reset: () => void;
}

type ToastStore = ToastStoreState & ToastStoreActions;

/**
 * Default toast durations by severity
 */
const DEFAULT_DURATIONS: Record<ToastSeverity, number> = {
  error: 6000, // Errors stay longer
  warning: 5000,
  info: 4000,
  success: 3000, // Success messages can be shorter
};

/**
 * Generates a unique ID for a toast
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initial state
 */
const initialState: ToastStoreState = {
  toasts: [],
  maxToasts: 3,
};

/**
 * Zustand store for toast notifications
 */
export const useToastStore = create<ToastStore>()((set, get) => ({
  ...initialState,

  showToast: (options: ShowToastOptions): string => {
    const id = generateToastId();
    const severity = options.severity ?? 'info';

    const toast: Toast = {
      id,
      message: options.message,
      severity,
      title: options.title,
      duration: options.duration ?? DEFAULT_DURATIONS[severity],
      dismissible: options.dismissible ?? true,
      action: options.action,
      createdAt: Date.now(),
      params: options.params,
    };

    set((state) => {
      // Remove oldest toasts if we exceed maxToasts
      let newToasts = [...state.toasts, toast];
      if (newToasts.length > state.maxToasts) {
        newToasts = newToasts.slice(-state.maxToasts);
      }
      return { toasts: newToasts };
    });

    // Auto-dismiss after duration (if duration > 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, toast.duration);
    }

    return id;
  },

  showError: (message: string, options?: Partial<ShowToastOptions>): string => {
    return get().showToast({
      ...options,
      message,
      severity: 'error',
    });
  },

  showWarning: (message: string, options?: Partial<ShowToastOptions>): string => {
    return get().showToast({
      ...options,
      message,
      severity: 'warning',
    });
  },

  showInfo: (message: string, options?: Partial<ShowToastOptions>): string => {
    return get().showToast({
      ...options,
      message,
      severity: 'info',
    });
  },

  showSuccess: (message: string, options?: Partial<ShowToastOptions>): string => {
    return get().showToast({
      ...options,
      message,
      severity: 'success',
    });
  },

  dismissToast: (id: string): void => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  dismissAllToasts: (): void => {
    set({ toasts: [] });
  },

  setMaxToasts: (max: number): void => {
    set((state) => {
      const newToasts = state.toasts.slice(-max);
      return { maxToasts: max, toasts: newToasts };
    });
  },

  reset: (): void => {
    set(initialState);
  },
}));

/**
 * Hook to get toast actions only (for components that don't need to render toasts)
 */
export function useToastActions() {
  const showToast = useToastStore((state) => state.showToast);
  const showError = useToastStore((state) => state.showError);
  const showWarning = useToastStore((state) => state.showWarning);
  const showInfo = useToastStore((state) => state.showInfo);
  const showSuccess = useToastStore((state) => state.showSuccess);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const dismissAllToasts = useToastStore((state) => state.dismissAllToasts);

  return {
    showToast,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    dismissToast,
    dismissAllToasts,
  };
}

/**
 * Hook to get current toasts for rendering
 */
export function useToasts() {
  return useToastStore((state) => state.toasts);
}
