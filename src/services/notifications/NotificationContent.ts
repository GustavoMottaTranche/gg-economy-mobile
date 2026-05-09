/**
 * NotificationContent - Utility for getting localized notification content
 *
 * Provides localized notification title and body text using i18next
 * translations from the notifications namespace.
 *
 * **Validates: Requirements 4.1, 4.2, 7.2**
 *
 * @module services/notifications/NotificationContent
 */

import i18n from 'i18next';
import type { SupportedLocale } from '../../i18n';

/**
 * Notification content structure
 */
export interface NotificationContent {
  /** Localized notification title */
  title: string;
  /** Localized notification body */
  body: string;
}

/**
 * Get localized notification content
 *
 * Retrieves the notification title and body text from i18next translations
 * based on the provided locale. Falls back to English if the locale is not
 * supported or translations are missing.
 *
 * @param locale - The locale to use for translations (e.g., 'en', 'pt-BR')
 * @returns Object containing localized title and body strings
 *
 * @example
 * ```typescript
 * const content = getNotificationContent('pt-BR');
 * // Returns: { title: 'Atualize suas finanças', body: 'Hora de registrar suas transações recentes' }
 *
 * const contentEn = getNotificationContent('en');
 * // Returns: { title: 'Update your finances', body: 'Time to record your recent transactions' }
 * ```
 */
export function getNotificationContent(locale: SupportedLocale | string): NotificationContent {
  // Use i18next's t function with the specified language
  const title = i18n.t('notifications.title', { lng: locale });
  const body = i18n.t('notifications.body', { lng: locale });

  return {
    title,
    body,
  };
}
