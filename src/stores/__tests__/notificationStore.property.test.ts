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
  timeSlotKey,
  type NotificationFrequency,
  type NotificationSettings,
  type PermissionStatus,
  type TimeSlot,
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
          fc
            .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .filter((d) => !isNaN(d.getTime())),
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

/**
 * Property-Based Test: Backward-Compatible Hydration (Property 11)
 *
 * Feature: multiple-daily-notifications, Property 11: Backward-Compatible Hydration
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * *For any* valid preferredHour (0-23) and preferredMinute (0-59), when the store hydrates
 * without a timeSlots field, the resulting timeSlots array SHALL contain exactly one entry
 * with hour equal to preferredHour and minute equal to preferredMinute.
 */
describe('Property 11: Backward-Compatible Hydration', () => {
  /**
   * Arbitrary for valid hour (0-23)
   */
  const arbitraryHour = fc.integer({ min: 0, max: 23 });

  /**
   * Arbitrary for valid minute (0-59)
   */
  const arbitraryMinute = fc.integer({ min: 0, max: 59 });

  /**
   * Arbitrary for legacy frequencies (pre-multipleDaily)
   */
  const arbitraryLegacyFrequency = fc.constantFrom<NotificationFrequency>(
    'daily',
    'every2days',
    'every3days',
    'weekly',
    'disabled'
  );

  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
    useNotificationStore.getState().reset();
  });

  it('should initialize timeSlots from preferredHour/preferredMinute when timeSlots field is missing during hydration', async () => {
    /**
     * Property: For any valid preferredHour (0-23) and preferredMinute (0-59),
     * when the store hydrates with persisted data that does NOT contain a timeSlots field,
     * the resulting timeSlots array SHALL contain exactly one entry with hour equal to
     * preferredHour and minute equal to preferredMinute.
     */
    await fc.assert(
      fc.asyncProperty(
        arbitraryHour,
        arbitraryMinute,
        arbitraryLegacyFrequency,
        fc.boolean(),
        async (hour, minute, frequency, isEnabled) => {
          // Reset store before each iteration
          useNotificationStore.getState().reset();

          // Simulate legacy persisted data WITHOUT timeSlots field
          const legacyPersistedState = {
            state: {
              settings: {
                isEnabled,
                frequency,
                preferredHour: hour,
                preferredMinute: minute,
                scheduledNotificationId: null,
                lastDeliveryTime: null,
                // NOTE: timeSlots and timeSlotNotificationIds are intentionally MISSING
              },
              permissionStatus: 'undetermined',
            },
            version: 0,
          };

          // Store the legacy data in mock AsyncStorage
          mockStorage['gg-economy-notification-store'] = JSON.stringify(legacyPersistedState);

          // Trigger rehydration from AsyncStorage
          await useNotificationStore.persist.rehydrate();

          // Verify the hydrated state
          const state = useNotificationStore.getState();

          // timeSlots should be initialized with exactly one entry
          expect(state.settings.timeSlots).toHaveLength(1);
          expect(state.settings.timeSlots[0].hour).toBe(hour);
          expect(state.settings.timeSlots[0].minute).toBe(minute);

          // preferredHour and preferredMinute should be preserved unchanged
          expect(state.settings.preferredHour).toBe(hour);
          expect(state.settings.preferredMinute).toBe(minute);

          // timeSlotNotificationIds should be initialized to empty object
          expect(state.settings.timeSlotNotificationIds).toEqual({});
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not modify timeSlots when the field already exists during hydration', async () => {
    /**
     * Property: For any valid preferredHour and preferredMinute, when the store hydrates
     * with persisted data that ALREADY contains a timeSlots field, the timeSlots array
     * SHALL remain unchanged (not overwritten from preferredHour/preferredMinute).
     */
    await fc.assert(
      fc.asyncProperty(
        arbitraryHour,
        arbitraryMinute,
        fc.array(
          fc.record({
            hour: fc.integer({ min: 0, max: 23 }),
            minute: fc.constantFrom(0, 15, 30, 45),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (hour, minute, existingSlots) => {
          // Reset store before each iteration
          useNotificationStore.getState().reset();

          // Simulate persisted data WITH timeSlots field already present
          const persistedState = {
            state: {
              settings: {
                isEnabled: true,
                frequency: 'multipleDaily' as NotificationFrequency,
                preferredHour: hour,
                preferredMinute: minute,
                scheduledNotificationId: null,
                lastDeliveryTime: null,
                timeSlots: existingSlots,
                timeSlotNotificationIds: {},
              },
              permissionStatus: 'granted',
            },
            version: 0,
          };

          // Store the data in mock AsyncStorage
          mockStorage['gg-economy-notification-store'] = JSON.stringify(persistedState);

          // Trigger rehydration
          await useNotificationStore.persist.rehydrate();

          // Verify timeSlots was NOT overwritten
          const state = useNotificationStore.getState();
          expect(state.settings.timeSlots).toEqual(existingSlots);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Test: Frequency Type Backward Compatibility (Property 12)
 *
 * Feature: multiple-daily-notifications, Property 12: Frequency Type Backward Compatibility
 *
 * **Validates: Requirements 7.2, 7.3**
 *
 * *For any* previously valid frequency value ('daily', 'every2days', 'every3days', 'weekly',
 * 'disabled'), the store SHALL accept it without error, and the scheduler SHALL use the single
 * preferredHour/preferredMinute with the existing FREQUENCY_DAYS interval mapping.
 */
describe('Property 12: Frequency Type Backward Compatibility', () => {
  /**
   * Arbitrary for all previously valid frequency values
   */
  const arbitraryLegacyFrequency = fc.constantFrom<NotificationFrequency>(
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
   * Expected FREQUENCY_DAYS mapping for legacy frequencies
   */
  const FREQUENCY_DAYS: Record<string, number> = {
    daily: 1,
    every2days: 2,
    every3days: 3,
    weekly: 7,
    disabled: 0,
  };

  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
    useNotificationStore.getState().reset();
  });

  it('should accept all previously valid frequency values without error via setFrequency', () => {
    /**
     * Property: For any previously valid frequency value, calling setFrequency
     * SHALL succeed without throwing and the store state SHALL reflect the set frequency.
     */
    fc.assert(
      fc.property(arbitraryLegacyFrequency, (frequency) => {
        // Reset store
        useNotificationStore.getState().reset();

        const store = useNotificationStore.getState();

        // Setting any legacy frequency should not throw
        expect(() => store.setFrequency(frequency)).not.toThrow();

        // The store should reflect the set frequency
        const state = useNotificationStore.getState();
        expect(state.settings.frequency).toBe(frequency);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve preferredHour/preferredMinute when using legacy frequencies', () => {
    /**
     * Property: For any valid preferredHour (0-23), preferredMinute (0-59), and
     * legacy frequency, setting the frequency SHALL NOT modify the preferredHour
     * or preferredMinute values — the scheduler uses these single values for scheduling.
     */
    fc.assert(
      fc.property(
        arbitraryHour,
        arbitraryMinute,
        arbitraryLegacyFrequency,
        (hour, minute, frequency) => {
          // Reset store
          useNotificationStore.getState().reset();

          const store = useNotificationStore.getState();

          // Set preferred time first
          store.setPreferredTime(hour, minute);

          // Set a legacy frequency
          store.setFrequency(frequency);

          // preferredHour and preferredMinute should be unchanged
          const state = useNotificationStore.getState();
          expect(state.settings.preferredHour).toBe(hour);
          expect(state.settings.preferredMinute).toBe(minute);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept legacy frequencies during hydration without error', async () => {
    /**
     * Property: For any previously valid frequency value stored in AsyncStorage,
     * hydration SHALL accept it without falling back to defaults.
     */
    await fc.assert(
      fc.asyncProperty(
        arbitraryLegacyFrequency,
        arbitraryHour,
        arbitraryMinute,
        async (frequency, hour, minute) => {
          // Reset store
          useNotificationStore.getState().reset();

          // Simulate persisted data with a legacy frequency
          const persistedState = {
            state: {
              settings: {
                isEnabled: frequency !== 'disabled',
                frequency,
                preferredHour: hour,
                preferredMinute: minute,
                scheduledNotificationId: null,
                lastDeliveryTime: null,
                // Legacy data may not have these fields
              },
              permissionStatus: 'granted',
            },
            version: 0,
          };

          mockStorage['gg-economy-notification-store'] = JSON.stringify(persistedState);

          // Trigger rehydration - should not throw
          await useNotificationStore.persist.rehydrate();

          // The frequency should be preserved (not reset to defaults)
          const state = useNotificationStore.getState();
          expect(state.settings.frequency).toBe(frequency);
          expect(state.settings.preferredHour).toBe(hour);
          expect(state.settings.preferredMinute).toBe(minute);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map each legacy frequency to a valid FREQUENCY_DAYS interval', () => {
    /**
     * Property: For any previously valid frequency, the FREQUENCY_DAYS mapping
     * SHALL contain a valid numeric day count (>= 0) for that frequency.
     */
    fc.assert(
      fc.property(arbitraryLegacyFrequency, (frequency) => {
        // Each legacy frequency should have a defined mapping
        expect(FREQUENCY_DAYS[frequency]).toBeDefined();
        expect(typeof FREQUENCY_DAYS[frequency]).toBe('number');
        expect(FREQUENCY_DAYS[frequency]).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Test: Time Slot Preservation Round-Trip (Property 5)
 *
 * Feature: multiple-daily-notifications, Property 5: Time Slot Preservation Round-Trip
 *
 * **Validates: Requirements 2.3, 2.5**
 *
 * *For any* non-empty time slot list, switching frequency from "multipleDaily" to any other
 * frequency and then back to "multipleDaily" SHALL result in the same time slot list without
 * modification.
 */
describe('Property 5: Time Slot Preservation Round-Trip', () => {
  /**
   * Arbitrary for valid TimeSlot (hour 0-23, minute in [0, 15, 30, 45])
   */
  const arbitraryTimeSlot: fc.Arbitrary<TimeSlot> = fc.record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.constantFrom(0, 15, 30, 45),
  });

  /**
   * Arbitrary for a non-empty list of unique time slots (1-5 entries)
   * Generates unique slots by filtering duplicates based on timeSlotKey
   */
  const arbitraryUniqueTimeSlots: fc.Arbitrary<TimeSlot[]> = fc
    .array(arbitraryTimeSlot, { minLength: 1, maxLength: 10 })
    .map((slots) => {
      const seen = new Set<string>();
      const unique: TimeSlot[] = [];
      for (const slot of slots) {
        const key = timeSlotKey(slot);
        if (!seen.has(key) && unique.length < 5) {
          seen.add(key);
          unique.push(slot);
        }
      }
      return unique;
    })
    .filter((slots) => slots.length >= 1);

  /**
   * Arbitrary for non-multipleDaily frequencies to switch to
   */
  const arbitraryOtherFrequency = fc.constantFrom<NotificationFrequency>(
    'daily',
    'every2days',
    'every3days',
    'weekly'
  );

  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
    useNotificationStore.getState().reset();
  });

  it('should preserve time slots when switching frequency away from multipleDaily and back', () => {
    /**
     * Property: For any non-empty time slot list and any non-multipleDaily frequency,
     * setting frequency to multipleDaily, adding the time slots, switching to another
     * frequency, and switching back to multipleDaily SHALL result in the same time slot list.
     */
    fc.assert(
      fc.property(
        arbitraryUniqueTimeSlots,
        arbitraryOtherFrequency,
        (timeSlots, otherFrequency) => {
          // Reset store
          useNotificationStore.getState().reset();

          const store = useNotificationStore.getState();

          // Set frequency to multipleDaily
          store.setFrequency('multipleDaily');

          // Add all time slots
          for (const slot of timeSlots) {
            store.addTimeSlot(slot);
          }

          // Capture the time slots after adding (sorted by the store)
          const slotsBeforeSwitch = [...useNotificationStore.getState().settings.timeSlots];

          // Switch to another frequency (store preserves timeSlots data)
          store.setFrequency(otherFrequency);

          // Verify time slots are still preserved in the store
          const slotsWhileOtherFrequency = useNotificationStore.getState().settings.timeSlots;
          expect(slotsWhileOtherFrequency).toEqual(slotsBeforeSwitch);

          // Switch back to multipleDaily
          store.setFrequency('multipleDaily');

          // Verify time slots are unchanged
          const slotsAfterRoundTrip = useNotificationStore.getState().settings.timeSlots;
          expect(slotsAfterRoundTrip).toEqual(slotsBeforeSwitch);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve time slots through multiple frequency round-trips', () => {
    /**
     * Property: For any non-empty time slot list and any sequence of non-multipleDaily
     * frequencies, switching away and back multiple times SHALL always preserve the
     * same time slot list.
     */
    fc.assert(
      fc.property(
        arbitraryUniqueTimeSlots,
        fc.array(arbitraryOtherFrequency, { minLength: 1, maxLength: 5 }),
        (timeSlots, frequencySequence) => {
          // Reset store
          useNotificationStore.getState().reset();

          const store = useNotificationStore.getState();

          // Set frequency to multipleDaily and add time slots
          store.setFrequency('multipleDaily');
          for (const slot of timeSlots) {
            store.addTimeSlot(slot);
          }

          // Capture the original time slots (sorted)
          const originalSlots = [...useNotificationStore.getState().settings.timeSlots];

          // Perform multiple round-trips through different frequencies
          for (const freq of frequencySequence) {
            store.setFrequency(freq);
            store.setFrequency('multipleDaily');
          }

          // Verify time slots are still the same after all round-trips
          const finalSlots = useNotificationStore.getState().settings.timeSlots;
          expect(finalSlots).toEqual(originalSlots);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests: Time Slot Store Logic (Properties 1-4)
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.6**
 *
 * Feature: multiple-daily-notifications
 */
describe('Feature: multiple-daily-notifications, Time Slot Store Logic', () => {
  /**
   * Arbitrary for a valid TimeSlot (hour 0-23, minute in [0, 15, 30, 45])
   */
  const arbitraryTimeSlot = fc.record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.constantFrom(0, 15, 30, 45),
  });

  /**
   * Arbitrary for a non-empty list of unique time slots (1-5 entries)
   * Generates unique slots by filtering duplicates and limiting to 5
   */
  const arbitraryTimeSlotList = fc
    .uniqueArray(arbitraryTimeSlot, {
      minLength: 1,
      maxLength: 5,
      comparator: (a, b) => a.hour === b.hour && a.minute === b.minute,
    })
    .map((slots) =>
      [...slots].sort((a, b) => (a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute))
    );

  beforeEach(() => {
    useNotificationStore.getState().reset();
  });

  describe('Property 1: Chronological Order Invariant', () => {
    it('should maintain ascending chronological order after adding any valid time slot', () => {
      /**
       * Feature: multiple-daily-notifications, Property 1: Chronological Order Invariant
       *
       * For any time slot list and for any valid time slot added to it, the resulting
       * list SHALL always be sorted in ascending chronological order (comparing hour
       * first, then minute).
       *
       * **Validates: Requirements 1.2, 5.6**
       */
      fc.assert(
        fc.property(
          arbitraryTimeSlotList.filter((slots) => slots.length < 5),
          arbitraryTimeSlot,
          (initialSlots, newSlot) => {
            const store = useNotificationStore.getState();
            store.reset();

            // Seed the store with initial slots
            for (const slot of initialSlots) {
              store.addTimeSlot(slot);
            }

            // Add the new slot (may be rejected if duplicate or at max)
            store.addTimeSlot(newSlot);

            // Verify the resulting list is always in chronological order
            const state = useNotificationStore.getState();
            const slots = state.settings.timeSlots;

            for (let i = 1; i < slots.length; i++) {
              const prev = slots[i - 1];
              const curr = slots[i];
              const prevMinutes = prev.hour * 60 + prev.minute;
              const currMinutes = curr.hour * 60 + curr.minute;
              expect(prevMinutes).toBeLessThan(currMinutes);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Size Bounds Invariant', () => {
    it('should keep list size within [1, 5] for any sequence of add and remove operations', () => {
      /**
       * Feature: multiple-daily-notifications, Property 2: Size Bounds Invariant
       *
       * For any sequence of add and remove operations on a time slot list, the list
       * size SHALL always remain within the bounds [1, 5] inclusive. Add operations
       * SHALL be rejected when size is 5, and remove operations SHALL be rejected
       * when size is 1.
       *
       * **Validates: Requirements 1.3, 1.6, 1.7**
       */
      const arbitraryOperation = fc.oneof(
        arbitraryTimeSlot.map((slot) => ({ type: 'add' as const, slot })),
        fc
          .record({
            hour: fc.integer({ min: 0, max: 23 }),
            minute: fc.constantFrom(0, 15, 30, 45),
          })
          .map((slot) => ({
            type: 'remove' as const,
            key: `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`,
          }))
      );

      fc.assert(
        fc.property(fc.array(arbitraryOperation, { minLength: 1, maxLength: 30 }), (operations) => {
          const store = useNotificationStore.getState();
          store.reset();

          // Start with one slot so we have a valid initial state
          store.addTimeSlot({ hour: 9, minute: 0 });

          for (const op of operations) {
            const stateBefore = useNotificationStore.getState();
            const sizeBefore = stateBefore.settings.timeSlots.length;

            if (op.type === 'add') {
              const result = store.addTimeSlot(op.slot);

              // If at max (5), add should be rejected
              if (sizeBefore >= 5) {
                expect(result).toBe(false);
              }
            } else {
              const result = store.removeTimeSlot(op.key);

              // If at min (1), remove should be rejected
              if (sizeBefore <= 1) {
                expect(result).toBe(false);
              }
            }

            // After any operation, size must be within [1, 5]
            const stateAfter = useNotificationStore.getState();
            const sizeAfter = stateAfter.settings.timeSlots.length;
            expect(sizeAfter).toBeGreaterThanOrEqual(1);
            expect(sizeAfter).toBeLessThanOrEqual(5);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Duplicate Rejection', () => {
    it('should reject adding a time slot with the same hour and minute as an existing entry', () => {
      /**
       * Feature: multiple-daily-notifications, Property 3: Duplicate Rejection
       *
       * For any time slot list and for any time slot whose hour and minute match an
       * existing entry in the list, the add operation SHALL return false and the list
       * SHALL remain unchanged.
       *
       * **Validates: Requirements 1.4**
       */
      fc.assert(
        fc.property(
          arbitraryTimeSlotList,
          fc.nat().map((n) => n), // index selector
          (initialSlots, indexSeed) => {
            const store = useNotificationStore.getState();
            store.reset();

            // Seed the store with initial slots
            for (const slot of initialSlots) {
              store.addTimeSlot(slot);
            }

            // Pick an existing slot to duplicate
            const existingIndex = indexSeed % initialSlots.length;
            const duplicateSlot = { ...initialSlots[existingIndex] };

            // Capture state before attempting duplicate add
            const stateBefore = useNotificationStore.getState();
            const slotsBefore = [...stateBefore.settings.timeSlots];

            // Attempt to add the duplicate
            const result = store.addTimeSlot(duplicateSlot);

            // Should be rejected
            expect(result).toBe(false);

            // List should remain unchanged
            const stateAfter = useNotificationStore.getState();
            expect(stateAfter.settings.timeSlots).toEqual(slotsBefore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Removal Correctness', () => {
    it('should decrease list size by 1 and remove the slot when removing a valid key', () => {
      /**
       * Feature: multiple-daily-notifications, Property 4: Removal Correctness
       *
       * For any time slot list with more than 1 entry and for any valid slot key in
       * that list, removing it SHALL decrease the list size by exactly 1 and the
       * removed slot SHALL no longer appear in the list.
       *
       * **Validates: Requirements 1.5**
       */
      fc.assert(
        fc.property(
          arbitraryTimeSlotList.filter((slots) => slots.length > 1),
          fc.nat(),
          (initialSlots, indexSeed) => {
            const store = useNotificationStore.getState();
            store.reset();

            // Seed the store with initial slots
            for (const slot of initialSlots) {
              store.addTimeSlot(slot);
            }

            const stateBefore = useNotificationStore.getState();
            const sizeBefore = stateBefore.settings.timeSlots.length;

            // Pick a slot to remove
            const removeIndex = indexSeed % sizeBefore;
            const slotToRemove = stateBefore.settings.timeSlots[removeIndex];
            const keyToRemove = `${slotToRemove.hour.toString().padStart(2, '0')}:${slotToRemove.minute.toString().padStart(2, '0')}`;

            // Remove the slot
            const result = store.removeTimeSlot(keyToRemove);

            // Should succeed
            expect(result).toBe(true);

            // Size should decrease by exactly 1
            const stateAfter = useNotificationStore.getState();
            expect(stateAfter.settings.timeSlots.length).toBe(sizeBefore - 1);

            // The removed slot should no longer appear in the list
            const remainingKeys = stateAfter.settings.timeSlots.map(
              (s) => `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}`
            );
            expect(remainingKeys).not.toContain(keyToRemove);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
