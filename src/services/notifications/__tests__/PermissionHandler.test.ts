/**
 * Unit tests for PermissionHandler service
 *
 * Tests permission checking, requesting, and settings navigation
 * using mocked expo-notifications and Linking APIs.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { Linking } from 'react-native';
import { PermissionHandler, permissionHandler } from '../PermissionHandler';
import { __setTestModule } from '../NotificationsModuleLoader';
import { logger } from '../../logging';

// Mock the NotificationsModuleLoader module
jest.mock('../NotificationsModuleLoader', () => {
  let _testModule: unknown = null;
  return {
    __setTestModule: (mod: unknown) => {
      _testModule = mod;
    },
    getNotifications: jest.fn(async () => _testModule),
  };
});

// Mock the logging module
jest.mock('../../logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Linking
jest.mock('react-native', () => ({
  Linking: {
    openSettings: jest.fn(),
  },
}));

// Create mock notifications module
const mockNotifications = {
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
};

describe('PermissionHandler', () => {
  let handler: PermissionHandler;

  beforeEach(() => {
    handler = new PermissionHandler();
    jest.clearAllMocks();
    // Provide the mock notifications module via the test hook
    __setTestModule(mockNotifications as any);
  });

  afterAll(() => {
    __setTestModule(null);
  });

  describe('checkPermission', () => {
    it('should return "granted" when permission is granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.GRANTED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('granted');
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" when permission is denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.DENIED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('denied');
    });

    it('should return "undetermined" when permission is undetermined', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.UNDETERMINED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('undetermined');
    });

    it('should return "undetermined" when getPermissionsAsync throws an error', async () => {
      mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('Permission check failed'));

      const result = await handler.checkPermission();

      expect(result).toBe('undetermined');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to check notification permissions',
        expect.objectContaining({
          error: expect.any(String),
          context: 'permissions',
        })
      );
    });
  });

  describe('requestPermission', () => {
    it('should return "granted" when permission is granted after request', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.GRANTED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('granted');
      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" when permission is denied after request', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.DENIED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('denied');
    });

    it('should fall back to checkPermission when requestPermissionsAsync throws', async () => {
      mockNotifications.requestPermissionsAsync.mockRejectedValue(new Error('Request failed'));
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: mockNotifications.PermissionStatus.DENIED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('denied');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to request notification permissions',
        expect.objectContaining({
          error: expect.any(String),
          context: 'permissions',
        })
      );
    });
  });

  describe('openSettings', () => {
    it('should call Linking.openSettings', async () => {
      (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);

      await handler.openSettings();

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when Linking.openSettings fails', async () => {
      (Linking.openSettings as jest.Mock).mockRejectedValue(new Error('Cannot open settings'));

      await expect(handler.openSettings()).rejects.toThrow('Unable to open system settings');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to open system settings',
        expect.objectContaining({
          error: expect.any(String),
          context: 'permissions',
        })
      );
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(permissionHandler).toBeInstanceOf(PermissionHandler);
    });

    it('should have all required methods', () => {
      expect(typeof permissionHandler.checkPermission).toBe('function');
      expect(typeof permissionHandler.requestPermission).toBe('function');
      expect(typeof permissionHandler.openSettings).toBe('function');
    });
  });
});
