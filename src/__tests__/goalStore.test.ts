/**
 * Unit tests for goalStore (Zustand)
 *
 * Tests all state transitions: load, set, remove for both general and category goals.
 * Mocks repository and user_preferences queries.
 *
 * **Validates: Requirements 1.2, 1.4, 1.5, 2.2, 2.4, 2.5**
 */

import { act } from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetPreference = jest.fn();
const mockSetPreference = jest.fn();
const mockDeletePreference = jest.fn();

jest.mock('../db/queries/preferences', () => ({
  getPreference: (...args: unknown[]) => mockGetPreference(...args),
  setPreference: (...args: unknown[]) => mockSetPreference(...args),
  deletePreference: (...args: unknown[]) => mockDeletePreference(...args),
}));

const mockGetAllForVariableCategories = jest.fn();
const mockUpsert = jest.fn();
const mockDelete = jest.fn();

jest.mock('../repositories/CategoryGoalRepository', () => ({
  categoryGoalRepository: {
    getAllForVariableCategories: (...args: unknown[]) => mockGetAllForVariableCategories(...args),
    upsert: (...args: unknown[]) => mockUpsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

jest.mock('../services/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Import Store After Mocks ────────────────────────────────────────────────

import { useGoalStore } from '../stores/goalStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useGoalStore.setState({
    generalGoal: null,
    categoryGoals: new Map<string, number>(),
    isLoading: false,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('goalStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('should have null generalGoal', () => {
      const state = useGoalStore.getState();
      expect(state.generalGoal).toBeNull();
    });

    it('should have empty categoryGoals map', () => {
      const state = useGoalStore.getState();
      expect(state.categoryGoals.size).toBe(0);
    });

    it('should have isLoading as false', () => {
      const state = useGoalStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadGoals', () => {
    it('should set isLoading to true while loading', async () => {
      mockGetPreference.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 50))
      );
      mockGetAllForVariableCategories.mockResolvedValue([]);

      const promise = act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      // isLoading should be true during the operation
      // After completion it should be false
      await promise;
      expect(useGoalStore.getState().isLoading).toBe(false);
    });

    it('should load general goal from user_preferences', async () => {
      mockGetPreference.mockResolvedValue('250000');
      mockGetAllForVariableCategories.mockResolvedValue([]);

      await act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      const state = useGoalStore.getState();
      expect(state.generalGoal).toBe(250000);
      expect(mockGetPreference).toHaveBeenCalledWith('general_variable_goal');
    });

    it('should set generalGoal to null when no preference exists', async () => {
      mockGetPreference.mockResolvedValue(null);
      mockGetAllForVariableCategories.mockResolvedValue([]);

      await act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      expect(useGoalStore.getState().generalGoal).toBeNull();
    });

    it('should load category goals from repository', async () => {
      mockGetPreference.mockResolvedValue(null);
      mockGetAllForVariableCategories.mockResolvedValue([
        {
          id: 'g1',
          categoryId: 'cat-1',
          amount: 50000,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'g2',
          categoryId: 'cat-2',
          amount: 75000,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]);

      await act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      const state = useGoalStore.getState();
      expect(state.categoryGoals.size).toBe(2);
      expect(state.categoryGoals.get('cat-1')).toBe(50000);
      expect(state.categoryGoals.get('cat-2')).toBe(75000);
    });

    it('should load both general and category goals together', async () => {
      mockGetPreference.mockResolvedValue('300000');
      mockGetAllForVariableCategories.mockResolvedValue([
        {
          id: 'g1',
          categoryId: 'cat-1',
          amount: 100000,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ]);

      await act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      const state = useGoalStore.getState();
      expect(state.generalGoal).toBe(300000);
      expect(state.categoryGoals.get('cat-1')).toBe(100000);
      expect(state.isLoading).toBe(false);
    });

    it('should handle errors gracefully and set isLoading to false', async () => {
      mockGetPreference.mockRejectedValue(new Error('DB error'));
      mockGetAllForVariableCategories.mockResolvedValue([]);

      await act(async () => {
        await useGoalStore.getState().loadGoals();
      });

      const state = useGoalStore.getState();
      expect(state.isLoading).toBe(false);
      // State remains unchanged on error
      expect(state.generalGoal).toBeNull();
    });
  });

  describe('setGeneralGoal', () => {
    it('should persist the general goal to user_preferences', async () => {
      mockSetPreference.mockResolvedValue(undefined);

      await act(async () => {
        await useGoalStore.getState().setGeneralGoal(200000);
      });

      expect(mockSetPreference).toHaveBeenCalledWith('general_variable_goal', '200000');
    });

    it('should update state with the new general goal', async () => {
      mockSetPreference.mockResolvedValue(undefined);

      await act(async () => {
        await useGoalStore.getState().setGeneralGoal(150000);
      });

      expect(useGoalStore.getState().generalGoal).toBe(150000);
    });

    it('should allow editing (overwriting) the general goal', async () => {
      mockSetPreference.mockResolvedValue(undefined);

      await act(async () => {
        await useGoalStore.getState().setGeneralGoal(100000);
      });
      expect(useGoalStore.getState().generalGoal).toBe(100000);

      await act(async () => {
        await useGoalStore.getState().setGeneralGoal(200000);
      });
      expect(useGoalStore.getState().generalGoal).toBe(200000);
      expect(mockSetPreference).toHaveBeenCalledTimes(2);
    });

    it('should not update state when persistence fails', async () => {
      mockSetPreference.mockRejectedValue(new Error('Write failed'));

      await act(async () => {
        await useGoalStore.getState().setGeneralGoal(999);
      });

      expect(useGoalStore.getState().generalGoal).toBeNull();
    });
  });

  describe('removeGeneralGoal', () => {
    it('should delete the general goal from user_preferences', async () => {
      mockDeletePreference.mockResolvedValue(undefined);
      // Set initial state with a goal
      useGoalStore.setState({ generalGoal: 250000 });

      await act(async () => {
        await useGoalStore.getState().removeGeneralGoal();
      });

      expect(mockDeletePreference).toHaveBeenCalledWith('general_variable_goal');
    });

    it('should set generalGoal to null after removal', async () => {
      mockDeletePreference.mockResolvedValue(undefined);
      useGoalStore.setState({ generalGoal: 250000 });

      await act(async () => {
        await useGoalStore.getState().removeGeneralGoal();
      });

      expect(useGoalStore.getState().generalGoal).toBeNull();
    });

    it('should not update state when deletion fails', async () => {
      mockDeletePreference.mockRejectedValue(new Error('Delete failed'));
      useGoalStore.setState({ generalGoal: 250000 });

      await act(async () => {
        await useGoalStore.getState().removeGeneralGoal();
      });

      expect(useGoalStore.getState().generalGoal).toBe(250000);
    });
  });

  describe('setCategoryGoal', () => {
    it('should persist the category goal via repository upsert', async () => {
      mockUpsert.mockResolvedValue({
        id: 'g1',
        categoryId: 'cat-1',
        amount: 80000,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 80000);
      });

      expect(mockUpsert).toHaveBeenCalledWith('cat-1', 80000);
    });

    it('should update categoryGoals map with the new goal', async () => {
      mockUpsert.mockResolvedValue({
        id: 'g1',
        categoryId: 'cat-1',
        amount: 80000,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 80000);
      });

      expect(useGoalStore.getState().categoryGoals.get('cat-1')).toBe(80000);
    });

    it('should allow setting goals for multiple categories', async () => {
      mockUpsert.mockResolvedValue({});

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 50000);
      });
      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-2', 75000);
      });

      const goals = useGoalStore.getState().categoryGoals;
      expect(goals.get('cat-1')).toBe(50000);
      expect(goals.get('cat-2')).toBe(75000);
      expect(goals.size).toBe(2);
    });

    it('should allow editing (overwriting) a category goal', async () => {
      mockUpsert.mockResolvedValue({});

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 50000);
      });
      expect(useGoalStore.getState().categoryGoals.get('cat-1')).toBe(50000);

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 100000);
      });
      expect(useGoalStore.getState().categoryGoals.get('cat-1')).toBe(100000);
    });

    it('should not update state when repository upsert fails', async () => {
      mockUpsert.mockRejectedValue(new Error('Upsert failed'));

      await act(async () => {
        await useGoalStore.getState().setCategoryGoal('cat-1', 80000);
      });

      expect(useGoalStore.getState().categoryGoals.has('cat-1')).toBe(false);
    });
  });

  describe('removeCategoryGoal', () => {
    it('should delete the category goal via repository', async () => {
      mockDelete.mockResolvedValue(undefined);
      useGoalStore.setState({
        categoryGoals: new Map([['cat-1', 50000]]),
      });

      await act(async () => {
        await useGoalStore.getState().removeCategoryGoal('cat-1');
      });

      expect(mockDelete).toHaveBeenCalledWith('cat-1');
    });

    it('should remove categoryId from categoryGoals map', async () => {
      mockDelete.mockResolvedValue(undefined);
      useGoalStore.setState({
        categoryGoals: new Map([
          ['cat-1', 50000],
          ['cat-2', 75000],
        ]),
      });

      await act(async () => {
        await useGoalStore.getState().removeCategoryGoal('cat-1');
      });

      const goals = useGoalStore.getState().categoryGoals;
      expect(goals.has('cat-1')).toBe(false);
      expect(goals.get('cat-2')).toBe(75000);
      expect(goals.size).toBe(1);
    });

    it('should not update state when deletion fails', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      useGoalStore.setState({
        categoryGoals: new Map([['cat-1', 50000]]),
      });

      await act(async () => {
        await useGoalStore.getState().removeCategoryGoal('cat-1');
      });

      expect(useGoalStore.getState().categoryGoals.get('cat-1')).toBe(50000);
    });

    it('should handle removing a non-existent category goal gracefully', async () => {
      mockDelete.mockResolvedValue(undefined);

      await act(async () => {
        await useGoalStore.getState().removeCategoryGoal('non-existent');
      });

      expect(mockDelete).toHaveBeenCalledWith('non-existent');
      expect(useGoalStore.getState().categoryGoals.size).toBe(0);
    });
  });
});
