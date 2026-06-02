/**
 * Unit tests for CustomServerSettingsStore
 *
 * Tests server configuration persistence, validation, device ID generation,
 * and configuration state checking.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.4**
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { CustomServerSettingsStore } from '../../../../src/services/backup/CustomServerSettingsStore';

describe('CustomServerSettingsStore', () => {
  let store: CustomServerSettingsStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new CustomServerSettingsStore();
  });

  describe('validateServerUrl', () => {
    it('should accept a valid https URL', () => {
      const result = store.validateServerUrl('https://backup.example.com');
      expect(result).toEqual({ valid: true });
    });

    it('should accept a valid http URL', () => {
      const result = store.validateServerUrl('http://192.168.1.10:3000');
      expect(result).toEqual({ valid: true });
    });

    it('should accept a URL with path', () => {
      const result = store.validateServerUrl('https://example.com/api/v1');
      expect(result).toEqual({ valid: true });
    });

    it('should reject an empty URL', () => {
      const result = store.validateServerUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject a URL without http/https scheme', () => {
      const result = store.validateServerUrl('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('http://');
    });

    it('should reject a URL without a host', () => {
      const result = store.validateServerUrl('http://');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('host');
    });

    it('should reject a URL exceeding 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2030);
      expect(longUrl.length).toBeGreaterThan(2048);
      const result = store.validateServerUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2048');
    });

    it('should accept a URL exactly 2048 characters', () => {
      const baseUrl = 'https://example.com/';
      const padding = 'a'.repeat(2048 - baseUrl.length);
      const url = baseUrl + padding;
      expect(url.length).toBe(2048);
      const result = store.validateServerUrl(url);
      expect(result.valid).toBe(true);
    });

    it('should reject a URL with only spaces as host', () => {
      const result = store.validateServerUrl('http://   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    it('should accept a valid API key', () => {
      const result = store.validateApiKey('my-secret-key-123');
      expect(result).toEqual({ valid: true });
    });

    it('should accept a single character API key', () => {
      const result = store.validateApiKey('x');
      expect(result).toEqual({ valid: true });
    });

    it('should accept an API key of exactly 256 characters', () => {
      const key = 'k'.repeat(256);
      const result = store.validateApiKey(key);
      expect(result).toEqual({ valid: true });
    });

    it('should reject an API key with only spaces (trimmed length 0)', () => {
      const result = store.validateApiKey('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject an empty API key', () => {
      const result = store.validateApiKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject an API key exceeding 256 characters after trim', () => {
      const key = 'k'.repeat(257);
      const result = store.validateApiKey(key);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('256');
    });

    it('should accept an API key with leading/trailing spaces if trimmed length is valid', () => {
      const result = store.validateApiKey('  valid-key  ');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('saveSettings', () => {
    it('should save valid server URL to AsyncStorage and API key to SecureStore', async () => {
      await store.saveSettings('https://backup.example.com', 'my-api-key');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@gg-economy/custom-server-url',
        'https://backup.example.com'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('custom-server-api-key', 'my-api-key');
    });

    it('should trim the API key before saving', async () => {
      await store.saveSettings('https://example.com', '  my-key  ');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('custom-server-api-key', 'my-key');
    });

    it('should throw if server URL is invalid', async () => {
      await expect(store.saveSettings('not-a-url', 'valid-key')).rejects.toThrow();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should throw if API key is invalid (only spaces)', async () => {
      await expect(store.saveSettings('https://example.com', '   ')).rejects.toThrow();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should round-trip: save then getSettings returns the saved values', async () => {
      const serverUrl = 'https://my-server.com:8080';
      const apiKey = 'secret-key-42';

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await store.saveSettings(serverUrl, apiKey);

      // Mock getSettings to return what was saved
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(serverUrl);
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve(apiKey);
        if (key === 'custom-server-device-id')
          return Promise.resolve('abcdef1234567890abcdef1234567890');
        return Promise.resolve(null);
      });

      const settings = await store.getSettings();
      expect(settings.serverUrl).toBe(serverUrl);
      expect(settings.apiKey).toBe(apiKey);
    });
  });

  describe('getSettings', () => {
    it('should return null fields when nothing is configured', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const settings = await store.getSettings();

      expect(settings).toEqual({
        serverUrl: null,
        apiKey: null,
        deviceId: null,
      });
    });

    it('should return stored values when configured', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('https://example.com');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('my-key');
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const settings = await store.getSettings();

      expect(settings).toEqual({
        serverUrl: 'https://example.com',
        apiKey: 'my-key',
        deviceId: 'aabbccdd11223344aabbccdd11223344',
      });
    });
  });

  describe('getOrCreateDeviceId', () => {
    it('should return existing device ID if already stored', async () => {
      const existingId = 'abcdef0123456789abcdef0123456789';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(existingId);

      // Mock getRandomBytesAsync to track if it's called
      (Crypto as any).getRandomBytesAsync = jest.fn();

      const deviceId = await store.getOrCreateDeviceId();

      expect(deviceId).toBe(existingId);
      expect((Crypto as any).getRandomBytesAsync).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should generate a new device ID if none exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      // Mock getRandomBytesAsync to return 16 known bytes
      const mockBytes = new Uint8Array([
        0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67,
        0x89,
      ]);
      (Crypto as any).getRandomBytesAsync = jest.fn().mockResolvedValue(mockBytes);

      const deviceId = await store.getOrCreateDeviceId();

      expect(deviceId).toBe('abcdef0123456789abcdef0123456789');
      expect(deviceId).toHaveLength(32);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'custom-server-device-id',
        'abcdef0123456789abcdef0123456789'
      );
    });

    it('should persist the generated device ID so second call retrieves it', async () => {
      // First call: no existing ID
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const mockBytes = new Uint8Array([
        0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
        0x00,
      ]);
      (Crypto as any).getRandomBytesAsync = jest.fn().mockResolvedValue(mockBytes);

      const firstId = await store.getOrCreateDeviceId();
      expect(firstId).toBe('112233445566778899aabbccddeeff00');

      // Second call: ID now exists
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(firstId);

      const secondId = await store.getOrCreateDeviceId();
      expect(secondId).toBe(firstId);
      // getRandomBytesAsync should only have been called once (for the first generation)
      expect((Crypto as any).getRandomBytesAsync).toHaveBeenCalledTimes(1);
    });

    it('should generate a 32-character lowercase hex string', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const mockBytes = new Uint8Array([
        0x0a, 0x1b, 0x2c, 0x3d, 0x4e, 0x5f, 0x60, 0x71, 0x82, 0x93, 0xa4, 0xb5, 0xc6, 0xd7, 0xe8,
        0xf9,
      ]);
      (Crypto as any).getRandomBytesAsync = jest.fn().mockResolvedValue(mockBytes);

      const deviceId = await store.getOrCreateDeviceId();

      expect(deviceId).toHaveLength(32);
      expect(deviceId).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('clearSettings', () => {
    it('should remove server URL from AsyncStorage', async () => {
      await store.clearSettings();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gg-economy/custom-server-url');
    });

    it('should remove API key from SecureStore', async () => {
      await store.clearSettings();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('custom-server-api-key');
    });

    it('should remove device ID from SecureStore', async () => {
      await store.clearSettings();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('custom-server-device-id');
    });

    it('should remove all three keys', async () => {
      await store.clearSettings();

      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('isConfigured', () => {
    it('should return true when all fields are present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('https://example.com');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('my-key');
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(true);
    });

    it('should return false when server URL is missing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('my-key');
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('https://example.com');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve(null);
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });

    it('should return false when device ID is missing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('https://example.com');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('my-key');
        if (key === 'custom-server-device-id') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });

    it('should return false when server URL is empty string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('my-key');
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });

    it('should return false when API key is empty string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('https://example.com');
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'custom-server-api-key') return Promise.resolve('');
        if (key === 'custom-server-device-id')
          return Promise.resolve('aabbccdd11223344aabbccdd11223344');
        return Promise.resolve(null);
      });

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });

    it('should return false when all fields are missing', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await store.isConfigured();
      expect(result).toBe(false);
    });
  });
});
