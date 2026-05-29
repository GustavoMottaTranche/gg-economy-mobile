/**
 * Weekly Recurring Create Screen
 *
 * Screen with WeeklyRecurringForm in create mode.
 * On successful creation, navigates back to the group list.
 *
 * **Validates: Requirements 1.1, 1.2**
 */
import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeeklyRecurringForm } from '../../src/components/weekly-recurring/WeeklyRecurringForm';
import { useWeeklyRecurringStore } from '../../src/stores/weeklyRecurringStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCategories } from '../../src/hooks/useCategories';
import type { CreateWeeklyGroupDTO, UpdateWeeklyGroupDTO } from '../../src/types/weeklyRecurring';

export default function WeeklyRecurringCreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  const { createGroup } = useWeeklyRecurringStore();
  const { expenseCategories } = useCategories();

  const handleSubmit = useCallback(
    (data: CreateWeeklyGroupDTO | UpdateWeeklyGroupDTO) => {
      createGroup(data as CreateWeeklyGroupDTO)
        .then(() => {
          router.back();
        })
        .catch(() => {
          Alert.alert(
            t('common.error', { defaultValue: 'Erro' }),
            t('weeklyRecurring.errors.createFailed', {
              defaultValue: 'Não foi possível criar o gasto recorrente.',
            })
          );
        });
    },
    [createGroup, router, t]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <WeeklyRecurringForm
        categories={expenseCategories}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        testID="weekly-recurring-create-form"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
