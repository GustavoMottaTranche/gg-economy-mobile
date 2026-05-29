/**
 * Unit tests for weeklyRecurringStore (Zustand store).
 *
 * Tests loading groups and occurrences, monthly total computation,
 * and error state handling.
 *
 * **Validates: Requirements 2.1, 6.2**
 */

import { useWeeklyRecurringStore } from '../../stores/weeklyRecurringStore';
import type { WeeklyRecurringGroup, WeeklyOccurrence } from '../../types/weeklyRecurring';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../services/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetActiveGroups = jest.fn();
const mockCreateGroup = jest.fn();
const mockUpdateGroup = jest.fn();
const mockDeleteGroup = jest.fn();

jest.mock('../../services/weekly-recurring/WeeklyRecurringService', () => ({
  weeklyRecurringService: {
    getActiveGroups: (...args: unknown[]) => mockGetActiveGroups(...args),
    createGroup: (...args: unknown[]) => mockCreateGroup(...args),
    updateGroup: (...args: unknown[]) => mockUpdateGroup(...args),
    deleteGroup: (...args: unknown[]) => mockDeleteGroup(...args),
  },
}));

const mockGenerateForMonth = jest.fn();
jest.mock('../../services/weekly-recurring/OccurrenceGenerator', () => ({
  occurrenceGenerator: {
    generateForMonth: (...args: unknown[]) => mockGenerateForMonth(...args),
  },
}));

const mockGetByMonth = jest.fn();
const mockGetMonthlyTotal = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../../repositories/WeeklyOccurrenceRepository', () => ({
  weeklyOccurrenceRepository: {
    getByMonth: (...args: unknown[]) => mockGetByMonth(...args),
    getMonthlyTotal: (...args: unknown[]) => mockGetMonthlyTotal(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

jest.mock('../../services/weekly-recurring/dateUtils', () => ({
  deriveReferenceMonth: jest.fn((date: string) => date.substring(0, 7)),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockGroup(overrides: Partial<WeeklyRecurringGroup> = {}): WeeklyRecurringGroup {
  return {
    id: 'group-1',
    title: 'Weekly Expense',
    amount: 50.0,
    dayOfWeek: 1,
    categoryId: 'cat-1',
    categoryType: 'expense',
    description: '',
    originId: null,
    startDate: '2024-01-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockOccurrence(overrides: Partial<WeeklyOccurrence> = {}): WeeklyOccurrence {
  return {
    id: 'occ-1',
    weeklyGroupId: 'group-1',
    date: '2024-01-08',
    referenceMonth: '2024-01',
    amount: 50.0,
    description: '',
    isValueEdited: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function resetStore() {
  useWeeklyRecurringStore.setState({
    groups: [],
    occurrences: {},
    monthlyTotals: {},
    isLoading: false,
    error: null,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('weeklyRecurringStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('loadGroups', () => {
    it('should load active groups into state', async () => {
      const groups = [
        createMockGroup({ id: 'g1', title: 'Groceries' }),
        createMockGroup({ id: 'g2', title: 'Transport' }),
      ];
      mockGetActiveGroups.mockResolvedValue(groups);

      await useWeeklyRecurringStore.getState().loadGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.groups).toEqual(groups);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoading to true during loading', async () => {
      let loadingDuringCall = false;
      mockGetActiveGroups.mockImplementation(async () => {
        loadingDuringCall = useWeeklyRecurringStore.getState().isLoading;
        return [];
      });

      await useWeeklyRecurringStore.getState().loadGroups();

      expect(loadingDuringCall).toBe(true);
    });

    it('should clear previous error on successful load', async () => {
      // Set an initial error state
      useWeeklyRecurringStore.setState({ error: 'Previous error' });
      mockGetActiveGroups.mockResolvedValue([]);

      await useWeeklyRecurringStore.getState().loadGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBeNull();
    });

    it('should set error state when loading fails', async () => {
      mockGetActiveGroups.mockRejectedValue(new Error('Network error'));

      await useWeeklyRecurringStore.getState().loadGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('should handle non-Error thrown values', async () => {
      mockGetActiveGroups.mockRejectedValue('string error');

      await useWeeklyRecurringStore.getState().loadGroups();

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Failed to load groups');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadOccurrencesForMonth', () => {
    it('should trigger generation, fetch occurrences, and update state', async () => {
      const occurrences = [
        createMockOccurrence({ id: 'occ-1', date: '2024-01-08', amount: 50 }),
        createMockOccurrence({ id: 'occ-2', date: '2024-01-15', amount: 50 }),
      ];
      mockGenerateForMonth.mockResolvedValue(undefined);
      mockGetByMonth.mockResolvedValue(occurrences);
      mockGetMonthlyTotal.mockResolvedValue(100);

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-01');

      const state = useWeeklyRecurringStore.getState();
      expect(mockGenerateForMonth).toHaveBeenCalledWith('2024-01');
      expect(mockGetByMonth).toHaveBeenCalledWith('2024-01');
      expect(mockGetMonthlyTotal).toHaveBeenCalledWith('2024-01');
      expect(state.occurrences['2024-01']).toEqual(occurrences);
      expect(state.monthlyTotals['2024-01']).toBe(100);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call generateForMonth before fetching occurrences (Req 6.2)', async () => {
      const callOrder: string[] = [];
      mockGenerateForMonth.mockImplementation(async () => {
        callOrder.push('generate');
      });
      mockGetByMonth.mockImplementation(async () => {
        callOrder.push('getByMonth');
        return [];
      });
      mockGetMonthlyTotal.mockImplementation(async () => {
        callOrder.push('getMonthlyTotal');
        return 0;
      });

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-03');

      expect(callOrder[0]).toBe('generate');
      expect(callOrder.indexOf('getByMonth')).toBeGreaterThan(callOrder.indexOf('generate'));
    });

    it('should preserve occurrences from other months', async () => {
      // Pre-populate state with another month's data
      useWeeklyRecurringStore.setState({
        occurrences: { '2024-02': [createMockOccurrence({ id: 'feb-occ' })] },
        monthlyTotals: { '2024-02': 75 },
      });

      mockGenerateForMonth.mockResolvedValue(undefined);
      mockGetByMonth.mockResolvedValue([createMockOccurrence({ id: 'jan-occ' })]);
      mockGetMonthlyTotal.mockResolvedValue(50);

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-01');

      const state = useWeeklyRecurringStore.getState();
      expect(state.occurrences['2024-02']).toHaveLength(1);
      expect(state.monthlyTotals['2024-02']).toBe(75);
      expect(state.occurrences['2024-01']).toHaveLength(1);
      expect(state.monthlyTotals['2024-01']).toBe(50);
    });

    it('should set error state when generation fails', async () => {
      mockGenerateForMonth.mockRejectedValue(new Error('Generation failed'));

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-01');

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Generation failed');
      expect(state.isLoading).toBe(false);
    });

    it('should set error state when fetching occurrences fails', async () => {
      mockGenerateForMonth.mockResolvedValue(undefined);
      mockGetByMonth.mockRejectedValue(new Error('DB read error'));

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-01');

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('DB read error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('getMonthlyTotal', () => {
    it('should return cached total for a month (Req 2.1)', () => {
      useWeeklyRecurringStore.setState({
        monthlyTotals: { '2024-01': 200, '2024-02': 150 },
      });

      const total = useWeeklyRecurringStore.getState().getMonthlyTotal('2024-01');
      expect(total).toBe(200);
    });

    it('should return 0 for a month with no cached total', () => {
      const total = useWeeklyRecurringStore.getState().getMonthlyTotal('2024-06');
      expect(total).toBe(0);
    });

    it('should return 0 when monthlyTotals is empty', () => {
      useWeeklyRecurringStore.setState({ monthlyTotals: {} });

      const total = useWeeklyRecurringStore.getState().getMonthlyTotal('2024-01');
      expect(total).toBe(0);
    });

    it('should reflect updated total after loadOccurrencesForMonth', async () => {
      mockGenerateForMonth.mockResolvedValue(undefined);
      mockGetByMonth.mockResolvedValue([]);
      mockGetMonthlyTotal.mockResolvedValue(325.5);

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-04');

      const total = useWeeklyRecurringStore.getState().getMonthlyTotal('2024-04');
      expect(total).toBe(325.5);
    });
  });

  describe('createGroup', () => {
    it('should create group and reload groups', async () => {
      const newGroup = createMockGroup({ id: 'new-group', title: 'New Expense' });
      mockCreateGroup.mockResolvedValue(newGroup);
      mockGetActiveGroups.mockResolvedValue([newGroup]);

      const dto = {
        title: 'New Expense',
        amount: 30,
        dayOfWeek: 3,
        categoryId: 'cat-1',
      };

      await useWeeklyRecurringStore.getState().createGroup(dto);

      const state = useWeeklyRecurringStore.getState();
      expect(mockCreateGroup).toHaveBeenCalledWith(dto);
      expect(state.groups).toEqual([newGroup]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when creation fails', async () => {
      mockCreateGroup.mockRejectedValue(new Error('Validation failed: title is required'));

      await useWeeklyRecurringStore.getState().createGroup({
        title: '',
        amount: 50,
        dayOfWeek: 1,
        categoryId: 'cat-1',
      });

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Validation failed: title is required');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateGroup', () => {
    it('should update group and reload groups', async () => {
      const updatedGroup = createMockGroup({ id: 'g1', title: 'Updated Title' });
      mockUpdateGroup.mockResolvedValue(updatedGroup);
      mockGetActiveGroups.mockResolvedValue([updatedGroup]);

      await useWeeklyRecurringStore.getState().updateGroup('g1', { title: 'Updated Title' });

      const state = useWeeklyRecurringStore.getState();
      expect(mockUpdateGroup).toHaveBeenCalledWith('g1', { title: 'Updated Title' });
      expect(state.groups).toEqual([updatedGroup]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when update fails', async () => {
      mockUpdateGroup.mockRejectedValue(new Error('Group not found'));

      await useWeeklyRecurringStore.getState().updateGroup('non-existent', { title: 'X' });

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Group not found');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group and reload groups', async () => {
      mockDeleteGroup.mockResolvedValue(undefined);
      mockGetActiveGroups.mockResolvedValue([]);

      // Pre-populate with a group
      useWeeklyRecurringStore.setState({
        groups: [createMockGroup({ id: 'g1' })],
      });

      await useWeeklyRecurringStore.getState().deleteGroup('g1');

      const state = useWeeklyRecurringStore.getState();
      expect(mockDeleteGroup).toHaveBeenCalledWith('g1');
      expect(state.groups).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when deletion fails', async () => {
      mockDeleteGroup.mockRejectedValue(new Error('Transaction failed'));

      await useWeeklyRecurringStore.getState().deleteGroup('g1');

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Transaction failed');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateOccurrence', () => {
    it('should update occurrence and refresh month data', async () => {
      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        amount: 75,
        referenceMonth: '2024-01',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      mockGetByMonth.mockResolvedValue([updatedOcc]);
      mockGetMonthlyTotal.mockResolvedValue(75);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { amount: 75 });

      const state = useWeeklyRecurringStore.getState();
      expect(mockUpdate).toHaveBeenCalledWith('occ-1', {
        amount: 75,
        isValueEdited: true,
      });
      expect(state.occurrences['2024-01']).toEqual([updatedOcc]);
      expect(state.monthlyTotals['2024-01']).toBe(75);
      expect(state.isLoading).toBe(false);
    });

    it('should persist new amount and set isValueEdited to true (Req 2.2)', async () => {
      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        amount: 120.5,
        isValueEdited: true,
        referenceMonth: '2024-03',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      mockGetByMonth.mockResolvedValue([updatedOcc]);
      mockGetMonthlyTotal.mockResolvedValue(120.5);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { amount: 120.5 });

      // Verify isValueEdited is explicitly set to true alongside the amount
      expect(mockUpdate).toHaveBeenCalledWith('occ-1', {
        amount: 120.5,
        isValueEdited: true,
      });
    });

    it('should NOT set isValueEdited when only date is updated', async () => {
      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        date: '2024-03-15',
        referenceMonth: '2024-03',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      mockGetByMonth.mockResolvedValue([updatedOcc]);
      mockGetMonthlyTotal.mockResolvedValue(50);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { date: '2024-03-15' });

      // isValueEdited should NOT be in the update fields when only date changes
      expect(mockUpdate).toHaveBeenCalledWith('occ-1', {
        date: '2024-03-15',
        referenceMonth: '2024-03',
      });
    });

    it('should recalculate monthly total after amount update (Req 2.3)', async () => {
      // Pre-populate with existing month data
      useWeeklyRecurringStore.setState({
        occurrences: {
          '2024-01': [
            createMockOccurrence({ id: 'occ-1', amount: 50 }),
            createMockOccurrence({ id: 'occ-2', amount: 50 }),
          ],
        },
        monthlyTotals: { '2024-01': 100 },
      });

      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        amount: 80,
        referenceMonth: '2024-01',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      // After update, the month has occ-1 at 80 and occ-2 at 50 = 130
      mockGetByMonth.mockResolvedValue([
        createMockOccurrence({ id: 'occ-1', amount: 80 }),
        createMockOccurrence({ id: 'occ-2', amount: 50 }),
      ]);
      mockGetMonthlyTotal.mockResolvedValue(130);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { amount: 80 });

      const state = useWeeklyRecurringStore.getState();
      // Monthly total should be recalculated
      expect(state.monthlyTotals['2024-01']).toBe(130);
      // Occurrences should be refreshed
      expect(state.occurrences['2024-01']).toHaveLength(2);
      expect(mockGetMonthlyTotal).toHaveBeenCalledWith('2024-01');
    });

    it('should refresh occurrences for the affected month after update', async () => {
      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        amount: 60,
        referenceMonth: '2024-05',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      mockGetByMonth.mockResolvedValue([updatedOcc]);
      mockGetMonthlyTotal.mockResolvedValue(60);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { amount: 60 });

      // Verify getByMonth was called with the affected month
      expect(mockGetByMonth).toHaveBeenCalledWith('2024-05');
      // Verify state was updated with fresh data
      const state = useWeeklyRecurringStore.getState();
      expect(state.occurrences['2024-05']).toEqual([updatedOcc]);
    });

    it('should update occurrence date and derive reference month', async () => {
      const updatedOcc = createMockOccurrence({
        id: 'occ-1',
        date: '2024-02-10',
        referenceMonth: '2024-02',
      });
      mockUpdate.mockResolvedValue(updatedOcc);
      mockGetByMonth.mockResolvedValue([updatedOcc]);
      mockGetMonthlyTotal.mockResolvedValue(50);

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { date: '2024-02-10' });

      expect(mockUpdate).toHaveBeenCalledWith('occ-1', {
        date: '2024-02-10',
        referenceMonth: '2024-02',
      });
    });

    it('should set error when occurrence is not found', async () => {
      mockUpdate.mockResolvedValue(null);

      await useWeeklyRecurringStore.getState().updateOccurrence('non-existent', { amount: 100 });

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('Occurrence not found: non-existent');
      expect(state.isLoading).toBe(false);
    });

    it('should set error state when update fails', async () => {
      mockUpdate.mockRejectedValue(new Error('DB write error'));

      await useWeeklyRecurringStore.getState().updateOccurrence('occ-1', { amount: 100 });

      const state = useWeeklyRecurringStore.getState();
      expect(state.error).toBe('DB write error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('error state handling', () => {
    it('should clear error on successful loadGroups after previous error', async () => {
      useWeeklyRecurringStore.setState({ error: 'Old error' });
      mockGetActiveGroups.mockResolvedValue([]);

      await useWeeklyRecurringStore.getState().loadGroups();

      expect(useWeeklyRecurringStore.getState().error).toBeNull();
    });

    it('should clear error on successful loadOccurrencesForMonth after previous error', async () => {
      useWeeklyRecurringStore.setState({ error: 'Old error' });
      mockGenerateForMonth.mockResolvedValue(undefined);
      mockGetByMonth.mockResolvedValue([]);
      mockGetMonthlyTotal.mockResolvedValue(0);

      await useWeeklyRecurringStore.getState().loadOccurrencesForMonth('2024-01');

      expect(useWeeklyRecurringStore.getState().error).toBeNull();
    });

    it('should clear error on successful createGroup after previous error', async () => {
      useWeeklyRecurringStore.setState({ error: 'Old error' });
      mockCreateGroup.mockResolvedValue(createMockGroup());
      mockGetActiveGroups.mockResolvedValue([]);

      await useWeeklyRecurringStore.getState().createGroup({
        title: 'Test',
        amount: 10,
        dayOfWeek: 1,
        categoryId: 'cat-1',
      });

      expect(useWeeklyRecurringStore.getState().error).toBeNull();
    });

    it('should clear error on successful deleteGroup after previous error', async () => {
      useWeeklyRecurringStore.setState({ error: 'Old error' });
      mockDeleteGroup.mockResolvedValue(undefined);
      mockGetActiveGroups.mockResolvedValue([]);

      await useWeeklyRecurringStore.getState().deleteGroup('g1');

      expect(useWeeklyRecurringStore.getState().error).toBeNull();
    });

    it('should clear error on successful updateGroup after previous error', async () => {
      useWeeklyRecurringStore.setState({ error: 'Old error' });
      mockUpdateGroup.mockResolvedValue(createMockGroup());
      mockGetActiveGroups.mockResolvedValue([]);

      await useWeeklyRecurringStore.getState().updateGroup('g1', { title: 'New' });

      expect(useWeeklyRecurringStore.getState().error).toBeNull();
    });
  });
});
