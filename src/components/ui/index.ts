/**
 * Reusable UI Components
 *
 * This module exports all reusable UI components for the GG-Economy Mobile app.
 *
 * **Validates: Requirements 30**
 */

// Transaction display
export { TransactionCard, type TransactionCardProps } from './TransactionCard';

// Category selection
export { CategoryPicker, type CategoryPickerProps } from './CategoryPicker';

// Amount display with locale formatting
export {
  AmountDisplay,
  IncomeAmount,
  ExpenseAmount,
  BalanceAmount,
  type AmountDisplayProps,
  type AmountSize,
  type AmountColorVariant,
} from './AmountDisplay';

// Date selection
export { DatePicker, type DatePickerProps } from './DatePicker';

// Date + Time selection
export {
  DateTimePicker,
  type DateTimePickerProps,
  formatDateTimeForLocale,
} from './DateTimePicker';

// Loading states
export {
  LoadingIndicator,
  InlineLoader,
  FullScreenLoader,
  ButtonLoader,
  type LoadingIndicatorProps,
  type LoadingSize,
} from './LoadingIndicator';

// Empty states
export {
  EmptyState,
  EmptyTransactions,
  EmptyReview,
  EmptyCategories,
  EmptyBackups,
  EmptySearchResults,
  type EmptyStateProps,
} from './EmptyState';

// Input prompt dialog
export {
  InputPromptDialog,
  type InputPromptDialogProps,
} from './InputPromptDialog';

// Tab bar icons (SVG)
export { TabBarIcon, type TabBarIconProps } from './TabBarIcon';

// Pressable card wrapper
export {
  PressableCard,
  type PressableCardProps,
  type PressableCardVariant,
} from './PressableCard';

// Occurrence payment status toggle
export {
  OccurrenceStatusToggle,
  type OccurrenceStatusToggleProps,
} from './OccurrenceStatusToggle';
