/**
 * Review Screen Tests
 *
 * Tests that the review route now redirects to manual entry.
 * The review tab has been removed as part of the manual entry refactoring.
 *
 * **Validates: Requirements 1.3**
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Track Redirect calls
const mockRedirect = jest.fn();

jest.mock('expo-router', () => {
  function Redirect({ href }: { href: string }) {
    const { View, Text } = require('react-native');
    mockRedirect(href);
    return (
      <View testID="redirect-component">
        <Text testID="redirect-href">{href}</Text>
      </View>
    );
  }

  return {
    Redirect,
    Stack: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
    },
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
    }),
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

import ReviewScreen from '../(tabs)/review';

describe('Review Route - Redirect to Manual Entry', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it('renders a Redirect component', () => {
    const { getByTestId } = render(<ReviewScreen />);
    expect(getByTestId('redirect-component')).toBeTruthy();
  });

  it('redirects to /(tabs)/manual', () => {
    const { getByTestId } = render(<ReviewScreen />);
    expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
  });

  it('does not render any review UI content', () => {
    const { queryByTestId } = render(<ReviewScreen />);
    // Should not render any review-specific UI
    expect(queryByTestId('review-screen')).toBeNull();
    expect(queryByTestId('review-list')).toBeNull();
    expect(queryByTestId('review-screen-empty')).toBeNull();
  });
});
