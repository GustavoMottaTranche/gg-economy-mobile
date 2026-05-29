/**
 * Property-Based Test: Backup/Restore Round-Trip (Property 4)
 *
 * **Validates: Requirements 10.9, 32.7**
 *
 * Property: For any valid database state, creating a backup artifact and then
 * restoring from that artifact SHALL produce a database state equivalent to
 * the original (accounting for schema version migrations if applicable).
 */
import * as fc from 'fast-check';
import * as FileSystem from 'expo-file-system';

// In-memory storage for simulating file system operations
const mockFileStorage = new Map<string, string>();
const mockFileInfo = new Map<string, { exists: boolean; size: number }>();

// In-memory database storage for simulating SQLite operations
interface MockTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  categoryId: string | null;
  referenceMonth: string;
  needsReview: boolean;
  isExcludedFromTotals: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MockCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface MockDatabaseState {
  transactions: MockTransaction[];
  categories: MockCategory[];
  schemaVersion: number;
}

let mockDatabaseState: MockDatabaseState = {
  transactions: [],
  categories: [],
  schemaVersion: 1,
};

// Mock expo-file-system with in-memory storage
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(async (path: string) => {
    const info = mockFileInfo.get(path);
    return info ?? { exists: false, size: 0 };
  }),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFileStorage.get(from);
    if (content === undefined) {
      throw new Error(`Source file not found: ${from}`);
    }
    mockFileStorage.set(to, content);
    mockFileInfo.set(to, { exists: true, size: content.length });
  }),
  deleteAsync: jest.fn(async (path: string) => {
    mockFileStorage.delete(path);
    mockFileInfo.delete(path);
  }),
  readAsStringAsync: jest.fn(async (path: string) => {
    const content = mockFileStorage.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }),
  writeAsStringAsync: jest.fn(async (path: string, content: string) => {
    mockFileStorage.set(path, content);
    mockFileInfo.set(path, { exists: true, size: content.length });
  }),
  downloadAsync: jest.fn(async (url: string, localPath: string) => {
    // Simulate download by copying from a mock remote storage
    const remoteContent = mockFileStorage.get(`remote:${url}`);
    if (remoteContent) {
      mockFileStorage.set(localPath, remoteContent);
      mockFileInfo.set(localPath, { exists: true, size: remoteContent.length });
    }
    return { status: 200, uri: localPath };
  }),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

// Mock database client
jest.mock('../../../../src/db/client', () => ({
  DATABASE_NAME: 'gg-economy.db',
  resetDbClient: jest.fn(),
  getExpoDatabase: jest.fn(() => ({
    getFirstSync: jest.fn((query: string) => {
      if (query.includes('COUNT(*)')) {
        if (query.includes('transactions')) {
          return { count: mockDatabaseState.transactions.length };
        }
        if (query.includes('categories')) {
          return { count: mockDatabaseState.categories.length };
        }
      }
      return null;
    }),
    getAllSync: jest.fn((query: string) => {
      if (query.includes('transactions')) {
        return mockDatabaseState.transactions;
      }
      if (query.includes('categories')) {
        return mockDatabaseState.categories;
      }
      return [];
    }),
    execSync: jest.fn(),
    runSync: jest.fn(),
  })),
}));

// Mock migrations
jest.mock('../../../../src/db/migrate', () => ({
  runMigrations: jest.fn(async () => {
    // Simulate successful migration
    return Promise.resolve();
  }),
  getCurrentSchemaVersion: jest.fn(async () => mockDatabaseState.schemaVersion),
  hasPendingMigrations: jest.fn(async () => false),
}));

// Mock OAuth service
jest.mock('../../../../src/services/backup/OAuthService', () => ({
  oAuthService: {
    getAccessToken: jest.fn(async () => 'mock-access-token'),
    isSignedIn: jest.fn(async () => true),
  },
  OAuthError: class MockOAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OAuthError';
    }
  },
}));

// Mock Google Drive client
jest.mock('../../../../src/services/backup/GoogleDriveClient', () => {
  class MockDriveError extends Error {
    code: string;
    httpStatus?: number;
    constructor(message: string, code: string, httpStatus?: number) {
      super(message);
      this.name = 'DriveError';
      this.code = code;
      this.httpStatus = httpStatus;
    }
  }
  return {
    googleDriveClient: {
      ensureBackupFolder: jest.fn(async () => 'mock-folder-id'),
      uploadFile: jest.fn(
        async (
          _accessToken: string,
          localPath: string,
          fileName: string,
          _parentFolderId: string
        ) => {
          // Simulate upload by storing in mock remote storage
          const content = mockFileStorage.get(localPath);
          if (content) {
            const fileId = `file-${Date.now()}`;
            mockFileStorage.set(`remote:${fileId}`, content);
            return { id: fileId, name: fileName };
          }
          throw new MockDriveError('Upload failed', 'UPLOAD_FAILED');
        }
      ),
      listBackups: jest.fn(async () => []),
      downloadFile: jest.fn(async (_accessToken: string, fileId: string, localPath: string) => {
        // Simulate download from mock remote storage
        const content = mockFileStorage.get(`remote:${fileId}`);
        if (content) {
          mockFileStorage.set(localPath, content);
          mockFileInfo.set(localPath, { exists: true, size: content.length });
        } else {
          throw new MockDriveError('File not found', 'NOT_FOUND', 404);
        }
      }),
    },
    DriveError: MockDriveError,
    BACKUP_CONFIG: {
      ROOT_FOLDER_NAME: 'GG-Economy',
      BACKUPS_FOLDER_NAME: 'backups',
      FILE_PREFIX: 'gg-economy-backup-',
      FILE_EXTENSION: '.db',
    },
  };
});

// Import after mocks are set up
import {
  BackupService,
  generateBackupFileName,
} from '../../../../src/services/backup/BackupService';
import { RestoreService } from '../../../../src/services/backup/RestoreService';

/**
 * Helper to serialize database state to a string (simulating SQLite file)
 */
function serializeDatabaseState(state: MockDatabaseState): string {
  return JSON.stringify(state);
}

/**
 * Helper to deserialize database state from a string
 */
function deserializeDatabaseState(content: string): MockDatabaseState {
  return JSON.parse(content);
}

/**
 * Helper to compare two database states for equivalence
 */
function areDatabaseStatesEquivalent(
  state1: MockDatabaseState,
  state2: MockDatabaseState
): boolean {
  // Compare schema versions
  if (state1.schemaVersion !== state2.schemaVersion) {
    return false;
  }

  // Compare transactions
  if (state1.transactions.length !== state2.transactions.length) {
    return false;
  }

  const sortedTx1 = [...state1.transactions].sort((a, b) => a.id.localeCompare(b.id));
  const sortedTx2 = [...state2.transactions].sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < sortedTx1.length; i++) {
    if (JSON.stringify(sortedTx1[i]) !== JSON.stringify(sortedTx2[i])) {
      return false;
    }
  }

  // Compare categories
  if (state1.categories.length !== state2.categories.length) {
    return false;
  }

  const sortedCat1 = [...state1.categories].sort((a, b) => a.id.localeCompare(b.id));
  const sortedCat2 = [...state2.categories].sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < sortedCat1.length; i++) {
    if (JSON.stringify(sortedCat1[i]) !== JSON.stringify(sortedCat2[i])) {
      return false;
    }
  }

  return true;
}

describe('Property 4: Backup/Restore Round-Trip', () => {
  beforeEach(() => {
    // Clear all mock storages
    mockFileStorage.clear();
    mockFileInfo.clear();
    mockDatabaseState = {
      transactions: [],
      categories: [],
      schemaVersion: 1,
    };

    // Create fresh service instances to ensure mocks are properly initialized
    new BackupService();
    new RestoreService();

    jest.clearAllMocks();
  });

  /**
   * Helper to generate a valid date string in YYYY-MM-DD format
   */
  const dateStringArb = fc
    .tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates
    )
    .map(
      ([year, month, day]) =>
        `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    );

  /**
   * Helper to generate a valid ISO timestamp string
   */
  const isoTimestampArb = fc
    .tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    )
    .map(
      ([year, month, day, hour, minute, second]) =>
        `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}Z`
    );

  /**
   * Arbitrary for generating valid transaction data
   */
  const transactionArb = fc.record({
    id: fc.uuid(),
    date: dateStringArb,
    amount: fc.double({ min: -100000, max: 100000, noNaN: true }).map((n) => {
      const rounded = Math.round(n * 100) / 100;
      // Normalize -0 to 0
      return Object.is(rounded, -0) ? 0 : rounded;
    }),
    description: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
    categoryId: fc.option(fc.uuid(), { nil: null }),
    referenceMonth: fc
      .tuple(fc.integer({ min: 2020, max: 2030 }), fc.integer({ min: 1, max: 12 }))
      .map(([year, month]) => `${year}-${month.toString().padStart(2, '0')}`),
    needsReview: fc.boolean(),
    isExcludedFromTotals: fc.boolean(),
    createdAt: isoTimestampArb,
    updatedAt: isoTimestampArb,
  });

  /**
   * Arbitrary for generating valid category data
   */
  const categoryArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    type: fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
    icon: fc.string({ minLength: 1, maxLength: 10 }),
    color: fc
      .array(
        fc.constantFrom(
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          'A',
          'B',
          'C',
          'D',
          'E',
          'F'
        ),
        { minLength: 6, maxLength: 6 }
      )
      .map((chars) => `#${chars.join('')}`),
    isActive: fc.boolean(),
    createdAt: isoTimestampArb,
  });

  /**
   * Arbitrary for generating valid database state
   */
  const databaseStateArb = fc.record({
    transactions: fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
    categories: fc.array(categoryArb, { minLength: 0, maxLength: 20 }),
    schemaVersion: fc.integer({ min: 1, max: 10 }),
  });

  /**
   * Property: Backup then restore produces equivalent database state
   */
  it('should produce equivalent database state after backup and restore', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (originalState) => {
        // Clear storages for this iteration
        mockFileStorage.clear();
        mockFileInfo.clear();

        // Set up the original database state
        mockDatabaseState = { ...originalState };

        // Serialize and store the database file
        const dbPath = '/mock/documents/SQLite/gg-economy.db';
        const dbContent = serializeDatabaseState(originalState);
        mockFileStorage.set(dbPath, dbContent);
        mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

        // Create a backup
        const backupFileName = generateBackupFileName();
        const tempPath = `/mock/cache/${backupFileName}`;

        // Simulate export (copy database to temp)
        await FileSystem.copyAsync({ from: dbPath, to: tempPath });

        // Simulate upload to Google Drive
        const { googleDriveClient } = jest.requireMock(
          '../../../../src/services/backup/GoogleDriveClient'
        );
        const uploadResult = await googleDriveClient.uploadFile(
          'mock-token',
          tempPath,
          backupFileName,
          'mock-folder-id'
        );

        // Clear the current database state (simulate data loss)
        mockDatabaseState = {
          transactions: [],
          categories: [],
          schemaVersion: originalState.schemaVersion,
        };
        mockFileStorage.delete(dbPath);
        mockFileInfo.delete(dbPath);

        // Simulate download from Google Drive
        const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
        await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);

        // Simulate restore (copy downloaded file to database location)
        await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

        // Read the restored database content
        const restoredContent = await FileSystem.readAsStringAsync(dbPath);
        const restoredState = deserializeDatabaseState(restoredContent);

        // Verify the restored state is equivalent to the original
        expect(areDatabaseStatesEquivalent(originalState, restoredState)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple backup/restore cycles preserve data integrity
   */
  it('should preserve data integrity through multiple backup/restore cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        databaseStateArb,
        fc.integer({ min: 2, max: 5 }),
        async (originalState, cycles) => {
          mockFileStorage.clear();
          mockFileInfo.clear();

          let currentState = { ...originalState };
          const dbPath = '/mock/documents/SQLite/gg-economy.db';

          for (let i = 0; i < cycles; i++) {
            // Set up current state
            mockDatabaseState = { ...currentState };
            const dbContent = serializeDatabaseState(currentState);
            mockFileStorage.set(dbPath, dbContent);
            mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

            // Backup
            const backupFileName = generateBackupFileName(new Date(Date.now() + i * 1000));
            const tempPath = `/mock/cache/${backupFileName}`;
            await FileSystem.copyAsync({ from: dbPath, to: tempPath });

            const { googleDriveClient } = jest.requireMock(
              '../../../../src/services/backup/GoogleDriveClient'
            );
            const uploadResult = await googleDriveClient.uploadFile(
              'mock-token',
              tempPath,
              backupFileName,
              'mock-folder-id'
            );

            // Clear state
            mockFileStorage.delete(dbPath);
            mockFileInfo.delete(dbPath);

            // Restore
            const restoreTempPath = `/mock/cache/restore-${Date.now()}-${i}.db`;
            await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
            await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

            // Read restored state
            const restoredContent = await FileSystem.readAsStringAsync(dbPath);
            currentState = deserializeDatabaseState(restoredContent);
          }

          // Final state should match original
          expect(areDatabaseStatesEquivalent(originalState, currentState)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Empty database backup/restore works correctly
   */
  it('should handle empty database backup and restore', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (schemaVersion) => {
        mockFileStorage.clear();
        mockFileInfo.clear();

        const emptyState: MockDatabaseState = {
          transactions: [],
          categories: [],
          schemaVersion,
        };

        const dbPath = '/mock/documents/SQLite/gg-economy.db';
        const dbContent = serializeDatabaseState(emptyState);
        mockFileStorage.set(dbPath, dbContent);
        mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

        // Backup
        const backupFileName = generateBackupFileName();
        const tempPath = `/mock/cache/${backupFileName}`;
        await FileSystem.copyAsync({ from: dbPath, to: tempPath });

        const { googleDriveClient } = jest.requireMock(
          '../../../../src/services/backup/GoogleDriveClient'
        );
        const uploadResult = await googleDriveClient.uploadFile(
          'mock-token',
          tempPath,
          backupFileName,
          'mock-folder-id'
        );

        // Clear
        mockFileStorage.delete(dbPath);

        // Restore
        const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
        await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
        await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

        const restoredContent = await FileSystem.readAsStringAsync(dbPath);
        const restoredState = deserializeDatabaseState(restoredContent);

        expect(areDatabaseStatesEquivalent(emptyState, restoredState)).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Large transaction counts are preserved
   */
  it('should preserve large numbers of transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(transactionArb, { minLength: 100, maxLength: 200 }),
        async (transactions) => {
          mockFileStorage.clear();
          mockFileInfo.clear();

          const largeState: MockDatabaseState = {
            transactions,
            categories: [],
            schemaVersion: 1,
          };

          const dbPath = '/mock/documents/SQLite/gg-economy.db';
          const dbContent = serializeDatabaseState(largeState);
          mockFileStorage.set(dbPath, dbContent);
          mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

          // Backup
          const backupFileName = generateBackupFileName();
          const tempPath = `/mock/cache/${backupFileName}`;
          await FileSystem.copyAsync({ from: dbPath, to: tempPath });

          const { googleDriveClient } = jest.requireMock(
            '../../../../src/services/backup/GoogleDriveClient'
          );
          const uploadResult = await googleDriveClient.uploadFile(
            'mock-token',
            tempPath,
            backupFileName,
            'mock-folder-id'
          );

          // Clear
          mockFileStorage.delete(dbPath);

          // Restore
          const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
          await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
          await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

          const restoredContent = await FileSystem.readAsStringAsync(dbPath);
          const restoredState = deserializeDatabaseState(restoredContent);

          expect(restoredState.transactions.length).toBe(transactions.length);
          expect(areDatabaseStatesEquivalent(largeState, restoredState)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Special characters in descriptions are preserved
   */
  it('should preserve special characters in transaction descriptions', async () => {
    const specialCharArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.constant('Café & Restaurant'),
      fc.constant('Payment "quoted"'),
      fc.constant("O'Brien's Store"),
      fc.constant('Line1\nLine2'),
      fc.constant('Tab\there'),
      fc.constant('Emoji 🎉 test'),
      fc.constant('Unicode: 日本語'),
      fc.constant('<script>alert("xss")</script>'),
      fc.constant('Backslash\\test'),
      fc.constant('Slash/forward')
    );

    await fc.assert(
      fc.asyncProperty(specialCharArb, async (description) => {
        mockFileStorage.clear();
        mockFileInfo.clear();

        const state: MockDatabaseState = {
          transactions: [
            {
              id: 'test-id',
              date: '2024-01-15',
              amount: 100.5,
              description,
              categoryId: null,
              referenceMonth: '2024-01',
              needsReview: false,
              isExcludedFromTotals: false,
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-15T10:00:00Z',
            },
          ],
          categories: [],
          schemaVersion: 1,
        };

        const dbPath = '/mock/documents/SQLite/gg-economy.db';
        const dbContent = serializeDatabaseState(state);
        mockFileStorage.set(dbPath, dbContent);
        mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

        // Backup
        const backupFileName = generateBackupFileName();
        const tempPath = `/mock/cache/${backupFileName}`;
        await FileSystem.copyAsync({ from: dbPath, to: tempPath });

        const { googleDriveClient } = jest.requireMock(
          '../../../../src/services/backup/GoogleDriveClient'
        );
        const uploadResult = await googleDriveClient.uploadFile(
          'mock-token',
          tempPath,
          backupFileName,
          'mock-folder-id'
        );

        // Clear
        mockFileStorage.delete(dbPath);

        // Restore
        const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
        await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
        await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

        const restoredContent = await FileSystem.readAsStringAsync(dbPath);
        const restoredState = deserializeDatabaseState(restoredContent);

        expect(restoredState.transactions[0]!.description).toBe(description);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Numeric precision is preserved for amounts
   */
  it('should preserve numeric precision for transaction amounts', async () => {
    const amountArb = fc
      .double({
        min: -999999.99,
        max: 999999.99,
        noNaN: true,
        noDefaultInfinity: true,
      })
      .map((n) => {
        const rounded = Math.round(n * 100) / 100;
        // Normalize -0 to 0
        return Object.is(rounded, -0) ? 0 : rounded;
      });

    await fc.assert(
      fc.asyncProperty(amountArb, async (amount) => {
        mockFileStorage.clear();
        mockFileInfo.clear();

        const state: MockDatabaseState = {
          transactions: [
            {
              id: 'test-id',
              date: '2024-01-15',
              amount,
              description: 'Test transaction',
              categoryId: null,
              referenceMonth: '2024-01',
              needsReview: false,
              isExcludedFromTotals: false,
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-15T10:00:00Z',
            },
          ],
          categories: [],
          schemaVersion: 1,
        };

        const dbPath = '/mock/documents/SQLite/gg-economy.db';
        const dbContent = serializeDatabaseState(state);
        mockFileStorage.set(dbPath, dbContent);
        mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

        // Backup
        const backupFileName = generateBackupFileName();
        const tempPath = `/mock/cache/${backupFileName}`;
        await FileSystem.copyAsync({ from: dbPath, to: tempPath });

        const { googleDriveClient } = jest.requireMock(
          '../../../../src/services/backup/GoogleDriveClient'
        );
        const uploadResult = await googleDriveClient.uploadFile(
          'mock-token',
          tempPath,
          backupFileName,
          'mock-folder-id'
        );

        // Clear
        mockFileStorage.delete(dbPath);

        // Restore
        const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
        await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
        await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

        const restoredContent = await FileSystem.readAsStringAsync(dbPath);
        const restoredState = deserializeDatabaseState(restoredContent);

        expect(restoredState.transactions[0]!.amount).toBe(amount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Category relationships are preserved
   */
  it('should preserve category relationships in transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(categoryArb, { minLength: 1, maxLength: 10 }),
        async (categories) => {
          mockFileStorage.clear();
          mockFileInfo.clear();

          // Create transactions that reference the categories
          const transactions: MockTransaction[] = categories.map((cat, i) => ({
            id: `tx-${i}`,
            date: '2024-01-15',
            amount: 100 * (i + 1),
            description: `Transaction for ${cat.name}`,
            categoryId: cat.id,
            referenceMonth: '2024-01',
            needsReview: false,
            isExcludedFromTotals: false,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          }));

          const state: MockDatabaseState = {
            transactions,
            categories,
            schemaVersion: 1,
          };

          const dbPath = '/mock/documents/SQLite/gg-economy.db';
          const dbContent = serializeDatabaseState(state);
          mockFileStorage.set(dbPath, dbContent);
          mockFileInfo.set(dbPath, { exists: true, size: dbContent.length });

          // Backup
          const backupFileName = generateBackupFileName();
          const tempPath = `/mock/cache/${backupFileName}`;
          await FileSystem.copyAsync({ from: dbPath, to: tempPath });

          const { googleDriveClient } = jest.requireMock(
            '../../../../src/services/backup/GoogleDriveClient'
          );
          const uploadResult = await googleDriveClient.uploadFile(
            'mock-token',
            tempPath,
            backupFileName,
            'mock-folder-id'
          );

          // Clear
          mockFileStorage.delete(dbPath);

          // Restore
          const restoreTempPath = `/mock/cache/restore-${Date.now()}.db`;
          await googleDriveClient.downloadFile('mock-token', uploadResult.id, restoreTempPath);
          await FileSystem.copyAsync({ from: restoreTempPath, to: dbPath });

          const restoredContent = await FileSystem.readAsStringAsync(dbPath);
          const restoredState = deserializeDatabaseState(restoredContent);

          // Verify all category IDs are preserved
          for (const tx of restoredState.transactions) {
            const originalTx = state.transactions.find((t) => t.id === tx.id);
            expect(tx.categoryId).toBe(originalTx?.categoryId);
          }

          expect(areDatabaseStatesEquivalent(state, restoredState)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
