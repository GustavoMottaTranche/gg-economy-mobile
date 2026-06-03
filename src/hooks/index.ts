/**
 * Custom Hooks exports
 *
 * Re-exports all custom hooks for convenient imports.
 */

// Transaction hooks
export {
  useTransactions,
  type UseTransactionsReturn,
  type TransactionWithCategory,
  type TransactionFilters,
  type PaginationOptions,
} from './useTransactions';

// Category hooks
export {
  useCategories,
  type UseCategoriesReturn,
  type CategoryWithCount,
  type CategoryFilters,
} from './useCategories';

// Import hooks
export {
  useImport,
  type UseImportReturn,
  type ImportStage,
  type ImportProgress,
  type ImportState,
} from './useImport';

// Backup hooks
export { useBackup, type UseBackupReturn, type RestoreProgress } from './useBackup';

// Draft storage hooks
export {
  useDraftStorage,
  type UseDraftStorageOptions,
  type UseDraftStorageReturn,
} from './useDraftStorage';

// Review queue hooks
export {
  useReviewQueue,
  type UseReviewQueueReturn,
  type ReviewTransaction,
  type ReviewBatchGroup,
} from './useReviewQueue';

// Dashboard hooks
export {
  useDashboardData,
  type UseDashboardDataReturn,
  type MonthlySummary,
  type CategoryBreakdownItem,
  type TrendDataPoint,
  type TrendPeriod,
  type ChartFilterOption,
} from './useDashboardData';

// Review count hooks
export { useReviewCount, useReviewCountLive } from './useReviewCount';

// App state cleanup hooks
export {
  useAppStateCleanup,
  sensitiveDataCache,
  clearAllSensitiveData,
  type AppStateCleanupConfig,
} from './useAppStateCleanup';

// Manual entry hooks
export { useManualEntry, type UseManualEntryReturn, type ManualEntryState } from './useManualEntry';

// Import preferences hooks
export {
  useImportPreferences,
  useLastManualCategory,
  useSetLastManualCategory,
  useImportPreferencesStore,
  getLastManualCategorySync,
  setLastManualCategorySync,
  type UseImportPreferencesReturn,
  type ImportPreferencesState,
  type ImportMode,
} from './useImportPreferences';

// Category transactions hooks (lazy-loading)
export {
  useCategoryTransactions,
  type UseCategoryTransactionsReturn,
  type TransactionItem,
} from './useCategoryTransactions';

// Theme hooks
export { useThemeColors } from './useThemeColors';
export { useThemeStyles, type ThemeStylesResult } from './useThemeStyles';

// Category detail hooks
export {
  useCategoryDetailData,
  type UseCategoryDetailDataReturn,
  type CategoryDetailItem,
  type CategoryInfo,
  type InstallmentInfoMap,
} from './useCategoryDetailData';

// Unified statement hooks
export {
  useUnifiedStatementItems,
  buildUnifiedStatementItems,
  type UseUnifiedStatementItemsParams,
} from './useUnifiedStatementItems';

// Goal hooks
export { useGoals, type UseGoalsReturn, type CategorySpendingInput } from './useGoals';
