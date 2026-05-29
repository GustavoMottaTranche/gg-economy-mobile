/**
 * Groups items by their expenseGroup field.
 *
 * Items with expenseGroup = 'fixed' go into the fixed group.
 * Items with expenseGroup = 'variable' go into the variable group.
 * Items with expenseGroup = null are excluded from both groups.
 */
export interface HasExpenseGroup {
  expenseGroup: string | null;
}

export interface GroupedByExpenseGroup<T extends HasExpenseGroup> {
  fixed: T[];
  variable: T[];
}

export function groupByExpenseGroup<T extends HasExpenseGroup>(
  items: T[]
): GroupedByExpenseGroup<T> {
  const fixed: T[] = [];
  const variable: T[] = [];

  for (const item of items) {
    if (item.expenseGroup === 'fixed') {
      fixed.push(item);
    } else if (item.expenseGroup === 'variable') {
      variable.push(item);
    }
    // Items with expenseGroup = null are excluded
  }

  return { fixed, variable };
}
