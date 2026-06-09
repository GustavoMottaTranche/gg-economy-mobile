/**
 * Fund Allocation Repository Implementation
 *
 * Provides data access for monthly fund allocation CRUD operations using Drizzle ORM.
 * Supports upsert (INSERT OR REPLACE) for the unique (fund_id, reference_month) combination.
 *
 * @module FundAllocationRepository
 */

import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { fundAllocations, type FundAllocationRecord } from '../db/schema';
import type { FundAllocation } from '../types/fund';

/**
 * Convert a database record to a FundAllocation domain type.
 */
function toFundAllocation(record: FundAllocationRecord): FundAllocation {
  return {
    id: record.id,
    fundId: record.fundId,
    referenceMonth: record.referenceMonth,
    amount: record.amount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repository implementation for fund allocation data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class FundAllocationRepository {
  /**
   * Get the allocation for a specific fund and month.
   * Returns null if no allocation exists for that combination.
   */
  async getByFundAndMonth(fundId: string, month: string): Promise<FundAllocation | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundAllocations)
      .where(and(eq(fundAllocations.fundId, fundId), eq(fundAllocations.referenceMonth, month)))
      .limit(1);
    const first = results[0];
    return first ? toFundAllocation(first) : null;
  }

  /**
   * Get all allocations for a given reference month (across all funds).
   */
  async getAllForMonth(month: string): Promise<FundAllocation[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.referenceMonth, month));
    return results.map(toFundAllocation);
  }

  /**
   * Get all allocations for a given fund across all months.
   */
  async getAllForFund(fundId: string): Promise<FundAllocation[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.fundId, fundId));
    return results.map(toFundAllocation);
  }

  /**
   * Insert or replace a fund allocation for the given fund and month.
   * Uses INSERT OR REPLACE pattern leveraging the unique (fund_id, reference_month) index.
   * If an allocation already exists for the combination, it is updated with the new amount.
   * Returns the resulting allocation.
   */
  async upsert(fundId: string, month: string, amountInCents: number): Promise<FundAllocation> {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = await this.getByFundAndMonth(fundId, month);

    if (existing) {
      await db
        .update(fundAllocations)
        .set({ amount: amountInCents, updatedAt: now })
        .where(eq(fundAllocations.id, existing.id));

      return {
        ...existing,
        amount: amountInCents,
        updatedAt: now,
      };
    }

    const id = randomUUID();

    await db.insert(fundAllocations).values({
      id,
      fundId,
      referenceMonth: month,
      amount: amountInCents,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      fundId,
      referenceMonth: month,
      amount: amountInCents,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Delete the allocation for a specific fund and month.
   * No-op if no allocation exists for that combination.
   */
  async delete(fundId: string, month: string): Promise<void> {
    const db = getDb();
    await db
      .delete(fundAllocations)
      .where(and(eq(fundAllocations.fundId, fundId), eq(fundAllocations.referenceMonth, month)));
  }
}

/**
 * Singleton instance of FundAllocationRepository for use throughout the application.
 */
export const fundAllocationRepository = new FundAllocationRepository();
