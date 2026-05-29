/**
 * Weekly Recurring Group List Screen
 *
 * Main screen showing all active weekly recurring groups.
 * Provides navigation to create new groups, edit existing ones,
 * and view occurrences for each group.
 *
 * **Validates: Requirements 3.1, 4.1**
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeeklyGroupList } from '../../src/components/weekly-recurring/WeeklyGroupList';
import { DeleteGroupDialog } from '../../src/components/weekly-recurring/DeleteGroupDialog';
import { useWeeklyRecurringStore } from '../../src/stores/weeklyRecurringStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { spacing } from '../../src/constants/theme';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import type { WeeklyRecurringGroup } from '../../src/types/weeklyRecurring';

export default function WeeklyRecurringListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  const { groups, isLoading, loadGroups, deleteGroup } = useWeeklyRecurringStore();

  // Delete dialog state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<WeeklyRecurringGroup | null>(null);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Navigate to create screen
  const handleCreate = useCallback(() => {
    router.push('/weekly-recurring/create');
  }, [router]);

  // Navigate to group detail (occurrences)
  const handlePress = useCallback(
    (group: WeeklyRecurringGroup) => {
      router.push(`/weekly-recurring/${group.id}`);
    },
    [router]
  );

  // Navigate to edit (reuse create screen with group id param)
  const handleEdit = useCallback(
    (group: WeeklyRecurringGroup) => {
      router.push(`/weekly-recurring/${group.id}?edit=true`);
    },
    [router]
  );

  // Show delete confirmation dialog
  const handleDelete = useCallback((group: WeeklyRecurringGroup) => {
    setGroupToDelete(group);
    setDeleteDialogVisible(true);
  }, []);

  // Confirm deletion
  const handleConfirmDelete = useCallback(
    async (groupId: string) => {
      await deleteGroup(groupId);
      setDeleteDialogVisible(false);
      setGroupToDelete(null);
    },
    [deleteGroup]
  );

  // Cancel deletion
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setGroupToDelete(null);
  }, []);

  if (isLoading && groups.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}>
        <LoadingIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      {/* Group List */}
      <WeeklyGroupList
        groups={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPress={handlePress}
        testID="weekly-recurring-list"
      />

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.interactive.primary }]}
        onPress={handleCreate}
        accessibilityRole="button"
        accessibilityLabel={t('weeklyRecurring.create', {
          defaultValue: 'Criar gasto semanal',
        })}
        testID="weekly-recurring-create-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Dialog */}
      <DeleteGroupDialog
        visible={deleteDialogVisible}
        group={groupToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID="weekly-recurring-delete-dialog"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
