/**
 * AmountDisplay Component Tests
 *
 * Tests for the AmountDisplay component including:
 * - Locale-aware formatting
 * - Positive/negative styling
 * - Size variants
 * - Accessibility support
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  AmountDisplay,
  IncomeAmount,
  ExpenseAmount,
  BalanceAmount,
  type AmountDisplayProps,
} from '../AmountDisplay';

// Mock i18n
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: jest.fn(
    (amount: number, locale: string, options?: { showPositiveSign?: boolean }) => {
      const formatted = `$${Math.abs(amount).toFixed(2)}`;
      if (options?.showPositiveSign && amount > 0) {
        return `+${formatted}`;
      }
      return amount < 0 ? `-${formatted}` : formatted;
    }
  ),
  getCurrentLocale: jest.fn(() => 'en'),
  getCurrencySymbol: jest.fn(() => '$'),
}));

describe('AmountDisplay', () => {
  const defaultProps: AmountDisplayProps = {
    amount: -5000, // -$50.00 in cents
  };

  it('renders formatted amount for negative value', () => {
    const { getByText } = render(<AmountDisplay {...defaultProps} />);
    expect(getByText('-$50.00')).toBeTruthy();
  });

  it('renders formatted amount for positive value', () => {
    const { getByText } = render(<AmountDisplay amount={10000} />);
    expect(getByText('$100.00')).toBeTruthy();
  });

  it('renders zero amount', () => {
    const { getByText } = render(<AmountDisplay amount={0} />);
    expect(getByText('$0.00')).toBeTruthy();
  });

  it('shows positive sign when showSign is true', () => {
    const { getByText } = render(<AmountDisplay amount={5000} showSign />);
    expect(getByText('+$50.00')).toBeTruthy();
  });

  it('converts from cents by default', () => {
    const { getByText } = render(<AmountDisplay amount={12345} />);
    expect(getByText('$123.45')).toBeTruthy();
  });

  it('does not convert when inCents is false', () => {
    const { getByText } = render(<AmountDisplay amount={50} inCents={false} />);
    expect(getByText('$50.00')).toBeTruthy();
  });

  describe('color variants', () => {
    it('uses green color for positive amounts with auto variant', () => {
      const { getByTestId } = render(
        <AmountDisplay amount={5000} colorVariant="auto" testID="amount" />
      );
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#166534' })])
      );
    });

    it('uses red color for negative amounts with auto variant', () => {
      const { getByTestId } = render(
        <AmountDisplay amount={-5000} colorVariant="auto" testID="amount" />
      );
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#991b1b' })])
      );
    });

    it('uses neutral color when colorVariant is neutral', () => {
      const { getByTestId } = render(
        <AmountDisplay amount={5000} colorVariant="neutral" testID="amount" />
      );
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#374151' })])
      );
    });

    it('forces positive color when colorVariant is positive', () => {
      const { getByTestId } = render(
        <AmountDisplay amount={-5000} colorVariant="positive" testID="amount" />
      );
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#166534' })])
      );
    });

    it('forces negative color when colorVariant is negative', () => {
      const { getByTestId } = render(
        <AmountDisplay amount={5000} colorVariant="negative" testID="amount" />
      );
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#991b1b' })])
      );
    });
  });

  describe('size variants', () => {
    it('applies small font size', () => {
      const { getByTestId } = render(<AmountDisplay amount={5000} size="small" testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 14 })])
      );
    });

    it('applies medium font size', () => {
      const { getByTestId } = render(<AmountDisplay amount={5000} size="medium" testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 16 })])
      );
    });

    it('applies large font size', () => {
      const { getByTestId } = render(<AmountDisplay amount={5000} size="large" testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 20 })])
      );
    });

    it('applies xlarge font size', () => {
      const { getByTestId } = render(<AmountDisplay amount={5000} size="xlarge" testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 28 })])
      );
    });
  });

  it('applies strikethrough style when strikethrough is true', () => {
    const { getByTestId } = render(<AmountDisplay amount={5000} strikethrough testID="amount" />);
    const text = getByTestId('amount-text');
    expect(text.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDecorationLine: 'line-through' })])
    );
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 10 };
    const { getByTestId } = render(
      <AmountDisplay amount={5000} style={customStyle} testID="amount" />
    );
    const text = getByTestId('amount-text');
    expect(text.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<AmountDisplay amount={5000} testID="amount" />);
    // Should include type and amount
    expect(getByLabelText(/dashboard\.income.*\$.*50/)).toBeTruthy();
  });

  describe('convenience components', () => {
    it('IncomeAmount uses positive color', () => {
      const { getByTestId } = render(<IncomeAmount amount={-5000} testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#166534' })])
      );
    });

    it('ExpenseAmount uses negative color', () => {
      const { getByTestId } = render(<ExpenseAmount amount={5000} testID="amount" />);
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#991b1b' })])
      );
    });

    it('BalanceAmount shows sign and uses auto color', () => {
      const { getByText, getByTestId } = render(<BalanceAmount amount={5000} testID="amount" />);
      expect(getByText('+$50.00')).toBeTruthy();
      const text = getByTestId('amount-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#166534' })])
      );
    });
  });
});
