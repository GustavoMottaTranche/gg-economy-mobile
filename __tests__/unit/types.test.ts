/**
 * Unit tests for TypeScript types
 * Validates that types are correctly defined and can be used
 */
import type {
  Transaction,
  CreateTransactionDTO,
  Category,
  CategoryType,
  ImportBatch,
  FileType,
  Origin,
  OriginType,
  UserPreference,
  PreferenceKey,
  CategorizationRule,
  MatchType,
  BackupMetadata,
} from '../../src/types';

describe('TypeScript Types', () => {
  describe('Transaction', () => {
    it('should allow creating a valid transaction object', () => {
      const transaction: Transaction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        date: new Date('2024-01-15'),
        amount: -5000, // -50.00 in cents
        description: 'Grocery Store',
        title: '',
        categoryId: 'cat-123',
        originId: 'origin-456',
        batchId: 'batch-789',
        referenceMonth: '2024-01',
        needsReview: false,
        isExcludedFromTotals: false,
        duplicateOf: null,
        installmentGroupId: null,
        recurringId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transaction.id).toBeDefined();
      expect(transaction.amount).toBe(-5000);
      expect(transaction.needsReview).toBe(false);
    });

    it('should allow nullable fields', () => {
      const transaction: Transaction = {
        id: '123',
        date: new Date(),
        amount: 1000,
        description: 'Test',
        title: '',
        categoryId: null,
        originId: null,
        batchId: null,
        referenceMonth: '2024-01',
        needsReview: true,
        isExcludedFromTotals: false,
        duplicateOf: null,
        installmentGroupId: null,
        recurringId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(transaction.categoryId).toBeNull();
      expect(transaction.originId).toBeNull();
      expect(transaction.batchId).toBeNull();
    });
  });

  describe('CreateTransactionDTO', () => {
    it('should allow creating a DTO with required fields only', () => {
      const dto: CreateTransactionDTO = {
        date: new Date(),
        amount: 1000,
        description: 'Test transaction',
        title: '',
        referenceMonth: '2024-01',
      };

      expect(dto.date).toBeDefined();
      expect(dto.categoryId).toBeUndefined();
    });

    it('should allow creating a DTO with all fields', () => {
      const dto: CreateTransactionDTO = {
        date: new Date(),
        amount: 1000,
        description: 'Test transaction',
        title: '',
        referenceMonth: '2024-01',
        categoryId: 'cat-123',
        originId: 'origin-456',
        batchId: 'batch-789',
        needsReview: true,
        isExcludedFromTotals: false,
      };

      expect(dto.categoryId).toBe('cat-123');
    });
  });

  describe('Category', () => {
    it('should allow creating income and expense categories', () => {
      const incomeCategory: Category = {
        id: 'cat-1',
        name: 'Salary',
        type: 'income',
        icon: 'cash',
        color: '#4CAF50',
        isActive: true,
        expenseGroup: null,
        createdAt: new Date(),
      };

      const expenseCategory: Category = {
        id: 'cat-2',
        name: 'Food',
        type: 'expense',
        icon: 'restaurant',
        color: '#F44336',
        isActive: true,
        expenseGroup: null,
        createdAt: new Date(),
      };

      expect(incomeCategory.type).toBe('income');
      expect(expenseCategory.type).toBe('expense');
    });

    it('should validate CategoryType', () => {
      const validTypes: CategoryType[] = ['income', 'expense'];
      expect(validTypes).toHaveLength(2);
    });
  });

  describe('ImportBatch', () => {
    it('should allow creating import batches with different file types', () => {
      const csvBatch: ImportBatch = {
        id: 'batch-1',
        fileName: 'statement.csv',
        fileType: 'csv',
        importedAt: new Date(),
        transactionCount: 50,
        status: 'pending',
      };

      const ofxBatch: ImportBatch = {
        id: 'batch-2',
        fileName: 'statement.ofx',
        fileType: 'ofx',
        importedAt: new Date(),
        transactionCount: 30,
        status: 'completed',
      };

      expect(csvBatch.fileType).toBe('csv');
      expect(ofxBatch.fileType).toBe('ofx');
    });

    it('should validate FileType', () => {
      const validTypes: FileType[] = ['csv', 'ofx', 'qif'];
      expect(validTypes).toHaveLength(3);
    });
  });

  describe('Origin', () => {
    it('should allow creating origins with different types', () => {
      const bankOrigin: Origin = {
        id: 'origin-1',
        name: 'Nubank',
        type: 'bank',
        createdAt: new Date(),
      };

      const creditCardOrigin: Origin = {
        id: 'origin-2',
        name: 'Itaú Platinum',
        type: 'credit_card',
        createdAt: new Date(),
      };

      expect(bankOrigin.type).toBe('bank');
      expect(creditCardOrigin.type).toBe('credit_card');
    });

    it('should validate OriginType', () => {
      const validTypes: OriginType[] = ['bank', 'credit_card', 'investment', 'other'];
      expect(validTypes).toHaveLength(4);
    });
  });

  describe('UserPreference', () => {
    it('should allow creating preferences', () => {
      const preference: UserPreference = {
        key: 'language',
        value: 'pt-BR',
        updatedAt: new Date(),
      };

      expect(preference.key).toBe('language');
      expect(preference.value).toBe('pt-BR');
    });

    it('should validate PreferenceKey', () => {
      const validKeys: PreferenceKey[] = [
        'language',
        'backup_frequency',
        'backup_time',
        'last_backup_time',
        'last_backup_status',
        'google_account_email',
      ];
      expect(validKeys).toHaveLength(6);
    });
  });

  describe('CategorizationRule', () => {
    it('should allow creating rules with different match types', () => {
      const containsRule: CategorizationRule = {
        id: 'rule-1',
        pattern: 'UBER',
        categoryId: 'cat-transport',
        matchType: 'contains',
        priority: 10,
        isActive: true,
        createdAt: new Date(),
      };

      const regexRule: CategorizationRule = {
        id: 'rule-2',
        pattern: '^PIX.*MERCADO',
        categoryId: 'cat-food',
        matchType: 'regex',
        priority: 5,
        isActive: true,
        createdAt: new Date(),
      };

      expect(containsRule.matchType).toBe('contains');
      expect(regexRule.matchType).toBe('regex');
    });

    it('should validate MatchType', () => {
      const validTypes: MatchType[] = ['contains', 'starts_with', 'ends_with', 'exact', 'regex'];
      expect(validTypes).toHaveLength(5);
    });
  });

  describe('BackupMetadata', () => {
    it('should allow creating backup metadata', () => {
      const backup: BackupMetadata = {
        id: 'drive-file-123',
        fileName: 'gg-economy-backup-2024-01-15.db',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        sizeBytes: 1024000,
        schemaVersion: 1,
      };

      expect(backup.id).toBe('drive-file-123');
      expect(backup.sizeBytes).toBe(1024000);
      expect(backup.schemaVersion).toBe(1);
    });
  });
});
