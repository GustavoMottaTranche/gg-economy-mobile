/** @type {import('jest').Config} */
const config = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|expo-modules-core|expo-sqlite|expo-secure-store|expo-localization|expo-crypto|expo-file-system|expo-document-picker|expo-auth-session|expo-web-browser|expo-router|expo-status-bar|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|drizzle-orm)/)',
  ],
  moduleNameMapper: {
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@db/(.*)$': '<rootDir>/src/db/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  clearMocks: true,
  verbose: true,
};

module.exports = config;
