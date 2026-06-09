/**
 * FundCard Component Tests
 *
 * Tests for the FundCard component:
 * - Renders fund name, icon, and color indicator
 * - Displays formatted balance
 * - Shows allocation input with current value
 * - Calls onPress when card is tapped
 * - Calls onAllocationChange when input changes
 * - Shows expanded content when expanded is true
 * - Hides expanded content when expanded is false
 *
 * **Validates: Requirements 5.7, 6.1, 7.4, 15.2**
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FundCard } from '../../components/future-plans/FundCard';
import { useThemeStore } from '../../stores/themeStore';
import type { FundWithBalance } from '../../types/fund';
import { Text } from 'react-native';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'futurePlans.funds.allocation': 'Monthly allocation',
        'futurePlans.funds.balance': 'Accumulated balance',
        'common.expand': 'Expand',
        'common.collapse': 'Collapse',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  getCurrentLocale: () => 'pt-BR',
}));

describe('FundCard', () => {
  const baseFund: FundWithBalance = {
    id: 'fund-1',
    name: 'Travel Fund',
    icon: '✈️',
    color: '#3B82F6',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    totalBalance: 500000, // R$ 5,000.00
    monthlyAllocation: 100000, // R$ 1,000.00
  };

  const defaultProps = {
    fund: baseFund,
    onAllocationChange: jest.fn(),
    onPress: jest.fn(),
    expanded: false,
    testID: 'fund-card',
  };

  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('displays fund name', () => {
      render(<FundCard {...defaultProps} />);

      expect(screen.getByText('Travel Fund')).toBeTruthy();
    });

    it('displays fund icon when set', () => {
      render(<FundCard {...defaultProps} />);

      expect(screen.getByTestId('fund-card-icon')).toBeTruthy();
      expect(screen.getByText('✈️')).toBeTruthy();
    });

    it('does not display icon when null', () => {
      const fundNoIcon = { ...baseFund, icon: null };
      render(<FundCard {...defaultProps} fund={fundNoIcon} />);

      expect(screen.queryByTestId('fund-card-icon')).toBeNull();
    });

    it('displays color indicator when color is set', () => {
      render(<FundCard {...defaultProps} />);

      expect(screen.getByTestId('fund-card-color')).toBeTruthy();
    });

    it('does not display color indicator when null', () => {
      const fundNoColor = { ...baseFund, color: null };
      render(<FundCard {...defaultProps} fund={fundNoColor} />);

      expect(screen.queryByTestId('fund-card-color')).toBeNull();
    });

    it('displays formatted total balance', () => {
      render(<FundCard {...defaultProps} />);

      // 500000 cents / 100 = 5000.00
      expect(screen.getByText('R$ 5000.00')).toBeTruthy();
    });

    it('displays allocation input with current value', () => {
      render(<FundCard {...defaultProps} />);

      const input = screen.getByTestId('fund-card-allocation-input');
      // 100000 cents / 100 = 1000
      expect(input.props.value).toBe('1000');
    });

    it('displays empty allocation input when allocation is zero', () => {
      const fundNoAllocation = { ...baseFund, monthlyAllocation: 0 };
      render(<FundCard {...defaultProps} fund={fundNoAllocation} />);

      const input = screen.getByTestId('fund-card-allocation-input');
      expect(input.props.value).toBe('');
    });
  });

  describe('interactions', () => {
    it('calls onPress with fund id when card is tapped', () => {
      render(<FundCard {...defaultProps} />);

      fireEvent.press(screen.getByTestId('fund-card'));
      expect(defaultProps.onPress).toHaveBeenCalledWith('fund-1');
    });

    it('calls onAllocationChange with fund id and value when input changes', () => {
      render(<FundCard {...defaultProps} />);

      const input = screen.getByTestId('fund-card-allocation-input');
      fireEvent.changeText(input, '1500');
      expect(defaultProps.onAllocationChange).toHaveBeenCalledWith('fund-1', '1500');
    });
  });

  describe('expand/collapse', () => {
    it('shows down arrow when collapsed', () => {
      render(<FundCard {...defaultProps} expanded={false} />);

      expect(screen.getByText('▼')).toBeTruthy();
    });

    it('shows up arrow when expanded', () => {
      render(<FundCard {...defaultProps} expanded={true} />);

      expect(screen.getByText('▲')).toBeTruthy();
    });

    it('renders children when expanded', () => {
      render(
        <FundCard {...defaultProps} expanded={true}>
          <Text testID="child-content">Transaction list</Text>
        </FundCard>
      );

      expect(screen.getByTestId('child-content')).toBeTruthy();
    });

    it('does not render children when collapsed', () => {
      render(
        <FundCard {...defaultProps} expanded={false}>
          <Text testID="child-content">Transaction list</Text>
        </FundCard>
      );

      expect(screen.queryByTestId('child-content')).toBeNull();
    });
  });

  describe('labels', () => {
    it('displays allocation label', () => {
      render(<FundCard {...defaultProps} />);

      expect(screen.getByText('Monthly allocation')).toBeTruthy();
    });

    it('displays balance label', () => {
      render(<FundCard {...defaultProps} />);

      expect(screen.getByText('Accumulated balance')).toBeTruthy();
    });
  });
});
