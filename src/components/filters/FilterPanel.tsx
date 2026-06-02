/**
 * FilterPanel Component
 *
 * Collapsible panel for filtering transactions by category, value range,
 * and date range. Renders above the transaction list on the Statement Screen.
 *
 * Features:
 * - Toggle button with active filter count badge
 * - Category chips with horizontal scroll and multi-select
 * - Min/max amount TextInput fields with locale-aware numeric keyboard
 * - Start/end date picker buttons using @react-native-community/datetimepicker
 * - "Clear all" button to reset filters
 * - Inline validation errors (min > max, startDate > endDate)
 * - Full i18n support (pt-BR / en)
 * - Light/dark theme support via useThemeColors
 * - Accessibility attributes on all interactive elements
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.5, 5.7, 8.1, 8.5, 8.7, 8.8, 9.1, 9.3, 9.4, 9.5**
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../constants/theme';
import type { FilterState } from '../../stores/filterStore';
import type { Category } from '../../types';

/**
 * Props for the FilterPanel component
 */
export interface FilterPanelProps {
  /** Whether the filter panel is expanded */
  isExpanded: boolean;
  /** Callback to toggle panel expansion */
  onToggle: () => void;
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: FilterState) => void;
  /** Available categories for filter chips */
  categories: Category[];
  /** Current locale for formatting */
  locale: 'pt-BR' | 'en';
}

/**
 * Get the decimal separator for the given locale
 */
function getDecimalSeparator(locale: 'pt-BR' | 'en'): string {
  return locale === 'pt-BR' ? ',' : '.';
}

/**
 * Format a cents value to a display string with locale-appropriate decimal separator
 */
function formatAmountForDisplay(cents: number | null, locale: 'pt-BR' | 'en'): string {
  if (cents === null) return '';
  const value = cents / 100;
  const separator = getDecimalSeparator(locale);
  const formatted = value.toFixed(2);
  return separator === ',' ? formatted.replace('.', ',') : formatted;
}

/**
 * Parse a locale-aware amount string to cents (integer)
 * Returns null if the string is empty or invalid
 */
function parseAmountToCents(text: string, locale: 'pt-BR' | 'en'): number | null {
  if (!text.trim()) return null;
  const separator = getDecimalSeparator(locale);
  // Normalize to standard decimal point
  const normalized = separator === ',' ? text.replace(',', '.') : text;
  const value = parseFloat(normalized);
  if (isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * Format a date for display based on locale
 */
function formatDateForDisplay(dateStr: string | null, locale: 'pt-BR' | 'en'): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (locale === 'pt-BR') {
    return `${day}/${month}/${year}`;
  }
  return `${month}/${day}/${year}`;
}

/**
 * Count active filters from a FilterState
 */
function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count++;
  if (filters.minAmount !== null) count++;
  if (filters.maxAmount !== null) count++;
  if (filters.startDate !== null) count++;
  if (filters.endDate !== null) count++;
  if (filters.pendingOnly) count++;
  return count;
}

/**
 * FilterPanel component implementation
 */
function FilterPanelComponent({
  isExpanded,
  onToggle,
  filters,
  onFiltersChange,
  categories,
  locale,
}: FilterPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Local state for text inputs (to allow typing before committing)
  const [minAmountText, setMinAmountText] = useState(
    formatAmountForDisplay(filters.minAmount, locale)
  );
  const [maxAmountText, setMaxAmountText] = useState(
    formatAmountForDisplay(filters.maxAmount, locale)
  );

  // Validation error state
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  // Date picker visibility state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // ─── Category Chip Handlers ──────────────────────────────────────────────

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      const currentIds = filters.categoryIds;
      const exists = currentIds.includes(categoryId);
      const newIds = exists
        ? currentIds.filter((id) => id !== categoryId)
        : [...currentIds, categoryId];

      onFiltersChange({ ...filters, categoryIds: newIds });
    },
    [filters, onFiltersChange]
  );

  // ─── Amount Input Handlers ───────────────────────────────────────────────

  const handleMinAmountChange = useCallback((text: string) => {
    setMinAmountText(text);
    setAmountError(null);
  }, []);

  const handleMaxAmountChange = useCallback((text: string) => {
    setMaxAmountText(text);
    setAmountError(null);
  }, []);

  const handleMinAmountBlur = useCallback(() => {
    const minCents = parseAmountToCents(minAmountText, locale);
    const maxCents = filters.maxAmount;

    if (minAmountText.trim() && minCents === null) {
      setAmountError(t('filters.validationInvalidAmount'));
      return;
    }

    if (minCents !== null && maxCents !== null && minCents > maxCents) {
      setAmountError(t('filters.validationMinGreaterThanMax'));
      return;
    }

    setAmountError(null);
    onFiltersChange({ ...filters, minAmount: minCents });
  }, [minAmountText, filters, locale, onFiltersChange, t]);

  const handleMaxAmountBlur = useCallback(() => {
    const maxCents = parseAmountToCents(maxAmountText, locale);
    const minCents = filters.minAmount;

    if (maxAmountText.trim() && maxCents === null) {
      setAmountError(t('filters.validationInvalidAmount'));
      return;
    }

    if (minCents !== null && maxCents !== null && minCents > maxCents) {
      setAmountError(t('filters.validationMinGreaterThanMax'));
      return;
    }

    setAmountError(null);
    onFiltersChange({ ...filters, maxAmount: maxCents });
  }, [maxAmountText, filters, locale, onFiltersChange, t]);

  // ─── Date Picker Handlers ────────────────────────────────────────────────

  const handleStartDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowStartDatePicker(Platform.OS === 'ios');

      if (!selectedDate) return;

      const isoDate: string = selectedDate.toISOString().split('T')[0]!;

      if (filters.endDate && isoDate > filters.endDate) {
        setDateError(t('filters.validationStartAfterEnd'));
        return;
      }

      setDateError(null);
      onFiltersChange({ ...filters, startDate: isoDate as string | null });
    },
    [filters, onFiltersChange, t]
  );

  const handleEndDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowEndDatePicker(Platform.OS === 'ios');

      if (!selectedDate) return;

      const isoDate: string = selectedDate.toISOString().split('T')[0]!;

      if (filters.startDate && isoDate < filters.startDate) {
        setDateError(t('filters.validationStartAfterEnd'));
        return;
      }

      setDateError(null);
      onFiltersChange({ ...filters, endDate: isoDate as string | null });
    },
    [filters, onFiltersChange, t]
  );

  // ─── Pending Only Handler ──────────────────────────────────────────────

  const handlePendingOnlyToggle = useCallback(
    (value: boolean) => {
      onFiltersChange({ ...filters, pendingOnly: value });
    },
    [filters, onFiltersChange]
  );

  // ─── Clear All Handler ───────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    setMinAmountText('');
    setMaxAmountText('');
    setAmountError(null);
    setDateError(null);
    onFiltersChange({
      categoryIds: [],
      minAmount: null,
      maxAmount: null,
      startDate: null,
      endDate: null,
      pendingOnly: false,
    });
  }, [onFiltersChange]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.card }]}
      testID="filter-panel"
    >
      {/* Toggle Button */}
      <TouchableOpacity
        style={[
          styles.toggleButton,
          { borderBottomColor: isExpanded ? colors.border.default : 'transparent' },
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={
          isExpanded ? t('filters.title') : t('filters.activeFilters', { count: activeFilterCount })
        }
        accessibilityState={{ expanded: isExpanded }}
        testID="filter-panel-toggle"
      >
        <Text style={[styles.toggleText, { color: colors.text.primary }]}>
          {t('filters.title')}
        </Text>
        {activeFilterCount > 0 && (
          <View
            style={[styles.badge, { backgroundColor: colors.interactive.primary }]}
            accessibilityLabel={t('filters.activeFilters', {
              count: activeFilterCount,
            })}
          >
            <Text style={[styles.badgeText, { color: colors.text.inverse }]}>
              {activeFilterCount}
            </Text>
          </View>
        )}
        <Text style={[styles.chevron, { color: colors.text.secondary }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Category Chips */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              {t('filters.category')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              testID="filter-category-chips"
            >
              {categories.map((category) => {
                const isSelected = filters.categoryIds.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? category.color : colors.background.tertiary,
                        borderColor: isSelected ? category.color : colors.border.default,
                      },
                    ]}
                    onPress={() => handleCategoryToggle(category.id)}
                    accessibilityRole="button"
                    accessibilityLabel={category.name}
                    accessibilityState={{ selected: isSelected }}
                    testID={`filter-chip-${category.id}`}
                  >
                    <Text style={styles.chipIcon}>{category.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? colors.text.inverse : colors.text.primary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Value Range Inputs */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              {t('filters.minAmount')} / {t('filters.maxAmount')}
            </Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: amountError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                value={minAmountText}
                onChangeText={handleMinAmountChange}
                onBlur={handleMinAmountBlur}
                placeholder={t('filters.minAmountPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                accessibilityLabel={t('filters.minAmount')}
                testID="filter-min-amount"
              />
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: amountError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                value={maxAmountText}
                onChangeText={handleMaxAmountChange}
                onBlur={handleMaxAmountBlur}
                placeholder={t('filters.maxAmountPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                accessibilityLabel={t('filters.maxAmount')}
                testID="filter-max-amount"
              />
            </View>
            {amountError && (
              <Text
                style={[styles.errorText, { color: colors.semantic.danger.base }]}
                accessibilityRole="alert"
                testID="filter-amount-error"
              >
                {amountError}
              </Text>
            )}
          </View>

          {/* Date Range Pickers */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>
              {t('filters.startDate')} / {t('filters.endDate')}
            </Text>
            <View style={styles.rangeRow}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.background.secondary,
                    borderColor: dateError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                onPress={() => setShowStartDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('filters.startDate')}
                testID="filter-start-date-button"
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    {
                      color: filters.startDate ? colors.text.primary : colors.text.tertiary,
                    },
                  ]}
                >
                  {filters.startDate
                    ? formatDateForDisplay(filters.startDate, locale)
                    : t('filters.startDatePlaceholder')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.background.secondary,
                    borderColor: dateError ? colors.semantic.danger.base : colors.border.default,
                  },
                ]}
                onPress={() => setShowEndDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('filters.endDate')}
                testID="filter-end-date-button"
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    {
                      color: filters.endDate ? colors.text.primary : colors.text.tertiary,
                    },
                  ]}
                >
                  {filters.endDate
                    ? formatDateForDisplay(filters.endDate, locale)
                    : t('filters.endDatePlaceholder')}
                </Text>
              </TouchableOpacity>
            </View>
            {dateError && (
              <Text
                style={[styles.errorText, { color: colors.semantic.danger.base }]}
                accessibilityRole="alert"
                testID="filter-date-error"
              >
                {dateError}
              </Text>
            )}
          </View>

          {/* Pending Only Toggle */}
          <View style={styles.pendingOnlyRow} testID="filter-pending-only-section">
            <Text style={[styles.pendingOnlyLabel, { color: colors.text.primary }]}>
              {t('filters.pendingOnly')}
            </Text>
            <Switch
              value={filters.pendingOnly}
              onValueChange={handlePendingOnlyToggle}
              trackColor={{ false: colors.border.default, true: colors.interactive.primary }}
              thumbColor={colors.background.primary}
              accessibilityRole="switch"
              accessibilityLabel={t('filters.pendingOnly')}
              accessibilityState={{ checked: filters.pendingOnly }}
              testID="filter-pending-only-toggle"
            />
          </View>

          {/* Date Pickers (native) */}
          {showStartDatePicker && (
            <DateTimePicker
              value={filters.startDate ? new Date(filters.startDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
              locale={locale}
              testID="filter-start-date-picker"
            />
          )}
          {showEndDatePicker && (
            <DateTimePicker
              value={filters.endDate ? new Date(filters.endDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              locale={locale}
              testID="filter-end-date-picker"
            />
          )}

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.semantic.danger.base }]}
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel={t('filters.clearFilters')}
              testID="filter-clear-all"
            >
              <Text style={[styles.clearButtonText, { color: colors.semantic.danger.base }]}>
                {t('filters.clearFilters')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  toggleText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: typography.overline.fontSize,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 12,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
  dateButton: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dateButtonText: {
    fontSize: typography.body.fontSize,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs,
  },
  clearButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  pendingOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  pendingOnlyLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

/**
 * Memoized FilterPanel for performance optimization
 */
export const FilterPanel = memo(FilterPanelComponent);

export default FilterPanel;
