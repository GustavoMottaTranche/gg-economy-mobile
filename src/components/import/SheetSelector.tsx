/**
 * SheetSelector Component
 *
 * Displays a sheet selection dialog for Excel files with multiple worksheets.
 * Shows a preview of each sheet and implements auto-selection timeout.
 * Remembers and suggests previously used worksheets for similar files.
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 11.2, 11.3**
 */

import React, { memo, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SheetInfo } from '../../services/import/types';
import { useImportPreferences } from '../../hooks/useImportPreferences';

/**
 * Default timeout in seconds for auto-selection
 */
export const DEFAULT_SHEET_SELECTION_TIMEOUT = 5;

/**
 * Extracts a file pattern from a filename for matching similar files.
 * Removes numeric sequences (like dates, IDs) to create a generalizable pattern.
 *
 * Examples:
 * - "bank_statement_2024_01.xlsx" -> "bank_statement.xlsx"
 * - "extrato_123456.xlsx" -> "extrato.xlsx"
 * - "transactions-2024-01-15.xlsx" -> "transactions.xlsx"
 *
 * **Validates: Requirements 11.2, 11.3**
 *
 * @param fileName - The original file name
 * @returns A normalized pattern for matching similar files
 */
export function extractFilePattern(fileName: string): string {
  if (!fileName) return '';

  // Get the extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';
  const baseName = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  // Remove common numeric patterns:
  // - Dates: 2024-01-15, 2024_01_15, 20240115
  // - IDs: _123456, -123456
  // - Sequences: _001, -001
  let pattern = baseName
    // Remove date patterns like 2024-01-15, 2024_01_15, 2024/01/15
    .replace(/[_\-\/]?\d{4}[_\-\/]\d{2}[_\-\/]\d{2}/g, '')
    // Remove date patterns like 20240115
    .replace(/[_\-]?\d{8}/g, '')
    // Remove year-month patterns like 2024-01, 2024_01
    .replace(/[_\-]?\d{4}[_\-]\d{2}/g, '')
    // Remove numeric IDs at the end like _123456 or -123456
    .replace(/[_\-]\d{3,}$/g, '')
    // Remove sequence numbers like _001, -001, _01
    .replace(/[_\-]\d{1,3}$/g, '')
    // Remove standalone numbers
    .replace(/[_\-]\d+[_\-]/g, '_')
    // Clean up multiple underscores/dashes
    .replace(/[_\-]+/g, '_')
    // Remove trailing underscores/dashes
    .replace(/[_\-]+$/g, '')
    // Remove leading underscores/dashes
    .replace(/^[_\-]+/g, '');

  // If pattern is empty after cleaning, use the original base name
  if (!pattern) {
    pattern = baseName;
  }

  return pattern + extension;
}

/**
 * Props for the SheetSelector component
 */
export interface SheetSelectorProps {
  /** Available sheets */
  sheets: SheetInfo[];
  /** Callback when sheet is selected */
  onSelect: (sheetName: string) => void;
  /** Callback when timeout expires (selects first) */
  onTimeout: () => void;
  /** Timeout in seconds (default: 5) */
  timeout?: number;
  /** File name for preference matching (optional, enables sheet preference persistence) */
  fileName?: string;
}

/**
 * Individual sheet item component
 */
const SheetItem = memo(function SheetItem({
  sheet,
  isSelected,
  isSuggested,
  onPress,
}: {
  sheet: SheetInfo;
  isSelected: boolean;
  isSuggested: boolean;
  onPress: (sheetName: string) => void;
}): JSX.Element {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    onPress(sheet.name);
  }, [sheet.name, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.sheetItem,
        isSelected && styles.sheetItemSelected,
        isSuggested && !isSelected && styles.sheetItemSuggested,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('import.sheetSelector.selectSheet', { name: sheet.name })}
      accessibilityState={{ selected: isSelected }}
      testID={`sheet-item-${sheet.name}`}
    >
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleContainer}>
          <Text style={styles.sheetIcon}>📊</Text>
          <Text
            style={[styles.sheetName, isSelected && styles.sheetNameSelected]}
            numberOfLines={1}
          >
            {sheet.name}
          </Text>
          {/* Suggested badge (Requirement 11.3) */}
          {isSuggested && (
            <View style={styles.suggestedBadge} testID={`suggested-badge-${sheet.name}`}>
              <Text style={styles.suggestedBadgeText}>{t('import.sheetSelector.suggested')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.sheetRowCount}>
          {t('import.sheetSelector.rowCount', { count: sheet.rowCount })}
        </Text>
      </View>

      {/* Preview of first rows (Requirement 9.3) */}
      {sheet.preview.length > 0 && (
        <View style={styles.previewContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewScroll}
          >
            <View style={styles.previewTable}>
              {sheet.preview.slice(0, 3).map((row, rowIndex) => (
                <View key={rowIndex} style={styles.previewRow}>
                  {row.slice(0, 5).map((cell, cellIndex) => (
                    <Text
                      key={cellIndex}
                      style={[styles.previewCell, rowIndex === 0 && styles.previewCellHeader]}
                      numberOfLines={1}
                    >
                      {cell || '-'}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIcon}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

/**
 * SheetSelector component
 *
 * Displays a list of available worksheets in an Excel file and allows
 * the user to select which one to import. Implements auto-selection
 * of the first sheet after a timeout period.
 *
 * Remembers the user's sheet selection for similar files and suggests
 * the previously used worksheet when importing files with matching patterns.
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 11.2, 11.3**
 *
 * @example
 * ```tsx
 * <SheetSelector
 *   sheets={[
 *     { name: 'Transactions', index: 0, rowCount: 150, preview: [...] },
 *     { name: 'Summary', index: 1, rowCount: 10, preview: [...] },
 *   ]}
 *   onSelect={(sheetName) => handleSheetSelect(sheetName)}
 *   onTimeout={() => handleTimeout()}
 *   timeout={5}
 *   fileName="bank_statement_2024_01.xlsx"
 * />
 * ```
 */
function SheetSelectorComponent({
  sheets,
  onSelect,
  onTimeout,
  timeout = DEFAULT_SHEET_SELECTION_TIMEOUT,
  fileName,
}: SheetSelectorProps): JSX.Element {
  const { t } = useTranslation();
  const { getSheetPreference, setSheetPreference } = useImportPreferences();

  // Extract file pattern for preference matching (Requirement 11.2, 11.3)
  const filePattern = useMemo(() => {
    return fileName ? extractFilePattern(fileName) : null;
  }, [fileName]);

  // Get suggested sheet from preferences (Requirement 11.3)
  const suggestedSheet = useMemo(() => {
    if (!filePattern) return null;
    const preferredSheetName = getSheetPreference(filePattern);
    // Only suggest if the sheet exists in the current file
    if (preferredSheetName && sheets.some((s) => s.name === preferredSheetName)) {
      return preferredSheetName;
    }
    return null;
  }, [filePattern, getSheetPreference, sheets]);

  const [selectedSheet, setSelectedSheet] = useState<string | null>(suggestedSheet);
  const [remainingTime, setRemainingTime] = useState(timeout);
  const [userInteracted, setUserInteracted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clears all timers
   */
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /**
   * Sets up the auto-selection timeout (Requirement 9.4)
   */
  useEffect(() => {
    if (userInteracted || sheets.length === 0) {
      return;
    }

    // Start countdown
    countdownRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set timeout for auto-selection
    timerRef.current = setTimeout(() => {
      clearTimers();
      onTimeout();
    }, timeout * 1000);

    return () => {
      clearTimers();
    };
  }, [timeout, userInteracted, sheets.length, onTimeout, clearTimers]);

  /**
   * Handles sheet selection
   */
  const handleSheetPress = useCallback(
    (sheetName: string) => {
      setUserInteracted(true);
      setSelectedSheet(sheetName);
      clearTimers();
    },
    [clearTimers]
  );

  /**
   * Handles confirm button press
   * Saves the sheet preference for future imports (Requirement 11.2)
   */
  const handleConfirm = useCallback(() => {
    if (selectedSheet) {
      // Save sheet preference for this file pattern (Requirement 11.2)
      if (filePattern) {
        setSheetPreference(filePattern, selectedSheet);
      }
      onSelect(selectedSheet);
    }
  }, [selectedSheet, onSelect, filePattern, setSheetPreference]);

  /**
   * Handles selecting first sheet (default action)
   * Saves the sheet preference for future imports (Requirement 11.2)
   */
  const handleSelectFirst = useCallback(() => {
    if (sheets.length > 0) {
      setUserInteracted(true);
      clearTimers();
      const firstSheetName = sheets[0].name;
      // Save sheet preference for this file pattern (Requirement 11.2)
      if (filePattern) {
        setSheetPreference(filePattern, firstSheetName);
      }
      onSelect(firstSheetName);
    }
  }, [sheets, onSelect, clearTimers, filePattern, setSheetPreference]);

  /**
   * Renders a sheet item
   */
  const renderSheetItem = useCallback(
    ({ item }: { item: SheetInfo }) => (
      <SheetItem
        sheet={item}
        isSelected={selectedSheet === item.name}
        isSuggested={suggestedSheet === item.name}
        onPress={handleSheetPress}
      />
    ),
    [selectedSheet, suggestedSheet, handleSheetPress]
  );

  const keyExtractor = useCallback((item: SheetInfo) => item.name, []);

  const hasSelection = selectedSheet !== null;
  const showCountdown = !userInteracted && remainingTime > 0;

  return (
    <View style={styles.container} testID="sheet-selector">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('import.sheetSelector.title')}</Text>
        <Text style={styles.subtitle}>
          {t('import.sheetSelector.subtitle', { count: sheets.length })}
        </Text>
      </View>

      {/* Countdown Timer (Requirement 9.4) */}
      {showCountdown && (
        <View style={styles.countdownContainer} testID="countdown-container">
          <Text style={styles.countdownText}>
            {t('import.sheetSelector.autoSelectIn', { seconds: remainingTime })}
          </Text>
          <View style={styles.countdownBar}>
            <View
              style={[styles.countdownBarFill, { width: `${(remainingTime / timeout) * 100}%` }]}
              testID="countdown-bar-fill"
            />
          </View>
        </View>
      )}

      {/* Sheet List (Requirement 9.1, 9.2) */}
      <FlatList
        data={sheets}
        renderItem={renderSheetItem}
        keyExtractor={keyExtractor}
        style={styles.sheetList}
        contentContainerStyle={styles.sheetListContent}
        showsVerticalScrollIndicator={false}
        testID="sheet-list"
      />

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {!hasSelection && (
          <TouchableOpacity
            style={styles.defaultButton}
            onPress={handleSelectFirst}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('import.sheetSelector.useFirst')}
            testID="use-first-button"
          >
            <Text style={styles.defaultButtonText}>{t('import.sheetSelector.useFirst')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, !hasSelection && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!hasSelection}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('import.sheetSelector.confirm')}
          accessibilityState={{ disabled: !hasSelection }}
          testID="confirm-sheet-button"
        >
          <Text
            style={[styles.confirmButtonText, !hasSelection && styles.confirmButtonTextDisabled]}
          >
            {hasSelection
              ? t('import.sheetSelector.importSheet', { name: selectedSheet })
              : t('import.sheetSelector.selectToImport')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Styles for SheetSelector
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  countdownContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fcd34d',
  },
  countdownText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  countdownBar: {
    height: 4,
    backgroundColor: '#fde68a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  countdownBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  sheetList: {
    flex: 1,
  },
  sheetListContent: {
    paddingVertical: 8,
  },
  sheetItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  sheetItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  sheetItemSuggested: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sheetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  sheetNameSelected: {
    color: '#1d4ed8',
  },
  suggestedBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#dcfce7',
    borderRadius: 10,
  },
  suggestedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
    textTransform: 'uppercase',
  },
  sheetRowCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewScroll: {
    maxHeight: 100,
  },
  previewTable: {
    padding: 8,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  previewCell: {
    width: 80,
    fontSize: 11,
    color: '#374151',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  previewCellHeader: {
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  defaultButton: {
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  defaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButtonTextDisabled: {
    color: '#9ca3af',
  },
});

/**
 * Memoized SheetSelector for performance optimization
 */
export const SheetSelector = memo(SheetSelectorComponent);

export default SheetSelector;
