/**
 * InstallmentIndicator Component Tests
 *
 * Tests for the InstallmentIndicator component including:
 * - Renders "3/12" label text correctly
 * - Renders "∞" label text correctly
 * - Accessibility label for installment uses i18n translation with current/total
 * - Accessibility label for recurring uses i18n recurring translation
 * - Theme colors from useThemeColors are applied
 *
 * **Validates: Requirements 1.5, 5.1, 5.4**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { InstallmentIndicator } from '../InstallmentIndicator';

// Mock useThemeColors
jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    text: { primary: '#1C1C1E', secondary: '#6B7280', tertiary: '#9CA3AF', inverse: '#FFFFFF' },
    semantic: {
      neutral: {
        0: '#FFFFFF',
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },
    },
  }),
}));

// Mock react-i18next with parameter support
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'categoryDetail.installmentLabel' && params) {
        return `Installment ${params.current} of ${params.total}`;
      }
      if (key === 'categoryDetail.recurringLabel') {
        return 'Recurring';
      }
      return key;
    },
  }),
}));

describe('InstallmentIndicator', () => {
  describe('Renders installment label correctly', () => {
    it('renders "3/12" label text', () => {
      const { getByText } = render(<InstallmentIndicator label="3/12" />);

      expect(getByText('3/12')).toBeTruthy();
    });

    it('renders "1/6" label text', () => {
      const { getByText } = render(<InstallmentIndicator label="1/6" />);

      expect(getByText('1/6')).toBeTruthy();
    });

    it('renders "12/12" label text', () => {
      const { getByText } = render(<InstallmentIndicator label="12/12" />);

      expect(getByText('12/12')).toBeTruthy();
    });
  });

  describe('Renders recurring label correctly', () => {
    it('renders "∞" label text', () => {
      const { getByText } = render(<InstallmentIndicator label="∞" />);

      expect(getByText('∞')).toBeTruthy();
    });
  });

  describe('Accessibility labels', () => {
    it('uses i18n installment translation with current and total for "3/12"', () => {
      const { getByTestId } = render(<InstallmentIndicator label="3/12" testID="indicator" />);

      const badge = getByTestId('indicator');
      expect(badge.props.accessibilityLabel).toBe('Installment 3 of 12');
    });

    it('uses i18n installment translation with current and total for "1/6"', () => {
      const { getByTestId } = render(<InstallmentIndicator label="1/6" testID="indicator" />);

      const badge = getByTestId('indicator');
      expect(badge.props.accessibilityLabel).toBe('Installment 1 of 6');
    });

    it('uses i18n recurring translation for "∞"', () => {
      const { getByTestId } = render(<InstallmentIndicator label="∞" testID="indicator" />);

      const badge = getByTestId('indicator');
      expect(badge.props.accessibilityLabel).toBe('Recurring');
    });
  });

  describe('Theme colors are applied', () => {
    it('applies neutral background color from theme', () => {
      const { getByTestId } = render(<InstallmentIndicator label="3/12" testID="indicator" />);

      const badge = getByTestId('indicator');
      const flatStyle = Array.isArray(badge.props.style)
        ? Object.assign({}, ...badge.props.style)
        : badge.props.style;

      expect(flatStyle.backgroundColor).toBe('#F5F5F5');
    });

    it('applies text.secondary color to label text', () => {
      const { getByText } = render(<InstallmentIndicator label="3/12" />);

      const labelText = getByText('3/12');
      const flatStyle = Array.isArray(labelText.props.style)
        ? Object.assign({}, ...labelText.props.style)
        : labelText.props.style;

      expect(flatStyle.color).toBe('#6B7280');
    });
  });
});
