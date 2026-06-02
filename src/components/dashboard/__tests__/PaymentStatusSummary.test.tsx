/**
 * PaymentStatusSummary Component Tests
 *
 * Tests for the PaymentStatusSummary component including:
 * - Hiding when predictedTotal equals zero (returns null)
 * - Rendering values when predictedTotal > 0
 * - Green color for paid total
 * - Orange/warning color for pending total
 *
 * **Validates: Requirements 5.3, 5.6**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaymentStatusSummary } from '../PaymentStatusSummary';
import { useThemeStore } from '../../../stores/themeStore';

// Mock i18n module
jest.mock('../../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) => `R$ ${amount.toFixed(2)}`,
  getCurrentLocale: () => 'pt-BR',
}));

describe('PaymentStatusSummary', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('visibility', () => {
    it('returns null when predictedTotal is 0', () => {
      const { toJSON } = render(
        <PaymentStatusSummary
          predictedTotal={0}
          paidTotal={0}
          pendingTotal={0}
          testID="payment-summary"
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('renders the section when predictedTotal > 0', () => {
      const { getByTestId } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      expect(getByTestId('payment-summary')).toBeTruthy();
    });
  });

  describe('content rendering', () => {
    it('displays the section title', () => {
      const { getByText } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      expect(getByText('Previsto vs. Pago')).toBeTruthy();
    });

    it('displays predicted, paid, and pending rows', () => {
      const { getByTestId } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      expect(getByTestId('payment-summary-predicted')).toBeTruthy();
      expect(getByTestId('payment-summary-paid')).toBeTruthy();
      expect(getByTestId('payment-summary-pending')).toBeTruthy();
    });

    it('displays formatted currency values', () => {
      const { getByText } = render(
        <PaymentStatusSummary
          predictedTotal={150000}
          paidTotal={80000}
          pendingTotal={70000}
          testID="payment-summary"
        />
      );

      // Values are divided by 100 before formatting
      expect(getByText('R$ 1500.00')).toBeTruthy();
      expect(getByText('R$ 800.00')).toBeTruthy();
      expect(getByText('R$ 700.00')).toBeTruthy();
    });

    it('displays labels for each row', () => {
      const { getByText } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      expect(getByText('Previsto')).toBeTruthy();
      expect(getByText('Pago')).toBeTruthy();
      expect(getByText('Pendente')).toBeTruthy();
    });
  });

  describe('colors', () => {
    it('uses green (success) color for paid value', () => {
      const { getByText } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      const paidValue = getByText('R$ 600.00');
      const flatStyle = Array.isArray(paidValue.props.style)
        ? Object.assign({}, ...paidValue.props.style.filter(Boolean))
        : paidValue.props.style;
      // Light mode success.base = '#16A34A'
      expect(flatStyle.color).toBe('#16A34A');
    });

    it('uses orange (warning) color for pending value', () => {
      const { getByText } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      const pendingValue = getByText('R$ 400.00');
      const flatStyle = Array.isArray(pendingValue.props.style)
        ? Object.assign({}, ...pendingValue.props.style.filter(Boolean))
        : pendingValue.props.style;
      // Light mode warning.base = '#D97706'
      expect(flatStyle.color).toBe('#D97706');
    });
  });

  describe('accessibility', () => {
    it('has summary accessibility role', () => {
      const { getByTestId } = render(
        <PaymentStatusSummary
          predictedTotal={100000}
          paidTotal={60000}
          pendingTotal={40000}
          testID="payment-summary"
        />
      );

      const container = getByTestId('payment-summary');
      expect(container.props.accessibilityRole).toBe('summary');
    });
  });
});
