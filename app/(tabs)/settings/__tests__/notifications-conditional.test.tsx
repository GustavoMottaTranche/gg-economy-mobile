/**
 * Notification Settings Screen - Conditional Rendering Tests
 *
 * Tests for conditional rendering behavior:
 * - TimeSlotSection is shown when frequency is 'multipleDaily'
 * - Single time picker is hidden when frequency is 'multipleDaily'
 * - Single time picker is shown when frequency is not 'multipleDaily'
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { render } from '@testing-library/react-native';

// Mock notification store
const mockUseNotificationSettings = jest.fn();
const mockUseNotificationPermission = jest.fn();

jest.mock('../../../../src/stores/notificationStore', () => ({
  useNotificationSettings: () => mockUseNotificationSettings(),
  useNotificationPermission: () => mockUseNotificationPermission(),
  timeSlotKey: (slot: { hour: number; minute: number }) =>
    `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`,
}));

// Mock useThemeColors
jest.mock('../../../../src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6' },
    surface: { card: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#007AFF' },
    semantic: {
      danger: { light: '#FEE2E2', base: '#DC2626' },
      warning: { light: '#FEF3C7', base: '#F59E0B', dark: '#92400E' },
      success: { base: '#34C759' },
    },
    background: { primary: '#FFFFFF', secondary: '#F9FAFB' },
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock PermissionHandler
jest.mock('../../../../src/services/notifications/PermissionHandler', () => ({
  permissionHandler: {
    checkPermission: jest.fn().mockResolvedValue('granted'),
    requestPermission: jest.fn().mockResolvedValue('granted'),
    openSettings: jest.fn(),
  },
}));

// Mock NotificationScheduler
jest.mock('../../../../src/services/notifications/NotificationScheduler', () => ({
  notificationScheduler: {
    calculateNextTime: jest.fn().mockReturnValue(new Date('2024-01-15T09:00:00')),
    calculateNextTimeMultiSlot: jest.fn().mockReturnValue(new Date('2024-01-15T09:00:00')),
    scheduleNext: jest.fn().mockResolvedValue('notif-id-1'),
    scheduleAllSlots: jest.fn().mockResolvedValue({}),
    cancelAll: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { createElement } = require('react');
  return {
    SafeAreaView: ({ children, ...props }: { children?: unknown; [key: string]: unknown }) =>
      createElement('View', props, children),
  };
});

// Mock theme constants
jest.mock('../../../../src/constants/theme', () => ({
  spacing: { sm: 4, md: 8, base: 16, lg: 20, xl: 24, '2xl': 32 },
  typography: { body: { fontSize: 16 }, caption: { fontSize: 12 } },
  borderRadius: { sm: 4, md: 8, lg: 16 },
}));

import NotificationSettingsScreen from '../notifications';

describe('Notification Settings Screen - Conditional Rendering', () => {
  const defaultSettings = {
    isEnabled: true,
    frequency: 'daily' as const,
    preferredHour: 9,
    preferredMinute: 0,
    scheduledNotificationId: 'notif-1',
    lastDeliveryTime: null,
    timeSlots: [{ hour: 9, minute: 0 }],
    timeSlotNotificationIds: {},
    setEnabled: jest.fn(),
    setFrequency: jest.fn(),
    setPreferredTime: jest.fn(),
    setScheduledNotificationId: jest.fn(),
    addTimeSlot: jest.fn().mockReturnValue(true),
    removeTimeSlot: jest.fn().mockReturnValue(true),
    setTimeSlotNotificationIds: jest.fn(),
  };

  const defaultPermission = {
    permissionStatus: 'granted' as const,
    setPermissionStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationSettings.mockReturnValue(defaultSettings);
    mockUseNotificationPermission.mockReturnValue(defaultPermission);
  });

  describe('TimeSlotSection visibility when frequency is multipleDaily', () => {
    it('shows TimeSlotSection when frequency is multipleDaily', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'multipleDaily',
        timeSlots: [
          { hour: 8, minute: 0 },
          { hour: 14, minute: 30 },
        ],
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-slot-section')).toBeTruthy();
    });

    it('does not show TimeSlotSection when frequency is daily', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'daily',
      });

      const { queryByTestId } = render(<NotificationSettingsScreen />);

      expect(queryByTestId('time-slot-section')).toBeNull();
    });

    it('does not show TimeSlotSection when frequency is weekly', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'weekly',
      });

      const { queryByTestId } = render(<NotificationSettingsScreen />);

      expect(queryByTestId('time-slot-section')).toBeNull();
    });
  });

  describe('Single time picker visibility', () => {
    it('hides single time picker when frequency is multipleDaily', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'multipleDaily',
        timeSlots: [{ hour: 9, minute: 0 }],
      });

      const { queryByTestId } = render(<NotificationSettingsScreen />);

      expect(queryByTestId('time-selector')).toBeNull();
    });

    it('shows single time picker when frequency is daily', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'daily',
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-selector')).toBeTruthy();
    });

    it('shows single time picker when frequency is every2days', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'every2days',
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-selector')).toBeTruthy();
    });

    it('shows single time picker when frequency is every3days', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'every3days',
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-selector')).toBeTruthy();
    });

    it('shows single time picker when frequency is weekly', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'weekly',
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-selector')).toBeTruthy();
    });

    it('shows single time picker when frequency is disabled', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...defaultSettings,
        frequency: 'disabled',
      });

      const { getByTestId } = render(<NotificationSettingsScreen />);

      expect(getByTestId('time-selector')).toBeTruthy();
    });
  });
});
