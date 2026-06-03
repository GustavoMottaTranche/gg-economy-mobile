/**
 * Unit Tests for CategoryGoalRepository
 *
 * Tests that CategoryGoalRepository correctly interacts with the database
 * via Drizzle ORM. Uses mocking to verify operations without requiring
 * a real database connection.
 *
 * **Validates: Requirements 6.1, 6.2, 6.5, 6.6, 6.7, 2.2, 2.4, 2.5**
 *
 * @module CategoryGoalRepository.test
 */

import {
  CategoryGoalRepository,
  categoryGoalRepository,
} from '../../../src/repositories/CategoryGoalRepository';
import type { CategoryGoal } from '../../../src/types/goal';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-001'),
}));

// Mock the db client
jest.mock('../../../src/db/client', () => ({
  getDb: jest.fn(),
}));

// Mock drizzle-orm operators (including relations used by schema.ts)
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ column: col, value: val, op: 'eq' })),
  sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    type: 'sql',
  })),
  relations: jest.fn(() => ({})),
}));

// Mock drizzle-orm/sqlite-core (schema table/column definitions)
jest.mock('drizzle-orm/sqlite-core', () => ({
  sqliteTable: jest.fn((_name: string, columns: unknown) => columns),
  text: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
    references: jest.fn().mockReturnThis(),
  })),
  integer: jest.fn(() => ({
    primaryKey: jest.fn().mockReturnThis(),
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  real: jest.fn(() => ({
    notNull: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis(),
  })),
  index: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

import { getDb } from '../../../src/db/client';
import { randomUUID } from 'expo-crypto';

const mockedGetDb = getDb as jest.MockedFunction<typeof getDb>;
const mockedRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

// Helper to create a mock query builder chain
function createMockDbChain() {
  const chain: Record<string, jest.Mock> = {};

  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue([]);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  chain.delete = jest.fn().mockReturnValue(chain);

  return chain;
}

describe('CategoryGoalRepository', () => {
  let repository: CategoryGoalRepository;
  let mockDb: ReturnType<typeof createMockDbChain>;

  const sampleGoal: CategoryGoal = {
    id: 'goal-001',
    categoryId: 'cat-001',
    amount: 50000,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    repository = new CategoryGoalRepository();
    mockDb = createMockDbChain();
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);
    jest.clearAllMocks();
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);
    mockedRandomUUID.mockReturnValue('mock-uuid-001');
  });

  describe('singleton instance', () => {
    it('should export a singleton categoryGoalRepository instance', () => {
      expect(categoryGoalRepository).toBeInstanceOf(CategoryGoalRepository);
    });
  });

  describe('getByCategoryId', () => {
    it('should return a CategoryGoal when found', async () => {
      mockDb.limit.mockResolvedValue([sampleGoal]);

      const result = await repository.getByCategoryId('cat-001');

      expect(mockedGetDb).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(sampleGoal);
    });

    it('should return null when no goal exists for the category', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await repository.getByCategoryId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllForVariableCategories', () => {
    it('should return all goals for variable expense categories', async () => {
      const goals = [
        sampleGoal,
        { ...sampleGoal, id: 'goal-002', categoryId: 'cat-002', amount: 30000 },
      ];
      mockDb.where.mockResolvedValue(goals);

      const result = await repository.getAllForVariableCategories();

      expect(mockedGetDb).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.innerJoin).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(goals);
    });

    it('should return empty array when no variable categories have goals', async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await repository.getAllForVariableCategories();

      expect(result).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should insert a new goal and return it', async () => {
      // The upsert calls getByCategoryId after insert, so we need to mock
      // the second call's chain differently
      const insertChain = createMockDbChain();
      const selectChain = createMockDbChain();

      let callCount = 0;
      mockedGetDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain as unknown as ReturnType<typeof getDb>;
        return selectChain as unknown as ReturnType<typeof getDb>;
      });

      selectChain.limit.mockResolvedValue([sampleGoal]);

      const result = await repository.upsert('cat-001', 50000);

      expect(insertChain.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-uuid-001',
          categoryId: 'cat-001',
          amount: 50000,
        })
      );
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
      expect(result).toEqual(sampleGoal);
    });

    it('should generate a UUID for the new goal id', async () => {
      const insertChain = createMockDbChain();
      const selectChain = createMockDbChain();

      let callCount = 0;
      mockedGetDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain as unknown as ReturnType<typeof getDb>;
        return selectChain as unknown as ReturnType<typeof getDb>;
      });

      selectChain.limit.mockResolvedValue([sampleGoal]);

      await repository.upsert('cat-001', 50000);

      expect(mockedRandomUUID).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mock-uuid-001' })
      );
    });

    it('should use onConflictDoUpdate targeting categoryId', async () => {
      const insertChain = createMockDbChain();
      const selectChain = createMockDbChain();

      let callCount = 0;
      mockedGetDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain as unknown as ReturnType<typeof getDb>;
        return selectChain as unknown as ReturnType<typeof getDb>;
      });

      selectChain.limit.mockResolvedValue([sampleGoal]);

      await repository.upsert('cat-001', 50000);

      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            amount: expect.anything(),
            updatedAt: expect.anything(),
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a goal by categoryId', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await repository.delete('cat-001');

      expect(mockedGetDb).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should not throw when deleting a non-existent goal', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await expect(repository.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('ICategoryGoalRepository interface compliance', () => {
    it('should implement all required interface methods', () => {
      expect(typeof repository.getByCategoryId).toBe('function');
      expect(typeof repository.getAllForVariableCategories).toBe('function');
      expect(typeof repository.upsert).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });
  });
});
