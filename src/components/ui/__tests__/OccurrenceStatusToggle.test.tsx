/**
 * OccurrenceStatusToggle Component Tests
 *
 * Tests for the OccurrenceStatusToggle component including:
 * - Rendering check icon when isPaid=true
 * - Rendering empty circle when isPaid=false
 * - Calling onToggle when pressed
 * - Size variants ('small' and 'medium')
 * - Accessibility attributes
 * - testID propagation
 *
 * **Validates: Requirements 1.2, 1.3**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OccurrenceStatusToggle } from '../OccurrenceStatusToggle';
import { useThemeStore } from '../../../stores/themeStore';

describe('OccurrenceStatusToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  describe('when isPaid=true', () => {
    it('renders the check icon', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(getByTestId('toggle-check-icon')).toBeTruthy();
    });

    it('does not render the empty icon', () => {
      const { queryByTestId } = render(
        <OccurrenceStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(queryByTestId('toggle-empty-icon')).toBeNull();
    });

    it('applies success background color', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(getByTestId('toggle-empty-icon')).toBeTruthy();
    });

    it('does not render the check icon', () => {
      const { queryByTestId } = render(
        <OccurrenceStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      expect(queryByTestId('toggle-check-icon')).toBeNull();
    });

    it('applies transparent background with border', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
          isPaid={true}
          onToggle={onToggle}
          testID="toggle"
        />
      );
      fireEvent.press(getByTestId('toggle'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('size prop', () => {
    it('defaults to medium size (36px container)', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
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
        <OccurrenceStatusToggle
          isPaid={true}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState).toEqual({ checked: true });
    });

    it('has checked=false state when not paid', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="toggle"
        />
      );
      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState).toEqual({ checked: false });
    });
  });

  describe('testID', () => {
    it('applies testID to the container', () => {
      const { getByTestId } = render(
        <OccurrenceStatusToggle
          isPaid={false}
          onToggle={jest.fn()}
          testID="my-toggle"
        />
      );
      expect(getByTestId('my-toggle')).toBeTruthy();
    });
  });
});
