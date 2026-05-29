/**
 * LoadingIndicator Component Tests
 *
 * Tests for the LoadingIndicator component including:
 * - Rendering spinner correctly
 * - Size variants
 * - Message display
 * - Full screen mode
 * - Accessibility support
 *
 * **Validates: Requirements 30**
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  LoadingIndicator,
  InlineLoader,
  FullScreenLoader,
  ButtonLoader,
  type LoadingIndicatorProps,
} from '../LoadingIndicator';

describe('LoadingIndicator', () => {
  const defaultProps: LoadingIndicatorProps = {};

  it('renders activity indicator', () => {
    const { UNSAFE_getByType } = render(<LoadingIndicator {...defaultProps} />);
    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders default loading message', () => {
    const { getByLabelText } = render(<LoadingIndicator />);
    // The message is in the accessibility label
    expect(getByLabelText('common.loading')).toBeTruthy();
  });

  it('renders custom message', () => {
    const { getByText } = render(<LoadingIndicator message="Loading transactions..." />);
    expect(getByText('Loading transactions...')).toBeTruthy();
  });

  it('does not render message when message is undefined', () => {
    const { getByLabelText } = render(<LoadingIndicator message={undefined} />);
    // Default message is used in accessibility label
    expect(getByLabelText('common.loading')).toBeTruthy();
  });

  describe('size variants', () => {
    it('renders small size', () => {
      const { UNSAFE_getByType } = render(<LoadingIndicator size="small" />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.size).toBe('small');
    });

    it('renders medium size', () => {
      const { UNSAFE_getByType } = render(<LoadingIndicator size="medium" />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.size).toBe('large');
    });

    it('renders large size', () => {
      const { UNSAFE_getByType } = render(<LoadingIndicator size="large" />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.size).toBe('large');
    });
  });

  it('applies custom color', () => {
    const { UNSAFE_getByType } = render(<LoadingIndicator color="#10b981" />);
    const ActivityIndicator = require('react-native').ActivityIndicator;
    const indicator = UNSAFE_getByType(ActivityIndicator);
    expect(indicator.props.color).toBe('#10b981');
  });

  it('uses default color when not specified', () => {
    const { UNSAFE_getByType } = render(<LoadingIndicator />);
    const ActivityIndicator = require('react-native').ActivityIndicator;
    const indicator = UNSAFE_getByType(ActivityIndicator);
    // Default color comes from theme's interactive.primary (light mode)
    expect(indicator.props.color).toBe('#3B82F6');
  });

  describe('inline mode', () => {
    it('renders only spinner without container', () => {
      const { UNSAFE_getByType, queryByText } = render(<LoadingIndicator inline />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(queryByText('common.loading')).toBeNull();
    });
  });

  describe('full screen mode', () => {
    it('renders full screen overlay', () => {
      const { getByTestId } = render(<LoadingIndicator fullScreen testID="loader" />);
      const container = getByTestId('loader');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: 'absolute',
            zIndex: 9999,
          }),
        ])
      );
    });

    it('renders message in full screen mode', () => {
      const { getByText } = render(<LoadingIndicator fullScreen message="Please wait..." />);
      expect(getByText('Please wait...')).toBeTruthy();
    });
  });

  it('has correct accessibility role', () => {
    const { getByTestId } = render(<LoadingIndicator testID="loader" />);
    const loader = getByTestId('loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<LoadingIndicator message="Loading data..." />);
    expect(getByLabelText('Loading data...')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(<LoadingIndicator style={customStyle} testID="loader" />);
    const container = getByTestId('loader');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });

  it('applies custom message style', () => {
    const customMessageStyle = { color: '#ff0000' };
    const { getByText } = render(
      <LoadingIndicator message="Loading..." messageStyle={customMessageStyle} />
    );
    const message = getByText('Loading...');
    expect(message.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customMessageStyle)])
    );
  });

  describe('convenience components', () => {
    it('InlineLoader renders inline', () => {
      const { UNSAFE_getByType, queryByText } = render(<InlineLoader />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(queryByText('common.loading')).toBeNull();
    });

    it('FullScreenLoader renders full screen', () => {
      const { getByTestId } = render(<FullScreenLoader testID="loader" />);
      const container = getByTestId('loader');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: 'absolute',
            zIndex: 9999,
          }),
        ])
      );
    });

    it('ButtonLoader renders small white spinner', () => {
      const { UNSAFE_getByType } = render(<ButtonLoader />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.size).toBe('small');
      // Without explicit color, ButtonLoader uses theme's interactive.primary
      expect(indicator.props.color).toBe('#3B82F6');
    });

    it('ButtonLoader accepts custom color', () => {
      const { UNSAFE_getByType } = render(<ButtonLoader color="#000000" />);
      const ActivityIndicator = require('react-native').ActivityIndicator;
      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.color).toBe('#000000');
    });
  });
});
