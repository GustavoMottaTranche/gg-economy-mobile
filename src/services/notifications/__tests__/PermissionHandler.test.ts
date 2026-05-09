/**
 * Unit tests for PermissionHandler service
 *
 * Tests permission checking, requesting, and settings navigation
 * using mocked expo-notifications and Linking APIs.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PermissionHandler, permissionHandler } from '../PermissionHandler';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

// Mock Linking
jest.mock('react-native', () => ({
  Linking: {
    openSettings: jest.fn(),
  },
}));

describe('PermissionHandler', () => {
  let handler: PermissionHandler;

  beforeEach(() => {
    handler = new PermissionHandler();
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should return "granted" when permission is granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('granted');
      expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('denied');
    });

    it('should return "undetermined" when permission is undetermined', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
      });

      const result = await handler.checkPermission();

      expect(result).toBe('undetermined');
    });

    it('should return "undetermined" when getPermissionsAsync throws an error', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission check failed')
      );

      const result = await handler.checkPermission();

      expect(result).toBe('undetermined');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check notification permissions:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('requestPermission', () => {
    it('should return "granted" when permission is granted after request', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('granted');
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" when permission is denied after request', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('denied');
    });

    it('should fall back to checkPermission when requestPermissionsAsync throws', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Request failed')
      );
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
      });

      const result = await handler.requestPermission();

      expect(result).toBe('denied');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to request notification permissions:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('openSettings', () => {
    it('should call Linking.openSettings', async () => {
      (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);

      await handler.openSettings();

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when Linking.openSettings fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (Linking.openSettings as jest.Mock).mockRejectedValue(new Error('Cannot open settings'));

      await expect(handler.openSettings()).rejects.toThrow('Unable to open system settings');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to open system settings:', expect.any(Error));
      consoleSpy.mockRestore();
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
