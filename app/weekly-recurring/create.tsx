/**
 * Weekly Recurring Create Screen
 *
 * Screen with WeeklyRecurringForm in create mode.
 * On successful creation, navigates back to the group list.
 * Supports optional Fund association for the recurring group.
 *
 * **Validates: Requirements 1.1, 1.2, 11.4, 11.6**
 */
import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeeklyRecurringForm } from '../../src/components/weekly-recurring/WeeklyRecurringForm';
import { useWeeklyRecurringStore } from '../../src/stores/weeklyRecurringStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCategories } from '../../src/hooks/useCategories';
import { recurringFundLinkRepository } from '../../src/repositories/RecurringFundLinkRepository';
import { weeklyRecurringService } from '../../src/services/weekly-recurring/WeeklyRecurringService';
import type { CreateWeeklyGroupDTO, UpdateWeeklyGroupDTO } from '../../src/types/weeklyRecurring';

export default function WeeklyRecurringCreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  const { expenseCategories } = useCategories();

  const handleSubmit = useCallback(
    async (data: CreateWeeklyGroupDTO | UpdateWeeklyGroupDTO) => {
      const dto = data as CreateWeeklyGroupDTO;
      const fundId = dto.fundId;

      try {
        // Create the group via the service directly to get the created group ID
        const createdGroup = await weeklyRecurringService.createGroup(dto);

        // If a fund is selected, link the recurring group to the fund
        if (fundId) {
          await recurringFundLinkRepository.link(createdGroup.id, fundId);
        }

        // Reload groups in store
        await useWeeklyRecurringStore.getState().loadGroups();

        router.back();
      } catch {
        Alert.alert(
          t('common.error', { defaultValue: 'Erro' }),
          t('weeklyRecurring.errors.createFailed', {
            defaultValue: 'Não foi possível criar o gasto recorrente.',
          })
        );
      }
    },
    [router, t]
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
