/**
 * CategoryPaymentSummary Component Tests
 *
 * Tests for the CategoryPaymentSummary component including:
 * - Rendering paid total with formatted currency value (green color)
 * - Rendering pending total with formatted currency value (orange color)
 * - Rendering predicted total with formatted currency value
 * - Returns null when grandTotal is 0 (component is hidden)
 * - Accessibility attributes (accessibilityRole="summary", accessibilityLabel)
 * - Uses correct colors: semantic.success.base for paid, semantic.warning.base for pending
 *
 * **Validates: Requirements 3.1, 3.5, 3.6, 3.7**
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CategoryPaymentSummary } from '../category/CategoryPaymentSummary';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'categoryDetail.paid': 'Pago',
        'categoryDetail.pending': 'Pendente',
        'categoryDetail.predictedTotal': 'Total previsto',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock i18n formatters
jest.mock('../../i18n', () => ({
  formatCurrencyLocale: (amount: number, _locale: string) =>
    `R$ ${amount.toFixed(2).replace('.', ',')}`,
  getCurrentLocale: () => 'pt-BR',
}));

// Mock useThemeColors
jest.mock('../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { primary: '#FFFFFF', secondary: '#F5F5F7', tertiary: '#EBEBF0' },
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB' },
    semantic: {
      success: { light: '#DCFCE7', base: '#16A34A', dark: '#166534' },
      warning: { light: '#FEF3C7', base: '#D97706', dark: '#92400E' },
      danger: { light: '#FEE2E2', base: '#DC2626', dark: '#991B1B' },
    },
    surface: { card: '#FFFFFF', elevated: '#FFFFFF', overlay: 'rgba(0,0,0,0.5)' },
    interactive: { primary: '#3B82F6', primaryPressed: '#2563EB', disabled: '#D1D5DB' },
  }),
}));

describe('CategoryPaymentSummary', () => {
  const defaultProps = {
    paidTotal: 150000, // R$ 1.500,00
    pendingTotal: 50000, // R$ 500,00
    grandTotal: 200000, // R$ 2.000,00
    testID: 'payment-summary',
  };

  describe('rendering paid total', () => {
    it('displays paid total with formatted currency value', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      // 150000 cents / 100 = 1500.00 → "R$ 1500,00"
      expect(screen.getByText('R$ 1500,00')).toBeTruthy();
    });

    it('displays "Pago" label', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      expect(screen.getByText('Pago')).toBeTruthy();
    });

    it('uses green (semantic.success.base) color for paid label', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const paidLabel = screen.getByText('Pago');
      const flatStyle = Array.isArray(paidLabel.props.style)
        ? Object.assign({}, ...paidLabel.props.style)
        : paidLabel.props.style;
      expect(flatStyle.color).toBe('#16A34A');
    });

    it('uses green (semantic.success.base) color for paid amount', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const paidAmount = screen.getByText('R$ 1500,00');
      const flatStyle = Array.isArray(paidAmount.props.style)
        ? Object.assign({}, ...paidAmount.props.style)
        : paidAmount.props.style;
      expect(flatStyle.color).toBe('#16A34A');
    });
  });

  describe('rendering pending total', () => {
    it('displays pending total with formatted currency value', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      // 50000 cents / 100 = 500.00 → "R$ 500,00"
      expect(screen.getByText('R$ 500,00')).toBeTruthy();
    });

    it('displays "Pendente" label', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      expect(screen.getByText('Pendente')).toBeTruthy();
    });

    it('uses orange (semantic.warning.base) color for pending label', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const pendingLabel = screen.getByText('Pendente');
      const flatStyle = Array.isArray(pendingLabel.props.style)
        ? Object.assign({}, ...pendingLabel.props.style)
        : pendingLabel.props.style;
      expect(flatStyle.color).toBe('#D97706');
    });

    it('uses orange (semantic.warning.base) color for pending amount', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const pendingAmount = screen.getByText('R$ 500,00');
      const flatStyle = Array.isArray(pendingAmount.props.style)
        ? Object.assign({}, ...pendingAmount.props.style)
        : pendingAmount.props.style;
      expect(flatStyle.color).toBe('#D97706');
    });
  });

  describe('rendering predicted total', () => {
    it('displays predicted total with formatted currency value', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      // 200000 cents / 100 = 2000.00 → "R$ 2000,00"
      expect(screen.getByText('R$ 2000,00')).toBeTruthy();
    });

    it('displays "Total previsto" label', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      expect(screen.getByText('Total previsto')).toBeTruthy();
    });
  });

  describe('hidden when grandTotal is 0', () => {
    it('returns null when grandTotal is 0', () => {
      const { toJSON } = render(
        <CategoryPaymentSummary
          paidTotal={0}
          pendingTotal={0}
          grandTotal={0}
          testID="payment-summary"
        />
      );

      expect(toJSON()).toBeNull();
    });

    it('does not render any content when grandTotal is 0', () => {
      render(
        <CategoryPaymentSummary
          paidTotal={0}
          pendingTotal={0}
          grandTotal={0}
          testID="payment-summary"
        />
      );

      expect(screen.queryByTestId('payment-summary')).toBeNull();
    });
  });

  describe('accessibility attributes', () => {
    it('has accessibilityRole="summary"', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const container = screen.getByTestId('payment-summary');
      expect(container.props.accessibilityRole).toBe('summary');
    });

    it('has accessibilityLabel containing the predicted total', () => {
      render(<CategoryPaymentSummary {...defaultProps} />);

      const container = screen.getByTestId('payment-summary');
      expect(container.props.accessibilityLabel).toContain('Total previsto');
      expect(container.props.accessibilityLabel).toContain('R$ 2000,00');
    });
  });
});
