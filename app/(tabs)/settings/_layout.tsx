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
 * **Validates: Requirements 27, 28, 30**
 */
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#000000',
        },
        headerShadowVisible: false,
        headerBackTitle: t('common.back'),
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
    </Stack>
  );
}
