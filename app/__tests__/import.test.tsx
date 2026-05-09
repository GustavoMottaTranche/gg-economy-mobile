/**
 * Import Screen Tests
 *
 * Tests for the Import screens (index and progress).
 *
 * **Validates: Requirements 11, 12, 30**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();

const mockUseLocalSearchParams = jest.fn().mockReturnValue({});

jest.mock('expo-router', () => {
  const mockRouter = {
    push: (...args: unknown[]) => mockPush(...args),
    back: (...args: unknown[]) => mockBack(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    navigate: (...args: unknown[]) => mockNavigate(...args),
  };
  return {
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockUseLocalSearchParams(),
  };
});

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'import.title': 'Import',
        'import.selectFile': 'Select File',
        'import.importing': 'Importing...',
        'import.success': 'Import completed',
        'import.error': 'Import error',
        'import.supportedFormats': 'Supported formats: CSV, OFX, QIF',
        'import.fileSelected': 'File selected',
        'import.parsing': 'Parsing file...',
        'import.processing': 'Processing transactions...',
        'import.checkingDuplicates': 'Checking for duplicates...',
        'import.transactionsFound': `${params?.count ?? 0} transaction(s) found`,
        'import.duplicatesFound': `${params?.count ?? 0} possible duplicate(s)`,
        'import.importComplete': 'Import completed successfully',
        'import.importFailed': 'Import failed',
        'import.invalidFormat': 'Invalid file format',
        'import.noTransactionsFound': 'No transactions found in file',
        'import.parseError': 'Error parsing file',
        'import.goToReview': 'Go to review',
        'common.close': 'Close',
        'common.cancel': 'Cancel',
        'common.retry': 'Retry',
        'common.loading': 'Loading...',
        'errors.generic': 'An error occurred. Please try again.',
        'errors.parseErrorLine': `Could not read file. Line ${params?.line ?? ''}: ${params?.message ?? ''}`,
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock useImport hook
const mockSelectFile = jest.fn();
const mockImportFromUri = jest.fn();
const mockReset = jest.fn();
const mockCancel = jest.fn();

const defaultUseImportReturn = {
  selectFile: mockSelectFile,
  importSelectedFile: jest.fn(),
  selectAndImport: jest.fn(),
  importFromUri: mockImportFromUri,
  cancel: mockCancel,
  reset: mockReset,
  isImporting: false,
  progress: {
    stage: 'idle' as const,
    percentage: 0,
    message: '',
    transactionsProcessed: 0,
    totalTransactions: 0,
  },
  result: null,
  selectedFile: null,
  error: null,
};

let mockUseImportReturn = { ...defaultUseImportReturn };

jest.mock('../../src/hooks/useImport', () => ({
  useImport: () => mockUseImportReturn,
}));

// Mock LoadingIndicator
jest.mock('../../src/components/ui/LoadingIndicator', () => ({
  LoadingIndicator: ({ message, testID }: { message?: string; testID?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{message ?? 'Loading...'}</Text>
      </View>
    );
  },
}));

// Mock import components
jest.mock('../../src/components/import', () => ({
  MultiFileSelector: ({
    onFilesSelected,
    onCancel,
  }: {
    onFilesSelected: (files: unknown[]) => void;
    onCancel: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="multi-file-selector">
        <TouchableOpacity testID="multi-file-select" onPress={() => onFilesSelected([])}>
          <Text>Select Files</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="multi-file-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  },
  ProgressTracker: ({ progress, onCancel }: { progress: unknown; onCancel: () => void }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="progress-tracker">
        <Text>Progress Tracker</Text>
        <TouchableOpacity testID="progress-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  },
  SheetSelector: ({
    sheets,
    onSelect,
    onTimeout,
  }: {
    sheets: unknown[];
    onSelect: (name: string) => void;
    onTimeout: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="sheet-selector">
        <Text>Sheet Selector</Text>
        <TouchableOpacity testID="sheet-select" onPress={() => onSelect('Sheet1')}>
          <Text>Select Sheet</Text>
        </TouchableOpacity>
      </View>
    );
  },
  ImportSummary: ({
    result,
    onGoToReview,
    onRetryFailed,
    onClose,
  }: {
    result: unknown;
    onGoToReview: () => void;
    onRetryFailed: () => void;
    onClose: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="import-summary">
        <Text>Import Summary</Text>
        <TouchableOpacity testID="summary-review" onPress={onGoToReview}>
          <Text>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="summary-retry" onPress={onRetryFailed}>
          <Text>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="summary-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
  SUPPORTED_EXTENSIONS: ['.csv', '.ofx', '.qfx', '.xlsx', '.xls'],
}));

// Mock useImportPreferences hook
jest.mock('../../src/hooks/useImportPreferences', () => ({
  useImportPreferences: () => ({
    preferences: {
      lastImportMode: 'single',
      sheetPreferences: {},
      lastManualCategoryId: null,
    },
    isReady: true,
    setLastImportMode: jest.fn(),
    setSheetPreference: jest.fn(),
    getSheetPreference: jest.fn(),
    setLastManualCategory: jest.fn(),
    clearSheetPreferences: jest.fn(),
    reset: jest.fn(),
  }),
  useLastManualCategory: () => null,
  useSetLastManualCategory: () => jest.fn(),
}));

// Import components after mocks
import ImportScreen from '../import/index';
import ImportProgressScreen from '../import/progress';

describe('ImportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImportReturn = { ...defaultUseImportReturn };
    mockUseLocalSearchParams.mockReturnValue({});
  });

  describe('Rendering', () => {
    it('renders correctly', () => {
      render(<ImportScreen />);

      expect(screen.getByTestId('import-screen')).toBeTruthy();
      expect(screen.getByText('Import')).toBeTruthy();
      expect(screen.getByText('Supported formats: CSV, OFX, QIF')).toBeTruthy();
    });

    it('renders the file icon', () => {
      render(<ImportScreen />);

      expect(screen.getByText('📁')).toBeTruthy();
    });

    it('renders supported formats list', () => {
      render(<ImportScreen />);

      expect(screen.getByText('.CSV')).toBeTruthy();
      expect(screen.getByText('.OFX')).toBeTruthy();
      expect(screen.getByText('.QIF')).toBeTruthy();
      expect(screen.getByText('Comma-separated values')).toBeTruthy();
      expect(screen.getByText('Open Financial Exchange')).toBeTruthy();
      expect(screen.getByText('Quicken Interchange Format')).toBeTruthy();
    });

    it('renders select file button', () => {
      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      expect(selectButton).toBeTruthy();
      expect(screen.getByText('Select File')).toBeTruthy();
    });

    it('renders close button', () => {
      render(<ImportScreen />);

      expect(screen.getByTestId('import-close-button')).toBeTruthy();
    });
  });

  describe('File Selection', () => {
    it('calls selectFile when select button is pressed', async () => {
      mockSelectFile.mockResolvedValue({
        success: false,
        cancelled: true,
      });

      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(mockSelectFile).toHaveBeenCalled();
      });
    });

    it('navigates to progress screen on successful file selection', async () => {
      mockSelectFile.mockResolvedValue({
        success: true,
        uri: 'file:///test.csv',
        fileName: 'test.csv',
        fileType: 'csv',
      });

      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({
          pathname: '/import/progress',
          params: {
            uri: 'file:///test.csv',
            fileName: 'test.csv',
            fileType: 'csv',
          },
        });
      });
    });

    it('does not navigate when file selection is cancelled', async () => {
      mockSelectFile.mockResolvedValue({
        success: false,
        cancelled: true,
      });

      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      fireEvent.press(selectButton);

      await waitFor(() => {
        expect(mockSelectFile).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    it('calls reset and navigates back when close button is pressed', () => {
      render(<ImportScreen />);

      const closeButton = screen.getByTestId('import-close-button');
      fireEvent.press(closeButton);

      expect(mockReset).toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('displays error message when there is an error', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        error: 'Failed to read file',
      };

      render(<ImportScreen />);

      expect(screen.getByTestId('import-error')).toBeTruthy();
      expect(screen.getByText('Failed to read file')).toBeTruthy();
    });

    it('shows retry button when there is an error', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        error: 'Failed to read file',
      };

      render(<ImportScreen />);

      expect(screen.getByTestId('import-retry-button')).toBeTruthy();
    });

    it('calls reset when retry button is pressed', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        error: 'Failed to read file',
      };

      render(<ImportScreen />);

      const retryButton = screen.getByTestId('import-retry-button');
      fireEvent.press(retryButton);

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when selecting file', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'selecting',
        },
      };

      render(<ImportScreen />);

      expect(screen.getByTestId('import-screen-loading')).toBeTruthy();
    });
  });

  describe('Share Intent Handling', () => {
    it('navigates to progress screen when shared file params are present', () => {
      mockUseLocalSearchParams.mockReturnValue({
        sharedUri: 'content://shared/file.csv',
        sharedFileName: 'shared_file.csv',
      });

      render(<ImportScreen />);

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/import/progress',
        params: {
          uri: 'content://shared/file.csv',
          fileName: 'shared_file.csv',
          isShared: 'true',
        },
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible select file button', () => {
      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      expect(selectButton.props.accessibilityRole).toBe('button');
      expect(selectButton.props.accessibilityLabel).toBe('Select File');
    });

    it('has accessible close button', () => {
      render(<ImportScreen />);

      const closeButton = screen.getByTestId('import-close-button');
      expect(closeButton.props.accessibilityRole).toBe('button');
      expect(closeButton.props.accessibilityLabel).toBe('Close');
    });

    it('disables select button when importing', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
      };

      render(<ImportScreen />);

      const selectButton = screen.getByTestId('import-select-button');
      expect(selectButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});

describe('ImportProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImportReturn = { ...defaultUseImportReturn };
    mockUseLocalSearchParams.mockReturnValue({
      uri: 'file:///test.csv',
      fileName: 'test.csv',
      fileType: 'csv',
    });
  });

  describe('Rendering', () => {
    it('renders correctly', () => {
      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-progress-screen')).toBeTruthy();
    });

    it('displays file name', () => {
      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-file-name')).toBeTruthy();
      expect(screen.getByText('test.csv')).toBeTruthy();
    });

    it('renders progress steps', () => {
      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-progress-steps')).toBeTruthy();
    });
  });

  describe('Import Initiation', () => {
    it('calls importFromUri when mounted with file params', async () => {
      render(<ImportProgressScreen />);

      await waitFor(() => {
        expect(mockImportFromUri).toHaveBeenCalledWith('file:///test.csv', 'test.csv', 'csv');
      });
    });
  });

  describe('Progress States', () => {
    it('shows spinner when importing', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'parsing',
          percentage: 35,
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-progress-spinner')).toBeTruthy();
      expect(screen.getByText('Importing...')).toBeTruthy();
    });

    it('shows progress percentage', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'parsing',
          percentage: 35,
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByText('35%')).toBeTruthy();
    });

    it('shows cancel button when importing', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'parsing',
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-cancel-button')).toBeTruthy();
    });
  });

  describe('Success State', () => {
    it('shows success icon when import completes', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'complete',
          percentage: 100,
        },
        result: {
          success: true,
          transactionsImported: 10,
          duplicatesFound: 2,
          duplicates: [],
          parseErrors: [],
          warnings: [],
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-success-icon')).toBeTruthy();
      expect(screen.getByText('Import completed')).toBeTruthy();
    });

    it('shows import results', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'complete',
          percentage: 100,
        },
        result: {
          success: true,
          transactionsImported: 10,
          duplicatesFound: 2,
          duplicates: [],
          parseErrors: [],
          warnings: [],
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-results')).toBeTruthy();
      expect(screen.getByText('10 transaction(s) found')).toBeTruthy();
      expect(screen.getByText('2 possible duplicate(s)')).toBeTruthy();
    });

    it('shows go to review button on success', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'complete',
          percentage: 100,
        },
        result: {
          success: true,
          transactionsImported: 10,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-go-to-review-button')).toBeTruthy();
      expect(screen.getByText('Go to review')).toBeTruthy();
    });

    it('navigates to review screen when go to review is pressed', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'complete',
          percentage: 100,
        },
        result: {
          success: true,
          transactionsImported: 10,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
        },
      };

      render(<ImportProgressScreen />);

      const goToReviewButton = screen.getByTestId('import-go-to-review-button');
      fireEvent.press(goToReviewButton);

      expect(mockReset).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/review');
    });
  });

  describe('Error State', () => {
    it('shows error icon when import fails', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        error: 'Failed to parse file',
        result: {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse file',
          },
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-error-icon')).toBeTruthy();
      expect(screen.getByText('Import error')).toBeTruthy();
    });

    it('shows error message', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        error: 'Failed to parse file',
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-error-container')).toBeTruthy();
      expect(screen.getByText('Failed to parse file')).toBeTruthy();
    });

    it('shows parse errors when available', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        result: {
          success: false,
          transactionsImported: 0,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [
            { lineNumber: 5, message: 'Invalid date format' },
            { lineNumber: 10, message: 'Invalid amount' },
          ],
          warnings: [],
          error: {
            code: 'PARSE_ERROR',
            message: 'Parse errors occurred',
          },
        },
      };

      render(<ImportProgressScreen />);

      expect(screen.getByText('Error parsing file:')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        error: 'Failed to parse file',
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-retry-button')).toBeTruthy();
    });

    it('shows select different file button on error', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        error: 'Failed to parse file',
      };

      render(<ImportProgressScreen />);

      expect(screen.getByTestId('import-select-different-button')).toBeTruthy();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls cancel and navigates back when cancel is pressed', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'parsing',
        },
      };

      render(<ImportProgressScreen />);

      const cancelButton = screen.getByTestId('import-cancel-button');
      fireEvent.press(cancelButton);

      expect(mockCancel).toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible go to review button', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'complete',
          percentage: 100,
        },
        result: {
          success: true,
          transactionsImported: 10,
          duplicatesFound: 0,
          duplicates: [],
          parseErrors: [],
          warnings: [],
        },
      };

      render(<ImportProgressScreen />);

      const goToReviewButton = screen.getByTestId('import-go-to-review-button');
      expect(goToReviewButton.props.accessibilityRole).toBe('button');
      expect(goToReviewButton.props.accessibilityLabel).toBe('Go to review');
    });

    it('has accessible cancel button', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: true,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'parsing',
        },
      };

      render(<ImportProgressScreen />);

      const cancelButton = screen.getByTestId('import-cancel-button');
      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityLabel).toBe('Cancel');
    });

    it('has accessible retry button', () => {
      mockUseImportReturn = {
        ...defaultUseImportReturn,
        isImporting: false,
        progress: {
          ...defaultUseImportReturn.progress,
          stage: 'error',
        },
        error: 'Failed to parse file',
      };

      render(<ImportProgressScreen />);

      const retryButton = screen.getByTestId('import-retry-button');
      expect(retryButton.props.accessibilityRole).toBe('button');
      expect(retryButton.props.accessibilityLabel).toBe('Retry');
    });
  });
});

describe('Import Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImportReturn = { ...defaultUseImportReturn };
  });

  it('completes full import flow: select -> progress -> review', async () => {
    // Step 1: File selection
    mockSelectFile.mockResolvedValue({
      success: true,
      uri: 'file:///bank_statement.csv',
      fileName: 'bank_statement.csv',
      fileType: 'csv',
    });

    mockUseLocalSearchParams.mockReturnValue({});
    const { unmount } = render(<ImportScreen />);

    const selectButton = screen.getByTestId('import-select-button');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/import/progress',
        params: {
          uri: 'file:///bank_statement.csv',
          fileName: 'bank_statement.csv',
          fileType: 'csv',
        },
      });
    });

    unmount();

    // Step 2: Progress screen with successful import
    mockUseLocalSearchParams.mockReturnValue({
      uri: 'file:///bank_statement.csv',
      fileName: 'bank_statement.csv',
      fileType: 'csv',
    });

    mockUseImportReturn = {
      ...defaultUseImportReturn,
      isImporting: false,
      progress: {
        ...defaultUseImportReturn.progress,
        stage: 'complete',
        percentage: 100,
      },
      result: {
        success: true,
        transactionsImported: 15,
        duplicatesFound: 3,
        duplicates: [],
        parseErrors: [],
        warnings: [],
      },
    };

    render(<ImportProgressScreen />);

    // Step 3: Navigate to review
    const goToReviewButton = screen.getByTestId('import-go-to-review-button');
    fireEvent.press(goToReviewButton);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/review');
  });
});
