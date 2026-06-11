/**
 * Settings Stack Layout
 *
 * Provides stack navigation for settings sub-screens:
 * - index: Main settings screen
 * - backup: Backup settings
 * - language: Language settings
 * - categories: Category management
 * - rules: Categorization rules
 *
 * **Validates: Requirements 27, 28, 30, 10.1, 10.2, 10.3, 10.4**
 */
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { typography } from '../../../src/constants/theme';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface.card,
        },
        headerTitleStyle: {
          fontSize: typography.body.fontSize + 1,
          fontWeight: '600',
          color: colors.text.primary,
        },
        headerShadowVisible: false,
        headerBackTitle: t('common.back'),
        headerTintColor: colors.interactive.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('settings.title'),
        }}
      />
      <Stack.Screen
        name="backup"
        options={{
          title: t('backup.title'),
        }}
      />
      <Stack.Screen
        name="language"
        options={{
          title: t('settings.language'),
        }}
      />
      <Stack.Screen
        name="categories"
        options={{
          title: t('categories.title'),
        }}
      />
      <Stack.Screen
        name="rules"
        options={{
          title: t('rules.title'),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t('notifications.settingsTitle'),
        }}
      />
      <Stack.Screen
        name="budget-goals"
        options={{
          title: t('goals.screenTitle'),
        }}
      />
      <Stack.Screen
        name="fund-config"
        options={{
          title: t('futurePlans.config.screenTitle'),
        }}
      />
      <Stack.Screen
        name="cloud-sync"
        options={{
          title: t('cloudSync.title'),
        }}
      />
    </Stack>
  );
}
