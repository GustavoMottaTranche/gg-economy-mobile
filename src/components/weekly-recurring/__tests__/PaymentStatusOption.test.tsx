/**
 * PaymentStatusOption Component Tests
 *
 * Tests for the PaymentStatusOption component including:
 * - Rendering three mutually exclusive options
 * - Selection callback fires with correct value
 * - Visual indication of selected option
 * - Accessibility attributes
 *
 * **Validates: Requirements 2.1**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentStatusOption } from '../PaymentStatusOption';
import { useThemeStore } from '../../../stores/themeStore';

describe('PaymentStatusOption', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('rendering', () => {
    it('renders three options', () => {
      const { getByText } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      expect(getByText('Todas pendentes')).toBeTruthy();
      expect(getByText('Marcar primeira como paga')).toBeTruthy();
      expect(getByText('Marcar todas como pagas')).toBeTruthy();
    });

    it('renders the section label', () => {
      const { getByText } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      expect(getByText('Status de pagamento')).toBeTruthy();
    });

    it('applies testID to the container', () => {
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      expect(getByTestId('payment-option')).toBeTruthy();
    });

    it('applies testID to each option', () => {
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      expect(getByTestId('payment-option-all_pending')).toBeTruthy();
      expect(getByTestId('payment-option-first_paid')).toBeTruthy();
      expect(getByTestId('payment-option-all_paid')).toBeTruthy();
    });
  });

  describe('selection callback', () => {
    it('calls onSelect with "all_pending" when first option is pressed', () => {
      const onSelect = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="first_paid"
          onSelect={onSelect}
          testID="payment-option"
        />
      );

      fireEvent.press(getByTestId('payment-option-all_pending'));
      expect(onSelect).toHaveBeenCalledWith('all_pending');
    });

    it('calls onSelect with "first_paid" when second option is pressed', () => {
      const onSelect = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={onSelect}
          testID="payment-option"
        />
      );

      fireEvent.press(getByTestId('payment-option-first_paid'));
      expect(onSelect).toHaveBeenCalledWith('first_paid');
    });

    it('calls onSelect with "all_paid" when third option is pressed', () => {
      const onSelect = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={onSelect}
          testID="payment-option"
        />
      );

      fireEvent.press(getByTestId('payment-option-all_paid'));
      expect(onSelect).toHaveBeenCalledWith('all_paid');
    });
  });

  describe('accessibility', () => {
    it('has radio role on each option', () => {
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="all_pending"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      const option = getByTestId('payment-option-all_pending');
      expect(option.props.accessibilityRole).toBe('radio');
    });

    it('marks selected option with selected=true state', () => {
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="first_paid"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      const selectedOption = getByTestId('payment-option-first_paid');
      expect(selectedOption.props.accessibilityState).toEqual({ selected: true });
    });

    it('marks unselected options with selected=false state', () => {
      const { getByTestId } = render(
        <PaymentStatusOption
          selected="first_paid"
          onSelect={jest.fn()}
          testID="payment-option"
        />
      );

      const unselectedOption = getByTestId('payment-option-all_pending');
      expect(unselectedOption.props.accessibilityState).toEqual({ selected: false });
    });
  });
});
