/**
 * Integration tests for ImportService
 *
 * Tests the complete import flow including:
 * - File parsing
 * - Deduplication
 * - Database operations (batch creation, transaction insertion)
 *
 * Uses mock repositories for testing.
 */

import { ImportService } from '../../../../src/services/import/ImportService';
import { CsvParser } from '../../../../src/services/import/CsvParser';
import { OfxParser } from '../../../../src/services/import/OfxParser';
import { ExcelParser } from '../../../../src/services/import/ExcelParser';
import { DedupeEngine } from '../../../../src/services/import/DedupeEngine';
import type { ITransactionRepository } from '../../../../src/repositories/interfaces/ITransactionRepository';
import type { IImportBatchRepository } from '../../../../src/repositories/interfaces/IImportBatchRepository';
import type {
  Transaction,
  ImportBatch,
  CreateTransactionDTO,
  CreateImportBatchDTO,
  UpdateTransactionDTO,
} from '../../../../src/types';

// Mock expo modules
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

// Mock expo-crypto for UUID generation
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `test-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

// Mock the repository modules to prevent actual imports
jest.mock('../../../../src/repositories/TransactionRepository', () => ({
  transactionRepository: {},
}));

jest.mock('../../../../src/repositories/ImportBatchRepository', () => ({
  importBatchRepository: {},
}));

import * as FileSystem from 'expo-file-system';

// In-memory storage for mock repositories
interface MockDbData {
  importBatches: Map<string, ImportBatch>;
  transactions: Map<string, Transaction>;
}

/**
 * Creates mock repositories with in-memory storage for integration testing
 */
function createMockRepositoriesWithStorage(mockDbData: MockDbData) {
  const mockTransactionRepo: ITransactionRepository = {
    getAll: jest.fn(() => Promise.resolve(Array.from(mockDbData.transactions.values()))),
    getById: jest.fn((id: string) => Promise.resolve(mockDbData.transactions.get(id) || null)),
    getByMonth: jest.fn((month: string) => {
      const txs = Array.from(mockDbData.transactions.values()).filter(
        (tx) => tx.referenceMonth === month
      );
      return Promise.resolve(txs);
    }),
    getByBatchId: jest.fn((batchId: string) => {
      const txs = Array.from(mockDbData.transactions.values()).filter(
        (tx) => tx.batchId === batchId
      );
      return Promise.resolve(txs);
    }),
    getNeedingReview: jest.fn(() => {
      const txs = Array.from(mockDbData.transactions.values()).filter((tx) => tx.needsReview);
      return Promise.resolve(txs);
    }),
    getReviewCount: jest.fn(() => {
      const count = Array.from(mockDbData.transactions.values()).filter(
        (tx) => tx.needsReview
      ).length;
      return Promise.resolve(count);
    }),
    create: jest.fn((data: CreateTransactionDTO) => {
      const id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tx: Transaction = {
        id,
        title: data.title,
        date: data.date,
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId || null,
        originId: data.originId || null,
        batchId: data.batchId || null,
        referenceMonth: data.referenceMonth,
        needsReview: data.needsReview ?? true,
        isExcludedFromTotals: data.isExcludedFromTotals ?? false,
        duplicateOf: null,
        installmentGroupId: data.installmentGroupId ?? null,
        recurringId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDbData.transactions.set(id, tx);
      return Promise.resolve(tx);
    }),
    createMany: jest.fn((dataList: CreateTransactionDTO[]) => {
      const results = dataList.map((data, index) => {
        const id = `tx-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        const tx: Transaction = {
          id,
          title: data.title,
          date: data.date,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId || null,
          originId: data.originId || null,
          batchId: data.batchId || null,
          referenceMonth: data.referenceMonth,
          needsReview: data.needsReview ?? true,
          isExcludedFromTotals: data.isExcludedFromTotals ?? false,
          duplicateOf: null,
          installmentGroupId: data.installmentGroupId ?? null,
          recurringId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockDbData.transactions.set(id, tx);
        return tx;
      });
      return Promise.resolve(results);
    }),
    update: jest.fn((id: string, data: UpdateTransactionDTO) => {
      const tx = mockDbData.transactions.get(id);
      if (tx) {
        Object.assign(tx, data, { updatedAt: new Date() });
        return Promise.resolve(tx);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn((id: string) => {
      mockDbData.transactions.delete(id);
      return Promise.resolve();
    }),
    deleteMany: jest.fn((ids: string[]) => {
      ids.forEach((id) => mockDbData.transactions.delete(id));
      return Promise.resolve();
    }),
    deleteByBatchId: jest.fn((batchId: string) => {
      const toDelete = Array.from(mockDbData.transactions.entries())
        .filter(([_, tx]) => tx.batchId === batchId)
        .map(([id]) => id);
      toDelete.forEach((id) => mockDbData.transactions.delete(id));
      return Promise.resolve();
    }),
    markAsReviewed: jest.fn((id: string) => {
      const tx = mockDbData.transactions.get(id);
      if (tx) {
        tx.needsReview = false;
        tx.updatedAt = new Date();
        return Promise.resolve(tx);
      }
      return Promise.resolve(null);
    }),
    markManyAsReviewed: jest.fn((ids: string[]) => {
      ids.forEach((id) => {
        const tx = mockDbData.transactions.get(id);
        if (tx) {
          tx.needsReview = false;
          tx.updatedAt = new Date();
        }
      });
      return Promise.resolve();
    }),
    setCategory: jest.fn((id: string, categoryId: string | null) => {
      const tx = mockDbData.transactions.get(id);
      if (tx) {
        tx.categoryId = categoryId;
        tx.updatedAt = new Date();
        return Promise.resolve(tx);
      }
      return Promise.resolve(null);
    }),
  };

  const mockBatchRepo: IImportBatchRepository = {
    getById: jest.fn((id: string) => Promise.resolve(mockDbData.importBatches.get(id) || null)),
    getAll: jest.fn(() => Promise.resolve(Array.from(mockDbData.importBatches.values()))),
    create: jest.fn((data: CreateImportBatchDTO) => {
      const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const batch: ImportBatch = {
        id,
        fileName: data.fileName,
        fileType: data.fileType,
        importedAt: new Date(),
        transactionCount: data.transactionCount,
        status: 'pending',
      };
      mockDbData.importBatches.set(id, batch);
      return Promise.resolve(batch);
    }),
    update: jest.fn((id: string, data: Partial<ImportBatch>) => {
      const batch = mockDbData.importBatches.get(id);
      if (batch) {
        Object.assign(batch, data);
        return Promise.resolve(batch);
      }
      return Promise.resolve(null);
    }),
    markAsReviewing: jest.fn((id: string) => {
      const batch = mockDbData.importBatches.get(id);
      if (batch) {
        batch.status = 'reviewing';
        return Promise.resolve(batch);
      }
      return Promise.resolve(null);
    }),
    markAsCompleted: jest.fn((id: string) => {
      const batch = mockDbData.importBatches.get(id);
      if (batch) {
        batch.status = 'completed';
        return Promise.resolve(batch);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn((id: string) => {
      mockDbData.importBatches.delete(id);
      return Promise.resolve();
    }),
  };

  return { mockTransactionRepo, mockBatchRepo };
}

describe('ImportService Integration Tests', () => {
  let importService: ImportService;
  let mockDbData: MockDbData;
  let mockTransactionRepo: ITransactionRepository;
  let mockBatchRepo: IImportBatchRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset in-memory storage
    mockDbData = {
      importBatches: new Map(),
      transactions: new Map(),
    };

    // Create mock repositories with in-memory storage
    const repos = createMockRepositoriesWithStorage(mockDbData);
    mockTransactionRepo = repos.mockTransactionRepo;
    mockBatchRepo = repos.mockBatchRepo;

    // Create real instances of parsers and dedupe engine
    const csvParser = new CsvParser();
    const ofxParser = new OfxParser();
    const excelParser = new ExcelParser();
    const dedupeEngine = new DedupeEngine();

    importService = new ImportService(
      csvParser,
      ofxParser,
      excelParser,
      dedupeEngine,
      mockTransactionRepo,
      mockBatchRepo
    );
  });

  describe('Complete CSV Import Flow', () => {
    const csvContent = `date,amount,description
2024-01-15,1500.00,Salary Payment
2024-01-16,-45.50,Grocery Store
2024-01-17,-120.00,Electric Bill
2024-01-18,50.00,Refund`;

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);
    });

    it('should import CSV file and create batch with transactions', async () => {
      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(4);
      expect(result.duplicatesFound).toBe(0);
      expect(result.batch).toBeDefined();
      expect(result.batch?.status).toBe('reviewing');

      // Verify batch was created
      expect(mockBatchRepo.create).toHaveBeenCalledWith({
        fileName: 'statement.csv',
        fileType: 'csv',
        transactionCount: 4,
      });

      // Verify transactions were created
      expect(mockTransactionRepo.createMany).toHaveBeenCalled();
      const createdTxs = (mockTransactionRepo.createMany as jest.Mock).mock.calls[0][0];
      expect(createdTxs).toHaveLength(4);

      // Verify transaction data
      expect(createdTxs[0].amount).toBe(1500);
      expect(createdTxs[0].description).toBe('Salary Payment');
      expect(createdTxs[0].needsReview).toBe(true);
      expect(createdTxs[0].referenceMonth).toBe('2024-01');

      // Verify batch was marked as reviewing
      expect(mockBatchRepo.markAsReviewing).toHaveBeenCalled();
    });

    it('should handle CSV with different delimiters', async () => {
      const semicolonCsv = `date;amount;description
2024-01-15;1500,00;Salary Payment
2024-01-16;-45,50;Grocery Store`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(semicolonCsv);

      const result = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv',
        { locale: 'pt-BR' }
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
    });

    it('should detect duplicates when importing same file twice', async () => {
      // First import
      const firstResult = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      expect(firstResult.success).toBe(true);
      expect(firstResult.transactionsImported).toBe(4);

      // Second import of same content
      const secondResult = await importService.importFile(
        'file:///path/to/statement.csv',
        'statement.csv',
        'csv'
      );

      // All transactions should be detected as duplicates
      expect(secondResult.success).toBe(false);
      expect(secondResult.error?.code).toBe('NO_TRANSACTIONS');
      expect(secondResult.duplicatesFound).toBe(4);
    });

    it('should import only unique transactions when some are duplicates', async () => {
      // First import with 2 transactions
      const firstCsv = `date,amount,description
2024-01-15,1500.00,Salary Payment
2024-01-16,-45.50,Grocery Store`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(firstCsv);

      await importService.importFile('file:///path/to/first.csv', 'first.csv', 'csv');

      // Second import with 2 new + 2 duplicate transactions
      const secondCsv = `date,amount,description
2024-01-15,1500.00,Salary Payment
2024-01-16,-45.50,Grocery Store
2024-01-17,-120.00,Electric Bill
2024-01-18,50.00,Refund`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(secondCsv);

      const result = await importService.importFile(
        'file:///path/to/second.csv',
        'second.csv',
        'csv'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2); // Only new transactions
      expect(result.duplicatesFound).toBe(2); // Duplicates detected
    });
  });

  describe('Complete OFX Import Flow', () => {
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1500.00
<FITID>202401150001
<NAME>Salary Payment
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240116
<TRNAMT>-45.50
<FITID>202401160001
<NAME>Grocery Store
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ofxContent);
    });

    it('should import OFX file and create batch with transactions', async () => {
      const result = await importService.importFile(
        'file:///path/to/statement.ofx',
        'statement.ofx',
        'ofx'
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
      expect(result.batch).toBeDefined();
      expect(result.batch?.fileType).toBe('ofx');

      // Verify transactions were created with correct data
      const createdTxs = (mockTransactionRepo.createMany as jest.Mock).mock.calls[0][0];
      expect(createdTxs).toHaveLength(2);
      expect(createdTxs[0].amount).toBe(1500);
      expect(createdTxs[1].amount).toBe(-45.5);
    });

    it('should use FITID for deduplication in OFX imports', async () => {
      // First import
      await importService.importFile('file:///path/to/statement.ofx', 'statement.ofx', 'ofx');

      // Second import of same OFX (same FITIDs)
      const result = await importService.importFile(
        'file:///path/to/statement.ofx',
        'statement.ofx',
        'ofx'
      );

      expect(result.success).toBe(false);
      expect(result.duplicatesFound).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('');

      const result = await importService.importFile(
        'file:///path/to/empty.csv',
        'empty.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMPTY_FILE');
    });

    it('should handle file with only headers (no data)', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('date,amount,description');

      const result = await importService.importFile(
        'file:///path/to/headers-only.csv',
        'headers-only.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
    });

    it('should handle malformed CSV with parse errors', async () => {
      const malformedCsv = `date,amount,description
2024-01-15,1500.00,Valid Transaction
invalid-date,not-a-number,Invalid Transaction
2024-01-17,-120.00,Another Valid`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(malformedCsv);

      const result = await importService.importFile(
        'file:///path/to/malformed.csv',
        'malformed.csv',
        'csv'
      );

      // Should still succeed with valid transactions
      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(2);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle malformed OFX', async () => {
      const malformedOfx = `OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
</STMTTRN>
</OFX>`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(malformedOfx);

      const result = await importService.importFile(
        'file:///path/to/malformed.ofx',
        'malformed.ofx',
        'ofx'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_TRANSACTIONS');
    });

    it('should handle file read errors', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await importService.importFile(
        'file:///path/to/protected.csv',
        'protected.csv',
        'csv'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_READ_ERROR');
    });
  });

  describe('Reference Month Calculation', () => {
    it('should calculate correct reference months for transactions', async () => {
      const csvContent = `date,amount,description
2024-01-15,100.00,January Transaction
2024-02-20,200.00,February Transaction
2024-12-31,300.00,December Transaction`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

      await importService.importFile('file:///path/to/multi-month.csv', 'multi-month.csv', 'csv');

      const createdTxs = (mockTransactionRepo.createMany as jest.Mock).mock.calls[0][0];

      expect(createdTxs[0].referenceMonth).toBe('2024-01');
      expect(createdTxs[1].referenceMonth).toBe('2024-02');
      expect(createdTxs[2].referenceMonth).toBe('2024-12');
    });
  });

  describe('Import Options', () => {
    it('should skip deduplication when skipDedupe is true', async () => {
      const csvContent = `date,amount,description
2024-01-15,100.00,Test Transaction`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

      // First import
      await importService.importFile('file:///path/to/test.csv', 'test.csv', 'csv');

      // Second import with skipDedupe
      const result = await importService.importFile('file:///path/to/test.csv', 'test.csv', 'csv', {
        skipDedupe: true,
      });

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(1);
      expect(result.duplicatesFound).toBe(0);
    });

    it('should respect dedupeConfidenceThreshold option', async () => {
      const csvContent1 = `date,amount,description
2024-01-15,100.00,Grocery Store Purchase`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent1);

      // First import
      await importService.importFile('file:///path/to/first.csv', 'first.csv', 'csv');

      // Second import with slightly different description
      const csvContent2 = `date,amount,description
2024-01-15,100.00,Grocery Store`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent2);

      // With high threshold, should not detect as duplicate
      const result = await importService.importFile(
        'file:///path/to/second.csv',
        'second.csv',
        'csv',
        { dedupeConfidenceThreshold: 0.99 }
      );

      expect(result.success).toBe(true);
      expect(result.transactionsImported).toBe(1);
    });
  });

  describe('File Type Detection', () => {
    it('should auto-detect CSV from content when extension is unknown', async () => {
      const csvContent = `date,amount,description
2024-01-15,100.00,Test`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(csvContent);

      const result = await importService.importFile('file:///path/to/unknown_file', 'unknown_file');

      expect(result.success).toBe(true);
    });

    it('should auto-detect OFX from content when extension is unknown', async () => {
      const ofxContent = `OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Test
</STMTTRN>
</OFX>`;

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ofxContent);

      const result = await importService.importFile('file:///path/to/unknown_file', 'unknown_file');

      expect(result.success).toBe(true);
    });
  });
});
