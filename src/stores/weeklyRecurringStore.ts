/**
 * Zustand store for weekly recurring expenses
 *
 * Manages state for weekly recurring groups and their occurrences,
 * including lazy generation on month navigation, CRUD operations,
 * and monthly total computation.
 *
 * **Validates: Requirements 1.3, 1.4, 2.1, 3.2, 4.1, 5.2, 6.2**
 */
import { create } from 'zustand';
import { logger } from '../services/logging';
import { weeklyRecurringService } from '../services/weekly-recurring/WeeklyRecurringService';
import { occurrenceGenerator } from '../services/weekly-recurring/OccurrenceGenerator';
import { weeklyOccurrenceRepository } from '../repositories/WeeklyOccurrenceRepository';
import { deriveReferenceMonth } from '../services/weekly-recurring/dateUtils';
import type {
  WeeklyRecurringGroup,
  WeeklyOccurrence,
  CreateWeeklyGroupDTO,
  UpdateWeeklyGroupDTO,
  UpdateOccurrenceDTO,
} from '../types/weeklyRecurring';

// ─── State Interface ─────────────────────────────────────────────────────────

interface WeeklyRecurringState {
  /** All active weekly recurring groups */
  groups: WeeklyRecurringGroup[];
  /** Occurrences keyed by referenceMonth (YYYY-MM) */
  occurrences: Record<string, WeeklyOccurrence[]>;
  /** Monthly totals keyed by referenceMonth (YYYY-MM) */
  monthlyTotals: Record<string, number>;
  /** Whether an async operation is in progress */
  isLoading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
  /** Set of currently expanded group IDs in the statement list */
  expandedGroupIds: Set<string>;
}

// ─── Actions Interface ───────────────────────────────────────────────────────

interface WeeklyRecurringActions {
  /** Load all active weekly recurring groups */
  loadGroups(): Promise<void>;
  /** Load occurrences for a given month (triggers lazy generation first) */
  loadOccurrencesForMonth(month: string): Promise<void>;
  /** Create a new weekly recurring group */
  createGroup(dto: CreateWeeklyGroupDTO): Promise<void>;
  /** Update an existing weekly recurring group */
  updateGroup(id: string, dto: UpdateWeeklyGroupDTO): Promise<void>;
  /** Delete (soft-delete) a weekly recurring group */
  deleteGroup(id: string): Promise<void>;
  /** Update an individual occurrence */
  updateOccurrence(id: string, dto: UpdateOccurrenceDTO): Promise<void>;
  /** Get the monthly total for a given month (synchronous from cached state) */
  getMonthlyTotal(month: string): number;
  /** Toggle expansion state of a weekly group in the statement list */
  toggleGroupExpansion(groupId: string): void;
  /** Collapse all expanded groups */
  collapseAllGroups(): void;
}

type WeeklyRecurringStore = WeeklyRecurringState & WeeklyRecurringActions;

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: WeeklyRecurringState = {
  groups: [],
  occurrences: {},
  monthlyTotals: {},
  isLoading: false,
  error: null,
  expandedGroupIds: new Set<string>(),
};

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Zustand store for weekly recurring expenses.
 *
 * - `loadGroups`: fetches active groups from WeeklyRecurringService
 * - `loadOccurrencesForMonth`: triggers OccurrenceGenerator.generateForMonth (lazy generation),
 *   then fetches occurrences and monthly total for the month
 * - `createGroup`: creates a group via service, reloads groups
 * - `updateGroup`: updates a group via service, reloads groups
 * - `deleteGroup`: soft-deletes a group via service, reloads groups
 * - `updateOccurrence`: updates an occurrence via repository, reloads occurrences for affected month
 * - `getMonthlyTotal`: returns cached monthly total (synchronous)
 */
export const useWeeklyRecurringStore = create<WeeklyRecurringStore>()((set, get) => ({
  ...initialState,

  loadGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await weeklyRecurringService.getActiveGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load groups';
      logger.error('Failed to load weekly recurring groups', { error: message });
      set({ error: message, isLoading: false });
    }
  },

  loadOccurrencesForMonth: async (month: string) => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Trigger lazy generation (Req 1.4, 6.2)
      await occurrenceGenerator.generateForMonth(month);

      // Step 2: Fetch occurrences for the month
      const monthOccurrences = await weeklyOccurrenceRepository.getByMonth(month);

      // Step 3: Fetch monthly total
      const total = await weeklyOccurrenceRepository.getMonthlyTotal(month);

      // Step 4: Update state
      set((state) => ({
        occurrences: { ...state.occurrences, [month]: monthOccurrences },
        monthlyTotals: { ...state.monthlyTotals, [month]: total },
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load occurrences for month';
      logger.error('Failed to load occurrences for month', { month, error: message });
      set({ error: message, isLoading: false });
    }
  },

  createGroup: async (dto: CreateWeeklyGroupDTO) => {
    set({ isLoading: true, error: null });
    try {
      await weeklyRecurringService.createGroup(dto);
      // Reload groups to reflect the new group
      const groups = await weeklyRecurringService.getActiveGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create group';
      logger.error('Failed to create weekly recurring group', { error: message });
      set({ error: message, isLoading: false });
    }
  },

  updateGroup: async (id: string, dto: UpdateWeeklyGroupDTO) => {
    set({ isLoading: true, error: null });
    try {
      await weeklyRecurringService.updateGroup(id, dto);
      // Reload groups to reflect the update
      const groups = await weeklyRecurringService.getActiveGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update group';
      logger.error('Failed to update weekly recurring group', { id, error: message });
      set({ error: message, isLoading: false });
    }
  },

  deleteGroup: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await weeklyRecurringService.deleteGroup(id);
      // Reload groups to reflect the deletion
      const groups = await weeklyRecurringService.getActiveGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete group';
      logger.error('Failed to delete weekly recurring group', { id, error: message });
      set({ error: message, isLoading: false });
    }
  },

  updateOccurrence: async (id: string, dto: UpdateOccurrenceDTO) => {
    set({ isLoading: true, error: null });
    try {
      // Build update fields
      const updateFields: Record<string, unknown> = {};
      if (dto.amount !== undefined) {
        updateFields.amount = dto.amount;
        updateFields.isValueEdited = true;
      }
      if (dto.date !== undefined) {
        updateFields.date = dto.date;
        updateFields.referenceMonth = deriveReferenceMonth(dto.date);
      }

      const updated = await weeklyOccurrenceRepository.update(id, updateFields);

      if (!updated) {
        throw new Error(`Occurrence not found: ${id}`);
      }

      // Reload occurrences for the affected month
      const affectedMonth = updated.referenceMonth;
      const monthOccurrences = await weeklyOccurrenceRepository.getByMonth(affectedMonth);
      const total = await weeklyOccurrenceRepository.getMonthlyTotal(affectedMonth);

      set((state) => ({
        occurrences: { ...state.occurrences, [affectedMonth]: monthOccurrences },
        monthlyTotals: { ...state.monthlyTotals, [affectedMonth]: total },
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update occurrence';
      logger.error('Failed to update weekly occurrence', { id, error: message });
      set({ error: message, isLoading: false });
    }
  },

  getMonthlyTotal: (month: string): number => {
    return get().monthlyTotals[month] ?? 0;
  },

  toggleGroupExpansion: (groupId: string) => {
    set((state) => {
      const next = new Set(state.expandedGroupIds);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return { expandedGroupIds: next };
    });
  },

  collapseAllGroups: () => {
    set({ expandedGroupIds: new Set<string>() });
  },
}));

// ─── Selector Hooks ──────────────────────────────────────────────────────────

/**
 * Hook to get all active weekly recurring groups
 */
export function useWeeklyGroups() {
  return useWeeklyRecurringStore((state) => state.groups);
}

/**
 * Hook to get occurrences for a specific month
 */
const EMPTY_OCCURRENCES: WeeklyOccurrence[] = [];
export function useWeeklyOccurrences(month: string) {
  return useWeeklyRecurringStore((state) => state.occurrences[month] ?? EMPTY_OCCURRENCES);
}

/**
 * Hook to get the monthly total for a specific month
 */
export function useWeeklyMonthlyTotal(month: string) {
  return useWeeklyRecurringStore((state) => state.monthlyTotals[month] ?? 0);
}

/**
 * Hook to get loading and error state
 */
export function useWeeklyRecurringStatus() {
  const isLoading = useWeeklyRecurringStore((state) => state.isLoading);
  const error = useWeeklyRecurringStore((state) => state.error);
  return { isLoading, error };
}

/**
 * Hook to get the set of currently expanded group IDs
 */
export function useExpandedGroupIds() {
  return useWeeklyRecurringStore((state) => state.expandedGroupIds);
}
