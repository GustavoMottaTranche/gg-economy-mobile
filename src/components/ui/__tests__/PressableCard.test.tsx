/**
 * PressableCard Component Tests
 *
 * Tests for the PressableCard component including:
 * - Rendering children correctly
 * - Press feedback with activeOpacity 0.7
 * - Light mode shadow application (sm for secondary, md for primary)
 * - Dark mode border application (1px, border.default color)
 * - Border radius based on variant (lg for primary, md for secondary)
 * - Background color from surface.card
 * - Disabled state (opacity 0.5, no press)
 *
 * **Validates: Requirements 6.2, 6.3, 6.4, 9.1, 9.5**
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PressableCard } from '../PressableCard';
import { useThemeStore } from '../../../stores/themeStore';

describe('PressableCard', () => {
  beforeEach(() => {
    // Reset to light mode before each test
    useThemeStore.setState({ resolvedScheme: 'light', preference: 'light' });
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <PressableCard>
        <Text>Card Content</Text>
      </PressableCard>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PressableCard onPress={onPress}>
        <Text>Pressable</Text>
      </PressableCard>
    );
    fireEvent.press(getByText('Pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders as a TouchableOpacity (press feedback via activeOpacity 0.7)', () => {
    // The component uses TouchableOpacity with activeOpacity={0.7}
    // We verify it renders and responds to press events correctly
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PressableCard onPress={onPress} testID="card">
        <Text>Content</Text>
      </PressableCard>
    );
    const card = getByTestId('card');
    expect(card).toBeTruthy();
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });

  describe('variant="primary" (default)', () => {
    it('applies borderRadius.lg (16) for primary variant', () => {
      const { getByTestId } = render(
        <PressableCard variant="primary" testID="card">
          <Text>Primary</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.borderRadius).toBe(16);
    });

    it('applies shadow md in light mode', () => {
      const { getByTestId } = render(
        <PressableCard variant="primary" testID="card">
          <Text>Primary</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.shadowOpacity).toBe(0.06);
      expect(flatStyle.elevation).toBe(3);
    });
  });

  describe('variant="secondary"', () => {
    it('applies borderRadius.md (12) for secondary variant', () => {
      const { getByTestId } = render(
        <PressableCard variant="secondary" testID="card">
          <Text>Secondary</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.borderRadius).toBe(12);
    });

    it('applies shadow sm in light mode', () => {
      const { getByTestId } = render(
        <PressableCard variant="secondary" testID="card">
          <Text>Secondary</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.shadowOpacity).toBe(0.04);
      expect(flatStyle.elevation).toBe(2);
    });
  });

  describe('dark mode', () => {
    beforeEach(() => {
      useThemeStore.setState({ resolvedScheme: 'dark', preference: 'dark' });
    });

    it('applies 1px border with border.default color instead of shadows', () => {
      const { getByTestId } = render(
        <PressableCard variant="primary" testID="card">
          <Text>Dark Card</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.borderWidth).toBe(1);
      expect(flatStyle.borderColor).toBe('rgba(255, 255, 255, 0.12)');
    });

    it('uses surface.card background in dark mode', () => {
      const { getByTestId } = render(
        <PressableCard testID="card">
          <Text>Dark Card</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.backgroundColor).toBe('#1C1C1E');
    });
  });

  describe('light mode background', () => {
    it('uses surface.card background in light mode', () => {
      const { getByTestId } = render(
        <PressableCard testID="card">
          <Text>Light Card</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.backgroundColor).toBe('#FFFFFF');
    });
  });

  describe('disabled state', () => {
    it('reduces opacity to 0.5 when disabled', () => {
      const { getByTestId } = render(
        <PressableCard disabled testID="card">
          <Text>Disabled</Text>
        </PressableCard>
      );
      const card = getByTestId('card');
      const flatStyle = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style.filter(Boolean))
        : card.props.style;
      expect(flatStyle.opacity).toBe(0.5);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <PressableCard disabled onPress={onPress} testID="card">
          <Text>Disabled</Text>
        </PressableCard>
      );
      fireEvent.press(getByTestId('card'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  it('accepts custom style overrides', () => {
    const { getByTestId } = render(
      <PressableCard style={{ marginTop: 10 }} testID="card">
        <Text>Custom</Text>
      </PressableCard>
    );
    const card = getByTestId('card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style.filter(Boolean))
      : card.props.style;
    expect(flatStyle.marginTop).toBe(10);
  });

  it('defaults to primary variant', () => {
    const { getByTestId } = render(
      <PressableCard testID="card">
        <Text>Default</Text>
      </PressableCard>
    );
    const card = getByTestId('card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style.filter(Boolean))
      : card.props.style;
    // Primary variant uses borderRadius.lg = 16
    expect(flatStyle.borderRadius).toBe(16);
  });
});
