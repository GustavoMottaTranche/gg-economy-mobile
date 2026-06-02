/**
 * TabBarIcon Component Tests
 *
 * Tests for the TabBarIcon component including:
 * - Rendering correct SVG for each tab name
 * - Filled variant when focused
 * - Outline variant when unfocused
 * - Custom color and size props
 * - Default size value
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TabBarIcon, type TabBarIconProps } from '../TabBarIcon';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => (
      <View {...props} testID="svg-root">
        {children}
      </View>
    ),
    Svg: ({ children, ...props }: any) => (
      <View {...props} testID="svg-root">
        {children}
      </View>
    ),
    Path: (props: any) => <View {...props} testID="svg-path" />,
  };
});

const TAB_NAMES: TabBarIconProps['name'][] = ['dashboard', 'transactions', 'manual', 'settings'];

describe('TabBarIcon', () => {
  it('renders an SVG element with a Path', () => {
    const { getByTestId } = render(<TabBarIcon name="dashboard" focused={false} color="#000" />);
    expect(getByTestId('svg-root')).toBeTruthy();
    expect(getByTestId('svg-path')).toBeTruthy();
  });

  it('uses default size of 24', () => {
    const { getByTestId } = render(<TabBarIcon name="dashboard" focused={false} color="#000" />);
    const svg = getByTestId('svg-root');
    expect(svg.props.width).toBe(24);
    expect(svg.props.height).toBe(24);
  });

  it('accepts custom size', () => {
    const { getByTestId } = render(
      <TabBarIcon name="dashboard" focused={false} color="#000" size={32} />
    );
    const svg = getByTestId('svg-root');
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('passes color as fill to Path', () => {
    const { getByTestId } = render(<TabBarIcon name="dashboard" focused={false} color="#3B82F6" />);
    const path = getByTestId('svg-path');
    expect(path.props.fill).toBe('#3B82F6');
  });

  it('uses viewBox of 0 0 24 24', () => {
    const { getByTestId } = render(<TabBarIcon name="dashboard" focused={false} color="#000" />);
    const svg = getByTestId('svg-root');
    expect(svg.props.viewBox).toBe('0 0 24 24');
  });

  describe('renders different path data for focused vs unfocused', () => {
    TAB_NAMES.forEach((name) => {
      it(`${name}: focused and unfocused have different paths`, () => {
        const { getByTestId: getFocused } = render(
          <TabBarIcon name={name} focused={true} color="#000" />
        );
        const { getByTestId: getUnfocused } = render(
          <TabBarIcon name={name} focused={false} color="#000" />
        );

        const focusedPath = getFocused('svg-path').props.d;
        const unfocusedPath = getUnfocused('svg-path').props.d;

        // Both should have valid path data (non-empty strings)
        expect(focusedPath).toBeTruthy();
        expect(unfocusedPath).toBeTruthy();
        expect(typeof focusedPath).toBe('string');
        expect(typeof unfocusedPath).toBe('string');

        // For icons that have distinct filled/outline variants, paths should differ
        // (transactions uses same path for both since list icon is inherently the same)
        if (name !== 'transactions') {
          expect(focusedPath).not.toBe(unfocusedPath);
        }
      });
    });
  });

  describe('renders all tab icons', () => {
    TAB_NAMES.forEach((name) => {
      it(`renders ${name} icon without error`, () => {
        const { getByTestId } = render(<TabBarIcon name={name} focused={false} color="#6B7280" />);
        expect(getByTestId('svg-path').props.d).toBeTruthy();
      });
    });
  });
});
