/**
 * Notification Store Tests
 *
 * Tests for the notification settings Zustand store.
 * Validates:
 * - Default values
 * - Settings management (frequency, time, enabled)
 * - Permission status management
 * - Scheduled notification ID management
 * - Delivery recording
 * - Store reset
 *
 * **Validates: Requirements 1.2, 2.2, 2.5, 8.1, 8.2**
 */

import { act, renderHook } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Import after mocks
import {
  useNotificationStore,
  useNotificationSettings,
  useNotificationPermission,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationFrequency,
  type PermissionStatus,
} from '../notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().reset();
  });

  describe('Default Values', () => {
    it('initializes with correct default settings', () => {
      const state = useNotificationStore.getState();

      expect(state.settings.isEnabled).toBe(false);
      expect(state.settings.frequency).toBe('disabled');
      expect(state.settings.preferredHour).toBe(9);
      expect(state.settings.preferredMinute).toBe(0);
      expect(state.settings.scheduledNotificationId).toBeNull();
      expect(state.settings.lastDeliveryTime).toBeNull();
    });

    it('initializes with undetermined permission status', () => {
      const state = useNotificationStore.getState();

      expect(state.permissionStatus).toBe('undetermined');
    });

    it('exports DEFAULT_NOTIFICATION_SETTINGS constant', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({
        isEnabled: false,
        frequency: 'disabled',
        preferredHour: 9,
        preferredMinute: 0,
        scheduledNotificationId: null,
        lastDeliveryTime: null,
      });
    });
  });

  describe('Frequency Management', () => {
    it('sets frequency', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setFrequency('daily');
      });

      expect(result.current.frequency).toBe('daily');
    });

    it('sets all frequency options', () => {
      const frequencies: NotificationFrequency[] = [
        'daily',
        'every2days',
        'every3days',
        'weekly',
        'disabled',
      ];

      const { result } = renderHook(() => useNotificationSettings());

      frequencies.forEach((freq) => {
        act(() => {
          result.current.setFrequency(freq);
        });

        expect(result.current.frequency).toBe(freq);
      });
    });

    it('disables notifications when frequency is set to disabled', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // First enable notifications
      act(() => {
        result.current.setEnabled(true);
        result.current.setFrequency('daily');
      });

      expect(result.current.isEnabled).toBe(true);

      // Set frequency to disabled
      act(() => {
        result.current.setFrequency('disabled');
      });

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.frequency).toBe('disabled');
    });
  });

  describe('Preferred Time Management', () => {
    it('sets preferred time', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setPreferredTime(14, 30);
      });

      expect(result.current.preferredHour).toBe(14);
      expect(result.current.preferredMinute).toBe(30);
    });

    it('validates hour range (0-23)', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // Test lower bound
      act(() => {
        result.current.setPreferredTime(-5, 0);
      });
      expect(result.current.preferredHour).toBe(0);

      // Test upper bound
      act(() => {
        result.current.setPreferredTime(30, 0);
      });
      expect(result.current.preferredHour).toBe(23);
    });

    it('validates minute range (0-59)', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // Test lower bound
      act(() => {
        result.current.setPreferredTime(9, -10);
      });
      expect(result.current.preferredMinute).toBe(0);

      // Test upper bound
      act(() => {
        result.current.setPreferredTime(9, 100);
      });
      expect(result.current.preferredMinute).toBe(59);
    });
  });

  describe('Enable/Disable Management', () => {
    it('enables notifications', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.isEnabled).toBe(true);
    });

    it('disables notifications', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setEnabled(true);
      });

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.isEnabled).toBe(false);
    });

    it('sets default frequency to daily when enabling with disabled frequency', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // Ensure frequency is disabled
      expect(result.current.frequency).toBe('disabled');

      // Enable notifications
      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.frequency).toBe('daily');
    });

    it('preserves existing frequency when enabling', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // Set a frequency first
      act(() => {
        result.current.setFrequency('weekly');
      });

      // Disable then enable
      act(() => {
        result.current.setEnabled(false);
      });

      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.frequency).toBe('weekly');
    });
  });

  describe('Permission Status Management', () => {
    it('sets permission status', () => {
      const { result } = renderHook(() => useNotificationPermission());

      const statuses: PermissionStatus[] = ['granted', 'denied', 'undetermined'];

      statuses.forEach((status) => {
        act(() => {
          result.current.setPermissionStatus(status);
        });

        expect(result.current.permissionStatus).toBe(status);
      });
    });
  });

  describe('Scheduled Notification ID Management', () => {
    it('sets scheduled notification ID', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setScheduledNotificationId('notification-123');
      });

      expect(result.current.scheduledNotificationId).toBe('notification-123');
    });

    it('clears scheduled notification ID', () => {
      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.setScheduledNotificationId('notification-123');
      });

      act(() => {
        result.current.setScheduledNotificationId(null);
      });

      expect(result.current.scheduledNotificationId).toBeNull();
    });
  });

  describe('Delivery Recording', () => {
    it('records delivery time', () => {
      const beforeTime = new Date().toISOString();

      const { result } = renderHook(() => useNotificationSettings());

      act(() => {
        result.current.recordDelivery();
      });

      const afterTime = new Date().toISOString();

      expect(result.current.lastDeliveryTime).not.toBeNull();
      expect(result.current.lastDeliveryTime! >= beforeTime).toBe(true);
      expect(result.current.lastDeliveryTime! <= afterTime).toBe(true);
    });
  });

  describe('Store Reset', () => {
    it('resets all state to initial values', () => {
      // Set some values
      act(() => {
        useNotificationStore.getState().setEnabled(true);
        useNotificationStore.getState().setFrequency('weekly');
        useNotificationStore.getState().setPreferredTime(15, 45);
        useNotificationStore.getState().setPermissionStatus('granted');
        useNotificationStore.getState().setScheduledNotificationId('test-id');
        useNotificationStore.getState().recordDelivery();
      });

      // Reset
      act(() => {
        useNotificationStore.getState().reset();
      });

      const state = useNotificationStore.getState();

      expect(state.settings.isEnabled).toBe(false);
      expect(state.settings.frequency).toBe('disabled');
      expect(state.settings.preferredHour).toBe(9);
      expect(state.settings.preferredMinute).toBe(0);
      expect(state.settings.scheduledNotificationId).toBeNull();
      expect(state.settings.lastDeliveryTime).toBeNull();
      expect(state.permissionStatus).toBe('undetermined');
    });
  });

  describe('Initialize', () => {
    it('marks store as hydrated', async () => {
      const state = useNotificationStore.getState();

      await act(async () => {
        await state.initialize();
      });

      expect(useNotificationStore.getState().isHydrated).toBe(true);
    });
  });

  describe('Selector Hooks', () => {
    it('useNotificationSettings returns all settings and actions', () => {
      const { result } = renderHook(() => useNotificationSettings());

      // Check settings are present
      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('frequency');
      expect(result.current).toHaveProperty('preferredHour');
      expect(result.current).toHaveProperty('preferredMinute');
      expect(result.current).toHaveProperty('scheduledNotificationId');
      expect(result.current).toHaveProperty('lastDeliveryTime');

      // Check actions are present
      expect(result.current).toHaveProperty('setFrequency');
      expect(result.current).toHaveProperty('setPreferredTime');
      expect(result.current).toHaveProperty('setEnabled');
      expect(result.current).toHaveProperty('setScheduledNotificationId');
      expect(result.current).toHaveProperty('recordDelivery');
    });

    it('useNotificationPermission returns permission status and setter', () => {
      const { result } = renderHook(() => useNotificationPermission());

      expect(result.current).toHaveProperty('permissionStatus');
      expect(result.current).toHaveProperty('setPermissionStatus');
    });
  });
});
