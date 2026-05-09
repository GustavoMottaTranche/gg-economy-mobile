/**
 * MultiFileSelector Component Tests
 *
 * Tests for the MultiFileSelector component including:
 * - File selection up to 10 files (Requirement 4.2)
 * - Mixed file types support (Requirement 4.3)
 * - File count display (Requirement 4.4)
 * - Selection cancellation (Requirement 4.5)
 * - Extension validation (Requirement 4.6)
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 14.1**
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  MultiFileSelector,
  type MultiFileSelectorProps,
  type SelectedFile,
} from '../MultiFileSelector';

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MultiFileSelector', () => {
  const mockOnFilesSelected = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps: MultiFileSelectorProps = {
    onFilesSelected: mockOnFilesSelected,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title and subtitle', () => {
      const { getByText, getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      expect(getByTestId('multi-file-selector')).toBeTruthy();
      expect(getByText('fileImport.multiFile.title')).toBeTruthy();
    });

    it('renders empty state when no files are selected', () => {
      const { getByText } = render(<MultiFileSelector {...defaultProps} />);

      expect(getByText('fileImport.multiFile.noFilesSelected')).toBeTruthy();
      expect(getByText('fileImport.multiFile.tapToSelect')).toBeTruthy();
    });

    it('renders file count display (Requirement 4.4)', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      expect(getByTestId('file-count')).toBeTruthy();
    });

    it('renders add files button', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      expect(getByTestId('add-files-button')).toBeTruthy();
    });

    it('renders cancel and confirm buttons', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      expect(getByTestId('cancel-button')).toBeTruthy();
      expect(getByTestId('confirm-button')).toBeTruthy();
    });
  });

  describe('File Selection (Requirement 4.1, 4.2, 4.3)', () => {
    it('allows selecting multiple files', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.ofx', name: 'test2.ofx', size: 2048 },
        { uri: 'file://test3.xlsx', name: 'test3.xlsx', size: 4096 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByText('test1.csv')).toBeTruthy();
        expect(getByText('test2.ofx')).toBeTruthy();
        expect(getByText('test3.xlsx')).toBeTruthy();
      });
    });

    it('supports mixed file types (CSV, OFX, Excel) (Requirement 4.3)', async () => {
      const mockAssets = [
        { uri: 'file://data.csv', name: 'data.csv', size: 1024 },
        { uri: 'file://bank.ofx', name: 'bank.ofx', size: 2048 },
        { uri: 'file://report.xlsx', name: 'report.xlsx', size: 4096 },
        { uri: 'file://legacy.xls', name: 'legacy.xls', size: 3072 },
        { uri: 'file://quicken.qfx', name: 'quicken.qfx', size: 1536 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByText('data.csv')).toBeTruthy();
        expect(getByText('bank.ofx')).toBeTruthy();
        expect(getByText('report.xlsx')).toBeTruthy();
        expect(getByText('legacy.xls')).toBeTruthy();
        expect(getByText('quicken.qfx')).toBeTruthy();
      });
    });

    it('enforces maximum file limit of 10 (Requirement 4.2)', async () => {
      // First, add 8 files
      const firstBatch = Array.from({ length: 8 }, (_, i) => ({
        uri: `file://test${i}.csv`,
        name: `test${i}.csv`,
        size: 1024,
      }));

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: firstBatch,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      // Now try to add 5 more files (should only add 2)
      const secondBatch = Array.from({ length: 5 }, (_, i) => ({
        uri: `file://extra${i}.csv`,
        name: `extra${i}.csv`,
        size: 1024,
      }));

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: secondBatch,
      });

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'fileImport.multiFile.limitExceeded',
          expect.any(String)
        );
      });
    });

    it('respects custom maxFiles prop', async () => {
      const mockAssets = Array.from({ length: 6 }, (_, i) => ({
        uri: `file://test${i}.csv`,
        name: `test${i}.csv`,
        size: 1024,
      }));

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} maxFiles={5} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'fileImport.multiFile.limitExceeded',
          expect.any(String)
        );
      });
    });

    it('handles cancelled file selection', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        assets: [],
      });

      const { getByTestId, getByText } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      // Should still show empty state
      expect(getByText('fileImport.multiFile.noFilesSelected')).toBeTruthy();
    });
  });

  describe('Extension Validation (Requirement 4.6)', () => {
    it('validates file extensions and rejects unsupported files', async () => {
      const mockAssets = [
        { uri: 'file://valid.csv', name: 'valid.csv', size: 1024 },
        { uri: 'file://invalid.pdf', name: 'invalid.pdf', size: 2048 },
        { uri: 'file://invalid.txt', name: 'invalid.txt', size: 512 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText, queryByText } = render(
        <MultiFileSelector {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        // Valid file should be added
        expect(getByText('valid.csv')).toBeTruthy();
        // Invalid files should not be added
        expect(queryByText('invalid.pdf')).toBeNull();
        expect(queryByText('invalid.txt')).toBeNull();
        // Alert should be shown for invalid files
        expect(Alert.alert).toHaveBeenCalledWith(
          'fileImport.multiFile.invalidFiles',
          expect.any(String)
        );
      });
    });

    it('accepts all supported extensions (.csv, .ofx, .qfx, .xlsx, .xls)', async () => {
      const mockAssets = [
        { uri: 'file://test.csv', name: 'test.csv', size: 1024 },
        { uri: 'file://test.ofx', name: 'test.ofx', size: 1024 },
        { uri: 'file://test.qfx', name: 'test.qfx', size: 1024 },
        { uri: 'file://test.xlsx', name: 'test.xlsx', size: 1024 },
        { uri: 'file://test.xls', name: 'test.xls', size: 1024 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByText('test.csv')).toBeTruthy();
        expect(getByText('test.ofx')).toBeTruthy();
        expect(getByText('test.qfx')).toBeTruthy();
        expect(getByText('test.xlsx')).toBeTruthy();
        expect(getByText('test.xls')).toBeTruthy();
      });
    });
  });

  describe('File Count Display (Requirement 4.4)', () => {
    it('displays correct file count before confirmation', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.csv', name: 'test2.csv', size: 2048 },
        { uri: 'file://test3.csv', name: 'test3.csv', size: 4096 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        const countText = getByTestId('file-count');
        expect(countText).toBeTruthy();
      });
    });

    it('updates count when files are removed', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.csv', name: 'test2.csv', size: 2048 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, queryByText } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByTestId('remove-file-test1.csv')).toBeTruthy();
      });

      // Remove a file
      await act(async () => {
        fireEvent.press(getByTestId('remove-file-test1.csv'));
      });

      await waitFor(() => {
        expect(queryByText('test1.csv')).toBeNull();
      });
    });
  });

  describe('Selection Cancellation (Requirement 4.5)', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      fireEvent.press(getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not call onFilesSelected when cancelled', async () => {
      const mockAssets = [{ uri: 'file://test.csv', name: 'test.csv', size: 1024 }];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      fireEvent.press(getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });
  });

  describe('File Confirmation', () => {
    it('calls onFilesSelected with selected files when confirmed', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.xlsx', name: 'test2.xlsx', size: 2048 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByTestId('file-item-test1.csv')).toBeTruthy();
      });

      fireEvent.press(getByTestId('confirm-button'));

      expect(mockOnFilesSelected).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'file://test1.csv',
            fileName: 'test1.csv',
            fileType: 'csv',
            size: 1024,
          }),
          expect.objectContaining({
            uri: 'file://test2.xlsx',
            fileName: 'test2.xlsx',
            fileType: 'xlsx',
            size: 2048,
          }),
        ])
      );
    });

    it('does not trigger action when confirm button is pressed with no files', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      fireEvent.press(getByTestId('confirm-button'));

      // Button is disabled, so onFilesSelected should not be called
      expect(mockOnFilesSelected).not.toHaveBeenCalled();
    });

    it('disables confirm button when no files are selected', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      const confirmButton = getByTestId('confirm-button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('File Removal', () => {
    it('allows removing individual files', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.csv', name: 'test2.csv', size: 2048 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText, queryByText } = render(
        <MultiFileSelector {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByText('test1.csv')).toBeTruthy();
        expect(getByText('test2.csv')).toBeTruthy();
      });

      // Remove first file
      await act(async () => {
        fireEvent.press(getByTestId('remove-file-test1.csv'));
      });

      await waitFor(() => {
        expect(queryByText('test1.csv')).toBeNull();
        expect(getByText('test2.csv')).toBeTruthy();
      });
    });

    it('allows clearing all files', async () => {
      const mockAssets = [
        { uri: 'file://test1.csv', name: 'test1.csv', size: 1024 },
        { uri: 'file://test2.csv', name: 'test2.csv', size: 2048 },
      ];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId, getByText, queryByText } = render(
        <MultiFileSelector {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(getByText('test1.csv')).toBeTruthy();
      });

      // Clear all files
      await act(async () => {
        fireEvent.press(getByTestId('clear-all-button'));
      });

      await waitFor(() => {
        expect(queryByText('test1.csv')).toBeNull();
        expect(queryByText('test2.csv')).toBeNull();
        expect(getByText('fileImport.multiFile.noFilesSelected')).toBeTruthy();
      });
    });
  });

  describe('Duplicate Prevention', () => {
    it('prevents adding duplicate files', async () => {
      const mockAssets = [{ uri: 'file://test.csv', name: 'test.csv', size: 1024 }];

      (DocumentPicker.getDocumentAsync as jest.Mock)
        .mockResolvedValueOnce({
          canceled: false,
          assets: mockAssets,
        })
        .mockResolvedValueOnce({
          canceled: false,
          assets: mockAssets, // Same file again
        });

      const { getByTestId, getAllByText } = render(<MultiFileSelector {...defaultProps} />);

      // Add file first time
      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      // Try to add same file again
      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        // Should only have one instance of the file
        const fileItems = getAllByText('test.csv');
        expect(fileItems.length).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles document picker errors gracefully', async () => {
      (DocumentPicker.getDocumentAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'fileImport.multiFile.selectionError');
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible buttons', () => {
      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      const addButton = getByTestId('add-files-button');
      const cancelButton = getByTestId('cancel-button');
      const confirmButton = getByTestId('confirm-button');

      expect(addButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(confirmButton.props.accessibilityRole).toBe('button');
    });

    it('has accessible file remove buttons', async () => {
      const mockAssets = [{ uri: 'file://test.csv', name: 'test.csv', size: 1024 }];

      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: mockAssets,
      });

      const { getByTestId } = render(<MultiFileSelector {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId('add-files-button'));
      });

      await waitFor(() => {
        const removeButton = getByTestId('remove-file-test.csv');
        expect(removeButton.props.accessibilityRole).toBe('button');
      });
    });
  });
});
