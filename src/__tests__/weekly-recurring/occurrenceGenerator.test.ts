/**
 * Unit tests for OccurrenceGenerator service.
 *
 * Tests the core logic of occurrence generation using mock repositories
 * to isolate the service layer from database concerns.
 */

import { OccurrenceGenerator } from '../../services/weekly-recurring/OccurrenceGenerator';
import type { IWeeklyGroupRepository } from '../../repositories/interfaces/IWeeklyGroupRepository';
import type { IWeeklyOccurrenceRepository } from '../../repositories/interfaces/IWeeklyOccurrenceRepository';
import type { WeeklyRecurringGroup, WeeklyOccurrence } from '../../types/weeklyRecurring';

// Mock the withTransaction to just execute the function directly
jest.mock('../../db/client', () => ({
  withTransaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Mock the logger to suppress output during tests
jest.mock('../../services/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

function createMockGroup(overrides: Partial<WeeklyRecurringGroup> = {}): WeeklyRecurringGroup {
  return {
    id: 'group-1',
    title: 'Weekly Expense',
    amount: 50.0,
    dayOfWeek: 1, // Monday
    categoryId: 'cat-1',
    categoryType: 'expense',
    description: 'Weekly expense description',
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
    date: '2024-01-01',
    referenceMonth: '2024-01',
    amount: 50.0,
    description: 'Weekly expense description',
    isValueEdited: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockGroupRepository(
  overrides: Partial<IWeeklyGroupRepository> = {}
): IWeeklyGroupRepository {
  return {
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getById: jest.fn().mockResolvedValue(null),
    getActive: jest.fn().mockResolvedValue([]),
    getActiveForMonth: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createMockOccurrenceRepository(
  overrides: Partial<IWeeklyOccurrenceRepository> = {}
): IWeeklyOccurrenceRepository {
  return {
    create: jest.fn().mockResolvedValue(createMockOccurrence()),
    createMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    deleteFutureUnedited: jest.fn(),
    deleteFuture: jest.fn(),
    getById: jest.fn().mockResolvedValue(null),
    getByGroupId: jest.fn().mockResolvedValue([]),
    getByMonth: jest.fn().mockResolvedValue([]),
    getByGroupAndMonth: jest.fn().mockResolvedValue([]),
    getMonthlyTotal: jest.fn().mockResolvedValue(0),
    existsForGroupAndDate: jest.fn().mockResolvedValue(false),
    getFutureUnedited: jest.fn().mockResolvedValue([]),
    getFuture: jest.fn().mockResolvedValue([]),
    getPast: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('OccurrenceGenerator', () => {
  describe('generateForMonth', () => {
    it('should generate occurrences for all active groups in the month', async () => {
      const group1 = createMockGroup({ id: 'group-1', dayOfWeek: 1, startDate: '2024-01-01' });
      const group2 = createMockGroup({ id: 'group-2', dayOfWeek: 3, startDate: '2024-01-01' });

      const groupRepo = createMockGroupRepository({
        getActiveForMonth: jest.fn().mockResolvedValue([group1, group2]),
        getById: jest.fn().mockImplementation(async (id: string) => {
          if (id === 'group-1') return group1;
          if (id === 'group-2') return group2;
          return null;
        }),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(false),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForMonth('2024-01');

      // Should have called create for each date of each group
      expect(occRepo.create).toHaveBeenCalled();
      // January 2024 has 4 Mondays (1, 8, 15, 22, 29) = 5 Mondays
      // and 4 Wednesdays (3, 10, 17, 24, 31) = 5 Wednesdays
      // Total: 10 occurrences
      expect((occRepo.create as jest.Mock).mock.calls.length).toBe(10);
    });

    it('should not generate occurrences when no active groups exist', async () => {
      const groupRepo = createMockGroupRepository({
        getActiveForMonth: jest.fn().mockResolvedValue([]),
      });

      const occRepo = createMockOccurrenceRepository();

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForMonth('2024-01');

      expect(occRepo.create).not.toHaveBeenCalled();
    });

    it('should continue generating for other groups when one group fails (Req 6.5)', async () => {
      const group1 = createMockGroup({ id: 'group-1', dayOfWeek: 1, startDate: '2024-01-01' });
      const group2 = createMockGroup({ id: 'group-2', dayOfWeek: 3, startDate: '2024-01-01' });

      const groupRepo = createMockGroupRepository({
        getActiveForMonth: jest.fn().mockResolvedValue([group1, group2]),
        getById: jest.fn().mockImplementation(async (id: string) => {
          if (id === 'group-1') throw new Error('DB error for group-1');
          if (id === 'group-2') return group2;
          return null;
        }),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(false),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      // Should not throw
      await generator.generateForMonth('2024-01');

      // Should still have generated occurrences for group-2
      expect(occRepo.create).toHaveBeenCalled();
      // group-2 has dayOfWeek=3 (Wednesday), January 2024 has 5 Wednesdays
      const createCalls = (occRepo.create as jest.Mock).mock.calls;
      expect(createCalls.every((call: unknown[]) => (call[0] as { weeklyGroupId: string }).weeklyGroupId === 'group-2')).toBe(true);
    });

    it('should log error when a group fails', async () => {
      const { logger } = require('../../services/logging');
      const group1 = createMockGroup({ id: 'group-1', dayOfWeek: 1, startDate: '2024-01-01' });

      const groupRepo = createMockGroupRepository({
        getActiveForMonth: jest.fn().mockResolvedValue([group1]),
        getById: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      });

      const occRepo = createMockOccurrenceRepository();

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForMonth('2024-01');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate occurrences for group',
        expect.objectContaining({
          groupId: 'group-1',
          targetMonth: '2024-01',
        })
      );
    });
  });

  describe('generateForGroup', () => {
    it('should generate occurrences for all dates in the month', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 5, // Friday
        startDate: '2024-01-01',
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(false),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForGroup('group-1', '2024-01');

      // January 2024 has Fridays on: 5, 12, 19, 26 = 4 Fridays
      expect(occRepo.create).toHaveBeenCalledTimes(4);

      // Verify the created occurrences have correct data
      const calls = (occRepo.create as jest.Mock).mock.calls;
      expect(calls[0][0]).toMatchObject({
        weeklyGroupId: 'group-1',
        date: '2024-01-05',
        referenceMonth: '2024-01',
        amount: 50.0,
        description: 'Weekly expense description',
        isValueEdited: false,
      });
    });

    it('should skip dates that already have occurrences (idempotency, Req 6.3)', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 1, // Monday
        startDate: '2024-01-01',
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      // First two Mondays already exist
      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockImplementation(async (_groupId: string, date: string) => {
          return date === '2024-01-01' || date === '2024-01-08';
        }),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForGroup('group-1', '2024-01');

      // January 2024 has 5 Mondays, but 2 already exist, so only 3 should be created
      expect(occRepo.create).toHaveBeenCalledTimes(3);
    });

    it('should throw error when group is not found', async () => {
      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(null),
      });

      const occRepo = createMockOccurrenceRepository();

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await expect(generator.generateForGroup('non-existent', '2024-01')).rejects.toThrow(
        'Weekly recurring group not found: non-existent'
      );
    });

    it('should not create any occurrences when all dates already exist', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 1,
        startDate: '2024-01-01',
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(true),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForGroup('group-1', '2024-01');

      expect(occRepo.create).not.toHaveBeenCalled();
    });

    it('should not create occurrences when no dates match (startDate after month end)', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 1,
        startDate: '2024-02-01', // starts in February
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      const occRepo = createMockOccurrenceRepository();

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      // Generate for January — startDate is after January, so no dates
      await generator.generateForGroup('group-1', '2024-01');

      expect(occRepo.create).not.toHaveBeenCalled();
    });

    it('should respect startDate within the month (Req 6.1)', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 1, // Monday
        startDate: '2024-01-10', // starts on Jan 10
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(false),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForGroup('group-1', '2024-01');

      // January 2024 Mondays: 1, 8, 15, 22, 29
      // startDate is Jan 10, so only 15, 22, 29 are valid = 3 occurrences
      expect(occRepo.create).toHaveBeenCalledTimes(3);
    });

    it('should use group amount and description for each occurrence (Req 6.7)', async () => {
      const group = createMockGroup({
        id: 'group-1',
        dayOfWeek: 0, // Sunday
        amount: 123.45,
        description: 'Custom description',
        startDate: '2024-01-01',
      });

      const groupRepo = createMockGroupRepository({
        getById: jest.fn().mockResolvedValue(group),
      });

      const occRepo = createMockOccurrenceRepository({
        existsForGroupAndDate: jest.fn().mockResolvedValue(false),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: groupRepo,
        occurrenceRepository: occRepo,
      });

      await generator.generateForGroup('group-1', '2024-01');

      // All created occurrences should have the group's amount and description
      const calls = (occRepo.create as jest.Mock).mock.calls;
      for (const call of calls) {
        expect(call[0].amount).toBe(123.45);
        expect(call[0].description).toBe('Custom description');
      }
    });
  });

  describe('getMonthlyTotal', () => {
    it('should delegate to occurrenceRepository.getMonthlyTotal', async () => {
      const occRepo = createMockOccurrenceRepository({
        getMonthlyTotal: jest.fn().mockResolvedValue(250.5),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: createMockGroupRepository(),
        occurrenceRepository: occRepo,
      });

      const total = await generator.getMonthlyTotal('2024-01');

      expect(total).toBe(250.5);
      expect(occRepo.getMonthlyTotal).toHaveBeenCalledWith('2024-01');
    });

    it('should return 0 when no occurrences exist for the month', async () => {
      const occRepo = createMockOccurrenceRepository({
        getMonthlyTotal: jest.fn().mockResolvedValue(0),
      });

      const generator = new OccurrenceGenerator({
        groupRepository: createMockGroupRepository(),
        occurrenceRepository: occRepo,
      });

      const total = await generator.getMonthlyTotal('2024-06');

      expect(total).toBe(0);
    });
  });
});
