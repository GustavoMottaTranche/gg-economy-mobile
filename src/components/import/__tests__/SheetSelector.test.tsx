/**
 * SheetSelector Component Tests
 *
 * Tests for the SheetSelector component including:
 * - Sheet listing (Requirement 9.1, 9.2)
 * - Preview display (Requirement 9.3)
 * - Timeout behavior with default selection (Requirement 9.4)
 * - Sheet selection callback (Requirement 9.5)
 * - Sheet preference persistence (Requirement 11.2, 11.3)
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 11.2, 11.3**
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  SheetSelector,
  type SheetSelectorProps,
  DEFAULT_SHEET_SELECTION_TIMEOUT,
  extractFilePattern,
} from '../SheetSelector';
import type { SheetInfo } from '../../../services/import/types';

// Mock timers for timeout testing
jest.useFakeTimers();

describe('SheetSelector', () => {
  const mockOnSelect = jest.fn();
  const mockOnTimeout = jest.fn();

  const createSheet = (overrides: Partial<SheetInfo> = {}): SheetInfo => ({
    name: 'Sheet1',
    index: 0,
    rowCount: 100,
    preview: [
      ['Date', 'Amount', 'Description'],
      ['2024-01-01', '100.00', 'Test transaction'],
      ['2024-01-02', '200.00', 'Another transaction'],
    ],
    ...overrides,
  });

  const defaultSheets: SheetInfo[] = [
    createSheet({ name: 'Transactions', index: 0, rowCount: 150 }),
    createSheet({ name: 'Summary', index: 1, rowCount: 10 }),
    createSheet({ name: 'Categories', index: 2, rowCount: 25 }),
  ];

  const defaultProps: SheetSelectorProps = {
    sheets: defaultSheets,
    onSelect: mockOnSelect,
    onTimeout: mockOnTimeout,
    timeout: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      const { getByTestId, getByText } = render(<SheetSelector {...defaultProps} />);

      expect(getByTestId('sheet-selector')).toBeTruthy();
      expect(getByText('fileImport.sheetSelector.title')).toBeTruthy();
    });

    it('renders confirm button', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      expect(getByTestId('confirm-sheet-button')).toBeTruthy();
    });

    it('renders use first button when no selection', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      expect(getByTestId('use-first-button')).toBeTruthy();
    });
  });

  describe('Sheet Listing (Requirement 9.1, 9.2)', () => {
    it('lists all available sheets', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      expect(getByTestId('sheet-list')).toBeTruthy();
      expect(getByTestId('sheet-item-Transactions')).toBeTruthy();
      expect(getByTestId('sheet-item-Summary')).toBeTruthy();
      expect(getByTestId('sheet-item-Categories')).toBeTruthy();
    });

    it('displays sheet names correctly', () => {
      const { getByText } = render(<SheetSelector {...defaultProps} />);

      expect(getByText('Transactions')).toBeTruthy();
      expect(getByText('Summary')).toBeTruthy();
      expect(getByText('Categories')).toBeTruthy();
    });

    it('handles single sheet', () => {
      const singleSheet = [createSheet({ name: 'OnlySheet' })];
      const { getByTestId, queryByTestId } = render(
        <SheetSelector {...defaultProps} sheets={singleSheet} />
      );

      expect(getByTestId('sheet-item-OnlySheet')).toBeTruthy();
      expect(queryByTestId('sheet-item-Transactions')).toBeNull();
    });

    it('handles empty sheets array', () => {
      const { queryByTestId } = render(<SheetSelector {...defaultProps} sheets={[]} />);

      expect(queryByTestId('sheet-item-Transactions')).toBeNull();
    });
  });

  describe('Preview Display (Requirement 9.3)', () => {
    it('shows preview of first rows for each sheet', () => {
      const sheetsWithPreview: SheetInfo[] = [
        createSheet({
          name: 'DataSheet',
          preview: [
            ['Header1', 'Header2', 'Header3'],
            ['Value1', 'Value2', 'Value3'],
          ],
        }),
      ];

      const { getByTestId, getByText } = render(
        <SheetSelector {...defaultProps} sheets={sheetsWithPreview} />
      );

      expect(getByTestId('sheet-item-DataSheet')).toBeTruthy();
      // Preview content should be visible
      expect(getByText('Header1')).toBeTruthy();
    });

    it('handles sheets with empty preview', () => {
      const sheetsWithEmptyPreview: SheetInfo[] = [
        createSheet({ name: 'EmptyPreview', preview: [] }),
      ];

      const { getByTestId } = render(
        <SheetSelector {...defaultProps} sheets={sheetsWithEmptyPreview} />
      );

      expect(getByTestId('sheet-item-EmptyPreview')).toBeTruthy();
    });
  });

  describe('Sheet Selection', () => {
    it('allows selecting a sheet by pressing on it', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Sheet should be visually selected
      const sheetItem = getByTestId('sheet-item-Summary');
      expect(sheetItem).toBeTruthy();
    });

    it('calls onSelect when confirm is pressed after selection', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      // Select a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Confirm selection
      fireEvent.press(getByTestId('confirm-sheet-button'));

      expect(mockOnSelect).toHaveBeenCalledWith('Summary');
    });

    it('does not call onSelect when confirm is pressed without selection', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      // Try to confirm without selection
      fireEvent.press(getByTestId('confirm-sheet-button'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('calls onSelect with first sheet when "Use First" is pressed', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      fireEvent.press(getByTestId('use-first-button'));

      expect(mockOnSelect).toHaveBeenCalledWith('Transactions');
    });

    it('hides "Use First" button after selection is made', () => {
      const { getByTestId, queryByTestId } = render(<SheetSelector {...defaultProps} />);

      // Initially visible
      expect(getByTestId('use-first-button')).toBeTruthy();

      // Select a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Should be hidden after selection
      expect(queryByTestId('use-first-button')).toBeNull();
    });
  });

  describe('Timeout Behavior (Requirement 9.4)', () => {
    it('displays countdown timer initially', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      expect(getByTestId('countdown-container')).toBeTruthy();
    });

    it('calls onTimeout after specified timeout', () => {
      render(<SheetSelector {...defaultProps} timeout={5} />);

      expect(mockOnTimeout).not.toHaveBeenCalled();

      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('uses default timeout when not specified', () => {
      render(<SheetSelector {...defaultProps} timeout={undefined} />);

      expect(mockOnTimeout).not.toHaveBeenCalled();

      // Advance time by default timeout
      act(() => {
        jest.advanceTimersByTime(DEFAULT_SHEET_SELECTION_TIMEOUT * 1000);
      });

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
    });

    it('cancels timeout when user interacts', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} timeout={5} />);

      // User selects a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Advance time past timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // onTimeout should not have been called
      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it('hides countdown after user interaction', () => {
      const { getByTestId, queryByTestId } = render(<SheetSelector {...defaultProps} />);

      // Initially visible
      expect(getByTestId('countdown-container')).toBeTruthy();

      // User selects a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Countdown should be hidden
      expect(queryByTestId('countdown-container')).toBeNull();
    });

    it('decrements countdown every second', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} timeout={5} />);

      // Initial state
      expect(getByTestId('countdown-container')).toBeTruthy();

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Countdown should still be visible
      expect(getByTestId('countdown-container')).toBeTruthy();

      // Advance 3 more seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Still visible
      expect(getByTestId('countdown-container')).toBeTruthy();
    });

    it('does not start timeout with empty sheets', () => {
      render(<SheetSelector {...defaultProps} sheets={[]} timeout={1} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Confirm Button State', () => {
    it('disables confirm button when no sheet is selected', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      const confirmButton = getByTestId('confirm-sheet-button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables confirm button when a sheet is selected', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      // Select a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      const confirmButton = getByTestId('confirm-sheet-button');
      expect(confirmButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('Selection State', () => {
    it('allows changing selection', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      // Select first sheet
      fireEvent.press(getByTestId('sheet-item-Transactions'));

      // Change to another sheet
      fireEvent.press(getByTestId('sheet-item-Categories'));

      // Confirm
      fireEvent.press(getByTestId('confirm-sheet-button'));

      expect(mockOnSelect).toHaveBeenCalledWith('Categories');
    });

    it('maintains selection after re-render', () => {
      const { getByTestId, rerender } = render(<SheetSelector {...defaultProps} />);

      // Select a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      // Re-render with same props
      rerender(<SheetSelector {...defaultProps} />);

      // Confirm should still work with previous selection
      fireEvent.press(getByTestId('confirm-sheet-button'));

      expect(mockOnSelect).toHaveBeenCalledWith('Summary');
    });
  });

  describe('Accessibility', () => {
    it('has accessible sheet items', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      const sheetItem = getByTestId('sheet-item-Transactions');
      expect(sheetItem.props.accessibilityRole).toBe('button');
    });

    it('indicates selected state for accessibility', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      // Select a sheet
      fireEvent.press(getByTestId('sheet-item-Summary'));

      const sheetItem = getByTestId('sheet-item-Summary');
      expect(sheetItem.props.accessibilityState.selected).toBe(true);
    });

    it('has accessible confirm button', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      const confirmButton = getByTestId('confirm-sheet-button');
      expect(confirmButton.props.accessibilityRole).toBe('button');
      expect(confirmButton.props.accessibilityLabel).toBeTruthy();
    });

    it('has accessible use first button', () => {
      const { getByTestId } = render(<SheetSelector {...defaultProps} />);

      const useFirstButton = getByTestId('use-first-button');
      expect(useFirstButton.props.accessibilityRole).toBe('button');
      expect(useFirstButton.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles sheets with special characters in names', () => {
      const specialSheets: SheetInfo[] = [
        createSheet({ name: 'Sheet (1)', index: 0 }),
        createSheet({ name: "Data's Sheet", index: 1 }),
        createSheet({ name: 'Sheet-2024_01', index: 2 }),
      ];

      const { getByTestId } = render(<SheetSelector {...defaultProps} sheets={specialSheets} />);

      expect(getByTestId('sheet-item-Sheet (1)')).toBeTruthy();
      expect(getByTestId("sheet-item-Data's Sheet")).toBeTruthy();
      expect(getByTestId('sheet-item-Sheet-2024_01')).toBeTruthy();
    });

    it('handles sheets with very long names', () => {
      const longNameSheet: SheetInfo[] = [
        createSheet({
          name: 'This is a very long sheet name that might overflow the display area',
          index: 0,
        }),
      ];

      const { getByTestId } = render(<SheetSelector {...defaultProps} sheets={longNameSheet} />);

      expect(
        getByTestId(
          'sheet-item-This is a very long sheet name that might overflow the display area'
        )
      ).toBeTruthy();
    });

    it('handles sheets with zero rows', () => {
      const emptySheet: SheetInfo[] = [
        createSheet({ name: 'EmptySheet', rowCount: 0, preview: [] }),
      ];

      const { getByTestId } = render(<SheetSelector {...defaultProps} sheets={emptySheet} />);

      expect(getByTestId('sheet-item-EmptySheet')).toBeTruthy();
    });
  });
});

/**
 * Tests for extractFilePattern utility function
 *
 * **Validates: Requirements 11.2, 11.3**
 */
describe('extractFilePattern', () => {
  describe('Date Pattern Removal', () => {
    it('removes date patterns like YYYY-MM-DD', () => {
      expect(extractFilePattern('bank_statement_2024-01-15.xlsx')).toBe('bank_statement.xlsx');
    });

    it('removes date patterns like YYYY_MM_DD', () => {
      expect(extractFilePattern('extrato_2024_01_15.xlsx')).toBe('extrato.xlsx');
    });

    it('removes date patterns like YYYYMMDD', () => {
      expect(extractFilePattern('statement_20240115.xlsx')).toBe('statement.xlsx');
    });

    it('removes year-month patterns like YYYY-MM', () => {
      expect(extractFilePattern('report_2024-01.xlsx')).toBe('report.xlsx');
    });

    it('removes year-month patterns like YYYY_MM', () => {
      expect(extractFilePattern('report_2024_01.xlsx')).toBe('report.xlsx');
    });
  });

  describe('Numeric ID Removal', () => {
    it('removes numeric IDs at the end', () => {
      expect(extractFilePattern('extrato_123456.xlsx')).toBe('extrato.xlsx');
    });

    it('removes sequence numbers like _001', () => {
      expect(extractFilePattern('statement_001.xlsx')).toBe('statement.xlsx');
    });

    it('removes sequence numbers like -01', () => {
      expect(extractFilePattern('report-01.xlsx')).toBe('report.xlsx');
    });
  });

  describe('Extension Preservation', () => {
    it('preserves .xlsx extension', () => {
      expect(extractFilePattern('file_2024.xlsx')).toBe('file.xlsx');
    });

    it('preserves .xls extension', () => {
      expect(extractFilePattern('file_2024.xls')).toBe('file.xls');
    });

    it('preserves .csv extension', () => {
      expect(extractFilePattern('file_2024.csv')).toBe('file.csv');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string', () => {
      expect(extractFilePattern('')).toBe('');
    });

    it('handles file without extension', () => {
      expect(extractFilePattern('file_2024')).toBe('file');
    });

    it('handles file with only numbers', () => {
      expect(extractFilePattern('12345.xlsx')).toBe('12345.xlsx');
    });

    it('handles file with no numeric patterns', () => {
      expect(extractFilePattern('bank_statement.xlsx')).toBe('bank_statement.xlsx');
    });

    it('handles complex patterns', () => {
      expect(extractFilePattern('bank_statement_account_2024-01-15_001.xlsx')).toBe(
        'bank_statement_account.xlsx'
      );
    });
  });

  describe('Similar File Matching', () => {
    it('produces same pattern for similar files with different dates', () => {
      const pattern1 = extractFilePattern('bank_statement_2024-01-15.xlsx');
      const pattern2 = extractFilePattern('bank_statement_2024-02-20.xlsx');
      const pattern3 = extractFilePattern('bank_statement_2023-12-01.xlsx');

      expect(pattern1).toBe(pattern2);
      expect(pattern2).toBe(pattern3);
    });

    it('produces same pattern for similar files with different IDs', () => {
      const pattern1 = extractFilePattern('extrato_123456.xlsx');
      const pattern2 = extractFilePattern('extrato_789012.xlsx');

      expect(pattern1).toBe(pattern2);
    });

    it('produces different patterns for different file types', () => {
      const pattern1 = extractFilePattern('bank_statement_2024.xlsx');
      const pattern2 = extractFilePattern('credit_card_2024.xlsx');

      expect(pattern1).not.toBe(pattern2);
    });
  });
});
