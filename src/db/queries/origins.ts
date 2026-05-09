/**
 * Origin query functions using Drizzle ORM
 *
 * Provides CRUD operations for origins (banks, credit cards, etc.).
 */
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../client';
import { origins, transactions, type OriginRecord, type NewOriginRecord } from '../schema';
import type { CreateOriginDTO, UpdateOriginDTO, OriginType } from '../../types';

/**
 * Convert a database record to an Origin with proper date types
 */
function toOrigin(record: OriginRecord) {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Get all origins
 */
export async function getAllOrigins() {
  const db = getDb();
  const results = await db.select().from(origins).orderBy(origins.name);
  return results.map(toOrigin);
}

/**
 * Get an origin by ID
 */
export async function getOriginById(id: string) {
  const db = getDb();
  const results = await db.select().from(origins).where(eq(origins.id, id)).limit(1);
  return results.length > 0 ? toOrigin(results[0]) : null;
}

/**
 * Get an origin by name
 */
export async function getOriginByName(name: string) {
  const db = getDb();
  const results = await db.select().from(origins).where(eq(origins.name, name)).limit(1);
  return results.length > 0 ? toOrigin(results[0]) : null;
}

/**
 * Get origins by type
 */
export async function getOriginsByType(type: OriginType) {
  const db = getDb();
  const results = await db
    .select()
    .from(origins)
    .where(eq(origins.type, type))
    .orderBy(origins.name);
  return results.map(toOrigin);
}

/**
 * Create a new origin
 */
export async function createOrigin(data: CreateOriginDTO) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const newOrigin: NewOriginRecord = {
    id,
    name: data.name,
    type: data.type,
    createdAt: now,
  };

  await db.insert(origins).values(newOrigin);

  return toOrigin({
    ...newOrigin,
    createdAt: now,
  } as OriginRecord);
}

/**
 * Update an origin
 */
export async function updateOrigin(id: string, data: UpdateOriginDTO) {
  const db = getDb();

  const updateData: Partial<NewOriginRecord> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  await db.update(origins).set(updateData).where(eq(origins.id, id));

  return getOriginById(id);
}

/**
 * Delete an origin
 * Note: This will set originId to null for all transactions using this origin
 */
export async function deleteOrigin(id: string) {
  const db = getDb();
  await db.delete(origins).where(eq(origins.id, id));
}

/**
 * Get origin count
 */
export async function getOriginCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(origins);
  return result[0]?.count ?? 0;
}

/**
 * Get origin with transaction count
 */
export async function getOriginWithTransactionCount(id: string) {
  const db = getDb();

  const originResult = await db.select().from(origins).where(eq(origins.id, id)).limit(1);

  if (originResult.length === 0) return null;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.originId, id));

  return {
    ...toOrigin(originResult[0]),
    transactionCount: countResult[0]?.count ?? 0,
  };
}

/**
 * Get all origins with transaction counts
 */
export async function getOriginsWithTransactionCounts() {
  const db = getDb();

  const results = await db
    .select({
      origin: origins,
      transactionCount: sql<number>`(
        SELECT COUNT(*) FROM ${transactions} 
        WHERE ${transactions.originId} = ${origins.id}
      )`,
    })
    .from(origins)
    .orderBy(origins.name);

  return results.map(({ origin, transactionCount }) => ({
    ...toOrigin(origin),
    transactionCount: transactionCount ?? 0,
  }));
}

/**
 * Get or create an origin by name
 * Useful during import when origin might not exist yet
 */
export async function getOrCreateOrigin(name: string, type: OriginType = 'bank') {
  const existing = await getOriginByName(name);
  if (existing) {
    return existing;
  }
  return createOrigin({ name, type });
}

/**
 * Search origins by name
 */
export async function searchOrigins(query: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(origins)
    .where(sql`${origins.name} LIKE ${'%' + query + '%'}`)
    .orderBy(origins.name);
  return results.map(toOrigin);
}
