/**
 * CloudSyncScreen Component Tests
 *
 * Tests for the Cloud Sync Import screen with sync key authentication.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { CloudSyncError } from '../../../services/cloud-sync/CloudSyncError';
import type { ImportResult, SyncStep } from '../../../services/cloud-sync/types';

// ─── Mock State ──────────────────────────────────────────────────────────────

const mockStartSync = jest.fn();
const mockClearResult = jest.fn();
const mockClearError = jest.fn();
const mockSaveSyncKey = jest.fn();
const mockRemoveSyncKeyAction = jest.fn();

let mockHookState: {
  isRunning: boolean;
  currentStep: SyncStep | null;
  result: ImportResult | null;
  error: CloudSyncError | null;
  hasKey: boolean;
  isValidating: boolean;
  isKeyValid: boolean | null;
  startSync: jest.Mock;
  clearResult: jest.Mock;
  clearError: jest.Mock;
  saveSyncKey: jest.Mock;
  removeSyncKeyAction: jest.Mock;
};

function resetMockHookState() {
  mockHookState = {
    isRunning: false,
    currentStep: null,
    result: null,
    error: null,
    hasKey: false,
    isValidating: false,
    isKeyValid: null,
    startSync: mockStartSync,
    clearResult: mockClearResult,
    clearError: mockClearError,
    saveSyncKey: mockSaveSyncKey,
    removeSyncKeyAction: mockRemoveSyncKeyAction,
  };
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../../hooks/useCloudSync', () => ({
  useCloudSync: () => mockHookState,
}));

jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#D1D5DB' },
    semantic: {
      success: { light: '#DCFCE7', base: '#16A34A', dark: '#166534' },
      danger: { light: '#FEE2E2', base: '#DC2626', dark: '#991B1B' },
    },
  }),
}));

// ─── Import Component After Mocks ────────────────────────────────────────────

import { CloudSyncScreen } from '../CloudSyncScreen';

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockImportResult: ImportResult = {
  totals: { ok: 42, failed: 3, skipped: 5 },
  tables: {
    categories: { ok: 10, failed: 0, skipped: 1 },
    transactions: { ok: 32, failed: 3, skipped: 4 },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CloudSyncScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockHookState();
  });

  describe('Key input when no key stored', () => {
    it('shows sync key input field when no key is stored', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('sync-key-input')).toBeTruthy();
    });

    it('shows save key button', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('save-key-button')).toBeTruthy();
    });

    it('disables save button when input is empty', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      const button = getByTestId('save-key-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables save button when key is entered', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      fireEvent.changeText(getByTestId('sync-key-input'), 'gge_testkey123');
      const button = getByTestId('save-key-button');
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('does not show sync button when no key stored', () => {
      const { queryByTestId } = render(<CloudSyncScreen />);
      expect(queryByTestId('start-sync-button')).toBeNull();
    });
  });

  describe('Key configured state', () => {
    beforeEach(() => {
      mockHookState.hasKey = true;
    });

    it('shows key status indicator', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('key-status')).toBeTruthy();
    });

    it('shows remove key button', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('remove-key-button')).toBeTruthy();
    });

    it('shows sync button when key is stored', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('start-sync-button')).toBeTruthy();
    });

    it('hides key input when key is stored', () => {
      const { queryByTestId } = render(<CloudSyncScreen />);
      expect(queryByTestId('sync-key-input')).toBeNull();
    });

    it('calls removeSyncKeyAction when remove is pressed', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      fireEvent.press(getByTestId('remove-key-button'));
      expect(mockRemoveSyncKeyAction).toHaveBeenCalled();
    });
  });

  describe('Sync button behavior', () => {
    beforeEach(() => {
      mockHookState.hasKey = true;
    });

    it('enables sync button when key is stored and not running', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      const button = getByTestId('start-sync-button');
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('disables sync button while running', () => {
      mockHookState.hasKey = true;
      mockHookState.isRunning = true;

      const { getByTestId } = render(<CloudSyncScreen />);
      const button = getByTestId('start-sync-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('calls startSync on press', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      fireEvent.press(getByTestId('start-sync-button'));
      expect(mockStartSync).toHaveBeenCalled();
    });

    it('calls clearError before starting sync', () => {
      const { getByTestId } = render(<CloudSyncScreen />);
      fireEvent.press(getByTestId('start-sync-button'));
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Progress indicator', () => {
    it('shows progress indicator when sync is running', () => {
      mockHookState.hasKey = true;
      mockHookState.isRunning = true;
      mockHookState.currentStep = 'extracting';

      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('sync-progress')).toBeTruthy();
      expect(getByTestId('sync-activity-indicator')).toBeTruthy();
    });

    it('does not show progress when idle', () => {
      const { queryByTestId } = render(<CloudSyncScreen />);
      expect(queryByTestId('sync-progress')).toBeNull();
    });
  });

  describe('Success summary', () => {
    it('displays success container when result is available', () => {
      mockHookState.hasKey = true;
      mockHookState.result = mockImportResult;

      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('sync-success')).toBeTruthy();
    });

    it('does not show success when result is null', () => {
      const { queryByTestId } = render(<CloudSyncScreen />);
      expect(queryByTestId('sync-success')).toBeNull();
    });
  });

  describe('Error message', () => {
    it('displays error when present', () => {
      mockHookState.error = new CloudSyncError(
        'Chave inválida ou revogada — gere uma nova no web',
        'AUTH_FAILED',
        401
      );

      const { getByTestId } = render(<CloudSyncScreen />);
      expect(getByTestId('sync-error')).toBeTruthy();
      expect(getByTestId('sync-error-message').props.children).toBe(
        'Chave inválida ou revogada — gere uma nova no web'
      );
    });

    it('does not show error when null', () => {
      const { queryByTestId } = render(<CloudSyncScreen />);
      expect(queryByTestId('sync-error')).toBeNull();
    });
  });
});
