/**
 * Weekly Group Repository Implementation
 *
 * Implements IWeeklyGroupRepository interface using Drizzle ORM queries.
 * Provides data access for weekly recurring groups including CRUD operations
 * and specialized queries for active groups and month-based filtering.
 *
 * @module WeeklyGroupRepository
 */

import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import {
  weeklyRecurringGroups,
  type WeeklyRecurringGroupRecord,
  type NewWeeklyRecurringGroupRecord,
} from '../db/schema';
import type { WeeklyRecurringGroup } from '../types/weeklyRecurring';
import type { IWeeklyGroupRepository, WeeklyGroupUpdateFields } from './interfaces/IWeeklyGroupRepository';

/**
 * Convert a database record to a WeeklyRecurringGroup domain type.
 */
function toWeeklyRecurringGroup(record: WeeklyRecurringGroupRecord): WeeklyRecurringGroup {
  return {
    id: record.id,
    title: record.title,
    amount: record.amount,
    dayOfWeek: record.dayOfWeek,
    categoryId: record.categoryId,
    categoryType: record.categoryType,
    description: record.description,
    originId: record.originId,
    startDate: record.startDate,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Get the last day of a month given a YYYY-MM string.
 * Returns a YYYY-MM-DD string representing the last day of that month.
 */
function getLastDayOfMonth(targetMonth: string): string {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);
  // Day 0 of the next month gives the last day of the current month
  const lastDay = new Date(year, month, 0).getDate();
  return `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Repository implementation for weekly recurring group data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class WeeklyGroupRepository implements IWeeklyGroupRepository {
  /**
   * Create a new weekly recurring group.
   * Generates a UUID for the id if not provided.
   */
  async create(data: NewWeeklyRecurringGroupRecord): Promise<WeeklyRecurringGroup> {
    const db = getDb();
    const now = new Date().toISOString();

    const record: NewWeeklyRecurringGroupRecord = {
      id: data.id || randomUUID(),
      title: data.title,
      amount: data.amount,
      dayOfWeek: data.dayOfWeek,
      categoryId: data.categoryId,
      categoryType: data.categoryType ?? 'expense',
      description: data.description ?? '',
      originId: data.originId ?? null,
      startDate: data.startDate,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(weeklyRecurringGroups).values(record);

    return toWeeklyRecurringGroup(record as WeeklyRecurringGroupRecord);
  }

  /**
   * Update an existing weekly recurring group.
   * Sets updatedAt to current datetime.
   * Returns the updated record or null if not found.
   */
  async update(
    id: string,
    data: Partial<WeeklyGroupUpdateFields>
  ): Promise<WeeklyRecurringGroup | null> {
    const db = getDb();
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.dayOfWeek !== undefined) {
      updateData.dayOfWeek = data.dayOfWeek;
    }
    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId;
    }
    if (data.categoryType !== undefined) {
      updateData.categoryType = data.categoryType;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.originId !== undefined) {
      updateData.originId = data.originId;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    await db
      .update(weeklyRecurringGroups)
      .set(updateData)
      .where(eq(weeklyRecurringGroups.id, id));

    return this.getById(id);
  }

  /**
   * Soft-delete a weekly recurring group by setting is_active = false.
   * Sets updatedAt to current datetime.
   */
  async softDelete(id: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db
      .update(weeklyRecurringGroups)
      .set({ isActive: false, updatedAt: now })
      .where(eq(weeklyRecurringGroups.id, id));
  }

  /**
   * Get a weekly recurring group by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<WeeklyRecurringGroup | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyRecurringGroups)
      .where(eq(weeklyRecurringGroups.id, id))
      .limit(1);

    const first = results[0];
    return first ? toWeeklyRecurringGroup(first) : null;
  }

  /**
   * Get all active weekly recurring groups.
   */
  async getActive(): Promise<WeeklyRecurringGroup[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyRecurringGroups)
      .where(eq(weeklyRecurringGroups.isActive, true));

    return results.map(toWeeklyRecurringGroup);
  }

  /**
   * Get active groups whose startDate is on or before the last day of the target month.
   * This determines which groups should have occurrences generated for a given month.
   *
   * @param targetMonth - Month in YYYY-MM format
   */
  async getActiveForMonth(targetMonth: string): Promise<WeeklyRecurringGroup[]> {
    const db = getDb();
    const lastDay = getLastDayOfMonth(targetMonth);

    const results = await db
      .select()
      .from(weeklyRecurringGroups)
      .where(
        and(
          eq(weeklyRecurringGroups.isActive, true),
          sql`${weeklyRecurringGroups.startDate} <= ${lastDay}`
        )
      );

    return results.map(toWeeklyRecurringGroup);
  }
}

/**
 * Singleton instance of WeeklyGroupRepository for use throughout the application.
 * Services should accept IWeeklyGroupRepository through constructor injection,
 * defaulting to this instance for production use.
 */
export const weeklyGroupRepository = new WeeklyGroupRepository();
