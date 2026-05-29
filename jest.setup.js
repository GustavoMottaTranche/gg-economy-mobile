// Jest setup file

// Mock i18next for testing
jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(undefined),
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  language: 'en',
  isInitialized: true,
  t: jest.fn((key) => key),
}));

// Mock react-i18next for testing
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn().mockResolvedValue(undefined),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock expo-sqlite for testing
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
  })),
}));

// Mock expo-secure-store for testing
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-localization for testing
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
  locale: 'en-US',
}));

// Mock expo-crypto for testing
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

// Mock expo-auth-session for testing
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'gg-economy://oauth'),
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: jest.fn(),
    codeVerifier: 'test-code-verifier',
  })),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
  revokeAsync: jest.fn(),
  ResponseType: {
    Code: 'code',
  },
}));

// Mock expo-web-browser for testing
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Note: expo-file-system mock is handled by moduleNameMapper in jest.config.js
// (maps both 'expo-file-system' and 'expo-file-system/legacy' to __mocks__/expo-file-system.js)

// Mock expo-linking for testing
jest.mock('expo-linking', () => ({
  parse: jest.fn((url) => ({ path: url })),
  createURL: jest.fn((path) => `gg-economy://${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-background-fetch for testing
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
  BackgroundFetchStatus: {
    Denied: 1,
    Restricted: 2,
    Available: 3,
  },
  getStatusAsync: jest.fn(() => Promise.resolve(3)), // Available
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-task-manager for testing
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock @react-native-async-storage/async-storage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-splash-screen for testing
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

// Mock expo-status-bar for testing
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}), { virtual: true });

// Mock expo-constants for testing
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
  },
}), { virtual: true });

// Mock expo-router for testing
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
  Link: ({ children }) => children,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
}), { virtual: true });

// Mock drizzle-orm/expo-sqlite for testing
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  })),
  useLiveQuery: jest.fn(() => ({ data: [] })),
}), { virtual: true });

// Mock react-native-gesture-handler for testing
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const React = require('react');

  const Swipeable = React.forwardRef(({ children, renderRightActions, testID }, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));

    const mockAnimatedValue = { interpolate: () => 1 };

    return React.createElement(
      View,
      { testID },
      children,
      renderRightActions ? renderRightActions(mockAnimatedValue, mockAnimatedValue) : null
    );
  });
  Swipeable.displayName = 'Swipeable';

  return {
    Swipeable,
    GestureHandlerRootView: ({ children }) => React.createElement(View, null, children),
    PanGestureHandler: ({ children }) => React.createElement(View, null, children),
    TapGestureHandler: ({ children }) => React.createElement(View, null, children),
    State: {},
    Directions: {},
  };
});
