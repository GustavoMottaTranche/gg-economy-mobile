/**
 * Unit tests for database migration runner
 *
 * Tests the migration functionality including running migrations,
 * checking for pending migrations, and getting schema version.
 */
import { openDatabaseSync } from 'expo-sqlite';
import {
  runMigrations,
  hasPendingMigrations,
  getCurrentSchemaVersion,
  getAppliedMigrations,
  initializeDatabase,
  MigrationError,
} from '../../../src/db/migrate';
import { resetDbClient } from '../../../src/db/client';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));

// Mock drizzle-orm migrate
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({
  migrate: jest.fn(),
}));

// Mock drizzle-orm
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
  useLiveQuery: jest.fn(),
}));

// Mock categories queries (static import in initializeDatabase)
jest.mock('../../../src/db/queries/categories', () => ({
  seedDefaultCategories: jest.fn().mockResolvedValue(false),
}));

// Mock migrations
jest.mock('../../../src/db/migrations/migrations', () => ({
  journal: { entries: [{ idx: 0, when: 1234567890, tag: '0000_initial' }] },
  migrations: { m0000: 'CREATE TABLE test (id TEXT PRIMARY KEY)' },
}));

import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

describe('Database Migration', () => {
  let mockSqliteDb: {
    execSync: jest.Mock;
    runSync: jest.Mock;
    getFirstSync: jest.Mock;
    getAllSync: jest.Mock;
    closeSync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDbClient();

    mockSqliteDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  describe('runMigrations', () => {
    it('should call Drizzle migrate function', async () => {
      (migrate as jest.Mock).mockResolvedValue(undefined);

      await runMigrations();

      expect(migrate).toHaveBeenCalled();
    });

    it('should throw MigrationError on failure', async () => {
      const error = new Error('Migration failed');
      (migrate as jest.Mock).mockRejectedValue(error);

      await expect(runMigrations()).rejects.toThrow(MigrationError);
    });
  });

  describe('hasPendingMigrations', () => {
    it('should return true if migrations table does not exist', async () => {
      mockSqliteDb.getFirstSync.mockReturnValue(null);

      const result = await hasPendingMigrations();

      expect(result).toBe(true);
    });

    it('should return true if applied migrations count is less than total', async () => {
      // First call: check if table exists
      mockSqliteDb.getFirstSync
        .mockReturnValueOnce({ name: '__drizzle_migrations' })
        // Second call: get count
        .mockReturnValueOnce({ count: 0 });

      const result = await hasPendingMigrations();

      expect(result).toBe(true);
    });

    it('should return false if all migrations are applied', async () => {
      mockSqliteDb.getFirstSync
        .mockReturnValueOnce({ name: '__drizzle_migrations' })
        .mockReturnValueOnce({ count: 1 }); // Same as total migrations in mock

      const result = await hasPendingMigrations();

      expect(result).toBe(false);
    });

    it('should return true on error', async () => {
      mockSqliteDb.getFirstSync.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await hasPendingMigrations();

      expect(result).toBe(true);
    });
  });

  describe('getCurrentSchemaVersion', () => {
    it('should return 0 if migrations table does not exist', async () => {
      mockSqliteDb.getFirstSync.mockReturnValue(null);

      const version = await getCurrentSchemaVersion();

      expect(version).toBe(0);
    });

    it('should return the count of applied migrations', async () => {
      mockSqliteDb.getFirstSync
        .mockReturnValueOnce({ name: '__drizzle_migrations' })
        .mockReturnValueOnce({ count: 5 });

      const version = await getCurrentSchemaVersion();

      expect(version).toBe(5);
    });

    it('should return 0 on error', async () => {
      mockSqliteDb.getFirstSync.mockImplementation(() => {
        throw new Error('Database error');
      });

      const version = await getCurrentSchemaVersion();

      expect(version).toBe(0);
    });
  });

  describe('getAppliedMigrations', () => {
    it('should return empty array if migrations table does not exist', async () => {
      mockSqliteDb.getFirstSync.mockReturnValue(null);

      const migrations = await getAppliedMigrations();

      expect(migrations).toEqual([]);
    });

    it('should return list of applied migration hashes', async () => {
      mockSqliteDb.getFirstSync.mockReturnValue({ name: '__drizzle_migrations' });
      mockSqliteDb.getAllSync.mockReturnValue([
        { hash: 'hash1' },
        { hash: 'hash2' },
        { hash: 'hash3' },
      ]);

      const migrations = await getAppliedMigrations();

      expect(migrations).toEqual(['hash1', 'hash2', 'hash3']);
    });

    it('should return empty array on error', async () => {
      mockSqliteDb.getFirstSync.mockImplementation(() => {
        throw new Error('Database error');
      });

      const migrations = await getAppliedMigrations();

      expect(migrations).toEqual([]);
    });
  });

  describe('initializeDatabase', () => {
    it('should run migrations if pending', async () => {
      mockSqliteDb.getFirstSync.mockReturnValue(null); // No migrations table
      (migrate as jest.Mock).mockResolvedValue(undefined);

      await initializeDatabase();

      expect(migrate).toHaveBeenCalled();
    });

    it('should skip migrations if database is up to date', async () => {
      mockSqliteDb.getFirstSync
        .mockReturnValueOnce({ name: '__drizzle_migrations' })
        .mockReturnValueOnce({ count: 1 }) // hasPendingMigrations check
        .mockReturnValueOnce({ name: '__drizzle_migrations' })
        .mockReturnValueOnce({ count: 1 }); // getCurrentSchemaVersion check

      await initializeDatabase();

      expect(migrate).not.toHaveBeenCalled();
    });

    it('should show Alert and throw MigrationError when migration fails', async () => {
      const { Alert } = require('react-native');
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      mockSqliteDb.getFirstSync.mockReturnValue(null); // No migrations table → pending
      const migrationError = new Error('SQLite constraint failed');
      (migrate as jest.Mock).mockRejectedValue(migrationError);

      await expect(initializeDatabase()).rejects.toThrow(MigrationError);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Database Update Failed',
        expect.stringContaining('migration failed'),
        expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
      );
    });

    it('should sync schema_version after successful migration', async () => {
      mockSqliteDb.getFirstSync
        .mockReturnValueOnce(null) // hasPendingMigrations: no __drizzle_migrations table
        .mockReturnValueOnce({ name: 'schema_version' }) // syncSchemaVersion: table exists
        .mockReturnValueOnce({ version: 4 }) // syncSchemaVersion: current version
        .mockReturnValueOnce({ name: 'title' }) // syncSchemaVersion: title column exists
        .mockReturnValueOnce({ name: '__drizzle_migrations' }) // getCurrentSchemaVersion
        .mockReturnValueOnce({ count: 5 }); // getCurrentSchemaVersion count
      (migrate as jest.Mock).mockResolvedValue(undefined);

      await initializeDatabase();

      expect(mockSqliteDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('schema_version')
      );
    });
  });

  describe('MigrationError', () => {
    it('should have correct name and message', () => {
      const error = new MigrationError('Test error');

      expect(error.name).toBe('MigrationError');
      expect(error.message).toBe('Test error');
    });

    it('should store the cause', () => {
      const cause = new Error('Original error');
      const error = new MigrationError('Test error', cause);

      expect(error.cause).toBe(cause);
    });
  });
});
