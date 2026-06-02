/**
 * Weekly Occurrence Repository Implementation
 *
 * Implements IWeeklyOccurrenceRepository interface using Drizzle ORM
 * for direct database access. Provides CRUD operations and specialized
 * queries for weekly occurrence management.
 *
 * @module WeeklyOccurrenceRepository
 */

import { eq, and, sql, gte, lt, asc } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import {
  weeklyOccurrences,
  type WeeklyOccurrenceRecord,
  type NewWeeklyOccurrenceRecord,
} from '../db/schema';
import type { WeeklyOccurrence } from '../types/weeklyRecurring';
import type {
  IWeeklyOccurrenceRepository,
  CreateWeeklyOccurrenceInput,
  WeeklyOccurrenceUpdateFields,
} from './interfaces/IWeeklyOccurrenceRepository';

/**
 * Convert a database record to a WeeklyOccurrence domain object.
 */
function toWeeklyOccurrence(record: WeeklyOccurrenceRecord): WeeklyOccurrence {
  return {
    id: record.id,
    weeklyGroupId: record.weeklyGroupId,
    date: record.date,
    referenceMonth: record.referenceMonth,
    amount: record.amount,
    description: record.description,
    isValueEdited: record.isValueEdited,
    isPaid: record.isPaid,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repository implementation for weekly occurrence data access.
 * Uses Drizzle ORM queries directly against the weeklyOccurrences table.
 */
export class WeeklyOccurrenceRepository implements IWeeklyOccurrenceRepository {
  /**
   * Create a single weekly occurrence.
   */
  async create(data: CreateWeeklyOccurrenceInput): Promise<WeeklyOccurrence> {
    const db = getDb();
    const id = data.id ?? randomUUID();
    const now = new Date().toISOString();

    const record: NewWeeklyOccurrenceRecord = {
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };

    await db.insert(weeklyOccurrences).values(record);

    return toWeeklyOccurrence({
      id,
      weeklyGroupId: record.weeklyGroupId,
      date: record.date,
      referenceMonth: record.referenceMonth,
      amount: record.amount,
      description: record.description ?? '',
      isValueEdited: record.isValueEdited ?? false,
      isPaid: record.isPaid ?? false,
      createdAt: record.createdAt ?? now,
      updatedAt: record.updatedAt ?? now,
    });
  }

  /**
   * Create multiple weekly occurrences.
   * Each occurrence gets a unique UUID if not provided.
   */
  async createMany(data: CreateWeeklyOccurrenceInput[]): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const now = new Date().toISOString();
    const results: WeeklyOccurrence[] = [];

    for (const item of data) {
      const id = item.id ?? randomUUID();
      const record: NewWeeklyOccurrenceRecord = {
        ...item,
        id,
        createdAt: item.createdAt ?? now,
        updatedAt: item.updatedAt ?? now,
      };

      await db.insert(weeklyOccurrences).values(record);

      results.push(
        toWeeklyOccurrence({
          id,
          weeklyGroupId: record.weeklyGroupId,
          date: record.date,
          referenceMonth: record.referenceMonth,
          amount: record.amount,
          description: record.description ?? '',
          isValueEdited: record.isValueEdited ?? false,
          isPaid: record.isPaid ?? false,
          createdAt: record.createdAt ?? now,
          updatedAt: record.updatedAt ?? now,
        })
      );
    }

    return results;
  }

  /**
   * Update a weekly occurrence by ID.
   * Sets updatedAt automatically.
   * Returns the updated occurrence or null if not found.
   */
  async update(
    id: string,
    data: Partial<WeeklyOccurrenceUpdateFields>
  ): Promise<WeeklyOccurrence | null> {
    const db = getDb();
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.date !== undefined) {
      updateData.date = data.date;
    }
    if (data.referenceMonth !== undefined) {
      updateData.referenceMonth = data.referenceMonth;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.isValueEdited !== undefined) {
      updateData.isValueEdited = data.isValueEdited;
    }

    await db.update(weeklyOccurrences).set(updateData).where(eq(weeklyOccurrences.id, id));

    // Fetch and return the updated record
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.id, id))
      .limit(1);

    const first = results[0];
    return first ? toWeeklyOccurrence(first) : null;
  }

  /**
   * Delete a single weekly occurrence by ID.
   */
  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(weeklyOccurrences).where(eq(weeklyOccurrences.id, id));
  }

  /**
   * Delete multiple weekly occurrences by their IDs.
   */
  async deleteMany(ids: string[]): Promise<void> {
    const db = getDb();
    for (const id of ids) {
      await db.delete(weeklyOccurrences).where(eq(weeklyOccurrences.id, id));
    }
  }

  /**
   * Delete future unedited occurrences for a group.
   * Deletes where weekly_group_id = groupId AND date >= fromDate AND is_value_edited = false.
   */
  async deleteFutureUnedited(groupId: string, fromDate: string): Promise<void> {
    const db = getDb();
    await db
      .delete(weeklyOccurrences)
      .where(
        and(
          eq(weeklyOccurrences.weeklyGroupId, groupId),
          gte(weeklyOccurrences.date, fromDate),
          eq(weeklyOccurrences.isValueEdited, false)
        )
      );
  }

  /**
   * Delete all future occurrences for a group (regardless of edit status).
   * Deletes where weekly_group_id = groupId AND date >= fromDate.
   */
  async deleteFuture(groupId: string, fromDate: string): Promise<void> {
    const db = getDb();
    await db
      .delete(weeklyOccurrences)
      .where(
        and(eq(weeklyOccurrences.weeklyGroupId, groupId), gte(weeklyOccurrences.date, fromDate))
      );
  }

  /**
   * Get a single occurrence by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<WeeklyOccurrence | null> {
    const db = getDb();
    const results = await db.select().from(weeklyOccurrences).where(eq(weeklyOccurrences.id, id));
    if (results.length === 0) return null;
    return toWeeklyOccurrence(results[0]!);
  }

  /**
   * Get all occurrences for a group, ordered by date ascending.
   */
  async getByGroupId(groupId: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.weeklyGroupId, groupId))
      .orderBy(asc(weeklyOccurrences.date));
    return results.map(toWeeklyOccurrence);
  }

  /**
   * Get all occurrences for a given reference month.
   */
  async getByMonth(targetMonth: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.referenceMonth, targetMonth));
    return results.map(toWeeklyOccurrence);
  }

  /**
   * Get occurrences for a specific group and reference month.
   */
  async getByGroupAndMonth(groupId: string, targetMonth: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(
        and(
          eq(weeklyOccurrences.weeklyGroupId, groupId),
          eq(weeklyOccurrences.referenceMonth, targetMonth)
        )
      );
    return results.map(toWeeklyOccurrence);
  }

  /**
   * Get the sum of all occurrence amounts for a given reference month.
   * Returns 0 if no occurrences exist for the month.
   */
  async getMonthlyTotal(targetMonth: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${weeklyOccurrences.amount}), 0)`,
      })
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.referenceMonth, targetMonth));

    return result[0]?.total ?? 0;
  }

  /**
   * Check if an occurrence exists for a given group and date combination.
   */
  async existsForGroupAndDate(groupId: string, date: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(weeklyOccurrences)
      .where(and(eq(weeklyOccurrences.weeklyGroupId, groupId), eq(weeklyOccurrences.date, date)));

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Get future unedited occurrences for a group.
   * Returns where weekly_group_id = groupId AND date >= fromDate AND is_value_edited = false.
   */
  async getFutureUnedited(groupId: string, fromDate: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(
        and(
          eq(weeklyOccurrences.weeklyGroupId, groupId),
          gte(weeklyOccurrences.date, fromDate),
          eq(weeklyOccurrences.isValueEdited, false)
        )
      )
      .orderBy(asc(weeklyOccurrences.date));
    return results.map(toWeeklyOccurrence);
  }

  /**
   * Get all future occurrences for a group (regardless of edit status).
   * Returns where weekly_group_id = groupId AND date >= fromDate.
   */
  async getFuture(groupId: string, fromDate: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(
        and(eq(weeklyOccurrences.weeklyGroupId, groupId), gte(weeklyOccurrences.date, fromDate))
      )
      .orderBy(asc(weeklyOccurrences.date));
    return results.map(toWeeklyOccurrence);
  }

  /**
   * Get past occurrences for a group.
   * Returns where weekly_group_id = groupId AND date < beforeDate.
   */
  async getPast(groupId: string, beforeDate: string): Promise<WeeklyOccurrence[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(
        and(eq(weeklyOccurrences.weeklyGroupId, groupId), lt(weeklyOccurrences.date, beforeDate))
      )
      .orderBy(asc(weeklyOccurrences.date));
    return results.map(toWeeklyOccurrence);
  }
}

/**
 * Singleton instance of WeeklyOccurrenceRepository for use throughout the application.
 * Services should accept IWeeklyOccurrenceRepository through constructor injection,
 * defaulting to this instance for production use.
 */
export const weeklyOccurrenceRepository = new WeeklyOccurrenceRepository();
