/**
 * Import Batch query functions using Drizzle ORM
 *
 * Provides CRUD operations for import batches.
 */
import { eq, desc, sql, and } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb, withTransaction } from '../client';
import {
  importBatches,
  transactions,
  type ImportBatchRecord,
  type NewImportBatchRecord,
} from '../schema';
import type {
  CreateImportBatchDTO,
  UpdateImportBatchDTO,
  ImportBatchStatus,
  FileType,
} from '../../types';

/**
 * Convert a database record to an ImportBatch with proper date types
 */
function toImportBatch(record: ImportBatchRecord) {
  return {
    ...record,
    importedAt: new Date(record.importedAt),
    // Convert null to undefined for optional batchGroupId
    batchGroupId: record.batchGroupId ?? undefined,
  };
}

/**
 * Get all import batches
 */
export async function getAllImportBatches() {
  const db = getDb();
  const results = await db.select().from(importBatches).orderBy(desc(importBatches.importedAt));
  return results.map(toImportBatch);
}

/**
 * Get an import batch by ID
 */
export async function getImportBatchById(id: string) {
  const db = getDb();
  const results = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  return results.length > 0 ? toImportBatch(results[0]) : null;
}

/**
 * Get import batches by status
 */
export async function getImportBatchesByStatus(status: ImportBatchStatus) {
  const db = getDb();
  const results = await db
    .select()
    .from(importBatches)
    .where(eq(importBatches.status, status))
    .orderBy(desc(importBatches.importedAt));
  return results.map(toImportBatch);
}

/**
 * Get pending import batches (status = 'pending' or 'reviewing')
 */
export async function getPendingImportBatches() {
  const db = getDb();
  const results = await db
    .select()
    .from(importBatches)
    .where(sql`${importBatches.status} IN ('pending', 'reviewing')`)
    .orderBy(desc(importBatches.importedAt));
  return results.map(toImportBatch);
}

/**
 * Get import batches by file type
 */
export async function getImportBatchesByFileType(fileType: FileType) {
  const db = getDb();
  const results = await db
    .select()
    .from(importBatches)
    .where(eq(importBatches.fileType, fileType))
    .orderBy(desc(importBatches.importedAt));
  return results.map(toImportBatch);
}

/**
 * Create a new import batch
 */
export async function createImportBatch(data: CreateImportBatchDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const newBatch: NewImportBatchRecord = {
    id,
    fileName: data.fileName,
    fileType: data.fileType,
    importedAt: now,
    transactionCount: data.transactionCount,
    status: 'pending',
    batchGroupId: data.batchGroupId ?? null,
  };

  await db.insert(importBatches).values(newBatch);

  return toImportBatch({
    ...newBatch,
    importedAt: now,
  } as ImportBatchRecord);
}

/**
 * Update an import batch
 */
export async function updateImportBatch(id: string, data: UpdateImportBatchDTO) {
  const db = getDb();

  const updateData: Partial<NewImportBatchRecord> = {};

  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.transactionCount !== undefined) {
    updateData.transactionCount = data.transactionCount;
  }

  await db.update(importBatches).set(updateData).where(eq(importBatches.id, id));

  return getImportBatchById(id);
}

/**
 * Update import batch status
 */
export async function updateImportBatchStatus(id: string, status: ImportBatchStatus) {
  return updateImportBatch(id, { status });
}

/**
 * Mark import batch as reviewing
 */
export async function markBatchAsReviewing(id: string) {
  return updateImportBatchStatus(id, 'reviewing');
}

/**
 * Mark import batch as completed
 */
export async function markBatchAsCompleted(id: string) {
  return updateImportBatchStatus(id, 'completed');
}

/**
 * Delete an import batch
 * Note: This will set batchId to null for all transactions in this batch
 */
export async function deleteImportBatch(id: string) {
  const db = getDb();
  await db.delete(importBatches).where(eq(importBatches.id, id));
}

/**
 * Delete an import batch and all its transactions
 */
export async function deleteImportBatchWithTransactions(id: string) {
  return withTransaction(async () => {
    const db = getDb();
    // First delete all transactions in this batch
    await db.delete(transactions).where(eq(transactions.batchId, id));
    // Then delete the batch
    await db.delete(importBatches).where(eq(importBatches.id, id));
  });
}

/**
 * Get import batch count
 */
export async function getImportBatchCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(importBatches);
  return result[0]?.count ?? 0;
}

/**
 * Get pending batch count
 */
export async function getPendingBatchCount(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(importBatches)
    .where(sql`${importBatches.status} IN ('pending', 'reviewing')`);
  return result[0]?.count ?? 0;
}

/**
 * Get import batch with transaction details
 */
export async function getImportBatchWithTransactions(id: string) {
  const batch = await getImportBatchById(id);
  if (!batch) return null;

  const db = getDb();
  const txResults = await db
    .select()
    .from(transactions)
    .where(eq(transactions.batchId, id))
    .orderBy(desc(transactions.date));

  return {
    ...batch,
    transactions: txResults.map((tx) => ({
      ...tx,
      date: new Date(tx.date),
      createdAt: new Date(tx.createdAt),
      updatedAt: new Date(tx.updatedAt),
    })),
  };
}

/**
 * Get import batch with review progress
 */
export async function getImportBatchWithProgress(id: string) {
  const batch = await getImportBatchById(id);
  if (!batch) return null;

  const db = getDb();

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.batchId, id));

  const reviewedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.batchId, id), eq(transactions.needsReview, false)));

  const total = totalResult[0]?.count ?? 0;
  const reviewed = reviewedResult[0]?.count ?? 0;

  return {
    ...batch,
    totalTransactions: total,
    reviewedTransactions: reviewed,
    pendingTransactions: total - reviewed,
    progress: total > 0 ? (reviewed / total) * 100 : 0,
  };
}

/**
 * Get all import batches with progress
 */
export async function getAllImportBatchesWithProgress() {
  const batches = await getAllImportBatches();
  const results = [];

  for (const batch of batches) {
    const withProgress = await getImportBatchWithProgress(batch.id);
    if (withProgress) {
      results.push(withProgress);
    }
  }

  return results;
}

/**
 * Check if a batch is fully reviewed
 */
export async function isBatchFullyReviewed(id: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.batchId, id), eq(transactions.needsReview, true)));

  return (result[0]?.count ?? 0) === 0;
}

/**
 * Auto-complete batch if all transactions are reviewed
 */
export async function autoCompleteBatchIfReviewed(id: string) {
  const isFullyReviewed = await isBatchFullyReviewed(id);
  if (isFullyReviewed) {
    return markBatchAsCompleted(id);
  }
  return getImportBatchById(id);
}
