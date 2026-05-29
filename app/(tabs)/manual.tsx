/**
 * Manual Entry Screen (Tab: manual)
 *
 * Form for manually adding transactions with:
 * - Date, amount, description, category, reference_month fields
 * - Income/expense type toggle
 * - Installment mode with parcel count and start month
 * - Batch entry mode (mutually exclusive with installment mode)
 * - Form validation
 * - Draft auto-save functionality
 * - Clear Draft action
 * - Success confirmation and form reset
 *
 * **Validates: Requirements 2.1, 2.2, 7.2, 23, 24, 30**
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Switch,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { typography, spacing, borderRadius, type ModeColors } from '../../src/constants/theme';
import { useDraftStorage } from '../../src/hooks/useDraftStorage';
import { useCategories } from '../../src/hooks/useCategories';
import { createTransaction, createTransactions } from '../../src/db/queries/transactions';
import { DateTimePicker } from '../../src/components/ui/DateTimePicker';
import { CategorySelector } from '../../src/components/CategorySelector';
import { AmountDisplay } from '../../src/components/ui/AmountDisplay';
import { InstallmentPreview } from '../../src/components/InstallmentPreview';
import { LoadingIndicator } from '../../src/components/ui/LoadingIndicator';
import { getCurrentLocale, parseNumberLocale } from '../../src/i18n';
import { calculateInstallments } from '../../src/services/installment/InstallmentCalculator';
import { validateInstallmentEntry } from '../../src/validation/installmentValidation';
import { validateDescription, validateTitle, DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../src/validation/entryValidation';
import { randomUUID } from 'expo-crypto';
import { useBatchSessionStore } from '../../src/services/batch/BatchSessionManager';
import { validateBatchEntry } from '../../src/validation/installmentValidation';
import { deriveReferenceMonth } from '../../src/utils/deriveReferenceMonth';
import { createRecurring } from '../../src/services/recurring/RecurringTransactionService';
import { weeklyRecurringService } from '../../src/services/weekly-recurring/WeeklyRecurringService';
import { PaymentStatusOption } from '../../src/components/weekly-recurring/PaymentStatusOption';
import type { InstallmentDetail } from '../../src/types/installment';
import type { ManualEntryDraft } from '../../src/services/draft';
import type { Category } from '../../src/types';
import type { PaymentStatusCreationOption } from '../../src/types/paymentStatus';

/**
 * Transaction type for the form
 */
type TransactionType = 'income' | 'expense';

/**
 * Form validation errors
 */
interface FormErrors {
  title?: string;
  amount?: string;
  description?: string;
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format reference month for display
 */
function formatReferenceMonth(referenceMonth: string, locale: string): string {
  const [yearStr, monthStr] = referenceMonth.split('-');
  if (!yearStr || !monthStr) return referenceMonth;
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Generate list of reference months (12 future + current + 11 previous months)
 * Ordered from most future to most past (scroll up = future, scroll down = past)
 */
function generateReferenceMonths(): string[] {
  const months: string[] = [];
  const now = new Date();

  // From +12 future down to -11 past
  for (let i = 12; i >= -11; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months;
}

/**
 * Get the index of next month in the reference months list (used for initial scroll)
 */
function getNextMonthIndex(months: string[]): number {
  const now = new Date();
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  const idx = months.indexOf(nextMonth);
  return idx >= 0 ? idx : 0;
}

/**
 * Generate list of months for installment start (current + 47 future months)
 */
function generateInstallmentStartMonths(): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < 48; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  return months;
}

export default function ManualEntryScreen() {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const colors = useThemeColors();

  // Draft storage integration
  const { draft, isDirty, isSaving, isLoading, updateDraft, clearDraft } =
    useDraftStorage<ManualEntryDraft>('manual-entry', undefined, {
      autoRestore: true,
      debounceInterval: 2000,
    });

  // Categories hook
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Form state
  const [transactionType, setTransactionType] = useState<TransactionType>(draft?.type ?? 'expense');
  const [date, setDate] = useState<Date>(() => {
    if (draft?.date) {
      return new Date(draft.date);
    }
    return new Date();
  });
  const [amount, setAmount] = useState<string>(draft?.amount ?? '');
  const [title, setTitle] = useState<string>(draft?.title ?? '');
  const [description, setDescription] = useState<string>(draft?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(draft?.categoryId ?? null);
  const [referenceMonth, setReferenceMonth] = useState<string>(
    draft?.referenceMonth ?? getCurrentMonth()
  );
  // Track whether the user has manually changed the reference month
  const [referenceMonthManuallyChanged, setReferenceMonthManuallyChanged] = useState(false);

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showInstallmentMonthPicker, setShowInstallmentMonthPicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Installment mode state
  const [installmentMode, setInstallmentMode] = useState(false);
  const [isInfiniteInstallment, setIsInfiniteInstallment] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [weeklyDayOfWeek, setWeeklyDayOfWeek] = useState<number>(new Date().getDay());
  const [parcelCount, setParcelCount] = useState<string>('2');
  const [installmentStartMonth, setInstallmentStartMonth] = useState<string>(getCurrentMonth());
  const [paymentStatusOption, setPaymentStatusOption] = useState<PaymentStatusCreationOption>('all_pending');

  // Batch session store (for mutual exclusivity)
  const batchIsActive = useBatchSessionStore((state) => state.isActive);
  const batchCategoryId = useBatchSessionStore((state) => state.categoryId);
  const batchCategoryType = useBatchSessionStore((state) => state.categoryType);
  const batchTitle = useBatchSessionStore((state) => state.title);
  const batchEntryCount = useBatchSessionStore((state) => state.entryCount);
  const batchMaxEntries = useBatchSessionStore((state) => state.maxEntries);
  const startBatchSession = useBatchSessionStore((state) => state.startSession);
  const incrementBatchCount = useBatchSessionStore((state) => state.incrementCount);
  const endBatchSession = useBatchSessionStore((state) => state.endSession);

  // Batch mode UI state
  const [showBatchCategoryPicker, setShowBatchCategoryPicker] = useState(false);
  const [showBatchTitleInput, setShowBatchTitleInput] = useState(false);
  const [batchTitleInput, setBatchTitleInput] = useState('');
  const [batchTitleError, setBatchTitleError] = useState<string | null>(null);
  const [pendingBatchCategory, setPendingBatchCategory] = useState<Category | null>(null);

  // Batch mode selected category object
  const batchSelectedCategory = useMemo(() => {
    if (!batchCategoryId) return null;
    return categories.find((c) => c.id === batchCategoryId) ?? null;
  }, [batchCategoryId, categories]);

  // Reference months list
  const referenceMonths = useMemo(() => generateReferenceMonths(), []);
  const nextMonthIndex = useMemo(() => getNextMonthIndex(referenceMonths), [referenceMonths]);
  const installmentStartMonths = useMemo(() => generateInstallmentStartMonths(), []);

  // Debounce timer ref for installment preview
  const installmentPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [installmentPreview, setInstallmentPreview] = useState<InstallmentDetail[]>([]);

  // Selected category object
  const selectedCategory = useMemo(() => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId) ?? null;
  }, [categoryId, categories]);

  // Restore draft data when it loads
  useEffect(() => {
    if (draft && !isLoading) {
      if (draft.type) setTransactionType(draft.type);
      if (draft.date) setDate(new Date(draft.date));
      if (draft.amount !== undefined) setAmount(draft.amount);
      if (draft.title !== undefined) setTitle(draft.title);
      if (draft.description !== undefined) setDescription(draft.description);
      if (draft.categoryId !== undefined) setCategoryId(draft.categoryId ?? null);
      if (draft.referenceMonth) setReferenceMonth(draft.referenceMonth);
    }
  }, [draft, isLoading]);

  // Update draft when form values change
  const handleUpdateDraft = useCallback(() => {
    updateDraft({
      type: transactionType,
      date: date.toISOString(),
      amount,
      title,
      description,
      categoryId,
      referenceMonth,
    });
  }, [updateDraft, transactionType, date, amount, title, description, categoryId, referenceMonth]);

  // Debounced draft update
  useEffect(() => {
    const timer = setTimeout(() => {
      handleUpdateDraft();
    }, 500);
    return () => clearTimeout(timer);
  }, [transactionType, date, amount, title, description, categoryId, referenceMonth]);

  // Installment preview calculation (debounced within 500ms)
  useEffect(() => {
    if (installmentPreviewTimerRef.current) {
      clearTimeout(installmentPreviewTimerRef.current);
    }

    if (!installmentMode || isInfiniteInstallment) {
      setInstallmentPreview([]);
      return;
    }

    const parsedParcelCount = parseInt(parcelCount, 10);
    if (isNaN(parsedParcelCount) || parsedParcelCount < 2 || parsedParcelCount > 48) {
      setInstallmentPreview([]);
      return;
    }

    installmentPreviewTimerRef.current = setTimeout(() => {
      const parsedAmount = parseNumberLocale(amount, locale);
      const amountInCents = !isNaN(parsedAmount) && parsedAmount > 0
        ? Math.round(parsedAmount * 100)
        : 0;

      const preview = calculateInstallments({
        totalAmount: amountInCents * parsedParcelCount,
        parcelCount: parsedParcelCount,
        startMonth: installmentStartMonth,
        title: title?.trim() || '',
        categoryId: categoryId || '',
      });

      setInstallmentPreview(preview);
    }, 500);

    return () => {
      if (installmentPreviewTimerRef.current) {
        clearTimeout(installmentPreviewTimerRef.current);
      }
    };
  }, [installmentMode, amount, parcelCount, installmentStartMonth, title, description, categoryId, locale]);

  // Handle transaction type change
  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      setTransactionType(type);
      // Clear category if it doesn't match the new type
      if (selectedCategory && selectedCategory.type !== type) {
        setCategoryId(null);
      }
    },
    [selectedCategory]
  );

  // Handle installment mode toggle
  const handleInstallmentToggle = useCallback(
    (value: boolean) => {
      if (value && batchIsActive) {
        // Installment and batch modes are mutually exclusive
        return;
      }
      setInstallmentMode(value);
      if (!value) {
        setInstallmentPreview([]);
      }
    },
    [batchIsActive]
  );

  // Handle parcel count change
  const handleParcelCountChange = useCallback((text: string) => {
    // Allow only numeric input
    const cleaned = text.replace(/[^0-9]/g, '');
    setParcelCount(cleaned);
  }, []);

  // Handle installment start month selection
  const handleInstallmentMonthSelect = useCallback((month: string) => {
    setInstallmentStartMonth(month);
    setShowInstallmentMonthPicker(false);
  }, []);

  // Handle date change - auto-derive referenceMonth if not manually changed
  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
    if (!referenceMonthManuallyChanged) {
      setReferenceMonth(deriveReferenceMonth(newDate));
    }
  }, [referenceMonthManuallyChanged]);

  // Handle amount change
  const handleAmountChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal separator
      const cleanedText = text.replace(/[^0-9.,]/g, '');
      setAmount(cleanedText);
      if (errors.amount) {
        setErrors((prev) => ({ ...prev, amount: undefined }));
      }
    },
    [errors.amount]
  );

  // Handle title change
  const handleTitleChange = useCallback(
    (text: string) => {
      // Enforce max 100 characters
      const truncated = text.slice(0, TITLE_MAX_LENGTH);
      setTitle(truncated);
      if (errors.title) {
        // Clear error when user starts typing valid content
        const titleResult = validateTitle(truncated);
        if (titleResult.valid) {
          setErrors((prev) => ({ ...prev, title: undefined }));
        }
      }
    },
    [errors.title]
  );

  // Handle description change
  const handleDescriptionChange = useCallback(
    (text: string) => {
      setDescription(text);
      // Validate description length (max 500 chars)
      const descResult = validateDescription(text);
      if (!descResult.valid) {
        setErrors((prev) => ({ ...prev, description: t('validation.maxLength', { max: DESCRIPTION_MAX_LENGTH }) }));
      } else if (errors.description) {
        setErrors((prev) => ({ ...prev, description: undefined }));
      }
    },
    [errors.description, t]
  );

  // Handle category selection
  const handleCategorySelect = useCallback((category: Category) => {
    setCategoryId(category.id);
    setShowCategoryPicker(false);
  }, []);

  // Handle reference month selection (marks as manually changed)
  const handleMonthSelect = useCallback((month: string) => {
    setReferenceMonth(month);
    setReferenceMonthManuallyChanged(true);
    setShowMonthPicker(false);
  }, []);

  // Handle batch mode toggle
  const handleBatchModeToggle = useCallback(
    (value: boolean) => {
      if (value) {
        // Deactivate installment mode if active (mutually exclusive)
        if (installmentMode) {
          setInstallmentMode(false);
        }
        // Show category picker to start batch session
        setShowBatchCategoryPicker(true);
      } else {
        // End batch session
        endBatchSession();
      }
    },
    [installmentMode, endBatchSession]
  );

  // Handle batch category selection
  const handleBatchCategorySelect = useCallback(
    (category: Category) => {
      // Store the selected category and show title input step
      setPendingBatchCategory(category);
      setShowBatchCategoryPicker(false);
      setBatchTitleInput('');
      setBatchTitleError(null);
      setShowBatchTitleInput(true);
    },
    []
  );

  // Handle batch title confirmation â€” starts the session
  const handleBatchTitleConfirm = useCallback(() => {
    const trimmedTitle = batchTitleInput.trim();
    if (!trimmedTitle || trimmedTitle.length === 0) {
      setBatchTitleError(t('manual.batch.titleRequired'));
      return;
    }
    if (trimmedTitle.length > 100) {
      setBatchTitleError(t('manual.batch.titleTooLong'));
      return;
    }
    if (!pendingBatchCategory) return;

    startBatchSession(
      pendingBatchCategory.id,
      pendingBatchCategory.type as 'income' | 'expense',
      trimmedTitle
    );
    setShowBatchTitleInput(false);
    setPendingBatchCategory(null);
    setBatchTitleInput('');
    setBatchTitleError(null);
    // Reset form fields for batch mode
    setAmount('');
    setDescription('');
    setDate(new Date());
    setErrors({});
  }, [batchTitleInput, pendingBatchCategory, startBatchSession, t]);

  // Handle batch title input cancel
  const handleBatchTitleCancel = useCallback(() => {
    setShowBatchTitleInput(false);
    setPendingBatchCategory(null);
    setBatchTitleInput('');
    setBatchTitleError(null);
  }, []);

  // Handle batch mode end session
  const handleEndBatchSession = useCallback(() => {
    const summary = endBatchSession();
    const formattedValue = (Math.abs(summary.totalValue) / 100).toFixed(2);
    Alert.alert(
      t('manual.batch.sessionSummary'),
      t('manual.batch.sessionSummaryMessage', {
        count: summary.totalEntries,
        value: formattedValue,
      })
    );
  }, [endBatchSession, t]);

  // Handle batch entry save
  const handleBatchSubmit = useCallback(async () => {
    if (!batchCategoryId || !batchCategoryType) return;

    // Parse amount
    const parsedAmount = parseNumberLocale(amount, locale);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('common.error'), t('manual.validationError'));
      return;
    }

    const amountInCents = Math.round(parsedAmount * 100);
    const effectiveReferenceMonth = referenceMonthManuallyChanged ? referenceMonth : deriveReferenceMonth(date);

    // Validate using validateBatchEntry (no categoryId needed â€” it comes from session)
    const validationResult = validateBatchEntry({
      amount: amountInCents,
      description: description.trim(),
      date,
      referenceMonth: effectiveReferenceMonth,
    });

    if (!validationResult.valid) {
      Alert.alert(t('common.error'), validationResult.errors?.join('\n') ?? t('manual.validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Apply sign based on session's category type
      const signedAmount = batchCategoryType === 'expense' ? -amountInCents : amountInCents;

      // Create transaction with session's category and title
      await createTransaction({
        title: batchTitle || '',
        date,
        amount: signedAmount,
        description: description.trim(),
        categoryId: batchCategoryId,
        referenceMonth: effectiveReferenceMonth,
        needsReview: false,
        isExcludedFromTotals: false,
      });

      // Increment session counter with the absolute amount
      incrementBatchCount(amountInCents);

      // Clear value and description, reset date to now, keep category fixed
      setAmount('');
      setDescription('');
      setDate(new Date());
      setErrors({});
    } catch (error) {
      console.error('Failed to save batch entry:', error);
      // On error: show error message, retain form data, do not increment counter
      Alert.alert(t('common.error'), t('manual.batch.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    batchCategoryId,
    batchCategoryType,
    batchTitle,
    amount,
    locale,
    date,
    description,
    referenceMonth,
    referenceMonthManuallyChanged,
    incrementBatchCount,
    t,
  ]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate title (required, 1-100 chars after trim)
    const titleResult = validateTitle(title);
    if (!titleResult.valid) {
      if (title.trim().length === 0) {
        newErrors.title = t('manual.titleRequired');
      } else {
        newErrors.title = t('manual.titleMaxLength');
      }
    }

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = t('validation.required');
    } else {
      const parsedAmount = parseNumberLocale(amount, locale);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        newErrors.amount = t('validation.invalidAmount');
      }
    }

    // Validate description (optional, max 500 chars)
    const descResult = validateDescription(description);
    if (!descResult.valid) {
      newErrors.description = t('validation.maxLength', { max: DESCRIPTION_MAX_LENGTH });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [amount, title, description, locale, t]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    setTransactionType('expense');
    setDate(new Date());
    setAmount('');
    setTitle('');
    setDescription('');
    setCategoryId(null);
    setReferenceMonth(getCurrentMonth());
    setReferenceMonthManuallyChanged(false);
    setErrors({});
    setInstallmentMode(false);
    setIsInfiniteInstallment(false);
    setParcelCount('2');
    setInstallmentStartMonth(getCurrentMonth());
    setInstallmentPreview([]);
    setPaymentStatusOption('all_pending');
    setRecurringFrequency('monthly');
    setWeeklyDayOfWeek(new Date().getDay());
  }, []);

  // Handle infinite installment submission (creates a recurring transaction)
  const handleInfiniteInstallmentSubmit = useCallback(async () => {
    const parsedAmount = parseNumberLocale(amount, locale);
    const amountInCents = !isNaN(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100)
      : 0;

    // Validate title
    const titleResult = validateTitle(title);
    if (!titleResult.valid) {
      Alert.alert(t('manual.installment.errorTitle'), t('manual.titleRequired'));
      return;
    }

    // Validate amount
    if (amountInCents <= 0) {
      Alert.alert(t('manual.installment.errorTitle'), t('validation.invalidAmount'));
      return;
    }

    // Validate category
    if (!categoryId) {
      Alert.alert(t('manual.installment.errorTitle'), t('validation.required'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Apply sign based on transaction type
      const signedAmount = transactionType === 'expense' ? -amountInCents : amountInCents;

      if (recurringFrequency === 'weekly') {
        // Create weekly recurring group via WeeklyRecurringService
        await weeklyRecurringService.createGroup({
          title: title.trim(),
          amount: amountInCents,
          dayOfWeek: weeklyDayOfWeek,
          categoryId,
          categoryType: transactionType,
          description: description.trim() || undefined,
          paymentStatusOption,
        });

        Alert.alert(
          t('manual.installment.infiniteSuccessTitle'),
          t('manual.installment.weeklySuccessMessage', {
            defaultValue: 'Gasto semanal recorrente criado com sucesso!',
          })
        );
      } else {
        // Create monthly recurring transaction via RecurringTransactionService
        await createRecurring({
          title: title.trim(),
          amount: signedAmount,
          categoryId,
          categoryType: transactionType,
          startMonth: installmentStartMonth,
          description: description.trim() || undefined,
          paymentStatusOption,
        });

        // Format start month for success message
        const startMonthFormatted = formatReferenceMonth(installmentStartMonth, locale);

        Alert.alert(
          t('manual.installment.infiniteSuccessTitle'),
          t('manual.installment.infiniteSuccessMessage', {
            startMonth: startMonthFormatted,
          })
        );
      }

      // Clear draft and reset form
      await clearDraft();
      resetForm();
    } catch (error) {
      console.error('Failed to create recurring:', error);
      Alert.alert(t('manual.installment.errorTitle'), t('manual.installment.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    locale,
    title,
    description,
    installmentStartMonth,
    categoryId,
    transactionType,
    recurringFrequency,
    weeklyDayOfWeek,
    paymentStatusOption,
    clearDraft,
    resetForm,
    t,
  ]);

  // Handle installment submission
  const handleInstallmentSubmit = useCallback(async () => {
    // If infinite installment mode, use the recurring flow
    if (isInfiniteInstallment) {
      await handleInfiniteInstallmentSubmit();
      return;
    }

    const parsedAmount = parseNumberLocale(amount, locale);
    const amountInCents = !isNaN(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100)
      : 0;
    const parsedParcelCount = parseInt(parcelCount, 10);

    // Validate using EntryValidationService
    const validationResult = validateInstallmentEntry({
      totalAmount: amountInCents * parsedParcelCount,
      parcelCount: parsedParcelCount,
      description: description.trim(),
      startMonth: installmentStartMonth,
      categoryId: categoryId,
    });

    if (!validationResult.valid) {
      const errorMessage = validationResult.errors?.join('\n') || t('manual.installment.validationError');
      Alert.alert(t('manual.installment.errorTitle'), errorMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a UUID for the installment group
      const installmentGroupId = randomUUID();

      // Calculate installment details
      const installments = calculateInstallments({
        totalAmount: amountInCents * parsedParcelCount,
        parcelCount: parsedParcelCount,
        startMonth: installmentStartMonth,
        title: title.trim(),
        categoryId: categoryId || '',
      });

      // Build transaction DTOs for all parcels with payment status
      const transactionDTOs = installments.map((parcel, index) => {
        let isPaid = false;
        if (paymentStatusOption === 'all_paid') {
          isPaid = true;
        } else if (paymentStatusOption === 'first_paid' && index === 0) {
          isPaid = true;
        }
        return {
          title: title.trim(),
          date,
          amount: transactionType === 'expense' ? -parcel.amount : parcel.amount,
          description: parcel.descriptionSuffix,
          categoryId: categoryId ?? undefined,
          referenceMonth: parcel.referenceMonth,
          needsReview: false,
          isExcludedFromTotals: false,
          isPaid,
          installmentGroupId,
        };
      });

      // Create all parcels atomically inside a DB transaction
      await createTransactions(transactionDTOs);

      // Format start and end months for the success message
      const startMonthFormatted = formatReferenceMonth(installmentStartMonth, locale);
      const endMonth = installments[installments.length - 1]?.referenceMonth || installmentStartMonth;
      const endMonthFormatted = formatReferenceMonth(endMonth, locale);

      // Show success confirmation with parcel count and period
      Alert.alert(
        t('manual.installment.successTitle'),
        t('manual.installment.successMessage', {
          count: parsedParcelCount,
          startMonth: startMonthFormatted,
          endMonth: endMonthFormatted,
        })
      );

      // Clear draft and reset form
      await clearDraft();
      resetForm();
    } catch (error) {
      // On error: rollback is handled by createTransactions (withTransaction),
      // show error toast, retain form data (don't reset)
      console.error('Failed to create installments:', error);
      Alert.alert(t('manual.installment.errorTitle'), t('manual.installment.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isInfiniteInstallment,
    handleInfiniteInstallmentSubmit,
    amount,
    locale,
    parcelCount,
    title,
    description,
    installmentStartMonth,
    categoryId,
    transactionType,
    date,
    clearDraft,
    resetForm,
    t,
  ]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // If installment mode is active, use the installment flow
    if (installmentMode) {
      await handleInstallmentSubmit();
      return;
    }

    if (!validateForm()) {
      Alert.alert(t('common.error'), t('manual.validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse amount
      const parsedAmount = parseNumberLocale(amount, locale);
      // Convert to cents and apply sign based on transaction type
      const amountInCents = Math.round(parsedAmount * 100);
      const signedAmount = transactionType === 'expense' ? -amountInCents : amountInCents;

      // Create transaction
      await createTransaction({
        date,
        amount: signedAmount,
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ?? undefined,
        referenceMonth,
        needsReview: false, // Manual entries don't need review
        isExcludedFromTotals: false,
      });

      // Show success message
      Alert.alert(t('common.success'), t('manual.transactionSaved'));

      // Clear draft and reset form
      await clearDraft();
      resetForm();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert(t('common.error'), t('errors.database'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    installmentMode,
    handleInstallmentSubmit,
    validateForm,
    amount,
    locale,
    transactionType,
    date,
    title,
    description,
    categoryId,
    referenceMonth,
    clearDraft,
    t,
  ]);

  // Handle clear draft
  const handleClearDraft = useCallback(async () => {
    Alert.alert(t('manual.clearDraft'), t('manual.clearDraft'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await clearDraft();
          resetForm();
        },
      },
    ]);
  }, [clearDraft, resetForm, t]);

  // Parse amount for preview
  const previewAmount = useMemo(() => {
    if (!amount.trim()) return 0;
    const parsed = parseNumberLocale(amount, locale);
    if (isNaN(parsed)) return 0;
    const cents = Math.round(parsed * 100);
    return transactionType === 'expense' ? -cents : cents;
  }, [amount, locale, transactionType]);

  // Dynamic styles based on theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Show loading state
  if (isLoading || categoriesLoading) {
    return (
      <View style={styles.container} testID="manual-screen-loading">
        <LoadingIndicator message={t('common.loading')} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        testID="manual-screen"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('manual.title')}</Text>
              <Text style={styles.subtitle}>{t('manual.newTransaction')}</Text>
              {isDirty && (
                <Text style={styles.draftIndicator} testID="draft-indicator">
                  {isSaving ? t('common.loading') : t('manual.draftSaved')}
                </Text>
              )}
            </View>

            {/* Batch Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.modeToggleRow} testID="batch-mode-toggle-row">
                <Text style={styles.label}>{t('manual.batch.toggle')}</Text>
                <Switch
                  value={batchIsActive}
                  onValueChange={handleBatchModeToggle}
                  disabled={installmentMode}
                  trackColor={{ false: colors.border.default, true: colors.semantic.primary.scale[300] }}
                  thumbColor={batchIsActive ? colors.interactive.primary : colors.background.primary}
                  accessibilityRole="switch"
                  accessibilityLabel={t('manual.batch.toggle')}
                  accessibilityState={{ checked: batchIsActive }}
                  testID="batch-mode-toggle"
                />
              </View>
            </View>

            {/* Batch Mode Active Banner */}
            {batchIsActive && (
              <View style={styles.batchBanner} testID="batch-mode-banner">
                <View style={styles.batchBannerHeader}>
                  <Text style={styles.batchBannerTitle}>{t('manual.batch.active')}</Text>
                  <TouchableOpacity
                    onPress={handleEndBatchSession}
                    accessibilityRole="button"
                    accessibilityLabel={t('manual.batch.endSession')}
                    testID="batch-end-session-button"
                  >
                    <Text style={styles.batchEndSessionText}>{t('manual.batch.endSession')}</Text>
                  </TouchableOpacity>
                </View>
                {/* Locked title display */}
                {batchTitle && (
                  <View style={styles.batchTitleInfo} testID="batch-locked-title">
                    <Text style={styles.batchTitleLabel}>{t('manual.batch.titleLabel')}</Text>
                    <Text style={styles.batchTitleValue}>{batchTitle}</Text>
                  </View>
                )}
                {batchSelectedCategory && (
                  <View style={styles.batchCategoryInfo}>
                    <View
                      style={[styles.categoryIcon, { backgroundColor: batchSelectedCategory.color }]}
                    >
                      <Text style={styles.categoryIconText}>{batchSelectedCategory.icon}</Text>
                    </View>
                    <Text style={styles.batchCategoryName}>
                      {t('manual.batch.category', { name: batchSelectedCategory.name })}
                    </Text>
                  </View>
                )}
                <Text style={styles.batchCounter} testID="batch-session-counter">
                  {t('manual.batch.sessionCounter', { count: batchEntryCount, max: batchMaxEntries })}
                </Text>
                {batchEntryCount >= batchMaxEntries && (
                  <Text style={styles.batchLimitMessage} testID="batch-limit-message">
                    {t('manual.batch.limitReached')}
                  </Text>
                )}
              </View>
            )}

            {/* Transaction Type Toggle - hidden in batch mode */}
            {!batchIsActive && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('manual.transactionType')}</Text>
              <View style={styles.typeToggle} testID="type-toggle">
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'expense' && styles.typeButtonActiveExpense,
                  ]}
                  onPress={() => handleTypeChange('expense')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: transactionType === 'expense' }}
                  testID="type-expense"
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'expense' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('manual.expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'income' && styles.typeButtonActiveIncome,
                  ]}
                  onPress={() => handleTypeChange('income')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: transactionType === 'income' }}
                  testID="type-income"
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'income' && styles.typeButtonTextActive,
                    ]}
                  >
                    {t('manual.income')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            )}

            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('transactions.amount')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.amount && styles.inputError]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder={t('manual.enterAmount')}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                accessibilityLabel={t('transactions.amount')}
                accessibilityHint={t('manual.enterAmount')}
                returnKeyType="next"
                blurOnSubmit={false}
                testID="amount-input"
              />
              {errors.amount && (
                <Text style={styles.errorText} testID="amount-error">
                  {errors.amount}
                </Text>
              )}
              {previewAmount !== 0 && (
                <View style={styles.amountPreview}>
                  <AmountDisplay
                    amount={previewAmount}
                    size="large"
                    colorVariant="auto"
                    showSign
                    testID="amount-preview"
                  />
                </View>
              )}
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('transactions.entryTitle')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={handleTitleChange}
                placeholder={t('manual.enterTitle')}
                placeholderTextColor={colors.text.tertiary}
                maxLength={TITLE_MAX_LENGTH}
                accessibilityLabel={t('transactions.entryTitle')}
                accessibilityHint={t('manual.enterTitle')}
                returnKeyType="next"
                blurOnSubmit={false}
                testID="title-input"
              />
              {errors.title && (
                <Text style={styles.errorText} testID="title-error">
                  {errors.title}
                </Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('transactions.description')}{batchIsActive ? ` (${t('common.optional')})` : ''}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={description}
                onChangeText={handleDescriptionChange}
                placeholder={batchIsActive ? t('manual.batch.descriptionPlaceholder') : t('manual.enterDescription')}
                placeholderTextColor={colors.text.tertiary}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('transactions.description')}
                accessibilityHint={batchIsActive ? t('manual.batch.descriptionPlaceholder') : t('manual.enterDescription')}
                returnKeyType="done"
                blurOnSubmit={true}
                testID="description-input"
              />
              {errors.description && (
                <Text style={styles.errorText} testID="description-error">
                  {errors.description}
                </Text>
              )}
            </View>

            {/* Date & Time Picker (Data da Compra) */}
            <View style={styles.section}>
              <DateTimePicker
                value={date}
                onChange={handleDateChange}
                locale={locale}
                label={t('manual.purchaseDate')}
                maximumDate={new Date()}
                testID="date-time-picker"
              />
            </View>

            {/* Category Selector - hidden in batch mode */}
            {!batchIsActive && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('transactions.category')}</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowCategoryPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('manual.selectCategory')}
                testID="category-selector"
              >
                {selectedCategory ? (
                  <View style={styles.selectedCategory}>
                    <View
                      style={[styles.categoryIcon, { backgroundColor: selectedCategory.color }]}
                    >
                      <Text style={styles.categoryIconText}>{selectedCategory.icon}</Text>
                    </View>
                    <Text style={styles.selectorText}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>{t('manual.selectCategory')}</Text>
                )}
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            )}

            {/* Reference Month Selector (Mês de Referência) */}
            <View style={styles.section}>
              <View style={styles.referenceMonthHeader}>
                <Text style={styles.label}>{t('manual.referenceMonth')}</Text>
                {referenceMonthManuallyChanged && (
                  <Text style={styles.referenceMonthBadge} testID="reference-month-manual-badge">
                    {t('manual.referenceMonthManual')}
                  </Text>
                )}
              </View>
              <Text style={styles.referenceMonthHint}>{t('manual.referenceMonthHint')}</Text>
              <TouchableOpacity
                style={[styles.selector, styles.referenceMonthSelector]}
                onPress={() => setShowMonthPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('manual.selectMonth')}
                testID="month-selector"
              >
                <Text style={styles.selectorText}>
                  {formatReferenceMonth(referenceMonth, locale)}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Installment Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleItem} testID="installment-toggle-section">
                <View style={styles.toggleInfo}>
                  <Text style={styles.label}>{t('manual.installment.toggle')}</Text>
                </View>
                <Switch
                  value={installmentMode}
                  onValueChange={handleInstallmentToggle}
                  disabled={batchIsActive}
                  trackColor={{ false: colors.border.default, true: colors.interactive.primary }}
                  thumbColor={colors.background.primary}
                  accessibilityRole="switch"
                  accessibilityLabel={t('manual.installment.toggle')}
                  accessibilityState={{ checked: installmentMode, disabled: batchIsActive }}
                  testID="installment-toggle"
                />
              </View>
            </View>

            {/* Installment Form (shown when installment mode is active) */}
            {installmentMode && (
              <View testID="installment-form">
                {/* Infinite Installment Toggle */}
                <View style={styles.section}>
                  <View style={styles.toggleItem} testID="infinite-installment-toggle-section">
                    <View style={styles.toggleInfo}>
                      <Text style={styles.label}>{t('manual.installment.infiniteToggle')}</Text>
                    </View>
                    <Switch
                      value={isInfiniteInstallment}
                      onValueChange={setIsInfiniteInstallment}
                      trackColor={{ false: colors.border.default, true: colors.interactive.primary }}
                      thumbColor={colors.background.primary}
                      accessibilityRole="switch"
                      accessibilityLabel={t('manual.installment.infiniteToggle')}
                      accessibilityState={{ checked: isInfiniteInstallment }}
                      testID="infinite-installment-toggle"
                    />
                  </View>
                </View>

                {/* Infinite Installment Indicator */}
                {isInfiniteInstallment && (
                  <View style={styles.section} testID="infinite-installment-indicator">
                    <View style={styles.infiniteIndicator}>
                      <Text style={styles.infiniteSymbol}>∞</Text>
                      <Text style={styles.infiniteText}>{t('manual.installment.infiniteIndicator')}</Text>
                    </View>
                    <Text style={styles.hintText}>{t('manual.installment.infinitePreview')}</Text>
                  </View>
                )}

                {/* Frequency Selector (Mensal / Semanal) - only for infinite */}
                {isInfiniteInstallment && (
                  <View style={styles.section} testID="recurring-frequency-section">
                    <Text style={styles.label}>Frequência</Text>
                    <View style={styles.typeToggle} testID="frequency-toggle">
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          recurringFrequency === 'monthly' && styles.typeButtonActiveExpense,
                        ]}
                        onPress={() => setRecurringFrequency('monthly')}
                        testID="frequency-monthly"
                      >
                        <Text style={[styles.typeButtonText, recurringFrequency === 'monthly' && styles.typeButtonTextActive]}>
                          Mensal
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          recurringFrequency === 'weekly' && styles.typeButtonActiveIncome,
                        ]}
                        onPress={() => setRecurringFrequency('weekly')}
                        testID="frequency-weekly"
                      >
                        <Text style={[styles.typeButtonText, recurringFrequency === 'weekly' && styles.typeButtonTextActive]}>
                          Semanal
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Day of Week Selector (only for weekly frequency) */}
                {isInfiniteInstallment && recurringFrequency === 'weekly' && (
                  <View style={styles.section} testID="weekly-day-selector">
                    <Text style={styles.label}>Dia da semana</Text>
                    <View style={styles.typeToggle} testID="day-of-week-toggle">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, alignItems: 'center' as const },
                            { backgroundColor: weeklyDayOfWeek === index ? colors.interactive.primary : colors.background.tertiary },
                          ]}
                          onPress={() => setWeeklyDayOfWeek(index)}
                          testID={`day-${index}`}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: weeklyDayOfWeek === index ? colors.text.inverse : colors.text.primary }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Payment Status Option - shown for ALL installment modes (finite and infinite) */}
                <View style={styles.section} testID="recurring-payment-status-option">
                  <PaymentStatusOption
                    selected={paymentStatusOption}
                    onSelect={setPaymentStatusOption}
                    testID="recurring-payment-status"
                  />
                </View>

                {/* Parcel Count Input (hidden when infinite) */}
                {!isInfiniteInstallment && (
                  <View style={styles.section}>
                    <Text style={styles.label}>
                      {t('manual.installment.parcelCount')} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={parcelCount}
                      onChangeText={handleParcelCountChange}
                      placeholder={t('manual.installment.parcelCountHint')}
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="number-pad"
                      accessibilityLabel={t('manual.installment.parcelCount')}
                      accessibilityHint={t('manual.installment.parcelCountHint')}
                      returnKeyType="done"
                      testID="parcel-count-input"
                    />
                    <Text style={styles.hintText}>{t('manual.installment.parcelCountHint')}</Text>
                  </View>
                )}

                {/* Installment Start Month Selector */}
                <View style={styles.section}>
                  <Text style={styles.label}>{t('manual.installment.startMonth')}</Text>
                  <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setShowInstallmentMonthPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('manual.installment.startMonth')}
                    testID="installment-start-month-selector"
                  >
                    <Text style={styles.selectorText}>
                      {formatReferenceMonth(installmentStartMonth, locale)}
                    </Text>
                    <Text style={styles.selectorArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Installment Preview (only for finite installments) */}
                {!isInfiniteInstallment && installmentPreview.length > 0 && (
                  <InstallmentPreview
                    installments={installmentPreview}
                    locale={locale}
                    transactionType={transactionType}
                    testID="installment-preview"
                  />
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, (isSubmitting || (batchIsActive && batchEntryCount >= batchMaxEntries)) && styles.submitButtonDisabled]}
                onPress={batchIsActive ? handleBatchSubmit : handleSubmit}
                disabled={isSubmitting || (batchIsActive && batchEntryCount >= batchMaxEntries)}
                accessibilityRole="button"
                accessibilityLabel={t('manual.saveTransaction')}
                testID="submit-button"
              >
                {isSubmitting ? (
                  <Text style={styles.submitButtonText}>{t('common.loading')}</Text>
                ) : (
                  <Text style={styles.submitButtonText}>{t('manual.saveTransaction')}</Text>
                )}
              </TouchableOpacity>

              {isDirty && (
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={handleClearDraft}
                  accessibilityRole="button"
                  accessibilityLabel={t('manual.clearDraft')}
                  testID="clear-draft-button"
                >
                  <Text style={styles.clearButtonText}>{t('manual.clearDraft')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Category Selector Modal */}
        {showCategoryPicker && (
          <Modal
            visible={showCategoryPicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowCategoryPicker(false)}
            testID="category-picker-modal"
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>
                  {t('manual.selectCategory')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryPicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Text style={styles.modalHeaderAction}>
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              </View>
              <CategorySelector
                selectedCategoryId={categoryId}
                onSelect={handleCategorySelect}
                includeIncome={transactionType === 'income'}
                testID="category-picker"
              />
            </SafeAreaView>
          </Modal>
        )}

        {/* Reference Month Picker Modal */}
        {showMonthPicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setShowMonthPicker(false)}
              activeOpacity={1}
            />
            <View style={styles.monthPickerModal} testID="month-picker-modal">
              <View style={styles.monthPickerHeader}>
                <Text style={styles.monthPickerTitle}>{t('manual.selectMonth')}</Text>
                <TouchableOpacity
                  onPress={() => setShowMonthPicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Text style={styles.monthPickerClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.monthList}
                contentOffset={{ x: 0, y: nextMonthIndex * 49 }}
              >
                {referenceMonths.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthItem, month === referenceMonth && styles.monthItemSelected]}
                    onPress={() => handleMonthSelect(month)}
                    testID={`month-option-${month}`}
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        month === referenceMonth && styles.monthItemTextSelected,
                      ]}
                    >
                      {formatReferenceMonth(month, locale)}
                    </Text>
                    {month === referenceMonth && <Text style={styles.monthItemCheck}>✔</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Batch Category Picker Modal */}
        {showBatchCategoryPicker && (
          <Modal
            visible={showBatchCategoryPicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowBatchCategoryPicker(false)}
            testID="batch-category-picker-modal"
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>
                  {t('manual.batch.selectCategory')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBatchCategoryPicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  testID="batch-category-picker-close"
                >
                  <Text style={styles.modalHeaderAction}>
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>
              </View>
              <CategorySelector
                selectedCategoryId={null}
                onSelect={handleBatchCategorySelect}
                includeIncome={true}
                testID="batch-category-picker"
              />
            </SafeAreaView>
          </Modal>
        )}

        {/* Batch Title Input Modal */}
        {showBatchTitleInput && (
          <Modal
            visible={showBatchTitleInput}
            animationType="fade"
            transparent={true}
            onRequestClose={handleBatchTitleCancel}
            testID="batch-title-input-modal"
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.batchTitleModalOverlay}>
                <View style={styles.batchTitleModalContent}>
                  <Text style={styles.batchTitleModalTitle}>{t('manual.batch.enterTitle')}</Text>
                  {pendingBatchCategory && (
                    <View style={styles.batchTitleCategoryPreview}>
                      <View
                        style={[styles.categoryIcon, { backgroundColor: pendingBatchCategory.color }]}
                      >
                        <Text style={styles.categoryIconText}>{pendingBatchCategory.icon}</Text>
                      </View>
                      <Text style={styles.batchTitleCategoryName}>{pendingBatchCategory.name}</Text>
                    </View>
                  )}
                  <TextInput
                    style={[styles.input, batchTitleError && styles.inputError]}
                    value={batchTitleInput}
                    onChangeText={(text) => {
                      setBatchTitleInput(text);
                      if (batchTitleError) setBatchTitleError(null);
                    }}
                    placeholder={t('manual.batch.titlePlaceholder')}
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={100}
                    autoFocus={true}
                    accessibilityLabel={t('manual.batch.titleLabel')}
                    returnKeyType="done"
                    onSubmitEditing={handleBatchTitleConfirm}
                    testID="batch-title-input"
                  />
                  {batchTitleError && (
                    <Text style={styles.errorText} testID="batch-title-error">
                      {batchTitleError}
                    </Text>
                  )}
                  <View style={styles.batchTitleModalActions}>
                    <TouchableOpacity
                      style={[styles.button, styles.clearButton, { flex: 1 }]}
                      onPress={handleBatchTitleCancel}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.cancel')}
                      testID="batch-title-cancel"
                    >
                      <Text style={styles.clearButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.submitButton, { flex: 1 }]}
                      onPress={handleBatchTitleConfirm}
                      accessibilityRole="button"
                      accessibilityLabel={t('manual.batch.startSession')}
                      testID="batch-title-confirm"
                    >
                      <Text style={styles.submitButtonText}>{t('manual.batch.startSession')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* Installment Start Month Picker Modal */}
        {showInstallmentMonthPicker && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setShowInstallmentMonthPicker(false)}
              activeOpacity={1}
            />
            <View style={styles.monthPickerModal} testID="installment-month-picker-modal">
              <View style={styles.monthPickerHeader}>
                <Text style={styles.monthPickerTitle}>{t('manual.installment.startMonth')}</Text>
                <TouchableOpacity
                  onPress={() => setShowInstallmentMonthPicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Text style={styles.monthPickerClose}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.monthList}>
                {installmentStartMonths.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthItem, month === installmentStartMonth && styles.monthItemSelected]}
                    onPress={() => handleInstallmentMonthSelect(month)}
                    testID={`installment-month-option-${month}`}
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        month === installmentStartMonth && styles.monthItemTextSelected,
                      ]}
                    >
                      {formatReferenceMonth(month, locale)}
                    </Text>
                    {month === installmentStartMonth && <Text style={styles.monthItemCheck}>✔</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Creates dynamic styles based on the current theme colors.
 * Form grouping: internal spacing (sm=8) ≤ 50% of between-group spacing (lg=20).
 * Primary color applied only to submit/save buttons, not to labels or static text.
 *
 * **Validates: Requirements 8.4, 8.5, 10.1, 10.2, 10.3, 10.4**
 */
function createStyles(c: ModeColors) {
  return RNStyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background.secondary,
    },
    container: {
      flex: 1,
      backgroundColor: c.background.secondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.base,
      paddingBottom: spacing['2xl'],
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: typography.heading.fontSize,
      fontWeight: typography.heading.fontWeight,
      color: c.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight,
      color: c.text.secondary,
    },
    draftIndicator: {
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: c.text.secondary,
      marginTop: spacing.xs,
    },
    // Between-group spacing: 20 (spacing.lg)
    section: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: typography.caption.fontSize,
      fontWeight: '500' as const,
      color: c.text.secondary,
      // Internal spacing within group: 8 (spacing.sm) ≤ 50% of 20
      marginBottom: spacing.sm,
    },
    required: {
      color: c.semantic.danger.base,
    },
    input: {
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.default,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: typography.body.fontSize,
      color: c.text.primary,
      minHeight: 48,
    },
    inputError: {
      borderColor: c.semantic.danger.base,
    },
    textArea: {
      minHeight: 80,
      paddingTop: spacing.md,
    },
    errorText: {
      fontSize: typography.caption.fontSize,
      color: c.semantic.danger.base,
      marginTop: spacing.xs,
    },
    amountPreview: {
      marginTop: spacing.sm,
      alignItems: 'flex-start' as const,
    },
    typeToggle: {
      flexDirection: 'row' as const,
      backgroundColor: c.border.default,
      borderRadius: borderRadius.sm,
      padding: spacing.xs,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.base,
      borderRadius: borderRadius.sm - 2,
      alignItems: 'center' as const,
    },
    typeButtonActiveExpense: {
      backgroundColor: c.semantic.danger.light,
    },
    typeButtonActiveIncome: {
      backgroundColor: c.semantic.success.light,
    },
    typeButtonText: {
      fontSize: typography.caption.fontSize,
      fontWeight: '500' as const,
      color: c.text.secondary,
    },
    typeButtonTextActive: {
      color: c.text.primary,
      fontWeight: '600' as const,
    },
    selector: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.default,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    selectorText: {
      fontSize: typography.body.fontSize,
      color: c.text.primary,
      flex: 1,
    },
    selectorPlaceholder: {
      fontSize: typography.body.fontSize,
      color: c.text.tertiary,
      flex: 1,
    },
    selectorArrow: {
      fontSize: typography.caption.fontSize,
      color: c.text.secondary,
      marginLeft: spacing.sm,
    },
    selectedCategory: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    categoryIcon: {
      width: spacing['2xl'],
      height: spacing['2xl'],
      borderRadius: spacing.base,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.sm + 2,
    },
    categoryIconText: {
      fontSize: typography.caption.fontSize,
    },
    actions: {
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    button: {
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.md + 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    // Primary color ONLY on submit/save buttons (Req 8.5)
    submitButton: {
      backgroundColor: c.interactive.primary,
    },
    submitButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: '600' as const,
      color: c.text.inverse,
    },
    clearButton: {
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.default,
    },
    clearButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: '500' as const,
      color: c.text.secondary,
    },
    // Modal styles
    modalOverlay: {
      ...RNStyleSheet.absoluteFillObject,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 1000,
    },
    modalBackdrop: {
      ...RNStyleSheet.absoluteFillObject,
      backgroundColor: c.surface.overlay,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border.default,
    },
    modalHeaderTitle: {
      fontSize: typography.title.fontSize - 4,
      fontWeight: typography.title.fontWeight,
      color: c.text.primary,
    },
    modalHeaderAction: {
      fontSize: typography.body.fontSize,
      color: c.interactive.primary,
      fontWeight: '500' as const,
    },
    monthPickerModal: {
      backgroundColor: c.surface.card,
      borderRadius: borderRadius.lg,
      width: '85%' as const,
      maxHeight: '70%' as const,
      overflow: 'hidden' as const,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    monthPickerHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border.default,
    },
    monthPickerTitle: {
      fontSize: typography.title.fontSize - 4,
      fontWeight: typography.title.fontWeight,
      color: c.text.primary,
    },
    monthPickerClose: {
      fontSize: typography.body.fontSize,
      color: c.interactive.primary,
      fontWeight: '500' as const,
    },
    monthList: {
      maxHeight: 300,
    },
    monthItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md + 2,
      borderBottomWidth: 1,
      borderBottomColor: c.border.subtle,
    },
    monthItemSelected: {
      backgroundColor: c.semantic.primary.light,
    },
    monthItemText: {
      fontSize: typography.body.fontSize,
      color: c.text.primary,
    },
    monthItemTextSelected: {
      color: c.interactive.primary,
      fontWeight: '600' as const,
    },
    monthItemCheck: {
      fontSize: typography.body.fontSize,
      color: c.interactive.primary,
      fontWeight: '600' as const,
    },
    // Installment mode styles
    toggleItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    toggleInfo: {
      flex: 1,
    },
    hintText: {
      fontSize: typography.caption.fontSize,
      color: c.text.secondary,
      marginTop: spacing.xs,
    },
    infiniteIndicator: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: c.semantic.primary.light,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      borderWidth: 1,
      borderColor: c.semantic.primary.scale[200],
    },
    infiniteSymbol: {
      fontSize: typography.heading.fontSize,
      fontWeight: '700' as const,
      color: c.interactive.primary,
      marginRight: spacing.md,
    },
    infiniteText: {
      fontSize: typography.caption.fontSize,
      fontWeight: '600' as const,
      color: c.semantic.primary.dark,
    },
    // Batch mode styles
    modeToggleRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    // Reference month styles
    referenceMonthHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.xs,
    },
    referenceMonthHint: {
      fontSize: typography.caption.fontSize,
      color: c.text.secondary,
      marginBottom: spacing.sm,
    },
    referenceMonthSelector: {
      borderColor: c.semantic.primary.scale[300],
      backgroundColor: c.semantic.primary.light,
    },
    referenceMonthBadge: {
      fontSize: typography.overline.fontSize,
      color: c.semantic.warning.base,
      fontWeight: '500' as const,
    },
    batchBanner: {
      backgroundColor: c.semantic.primary.light,
      borderWidth: 1,
      borderColor: c.semantic.primary.scale[200],
      borderRadius: borderRadius.md,
      padding: spacing.base,
      marginBottom: spacing.lg,
    },
    batchBannerHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    batchBannerTitle: {
      fontSize: typography.body.fontSize,
      fontWeight: '600' as const,
      color: c.semantic.primary.dark,
    },
    batchEndSessionText: {
      fontSize: typography.caption.fontSize,
      fontWeight: '500' as const,
      color: c.semantic.danger.base,
    },
    batchCategoryInfo: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    batchCategoryName: {
      fontSize: typography.caption.fontSize,
      fontWeight: '500' as const,
      color: c.text.primary,
    },
    batchCounter: {
      fontSize: typography.caption.fontSize,
      color: c.text.secondary,
    },
    batchLimitMessage: {
      fontSize: typography.caption.fontSize,
      color: c.semantic.danger.base,
      marginTop: spacing.xs,
      fontWeight: '500' as const,
    },
    batchTitleInfo: {
      marginBottom: spacing.sm,
    },
    batchTitleLabel: {
      fontSize: typography.caption.fontSize,
      color: c.text.secondary,
      marginBottom: spacing.xs,
    },
    batchTitleValue: {
      fontSize: typography.body.fontSize - 1,
      fontWeight: '600' as const,
      color: c.semantic.primary.dark,
    },
    batchTitleModalOverlay: {
      flex: 1,
      backgroundColor: c.surface.overlay,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: spacing.xl,
    },
    batchTitleModalContent: {
      backgroundColor: c.surface.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      width: '100%' as const,
      maxWidth: 400,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    batchTitleModalTitle: {
      fontSize: typography.title.fontSize - 4,
      fontWeight: typography.title.fontWeight,
      color: c.text.primary,
      marginBottom: spacing.base,
      textAlign: 'center' as const,
    },
    batchTitleCategoryPreview: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.base,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: c.background.secondary,
      borderRadius: borderRadius.sm,
    },
    batchTitleCategoryName: {
      fontSize: typography.caption.fontSize,
      fontWeight: '500' as const,
      color: c.text.primary,
    },
    batchTitleModalActions: {
      flexDirection: 'row' as const,
      gap: spacing.md,
      marginTop: spacing.base,
    },
    submitButtonDisabled: {
      backgroundColor: c.interactive.disabled,
    },
  });
}
