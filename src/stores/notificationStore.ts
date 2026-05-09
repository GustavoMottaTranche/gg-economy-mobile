/**
 * Zustand store for notification settings management
 *
 * Manages notification state including frequency, preferred time, and permission status.
 * Persists settings to AsyncStorage for persistence across app restarts.
 *
 * **Validates: Requirements 1.2, 2.2, 2.5, 8.1, 8.2**
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification frequency options
 */
export type NotificationFrequency = 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled';

/**
 * Notification settings state
 */
export interface NotificationSettings {
  /** Whether notifications are enabled */
  isEnabled: boolean;
  /** Notification frequency */
  frequency: NotificationFrequency;
  /** Preferred hour (0-23) */
  preferredHour: number;
  /** Preferred minute (0-59) */
  preferredMinute: number;
  /** Last scheduled notification identifier */
  scheduledNotificationId: string | null;
  /** Last notification delivery time (ISO string) */
  lastDeliveryTime: string | null;
}

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  isEnabled: false,
  frequency: 'disabled',
  preferredHour: 9,
  preferredMinute: 0,
  scheduledNotificationId: null,
  lastDeliveryTime: null,
};

/**
 * Notification store state
 */
interface NotificationStoreState {
  settings: NotificationSettings;
  permissionStatus: PermissionStatus;
  isHydrated: boolean;
}

/**
 * Notification store actions
 */
interface NotificationStoreActions {
  /** Update notification frequency */
  setFrequency: (frequency: NotificationFrequency) => void;

  /** Update preferred time */
  setPreferredTime: (hour: number, minute: number) => void;

  /** Enable/disable notifications */
  setEnabled: (enabled: boolean) => void;

  /** Update permission status */
  setPermissionStatus: (status: PermissionStatus) => void;

  /** Update scheduled notification ID */
  setScheduledNotificationId: (id: string | null) => void;

  /** Record notification delivery */
  recordDelivery: () => void;

  /** Initialize store (called on app start) */
  initialize: () => Promise<void>;

  /** Reset store to defaults */
  reset: () => void;
}

type NotificationStore = NotificationStoreState & NotificationStoreActions;

/**
 * Initial state
 */
const initialState: NotificationStoreState = {
  settings: DEFAULT_NOTIFICATION_SETTINGS,
  permissionStatus: 'undetermined',
  isHydrated: false,
};

/**
 * Zustand store for notification management with persistence
 */
export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setFrequency: (frequency: NotificationFrequency) => {
        set((state) => ({
          settings: {
            ...state.settings,
            frequency,
            // When frequency is disabled, also disable notifications
            isEnabled: frequency === 'disabled' ? false : state.settings.isEnabled,
          },
        }));
      },

      setPreferredTime: (hour: number, minute: number) => {
        // Validate hour and minute ranges
        const validHour = Math.max(0, Math.min(23, hour));
        const validMinute = Math.max(0, Math.min(59, minute));

        set((state) => ({
          settings: {
            ...state.settings,
            preferredHour: validHour,
            preferredMinute: validMinute,
          },
        }));
      },

      setEnabled: (enabled: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            isEnabled: enabled,
            // When enabling, set a default frequency if currently disabled
            frequency:
              enabled && state.settings.frequency === 'disabled'
                ? 'daily'
                : state.settings.frequency,
          },
        }));
      },

      setPermissionStatus: (status: PermissionStatus) => {
        set({ permissionStatus: status });
      },

      setScheduledNotificationId: (id: string | null) => {
        set((state) => ({
          settings: {
            ...state.settings,
            scheduledNotificationId: id,
          },
        }));
      },

      recordDelivery: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            lastDeliveryTime: new Date().toISOString(),
          },
        }));
      },

      initialize: async () => {
        // Mark as hydrated - the persist middleware handles the actual hydration
        set({ isHydrated: true });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'gg-economy-notification-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        settings: state.settings,
        permissionStatus: state.permissionStatus,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

/**
 * Selector hook for notification settings
 */
export function useNotificationSettings() {
  const settings = useNotificationStore((state) => state.settings);
  const setFrequency = useNotificationStore((state) => state.setFrequency);
  const setPreferredTime = useNotificationStore((state) => state.setPreferredTime);
  const setEnabled = useNotificationStore((state) => state.setEnabled);
  const setScheduledNotificationId = useNotificationStore(
    (state) => state.setScheduledNotificationId
  );
  const recordDelivery = useNotificationStore((state) => state.recordDelivery);

  return {
    ...settings,
    setFrequency,
    setPreferredTime,
    setEnabled,
    setScheduledNotificationId,
    recordDelivery,
  };
}

/**
 * Selector hook for notification permission status
 */
export function useNotificationPermission() {
  const permissionStatus = useNotificationStore((state) => state.permissionStatus);
  const setPermissionStatus = useNotificationStore((state) => state.setPermissionStatus);

  return {
    permissionStatus,
    setPermissionStatus,
  };
}
