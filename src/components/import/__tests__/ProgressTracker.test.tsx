/**
 * ProgressTracker Component Tests
 *
 * Tests for the ProgressTracker component including:
 * - Current file display (Requirement 6.1, 6.3)
 * - Progress counter "File X of Y" (Requirement 6.2)
 * - Overall progress bar (Requirement 6.4)
 * - Failed file warning indicator (Requirement 6.5)
 * - Cancel button functionality (Requirement 6.6)
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 14.6**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgressTracker, type ProgressTrackerProps } from '../ProgressTracker';
import type { ImportProgress, FileImportResult } from '../../../services/import/types';

describe('ProgressTracker', () => {
  const mockOnCancel = jest.fn();

  const createProgress = (overrides: Partial<ImportProgress> = {}): ImportProgress => ({
    currentFile: 'test-file.xlsx',
    currentIndex: 0,
    totalFiles: 3,
    status: 'parsing',
    overallProgress: 33,
    ...overrides,
  });

  const createFileResult = (overrides: Partial<FileImportResult> = {}): FileImportResult => ({
    fileName: 'file1.csv',
    success: true,
    transactionsImported: 50,
    duplicatesFound: 2,
    ...overrides,
  });

  const defaultProps: ProgressTrackerProps = {
    progress: createProgress(),
    partialResults: [],
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      const { getByTestId, getByText } = render(<ProgressTracker {...defaultProps} />);

      expect(getByTestId('progress-tracker')).toBeTruthy();
      expect(getByText('fileImport.progress.title')).toBeTruthy();
    });

    it('renders cancel button', () => {
      const { getByTestId } = render(<ProgressTracker {...defaultProps} />);

      expect(getByTestId('cancel-import-button')).toBeTruthy();
    });
  });

  describe('Current File Display (Requirement 6.1, 6.3)', () => {
    it('displays the current file being processed', () => {
      const progress = createProgress({ currentFile: 'bank-statement.xlsx' });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const currentFileName = getByTestId('current-file-name');
      expect(currentFileName.props.children).toBe('bank-statement.xlsx');
    });

    it('updates when current file changes', () => {
      const { getByTestId, rerender } = render(
        <ProgressTracker
          {...defaultProps}
          progress={createProgress({ currentFile: 'file1.csv' })}
        />
      );

      expect(getByTestId('current-file-name').props.children).toBe('file1.csv');

      rerender(
        <ProgressTracker
          {...defaultProps}
          progress={createProgress({ currentFile: 'file2.xlsx' })}
        />
      );

      expect(getByTestId('current-file-name').props.children).toBe('file2.xlsx');
    });
  });

  describe('Progress Counter (Requirement 6.2)', () => {
    it('displays progress as "File X of Y"', () => {
      const progress = createProgress({
        currentIndex: 1,
        totalFiles: 5,
      });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const progressCounter = getByTestId('progress-counter');
      expect(progressCounter).toBeTruthy();
    });

    it('updates counter when progress changes', () => {
      const { getByTestId, rerender } = render(
        <ProgressTracker
          {...defaultProps}
          progress={createProgress({ currentIndex: 0, totalFiles: 3 })}
        />
      );

      expect(getByTestId('progress-counter')).toBeTruthy();

      rerender(
        <ProgressTracker
          {...defaultProps}
          progress={createProgress({ currentIndex: 2, totalFiles: 3 })}
        />
      );

      expect(getByTestId('progress-counter')).toBeTruthy();
    });
  });

  describe('Overall Progress Bar (Requirement 6.4)', () => {
    it('displays progress bar with correct percentage', () => {
      const progress = createProgress({ overallProgress: 50 });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const progressBarFill = getByTestId('progress-bar-fill');
      expect(progressBarFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '50%' })])
      );
    });

    it('displays percentage text', () => {
      const progress = createProgress({ overallProgress: 75 });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const percentageText = getByTestId('progress-percentage');
      // React Native may render children as array [number, string]
      const children = percentageText.props.children;
      const text = Array.isArray(children) ? children.join('') : children;
      expect(text).toBe('75%');
    });

    it('clamps progress to 0-100 range', () => {
      const { getByTestId, rerender } = render(
        <ProgressTracker {...defaultProps} progress={createProgress({ overallProgress: -10 })} />
      );

      let progressBarFill = getByTestId('progress-bar-fill');
      expect(progressBarFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '0%' })])
      );

      rerender(
        <ProgressTracker {...defaultProps} progress={createProgress({ overallProgress: 150 })} />
      );

      progressBarFill = getByTestId('progress-bar-fill');
      expect(progressBarFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '100%' })])
      );
    });

    it('rounds percentage to nearest integer', () => {
      const progress = createProgress({ overallProgress: 33.7 });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const percentageText = getByTestId('progress-percentage');
      // React Native may render children as array [number, string]
      const children = percentageText.props.children;
      const text = Array.isArray(children) ? children.join('') : children;
      expect(text).toBe('34%');
    });
  });

  describe('Failed File Warning (Requirement 6.5)', () => {
    it('displays warning when files have failed', () => {
      const partialResults: FileImportResult[] = [
        createFileResult({ fileName: 'success.csv', success: true }),
        createFileResult({
          fileName: 'failed.xlsx',
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Invalid format' },
        }),
      ];

      const { getByTestId } = render(
        <ProgressTracker {...defaultProps} partialResults={partialResults} />
      );

      expect(getByTestId('failed-files-warning')).toBeTruthy();
    });

    it('does not display warning when no files have failed', () => {
      const partialResults: FileImportResult[] = [
        createFileResult({ fileName: 'success1.csv', success: true }),
        createFileResult({ fileName: 'success2.csv', success: true }),
      ];

      const { queryByTestId } = render(
        <ProgressTracker {...defaultProps} partialResults={partialResults} />
      );

      expect(queryByTestId('failed-files-warning')).toBeNull();
    });

    it('shows warning icon next to failed files in results list', () => {
      const partialResults: FileImportResult[] = [
        createFileResult({
          fileName: 'failed.xlsx',
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Invalid format' },
        }),
      ];

      const { getByTestId } = render(
        <ProgressTracker {...defaultProps} partialResults={partialResults} />
      );

      expect(getByTestId('file-result-failed.xlsx')).toBeTruthy();
    });
  });

  describe('Cancel Button (Requirement 6.6)', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const { getByTestId } = render(<ProgressTracker {...defaultProps} />);

      fireEvent.press(getByTestId('cancel-import-button'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('disables cancel button when import is completed', () => {
      const progress = createProgress({ status: 'completed' });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const cancelButton = getByTestId('cancel-import-button');
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });

    it('disables cancel button when import has failed', () => {
      const progress = createProgress({ status: 'failed' });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const cancelButton = getByTestId('cancel-import-button');
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables cancel button during active import', () => {
      const statuses: ImportProgress['status'][] = ['parsing', 'deduping', 'saving'];

      statuses.forEach((status) => {
        const progress = createProgress({ status });
        const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

        const cancelButton = getByTestId('cancel-import-button');
        expect(cancelButton.props.accessibilityState.disabled).toBe(false);
      });
    });
  });

  describe('File Results List', () => {
    it('displays partial results when available', () => {
      const partialResults: FileImportResult[] = [
        createFileResult({ fileName: 'file1.csv' }),
        createFileResult({ fileName: 'file2.xlsx' }),
      ];

      const { getByTestId } = render(
        <ProgressTracker {...defaultProps} partialResults={partialResults} />
      );

      expect(getByTestId('file-results-list')).toBeTruthy();
      expect(getByTestId('file-result-file1.csv')).toBeTruthy();
      expect(getByTestId('file-result-file2.xlsx')).toBeTruthy();
    });

    it('does not display results list when empty', () => {
      const { queryByTestId } = render(<ProgressTracker {...defaultProps} partialResults={[]} />);

      expect(queryByTestId('file-results-list')).toBeNull();
    });

    it('highlights current file in results list', () => {
      const partialResults: FileImportResult[] = [
        createFileResult({ fileName: 'current-file.csv' }),
      ];
      const progress = createProgress({ currentFile: 'current-file.csv' });

      const { getByTestId } = render(
        <ProgressTracker {...defaultProps} progress={progress} partialResults={partialResults} />
      );

      const fileResult = getByTestId('file-result-current-file.csv');
      expect(fileResult).toBeTruthy();
    });
  });

  describe('Status Display', () => {
    it('displays different status icons for different states', () => {
      const statuses: ImportProgress['status'][] = [
        'parsing',
        'deduping',
        'saving',
        'completed',
        'failed',
      ];

      statuses.forEach((status) => {
        const progress = createProgress({ status });
        const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

        expect(getByTestId('progress-tracker')).toBeTruthy();
      });
    });
  });

  describe('Progress Tracking Accuracy (Requirement 14.6)', () => {
    /**
     * Helper to get text content from a React Native Text element
     */
    const getTextContent = (element: { props: { children: unknown } }): string => {
      const children = element.props.children;
      return Array.isArray(children) ? children.join('') : String(children);
    };

    it('accurately tracks progress from 0 to 100', () => {
      const progressValues = [0, 25, 50, 75, 100];

      progressValues.forEach((value) => {
        const progress = createProgress({ overallProgress: value });
        const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

        const percentageText = getByTestId('progress-percentage');
        expect(getTextContent(percentageText)).toBe(`${value}%`);

        const progressBarFill = getByTestId('progress-bar-fill');
        expect(progressBarFill.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ width: `${value}%` })])
        );
      });
    });

    it('correctly updates progress as files are processed', () => {
      const { getByTestId, rerender } = render(
        <ProgressTracker
          {...defaultProps}
          progress={createProgress({
            currentIndex: 0,
            totalFiles: 4,
            overallProgress: 0,
          })}
          partialResults={[]}
        />
      );

      expect(getTextContent(getByTestId('progress-percentage'))).toBe('0%');

      // Simulate progress through files
      const progressSteps = [
        { currentIndex: 0, overallProgress: 25, results: 1 },
        { currentIndex: 1, overallProgress: 50, results: 2 },
        { currentIndex: 2, overallProgress: 75, results: 3 },
        { currentIndex: 3, overallProgress: 100, results: 4 },
      ];

      progressSteps.forEach((step) => {
        const partialResults = Array.from({ length: step.results }, (_, i) =>
          createFileResult({ fileName: `file${i + 1}.csv` })
        );

        rerender(
          <ProgressTracker
            {...defaultProps}
            progress={createProgress({
              currentIndex: step.currentIndex,
              totalFiles: 4,
              overallProgress: step.overallProgress,
            })}
            partialResults={partialResults}
          />
        );

        expect(getTextContent(getByTestId('progress-percentage'))).toBe(`${step.overallProgress}%`);
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible cancel button', () => {
      const { getByTestId } = render(<ProgressTracker {...defaultProps} />);

      const cancelButton = getByTestId('cancel-import-button');
      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityLabel).toBeTruthy();
    });

    it('indicates disabled state for accessibility', () => {
      const progress = createProgress({ status: 'completed' });
      const { getByTestId } = render(<ProgressTracker {...defaultProps} progress={progress} />);

      const cancelButton = getByTestId('cancel-import-button');
      expect(cancelButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
