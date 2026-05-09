/**
 * User preference entity for app settings
 */
export interface UserPreference {
  /** Preference key */
  key: string;
  /** Preference value (stored as string, parsed as needed) */
  value: string;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Known preference keys
 */
export type PreferenceKey =
  | 'language'
  | 'backup_frequency'
  | 'backup_time'
  | 'last_backup_time'
  | 'last_backup_status'
  | 'google_account_email';

/**
 * Backup frequency options
 */
export type BackupFrequency = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'disabled';

/**
 * Backup status
 */
export type BackupStatus = 'success' | 'failed' | 'never';

/**
 * Supported languages
 */
export type SupportedLanguage = 'pt-BR' | 'en';

/**
 * DTO for setting a preference
 */
export interface SetPreferenceDTO {
  key: PreferenceKey;
  value: string;
}
