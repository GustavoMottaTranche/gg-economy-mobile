/**
 * PaymentStatusToggle Component Tests
 *
 * Tests for the PaymentStatusToggle component including:
 * - Rendering check icon when isPaid=true
 * - Rendering empty circle when isPaid=false
 * - Calling onToggle when pressed
 * - Disabled state prevents interaction
 * - Size variants ('small' and 'medium')
 * - Accessibility attributes
 * - testID propagation
 *
 * **Validates: Requirements 3.1, 3.6**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentStatusToggle } from '../PaymentStatusToggle';
import { useThemeStore } from '../../stores/themeStore';

describe('PaymentStatusToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('when isPaid=true', () => {
    it('renders the check icon', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(getByTestId('toggle-check-icon')).toBeTruthy();
    });

    it('does not render the empty icon', () => {
      const { queryByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(queryByTestId('toggle-empty-icon')).toBeNull();
    });

    it('applies success background color', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.backgroundColor).toBe('#DCFCE7');
    });
  });

  describe('when isPaid=false', () => {
    it('renders the empty circle icon', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(getByTestId('toggle-empty-icon')).toBeTruthy();
    });

    it('does not render the check icon', () => {
      const { queryByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(queryByTestId('toggle-check-icon')).toBeNull();
    });

    it('applies transparent background with border', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.backgroundColor).toBe('transparent');
      expect(flatStyle.borderWidth).toBe(2);
    });
  });

  describe('onToggle callback', () => {
    it('calls onToggle when pressed', () => {
      const onToggle = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={onToggle}
          testID="toggle"
        />
      );
      fireEvent.press(getByTestId('toggle'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when pressed in paid state', () => {
      const onToggle = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={onToggle}
          testID="toggle"
        />
      );
      fireEvent.press(getByTestId('toggle'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled prop', () => {
    it('does not call onToggle when disabled', () => {
      const onToggle = jest.fn();
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={onToggle}
          disabled={true}
          testID="toggle"
        />
      );
      fireEvent.press(getByTestId('toggle'));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('applies reduced opacity when disabled', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          disabled={true}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.opacity).toBe(0.4);
    });

    it('has full opacity when not disabled', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          disabled={false}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.opacity).toBe(1);
    });
  });

  describe('size prop', () => {
    it('defaults to medium size (36px container)', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.width).toBe(36);
      expect(flatStyle.height).toBe(36);
    });

    it('renders small size (28px container)', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          size="small"
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.width).toBe(28);
      expect(flatStyle.height).toBe(28);
    });

    it('renders medium size explicitly (36px container)', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          size="medium"
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      const flatStyle = Array.isArray(toggle.props.style)
        ? Object.assign({}, ...toggle.props.style.filter(Boolean))
        : toggle.props.style;
      expect(flatStyle.width).toBe(36);
      expect(flatStyle.height).toBe(36);
    });
  });

  describe('accessibility', () => {
    it('has checkbox role', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityRole).toBe('checkbox');
    });

    it('has checked=true state when isPaid', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(true);
    });

    it('has checked=false state when not paid', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(false);
    });

    it('has disabled=true in accessibility state when disabled', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          disabled={true}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('testID', () => {
    it('applies testID to the container', () => {
      const { getByTestId } = render(
        <PaymentStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="my-toggle"
        />
      );
      expect(getByTestId('my-toggle')).toBeTruthy();
    });
  });
});
