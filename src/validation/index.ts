/**
 * Validation Module
 *
 * Centralized validation schemas and utilities for the application.
 *
 * **Validates: Requirements 9**
 */

export {
  ValidationResult,
  validateTransaction,
  validateImportOptions,
  validateReferenceMonth,
} from './schemas';

export {
  validateInstallmentEntry,
  validateStandardEntry,
  validateBatchEntry,
} from './installmentValidation';

export {
  validateTitle,
  validateDescription,
  validateStandardEntry as validateStandardEntryV2,
  validateInstallmentEntry as validateInstallmentEntryV2,
  validateBatchEntry as validateBatchEntryV2,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from './entryValidation';

export type {
  StandardEntryValidationInput,
  InstallmentEntryValidationInput,
  BatchEntryValidationInput,
} from './entryValidation';

export {
  validateWeeklyGroup,
  validateOccurrenceValue,
  validateOccurrenceDate,
} from './weeklyRecurringValidation';

export type {
  WeeklyGroupValidationInput,
  OccurrenceValueValidationInput,
  OccurrenceDateValidationInput,
} from './weeklyRecurringValidation';

export { validateParcelAmount, validateParcelAmountStandard } from './parcelAmountValidation';

export type { ParcelAmountValidationResult } from './parcelAmountValidation';

export { validateGoalAmount } from './goalValidation';
