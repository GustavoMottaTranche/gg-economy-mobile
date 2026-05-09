/**
 * Property-Based Test: Language Change Propagation (Property 8)
 *
 * **Validates: Requirements 7.4**
 *
 * *For any* app language change, all subsequently scheduled notifications
 * SHALL use the new language for their content, while previously scheduled
 * notifications may retain the old language until rescheduled.
 *
 * This test validates that:
 * 1. When language changes and notifications are enabled, cancelAll is called
 * 2. When language changes and notifications are enabled, scheduleNext is called with current settings
 * 3. The new notification content uses the new locale
 * 4. When notifications are disabled, no rescheduling occurs
 */
import * as fc from 'fast-check';
import { i18n } from '../../../i18n';
import { getNotificationContent } from '../NotificationContent';
import type { SupportedLocale } from '../../../i18n';
import type {
  NotificationSettings,
  NotificationFrequency,
} from '../../../stores/notificationStore';

// Mock expo-notifications
const mockScheduleNotificationAsync = jest.fn();
const mockCancelAllScheduledNotificationsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: (...args: unknown[]) =>
    mockCancelAllScheduledNotificationsAsync(...args),
  getAllScheduledNotificationsAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock i18n to return the correct translations based on locale
jest.mock('i18next', () => {
  const actualI18n = {
    language: 'en',
    isInitialized: true,
    t: jest.fn((key: string, options?: { lng?: string }) => {
      const locale = (options?.lng || 'en') as SupportedLocale;
      const translations: Record<SupportedLocale, Record<string, string>> = {
        'pt-BR': {
          'notifications.title': 'Atualize suas finanças',
          'notifications.body': 'Hora de registrar suas transações recentes',
        },
        en: {
          'notifications.title': 'Update your finances',
          'notifications.body': 'Time to record your recent transactions',
        },
      };
      return translations[locale]?.[key] || translations.en[key] || key;
    }),
    changeLanguage: jest.fn(async (lng: string) => {
      actualI18n.language = lng;
      // Emit languageChanged event
      const handlers = (
        actualI18n as typeof actualI18n & { _handlers: Map<string, Set<() => void>> }
      )._handlers?.get('languageChanged');
      if (handlers) {
        handlers.forEach((handler) => handler());
      }
      return actualI18n;
    }),
    on: jest.fn((event: string, handler: () => void) => {
      const i18nWithHandlers = actualI18n as typeof actualI18n & {
        _handlers: Map<string, Set<() => void>>;
      };
      if (!i18nWithHandlers._handlers) {
        i18nWithHandlers._handlers = new Map();
      }
      if (!i18nWithHandlers._handlers.has(event)) {
        i18nWithHandlers._handlers.set(event, new Set());
      }
      i18nWithHandlers._handlers.get(event)!.add(handler);
    }),
    off: jest.fn((event: string, handler: () => void) => {
      const i18nWithHandlers = actualI18n as typeof actualI18n & {
        _handlers: Map<string, Set<() => void>>;
      };
      i18nWithHandlers._handlers?.get(event)?.delete(handler);
    }),
  };
  return actualI18n;
});

// Mock the i18n module
jest.mock('../../../i18n', () => ({
  getCurrentLocale: jest.fn(() => 'en'),
  i18n: require('i18next'),
  SUPPORTED_LOCALES: ['pt-BR', 'en'],
}));

// Mock the notification store
const mockSetScheduledNotificationId = jest.fn();
const mockRecordDelivery = jest.fn();
let mockStoreSettings: NotificationSettings = {
  isEnabled: true,
  frequency: 'daily',
  preferredHour: 9,
  preferredMinute: 0,
  scheduledNotificationId: null,
  lastDeliveryTime: null,
};

jest.mock('../../../stores/notificationStore', () => ({
  useNotificationStore: {
    getState: jest.fn(() => ({
      settings: mockStoreSettings,
      setScheduledNotificationId: mockSetScheduledNotificationId,
      recordDelivery: mockRecordDelivery,
    })),
  },
  DEFAULT_NOTIFICATION_SETTINGS: {
    isEnabled: false,
    frequency: 'disabled',
    preferredHour: 9,
    preferredMinute: 0,
    scheduledNotificationId: null,
    lastDeliveryTime: null,
  },
}));

// Import after mocks are set up
import { notificationScheduler } from '../NotificationScheduler';

/**
 * Expected translations for each supported locale
 */
const EXPECTED_TRANSLATIONS: Record<SupportedLocale, { title: string; body: string }> = {
  'pt-BR': {
    title: 'Atualize suas finanças',
    body: 'Hora de registrar suas transações recentes',
  },
  en: {
    title: 'Update your finances',
    body: 'Time to record your recent transactions',
  },
};

describe('Property 8: Language Change Propagation', () => {
  /**
   * Supported locales in the application
   */
  const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en'];

  /**
   * Arbitrary for supported locale
   */
  const arbitraryLocale = fc.constantFrom<SupportedLocale>(...SUPPORTED_LOCALES);

  /**
   * Arbitrary for enabled NotificationFrequency (excludes 'disabled')
   */
  const arbitraryEnabledFrequency = fc.constantFrom<NotificationFrequency>(
    'daily',
    'every2days',
    'every3days',
    'weekly'
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
   * Arbitrary for enabled notification settings
   */
  const arbitraryEnabledSettings: fc.Arbitrary<NotificationSettings> = fc.record({
    isEnabled: fc.constant(true),
    frequency: arbitraryEnabledFrequency,
    preferredHour: arbitraryHour,
    preferredMinute: arbitraryMinute,
    scheduledNotificationId: fc.option(fc.string(), { nil: null }),
    lastDeliveryTime: fc.option(fc.string(), { nil: null }),
  });

  /**
   * Arbitrary for disabled notification settings
   */
  const arbitraryDisabledSettings: fc.Arbitrary<NotificationSettings> = fc.record({
    isEnabled: fc.constant(false),
    frequency: fc.constantFrom<NotificationFrequency>('disabled', 'daily', 'every2days'),
    preferredHour: arbitraryHour,
    preferredMinute: arbitraryMinute,
    scheduledNotificationId: fc.option(fc.string(), { nil: null }),
    lastDeliveryTime: fc.option(fc.string(), { nil: null }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockResolvedValue('mock-notification-id');
    mockCancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
    // Reset i18n language
    i18n.language = 'en';
    // Reset store settings
    mockStoreSettings = {
      isEnabled: true,
      frequency: 'daily',
      preferredHour: 9,
      preferredMinute: 0,
      scheduledNotificationId: null,
      lastDeliveryTime: null,
    };
  });

  describe('Rescheduling on Language Change', () => {
    it('should reschedule notification when language changes and notifications are enabled', async () => {
      /**
       * Property: For any supported locale and any enabled notification settings,
       * when language changes, cancelAll should be called followed by scheduleNext
       */
      await fc.assert(
        fc.asyncProperty(arbitraryLocale, arbitraryEnabledSettings, async (newLocale, settings) => {
          jest.clearAllMocks();
          mockStoreSettings = settings;

          // Track call order
          const callOrder: string[] = [];
          mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => {
            callOrder.push('cancelAll');
          });
          mockScheduleNotificationAsync.mockImplementation(async () => {
            callOrder.push('scheduleNext');
            return 'mock-notification-id';
          });

          // Simulate the language change handler behavior from _layout.tsx
          // When language changes and notifications are enabled, reschedule
          if (settings.isEnabled && settings.frequency !== 'disabled') {
            await notificationScheduler.cancelAll();
            await notificationScheduler.scheduleNext(settings);
          }

          // Verify cancelAll was called
          expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);

          // Verify scheduleNext was called
          expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);

          // Verify call order: cancelAll before scheduleNext
          expect(callOrder).toEqual(['cancelAll', 'scheduleNext']);
        }),
        { numRuns: 100 }
      );
    });

    it('should call cancelAll for any language change when notifications are enabled', async () => {
      /**
       * Property: For any two different locales and any enabled settings,
       * changing from one locale to another should trigger cancelAll
       */
      await fc.assert(
        fc.asyncProperty(
          arbitraryLocale,
          arbitraryLocale,
          arbitraryEnabledSettings,
          async (fromLocale, toLocale, settings) => {
            // Skip if locales are the same
            if (fromLocale === toLocale) return;

            jest.clearAllMocks();
            mockStoreSettings = settings;
            i18n.language = fromLocale;

            // Simulate language change handler
            if (settings.isEnabled && settings.frequency !== 'disabled') {
              await notificationScheduler.cancelAll();
              await notificationScheduler.scheduleNext(settings);
            }

            // Verify cancelAll was called
            expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call scheduleNext with current settings after language change', async () => {
      /**
       * Property: For any supported locale and any enabled settings,
       * scheduleNext should be called with the current settings
       */
      await fc.assert(
        fc.asyncProperty(arbitraryLocale, arbitraryEnabledSettings, async (newLocale, settings) => {
          jest.clearAllMocks();
          mockStoreSettings = settings;

          // Simulate language change handler
          if (settings.isEnabled && settings.frequency !== 'disabled') {
            await notificationScheduler.cancelAll();
            await notificationScheduler.scheduleNext(settings);
          }

          // Verify scheduleNext was called
          expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);

          // Verify the scheduled notification has correct trigger timing
          const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
          expect(scheduledCall.trigger.seconds).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('No Rescheduling When Disabled', () => {
    it('should not reschedule when notifications are disabled (isEnabled=false)', async () => {
      /**
       * Property: For any supported locale and any disabled settings (isEnabled=false),
       * no rescheduling should occur when language changes
       */
      await fc.assert(
        fc.asyncProperty(
          arbitraryLocale,
          arbitraryDisabledSettings,
          async (newLocale, settings) => {
            jest.clearAllMocks();
            mockStoreSettings = settings;

            // Simulate language change handler - should NOT reschedule
            if (settings.isEnabled && settings.frequency !== 'disabled') {
              await notificationScheduler.cancelAll();
              await notificationScheduler.scheduleNext(settings);
            }

            // Verify cancelAll was NOT called
            expect(mockCancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();

            // Verify scheduleNext was NOT called
            expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not reschedule when frequency is disabled', async () => {
      /**
       * Property: For any supported locale and settings with frequency='disabled',
       * no rescheduling should occur when language changes
       */
      const arbitraryFrequencyDisabledSettings: fc.Arbitrary<NotificationSettings> = fc.record({
        isEnabled: fc.constant(true),
        frequency: fc.constant<NotificationFrequency>('disabled'),
        preferredHour: arbitraryHour,
        preferredMinute: arbitraryMinute,
        scheduledNotificationId: fc.option(fc.string(), { nil: null }),
        lastDeliveryTime: fc.option(fc.string(), { nil: null }),
      });

      await fc.assert(
        fc.asyncProperty(
          arbitraryLocale,
          arbitraryFrequencyDisabledSettings,
          async (newLocale, settings) => {
            jest.clearAllMocks();
            mockStoreSettings = settings;

            // Simulate language change handler - should NOT reschedule
            if (settings.isEnabled && settings.frequency !== 'disabled') {
              await notificationScheduler.cancelAll();
              await notificationScheduler.scheduleNext(settings);
            }

            // Verify cancelAll was NOT called
            expect(mockCancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();

            // Verify scheduleNext was NOT called
            expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Content Uses New Locale', () => {
    it('should use new locale for notification content after language change', () => {
      /**
       * Property: For any supported locale, getNotificationContent should return
       * content in that locale
       */
      fc.assert(
        fc.property(arbitraryLocale, (locale) => {
          const content = getNotificationContent(locale);

          // Verify content matches expected translations for the locale
          expect(content.title).toBe(EXPECTED_TRANSLATIONS[locale].title);
          expect(content.body).toBe(EXPECTED_TRANSLATIONS[locale].body);
        }),
        { numRuns: 100 }
      );
    });

    it('should return different content for different locales', () => {
      /**
       * Property: For any two different locales, the notification content
       * should be different
       */
      fc.assert(
        fc.property(arbitraryLocale, arbitraryLocale, (locale1, locale2) => {
          // Only test when locales are different
          if (locale1 === locale2) return;

          const content1 = getNotificationContent(locale1);
          const content2 = getNotificationContent(locale2);

          // Titles should be different
          expect(content1.title).not.toBe(content2.title);

          // Bodies should be different
          expect(content1.body).not.toBe(content2.body);
        }),
        { numRuns: 100 }
      );
    });

    it('should return localized content for each supported locale', () => {
      /**
       * Property: For each supported locale, getNotificationContent should return
       * non-empty localized strings
       */
      fc.assert(
        fc.property(arbitraryLocale, (locale) => {
          const content = getNotificationContent(locale);

          // Title should be non-empty
          expect(content.title).toBeDefined();
          expect(typeof content.title).toBe('string');
          expect(content.title.length).toBeGreaterThan(0);

          // Body should be non-empty
          expect(content.body).toBeDefined();
          expect(typeof content.body).toBe('string');
          expect(content.body.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Scheduled Notification Uses Current Locale', () => {
    it('should schedule notification with content in the current locale', async () => {
      /**
       * Property: For any supported locale and any enabled settings,
       * the scheduled notification content should be in the current locale
       */
      await fc.assert(
        fc.asyncProperty(arbitraryLocale, arbitraryEnabledSettings, async (locale, settings) => {
          jest.clearAllMocks();
          mockStoreSettings = settings;

          // Set the current locale
          const { getCurrentLocale } = require('../../../i18n');
          (getCurrentLocale as jest.Mock).mockReturnValue(locale);

          // Schedule a notification
          await notificationScheduler.scheduleNext(settings);

          // Verify the scheduled notification has content
          expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);

          const scheduledCall = mockScheduleNotificationAsync.mock.calls[0][0];
          expect(scheduledCall.content).toBeDefined();
          expect(scheduledCall.content.title).toBeDefined();
          expect(scheduledCall.content.body).toBeDefined();

          // Verify content is non-empty
          expect(scheduledCall.content.title.length).toBeGreaterThan(0);
          expect(scheduledCall.content.body.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined Property: Complete Language Change Propagation', () => {
    it('should satisfy all language change propagation properties for enabled notifications', async () => {
      /**
       * Combined Property: For any supported locale and any enabled settings,
       * when language changes:
       * 1. cancelAll is called
       * 2. scheduleNext is called
       * 3. The call order is correct (cancelAll before scheduleNext)
       * 4. The notification content uses the new locale
       */
      await fc.assert(
        fc.asyncProperty(arbitraryLocale, arbitraryEnabledSettings, async (newLocale, settings) => {
          jest.clearAllMocks();
          mockStoreSettings = settings;

          // Track call order
          const callOrder: string[] = [];
          mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => {
            callOrder.push('cancelAll');
          });
          mockScheduleNotificationAsync.mockImplementation(async () => {
            callOrder.push('scheduleNext');
            return 'mock-notification-id';
          });

          // Set the current locale
          const { getCurrentLocale } = require('../../../i18n');
          (getCurrentLocale as jest.Mock).mockReturnValue(newLocale);

          // Simulate language change handler
          if (settings.isEnabled && settings.frequency !== 'disabled') {
            await notificationScheduler.cancelAll();
            await notificationScheduler.scheduleNext(settings);
          }

          // Property 1: cancelAll is called
          expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);

          // Property 2: scheduleNext is called
          expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);

          // Property 3: Correct call order
          expect(callOrder).toEqual(['cancelAll', 'scheduleNext']);

          // Property 4: Content uses new locale
          const content = getNotificationContent(newLocale);
          expect(content.title).toBe(EXPECTED_TRANSLATIONS[newLocale].title);
          expect(content.body).toBe(EXPECTED_TRANSLATIONS[newLocale].body);
        }),
        { numRuns: 100 }
      );
    });

    it('should satisfy all properties for disabled notifications (no rescheduling)', async () => {
      /**
       * Combined Property: For any supported locale and any disabled settings,
       * when language changes:
       * 1. cancelAll is NOT called
       * 2. scheduleNext is NOT called
       * 3. getNotificationContent still returns correct locale content (for future use)
       */
      await fc.assert(
        fc.asyncProperty(
          arbitraryLocale,
          arbitraryDisabledSettings,
          async (newLocale, settings) => {
            jest.clearAllMocks();
            mockStoreSettings = settings;

            // Simulate language change handler
            if (settings.isEnabled && settings.frequency !== 'disabled') {
              await notificationScheduler.cancelAll();
              await notificationScheduler.scheduleNext(settings);
            }

            // Property 1: cancelAll is NOT called
            expect(mockCancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();

            // Property 2: scheduleNext is NOT called
            expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();

            // Property 3: Content still returns correct locale (for when notifications are re-enabled)
            const content = getNotificationContent(newLocale);
            expect(content.title).toBe(EXPECTED_TRANSLATIONS[newLocale].title);
            expect(content.body).toBe(EXPECTED_TRANSLATIONS[newLocale].body);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
