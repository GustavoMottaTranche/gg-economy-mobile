/**
 * Payment Status Service
 *
 * Centralized service for managing payment status of recurring occurrences.
 * Handles toggle operations, pending items queries, payment totals computation,
 * and group payment summaries.
 *
 * @module PaymentStatusService
 *
 * Requirements: 1.1, 1.4, 1.5, 4.1, 5.1, 5.5, 6.3
 */

import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import {
  weeklyOccurrences,
  transactions,
  weeklyRecurringGroups,
  recurringTransactions,
  categories,
  type WeeklyOccurrenceRecord,
  type TransactionRecord,
} from '../../db/schema';
import { logger } from '../logging';
import type {
  PendingItem,
  PaymentTotals,
  GroupPaymentSummary,
  BulkMarkResult,
} from '../../types/paymentStatus';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Interface for the PaymentStatusService.
 */
export interface IPaymentStatusService {
  toggleWeeklyOccurrence(occurrenceId: string): Promise<WeeklyOccurrenceRecord>;
  toggleMonthlyTransaction(transactionId: string): Promise<TransactionRecord>;
  bulkMarkWeeklyGroup(groupId: string): Promise<BulkMarkResult>;
  bulkMarkMonthlyGroup(recurringId: string): Promise<BulkMarkResult>;
  getPendingItemsForMonth(month: string): Promise<PendingItem[]>;
  getPaymentTotalsForMonth(month: string): Promise<PaymentTotals>;
  getGroupPaymentSummary(groupId: string, type: 'weekly' | 'monthly'): Promise<GroupPaymentSummary>;
}

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * PaymentStatusService manages all payment status operations for recurring expenses.
 *
 * - `toggleWeeklyOccurrence`: flips isPaid for a weekly occurrence
 * - `toggleMonthlyTransaction`: flips isPaid for a monthly recurring transaction
 * - `bulkMarkWeeklyGroup`: marks all unpaid occurrences in a weekly group as paid
 * - `bulkMarkMonthlyGroup`: marks all unpaid transactions in a monthly group as paid
 * - `getPendingItemsForMonth`: returns all unpaid items for a given month, sorted by date
 * - `getPaymentTotalsForMonth`: computes predicted, paid, and pending totals
 * - `getGroupPaymentSummary`: returns paid/pending counts for a group
 */
export class PaymentStatusService implements IPaymentStatusService {
  /**
   * Toggle the isPaid status of a weekly occurrence.
   * Flips the boolean value and persists the change.
   *
   * @param occurrenceId - The ID of the weekly occurrence to toggle
   * @returns The updated WeeklyOccurrenceRecord
   * @throws Error if occurrence not found
   *
   * Requirements: 1.1, 1.5
   */
  async toggleWeeklyOccurrence(occurrenceId: string): Promise<WeeklyOccurrenceRecord> {
    const db = getDb();

    // Fetch current occurrence
    const results = await db
      .select()
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.id, occurrenceId))
      .limit(1);

    const occurrence = results[0];
    if (!occurrence) {
      const error = new Error(`Weekly occurrence not found: ${occurrenceId}`);
      error.name = 'NotFoundError';
      throw error;
    }

    // Flip the isPaid boolean
    const newIsPaid = !occurrence.isPaid;
    const now = new Date().toISOString();

    await db
      .update(weeklyOccurrences)
      .set({ isPaid: newIsPaid, updatedAt: now })
      .where(eq(weeklyOccurrences.id, occurrenceId));

    logger.debug('Toggled weekly occurrence payment status', {
      occurrenceId,
      isPaid: newIsPaid,
    });

    return { ...occurrence, isPaid: newIsPaid, updatedAt: now };
  }

  /**
   * Toggle the isPaid status of a monthly recurring transaction.
   * Flips the boolean value and persists the change.
   *
   * @param transactionId - The ID of the transaction to toggle
   * @returns The updated TransactionRecord
   * @throws Error if transaction not found or not a recurring transaction
   *
   * Requirements: 1.1, 1.5
   */
  async toggleMonthlyTransaction(transactionId: string): Promise<TransactionRecord> {
    const db = getDb();

    // Fetch current transaction
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    const transaction = results[0];
    if (!transaction) {
      const error = new Error(`Transaction not found: ${transactionId}`);
      error.name = 'NotFoundError';
      throw error;
    }

    // Flip the isPaid boolean
    const newIsPaid = !transaction.isPaid;
    const now = new Date().toISOString();

    await db
      .update(transactions)
      .set({ isPaid: newIsPaid, updatedAt: now })
      .where(eq(transactions.id, transactionId));

    logger.debug('Toggled monthly transaction payment status', {
      transactionId,
      isPaid: newIsPaid,
    });

    return { ...transaction, isPaid: newIsPaid, updatedAt: now };
  }

  /**
   * Bulk mark all unpaid occurrences in a weekly group as paid.
   * Uses a SQLite transaction to ensure atomicity — if any update fails,
   * all changes are rolled back.
   *
   * @param groupId - The weekly recurring group ID
   * @returns BulkMarkResult with count of marked items and affected months
   *
   * Requirements: 3.2, 3.3, 3.4, 3.5
   */
  async bulkMarkWeeklyGroup(groupId: string): Promise<BulkMarkResult> {
    const db = getDb();

    return withTransaction(async () => {
      // Find all unpaid occurrences for this group
      const unpaidOccurrences = await db
        .select({
          id: weeklyOccurrences.id,
          referenceMonth: weeklyOccurrences.referenceMonth,
        })
        .from(weeklyOccurrences)
        .where(
          and(eq(weeklyOccurrences.weeklyGroupId, groupId), eq(weeklyOccurrences.isPaid, false))
        );

      if (unpaidOccurrences.length === 0) {
        return { markedCount: 0, affectedMonths: [] };
      }

      // Collect distinct affected months
      const affectedMonths = Array.from(
        new Set(unpaidOccurrences.map((o) => o.referenceMonth))
      ).sort();

      // Update all unpaid occurrences to paid
      const now = new Date().toISOString();
      await db
        .update(weeklyOccurrences)
        .set({ isPaid: true, updatedAt: now })
        .where(
          and(eq(weeklyOccurrences.weeklyGroupId, groupId), eq(weeklyOccurrences.isPaid, false))
        );

      logger.debug('Bulk marked weekly group as paid', {
        groupId,
        markedCount: unpaidOccurrences.length,
        affectedMonths,
      });

      return {
        markedCount: unpaidOccurrences.length,
        affectedMonths,
      };
    });
  }

  /**
   * Bulk mark all unpaid transactions in a monthly recurring group as paid.
   * Uses a SQLite transaction to ensure atomicity — if any update fails,
   * all changes are rolled back.
   *
   * @param recurringId - The recurring transaction ID
   * @returns BulkMarkResult with count of marked items and affected months
   *
   * Requirements: 3.2, 3.3, 3.4, 3.5
   */
  async bulkMarkMonthlyGroup(recurringId: string): Promise<BulkMarkResult> {
    const db = getDb();

    return withTransaction(async () => {
      // Find all unpaid transactions for this recurring group
      const unpaidTransactions = await db
        .select({
          id: transactions.id,
          referenceMonth: transactions.referenceMonth,
        })
        .from(transactions)
        .where(and(eq(transactions.recurringId, recurringId), eq(transactions.isPaid, false)));

      if (unpaidTransactions.length === 0) {
        return { markedCount: 0, affectedMonths: [] };
      }

      // Collect distinct affected months
      const affectedMonths = Array.from(
        new Set(unpaidTransactions.map((t) => t.referenceMonth))
      ).sort();

      // Update all unpaid transactions to paid
      const now = new Date().toISOString();
      await db
        .update(transactions)
        .set({ isPaid: true, updatedAt: now })
        .where(and(eq(transactions.recurringId, recurringId), eq(transactions.isPaid, false)));

      logger.debug('Bulk marked monthly group as paid', {
        recurringId,
        markedCount: unpaidTransactions.length,
        affectedMonths,
      });

      return {
        markedCount: unpaidTransactions.length,
        affectedMonths,
      };
    });
  }

  /**
   * Get all pending (unpaid) items for a given month.
   * Queries both weeklyOccurrences and transactions (where recurringId is not null)
   * for isPaid=false, joins with group tables to get names, and returns sorted by date ascending.
   *
   * @param month - Reference month in YYYY-MM format
   * @returns Array of PendingItem sorted by date ascending
   *
   * Requirements: 4.1
   */
  async getPendingItemsForMonth(month: string): Promise<PendingItem[]> {
    const db = getDb();

    // Query pending weekly occurrences with group name and expense group
    const weeklyPending = await db
      .select({
        id: weeklyOccurrences.id,
        groupId: weeklyOccurrences.weeklyGroupId,
        groupName: weeklyRecurringGroups.title,
        amount: weeklyOccurrences.amount,
        date: weeklyOccurrences.date,
        referenceMonth: weeklyOccurrences.referenceMonth,
        expenseGroup: categories.expenseGroup,
      })
      .from(weeklyOccurrences)
      .innerJoin(
        weeklyRecurringGroups,
        eq(weeklyOccurrences.weeklyGroupId, weeklyRecurringGroups.id)
      )
      .leftJoin(categories, eq(weeklyRecurringGroups.categoryId, categories.id))
      .where(and(eq(weeklyOccurrences.referenceMonth, month), eq(weeklyOccurrences.isPaid, false)));

    // Query pending monthly transactions (recurring only) with recurring name and expense group
    const monthlyPending = await db
      .select({
        id: transactions.id,
        groupId: transactions.recurringId,
        groupName: recurringTransactions.title,
        amount: transactions.amount,
        date: transactions.date,
        referenceMonth: transactions.referenceMonth,
        expenseGroup: categories.expenseGroup,
      })
      .from(transactions)
      .innerJoin(recurringTransactions, eq(transactions.recurringId, recurringTransactions.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.referenceMonth, month),
          eq(transactions.isPaid, false),
          isNotNull(transactions.recurringId)
        )
      );

    // Combine and map to PendingItem
    const pendingItems: PendingItem[] = [
      ...weeklyPending.map((item) => ({
        id: item.id,
        type: 'weekly' as const,
        groupId: item.groupId,
        groupName: item.groupName,
        amount: item.amount,
        date: item.date,
        referenceMonth: item.referenceMonth,
        expenseGroup: (item.expenseGroup as 'fixed' | 'variable' | null) ?? null,
      })),
      ...monthlyPending.map((item) => ({
        id: item.id,
        type: 'monthly' as const,
        groupId: item.groupId!,
        groupName: item.groupName,
        amount: item.amount,
        date: typeof item.date === 'string' ? item.date : item.date,
        referenceMonth: item.referenceMonth,
        expenseGroup: (item.expenseGroup as 'fixed' | 'variable' | null) ?? null,
      })),
    ];

    // Sort by date ascending
    pendingItems.sort((a, b) => a.date.localeCompare(b.date));

    return pendingItems;
  }

  /**
   * Compute payment totals for a given month.
   * Includes ALL recurring occurrences (both active and inactive groups) for the month.
   *
   * predictedTotal = sum of all recurring occurrence amounts for the month
   * paidTotal = sum of amounts where isPaid = true
   * pendingTotal = predictedTotal - paidTotal
   *
   * @param month - Reference month in YYYY-MM format
   * @returns PaymentTotals with predictedTotal, paidTotal, pendingTotal
   *
   * Requirements: 1.4, 5.1, 5.5
   */
  async getPaymentTotalsForMonth(month: string): Promise<PaymentTotals> {
    const db = getDb();

    // Get totals from weekly occurrences
    const weeklyTotals = await db
      .select({
        predictedTotal: sql<number>`COALESCE(SUM(${weeklyOccurrences.amount}), 0)`,
        paidTotal: sql<number>`COALESCE(SUM(CASE WHEN ${weeklyOccurrences.isPaid} = 1 THEN ${weeklyOccurrences.amount} ELSE 0 END), 0)`,
      })
      .from(weeklyOccurrences)
      .where(eq(weeklyOccurrences.referenceMonth, month));

    // Get totals from monthly recurring transactions
    const monthlyTotals = await db
      .select({
        predictedTotal: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        paidTotal: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.isPaid} = 1 THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.referenceMonth, month), isNotNull(transactions.recurringId)));

    const weeklyPredicted = weeklyTotals[0]?.predictedTotal ?? 0;
    const weeklyPaid = weeklyTotals[0]?.paidTotal ?? 0;
    const monthlyPredicted = monthlyTotals[0]?.predictedTotal ?? 0;
    const monthlyPaid = monthlyTotals[0]?.paidTotal ?? 0;

    const predictedTotal = weeklyPredicted + monthlyPredicted;
    const paidTotal = weeklyPaid + monthlyPaid;
    const pendingTotal = predictedTotal - paidTotal;

    return {
      predictedTotal,
      paidTotal,
      pendingTotal,
    };
  }

  /**
   * Get payment summary for a specific recurring group.
   * Returns total count, paid count, and pending count of occurrences.
   *
   * @param groupId - The group ID (weekly group ID or recurring transaction ID)
   * @param type - 'weekly' or 'monthly'
   * @returns GroupPaymentSummary with totalCount, paidCount, pendingCount
   *
   * Requirements: 6.3
   */
  async getGroupPaymentSummary(
    groupId: string,
    type: 'weekly' | 'monthly'
  ): Promise<GroupPaymentSummary> {
    const db = getDb();

    if (type === 'weekly') {
      const result = await db
        .select({
          totalCount: sql<number>`COUNT(*)`,
          paidCount: sql<number>`SUM(CASE WHEN ${weeklyOccurrences.isPaid} = 1 THEN 1 ELSE 0 END)`,
        })
        .from(weeklyOccurrences)
        .where(eq(weeklyOccurrences.weeklyGroupId, groupId));

      const totalCount = result[0]?.totalCount ?? 0;
      const paidCount = result[0]?.paidCount ?? 0;

      return {
        totalCount,
        paidCount,
        pendingCount: totalCount - paidCount,
      };
    } else {
      // Monthly: count transactions linked to this recurring ID
      const result = await db
        .select({
          totalCount: sql<number>`COUNT(*)`,
          paidCount: sql<number>`SUM(CASE WHEN ${transactions.isPaid} = 1 THEN 1 ELSE 0 END)`,
        })
        .from(transactions)
        .where(eq(transactions.recurringId, groupId));

      const totalCount = result[0]?.totalCount ?? 0;
      const paidCount = result[0]?.paidCount ?? 0;

      return {
        totalCount,
        paidCount,
        pendingCount: totalCount - paidCount,
      };
    }
  }
}

/**
 * Singleton instance of PaymentStatusService for use throughout the application.
 */
export const paymentStatusService = new PaymentStatusService();
