/**
 * Unit tests for database client
 *
 * Tests the database client initialization and transaction handling.
 */
import { openDatabaseSync } from 'expo-sqlite';
import {
  getExpoDatabase,
  createDrizzleClient,
  getDb,
  resetDbClient,
  withTransaction,
  withTransactionSync,
  DATABASE_NAME,
} from '../../../src/db/client';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
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

describe('Database Client', () => {
  let mockSqliteDb: {
    execSync: jest.Mock;
    runSync: jest.Mock;
    getFirstSync: jest.Mock;
    getAllSync: jest.Mock;
    closeSync: jest.Mock;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the database client singleton
    resetDbClient();

    // Create mock SQLite database
    mockSqliteDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
      getAllSync: jest.fn(),
      closeSync: jest.fn(),
    };

    (openDatabaseSync as jest.Mock).mockReturnValue(mockSqliteDb);
  });

  describe('getExpoDatabase', () => {
    it('should create a new database instance on first call', () => {
      const db = getExpoDatabase();

      expect(openDatabaseSync).toHaveBeenCalledWith(DATABASE_NAME, {
        enableChangeListener: true,
      });
      expect(db).toBe(mockSqliteDb);
    });

    it('should return the same instance on subsequent calls', () => {
      const db1 = getExpoDatabase();
      const db2 = getExpoDatabase();

      expect(openDatabaseSync).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });
  });

  describe('createDrizzleClient', () => {
    it('should create a Drizzle client with the SQLite database', () => {
      const client = createDrizzleClient();

      expect(client).toBeDefined();
      expect(openDatabaseSync).toHaveBeenCalled();
    });
  });

  describe('getDb', () => {
    it('should return a singleton Drizzle client', () => {
      const db1 = getDb();
      const db2 = getDb();

      expect(db1).toBe(db2);
    });
  });

  describe('resetDbClient', () => {
    it('should reset the database client singleton', () => {
      // Get initial instance
      getDb();
      expect(openDatabaseSync).toHaveBeenCalledTimes(1);

      // Reset
      resetDbClient();

      // Get new instance
      getDb();
      expect(openDatabaseSync).toHaveBeenCalledTimes(2);
    });

    it('should close the SQLite database when resetting', () => {
      getExpoDatabase();
      resetDbClient();

      expect(mockSqliteDb.closeSync).toHaveBeenCalled();
    });
  });

  describe('withTransaction', () => {
    it('should begin and commit transaction on success', async () => {
      const result = await withTransaction(async () => {
        return 'success';
      });

      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('COMMIT');
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Test error');

      await expect(
        withTransaction(async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('ROLLBACK');
      expect(mockSqliteDb.execSync).not.toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('withTransactionSync', () => {
    it('should begin and commit transaction on success', () => {
      const result = withTransactionSync(() => {
        return 'success';
      });

      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('COMMIT');
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', () => {
      const error = new Error('Test error');

      expect(() =>
        withTransactionSync(() => {
          throw error;
        })
      ).toThrow('Test error');

      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockSqliteDb.execSync).toHaveBeenCalledWith('ROLLBACK');
      expect(mockSqliteDb.execSync).not.toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('DATABASE_NAME', () => {
    it('should be the correct database name', () => {
      expect(DATABASE_NAME).toBe('gg-economy.db');
    });
  });
});
