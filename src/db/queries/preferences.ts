/**
 * User Preferences query functions using Drizzle ORM
 *
 * Provides CRUD operations for user preferences (key-value storage).
 */
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  userPreferences,
  type UserPreferenceRecord,
  type NewUserPreferenceRecord,
} from '../schema';
import type { PreferenceKey, BackupFrequency, BackupStatus, SupportedLanguage } from '../../types';

/**
 * Convert a database record to a UserPreference with proper date types
 */
function toUserPreference(record: UserPreferenceRecord) {
  return {
    ...record,
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Get all preferences
 */
export async function getAllPreferences() {
  const db = getDb();
  const results = await db.select().from(userPreferences);
  return results.map(toUserPreference);
}

/**
 * Get a preference by key
 */
export async function getPreference(key: PreferenceKey): Promise<string | null> {
  const db = getDb();
  const results = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.key, key))
    .limit(1);
  return results.length > 0 ? results[0].value : null;
}

/**
 * Get a preference record by key (includes metadata)
 */
export async function getPreferenceRecord(key: PreferenceKey) {
  const db = getDb();
  const results = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.key, key))
    .limit(1);
  return results.length > 0 ? toUserPreference(results[0]) : null;
}

/**
 * Set a preference (upsert)
 */
export async function setPreference(key: PreferenceKey, value: string) {
  const db = getDb();
  const now = new Date().toISOString();

  // Check if preference exists
  const existing = await getPreference(key);

  if (existing !== null) {
    // Update existing
    await db
      .update(userPreferences)
      .set({ value, updatedAt: now })
      .where(eq(userPreferences.key, key));
  } else {
    // Insert new
    const newPreference: NewUserPreferenceRecord = {
      key,
      value,
      updatedAt: now,
    };
    await db.insert(userPreferences).values(newPreference);
  }

  return toUserPreference({
    key,
    value,
    updatedAt: now,
  } as UserPreferenceRecord);
}

/**
 * Delete a preference
 */
export async function deletePreference(key: PreferenceKey) {
  const db = getDb();
  await db.delete(userPreferences).where(eq(userPreferences.key, key));
}

/**
 * Get preference count
 */
export async function getPreferenceCount(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(userPreferences);
  return result[0]?.count ?? 0;
}

// ============================================================================
// Typed Preference Helpers
// ============================================================================

/**
 * Get the current language preference
 */
export async function getLanguage(): Promise<SupportedLanguage> {
  const value = await getPreference('language');
  return (value as SupportedLanguage) || 'en';
}

/**
 * Set the language preference
 */
export async function setLanguage(language: SupportedLanguage) {
  return setPreference('language', language);
}

/**
 * Get the backup frequency preference
 */
export async function getBackupFrequency(): Promise<BackupFrequency> {
  const value = await getPreference('backup_frequency');
  return (value as BackupFrequency) || 'disabled';
}

/**
 * Set the backup frequency preference
 */
export async function setBackupFrequency(frequency: BackupFrequency) {
  return setPreference('backup_frequency', frequency);
}

/**
 * Get the preferred backup time (hour of day, 0-23)
 */
export async function getBackupTime(): Promise<number> {
  const value = await getPreference('backup_time');
  return value ? parseInt(value, 10) : 3; // Default to 3 AM
}

/**
 * Set the preferred backup time
 */
export async function setBackupTime(hour: number) {
  return setPreference('backup_time', hour.toString());
}

/**
 * Get the last backup timestamp
 */
export async function getLastBackupTime(): Promise<Date | null> {
  const value = await getPreference('last_backup_time');
  return value ? new Date(value) : null;
}

/**
 * Set the last backup timestamp
 */
export async function setLastBackupTime(date: Date) {
  return setPreference('last_backup_time', date.toISOString());
}

/**
 * Get the last backup status
 */
export async function getLastBackupStatus(): Promise<BackupStatus> {
  const value = await getPreference('last_backup_status');
  return (value as BackupStatus) || 'never';
}

/**
 * Set the last backup status
 */
export async function setLastBackupStatus(status: BackupStatus) {
  return setPreference('last_backup_status', status);
}

/**
 * Get the connected Google account email
 */
export async function getGoogleAccountEmail(): Promise<string | null> {
  return getPreference('google_account_email');
}

/**
 * Set the connected Google account email
 */
export async function setGoogleAccountEmail(email: string) {
  return setPreference('google_account_email', email);
}

/**
 * Clear the Google account email (on disconnect)
 */
export async function clearGoogleAccountEmail() {
  return deletePreference('google_account_email');
}

/**
 * Get all backup-related preferences
 */
export async function getBackupPreferences() {
  const [frequency, time, lastTime, lastStatus, email] = await Promise.all([
    getBackupFrequency(),
    getBackupTime(),
    getLastBackupTime(),
    getLastBackupStatus(),
    getGoogleAccountEmail(),
  ]);

  return {
    frequency,
    time,
    lastBackupTime: lastTime,
    lastBackupStatus: lastStatus,
    googleAccountEmail: email,
  };
}

/**
 * Update backup status after a backup attempt
 */
export async function updateBackupStatus(success: boolean) {
  const now = new Date();
  await setLastBackupStatus(success ? 'success' : 'failed');
  if (success) {
    await setLastBackupTime(now);
  }
}

/**
 * Check if backup is configured (Google account connected)
 */
export async function isBackupConfigured(): Promise<boolean> {
  const email = await getGoogleAccountEmail();
  return email !== null;
}

/**
 * Check if scheduled backup is enabled
 */
export async function isScheduledBackupEnabled(): Promise<boolean> {
  const frequency = await getBackupFrequency();
  return frequency !== 'disabled';
}
