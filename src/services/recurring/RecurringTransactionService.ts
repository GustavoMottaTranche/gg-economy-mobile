/**
 * Recurring Transaction Service
 *
 * Manages the lifecycle of recurring (infinite installment) transactions.
 * Handles creation, deactivation, reactivation, amount updates,
 * and monthly transaction generation.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
import { eq, and, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb, withTransaction } from '../../db/client';
import { recurringTransactions, transactions, fundTransactions } from '../../db/schema';
import type { RecurringTransaction, CreateRecurringDTO } from '../../types/recurring';
import type { PaymentStatusCreationOption } from '../../types/paymentStatus';
import { recurringFundLinkRepository } from '../../repositories/RecurringFundLinkRepository';

/**
 * Create a new recurring transaction record.
 * Wraps creation + initial transaction generation + payment status assignment
 * in a single SQLite transaction for atomicity.
 *
 * Payment status options:
 * - "all_pending" (default): the generated transaction keeps isPaid=false
 * - "first_paid": the first generated transaction (start month) gets isPaid=true
 * - "all_paid": all generated transactions get isPaid=true (same as first_paid for single transaction)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export async function createRecurring(dto: CreateRecurringDTO): Promise<RecurringTransaction> {
  const paymentStatusOption: PaymentStatusCreationOption = dto.paymentStatusOption ?? 'all_pending';

  const result = await withTransaction(async () => {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const record = {
      id,
      title: dto.title,
      amount: dto.amount,
      categoryId: dto.categoryId,
      categoryType: dto.categoryType,
      startMonth: dto.startMonth,
      description: dto.description ?? '',
      originId: dto.originId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(recurringTransactions).values(record);

    // Generate the initial transaction for the start month
    const transactionId = randomUUID();
    const isPaidValue = paymentStatusOption === 'all_pending' ? false : true;

    // If fund linked, set isExcludedFromTotals to true
    const hasFundLink = !!dto.fundId;

    await db.insert(transactions).values({
      id: transactionId,
      title: dto.title,
      date: `${dto.startMonth}-01T00:00:00.000Z`,
      amount: dto.amount,
      description: dto.description ?? '',
      categoryId: dto.categoryId,
      originId: dto.originId ?? null,
      batchId: null,
      referenceMonth: dto.startMonth,
      needsReview: false,
      isExcludedFromTotals: hasFundLink,
      isPaid: isPaidValue,
      duplicateOf: null,
      installmentGroupId: null,
      recurringId: id,
      createdAt: now,
      updatedAt: now,
    });

    // If fund linked, create recurring_fund_links and fund_transactions records
    if (dto.fundId) {
      await recurringFundLinkRepository.link(id, dto.fundId);

      await db.insert(fundTransactions).values({
        id: randomUUID(),
        fundId: dto.fundId,
        transactionId,
        createdAt: now,
      });
    }

    return {
      id: record.id,
      title: record.title,
      amount: record.amount,
      categoryId: record.categoryId,
      categoryType: record.categoryType,
      startMonth: record.startMonth,
      description: record.description,
      originId: record.originId,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });

  return result;
}

/**
 * Deactivate a recurring transaction (stops future generation).
 */
export async function deactivateRecurring(id: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(recurringTransactions)
    .set({ isActive: false, updatedAt: now })
    .where(eq(recurringTransactions.id, id));
}

/**
 * Reactivate a previously deactivated recurring transaction.
 */
export async function reactivateRecurring(id: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .update(recurringTransactions)
    .set({ isActive: true, updatedAt: now })
    .where(eq(recurringTransactions.id, id));
}

/**
 * Update the base amount of a recurring transaction and propagate
 * to all generated transactions from a given month onward.
 *
 * Updates:
 * 1. The recurring parent record's amount (stored as absolute value)
 * 2. All transactions linked to this recurring with referenceMonth >= fromMonth
 *    (stored with sign matching their existing sign)
 *
 * Transactions before fromMonth are NOT modified.
 *
 * @param id - The recurring transaction ID
 * @param newAmount - The new absolute amount value
 * @param fromMonth - The month boundary (format: YYYY-MM). Transactions from this month onward are updated.
 */
export async function updateRecurringAmount(
  id: string,
  newAmount: number,
  fromMonth: string
): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Update the recurring parent record (stores absolute value)
    await db
      .update(recurringTransactions)
      .set({ amount: newAmount, updatedAt: now })
      .where(eq(recurringTransactions.id, id));

    // 2. Get a sample transaction to determine sign convention
    const sampleTx = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(eq(transactions.recurringId, id), sql`${transactions.referenceMonth} >= ${fromMonth}`)
      )
      .limit(1);

    // Determine signed amount: preserve existing sign convention
    const signedAmount =
      sampleTx.length > 0 && sampleTx[0].amount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);

    // 3. Update all transactions from fromMonth onward
    await db
      .update(transactions)
      .set({ amount: signedAmount, updatedAt: now })
      .where(
        and(eq(transactions.recurringId, id), sql`${transactions.referenceMonth} >= ${fromMonth}`)
      );
  });
}

/**
 * Deactivate a recurring transaction and delete all future generated transactions.
 *
 * 1. Sets isActive=false on the recurring parent record
 * 2. Deletes all transactions linked to this recurring with referenceMonth > currentMonth
 *    (preserves the current month's transaction)
 *
 * @param id - The recurring transaction ID
 * @param currentMonth - The current month (format: YYYY-MM). Transactions after this month are deleted.
 */
export async function deactivateAndDeleteFuture(id: string, currentMonth: string): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Deactivate the recurring parent
    await db
      .update(recurringTransactions)
      .set({ isActive: false, updatedAt: now })
      .where(eq(recurringTransactions.id, id));

    // 2. Delete all future transactions (after current month)
    await db
      .delete(transactions)
      .where(
        and(eq(transactions.recurringId, id), sql`${transactions.referenceMonth} > ${currentMonth}`)
      );
  });
}

/**
 * Update the category of a recurring transaction and propagate
 * to all future generated transactions (referenceMonth >= current month).
 *
 * Updates:
 * 1. The recurring parent record's categoryId
 * 2. All transactions linked to this recurring with referenceMonth >= currentMonth
 *
 * Past transactions (referenceMonth < currentMonth) are NOT modified.
 *
 * @param recurringId - The recurring transaction ID
 * @param newCategoryId - The new category ID to set
 * @param currentMonth - The current month boundary (format: YYYY-MM). Transactions from this month onward are updated.
 */
export async function updateRecurringCategory(
  recurringId: string,
  newCategoryId: string | null,
  currentMonth: string
): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Update the recurring parent record
    await db
      .update(recurringTransactions)
      .set({ categoryId: newCategoryId ?? '', updatedAt: now })
      .where(eq(recurringTransactions.id, recurringId));

    // 2. Update all future transactions linked to this recurring
    await db
      .update(transactions)
      .set({ categoryId: newCategoryId, updatedAt: now })
      .where(
        and(
          eq(transactions.recurringId, recurringId),
          sql`${transactions.referenceMonth} >= ${currentMonth}`
        )
      );
  });
}

/**
 * Generate monthly transactions for all active recurring entries
 * whose startMonth is <= targetMonth.
 *
 * For each qualifying recurring, creates a transaction for the targetMonth
 * if one does not already exist (idempotent).
 */
export async function generateMonthlyTransactions(targetMonth: string): Promise<void> {
  const db = getDb();

  // Get all active recurrings where startMonth <= targetMonth
  const activeRecurrings = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.isActive, true),
        lte(recurringTransactions.startMonth, targetMonth)
      )
    );

  for (const recurring of activeRecurrings) {
    // Check if a transaction already exists for this recurring + month
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.recurringId, recurring.id),
          eq(transactions.referenceMonth, targetMonth)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      continue; // Already generated for this month
    }

    // Check if this recurring transaction has a fund link
    const fundLink = await recurringFundLinkRepository.getByRecurringId(recurring.id);

    // Create the transaction for this month
    const id = randomUUID();
    const now = new Date().toISOString();

    await db.insert(transactions).values({
      id,
      title: recurring.title,
      date: `${targetMonth}-01T00:00:00.000Z`,
      amount: recurring.amount,
      description: recurring.description,
      categoryId: recurring.categoryId,
      originId: recurring.originId,
      batchId: null,
      referenceMonth: targetMonth,
      needsReview: false,
      isExcludedFromTotals: fundLink ? true : false,
      duplicateOf: null,
      installmentGroupId: null,
      recurringId: recurring.id,
      createdAt: now,
      updatedAt: now,
    });

    // If fund link exists, create a fund_transactions record
    if (fundLink) {
      await db.insert(fundTransactions).values({
        id: randomUUID(),
        fundId: fundLink.fundId,
        transactionId: id,
        createdAt: now,
      });
    }
  }
}

/**
 * Get all active recurring transactions.
 */
export async function getActiveRecurrings(): Promise<RecurringTransaction[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.isActive, true));

  return results.map((record) => ({
    id: record.id,
    title: record.title,
    amount: record.amount,
    categoryId: record.categoryId,
    categoryType: record.categoryType,
    startMonth: record.startMonth,
    description: record.description,
    originId: record.originId,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}
