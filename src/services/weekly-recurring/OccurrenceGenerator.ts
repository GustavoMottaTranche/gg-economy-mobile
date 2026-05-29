/**
 * Occurrence Generator Service
 *
 * Responsible for generating weekly occurrences for active recurring groups.
 * Handles lazy generation on month navigation, ensuring idempotency via
 * existsForGroupAndDate checks. Per-group generation is wrapped in a
 * SQLite transaction for atomicity — if one group fails, it rolls back
 * that group and continues with the rest.
 *
 * @module OccurrenceGenerator
 */

import { getWeeklyDatesForMonth, deriveReferenceMonth } from './dateUtils';
import { withTransaction } from '../../db/client';
import { logger } from '../logging';
import type { IWeeklyGroupRepository } from '../../repositories/interfaces/IWeeklyGroupRepository';
import type { IWeeklyOccurrenceRepository } from '../../repositories/interfaces/IWeeklyOccurrenceRepository';
import { weeklyGroupRepository } from '../../repositories/WeeklyGroupRepository';
import { weeklyOccurrenceRepository } from '../../repositories/WeeklyOccurrenceRepository';

/**
 * Interface for the OccurrenceGenerator service.
 */
export interface IOccurrenceGenerator {
  generateForMonth(targetMonth: string): Promise<void>;
  generateForGroup(groupId: string, targetMonth: string): Promise<void>;
  getMonthlyTotal(targetMonth: string): Promise<number>;
}

/**
 * Dependencies for the OccurrenceGenerator, enabling dependency injection for testing.
 */
export interface OccurrenceGeneratorDeps {
  groupRepository: IWeeklyGroupRepository;
  occurrenceRepository: IWeeklyOccurrenceRepository;
}

/**
 * OccurrenceGenerator generates weekly occurrences for active recurring groups.
 *
 * - `generateForMonth` generates occurrences for all active groups whose startDate <= last day of month.
 * - `generateForGroup` generates occurrences for a single group within a target month.
 * - `getMonthlyTotal` returns the sum of all occurrence amounts for a given month.
 *
 * Uses dependency injection pattern: accepts repositories in constructor,
 * defaults to singleton instances for production use.
 */
export class OccurrenceGenerator implements IOccurrenceGenerator {
  private groupRepository: IWeeklyGroupRepository;
  private occurrenceRepository: IWeeklyOccurrenceRepository;

  constructor(deps?: Partial<OccurrenceGeneratorDeps>) {
    this.groupRepository = deps?.groupRepository ?? weeklyGroupRepository;
    this.occurrenceRepository = deps?.occurrenceRepository ?? weeklyOccurrenceRepository;
  }

  /**
   * Generate occurrences for all active groups for a given target month.
   *
   * 1. Gets all active groups whose startDate <= last day of targetMonth.
   * 2. For each group, calls generateForGroup wrapped in try/catch.
   * 3. If one group fails, logs the error and continues with other groups (Req 6.5).
   *
   * @param targetMonth - Month in YYYY-MM format
   */
  async generateForMonth(targetMonth: string): Promise<void> {
    const activeGroups = await this.groupRepository.getActiveForMonth(targetMonth);

    for (const group of activeGroups) {
      try {
        await this.generateForGroup(group.id, targetMonth);
      } catch (error) {
        logger.error('Failed to generate occurrences for group', {
          groupId: group.id,
          groupTitle: group.title,
          targetMonth,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other groups (Req 6.5)
      }
    }
  }

  /**
   * Generate occurrences for a single group within a target month.
   *
   * 1. Gets the group by ID.
   * 2. Calculates dates using getWeeklyDatesForMonth.
   * 3. For each date, checks existsForGroupAndDate — if exists, skip (idempotency, Req 6.3).
   * 4. If not exists, creates occurrence with weeklyGroupId, date, referenceMonth, amount, description.
   * 5. Wraps in transaction for atomicity.
   *
   * @param groupId - The ID of the weekly recurring group
   * @param targetMonth - Month in YYYY-MM format
   * @throws Error if the group is not found or if the transaction fails
   */
  async generateForGroup(groupId: string, targetMonth: string): Promise<void> {
    const group = await this.groupRepository.getById(groupId);

    if (!group) {
      throw new Error(`Weekly recurring group not found: ${groupId}`);
    }

    const dates = getWeeklyDatesForMonth(targetMonth, group.dayOfWeek, group.startDate);

    if (dates.length === 0) {
      return;
    }

    await withTransaction(async () => {
      for (const date of dates) {
        const exists = await this.occurrenceRepository.existsForGroupAndDate(groupId, date);

        if (exists) {
          continue; // Idempotency: skip if already exists (Req 6.3)
        }

        await this.occurrenceRepository.create({
          weeklyGroupId: groupId,
          date,
          referenceMonth: deriveReferenceMonth(date),
          amount: group.amount,
          description: group.description,
          isValueEdited: false,
        });
      }
    });
  }

  /**
   * Get the monthly total for all weekly occurrences in a given month.
   * Delegates to WeeklyOccurrenceRepository.getMonthlyTotal.
   *
   * @param targetMonth - Month in YYYY-MM format
   * @returns The sum of all occurrence amounts for the month
   */
  async getMonthlyTotal(targetMonth: string): Promise<number> {
    return this.occurrenceRepository.getMonthlyTotal(targetMonth);
  }
}

/**
 * Singleton instance of OccurrenceGenerator for use throughout the application.
 * Uses default repository singletons.
 */
export const occurrenceGenerator = new OccurrenceGenerator();
