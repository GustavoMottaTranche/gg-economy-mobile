/**
 * Fund Balance Repository Implementation
 *
 * Provides data access for fund base balance management using Drizzle ORM.
 * Supports upsert for the unique fund_id constraint.
 *
 * @module FundBalanceRepository
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { fundBalances, type FundBalanceRecord } from '../db/schema';
import type { FundBalance } from '../types/fund';

/**
 * Convert a database record to a FundBalance domain type.
 */
function toFundBalance(record: FundBalanceRecord): FundBalance {
  return {
    id: record.id,
    fundId: record.fundId,
    baseAmount: record.baseAmount,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repository implementation for fund balance data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class FundBalanceRepository {
  /**
   * Get the balance record for a specific fund.
   * Returns null if no balance record exists for that fund.
   */
  async getByFundId(fundId: string): Promise<FundBalance | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundBalances)
      .where(eq(fundBalances.fundId, fundId))
      .limit(1);
    const first = results[0];
    return first ? toFundBalance(first) : null;
  }

  /**
   * Get all fund balance records.
   */
  async getAll(): Promise<FundBalance[]> {
    const db = getDb();
    const results = await db.select().from(fundBalances);
    return results.map(toFundBalance);
  }

  /**
   * Insert or update the base balance for a fund.
   * If a balance record exists for the fund, updates base_amount and updated_at.
   * If not, creates a new record with a generated UUID.
   * Returns the resulting fund balance.
   */
  async upsert(fundId: string, baseAmountInCents: number): Promise<FundBalance> {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = await this.getByFundId(fundId);

    if (existing) {
      await db
        .update(fundBalances)
        .set({ baseAmount: baseAmountInCents, updatedAt: now })
        .where(eq(fundBalances.id, existing.id));

      return {
        ...existing,
        baseAmount: baseAmountInCents,
        updatedAt: now,
      };
    }

    const id = randomUUID();

    await db.insert(fundBalances).values({
      id,
      fundId,
      baseAmount: baseAmountInCents,
      updatedAt: now,
    });

    return {
      id,
      fundId,
      baseAmount: baseAmountInCents,
      updatedAt: now,
    };
  }
}

/**
 * Singleton instance of FundBalanceRepository for use throughout the application.
 */
export const fundBalanceRepository = new FundBalanceRepository();
