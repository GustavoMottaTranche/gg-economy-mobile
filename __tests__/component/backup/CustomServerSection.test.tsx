/**
 * Component tests for the Custom Server Section in BackupSettingsScreen.
 *
 * Tests the custom server configuration UI including:
 * - Collapsible header rendering
 * - URL and API key inputs with validation
 * - Connection test button states (loading, success, error)
 * - Backup list rendering with mock data
 * - Empty state when no backups exist
 * - Error message display on operation failure
 *
 * Validates: Requirements 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9, 10.10, 10.11
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// --- Mocks ---

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const RNReact = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      RNReact.createElement(RN.View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock useThemeColors
jest.mock('../../../src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      primary: { light: '#EFF6FF', base: '#3B82F6', dark: '#1D4ED8' },
      secondary: { light: '#F5F3FF', base: '#8B5CF6', dark: '#6D28D9' },
      success: { light: '#F0FDF4', base: '#22C55E', dark: '#15803D' },
      danger: { light: '#FEF2F2', base: '#EF4444', dark: '#B91C1C' },
      warning: { light: '#FFFBEB', base: '#F59E0B', dark: '#B45309' },
      info: { light: '#EFF6FF', base: '#3B82F6', dark: '#1D4ED8' },
      neutral: {},
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#9CA3AF' },
  }),
}));

// Mock useBackup hook
const mockUseBackup = {
  lastBackupTime: null,
  lastBackupStatus: 'never' as const,
  lastBackupError: null,
  isBackingUp: false,
  isRestoring: false,
  backupProgress: null,
  restoreProgress: null,
  isConnected: false,
  connectedEmail: null,
  backupFrequency: 'disabled' as const,
  preferredHour: 3,
  isScheduledBackupDue: false,
  backups: [],
  isLoadingBackups: false,
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(undefined),
  backupNow: jest.fn().mockResolvedValue({ success: true }),
  listBackups: jest.fn().mockResolvedValue([]),
  restore: jest.fn().mockResolvedValue({ success: true }),
  setBackupFrequency: jest.fn(),
  setPreferredHour: jest.fn(),
  runScheduledBackupIfDue: jest.fn().mockResolvedValue(null),
  refreshBackups: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/hooks/useBackup', () => ({
  useBackup: () => mockUseBackup,
}));

// Mock backupStore
jest.mock('../../../src/stores/backupStore', () => ({
  useBackupConnection: () => ({
    setConnectionStatus: jest.fn(),
  }),
}));

// Mock OAuthService
jest.mock('../../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    isSignedIn: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockResolvedValue(null),
    getAccessToken: jest.fn().mockResolvedValue('token'),
    signIn: jest.fn().mockResolvedValue({ email: 'test@test.com' }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock CustomServerSettingsStore
const mockGetSettings = jest.fn().mockResolvedValue({
  serverUrl: null,
  apiKey: null,
  deviceId: null,
});
const mockSaveSettings = jest.fn().mockResolvedValue(undefined);
const mockValidateServerUrl = jest.fn().mockReturnValue({ valid: true });
const mockValidateApiKey = jest.fn().mockReturnValue({ valid: true });
const mockGetOrCreateDeviceId = jest.fn().mockResolvedValue('abcdef1234567890abcdef1234567890');

jest.mock('../../../src/services/backup/CustomServerSettingsStore', () => ({
  customServerSettingsStore: {
    getSettings: (...args: any[]) => mockGetSettings(...args),
    saveSettings: (...args: any[]) => mockSaveSettings(...args),
    validateServerUrl: (...args: any[]) => mockValidateServerUrl(...args),
    validateApiKey: (...args: any[]) => mockValidateApiKey(...args),
    getOrCreateDeviceId: (...args: any[]) => mockGetOrCreateDeviceId(...args),
    clearSettings: jest.fn().mockResolvedValue(undefined),
    isConfigured: jest.fn().mockResolvedValue(false),
  },
}));

// Mock CustomServerClient
const mockTestConnection = jest.fn().mockResolvedValue(undefined);
const mockListBackups = jest.fn().mockResolvedValue([]);
const mockDeleteBackup = jest.fn().mockResolvedValue({ message: 'Deleted' });
const mockMapServerToAppMetadata = jest.fn((item: any) => ({
  id: item.filename,
  fileName: item.filename,
  createdAt: new Date(item.createdAt),
  sizeBytes: item.sizeBytes,
  schemaVersion: 0,
}));

jest.mock('../../../src/services/backup/CustomServerClient', () => ({
  testConnection: (...args: any[]) => mockTestConnection(...args),
  listBackups: (...args: any[]) => mockListBackups(...args),
  deleteBackup: (...args: any[]) => mockDeleteBackup(...args),
  mapServerToAppMetadata: (...args: any[]) => mockMapServerToAppMetadata(...args),
  CustomServerError: class CustomServerError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'CustomServerError';
    }
  },
}));

// Mock CustomServerIntegration
jest.mock('../../../src/services/backup/CustomServerIntegration', () => ({
  createCustomServerBackup: jest.fn().mockResolvedValue({
    filename: 'backup-test.db',
    timestamp: '2025-01-15T14:30:22.000Z',
    sizeBytes: 1024,
  }),
  restoreFromCustomServer: jest.fn().mockResolvedValue({
    success: true,
    transactionCount: 10,
    schemaVersion: 1,
  }),
}));

// Mock theme constants
jest.mock('../../../src/constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  typography: { caption: { fontSize: 12 }, body: { fontSize: 16 } },
  borderRadius: { sm: 4, md: 8, lg: 12 },
}));

// Import the component after all mocks are set up
import BackupSettingsScreen from '../../../app/(tabs)/settings/backup';

describe('CustomServerSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetSettings.mockResolvedValue({
      serverUrl: null,
      apiKey: null,
      deviceId: null,
    });
    mockValidateServerUrl.mockReturnValue({ valid: true });
    mockValidateApiKey.mockReturnValue({ valid: true });
    mockTestConnection.mockResolvedValue(undefined);
    mockListBackups.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders custom server section with collapsible header', async () => {
      const { getByTestId } = render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(getByTestId('custom-server-header')).toBeTruthy();
      });
    });

    it('expanding section shows URL input, API key input, and Save button', async () => {
      const { getByTestId, queryByTestId } = render(<BackupSettingsScreen />);

      // Section content should not be visible initially
      await waitFor(() => {
        expect(queryByTestId('custom-server-section')).toBeNull();
      });

      // Expand the section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-section')).toBeTruthy();
        expect(getByTestId('custom-server-url-input')).toBeTruthy();
        expect(getByTestId('custom-server-api-key-input')).toBeTruthy();
        expect(getByTestId('custom-server-save-button')).toBeTruthy();
      });
    });
  });

  describe('Validation', () => {
    it('shows validation error for invalid URL on save', async () => {
      mockValidateServerUrl.mockReturnValue({
        valid: false,
        error: 'Server URL must start with http:// or https://',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Enter invalid URL
      await act(async () => {
        fireEvent.changeText(getByTestId('custom-server-url-input'), 'not-a-url');
      });

      // Press save
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-save-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-url-error')).toBeTruthy();
      });
    });

    it('shows validation error for invalid API key on save', async () => {
      mockValidateApiKey.mockReturnValue({
        valid: false,
        error: 'API key is required',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Enter URL but leave API key empty
      await act(async () => {
        fireEvent.changeText(getByTestId('custom-server-url-input'), 'http://localhost:3000');
      });

      // Press save
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-save-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-api-key-error')).toBeTruthy();
      });
    });
  });

  describe('Connection Test', () => {
    it('shows loading spinner while testing connection', async () => {
      // Make testConnection hang to observe loading state
      mockTestConnection.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      // Should show testing indicator
      await waitFor(() => {
        expect(getByTestId('custom-server-testing-indicator')).toBeTruthy();
      });
    });

    it('shows success indicator on successful connection test', async () => {
      mockTestConnection.mockResolvedValue(undefined);
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-connection-success')).toBeTruthy();
      });
    });

    it('shows error message on failed connection test', async () => {
      mockTestConnection.mockRejectedValue(new Error('Server unreachable'));
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-connection-error')).toBeTruthy();
      });
    });
  });

  describe('Backup List', () => {
    it('renders backup items with filename, date, and size after successful connection', async () => {
      const mockBackupData = [
        { filename: 'backup-2025-01-15.db', createdAt: '2025-01-15T10:00:00.000Z', sizeBytes: 2048 },
        { filename: 'backup-2025-01-14.db', createdAt: '2025-01-14T10:00:00.000Z', sizeBytes: 1024 },
      ];

      mockTestConnection.mockResolvedValue(undefined);
      mockListBackups.mockResolvedValue(mockBackupData);
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection (which triggers backup list fetch on success)
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-backups-list')).toBeTruthy();
        expect(getByTestId('custom-backup-item-backup-2025-01-15.db')).toBeTruthy();
        expect(getByTestId('custom-backup-item-backup-2025-01-14.db')).toBeTruthy();
      });
    });

    it('shows empty state when no backups exist', async () => {
      mockTestConnection.mockResolvedValue(undefined);
      mockListBackups.mockResolvedValue([]);
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-no-backups')).toBeTruthy();
      });
    });
  });

  describe('Error Display', () => {
    it('displays error message when backup list fetch fails', async () => {
      mockTestConnection.mockResolvedValue(undefined);
      mockListBackups.mockRejectedValue(new Error('Failed to fetch backups'));
      mockGetSettings.mockResolvedValue({
        serverUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        deviceId: 'device123',
      });

      const { getByTestId } = render(<BackupSettingsScreen />);

      // Expand section
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-header'));
      });

      // Press test connection (which triggers backup list fetch on success)
      await act(async () => {
        fireEvent.press(getByTestId('custom-server-test-connection-button'));
      });

      await waitFor(() => {
        expect(getByTestId('custom-server-backups-error')).toBeTruthy();
      });
    });
  });
});
