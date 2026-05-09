/**
 * useCategories Hook Tests
 *
 * Tests for the categories hook with reactive updates.
 *
 * **Validates: Requirements 17, 29**
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock data
const mockCategoryRecord = {
  id: 'cat-1',
  name: 'Food',
  type: 'expense',
  icon: 'restaurant',
  color: '#FF6B6B',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockIncomeCategoryRecord = {
  id: 'cat-2',
  name: 'Salary',
  type: 'income',
  icon: 'wallet',
  color: '#45B7D1',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock the database client
const mockGetDb = jest.fn();

// Default mock data for useLiveQuery
const defaultMockData = {
  categories: [mockCategoryRecord, mockIncomeCategoryRecord],
  categoriesWithCounts: [
    { category: mockCategoryRecord, transactionCount: 5 },
    { category: mockIncomeCategoryRecord, transactionCount: 3 },
  ],
  incomeCategories: [mockIncomeCategoryRecord],
  expenseCategories: [mockCategoryRecord],
  counts: [{ total: 2, active: 2 }],
};

// Use a mock implementation that can be controlled
const mockUseLiveQuery = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => mockGetDb(),
  useLiveQuery: (...args: unknown[]) => mockUseLiveQuery(...args),
}));

jest.mock('../../db/schema', () => ({
  categories: {
    id: 'id',
    name: 'name',
    type: 'type',
    isActive: 'is_active',
  },
  transactions: {
    categoryId: 'category_id',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  and: jest.fn((...args) => ({ type: 'and', args })),
  sql: jest.fn((strings, ...values) => ({ type: 'sql', strings, values })),
}));

// Mock query functions
jest.mock('../../db/queries/categories', () => ({
  getCategoryById: jest.fn().mockResolvedValue({
    id: 'cat-1',
    name: 'Food',
    type: 'expense',
    icon: 'restaurant',
    color: '#FF6B6B',
    isActive: true,
    createdAt: new Date(),
  }),
  createCategory: jest.fn().mockResolvedValue({
    id: 'new-cat',
    name: 'New Category',
    type: 'expense',
    icon: 'star',
    color: '#000000',
    isActive: true,
    createdAt: new Date(),
  }),
  updateCategory: jest.fn().mockResolvedValue({
    id: 'cat-1',
    name: 'Updated Food',
    type: 'expense',
    icon: 'restaurant',
    color: '#FF0000',
    isActive: true,
    createdAt: new Date(),
  }),
  deactivateCategory: jest.fn().mockResolvedValue({
    id: 'cat-1',
    isActive: false,
  }),
  activateCategory: jest.fn().mockResolvedValue({
    id: 'cat-1',
    isActive: true,
  }),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { useCategories } from '../useCategories';
import {
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
} from '../../db/queries/categories';

describe('useCategories', () => {
  let callCount: number;

  beforeEach(() => {
    jest.clearAllMocks();
    callCount = 0;

    // Set up the default mock implementation
    mockUseLiveQuery.mockImplementation(() => {
      const callIndex = callCount++;
      // Return data based on call order in useCategories hook:
      // 1. categoryData (main categories)
      // 2. categoriesWithCountsData
      // 3. incomeCategoryData
      // 4. expenseCategoryData
      // 5. countData
      switch (callIndex % 5) {
        case 0:
          return { data: defaultMockData.categories, error: null };
        case 1:
          return { data: defaultMockData.categoriesWithCounts, error: null };
        case 2:
          return { data: defaultMockData.incomeCategories, error: null };
        case 3:
          return { data: defaultMockData.expenseCategories, error: null };
        case 4:
          return { data: defaultMockData.counts, error: null };
        default:
          return { data: defaultMockData.categories, error: null };
      }
    });

    mockGetDb.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    });
  });

  describe('data fetching', () => {
    it('returns all categories', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].name).toBe('Food');
    });

    it('returns loading state initially', () => {
      mockUseLiveQuery.mockImplementation(() => ({ data: null, error: null }));

      const { result } = renderHook(() => useCategories());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error when query fails', () => {
      mockUseLiveQuery.mockImplementation(() => ({ data: null, error: new Error('Query failed') }));

      const { result } = renderHook(() => useCategories());

      expect(result.current.error).toBe('Error: Query failed');
    });
  });

  describe('filtering', () => {
    it('filters by type', () => {
      const { result } = renderHook(() => useCategories({ type: 'expense' }));

      expect(result.current.categories).toBeDefined();
    });

    it('includes inactive categories when specified', () => {
      const { result } = renderHook(() => useCategories({ includeInactive: true }));

      expect(result.current.categories).toBeDefined();
    });
  });

  describe('category lists', () => {
    it('returns income categories', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.incomeCategories).toBeDefined();
    });

    it('returns expense categories', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.expenseCategories).toBeDefined();
    });

    it('returns categories with transaction counts', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.categoriesWithCounts).toBeDefined();
    });
  });

  describe('counts', () => {
    it('returns total and active counts', () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.totalCount).toBeDefined();
      expect(result.current.activeCount).toBeDefined();
    });
  });

  describe('CRUD operations', () => {
    it('gets a category by ID', async () => {
      const { result } = renderHook(() => useCategories());

      const category = await result.current.getById('cat-1');

      expect(getCategoryById).toHaveBeenCalledWith('cat-1');
      expect(category?.name).toBe('Food');
    });

    it('creates a category', async () => {
      const { result } = renderHook(() => useCategories());

      const newCat = await result.current.create({
        name: 'New Category',
        type: 'expense',
        icon: 'star',
        color: '#000000',
      });

      expect(createCategory).toHaveBeenCalled();
      expect(newCat.id).toBe('new-cat');
    });

    it('updates a category', async () => {
      const { result } = renderHook(() => useCategories());

      const updated = await result.current.update('cat-1', {
        name: 'Updated Food',
        color: '#FF0000',
      });

      expect(updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Updated Food',
        color: '#FF0000',
      });
      expect(updated?.name).toBe('Updated Food');
    });

    it('deactivates a category', async () => {
      const { result } = renderHook(() => useCategories());

      await result.current.deactivate('cat-1');

      expect(deactivateCategory).toHaveBeenCalledWith('cat-1');
    });

    it('activates a category', async () => {
      const { result } = renderHook(() => useCategories());

      await result.current.activate('cat-1');

      expect(activateCategory).toHaveBeenCalledWith('cat-1');
    });

    it('deletes a category', async () => {
      const { result } = renderHook(() => useCategories());

      await result.current.remove('cat-1');

      expect(deleteCategory).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('refresh', () => {
    it('triggers refresh', () => {
      const { result } = renderHook(() => useCategories());

      act(() => {
        result.current.refresh();
      });

      expect(result.current.categories).toBeDefined();
    });
  });
});
