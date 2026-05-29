/**
 * ImportSummary Component Tests
 *
 * Tests for the ImportSummary component including:
 * - Total transactions display (Requirement 7.2)
 * - Total duplicates display (Requirement 7.3)
 * - Per-file results listing (Requirement 7.4, 7.5)
 * - Review All action (Requirement 7.6)
 * - Error message when all files fail (Requirement 7.7)
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImportSummary, type ImportSummaryProps } from '../ImportSummary';
import type { MultiFileImportResult, FileImportResult } from '../../../services/import/types';

describe('ImportSummary', () => {
  const mockOnGoToReview = jest.fn();
  const mockOnRetryFailed = jest.fn();
  const mockOnClose = jest.fn();

  const createFileResult = (overrides: Partial<FileImportResult> = {}): FileImportResult => ({
    fileName: 'test-file.csv',
    success: true,
    transactionsImported: 50,
    duplicatesFound: 2,
    ...overrides,
  });

  const createSuccessResult = (
    overrides: Partial<MultiFileImportResult> = {}
  ): MultiFileImportResult => ({
    success: true,
    fileResults: [
      createFileResult({ fileName: 'file1.csv', transactionsImported: 50, duplicatesFound: 2 }),
      createFileResult({ fileName: 'file2.xlsx', transactionsImported: 30, duplicatesFound: 1 }),
    ],
    totalTransactionsImported: 80,
    totalDuplicatesInFile: 3,
    totalCrossFileDuplicates: 2,
    totalDatabaseDuplicates: 1,
    failedFiles: [],
    batchGroupId: 'batch-123',
    ...overrides,
  });

  const createAllFailedResult = (): MultiFileImportResult => ({
    success: false,
    fileResults: [
      createFileResult({
        fileName: 'failed1.xlsx',
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        error: { code: 'EXCEL_CORRUPTED', message: 'File appears to be corrupted' },
      }),
      createFileResult({
        fileName: 'failed2.csv',
        success: false,
        transactionsImported: 0,
        duplicatesFound: 0,
        error: { code: 'PARSE_ERROR', message: 'Invalid CSV format' },
      }),
    ],
    totalTransactionsImported: 0,
    totalDuplicatesInFile: 0,
    totalCrossFileDuplicates: 0,
    totalDatabaseDuplicates: 0,
    failedFiles: ['failed1.xlsx', 'failed2.csv'],
    batchGroupId: 'batch-456',
  });

  const createPartialFailureResult = (): MultiFileImportResult => ({
    success: true,
    fileResults: [
      createFileResult({ fileName: 'success.csv', success: true, transactionsImported: 50 }),
      createFileResult({
        fileName: 'failed.xlsx',
        success: false,
        transactionsImported: 0,
        error: { code: 'EXCEL_CORRUPTED', message: 'File corrupted' },
      }),
    ],
    totalTransactionsImported: 50,
    totalDuplicatesInFile: 0,
    totalCrossFileDuplicates: 0,
    totalDatabaseDuplicates: 0,
    failedFiles: ['failed.xlsx'],
    batchGroupId: 'batch-789',
  });

  const defaultProps: ImportSummaryProps = {
    result: createSuccessResult(),
    onGoToReview: mockOnGoToReview,
    onRetryFailed: mockOnRetryFailed,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with summary screen (Requirement 7.1)', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(getByTestId('import-summary')).toBeTruthy();
    });

    it('displays overall status icon', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(getByTestId('overall-status-icon')).toBeTruthy();
    });
  });

  describe('Total Transactions Display (Requirement 7.2)', () => {
    it('displays total transactions imported across all files', () => {
      const result = createSuccessResult({ totalTransactionsImported: 150 });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const totalTransactions = getByTestId('total-transactions');
      expect(totalTransactions.props.children).toBe(150);
    });

    it('displays zero when no transactions imported', () => {
      const result = createSuccessResult({ totalTransactionsImported: 0 });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const totalTransactions = getByTestId('total-transactions');
      expect(totalTransactions.props.children).toBe(0);
    });
  });

  describe('Total Duplicates Display (Requirement 7.3)', () => {
    it('displays total duplicates found across all files', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 5,
        totalCrossFileDuplicates: 3,
        totalDatabaseDuplicates: 2,
      });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const totalDuplicates = getByTestId('total-duplicates');
      expect(totalDuplicates.props.children).toBe(10); // 5 + 3 + 2
    });

    it('displays duplicate breakdown when duplicates exist', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 5,
        totalCrossFileDuplicates: 3,
        totalDatabaseDuplicates: 2,
      });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('duplicate-breakdown')).toBeTruthy();
      expect(getByTestId('in-file-duplicates').props.children).toBe(5);
      expect(getByTestId('cross-file-duplicates').props.children).toBe(3);
      expect(getByTestId('database-duplicates').props.children).toBe(2);
    });
  });

  describe('Per-File Results (Requirements 7.4, 7.5)', () => {
    it('lists each file with its individual result', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(getByTestId('file-results-list')).toBeTruthy();
      expect(getByTestId('file-result-file1.csv')).toBeTruthy();
      expect(getByTestId('file-result-file2.xlsx')).toBeTruthy();
    });

    it('displays success status for successful files without duplicates', () => {
      const result = createSuccessResult({
        fileResults: [createFileResult({ fileName: 'clean-file.csv', duplicatesFound: 0 })],
      });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const statusIcon = getByTestId('file-status-icon-clean-file.csv');
      expect(statusIcon.props.children).toBe('✅');
    });

    it('displays error details for failed files (Requirement 7.5)', () => {
      const result = createPartialFailureResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const failedFileResult = getByTestId('file-result-failed.xlsx');
      expect(failedFileResult).toBeTruthy();

      const statusIcon = getByTestId('file-status-icon-failed.xlsx');
      expect(statusIcon.props.children).toBe('❌');

      const statusText = getByTestId('file-status-text-failed.xlsx');
      expect(statusText.props.children).toBe('File corrupted');
    });

    it('displays warning icon for files with duplicates', () => {
      const result = createSuccessResult({
        fileResults: [createFileResult({ fileName: 'with-dupes.csv', duplicatesFound: 5 })],
      });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const statusIcon = getByTestId('file-status-icon-with-dupes.csv');
      expect(statusIcon.props.children).toBe('⚠️');
    });
  });

  describe('Review All Action (Requirement 7.6)', () => {
    it('displays Review All button when there are successful imports', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(getByTestId('review-all-button')).toBeTruthy();
    });

    it('calls onGoToReview when Review All button is pressed', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      fireEvent.press(getByTestId('review-all-button'));

      expect(mockOnGoToReview).toHaveBeenCalledTimes(1);
    });

    it('does not display Review All button when no transactions imported', () => {
      const result = createAllFailedResult();
      const { queryByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(queryByTestId('review-all-button')).toBeNull();
    });
  });

  describe('Error Message When All Files Fail (Requirement 7.7)', () => {
    it('displays prominent error message when all files fail', () => {
      const result = createAllFailedResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('all-files-failed-error')).toBeTruthy();
    });

    it('displays error icon in overall status when all files fail', () => {
      const result = createAllFailedResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const statusIcon = getByTestId('overall-status-icon');
      expect(statusIcon.props.children).toBe('❌');
    });

    it('displays error title in the error container', () => {
      const result = createAllFailedResult();
      const { getByText } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByText('fileImport.summary.errorTitle')).toBeTruthy();
    });

    it('displays error message explaining the failure', () => {
      const result = createAllFailedResult();
      const { getByText } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByText('fileImport.summary.errorMessage')).toBeTruthy();
    });

    it('displays troubleshooting suggestions title', () => {
      const result = createAllFailedResult();
      const { getByText } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByText('fileImport.summary.troubleshootingTitle')).toBeTruthy();
    });

    it('displays all four troubleshooting suggestions', () => {
      const result = createAllFailedResult();
      const { getByText } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByText('import.summary.troubleshooting.checkFileFormat')).toBeTruthy();
      expect(getByText('import.summary.troubleshooting.checkFileNotCorrupted')).toBeTruthy();
      expect(
        getByText('import.summary.troubleshooting.checkFileNotPasswordProtected')
      ).toBeTruthy();
      expect(getByText('import.summary.troubleshooting.tryDifferentFile')).toBeTruthy();
    });

    it('does not display error container when some files succeed', () => {
      const result = createPartialFailureResult();
      const { queryByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(queryByTestId('all-files-failed-error')).toBeNull();
    });

    it('does not display error container when all files succeed', () => {
      const { queryByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(queryByTestId('all-files-failed-error')).toBeNull();
    });

    it('does not display stats section when all files fail', () => {
      const result = createAllFailedResult();
      const { queryByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(queryByTestId('import-stats')).toBeNull();
    });

    it('still displays per-file results when all files fail', () => {
      const result = createAllFailedResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('file-results-list')).toBeTruthy();
      expect(getByTestId('file-result-failed1.xlsx')).toBeTruthy();
      expect(getByTestId('file-result-failed2.csv')).toBeTruthy();
    });
  });

  describe('Retry Failed Button', () => {
    it('displays Retry Failed button when there are failed files', () => {
      const result = createPartialFailureResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('retry-failed-button')).toBeTruthy();
    });

    it('calls onRetryFailed when Retry Failed button is pressed', () => {
      const result = createPartialFailureResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      fireEvent.press(getByTestId('retry-failed-button'));

      expect(mockOnRetryFailed).toHaveBeenCalledTimes(1);
    });

    it('does not display Retry Failed button when no files failed', () => {
      const { queryByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(queryByTestId('retry-failed-button')).toBeNull();
    });

    it('displays Retry Failed button when all files fail', () => {
      const result = createAllFailedResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('retry-failed-button')).toBeTruthy();
    });
  });

  describe('Close Button', () => {
    it('displays Close button', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      expect(getByTestId('close-button')).toBeTruthy();
    });

    it('calls onClose when Close button is pressed', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      fireEvent.press(getByTestId('close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessible Review All button', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      const reviewButton = getByTestId('review-all-button');
      expect(reviewButton.props.accessibilityRole).toBe('button');
      expect(reviewButton.props.accessibilityLabel).toBeTruthy();
    });

    it('has accessible Close button', () => {
      const { getByTestId } = render(<ImportSummary {...defaultProps} />);

      const closeButton = getByTestId('close-button');
      expect(closeButton.props.accessibilityRole).toBe('button');
      expect(closeButton.props.accessibilityLabel).toBeTruthy();
    });

    it('has accessible Retry Failed button', () => {
      const result = createPartialFailureResult();
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      const retryButton = getByTestId('retry-failed-button');
      expect(retryButton.props.accessibilityRole).toBe('button');
      expect(retryButton.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles single file success', () => {
      const result = createSuccessResult({
        fileResults: [createFileResult({ fileName: 'single.csv' })],
      });
      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('file-result-single.csv')).toBeTruthy();
    });

    it('handles single file failure', () => {
      const result: MultiFileImportResult = {
        success: false,
        fileResults: [
          createFileResult({
            fileName: 'single-failed.xlsx',
            success: false,
            transactionsImported: 0,
            error: { code: 'PARSE_ERROR', message: 'Parse error' },
          }),
        ],
        totalTransactionsImported: 0,
        totalDuplicatesInFile: 0,
        totalCrossFileDuplicates: 0,
        totalDatabaseDuplicates: 0,
        failedFiles: ['single-failed.xlsx'],
        batchGroupId: 'batch-single',
      };

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('all-files-failed-error')).toBeTruthy();
    });

    it('handles many files', () => {
      const fileResults = Array.from({ length: 10 }, (_, i) =>
        createFileResult({ fileName: `file${i + 1}.csv`, transactionsImported: 10 })
      );
      const result = createSuccessResult({
        fileResults,
        totalTransactionsImported: 100,
      });

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('file-results-list')).toBeTruthy();
      expect(getByTestId('total-transactions').props.children).toBe(100);
    });
  });

  describe('Varied Result Scenarios', () => {
    it('handles mixed file types (csv, xlsx, xls, ofx)', () => {
      const result = createSuccessResult({
        fileResults: [
          createFileResult({ fileName: 'bank-statement.csv', transactionsImported: 25 }),
          createFileResult({ fileName: 'credit-card.xlsx', transactionsImported: 30 }),
          createFileResult({ fileName: 'legacy-export.xls', transactionsImported: 15 }),
          createFileResult({ fileName: 'investment.ofx', transactionsImported: 10 }),
        ],
        totalTransactionsImported: 80,
      });

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('file-result-bank-statement.csv')).toBeTruthy();
      expect(getByTestId('file-result-credit-card.xlsx')).toBeTruthy();
      expect(getByTestId('file-result-legacy-export.xls')).toBeTruthy();
      expect(getByTestId('file-result-investment.ofx')).toBeTruthy();
      expect(getByTestId('total-transactions').props.children).toBe(80);
    });

    it('handles large transaction counts', () => {
      const result = createSuccessResult({
        totalTransactionsImported: 9999,
        totalDuplicatesInFile: 500,
        totalCrossFileDuplicates: 250,
        totalDatabaseDuplicates: 100,
      });

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('total-transactions').props.children).toBe(9999);
      expect(getByTestId('total-duplicates').props.children).toBe(850); // 500 + 250 + 100
    });

    it('handles only cross-file duplicates (no in-file or database)', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 0,
        totalCrossFileDuplicates: 15,
        totalDatabaseDuplicates: 0,
      });

      const { getByTestId, queryByTestId } = render(
        <ImportSummary {...defaultProps} result={result} />
      );

      expect(getByTestId('duplicate-breakdown')).toBeTruthy();
      expect(getByTestId('cross-file-duplicates').props.children).toBe(15);
      expect(queryByTestId('in-file-duplicates')).toBeNull();
      expect(queryByTestId('database-duplicates')).toBeNull();
    });

    it('handles only database duplicates (no in-file or cross-file)', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 0,
        totalCrossFileDuplicates: 0,
        totalDatabaseDuplicates: 8,
      });

      const { getByTestId, queryByTestId } = render(
        <ImportSummary {...defaultProps} result={result} />
      );

      expect(getByTestId('duplicate-breakdown')).toBeTruthy();
      expect(getByTestId('database-duplicates').props.children).toBe(8);
      expect(queryByTestId('in-file-duplicates')).toBeNull();
      expect(queryByTestId('cross-file-duplicates')).toBeNull();
    });

    it('hides duplicate breakdown when no duplicates exist', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 0,
        totalCrossFileDuplicates: 0,
        totalDatabaseDuplicates: 0,
      });

      const { queryByTestId, getByTestId } = render(
        <ImportSummary {...defaultProps} result={result} />
      );

      expect(getByTestId('total-duplicates').props.children).toBe(0);
      expect(queryByTestId('duplicate-breakdown')).toBeNull();
    });

    it('handles mixed success and failure with different error types', () => {
      const result: MultiFileImportResult = {
        success: true,
        fileResults: [
          createFileResult({
            fileName: 'good1.csv',
            success: true,
            transactionsImported: 50,
            duplicatesFound: 0,
          }),
          createFileResult({
            fileName: 'password-protected.xlsx',
            success: false,
            transactionsImported: 0,
            duplicatesFound: 0,
            error: { code: 'EXCEL_PASSWORD_PROTECTED', message: 'File is password protected' },
          }),
          createFileResult({
            fileName: 'good2.xlsx',
            success: true,
            transactionsImported: 30,
            duplicatesFound: 0,
          }),
          createFileResult({
            fileName: 'corrupted.xls',
            success: false,
            transactionsImported: 0,
            duplicatesFound: 0,
            error: { code: 'EXCEL_CORRUPTED', message: 'File appears to be corrupted' },
          }),
        ],
        totalTransactionsImported: 80,
        totalDuplicatesInFile: 0,
        totalCrossFileDuplicates: 0,
        totalDatabaseDuplicates: 0,
        failedFiles: ['password-protected.xlsx', 'corrupted.xls'],
        batchGroupId: 'batch-mixed',
      };

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      // Verify successful files (no duplicates = success icon)
      expect(getByTestId('file-status-icon-good1.csv').props.children).toBe('✅');
      expect(getByTestId('file-status-icon-good2.xlsx').props.children).toBe('✅');

      // Verify failed files with different errors
      expect(getByTestId('file-status-icon-password-protected.xlsx').props.children).toBe('❌');
      expect(getByTestId('file-status-text-password-protected.xlsx').props.children).toBe(
        'File is password protected'
      );
      expect(getByTestId('file-status-icon-corrupted.xls').props.children).toBe('❌');
      expect(getByTestId('file-status-text-corrupted.xls').props.children).toBe(
        'File appears to be corrupted'
      );

      // Both Review All and Retry Failed should be visible
      expect(getByTestId('review-all-button')).toBeTruthy();
      expect(getByTestId('retry-failed-button')).toBeTruthy();
    });

    it('handles files with varying duplicate counts', () => {
      const result = createSuccessResult({
        fileResults: [
          createFileResult({
            fileName: 'no-dupes.csv',
            duplicatesFound: 0,
            transactionsImported: 100,
          }),
          createFileResult({
            fileName: 'few-dupes.xlsx',
            duplicatesFound: 3,
            transactionsImported: 50,
          }),
          createFileResult({
            fileName: 'many-dupes.xls',
            duplicatesFound: 25,
            transactionsImported: 25,
          }),
        ],
        totalTransactionsImported: 175,
        totalDuplicatesInFile: 28,
      });

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      // No duplicates = success icon
      expect(getByTestId('file-status-icon-no-dupes.csv').props.children).toBe('✅');
      // With duplicates = warning icon
      expect(getByTestId('file-status-icon-few-dupes.xlsx').props.children).toBe('⚠️');
      expect(getByTestId('file-status-icon-many-dupes.xls').props.children).toBe('⚠️');
    });

    it('handles result with only in-file duplicates', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 12,
        totalCrossFileDuplicates: 0,
        totalDatabaseDuplicates: 0,
      });

      const { getByTestId, queryByTestId } = render(
        <ImportSummary {...defaultProps} result={result} />
      );

      expect(getByTestId('duplicate-breakdown')).toBeTruthy();
      expect(getByTestId('in-file-duplicates').props.children).toBe(12);
      expect(queryByTestId('cross-file-duplicates')).toBeNull();
      expect(queryByTestId('database-duplicates')).toBeNull();
    });

    it('handles all three types of duplicates simultaneously', () => {
      const result = createSuccessResult({
        totalDuplicatesInFile: 10,
        totalCrossFileDuplicates: 5,
        totalDatabaseDuplicates: 3,
      });

      const { getByTestId } = render(<ImportSummary {...defaultProps} result={result} />);

      expect(getByTestId('duplicate-breakdown')).toBeTruthy();
      expect(getByTestId('in-file-duplicates').props.children).toBe(10);
      expect(getByTestId('cross-file-duplicates').props.children).toBe(5);
      expect(getByTestId('database-duplicates').props.children).toBe(3);
      expect(getByTestId('total-duplicates').props.children).toBe(18);
    });
  });
});
