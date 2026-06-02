/**
 * Integration Tests: Full Multi-Slot Scheduling Flow
 *
 * Tests the complete flow from store actions through scheduler to mocked expo-notifications.
 * Exercises the real store (useNotificationStore) and real scheduler (NotificationScheduler)
 * with only expo-notifications mocked as the external dependency.
 *
 * **Validates: Requirements 3.1, 3.2, 4.3, 4.4**
 */

import { NotificationScheduler } from '../NotificationScheduler';
import { __setTestModule } from '../NotificationsModuleLoader';
import { useNotificationStore } from '../../../stores/notificationStore';
import type { TimeSlot } from '../../../stores/notificationStore';

// Mock the NotificationsModuleLoader module
jest.mock('../NotificationsModuleLoader', () => {
  let _testModule: unknown = null;
  return {
    __setTestModule: (mod: unknown) => {
      _testModule = mod;
    },
    getNotifications: jest.fn(async () => _testModule),
  };
});

// Mock i18n
jest.mock('../../../i18n', () => ({
  getCurrentLocale: jest.fn(() => 'en'),
}));

// Mock NotificationContent
jest.mock('../NotificationContent', () => ({
  getNotificationContent: jest.fn(() => ({
    title: 'Time to update your finances!',
    body: 'Take a moment to record your recent transactions.',
  })),
}));

// Mock the logging module
jest.mock('../../logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Create mock notifications module with auto-incrementing IDs
let mockIdCounter = 0;
const mockNotifications = {
  scheduleNotificationAsync: jest.fn(() => {
    mockIdCounter += 1;
    return Promise.resolve(`mock-id-${mockIdCounter}`);
  }),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
};

describe('Multi-Slot Scheduling Integration Tests', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();
    mockIdCounter = 0;

    // Reset mock implementations to defaults
    mockNotifications.scheduleNotificationAsync.mockImplementation(() => {
      mockIdCounter += 1;
      return Promise.resolve(`mock-id-${mockIdCounter}`);
    });
    mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);

    // Provide the mock notifications module via the test hook
    __setTestModule(mockNotifications as any);

    // Reset the notification store
    useNotificationStore.getState().reset();
  });

  afterAll(() => {
    __setTestModule(null);
  });

  describe('Test 1: Add slots → verify expo-notifications receives correct calls with slot data in payload', () => {
    it('should cancel all existing notifications before scheduling new ones', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 14, minute: 30 },
        { hour: 20, minute: 0 },
      ];

      // Add slots to the store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }

      // Call scheduleAllSlots
      const settings = useNotificationStore.getState().settings;
      await scheduler.scheduleAllSlots(timeSlots, settings);

      // Verify cancelAllScheduledNotificationsAsync was called
      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    it('should call scheduleNotificationAsync once per slot', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 14, minute: 30 },
        { hour: 20, minute: 0 },
      ];

      // Add slots to the store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }

      // Call scheduleAllSlots
      const settings = useNotificationStore.getState().settings;
      await scheduler.scheduleAllSlots(timeSlots, settings);

      // Verify scheduleNotificationAsync was called N times (once per slot)
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it('should include slotHour and slotMinute in the data payload for each call', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 14, minute: 30 },
        { hour: 20, minute: 0 },
      ];

      // Add slots to the store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }

      // Call scheduleAllSlots
      const settings = useNotificationStore.getState().settings;
      await scheduler.scheduleAllSlots(timeSlots, settings);

      // Verify each call includes slotHour and slotMinute in the data payload
      const calls = mockNotifications.scheduleNotificationAsync.mock.calls;
      for (let i = 0; i < timeSlots.length; i++) {
        const callArg = calls[i][0];
        expect(callArg.content.data.slotHour).toBe(timeSlots[i].hour);
        expect(callArg.content.data.slotMinute).toBe(timeSlots[i].minute);
      }
    });

    it('should return a mapping with N entries (one per slot)', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 14, minute: 30 },
        { hour: 20, minute: 0 },
      ];

      // Add slots to the store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }

      // Call scheduleAllSlots
      const settings = useNotificationStore.getState().settings;
      const result = await scheduler.scheduleAllSlots(timeSlots, settings);

      // Verify the returned mapping has N entries
      expect(Object.keys(result)).toHaveLength(3);

      // Verify each slot key is present with a valid notification ID
      expect(result['08:00']).toBe('mock-id-1');
      expect(result['14:30']).toBe('mock-id-2');
      expect(result['20:00']).toBe('mock-id-3');
    });

    it('should use TIME_INTERVAL trigger type for each scheduled notification', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 9, minute: 15 },
        { hour: 17, minute: 45 },
      ];

      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }

      const settings = useNotificationStore.getState().settings;
      await scheduler.scheduleAllSlots(timeSlots, settings);

      // Verify each call uses TIME_INTERVAL trigger
      const calls = mockNotifications.scheduleNotificationAsync.mock.calls;
      for (const call of calls) {
        expect(call[0].trigger.type).toBe('timeInterval');
        expect(call[0].trigger.seconds).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Test 2: Simulate app restart with stale IDs → verify rescheduling occurs', () => {
    it('should reschedule all slots when stored IDs are not found in scheduled list', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 12, minute: 30 },
        { hour: 18, minute: 0 },
      ];

      // Set up store with timeSlots and stale notification IDs
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }
      store.setTimeSlotNotificationIds({
        '08:00': 'stale-id-1',
        '12:30': 'stale-id-2',
        '18:00': 'stale-id-3',
      });

      // Mock getAllScheduledNotificationsAsync to return empty (simulating stale IDs)
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);

      // Call restoreMultipleSlots
      const settings = useNotificationStore.getState().settings;
      const newMapping = await scheduler.restoreMultipleSlots(
        timeSlots,
        settings.timeSlotNotificationIds,
        settings
      );

      // Verify scheduleNotificationAsync was called for each slot (rescheduling)
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);

      // Verify the new mapping has updated IDs (not the stale ones)
      expect(newMapping['08:00']).toBe('mock-id-1');
      expect(newMapping['12:30']).toBe('mock-id-2');
      expect(newMapping['18:00']).toBe('mock-id-3');
    });

    it('should update the store timeSlotNotificationIds with new IDs after restore', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 9, minute: 0 },
        { hour: 15, minute: 0 },
      ];

      // Set up store with stale IDs
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }
      store.setTimeSlotNotificationIds({
        '09:00': 'stale-id-a',
        '15:00': 'stale-id-b',
      });

      // Mock getAllScheduledNotificationsAsync to return empty
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);

      // Call restore (which internally calls restoreMultipleSlots for multipleDaily)
      const settings = useNotificationStore.getState().settings;
      await scheduler.restore(settings);

      // Verify the store's timeSlotNotificationIds is updated with new IDs
      const updatedSettings = useNotificationStore.getState().settings;
      expect(updatedSettings.timeSlotNotificationIds['09:00']).toBe('mock-id-1');
      expect(updatedSettings.timeSlotNotificationIds['15:00']).toBe('mock-id-2');
    });

    it('should not reschedule slots whose IDs still exist in the scheduled list', async () => {
      const timeSlots: TimeSlot[] = [
        { hour: 8, minute: 0 },
        { hour: 14, minute: 0 },
        { hour: 20, minute: 0 },
      ];

      // Set up store with mixed stale and valid IDs
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      for (const slot of timeSlots) {
        store.addTimeSlot(slot);
      }
      store.setTimeSlotNotificationIds({
        '08:00': 'valid-id-1',
        '14:00': 'stale-id-2',
        '20:00': 'valid-id-3',
      });

      // Mock getAllScheduledNotificationsAsync to return only some IDs (simulating partial staleness)
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        { identifier: 'valid-id-1' },
        { identifier: 'valid-id-3' },
      ]);

      // Call restoreMultipleSlots
      const settings = useNotificationStore.getState().settings;
      const newMapping = await scheduler.restoreMultipleSlots(
        timeSlots,
        settings.timeSlotNotificationIds,
        settings
      );

      // Only the stale slot should be rescheduled
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);

      // Valid IDs should be preserved, stale one should be replaced
      expect(newMapping['08:00']).toBe('valid-id-1');
      expect(newMapping['14:00']).toBe('mock-id-1');
      expect(newMapping['20:00']).toBe('valid-id-3');
    });
  });

  describe('Test 3: Simulate notification received → verify correct slot rescheduled for next day', () => {
    it('should call scheduleNotificationAsync once when a slot notification is received', async () => {
      // Set up store with multipleDaily frequency
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      store.addTimeSlot({ hour: 14, minute: 30 });
      store.setTimeSlotNotificationIds({ '14:30': 'old-id-1' });

      // Simulate notification received for 14:30 slot
      await scheduler.handleSlotNotificationReceived(14, 30);

      // Verify scheduleNotificationAsync was called once
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('should schedule the notification targeting the next day at the same time', async () => {
      // Set up store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      store.addTimeSlot({ hour: 14, minute: 30 });
      store.setTimeSlotNotificationIds({ '14:30': 'old-id-1' });

      // Capture the time before calling the handler
      const beforeCall = new Date();

      // Simulate notification received for 14:30 slot
      await scheduler.handleSlotNotificationReceived(14, 30);

      // Verify the scheduled notification targets the next day
      const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];

      // The trigger uses TIME_INTERVAL type
      expect(call.trigger.type).toBe('timeInterval');
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(1);

      // Calculate expected seconds: from now to tomorrow at 14:30
      // The implementation sets targetTime = tomorrow at slotHour:slotMinute
      const expectedTarget = new Date(beforeCall);
      expectedTarget.setDate(expectedTarget.getDate() + 1);
      expectedTarget.setHours(14, 30, 0, 0);
      const expectedSeconds = Math.floor((expectedTarget.getTime() - beforeCall.getTime()) / 1000);

      // Allow 5 seconds tolerance for test execution time
      expect(call.trigger.seconds).toBeGreaterThanOrEqual(expectedSeconds - 5);
      expect(call.trigger.seconds).toBeLessThanOrEqual(expectedSeconds + 5);
    });

    it('should include slotHour: 14 and slotMinute: 30 in the data payload', async () => {
      // Set up store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      store.addTimeSlot({ hour: 14, minute: 30 });
      store.setTimeSlotNotificationIds({ '14:30': 'old-id-1' });

      // Simulate notification received for 14:30 slot
      await scheduler.handleSlotNotificationReceived(14, 30);

      // Verify slotHour and slotMinute are in the data payload
      const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.content.data.slotHour).toBe(14);
      expect(call.content.data.slotMinute).toBe(30);
    });

    it('should update the store notification ID mapping for key "14:30"', async () => {
      // Set up store
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      store.addTimeSlot({ hour: 14, minute: 30 });
      store.setTimeSlotNotificationIds({ '14:30': 'old-id-1' });

      // Simulate notification received for 14:30 slot
      await scheduler.handleSlotNotificationReceived(14, 30);

      // Verify the store's notification ID mapping is updated for key "14:30"
      const updatedSettings = useNotificationStore.getState().settings;
      expect(updatedSettings.timeSlotNotificationIds['14:30']).toBe('mock-id-1');
    });

    it('should handle different slot times correctly', async () => {
      // Set up store with multiple slots
      const store = useNotificationStore.getState();
      store.setEnabled(true);
      store.setFrequency('multipleDaily');
      store.addTimeSlot({ hour: 7, minute: 0 });
      store.addTimeSlot({ hour: 12, minute: 15 });
      store.addTimeSlot({ hour: 21, minute: 45 });
      store.setTimeSlotNotificationIds({
        '07:00': 'id-1',
        '12:15': 'id-2',
        '21:45': 'id-3',
      });

      // Simulate notification received for 12:15 slot only
      await scheduler.handleSlotNotificationReceived(12, 15);

      // Verify only one notification was scheduled (for the received slot)
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);

      // Verify the payload has the correct slot data
      const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.content.data.slotHour).toBe(12);
      expect(call.content.data.slotMinute).toBe(15);

      // Verify only the 12:15 mapping was updated
      const updatedSettings = useNotificationStore.getState().settings;
      expect(updatedSettings.timeSlotNotificationIds['12:15']).toBe('mock-id-1');
      // Other mappings should remain unchanged
      expect(updatedSettings.timeSlotNotificationIds['07:00']).toBe('id-1');
      expect(updatedSettings.timeSlotNotificationIds['21:45']).toBe('id-3');
    });
  });
});
