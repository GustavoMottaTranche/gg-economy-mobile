/**
 * Zustand store for global app state
 *
 * Manages global application state including:
 * - Current selected month for transactions/dashboard views
 * - Review queue count for navigation badge
 *
 * **Validates: Requirements 28, 29**
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logging';
import { validateReferenceMonth } from '../validation';

/**
 * Format a date as YYYY-MM for reference month
 */
function formatReferenceMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get the current month as YYYY-MM
 */
function getCurrentMonth(): string {
  return formatReferenceMonth(new Date());
}

/**
 * App store state
 */
interface AppStoreState {
  /** Currently selected month for transactions/dashboard (YYYY-MM format) */
  currentMonth: string;
  /** Count of transactions pending review (for navigation badge) */
  reviewQueueCount: number;
  /** Whether the app has been initialized */
  isInitialized: boolean;
  /** Whether the store has been hydrated from persistence */
  isHydrated: boolean;
}

/**
 * App store actions
 */
interface AppStoreActions {
  /**
   * Set the current month
   * @param month - Month in YYYY-MM format
   */
  setCurrentMonth: (month: string) => void;

  /**
   * Navigate to the previous month
   */
  goToPreviousMonth: () => void;

  /**
   * Navigate to the next month
   */
  goToNextMonth: () => void;

  /**
   * Reset to the current calendar month
   */
  resetToCurrentMonth: () => void;

  /**
   * Update the review queue count
   * @param count - Number of transactions pending review
   */
  setReviewQueueCount: (count: number) => void;

  /**
   * Increment the review queue count
   * @param amount - Amount to increment (default 1)
   */
  incrementReviewQueueCount: (amount?: number) => void;

  /**
   * Decrement the review queue count
   * @param amount - Amount to decrement (default 1)
   */
  decrementReviewQueueCount: (amount?: number) => void;

  /**
   * Mark the app as initialized
   */
  setInitialized: (initialized: boolean) => void;

  /**
   * Mark the store as hydrated
   */
  setHydrated: (hydrated: boolean) => void;

  /**
   * Reset the store (useful for testing)
   */
  reset: () => void;
}

type AppStore = AppStoreState & AppStoreActions;

/**
 * Initial state
 */
const initialState: AppStoreState = {
  currentMonth: getCurrentMonth(),
  reviewQueueCount: 0,
  isInitialized: false,
  isHydrated: false,
};

/**
 * Parse a YYYY-MM string to a Date object
 */
function parseMonth(month: string): Date {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1);
}

/**
 * Add months to a YYYY-MM string
 */
function addMonths(month: string, amount: number): string {
  const date = parseMonth(month);
  date.setMonth(date.getMonth() + amount);
  return formatReferenceMonth(date);
}

/**
 * Zustand store for global app state with persistence
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentMonth: (month: string) => {
        // Validate format using centralized validation
        if (!validateReferenceMonth(month)) {
          logger.warn('Invalid month format', { month, expected: 'YYYY-MM' });
          return;
        }
        set({ currentMonth: month });
      },

      goToPreviousMonth: () => {
        const { currentMonth } = get();
        set({ currentMonth: addMonths(currentMonth, -1) });
      },

      goToNextMonth: () => {
        const { currentMonth } = get();
        set({ currentMonth: addMonths(currentMonth, 1) });
      },

      resetToCurrentMonth: () => {
        set({ currentMonth: getCurrentMonth() });
      },

      setReviewQueueCount: (count: number) => {
        set({ reviewQueueCount: Math.max(0, count) });
      },

      incrementReviewQueueCount: (amount = 1) => {
        set((state) => ({
          reviewQueueCount: state.reviewQueueCount + amount,
        }));
      },

      decrementReviewQueueCount: (amount = 1) => {
        set((state) => ({
          reviewQueueCount: Math.max(0, state.reviewQueueCount - amount),
        }));
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      reset: () => {
        set({
          ...initialState,
          currentMonth: getCurrentMonth(), // Always use current month on reset
        });
      },
    }),
    {
      name: 'gg-economy-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist the current month
        // Review queue count is derived from database, not persisted
        currentMonth: state.currentMonth,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when rehydration completes
        state?.setHydrated(true);
      },
    }
  )
);

/**
 * Hook to get and manage the current month
 */
export function useCurrentMonth() {
  const currentMonth = useAppStore((state) => state.currentMonth);
  const setCurrentMonth = useAppStore((state) => state.setCurrentMonth);
  const goToPreviousMonth = useAppStore((state) => state.goToPreviousMonth);
  const goToNextMonth = useAppStore((state) => state.goToNextMonth);
  const resetToCurrentMonth = useAppStore((state) => state.resetToCurrentMonth);

  return {
    currentMonth,
    setCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    resetToCurrentMonth,
  };
}

/**
 * Hook to get and manage the review queue count
 */
export function useReviewQueueCount() {
  const reviewQueueCount = useAppStore((state) => state.reviewQueueCount);
  const setReviewQueueCount = useAppStore((state) => state.setReviewQueueCount);
  const incrementReviewQueueCount = useAppStore((state) => state.incrementReviewQueueCount);
  const decrementReviewQueueCount = useAppStore((state) => state.decrementReviewQueueCount);

  return {
    count: reviewQueueCount,
    setCount: setReviewQueueCount,
    increment: incrementReviewQueueCount,
    decrement: decrementReviewQueueCount,
  };
}

/**
 * Hook to check if the app is initialized
 */
export function useAppInitialized(): boolean {
  return useAppStore((state) => state.isInitialized);
}

/**
 * Hook to check if the store is ready (hydrated)
 */
export function useAppStoreReady(): boolean {
  return useAppStore((state) => state.isHydrated);
}

/**
 * Get the current month synchronously (for non-React contexts)
 */
export function getCurrentMonthSync(): string {
  return useAppStore.getState().currentMonth;
}

/**
 * Set the review queue count synchronously (for non-React contexts)
 */
export function setReviewQueueCountSync(count: number): void {
  useAppStore.getState().setReviewQueueCount(count);
}
