/**
 * Backup Settings Screen Tests
 *
 * Tests for the Backup Settings screen component.
 * Validates:
 * - Google account connection/disconnection
 * - Backup frequency selector
 * - Preferred backup time selector
 * - Backup Now action with progress indicator
 * - Restore from Backup action with backup list modal
 * - Backup status display (last backup time, status)
 *
 * **Validates: Requirements 8, 9, 10, 26, 30**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock useBackup hook
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockBackupNow = jest.fn();
const mockListBackups = jest.fn();
const mockRestore = jest.fn();
const mockSetBackupFrequency = jest.fn();
const mockSetPreferredHour = jest.fn();

const defaultUseBackupReturn = {
  // Status
  lastBackupTime: null as Date | null,
  lastBackupStatus: 'never' as 'never' | 'success' | 'failed',
  lastBackupError: null as string | null,
  // Operation state
  isBackingUp: false,
  isRestoring: false,
  backupProgress: null as { progress: number; message: string } | null,
  restoreProgress: null as { progress: number; message: string } | null,
  // Connection state
  isConnected: false,
  connectedEmail: null as string | null,
  // Scheduled backup
  backupFrequency: 'disabled' as 'daily' | 'every2days' | 'every3days' | 'weekly' | 'disabled',
  preferredHour: 3,
  // Available backups
  backups: [] as Array<{
    id: string;
    fileName: string;
    createdAt: Date;
    sizeBytes: number;
    schemaVersion: number;
  }>,
  isLoadingBackups: false,
  // Actions
  connect: mockConnect,
  disconnect: mockDisconnect,
  backupNow: mockBackupNow,
  listBackups: mockListBackups,
  restore: mockRestore,
  setBackupFrequency: mockSetBackupFrequency,
  setPreferredHour: mockSetPreferredHour,
};

let mockUseBackupReturn = { ...defaultUseBackupReturn };

jest.mock('../../src/hooks/useBackup', () => ({
  useBackup: () => mockUseBackupReturn,
}));

// Mock OAuthService
const mockIsSignedIn = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetAccessToken = jest.fn();

jest.mock('../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    isSignedIn: () => mockIsSignedIn(),
    getCurrentUser: () => mockGetCurrentUser(),
    getAccessToken: () => mockGetAccessToken(),
  },
}));

// Mock backup store
const mockSetConnectionStatus = jest.fn();

jest.mock('../../src/stores/backupStore', () => ({
  useBackupConnection: () => ({
    setConnectionStatus: mockSetConnectionStatus,
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'backup.googleAccount': 'Google Account',
        'backup.connected': 'Connected',
        'backup.notConnected': 'Not connected',
        'backup.connect': 'Connect',
        'backup.disconnect': 'Disconnect',
        'backup.disconnectConfirmation': 'Are you sure you want to disconnect?',
        'backup.lastBackup': 'Last Backup',
        'backup.never': 'Never backed up',
        'backup.error': 'Backup failed',
        'backup.scheduledBackup': 'Scheduled Backup',
        'backup.frequency': 'Frequency',
        'backup.frequencyDaily': 'Daily',
        'backup.frequencyEvery2Days': 'Every 2 days',
        'backup.frequencyEvery3Days': 'Every 3 days',
        'backup.frequencyWeekly': 'Weekly',
        'backup.frequencyDisabled': 'Disabled',
        'backup.preferredTime': 'Preferred Time',
        'backup.backupNow': 'Backup Now',
        'backup.restore': 'Restore',
        'backup.selectBackup': 'Select Backup',
        'backup.noBackupsFound': 'No backups found',
        'backup.confirmRestore': 'Confirm Restore',
        'backup.restoreWarning': 'This will replace all current data',
        'backup.restoreSuccess': 'Restore completed successfully',
        'backup.restoreError': 'Restore failed',
        'backup.inProgress': 'Backing up...',
        'backup.restoreInProgress': 'Restoring...',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'errors.oauthFailed': 'OAuth failed',
        'settings.dataStorageDescription': 'All data is stored locally on your device',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Import the component after mocks
import BackupSettingsScreen from '../(tabs)/settings/backup';

describe('BackupSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBackupReturn = { ...defaultUseBackupReturn };
    mockIsSignedIn.mockResolvedValue(false);
    mockGetCurrentUser.mockResolvedValue(null);
    mockGetAccessToken.mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders the backup settings screen', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-settings-screen')).toBeTruthy();
      });
    });

    it('renders Google Account section', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('google-account-section')).toBeTruthy();
        expect(screen.getByText('Google Account')).toBeTruthy();
      });
    });

    it('renders Backup Status section', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-status-section')).toBeTruthy();
        expect(screen.getByText('Last Backup')).toBeTruthy();
      });
    });

    it('renders Scheduled Backup section', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
        expect(screen.getByText('Scheduled Backup')).toBeTruthy();
      });
    });
  });

  describe('Google Account Connection - Disconnected State', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: false,
        connectedEmail: null,
      };
    });

    it('shows "Not connected" when disconnected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Not connected')).toBeTruthy();
      });
    });

    it('shows Connect button when disconnected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('connect-button')).toBeTruthy();
      });
    });

    it('calls connect when Connect button is pressed', async () => {
      mockConnect.mockResolvedValue(true);
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('connect-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('connect-button'));

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled();
      });
    });
  });

  describe('Google Account Connection - Connected State', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
      };
      mockIsSignedIn.mockResolvedValue(true);
      mockGetCurrentUser.mockResolvedValue({ email: 'user@example.com' });
    });

    it('shows connected email when connected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('connected-email')).toBeTruthy();
        expect(screen.getByText('user@example.com')).toBeTruthy();
      });
    });

    it('shows Disconnect button when connected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('disconnect-button')).toBeTruthy();
      });
    });

    it('shows "Connected" status when connected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeTruthy();
      });
    });
  });

  describe('Backup Status Display', () => {
    it('shows "Never backed up" when status is never', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        lastBackupStatus: 'never',
        lastBackupTime: null,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-status-text')).toBeTruthy();
        expect(screen.getByText('Never backed up')).toBeTruthy();
      });
    });

    it('shows relative time when backup was successful', async () => {
      const recentDate = new Date();
      recentDate.setMinutes(recentDate.getMinutes() - 5);

      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        lastBackupStatus: 'success',
        lastBackupTime: recentDate,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-status-text')).toBeTruthy();
        // Should show "5 minutes ago" or similar
        expect(screen.getByText(/minutes? ago/)).toBeTruthy();
      });
    });

    it('shows error message when backup failed', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        lastBackupStatus: 'failed',
        lastBackupError: 'Network error',
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-status-text')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('Backup Frequency Selector', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
        backupFrequency: 'daily',
      };
    });

    it('displays current frequency', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Daily')).toBeTruthy();
      });
    });

    it('opens frequency modal when pressed', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-modal')).toBeTruthy();
      });
    });

    it('shows all frequency options in modal', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-option-daily')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-every2days')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-every3days')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-weekly')).toBeTruthy();
        expect(screen.getByTestId('frequency-option-disabled')).toBeTruthy();
      });
    });

    it('calls setBackupFrequency when option is selected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('frequency-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('frequency-option-weekly')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('frequency-option-weekly'));

      expect(mockSetBackupFrequency).toHaveBeenCalledWith('weekly');
    });

    it('is disabled when not connected', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('frequency-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Preferred Time Selector', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
        backupFrequency: 'daily',
        preferredHour: 14,
      };
    });

    it('displays current preferred time', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('14:00')).toBeTruthy();
      });
    });

    it('opens time modal when pressed', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('time-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('time-modal')).toBeTruthy();
      });
    });

    it('calls setPreferredHour when time is selected', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('time-selector')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('time-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('time-option-8')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('time-option-8'));

      expect(mockSetPreferredHour).toHaveBeenCalledWith(8);
    });

    it('is disabled when frequency is disabled', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        backupFrequency: 'disabled',
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('time-selector');
        expect(selector.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Backup Now Action', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
      };
    });

    it('renders Backup Now button', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-now-button')).toBeTruthy();
        expect(screen.getByText('Backup Now')).toBeTruthy();
      });
    });

    it('calls backupNow when pressed', async () => {
      mockBackupNow.mockResolvedValue({ success: true });
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('backup-now-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('backup-now-button'));

      await waitFor(() => {
        expect(mockBackupNow).toHaveBeenCalled();
      });
    });

    it('is disabled when not connected', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('backup-now-button');
        expect(button.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('is disabled while backing up', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        isBackingUp: true,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('backup-now-button');
        expect(button.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Restore Action', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
      };
    });

    it('renders Restore button', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeTruthy();
        expect(screen.getByText('Restore')).toBeTruthy();
      });
    });

    it('opens restore modal when pressed', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('restore-button'));

      await waitFor(() => {
        expect(screen.getByTestId('restore-modal')).toBeTruthy();
      });
    });

    it('shows loading state while fetching backups', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        isLoadingBackups: true,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('restore-button'));

      await waitFor(() => {
        expect(screen.getByTestId('backups-loading')).toBeTruthy();
      });
    });

    it('shows empty state when no backups found', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        backups: [],
        isLoadingBackups: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('restore-button'));

      await waitFor(() => {
        expect(screen.getByTestId('no-backups')).toBeTruthy();
        expect(screen.getByText('No backups found')).toBeTruthy();
      });
    });

    it('shows backup list when backups are available', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        backups: [
          {
            id: 'backup-1',
            fileName: 'backup-2024-01-15.db',
            createdAt: new Date('2024-01-15T10:00:00'),
            sizeBytes: 1024 * 1024,
            schemaVersion: 1,
          },
        ],
        isLoadingBackups: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('restore-button'));

      await waitFor(() => {
        expect(screen.getByTestId('backups-list')).toBeTruthy();
        expect(screen.getByTestId('backup-item-backup-1')).toBeTruthy();
      });
    });

    it('is disabled when not connected', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('restore-button');
        expect(button.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Progress Modal', () => {
    it('shows progress modal during backup', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        isBackingUp: true,
        backupProgress: { progress: 0.5, message: 'Uploading...' },
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-modal')).toBeTruthy();
        expect(screen.getByText('Backing up...')).toBeTruthy();
        expect(screen.getByTestId('backup-progress-message')).toBeTruthy();
      });
    });

    it('shows progress modal during restore', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        isRestoring: true,
        restoreProgress: { progress: 0.75, message: 'Restoring database...' },
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-modal')).toBeTruthy();
        expect(screen.getByText('Restoring...')).toBeTruthy();
        expect(screen.getByTestId('restore-progress-message')).toBeTruthy();
      });
    });

    it('shows progress bar with correct fill', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        isBackingUp: true,
        backupProgress: { progress: 0.5, message: 'Uploading...' },
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const progressFill = screen.getByTestId('progress-bar-fill');
        expect(progressFill.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ width: '50%' })])
        );
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: true,
        connectedEmail: 'user@example.com',
      };
    });

    it('connect button has accessible role', async () => {
      mockUseBackupReturn = {
        ...defaultUseBackupReturn,
        isConnected: false,
      };

      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('connect-button');
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('disconnect button has accessible role', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('disconnect-button');
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('backup now button has accessible label', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const button = screen.getByTestId('backup-now-button');
        expect(button.props.accessibilityLabel).toBe('Backup Now');
      });
    });

    it('frequency selector has accessible state', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        const selector = screen.getByTestId('frequency-selector');
        expect(selector.props.accessibilityRole).toBe('button');
        expect(selector.props.accessibilityState?.disabled).toBe(false);
      });
    });
  });

  describe('Data Storage Hint', () => {
    it('displays data storage description', async () => {
      render(<BackupSettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('All data is stored locally on your device')).toBeTruthy();
      });
    });
  });
});
