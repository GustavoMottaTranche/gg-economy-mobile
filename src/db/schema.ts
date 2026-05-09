/**
 * Drizzle ORM schema definitions for GG-Economy Mobile
 *
 * This file defines all database tables using Drizzle ORM with expo-sqlite.
 * Tables: transactions, categories, import_batches, origins, user_preferences,
 * categorization_rules, schema_version
 */
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Categories Table
// ============================================================================
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  categorizationRules: many(categorizationRules),
}));

// ============================================================================
// Origins Table
// ============================================================================
export const origins = sqliteTable('origins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['bank', 'credit_card', 'investment', 'other'] }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const originsRelations = relations(origins, ({ many }) => ({
  transactions: many(transactions),
}));

// ============================================================================
// Import Batches Table
// ============================================================================
export const importBatches = sqliteTable('import_batches', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type', { enum: ['csv', 'ofx', 'qif', 'xlsx', 'xls'] }).notNull(),
  importedAt: text('imported_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  transactionCount: integer('transaction_count').notNull().default(0),
  status: text('status', { enum: ['pending', 'reviewing', 'completed'] })
    .notNull()
    .default('pending'),
  /** Batch group ID for multi-file imports */
  batchGroupId: text('batch_group_id'),
});

export const importBatchesRelations = relations(importBatches, ({ many }) => ({
  transactions: many(transactions),
}));

// ============================================================================
// Transactions Table
// ============================================================================
export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    amount: real('amount').notNull(),
    description: text('description').notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    originId: text('origin_id').references(() => origins.id, { onDelete: 'set null' }),
    batchId: text('batch_id').references(() => importBatches.id, { onDelete: 'set null' }),
    referenceMonth: text('reference_month').notNull(),
    needsReview: integer('needs_review', { mode: 'boolean' }).notNull().default(true),
    isExcludedFromTotals: integer('is_excluded_from_totals', { mode: 'boolean' })
      .notNull()
      .default(false),
    duplicateOf: text('duplicate_of'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_transactions_reference_month').on(table.referenceMonth),
    index('idx_transactions_needs_review').on(table.needsReview),
    index('idx_transactions_category_id').on(table.categoryId),
    index('idx_transactions_batch_id').on(table.batchId),
    index('idx_transactions_date').on(table.date),
    // Composite index for pagination queries (date DESC, id DESC)
    index('idx_transactions_date_id').on(table.date, table.id),
    // Composite index for month + date queries
    index('idx_transactions_month_date').on(table.referenceMonth, table.date),
  ]
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  origin: one(origins, {
    fields: [transactions.originId],
    references: [origins.id],
  }),
  importBatch: one(importBatches, {
    fields: [transactions.batchId],
    references: [importBatches.id],
  }),
  duplicateTransaction: one(transactions, {
    fields: [transactions.duplicateOf],
    references: [transactions.id],
  }),
}));

// ============================================================================
// User Preferences Table
// ============================================================================
export const userPreferences = sqliteTable('user_preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Categorization Rules Table
// ============================================================================
export const categorizationRules = sqliteTable(
  'categorization_rules',
  {
    id: text('id').primaryKey(),
    pattern: text('pattern').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    matchType: text('match_type', {
      enum: ['contains', 'starts_with', 'ends_with', 'exact', 'regex'],
    }).notNull(),
    priority: integer('priority').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_categorization_rules_pattern').on(table.pattern),
    index('idx_categorization_rules_priority').on(table.priority),
  ]
);

export const categorizationRulesRelations = relations(categorizationRules, ({ one }) => ({
  category: one(categories, {
    fields: [categorizationRules.categoryId],
    references: [categories.id],
  }),
}));

// ============================================================================
// Schema Version Table (for migration tracking)
// ============================================================================
export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Type Exports for Drizzle
// ============================================================================
export type CategoryRecord = typeof categories.$inferSelect;
export type NewCategoryRecord = typeof categories.$inferInsert;

export type OriginRecord = typeof origins.$inferSelect;
export type NewOriginRecord = typeof origins.$inferInsert;

export type ImportBatchRecord = typeof importBatches.$inferSelect;
export type NewImportBatchRecord = typeof importBatches.$inferInsert;

export type TransactionRecord = typeof transactions.$inferSelect;
export type NewTransactionRecord = typeof transactions.$inferInsert;

export type UserPreferenceRecord = typeof userPreferences.$inferSelect;
export type NewUserPreferenceRecord = typeof userPreferences.$inferInsert;

export type CategorizationRuleRecord = typeof categorizationRules.$inferSelect;
export type NewCategorizationRuleRecord = typeof categorizationRules.$inferInsert;

export type SchemaVersionRecord = typeof schemaVersion.$inferSelect;
export type NewSchemaVersionRecord = typeof schemaVersion.$inferInsert;
