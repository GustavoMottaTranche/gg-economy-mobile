/**
 * Drizzle Kit configuration for GG-Economy Mobile
 *
 * This configuration is used by drizzle-kit to generate migrations
 * for the expo-sqlite database.
 */
import type { Config } from 'drizzle-kit';

export default {
  // Path to the schema file
  schema: './src/db/schema.ts',

  // Output directory for generated migrations
  out: './src/db/migrations',

  // SQLite dialect for expo-sqlite
  dialect: 'sqlite',

  // Use expo driver for React Native/Expo compatibility
  driver: 'expo',

  // Enable verbose logging during migration generation
  verbose: true,

  // Enable strict mode for better type checking
  strict: true,
} satisfies Config;
