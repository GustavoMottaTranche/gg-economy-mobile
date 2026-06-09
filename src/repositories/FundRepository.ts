/**
 * Fund Repository Implementation
 *
 * Provides data access for fund CRUD operations using Drizzle ORM.
 * Supports soft-delete (deactivation) to preserve historical data.
 *
 * @module FundRepository
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { funds, type FundRecord } from '../db/schema';
import type { Fund, CreateFundDTO, UpdateFundDTO } from '../types/fund';

/**
 * Convert a database record to a Fund domain type.
 */
function toFund(record: FundRecord): Fund {
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    color: record.color,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Repository implementation for fund data access.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class FundRepository {
  /**
   * Get all funds (both active and inactive).
   */
  async getAll(): Promise<Fund[]> {
    const db = getDb();
    const results = await db.select().from(funds);
    return results.map(toFund);
  }

  /**
   * Get only active funds (is_active = true).
   */
  async getActive(): Promise<Fund[]> {
    const db = getDb();
    const results = await db.select().from(funds).where(eq(funds.isActive, true));
    return results.map(toFund);
  }

  /**
   * Get a single fund by its ID.
   * Returns null if not found.
   */
  async getById(id: string): Promise<Fund | null> {
    const db = getDb();
    const results = await db.select().from(funds).where(eq(funds.id, id)).limit(1);
    const first = results[0];
    return first ? toFund(first) : null;
  }

  /**
   * Create a new fund.
   * Generates a UUID for the id and sets created_at/updated_at timestamps.
   */
  async create(dto: CreateFundDTO): Promise<Fund> {
    const db = getDb();
    const now = new Date().toISOString();
    const id = randomUUID();

    await db.insert(funds).values({
      id,
      name: dto.name,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      name: dto.name,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update an existing fund's name, icon, and/or color.
   * Updates the updated_at timestamp.
   * Returns the updated fund or null if not found.
   */
  async update(id: string, dto: UpdateFundDTO): Promise<Fund | null> {
    const db = getDb();
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.icon !== undefined) {
      updateData.icon = dto.icon;
    }
    if (dto.color !== undefined) {
      updateData.color = dto.color;
    }

    await db.update(funds).set(updateData).where(eq(funds.id, id));

    return this.getById(id);
  }

  /**
   * Deactivate a fund (soft-delete).
   * Sets is_active = false and updates the updated_at timestamp.
   * Returns the deactivated fund or null if not found.
   */
  async deactivate(id: string): Promise<Fund | null> {
    const db = getDb();
    const now = new Date().toISOString();

    await db.update(funds).set({ isActive: false, updatedAt: now }).where(eq(funds.id, id));

    return this.getById(id);
  }
}

/**
 * Singleton instance of FundRepository for use throughout the application.
 */
export const fundRepository = new FundRepository();
