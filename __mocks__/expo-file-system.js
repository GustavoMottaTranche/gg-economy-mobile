// Dedicated mock for expo-file-system and expo-file-system/legacy
// This file is used via moduleNameMapper in jest.config.js to intercept
// both 'expo-file-system' and 'expo-file-system/legacy' imports,
// preventing EventEmitter errors from expo-modules-core native bindings.

const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('mock-file-content')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(() =>
    Promise.resolve({ status: 200, uri: '/mock/download' })
  ),
  uploadAsync: jest.fn(() =>
    Promise.resolve({ status: 200, body: '{}', headers: {} })
  ),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
  FileSystemUploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() =>
      Promise.resolve({ status: 200, uri: '/mock/download' })
    ),
    pauseAsync: jest.fn(() => Promise.resolve()),
    resumeAsync: jest.fn(() =>
      Promise.resolve({ status: 200, uri: '/mock/download' })
    ),
    savable: jest.fn(() => ({})),
  })),
};

module.exports = mockFileSystem;
