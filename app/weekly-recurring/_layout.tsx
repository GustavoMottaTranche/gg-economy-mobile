/**
 * Weekly Recurring Stack Layout
 *
 * Provides stack navigation for weekly recurring expense screens:
 * - index: Group list (all active weekly recurring groups)
 * - create: Form for creating a new weekly recurring group
 * - [id]: Occurrence detail for a specific group (with edit/delete)
 *
 * **Validates: Requirements 3.1, 4.1**
 */
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '../../src/hooks/useThemeColors';
import { typography } from '../../src/constants/theme';

export default function WeeklyRecurringLayout() {
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
        headerBackTitle: t('common.back', { defaultValue: 'Voltar' }),
        headerTintColor: colors.interactive.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('weeklyRecurring.screenTitle', {
            defaultValue: 'Gastos Semanais',
          }),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('weeklyRecurring.createTitle', {
            defaultValue: 'Novo Gasto Semanal',
          }),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('weeklyRecurring.occurrencesTitle', {
            defaultValue: 'Ocorrências',
          }),
        }}
      />
      <Stack.Screen
        name="parcel-detail"
        options={{
          title: t('weeklyRecurring.parcelDetail', {
            defaultValue: 'Detalhe da Parcela',
          }),
        }}
      />
    </Stack>
  );
}
