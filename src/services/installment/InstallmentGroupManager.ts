/**
 * InstallmentGroupManager Service
 *
 * Manages group-level operations on installment parcels:
 * - Atomic deletion of all parcels in a group
 * - Single parcel deletion with re-indexing of remaining descriptions
 * - Recalculation of amounts across all parcels in a group
 * - Atomic field updates across all parcels in a group
 *
 * All operations use database transactions for atomicity and rollback safety.
 *
 * @module InstallmentGroupManager
 */

import { eq, asc } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/client';
import { transactions } from '../../db/schema';
import { distributeAmount } from './InstallmentCalculator';

/**
 * Retrieves all parcels in an installment group, ordered by reference month (chronological).
 *
 * @param groupId - The installment group ID
 * @returns Array of transaction records in the group, ordered chronologically
 */
async function getGroupParcels(groupId: string) {
  const db = getDb();
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.installmentGroupId, groupId))
    .orderBy(asc(transactions.referenceMonth), asc(transactions.date));
}

/**
 * Extracts the base description from a parcel description by removing the suffix " (X/N)".
 *
 * @param description - Full description including suffix
 * @returns Base description without the installment suffix
 */
export function extractBaseDescription(description: string): string {
  // Match pattern " (X/N)" at the end of the string
  const suffixPattern = / \(\d+\/\d+\)$/;
  return description.replace(suffixPattern, '');
}

/**
 * Generates the installment suffix for a given index and total.
 *
 * @param index - 1-based parcel index
 * @param total - Total number of parcels
 * @returns Suffix string like " (1/3)"
 */
function buildSuffix(index: number, total: number): string {
  return ` (${index}/${total})`;
}

/**
 * Deletes all parcels in an installment group atomically.
 * If any deletion fails, the entire operation is rolled back.
 *
 * @param groupId - The installment group ID
 * @throws Error if the group has no parcels or if the database operation fails
 */
export async function deleteAllInGroup(groupId: string): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const parcels = await getGroupParcels(groupId);

    if (parcels.length === 0) {
      throw new Error(`No parcels found for installment group: ${groupId}`);
    }

    for (const parcel of parcels) {
      await db.delete(transactions).where(eq(transactions.id, parcel.id));
    }
  });
}

/**
 * Deletes a single parcel from an installment group and re-indexes
 * the remaining parcels' description suffixes.
 *
 * After deletion, remaining (N-1) parcels get sequential suffixes
 * " (1/(N-1))" through " ((N-1)/(N-1))" in chronological order.
 *
 * @param transactionId - The ID of the parcel to delete
 * @param groupId - The installment group ID
 * @throws Error if the transaction is not found in the group or if the operation fails
 */
export async function deleteSingleParcel(transactionId: string, groupId: string): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const parcels = await getGroupParcels(groupId);

    const parcelExists = parcels.some((p) => p.id === transactionId);
    if (!parcelExists) {
      throw new Error(`Transaction ${transactionId} not found in installment group ${groupId}`);
    }

    // Delete the target parcel
    await db.delete(transactions).where(eq(transactions.id, transactionId));

    // Get remaining parcels (exclude the deleted one)
    const remaining = parcels.filter((p) => p.id !== transactionId);
    const newTotal = remaining.length;

    // Re-index remaining parcels with new suffixes
    if (newTotal > 0) {
      const now = new Date().toISOString();
      for (let i = 0; i < remaining.length; i++) {
        const parcel = remaining[i]!;
        const baseDescription = extractBaseDescription(parcel.description);
        const newDescription =
          newTotal === 1
            ? baseDescription // If only one parcel remains, remove the suffix entirely
            : `${baseDescription}${buildSuffix(i + 1, newTotal)}`;

        await db
          .update(transactions)
          .set({
            description: newDescription,
            updatedAt: now,
          })
          .where(eq(transactions.id, parcel.id));
      }
    }
  });
}

/**
 * Recalculates and redistributes amounts across all parcels in a group
 * based on a new total value. Uses the same rounding rules as initial creation
 * (floor division with remainder on first parcel).
 *
 * @param groupId - The installment group ID
 * @param newTotal - New total amount in cents to distribute
 * @throws Error if the group has no parcels or if the operation fails
 */
export async function recalculateGroup(groupId: string, newTotal: number): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const parcels = await getGroupParcels(groupId);

    if (parcels.length === 0) {
      throw new Error(`No parcels found for installment group: ${groupId}`);
    }

    const amounts = distributeAmount(newTotal, parcels.length);
    const now = new Date().toISOString();

    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i]!;
      await db
        .update(transactions)
        .set({
          amount: amounts[i],
          updatedAt: now,
        })
        .where(eq(transactions.id, parcel.id));
    }
  });
}

/**
 * Updates a specific field across all parcels in an installment group atomically.
 * Supported fields: 'description' and 'categoryId'.
 *
 * For 'description' updates, the installment suffix is preserved on each parcel.
 * The provided value becomes the new base description, and existing suffixes are re-applied.
 *
 * @param groupId - The installment group ID
 * @param field - The field to update ('description' or 'categoryId')
 * @param value - The new value for the field
 * @throws Error if the group has no parcels or if the operation fails
 */
export async function updateGroupField(
  groupId: string,
  field: 'description' | 'categoryId',
  value: string
): Promise<void> {
  await withTransaction(async () => {
    const db = getDb();
    const parcels = await getGroupParcels(groupId);

    if (parcels.length === 0) {
      throw new Error(`No parcels found for installment group: ${groupId}`);
    }

    const now = new Date().toISOString();

    if (field === 'categoryId') {
      // Simple update: same value for all parcels
      for (const parcel of parcels) {
        await db
          .update(transactions)
          .set({
            categoryId: value,
            updatedAt: now,
          })
          .where(eq(transactions.id, parcel.id));
      }
    } else {
      // Description update: preserve installment suffixes
      const totalParcels = parcels.length;
      for (let i = 0; i < parcels.length; i++) {
        const parcel = parcels[i]!;
        const newDescription =
          totalParcels === 1 ? value : `${value}${buildSuffix(i + 1, totalParcels)}`;

        await db
          .update(transactions)
          .set({
            description: newDescription,
            updatedAt: now,
          })
          .where(eq(transactions.id, parcel.id));
      }
    }
  });
}
