/**
 * Recurring Fund Link Repository Implementation
 *
 * Provides data access for recurring-fund link operations using Drizzle ORM.
 * Handles associating recurring transactions with funds so generated instances
 * are automatically linked to the fund.
 *
 * @module RecurringFundLinkRepository
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { recurringFundLinks, type RecurringFundLinkRecord } from '../db/schema';
import type { RecurringFundLink } from '../types/fund';

/**
 * Convert a database record to a RecurringFundLink domain type.
 */
function toRecurringFundLink(record: RecurringFundLinkRecord): RecurringFundLink {
  return {
    id: record.id,
    recurringId: record.recurringId,
    fundId: record.fundId,
    createdAt: record.createdAt,
  };
}

/**
 * Repository implementation for recurring-fund link data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class RecurringFundLinkRepository {
  /**
   * Get the fund link for a specific recurring transaction.
   * Returns null if the recurring transaction is not linked to any fund.
   */
  async getByRecurringId(recurringId: string): Promise<RecurringFundLink | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(recurringFundLinks)
      .where(eq(recurringFundLinks.recurringId, recurringId))
      .limit(1);
    const first = results[0];
    return first ? toRecurringFundLink(first) : null;
  }

  /**
   * Get all fund links for a specific fund.
   * Returns all recurring transactions associated with the given fund.
   */
  async getByFundId(fundId: string): Promise<RecurringFundLink[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(recurringFundLinks)
      .where(eq(recurringFundLinks.fundId, fundId));
    return results.map(toRecurringFundLink);
  }

  /**
   * Link a recurring transaction to a fund.
   * Creates a recurring_fund_links record associating the recurring transaction with the fund.
   * Returns the created link record.
   */
  async link(recurringId: string, fundId: string): Promise<RecurringFundLink> {
    const db = getDb();
    const now = new Date().toISOString();
    const id = randomUUID();

    await db.insert(recurringFundLinks).values({
      id,
      recurringId,
      fundId,
      createdAt: now,
    });

    return {
      id,
      recurringId,
      fundId,
      createdAt: now,
    };
  }

  /**
   * Unlink a recurring transaction from its fund.
   * Deletes the recurring_fund_links record for the given recurring transaction.
   * Does NOT unlink previously generated transactions.
   */
  async unlink(recurringId: string): Promise<void> {
    const db = getDb();
    await db.delete(recurringFundLinks).where(eq(recurringFundLinks.recurringId, recurringId));
  }
}

/**
 * Singleton instance of RecurringFundLinkRepository for use throughout the application.
 */
export const recurringFundLinkRepository = new RecurringFundLinkRepository();
