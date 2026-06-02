/**
 * Weekly Recurring Service
 *
 * Orchestrates CRUD operations for weekly recurring groups, including
 * validation, occurrence generation, and transactional updates.
 * All multi-step operations are wrapped in SQLite transactions for atomicity.
 *
 * @module WeeklyRecurringService
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 5.2, 5.3, 5.4, 5.6
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { validateWeeklyGroup } from '../../validation/weeklyRecurringValidation';
import { getTodayBoundary, deriveReferenceMonth, getWeeklyDatesForMonth } from './dateUtils';
import { getDb, withTransaction } from '../../db/client';
import { weeklyOccurrences } from '../../db/schema';
import { logger } from '../logging';
import type { IOccurrenceGenerator } from './OccurrenceGenerator';
import { occurrenceGenerator } from './OccurrenceGenerator';
import type { IWeeklyGroupRepository } from '../../repositories/interfaces/IWeeklyGroupRepository';
import type { IWeeklyOccurrenceRepository } from '../../repositories/interfaces/IWeeklyOccurrenceRepository';
import { weeklyGroupRepository } from '../../repositories/WeeklyGroupRepository';
import { weeklyOccurrenceRepository } from '../../repositories/WeeklyOccurrenceRepository';
import type {
  WeeklyRecurringGroup,
  CreateWeeklyGroupDTO,
  UpdateWeeklyGroupDTO,
} from '../../types/weeklyRecurring';
import type { PaymentStatusCreationOption } from '../../types/paymentStatus';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Interface for the WeeklyRecurringService.
 */
export interface IWeeklyRecurringService {
  createGroup(dto: CreateWeeklyGroupDTO): Promise<WeeklyRecurringGroup>;
  updateGroup(id: string, dto: UpdateWeeklyGroupDTO): Promise<WeeklyRecurringGroup>;
  deleteGroup(id: string): Promise<void>;
  getActiveGroups(): Promise<WeeklyRecurringGroup[]>;
  getGroupById(id: string): Promise<WeeklyRecurringGroup | null>;
}

/**
 * Dependencies for the WeeklyRecurringService, enabling dependency injection for testing.
 */
export interface WeeklyRecurringServiceDeps {
  groupRepository: IWeeklyGroupRepository;
  occurrenceRepository: IWeeklyOccurrenceRepository;
  occurrenceGenerator: IOccurrenceGenerator;
}

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * WeeklyRecurringService orchestrates all CRUD operations for weekly recurring groups.
 *
 * - `createGroup`: validates input, creates group, generates occurrences for current month
 * - `updateGroup`: validates merged data, updates group, handles future occurrence changes
 * - `deleteGroup`: soft-deletes group, removes future occurrences, preserves past
 * - `getActiveGroups`: returns all active groups
 * - `getGroupById`: returns a single group by ID
 *
 * Uses dependency injection pattern: accepts dependencies in constructor,
 * defaults to singleton instances for production use.
 */
export class WeeklyRecurringService implements IWeeklyRecurringService {
  private groupRepository: IWeeklyGroupRepository;
  private occurrenceRepository: IWeeklyOccurrenceRepository;
  private generator: IOccurrenceGenerator;

  constructor(deps?: Partial<WeeklyRecurringServiceDeps>) {
    this.groupRepository = deps?.groupRepository ?? weeklyGroupRepository;
    this.occurrenceRepository = deps?.occurrenceRepository ?? weeklyOccurrenceRepository;
    this.generator = deps?.occurrenceGenerator ?? occurrenceGenerator;
  }

  /**
   * Create a new weekly recurring group.
   *
   * 1. Validates input using validateWeeklyGroup
   * 2. If invalid, throws validation error
   * 3. Wraps in a single SQLite transaction:
   *    a. Creates group via repository with startDate = today
   *    b. Generates occurrences for current month via OccurrenceGenerator
   *    c. Applies payment status option to generated occurrences
   * 4. Returns created group
   *
   * Payment status options:
   * - "all_pending" (default): all occurrences keep isPaid=false (no action needed)
   * - "first_paid": find the occurrence with the minimum date in the first reference month and set isPaid=true
   * - "all_paid": set all generated occurrences to isPaid=true
   *
   * @param dto - Data for creating the group
   * @returns The created WeeklyRecurringGroup
   * @throws Error if validation fails or transaction fails (rollback on failure)
   *
   * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   */
  async createGroup(dto: CreateWeeklyGroupDTO): Promise<WeeklyRecurringGroup> {
    // Step 1-2: Validate input
    const validationResult = validateWeeklyGroup({
      title: dto.title,
      amount: dto.amount,
      dayOfWeek: dto.dayOfWeek,
      categoryId: dto.categoryId,
    });

    if (!validationResult.valid) {
      const error = new Error(
        `Validation failed: ${validationResult.errors?.join(', ') ?? 'Unknown error'}`
      );
      error.name = 'ValidationError';
      throw error;
    }

    const today = getTodayBoundary();
    const currentMonth = deriveReferenceMonth(today);
    const paymentStatusOption: PaymentStatusCreationOption =
      dto.paymentStatusOption ?? 'all_pending';

    // Step 3: Wrap creation + occurrence generation + status assignment in a single transaction
    const group = await withTransaction(async () => {
      // Step 3a: Create group with startDate = today
      const createdGroup = await this.groupRepository.create({
        id: randomUUID(),
        title: dto.title.trim(),
        amount: dto.amount,
        dayOfWeek: dto.dayOfWeek,
        categoryId: dto.categoryId,
        categoryType: dto.categoryType ?? 'expense',
        description: dto.description ?? '',
        originId: dto.originId ?? null,
        startDate: today,
        isActive: true,
      });

      // Step 3b: Generate occurrences for current month + 11 months ahead (12 total)
      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(
          parseInt(currentMonth.split('-')[0]!),
          parseInt(currentMonth.split('-')[1]!) - 1 + i,
          1
        );
        const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        await this.generator.generateForGroup(createdGroup.id, targetMonth);
      }

      // Step 3c: Apply payment status option to generated occurrences
      if (paymentStatusOption !== 'all_pending') {
        await this.applyPaymentStatusOption(createdGroup.id, paymentStatusOption);
      }

      return createdGroup;
    });

    return group;
  }

  /**
   * Apply payment status option to generated occurrences of a group.
   *
   * - "first_paid": finds the occurrence with the minimum date in the first (earliest)
   *   reference month and sets isPaid=true
   * - "all_paid": sets all occurrences to isPaid=true
   *
   * @param groupId - The group ID whose occurrences should be updated
   * @param option - The payment status creation option to apply
   *
   * Requirements: 2.3, 2.4, 2.7
   */
  private async applyPaymentStatusOption(
    groupId: string,
    option: PaymentStatusCreationOption
  ): Promise<void> {
    const db = getDb();

    if (option === 'all_paid') {
      // Set all occurrences for this group to isPaid=true
      const now = new Date().toISOString();
      await db
        .update(weeklyOccurrences)
        .set({ isPaid: true, updatedAt: now })
        .where(eq(weeklyOccurrences.weeklyGroupId, groupId));
    } else if (option === 'first_paid') {
      // Find all occurrences for this group
      const occurrences = await this.occurrenceRepository.getByGroupId(groupId);

      if (occurrences.length === 0) return;

      // Find the earliest reference month
      const firstMonth = occurrences.reduce(
        (min, occ) => (occ.referenceMonth < min ? occ.referenceMonth : min),
        occurrences[0].referenceMonth
      );

      // Filter occurrences in the first month and find the one with the minimum date
      const firstMonthOccurrences = occurrences.filter((occ) => occ.referenceMonth === firstMonth);

      const firstOccurrence = firstMonthOccurrences.reduce(
        (min, occ) => (occ.date < min.date ? occ : min),
        firstMonthOccurrences[0]
      );

      // Set isPaid=true for the first occurrence only
      const now = new Date().toISOString();
      await db
        .update(weeklyOccurrences)
        .set({ isPaid: true, updatedAt: now })
        .where(eq(weeklyOccurrences.id, firstOccurrence.id));
    }
  }

  /**
   * Update an existing weekly recurring group.
   *
   * 1. Gets existing group, throws if not found
   * 2. Validates the merged data
   * 3. Determines what changed (name, amount, dayOfWeek)
   * 4. Wraps in transaction:
   *    - Updates group record (set updatedAt)
   *    - If amount changed: update future unedited occurrences with new amount
   *    - If dayOfWeek changed:
   *      a. Delete future unedited occurrences
   *      b. Get all months that had generated occurrences for this group
   *      c. Regenerate occurrences for those months using new dayOfWeek
   *      d. Preserve future edited occurrences (is_value_edited = true)
   *    - Past occurrences (date < today) are NEVER modified (Req 4.6, 7.1)
   * 5. Returns updated group
   *
   * @param id - The group ID to update
   * @param dto - Partial update data
   * @returns The updated WeeklyRecurringGroup
   * @throws Error if group not found or validation fails
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9
   */
  async updateGroup(id: string, dto: UpdateWeeklyGroupDTO): Promise<WeeklyRecurringGroup> {
    // Step 1: Get existing group
    const existingGroup = await this.groupRepository.getById(id);
    if (!existingGroup) {
      const error = new Error(`Weekly recurring group not found: ${id}`);
      error.name = 'NotFoundError';
      throw error;
    }

    // Step 2: Validate merged data
    const mergedData = {
      title: dto.title ?? existingGroup.title,
      amount: dto.amount ?? existingGroup.amount,
      dayOfWeek: dto.dayOfWeek ?? existingGroup.dayOfWeek,
      categoryId: dto.categoryId ?? existingGroup.categoryId,
    };

    const validationResult = validateWeeklyGroup(mergedData);
    if (!validationResult.valid) {
      const error = new Error(
        `Validation failed: ${validationResult.errors?.join(', ') ?? 'Unknown error'}`
      );
      error.name = 'ValidationError';
      throw error;
    }

    // Step 3: Determine what changed
    const amountChanged = dto.amount !== undefined && dto.amount !== existingGroup.amount;
    const dayOfWeekChanged =
      dto.dayOfWeek !== undefined && dto.dayOfWeek !== existingGroup.dayOfWeek;

    const today = getTodayBoundary();

    // Step 4: Wrap in transaction (Req 4.9, 5.6)
    const updatedGroup = await withTransaction(async () => {
      // Update group record (Req 4.8)
      const updateFields: Record<string, unknown> = {};
      if (dto.title !== undefined) updateFields.title = dto.title.trim();
      if (dto.amount !== undefined) updateFields.amount = dto.amount;
      if (dto.dayOfWeek !== undefined) updateFields.dayOfWeek = dto.dayOfWeek;
      if (dto.categoryId !== undefined) updateFields.categoryId = dto.categoryId;
      if (dto.description !== undefined) updateFields.description = dto.description;
      if (dto.originId !== undefined) updateFields.originId = dto.originId;

      const updated = await this.groupRepository.update(id, updateFields);
      if (!updated) {
        throw new Error(`Failed to update group: ${id}`);
      }

      // Handle dayOfWeek change (Req 4.4, 4.5)
      if (dayOfWeekChanged) {
        // Get all occurrences for this group to determine which months had generated occurrences
        const allOccurrences = await this.occurrenceRepository.getByGroupId(id);
        const distinctMonths = Array.from(new Set(allOccurrences.map((o) => o.referenceMonth)));

        // Delete future unedited occurrences (Req 4.4)
        await this.occurrenceRepository.deleteFutureUnedited(id, today);

        // Regenerate occurrences for all months that previously had occurrences
        const newDayOfWeek = dto.dayOfWeek!;
        const newAmount = dto.amount ?? existingGroup.amount;

        for (const month of distinctMonths) {
          const dates = getWeeklyDatesForMonth(month, newDayOfWeek, updated.startDate);

          for (const date of dates) {
            // Only generate for future dates (date >= today)
            if (date < today) continue;

            // Check if occurrence already exists (could be an edited one we preserved)
            const exists = await this.occurrenceRepository.existsForGroupAndDate(id, date);
            if (exists) continue;

            await this.occurrenceRepository.create({
              id: randomUUID(),
              weeklyGroupId: id,
              date,
              referenceMonth: deriveReferenceMonth(date),
              amount: newAmount,
              description: updated.description,
              isValueEdited: false,
            });
          }
        }
      } else if (amountChanged) {
        // Handle amount change only (Req 4.2, 4.3)
        // Update future unedited occurrences with new amount
        const futureUnedited = await this.occurrenceRepository.getFutureUnedited(id, today);
        for (const occurrence of futureUnedited) {
          await this.occurrenceRepository.update(occurrence.id, {
            amount: dto.amount!,
          });
        }
      }

      return updated;
    });

    return updatedGroup;
  }

  /**
   * Delete (soft-delete) a weekly recurring group.
   *
   * 1. Gets existing group, throws if not found
   * 2. Wraps in transaction:
   *    - Soft-deletes group (set is_active = false)
   *    - Deletes all future occurrences (date >= today) — both edited and unedited
   *    - Preserves all past occurrences (date < today)
   * 3. If transaction fails, rollback (Req 5.6)
   *
   * @param id - The group ID to delete
   * @throws Error if group not found or transaction fails
   *
   * Requirements: 5.2, 5.3, 5.4, 5.6
   */
  async deleteGroup(id: string): Promise<void> {
    // Step 1: Get existing group
    const existingGroup = await this.groupRepository.getById(id);
    if (!existingGroup) {
      const error = new Error(`Weekly recurring group not found: ${id}`);
      error.name = 'NotFoundError';
      throw error;
    }

    const today = getTodayBoundary();

    // Step 2: Wrap in transaction (Req 5.6)
    await withTransaction(async () => {
      // Soft-delete group (Req 5.2)
      await this.groupRepository.softDelete(id);

      // Delete all future occurrences (Req 5.4)
      // This removes both edited and unedited future occurrences
      await this.occurrenceRepository.deleteFuture(id, today);

      // Past occurrences (date < today) are preserved automatically (Req 5.3)
    });
  }

  /**
   * Get all active weekly recurring groups.
   * Delegates to repository.getActive().
   *
   * @returns Array of active WeeklyRecurringGroup
   */
  async getActiveGroups(): Promise<WeeklyRecurringGroup[]> {
    return this.groupRepository.getActive();
  }

  /**
   * Get a weekly recurring group by its ID.
   * Delegates to repository.getById().
   *
   * @param id - The group ID
   * @returns The group or null if not found
   */
  async getGroupById(id: string): Promise<WeeklyRecurringGroup | null> {
    return this.groupRepository.getById(id);
  }
}

/**
 * Singleton instance of WeeklyRecurringService for use throughout the application.
 * Uses default repository and generator singletons.
 */
export const weeklyRecurringService = new WeeklyRecurringService();
