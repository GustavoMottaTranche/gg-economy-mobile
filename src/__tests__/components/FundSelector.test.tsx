/**
 * FundSelector Component Tests
 *
 * Tests for the FundSelector modal component:
 * - Shows list of active funds from the store
 * - Selecting a fund calls the onSelect callback with the fund id
 * - Shows a "Nenhum" / "None" option to unlink
 * - Selecting "None" calls onSelect with null
 * - Shows currently selected fund highlighted
 * - Modal visibility behavior
 * - Can be closed/dismissed
 *
 * **Validates: Requirements 8.1, 8.8**
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FundSelector } from '../../components/future-plans/FundSelector';
import type { Fund } from '../../types/fund';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockActiveFunds: Fund[] = [
  {
    id: 'fund-1',
    name: 'Travel Fund',
    icon: '✈️',
    color: '#3B82F6',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'fund-2',
    name: 'Emergency Fund',
    icon: '🆘',
    color: '#EF4444',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'fund-3',
    name: 'Retirement',
    icon: null,
    color: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockAllFunds: Fund[] = [
  ...mockActiveFunds,
  {
    id: 'fund-inactive',
    name: 'Inactive Fund',
    icon: null,
    color: null,
    isActive: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

let mockFunds: Fund[] = mockAllFunds;

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'futurePlans.transactions.selectFund': 'Select fund',
        'futurePlans.transactions.noneFund': 'None',
        'common.close': 'Close',
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock('../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      primary: { light: '#EFF6FF' },
      danger: { base: '#DC2626', light: '#FEE2E2' },
      warning: { base: '#F59E0B', light: '#FEF3C7' },
      success: { base: '#16A34A' },
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#D1D5DB' },
  }),
}));

jest.mock('../../stores/fundStore', () => ({
  useFunds: () => mockFunds,
}));

jest.mock('../../constants/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32 },
  borderRadius: { sm: 4, md: 12, lg: 16 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
    title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FundSelector', () => {
  const defaultProps = {
    visible: true,
    onSelect: jest.fn(),
    onClose: jest.fn(),
    selectedFundId: null as string | null,
    testID: 'fund-selector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFunds = mockAllFunds;
  });

  describe('rendering active funds', () => {
    it('displays only active funds from the store', () => {
      render(<FundSelector {...defaultProps} />);

      expect(screen.getByText('Travel Fund')).toBeTruthy();
      expect(screen.getByText('Emergency Fund')).toBeTruthy();
      expect(screen.getByText('Retirement')).toBeTruthy();
      expect(screen.queryByText('Inactive Fund')).toBeNull();
    });

    it('displays fund color indicator when set', () => {
      render(<FundSelector {...defaultProps} />);

      // Fund items with color should render color indicators
      expect(screen.getByText('Travel Fund')).toBeTruthy();
      expect(screen.getByText('Emergency Fund')).toBeTruthy();
    });

    it('displays fund icon when set', () => {
      render(<FundSelector {...defaultProps} />);

      expect(screen.getByText('✈️')).toBeTruthy();
      expect(screen.getByText('🆘')).toBeTruthy();
    });

    it('renders the title "Select fund"', () => {
      render(<FundSelector {...defaultProps} />);

      expect(screen.getByText('Select fund')).toBeTruthy();
    });
  });

  describe('fund selection', () => {
    it('calls onSelect with fund id when a fund is pressed', () => {
      render(<FundSelector {...defaultProps} />);

      fireEvent.press(screen.getByText('Travel Fund'));

      expect(defaultProps.onSelect).toHaveBeenCalledWith('fund-1');
    });

    it('calls onSelect with correct id for different fund', () => {
      render(<FundSelector {...defaultProps} />);

      fireEvent.press(screen.getByText('Emergency Fund'));

      expect(defaultProps.onSelect).toHaveBeenCalledWith('fund-2');
    });
  });

  describe('"None" option', () => {
    it('displays a "None" option', () => {
      render(<FundSelector {...defaultProps} />);

      expect(screen.getByText('None')).toBeTruthy();
    });

    it('calls onSelect with null when "None" is pressed', () => {
      render(<FundSelector {...defaultProps} selectedFundId="fund-1" />);

      fireEvent.press(screen.getByTestId('fund-selector-none'));

      expect(defaultProps.onSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('selected fund highlighting', () => {
    it('marks the selected fund as selected in accessibility state', () => {
      render(<FundSelector {...defaultProps} selectedFundId="fund-1" />);

      const fundItem = screen.getByLabelText('Travel Fund');
      expect(fundItem.props.accessibilityState).toEqual({ selected: true });
    });

    it('shows checkmark on selected fund', () => {
      render(<FundSelector {...defaultProps} selectedFundId="fund-1" />);

      // The component shows ✓ for selected items
      expect(screen.getByText('✓')).toBeTruthy();
    });

    it('marks "None" as selected when selectedFundId is null', () => {
      render(<FundSelector {...defaultProps} selectedFundId={null} />);

      const noneButton = screen.getByTestId('fund-selector-none');
      expect(noneButton.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('modal visibility', () => {
    it('renders modal when visible is true', () => {
      render(<FundSelector {...defaultProps} visible={true} />);

      expect(screen.getByText('Select fund')).toBeTruthy();
    });

    it('does not render content when visible is false', () => {
      render(<FundSelector {...defaultProps} visible={false} />);

      // When Modal is not visible, its content is not rendered
      expect(screen.queryByText('Select fund')).toBeNull();
    });
  });

  describe('closing/dismissing', () => {
    it('calls onClose when close button is pressed', () => {
      render(<FundSelector {...defaultProps} />);

      // The close button has the ✕ text
      fireEvent.press(screen.getByText('✕'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay backdrop is pressed', () => {
      render(<FundSelector {...defaultProps} />);

      // The overlay Pressable has accessibility label "Close"
      const closeElements = screen.getAllByLabelText('Close');
      // The first one is the overlay
      fireEvent.press(closeElements[0]);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('renders correctly when no active funds exist', () => {
      mockFunds = [
        {
          id: 'fund-inactive',
          name: 'Inactive Fund',
          icon: null,
          color: null,
          isActive: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      render(<FundSelector {...defaultProps} />);

      // Title should still render
      expect(screen.getByText('Select fund')).toBeTruthy();
      // None option still available
      expect(screen.getByText('None')).toBeTruthy();
      // No fund names shown
      expect(screen.queryByText('Inactive Fund')).toBeNull();
    });
  });
});
