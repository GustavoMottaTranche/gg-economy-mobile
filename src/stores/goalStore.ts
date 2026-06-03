/**
 * Zustand store for variable expense budget goals
 *
 * Manages state for the general variable goal and per-category goals.
 * Persists general goal to user_preferences table and category goals
 * via CategoryGoalRepository.
 *
 * **Validates: Requirements 1.2, 1.4, 1.5, 2.2, 2.4, 2.5, 6.2, 6.3, 6.7**
 */
import { create } from 'zustand';
import { logger } from '../services/logging';
import { categoryGoalRepository } from '../repositories/CategoryGoalRepository';
import { getPreference, setPreference, deletePreference } from '../db/queries/preferences';

// ─── State Interface ─────────────────────────────────────────────────────────

interface GoalState {
  /** General variable expense goal in cents, null = not configured */
  generalGoal: number | null;
  /** Per-category goals: categoryId → amount in cents */
  categoryGoals: Map<string, number>;
  /** Whether an async operation is in progress */
  isLoading: boolean;
}

// ─── Actions Interface ───────────────────────────────────────────────────────

interface GoalActions {
  /** Load all goals (general + category) from persistence */
  loadGoals(): Promise<void>;
  /** Set the general variable expense goal */
  setGeneralGoal(amountInCents: number): Promise<void>;
  /** Remove the general variable expense goal */
  removeGeneralGoal(): Promise<void>;
  /** Set a per-category goal */
  setCategoryGoal(categoryId: string, amountInCents: number): Promise<void>;
  /** Remove a per-category goal */
  removeCategoryGoal(categoryId: string): Promise<void>;
}

type GoalStore = GoalState & GoalActions;

// ─── Constants ───────────────────────────────────────────────────────────────

const GENERAL_GOAL_KEY = 'general_variable_goal' as const;

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: GoalState = {
  generalGoal: null,
  categoryGoals: new Map<string, number>(),
  isLoading: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGoalStore = create<GoalStore>()((set) => ({
  ...initialState,

  loadGoals: async () => {
    set({ isLoading: true });
    try {
      // Load general goal from user_preferences
      const generalGoalValue = await getPreference(GENERAL_GOAL_KEY);
      const generalGoal = generalGoalValue ? parseInt(generalGoalValue, 10) : null;

      // Load category goals from category_goals table
      const categoryGoalRecords = await categoryGoalRepository.getAllForVariableCategories();
      const categoryGoals = new Map<string, number>();
      for (const record of categoryGoalRecords) {
        categoryGoals.set(record.categoryId, record.amount);
      }

      set({ generalGoal, categoryGoals, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load goals';
      logger.error('Failed to load goals', { error: message });
      set({ isLoading: false });
    }
  },

  setGeneralGoal: async (amountInCents: number) => {
    try {
      await setPreference(GENERAL_GOAL_KEY, amountInCents.toString());
      set({ generalGoal: amountInCents });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set general goal';
      logger.error('Failed to set general goal', { error: message });
    }
  },

  removeGeneralGoal: async () => {
    try {
      await deletePreference(GENERAL_GOAL_KEY);
      set({ generalGoal: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove general goal';
      logger.error('Failed to remove general goal', { error: message });
    }
  },

  setCategoryGoal: async (categoryId: string, amountInCents: number) => {
    try {
      await categoryGoalRepository.upsert(categoryId, amountInCents);
      set((state) => {
        const next = new Map(state.categoryGoals);
        next.set(categoryId, amountInCents);
        return { categoryGoals: next };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set category goal';
      logger.error('Failed to set category goal', {
        categoryId,
        error: message,
      });
    }
  },

  removeCategoryGoal: async (categoryId: string) => {
    try {
      await categoryGoalRepository.delete(categoryId);
      set((state) => {
        const next = new Map(state.categoryGoals);
        next.delete(categoryId);
        return { categoryGoals: next };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove category goal';
      logger.error('Failed to remove category goal', {
        categoryId,
        error: message,
      });
    }
  },
}));

// ─── Selector Hooks ──────────────────────────────────────────────────────────

/**
 * Hook to get the general variable expense goal
 */
export function useGeneralGoal() {
  return useGoalStore((state) => state.generalGoal);
}

/**
 * Hook to get all category goals as a Map
 */
export function useCategoryGoals() {
  return useGoalStore((state) => state.categoryGoals);
}

/**
 * Hook to get a specific category goal by ID
 */
export function useCategoryGoal(categoryId: string) {
  return useGoalStore((state) => state.categoryGoals.get(categoryId) ?? null);
}

/**
 * Hook to get loading state
 */
export function useGoalLoading() {
  return useGoalStore((state) => state.isLoading);
}
