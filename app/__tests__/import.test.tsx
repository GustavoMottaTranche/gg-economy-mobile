/**
 * Import Screen Tests
 *
 * Tests that all import routes now redirect to manual entry.
 * The import functionality has been removed as part of the manual entry refactoring.
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

import ImportScreen from '../import/index';
import ImportProgressScreen from '../import/progress';
import ImportLayoutScreen from '../import/_layout';

describe('Import Routes - Redirect to Manual Entry', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  describe('ImportScreen (index)', () => {
    it('renders a Redirect component', () => {
      const { getByTestId } = render(<ImportScreen />);
      expect(getByTestId('redirect-component')).toBeTruthy();
    });

    it('redirects to /(tabs)/manual', () => {
      const { getByTestId } = render(<ImportScreen />);
      expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
      expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
    });
  });

  describe('ImportProgressScreen (progress)', () => {
    it('renders a Redirect component', () => {
      const { getByTestId } = render(<ImportProgressScreen />);
      expect(getByTestId('redirect-component')).toBeTruthy();
    });

    it('redirects to /(tabs)/manual', () => {
      const { getByTestId } = render(<ImportProgressScreen />);
      expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
      expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
    });
  });

  describe('ImportLayout (_layout)', () => {
    it('renders a Redirect component', () => {
      const { getByTestId } = render(<ImportLayoutScreen />);
      expect(getByTestId('redirect-component')).toBeTruthy();
    });

    it('redirects to /(tabs)/manual', () => {
      const { getByTestId } = render(<ImportLayoutScreen />);
      expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
      expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
    });
  });
});
