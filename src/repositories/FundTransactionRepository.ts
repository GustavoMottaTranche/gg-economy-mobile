/**
 * Fund Transaction Repository Implementation
 *
 * Provides data access for fund-transaction link operations using Drizzle ORM.
 * Handles linking/unlinking transactions to funds and updating isExcludedFromTotals.
 *
 * @module FundTransactionRepository
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { fundTransactions, transactions, type FundTransactionRecord } from '../db/schema';
import type { FundTransaction } from '../types/fund';

/**
 * Transaction details included when querying fund transactions with details.
 */
export interface FundTransactionWithDetails extends FundTransaction {
  title: string;
  amount: number;
  referenceMonth: string;
  date: string;
  isPaid: boolean;
}

/**
 * Convert a database record to a FundTransaction domain type.
 */
function toFundTransaction(record: FundTransactionRecord): FundTransaction {
  return {
    id: record.id,
    fundId: record.fundId,
    transactionId: record.transactionId,
    createdAt: record.createdAt,
  };
}

/**
 * Repository implementation for fund-transaction link data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class FundTransactionRepository {
  /**
   * Get all fund_transaction records for a specific fund.
   */
  async getByFundId(fundId: string): Promise<FundTransaction[]> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundTransactions)
      .where(eq(fundTransactions.fundId, fundId));
    return results.map(toFundTransaction);
  }

  /**
   * Get the fund_transaction record for a specific transaction.
   * Returns null if the transaction is not linked to any fund.
   */
  async getByTransactionId(transactionId: string): Promise<FundTransaction | null> {
    const db = getDb();
    const results = await db
      .select()
      .from(fundTransactions)
      .where(eq(fundTransactions.transactionId, transactionId))
      .limit(1);
    const first = results[0];
    return first ? toFundTransaction(first) : null;
  }

  /**
   * Link a transaction to a fund.
   * Creates a fund_transactions record AND sets the transaction's isExcludedFromTotals to true.
   * Returns the created fund transaction record.
   */
  async link(fundId: string, transactionId: string): Promise<FundTransaction> {
    const db = getDb();
    const now = new Date().toISOString();
    const id = randomUUID();

    await db.insert(fundTransactions).values({
      id,
      fundId,
      transactionId,
      createdAt: now,
    });

    await db
      .update(transactions)
      .set({ isExcludedFromTotals: true, updatedAt: now })
      .where(eq(transactions.id, transactionId));

    return {
      id,
      fundId,
      transactionId,
      createdAt: now,
    };
  }

  /**
   * Unlink a transaction from its fund.
   * Deletes the fund_transactions record AND sets the transaction's isExcludedFromTotals back to false.
   */
  async unlink(transactionId: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db.delete(fundTransactions).where(eq(fundTransactions.transactionId, transactionId));

    await db
      .update(transactions)
      .set({ isExcludedFromTotals: false, updatedAt: now })
      .where(eq(transactions.id, transactionId));
  }

  /**
   * Get linked transactions for a fund with full transaction details.
   * Joins fund_transactions with the transactions table to return enriched records.
   */
  async getByFundIdWithDetails(fundId: string): Promise<FundTransactionWithDetails[]> {
    const db = getDb();
    const results = await db
      .select({
        id: fundTransactions.id,
        fundId: fundTransactions.fundId,
        transactionId: fundTransactions.transactionId,
        createdAt: fundTransactions.createdAt,
        title: transactions.title,
        amount: transactions.amount,
        referenceMonth: transactions.referenceMonth,
        date: transactions.date,
        isPaid: transactions.isPaid,
      })
      .from(fundTransactions)
      .innerJoin(transactions, eq(fundTransactions.transactionId, transactions.id))
      .where(eq(fundTransactions.fundId, fundId));

    return results.map((row) => ({
      id: row.id,
      fundId: row.fundId,
      transactionId: row.transactionId,
      createdAt: row.createdAt,
      title: row.title,
      amount: row.amount,
      referenceMonth: row.referenceMonth,
      date: row.date,
      isPaid: row.isPaid,
    }));
  }
}

/**
 * Singleton instance of FundTransactionRepository for use throughout the application.
 */
export const fundTransactionRepository = new FundTransactionRepository();
