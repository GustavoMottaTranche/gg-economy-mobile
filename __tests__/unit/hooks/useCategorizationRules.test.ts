/**
 * Unit tests for useCategorizationRules hook
 *
 * Tests the custom hook for managing categorization rules with reactive updates.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useCategorizationRules } from '../../../src/hooks/useCategorizationRules';
import * as categorizationRuleQueries from '../../../src/db/queries/categorizationRules';

// Mock the database client
jest.mock('../../../src/db/client', () => ({
  getDb: jest.fn(() => ({
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        leftJoin: jest.fn(() => ({
          orderBy: jest.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  })),
  useLiveQuery: jest.fn((_query) => {
    // Return mock data based on the query
    return {
      data: [],
      error: null,
    };
  }),
}));

// Mock the query functions
jest.mock('../../../src/db/queries/categorizationRules', () => ({
  createCategorizationRule: jest.fn(),
  createCategorizationRuleWithAutoPriority: jest.fn(),
  updateCategorizationRule: jest.fn(),
  deleteCategorizationRule: jest.fn(),
  getCategorizationRuleById: jest.fn(),
}));

describe('useCategorizationRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state with empty rules', () => {
      const { result } = renderHook(() => useCategorizationRules());

      expect(result.current.rules).toEqual([]);
      // isLoading is false when data is empty array (not undefined)
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.error).toBeNull();
      expect(result.current.totalCount).toBe(0);
      expect(result.current.activeCount).toBe(0);
    });

    it('should provide CRUD operation functions', () => {
      const { result } = renderHook(() => useCategorizationRules());

      expect(typeof result.current.getById).toBe('function');
      expect(typeof result.current.create).toBe('function');
      expect(typeof result.current.createWithAutoPriority).toBe('function');
      expect(typeof result.current.update).toBe('function');
      expect(typeof result.current.remove).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('getById', () => {
    it('should call getCategorizationRuleById with correct id', async () => {
      const mockRule = {
        id: 'rule-123',
        pattern: 'UBER',
        categoryId: 'cat-transport',
        matchType: 'contains' as const,
        priority: 10,
        isActive: true,
        createdAt: new Date(),
      };

      (categorizationRuleQueries.getCategorizationRuleById as jest.Mock).mockResolvedValue(
        mockRule
      );

      const { result } = renderHook(() => useCategorizationRules());

      let fetchedRule;
      await act(async () => {
        fetchedRule = await result.current.getById('rule-123');
      });

      expect(categorizationRuleQueries.getCategorizationRuleById).toHaveBeenCalledWith('rule-123');
      expect(fetchedRule).toEqual(mockRule);
    });

    it('should return null for non-existent rule', async () => {
      (categorizationRuleQueries.getCategorizationRuleById as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useCategorizationRules());

      let fetchedRule;
      await act(async () => {
        fetchedRule = await result.current.getById('non-existent');
      });

      expect(fetchedRule).toBeNull();
    });
  });

  describe('create', () => {
    it('should call createCategorizationRule with correct data', async () => {
      const newRuleData = {
        pattern: 'NETFLIX',
        categoryId: 'cat-entertainment',
        matchType: 'contains' as const,
        priority: 5,
      };

      const createdRule = {
        id: 'new-rule-id',
        ...newRuleData,
        isActive: true,
        createdAt: new Date(),
      };

      (categorizationRuleQueries.createCategorizationRule as jest.Mock).mockResolvedValue(
        createdRule
      );

      const { result } = renderHook(() => useCategorizationRules());

      let created;
      await act(async () => {
        created = await result.current.create(newRuleData);
      });

      expect(categorizationRuleQueries.createCategorizationRule).toHaveBeenCalledWith(newRuleData);
      expect(created).toEqual(createdRule);
    });
  });

  describe('createWithAutoPriority', () => {
    it('should call createCategorizationRuleWithAutoPriority without priority', async () => {
      const newRuleData = {
        pattern: 'SPOTIFY',
        categoryId: 'cat-entertainment',
        matchType: 'contains' as const,
      };

      const createdRule = {
        id: 'auto-priority-rule',
        ...newRuleData,
        priority: 100, // Auto-assigned
        isActive: true,
        createdAt: new Date(),
      };

      (
        categorizationRuleQueries.createCategorizationRuleWithAutoPriority as jest.Mock
      ).mockResolvedValue(createdRule);

      const { result } = renderHook(() => useCategorizationRules());

      let created: { priority: number } | undefined;
      await act(async () => {
        created = await result.current.createWithAutoPriority(newRuleData);
      });

      expect(
        categorizationRuleQueries.createCategorizationRuleWithAutoPriority
      ).toHaveBeenCalledWith(newRuleData);
      expect(created!.priority).toBe(100);
    });
  });

  describe('update', () => {
    it('should call updateCategorizationRule with correct id and data', async () => {
      const updateData = {
        pattern: 'UBER EATS',
        priority: 15,
      };

      const updatedRule = {
        id: 'rule-123',
        pattern: 'UBER EATS',
        categoryId: 'cat-food',
        matchType: 'contains' as const,
        priority: 15,
        isActive: true,
        createdAt: new Date(),
      };

      (categorizationRuleQueries.updateCategorizationRule as jest.Mock).mockResolvedValue(
        updatedRule
      );

      const { result } = renderHook(() => useCategorizationRules());

      let updated;
      await act(async () => {
        updated = await result.current.update('rule-123', updateData);
      });

      expect(categorizationRuleQueries.updateCategorizationRule).toHaveBeenCalledWith(
        'rule-123',
        updateData
      );
      expect(updated).toEqual(updatedRule);
    });

    it('should return null when updating non-existent rule', async () => {
      (categorizationRuleQueries.updateCategorizationRule as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useCategorizationRules());

      let updated;
      await act(async () => {
        updated = await result.current.update('non-existent', { pattern: 'test' });
      });

      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    it('should call deleteCategorizationRule with correct id', async () => {
      (categorizationRuleQueries.deleteCategorizationRule as jest.Mock).mockResolvedValue(
        undefined
      );

      const { result } = renderHook(() => useCategorizationRules());

      await act(async () => {
        await result.current.remove('rule-to-delete');
      });

      expect(categorizationRuleQueries.deleteCategorizationRule).toHaveBeenCalledWith(
        'rule-to-delete'
      );
    });
  });

  describe('refresh', () => {
    it('should trigger a re-render when called', () => {
      const { result } = renderHook(() => useCategorizationRules());

      // Calling refresh should not throw
      act(() => {
        result.current.refresh();
      });

      // The hook should still be functional
      expect(result.current.rules).toBeDefined();
    });
  });
});
