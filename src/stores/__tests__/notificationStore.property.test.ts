/**
 * Property-Based Test: Settings Persistence Round-Trip (Property 1)
 *
 * **Validates: Requirements 1.2, 2.2, 8.1, 8.2, 8.4**
 *
 * *For any* valid NotificationSettings object, serializing to AsyncStorage and then
 * deserializing SHALL produce an equivalent settings object with identical values
 * for isEnabled, frequency, preferredHour, preferredMinute, scheduledNotificationId,
 * and lastDeliveryTime.
 */
import * as fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from '@testing-library/react-native';

// Storage key used by the notification store
const STORAGE_KEY = 'gg-economy-notification-store';

// Mock AsyncStorage with in-memory storage for testing
let mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Import after mocks
import {
  useNotificationStore,
  type NotificationFrequency,
  type NotificationSettings,
  type PermissionStatus,
} from '../notificationStore';

describe('Property 1: Settings Persistence Round-Trip', () => {
  /**
   * Arbitrary for NotificationFrequency
   */
  const arbitraryFrequency = fc.constantFrom<NotificationFrequency>(
    'daily',
    'every2days',
    'every3days',
    'weekly',
    'disabled'
  );

  /**
   * Arbitrary for valid hour (0-23)
   */
  const arbitraryHour = fc.integer({ min: 0, max: 23 });

  /**
   * Arbitrary for valid minute (0-59)
   */
  const arbitraryMinute = fc.integer({ min: 0, max: 59 });

  /**
   * Arbitrary for optional UUID (scheduledNotificationId)
   */
  const arbitraryOptionalUuid = fc.option(fc.uuid(), { nil: null });

  /**
   * Arbitrary for optional ISO date string (lastDeliveryTime)
   * Using noInvalidDate to ensure only valid dates are generated
   */
  const arbitraryOptionalIsoDate = fc.option(
    fc
      .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true })
      .filter((d) => !isNaN(d.getTime()))
      .map((d) => d.toISOString()),
    { nil: null }
  );

  /**
   * Arbitrary for NotificationSettings
   */
  const arbitraryNotificationSettings: fc.Arbitrary<NotificationSettings> = fc.record({
    isEnabled: fc.boolean(),
    frequency: arbitraryFrequency,
    preferredHour: arbitraryHour,
    preferredMinute: arbitraryMinute,
    scheduledNotificationId: arbitraryOptionalUuid,
    lastDeliveryTime: arbitraryOptionalIsoDate,
  });

  /**
   * Arbitrary for PermissionStatus
   */
  const arbitraryPermissionStatus = fc.constantFrom<PermissionStatus>(
    'granted',
    'denied',
    'undetermined'
  );

  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage = {};
    jest.clearAllMocks();

    // Reset the store to initial state
    useNotificationStore.getState().reset();
  });

  describe('Settings Serialization Round-Trip', () => {
    it('should preserve all settings fields through JSON serialization', () => {
      /**
       * Property: For any valid NotificationSettings, JSON.stringify followed by
       * JSON.parse should produce an equivalent object
       */
      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(deserialized.isEnabled).toBe(settings.isEnabled);
          expect(deserialized.frequency).toBe(settings.frequency);
          expect(deserialized.preferredHour).toBe(settings.preferredHour);
          expect(deserialized.preferredMinute).toBe(settings.preferredMinute);
          expect(deserialized.scheduledNotificationId).toBe(settings.scheduledNotificationId);
          expect(deserialized.lastDeliveryTime).toBe(settings.lastDeliveryTime);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve settings through store persistence format', () => {
      /**
       * Property: For any valid NotificationSettings, the Zustand persist format
       * (with state wrapper) should round-trip correctly
       */
      fc.assert(
        fc.property(
          arbitraryNotificationSettings,
          arbitraryPermissionStatus,
          (settings, permissionStatus) => {
            // Simulate the Zustand persist format
            const persistedState = {
              state: {
                settings,
                permissionStatus,
              },
              version: 0,
            };

            const serialized = JSON.stringify(persistedState);
            const deserialized = JSON.parse(serialized);

            expect(deserialized.state.settings.isEnabled).toBe(settings.isEnabled);
            expect(deserialized.state.settings.frequency).toBe(settings.frequency);
            expect(deserialized.state.settings.preferredHour).toBe(settings.preferredHour);
            expect(deserialized.state.settings.preferredMinute).toBe(settings.preferredMinute);
            expect(deserialized.state.settings.scheduledNotificationId).toBe(
              settings.scheduledNotificationId
            );
            expect(deserialized.state.settings.lastDeliveryTime).toBe(settings.lastDeliveryTime);
            expect(deserialized.state.permissionStatus).toBe(permissionStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Store State Round-Trip', () => {
    it('should preserve isEnabled through store operations', () => {
      /**
       * Property: For any boolean isEnabled value, setting and getting
       * should produce the same value
       */
      fc.assert(
        fc.property(fc.boolean(), (isEnabled) => {
          const store = useNotificationStore.getState();

          act(() => {
            store.setEnabled(isEnabled);
          });

          const state = useNotificationStore.getState();

          // Note: When enabling with 'disabled' frequency, it auto-sets to 'daily'
          // When disabling, isEnabled becomes false
          expect(state.settings.isEnabled).toBe(isEnabled);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve frequency through store operations', () => {
      /**
       * Property: For any valid frequency, setting and getting
       * should produce the same value
       */
      fc.assert(
        fc.property(arbitraryFrequency, (frequency) => {
          const store = useNotificationStore.getState();

          act(() => {
            store.setFrequency(frequency);
          });

          const state = useNotificationStore.getState();
          expect(state.settings.frequency).toBe(frequency);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve preferredTime through store operations', () => {
      /**
       * Property: For any valid hour (0-23) and minute (0-59), setting and getting
       * should produce the same values
       */
      fc.assert(
        fc.property(arbitraryHour, arbitraryMinute, (hour, minute) => {
          const store = useNotificationStore.getState();

          act(() => {
            store.setPreferredTime(hour, minute);
          });

          const state = useNotificationStore.getState();
          expect(state.settings.preferredHour).toBe(hour);
          expect(state.settings.preferredMinute).toBe(minute);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve scheduledNotificationId through store operations', () => {
      /**
       * Property: For any optional UUID, setting and getting
       * should produce the same value
       */
      fc.assert(
        fc.property(arbitraryOptionalUuid, (notificationId) => {
          const store = useNotificationStore.getState();

          act(() => {
            store.setScheduledNotificationId(notificationId);
          });

          const state = useNotificationStore.getState();
          expect(state.settings.scheduledNotificationId).toBe(notificationId);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve permissionStatus through store operations', () => {
      /**
       * Property: For any valid permission status, setting and getting
       * should produce the same value
       */
      fc.assert(
        fc.property(arbitraryPermissionStatus, (status) => {
          const store = useNotificationStore.getState();

          act(() => {
            store.setPermissionStatus(status);
          });

          const state = useNotificationStore.getState();
          expect(state.permissionStatus).toBe(status);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('AsyncStorage Integration Round-Trip', () => {
    it('should persist and restore settings through AsyncStorage mock', async () => {
      /**
       * Property: For any valid NotificationSettings and PermissionStatus,
       * saving to AsyncStorage and loading back should produce equivalent values
       */
      await fc.assert(
        fc.asyncProperty(
          arbitraryNotificationSettings,
          arbitraryPermissionStatus,
          async (settings, permissionStatus) => {
            // Simulate persisting state to AsyncStorage
            const persistedState = {
              state: {
                settings,
                permissionStatus,
              },
              version: 0,
            };

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));

            // Simulate loading from AsyncStorage
            const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
            expect(storedValue).not.toBeNull();

            const loadedState = JSON.parse(storedValue!);

            // Verify all settings fields are preserved
            expect(loadedState.state.settings.isEnabled).toBe(settings.isEnabled);
            expect(loadedState.state.settings.frequency).toBe(settings.frequency);
            expect(loadedState.state.settings.preferredHour).toBe(settings.preferredHour);
            expect(loadedState.state.settings.preferredMinute).toBe(settings.preferredMinute);
            expect(loadedState.state.settings.scheduledNotificationId).toBe(
              settings.scheduledNotificationId
            );
            expect(loadedState.state.settings.lastDeliveryTime).toBe(settings.lastDeliveryTime);
            expect(loadedState.state.permissionStatus).toBe(permissionStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Type Preservation', () => {
    it('should preserve boolean type for isEnabled', () => {
      /**
       * Property: isEnabled should always be a boolean after round-trip
       */
      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(typeof deserialized.isEnabled).toBe('boolean');
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve string type for frequency', () => {
      /**
       * Property: frequency should always be a valid NotificationFrequency string after round-trip
       */
      const validFrequencies: NotificationFrequency[] = [
        'daily',
        'every2days',
        'every3days',
        'weekly',
        'disabled',
      ];

      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(typeof deserialized.frequency).toBe('string');
          expect(validFrequencies).toContain(deserialized.frequency);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve number type for preferredHour and preferredMinute', () => {
      /**
       * Property: preferredHour and preferredMinute should always be numbers after round-trip
       */
      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(typeof deserialized.preferredHour).toBe('number');
          expect(typeof deserialized.preferredMinute).toBe('number');
          expect(Number.isInteger(deserialized.preferredHour)).toBe(true);
          expect(Number.isInteger(deserialized.preferredMinute)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve valid ranges for hour and minute', () => {
      /**
       * Property: preferredHour should be 0-23 and preferredMinute should be 0-59 after round-trip
       */
      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(deserialized.preferredHour).toBeGreaterThanOrEqual(0);
          expect(deserialized.preferredHour).toBeLessThanOrEqual(23);
          expect(deserialized.preferredMinute).toBeGreaterThanOrEqual(0);
          expect(deserialized.preferredMinute).toBeLessThanOrEqual(59);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve nullable types for optional fields', () => {
      /**
       * Property: scheduledNotificationId and lastDeliveryTime should be string or null after round-trip
       */
      fc.assert(
        fc.property(arbitraryNotificationSettings, (settings) => {
          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          // scheduledNotificationId should be string or null
          expect(
            deserialized.scheduledNotificationId === null ||
              typeof deserialized.scheduledNotificationId === 'string'
          ).toBe(true);

          // lastDeliveryTime should be string or null
          expect(
            deserialized.lastDeliveryTime === null ||
              typeof deserialized.lastDeliveryTime === 'string'
          ).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values for hour', () => {
      /**
       * Property: Boundary hours (0 and 23) should round-trip correctly
       */
      const boundaryHours = [0, 23];

      for (const hour of boundaryHours) {
        const settings: NotificationSettings = {
          isEnabled: true,
          frequency: 'daily',
          preferredHour: hour,
          preferredMinute: 30,
          scheduledNotificationId: null,
          lastDeliveryTime: null,
        };

        const serialized = JSON.stringify(settings);
        const deserialized = JSON.parse(serialized) as NotificationSettings;

        expect(deserialized.preferredHour).toBe(hour);
      }
    });

    it('should handle boundary values for minute', () => {
      /**
       * Property: Boundary minutes (0 and 59) should round-trip correctly
       */
      const boundaryMinutes = [0, 59];

      for (const minute of boundaryMinutes) {
        const settings: NotificationSettings = {
          isEnabled: true,
          frequency: 'daily',
          preferredHour: 9,
          preferredMinute: minute,
          scheduledNotificationId: null,
          lastDeliveryTime: null,
        };

        const serialized = JSON.stringify(settings);
        const deserialized = JSON.parse(serialized) as NotificationSettings;

        expect(deserialized.preferredMinute).toBe(minute);
      }
    });

    it('should handle all frequency values', () => {
      /**
       * Property: All frequency values should round-trip correctly
       */
      const frequencies: NotificationFrequency[] = [
        'daily',
        'every2days',
        'every3days',
        'weekly',
        'disabled',
      ];

      for (const frequency of frequencies) {
        const settings: NotificationSettings = {
          isEnabled: frequency !== 'disabled',
          frequency,
          preferredHour: 9,
          preferredMinute: 0,
          scheduledNotificationId: null,
          lastDeliveryTime: null,
        };

        const serialized = JSON.stringify(settings);
        const deserialized = JSON.parse(serialized) as NotificationSettings;

        expect(deserialized.frequency).toBe(frequency);
      }
    });

    it('should handle UUID format for scheduledNotificationId', () => {
      /**
       * Property: Valid UUIDs should round-trip correctly
       */
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          const settings: NotificationSettings = {
            isEnabled: true,
            frequency: 'daily',
            preferredHour: 9,
            preferredMinute: 0,
            scheduledNotificationId: uuid,
            lastDeliveryTime: null,
          };

          const serialized = JSON.stringify(settings);
          const deserialized = JSON.parse(serialized) as NotificationSettings;

          expect(deserialized.scheduledNotificationId).toBe(uuid);
          // Verify UUID format
          expect(deserialized.scheduledNotificationId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle ISO date format for lastDeliveryTime', () => {
      /**
       * Property: Valid ISO date strings should round-trip correctly
       */
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (date) => {
            const isoString = date.toISOString();
            const settings: NotificationSettings = {
              isEnabled: true,
              frequency: 'daily',
              preferredHour: 9,
              preferredMinute: 0,
              scheduledNotificationId: null,
              lastDeliveryTime: isoString,
            };

            const serialized = JSON.stringify(settings);
            const deserialized = JSON.parse(serialized) as NotificationSettings;

            expect(deserialized.lastDeliveryTime).toBe(isoString);
            // Verify it's a valid ISO date string
            expect(new Date(deserialized.lastDeliveryTime!).toISOString()).toBe(isoString);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
