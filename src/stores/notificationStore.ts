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
export type NotificationFrequency =
  | 'daily'
  | 'every2days'
  | 'every3days'
  | 'weekly'
  | 'disabled'
  | 'multipleDaily';

/**
 * A specific hour and minute combination representing a scheduled notification time within a day
 */
export interface TimeSlot {
  /** Hour of the day (0-23) */
  hour: number;
  /** Minute of the hour (0, 15, 30, 45) */
  minute: number;
}

/**
 * Returns a zero-padded "HH:MM" string key for a TimeSlot
 */
export function timeSlotKey(slot: TimeSlot): string {
  return `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
}

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
  /** Configured time slots for multipleDaily frequency */
  timeSlots: TimeSlot[];
  /** Mapping of time slot keys ("HH:MM") to scheduled notification IDs */
  timeSlotNotificationIds: Record<string, string>;
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
  timeSlots: [],
  timeSlotNotificationIds: {},
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

  /** Add a time slot (sorted insertion, validates uniqueness and max 5). Returns false if rejected. */
  addTimeSlot: (slot: TimeSlot) => boolean;

  /** Remove a time slot by key (validates min 1). Returns false if rejected. */
  removeTimeSlot: (key: string) => boolean;

  /** Update the notification ID mapping for a specific slot. If id is null, deletes the key. */
  setTimeSlotNotificationId: (key: string, id: string | null) => void;

  /** Bulk replace all time slot notification IDs */
  setTimeSlotNotificationIds: (ids: Record<string, string>) => void;
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
    (set, _get) => ({
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

      addTimeSlot: (slot: TimeSlot): boolean => {
        const state = _get();
        const currentSlots = state.settings.timeSlots;

        // Enforce max 5
        if (currentSlots.length >= 5) {
          return false;
        }

        // Check uniqueness via timeSlotKey
        const newKey = timeSlotKey(slot);
        const isDuplicate = currentSlots.some((s) => timeSlotKey(s) === newKey);
        if (isDuplicate) {
          return false;
        }

        // Insert in sorted chronological order (compare hour first, then minute)
        const newSlots = [...currentSlots, slot].sort((a, b) => {
          if (a.hour !== b.hour) return a.hour - b.hour;
          return a.minute - b.minute;
        });

        set((s) => ({
          settings: {
            ...s.settings,
            timeSlots: newSlots,
          },
        }));

        return true;
      },

      removeTimeSlot: (key: string): boolean => {
        const state = _get();
        const currentSlots = state.settings.timeSlots;

        // Enforce min 1
        if (currentSlots.length <= 1) {
          return false;
        }

        const newSlots = currentSlots.filter((s) => timeSlotKey(s) !== key);

        // If no slot was found matching the key, return false
        if (newSlots.length === currentSlots.length) {
          return false;
        }

        set((s) => ({
          settings: {
            ...s.settings,
            timeSlots: newSlots,
          },
        }));

        return true;
      },

      setTimeSlotNotificationId: (key: string, id: string | null): void => {
        set((state) => {
          const newMapping = { ...state.settings.timeSlotNotificationIds };
          if (id === null) {
            delete newMapping[key];
          } else {
            newMapping[key] = id;
          }
          return {
            settings: {
              ...state.settings,
              timeSlotNotificationIds: newMapping,
            },
          };
        });
      },

      setTimeSlotNotificationIds: (ids: Record<string, string>): void => {
        set((state) => ({
          settings: {
            ...state.settings,
            timeSlotNotificationIds: ids,
          },
        }));
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

          // Backward compatibility: initialize timeSlots if missing
          if (!state.settings.timeSlots) {
            state.settings.timeSlots = [
              {
                hour: state.settings.preferredHour,
                minute: state.settings.preferredMinute,
              },
            ];
          }

          // Initialize mapping if missing
          if (!state.settings.timeSlotNotificationIds) {
            state.settings.timeSlotNotificationIds = {};
          }

          // Validate frequency - fallback to defaults if invalid
          const validFrequencies: string[] = [
            'daily',
            'every2days',
            'every3days',
            'weekly',
            'disabled',
            'multipleDaily',
          ];
          if (!validFrequencies.includes(state.settings.frequency)) {
            state.settings = {
              ...DEFAULT_NOTIFICATION_SETTINGS,
              timeSlots: [],
              timeSlotNotificationIds: {},
            };
          }
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
  const addTimeSlot = useNotificationStore((state) => state.addTimeSlot);
  const removeTimeSlot = useNotificationStore((state) => state.removeTimeSlot);
  const setTimeSlotNotificationId = useNotificationStore(
    (state) => state.setTimeSlotNotificationId
  );
  const setTimeSlotNotificationIds = useNotificationStore(
    (state) => state.setTimeSlotNotificationIds
  );

  return {
    ...settings,
    setFrequency,
    setPreferredTime,
    setEnabled,
    setScheduledNotificationId,
    recordDelivery,
    addTimeSlot,
    removeTimeSlot,
    setTimeSlotNotificationId,
    setTimeSlotNotificationIds,
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
