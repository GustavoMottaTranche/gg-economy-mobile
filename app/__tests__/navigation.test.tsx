/**
 * Navigation Tests
 *
 * Tests for the navigation setup:
 * - Tab bar renders exactly 5 tabs with correct labels
 * - Import/review routes redirect to manual entry
 *
 * **Validates: Requirements 1.1, 1.3**
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Track Redirect calls
const mockRedirect = jest.fn();

// Mock expo-router with Tabs that captures screen configurations
jest.mock('expo-router', () => {
  const React = require('react');

  // Tabs.Screen collects tab configuration
  function TabsScreen(props: {
    name: string;
    options?: {
      title?: string;
      tabBarLabel?: string;
      href?: null;
      tabBarAccessibilityLabel?: string;
    };
    children?: React.ReactNode;
  }) {
    const { View, Text } = require('react-native');
    const isHidden = props.options?.href === null;
    return (
      <View testID={`tab-screen-${props.name}`} accessibilityState={{ selected: !isHidden }}>
        <Text testID={`tab-label-${props.name}`}>{props.options?.tabBarLabel ?? props.name}</Text>
        {isHidden && <Text testID={`tab-hidden-${props.name}`}>hidden</Text>}
      </View>
    );
  }

  // Tabs renders children (Tabs.Screen elements)
  function Tabs({ children }: { children?: React.ReactNode; screenOptions?: unknown }) {
    const { View } = require('react-native');
    return <View testID="tabs-container">{children}</View>;
  }
  Tabs.Screen = TabsScreen;

  // Redirect component that tracks calls
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
    Tabs,
    Redirect,
    Stack: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-i18next with navigation keys
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation.dashboard': 'Dashboard',
        'navigation.transactions': 'Transações',
        'navigation.manual': 'Entrada Manual',
        'navigation.settings': 'Configurações',
        'futurePlans.tab': 'Planos',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'pt-BR', changeLanguage: jest.fn() },
  }),
}));

// Import components after mocks
import TabLayout from '../(tabs)/_layout';
import ImportIndexRedirect from '../import/index';
import ImportProgressRedirect from '../import/progress';
import ImportLayoutRedirect from '../import/_layout';
import ReviewRedirect from '../(tabs)/review';

describe('Tab Navigation - 5 Tabs Structure', () => {
  /**
   * Validates: Requirement 1.1
   * The tab bar should present exactly 5 visible tabs:
   * Dashboard, Transações, Entrada Manual, Planos, Configurações
   */
  it('renders exactly 5 visible tabs', () => {
    const { getByTestId, queryAllByTestId } = render(<TabLayout />);

    // Verify the tabs container exists
    expect(getByTestId('tabs-container')).toBeTruthy();

    // Verify the 5 visible tabs exist
    expect(getByTestId('tab-screen-index')).toBeTruthy();
    expect(getByTestId('tab-screen-transactions')).toBeTruthy();
    expect(getByTestId('tab-screen-manual')).toBeTruthy();
    expect(getByTestId('tab-screen-future-plans')).toBeTruthy();
    expect(getByTestId('tab-screen-settings')).toBeTruthy();

    // Verify the review tab is hidden (href: null)
    expect(getByTestId('tab-hidden-review')).toBeTruthy();

    // Count visible tabs (those without 'hidden' marker)
    const allHiddenMarkers = queryAllByTestId(/^tab-hidden-/);
    const allTabs = queryAllByTestId(/^tab-screen-/);
    const visibleTabCount = allTabs.length - allHiddenMarkers.length;
    expect(visibleTabCount).toBe(5);
  });

  it('renders Dashboard tab with correct label', () => {
    const { getByTestId } = render(<TabLayout />);
    const label = getByTestId('tab-label-index');
    expect(label.props.children).toBe('Dashboard');
  });

  it('renders Transactions tab with correct label', () => {
    const { getByTestId } = render(<TabLayout />);
    const label = getByTestId('tab-label-transactions');
    expect(label.props.children).toBe('Transações');
  });

  it('renders Manual Entry tab with correct label', () => {
    const { getByTestId } = render(<TabLayout />);
    const label = getByTestId('tab-label-manual');
    expect(label.props.children).toBe('Entrada Manual');
  });

  it('renders Future Plans tab with correct label', () => {
    const { getByTestId } = render(<TabLayout />);
    const label = getByTestId('tab-label-future-plans');
    expect(label.props.children).toBe('Planos');
  });

  it('renders Settings tab with correct label', () => {
    const { getByTestId } = render(<TabLayout />);
    const label = getByTestId('tab-label-settings');
    expect(label.props.children).toBe('Configurações');
  });

  it('review tab is hidden from tab bar (href: null)', () => {
    const { getByTestId } = render(<TabLayout />);
    // The review tab exists in the layout but is hidden
    expect(getByTestId('tab-screen-review')).toBeTruthy();
    expect(getByTestId('tab-hidden-review')).toBeTruthy();
  });
});

describe('Import Routes Redirect to Manual Entry', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  /**
   * Validates: Requirement 1.3
   * Accessing import routes should redirect to manual entry
   */
  it('import index redirects to /(tabs)/manual', () => {
    const { getByTestId } = render(<ImportIndexRedirect />);
    expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
  });

  it('import progress redirects to /(tabs)/manual', () => {
    const { getByTestId } = render(<ImportProgressRedirect />);
    expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
  });

  it('import layout redirects to /(tabs)/manual', () => {
    const { getByTestId } = render(<ImportLayoutRedirect />);
    expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
  });
});

describe('Review Route Redirects to Manual Entry', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  /**
   * Validates: Requirement 1.3
   * Accessing the review route should redirect to manual entry
   */
  it('review tab redirects to /(tabs)/manual', () => {
    const { getByTestId } = render(<ReviewRedirect />);
    expect(getByTestId('redirect-href').props.children).toBe('/(tabs)/manual');
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)/manual');
  });
});
