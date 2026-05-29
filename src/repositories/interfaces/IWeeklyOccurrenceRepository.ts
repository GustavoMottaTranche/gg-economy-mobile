import type { WeeklyOccurrence } from '../../types/weeklyRecurring';
import type { NewWeeklyOccurrenceRecord } from '../../db/schema';

/**
 * Fields that can be updated on a weekly occurrence.
 */
export interface WeeklyOccurrenceUpdateFields {
  amount: number;
  date: string;
  referenceMonth: string;
  description: string;
  isValueEdited: boolean;
}

/**
 * Repository interface for weekly occurrence data access.
 * Abstracts CRUD and query operations for weekly occurrences,
 * enabling dependency injection and easier testing.
 */
export interface IWeeklyOccurrenceRepository {
  // Create methods
  create(data: NewWeeklyOccurrenceRecord): Promise<WeeklyOccurrence>;
  createMany(data: NewWeeklyOccurrenceRecord[]): Promise<WeeklyOccurrence[]>;

  // Update methods
  update(id: string, data: Partial<WeeklyOccurrenceUpdateFields>): Promise<WeeklyOccurrence | null>;

  // Delete methods
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteFutureUnedited(groupId: string, fromDate: string): Promise<void>;
  deleteFuture(groupId: string, fromDate: string): Promise<void>;

  // Query methods
  getById(id: string): Promise<WeeklyOccurrence | null>;
  getByGroupId(groupId: string): Promise<WeeklyOccurrence[]>;
  getByMonth(targetMonth: string): Promise<WeeklyOccurrence[]>;
  getByGroupAndMonth(groupId: string, targetMonth: string): Promise<WeeklyOccurrence[]>;
  getMonthlyTotal(targetMonth: string): Promise<number>;
  existsForGroupAndDate(groupId: string, date: string): Promise<boolean>;
  getFutureUnedited(groupId: string, fromDate: string): Promise<WeeklyOccurrence[]>;
  getFuture(groupId: string, fromDate: string): Promise<WeeklyOccurrence[]>;
  getPast(groupId: string, beforeDate: string): Promise<WeeklyOccurrence[]>;
}
