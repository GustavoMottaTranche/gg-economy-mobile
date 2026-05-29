import type { WeeklyRecurringGroup } from '../../types/weeklyRecurring';
import type { NewWeeklyRecurringGroupRecord } from '../../db/schema';

/**
 * Fields that can be updated on a weekly recurring group.
 */
export interface WeeklyGroupUpdateFields {
  title: string;
  amount: number;
  dayOfWeek: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  description: string;
  originId: string | null;
  isActive: boolean;
}

/**
 * Repository interface for weekly recurring group data access.
 * Abstracts CRUD operations for weekly recurring groups, enabling dependency injection and easier testing.
 */
export interface IWeeklyGroupRepository {
  create(data: NewWeeklyRecurringGroupRecord): Promise<WeeklyRecurringGroup>;
  update(id: string, data: Partial<WeeklyGroupUpdateFields>): Promise<WeeklyRecurringGroup | null>;
  softDelete(id: string): Promise<void>;
  getById(id: string): Promise<WeeklyRecurringGroup | null>;
  getActive(): Promise<WeeklyRecurringGroup[]>;
  getActiveForMonth(targetMonth: string): Promise<WeeklyRecurringGroup[]>;
}
