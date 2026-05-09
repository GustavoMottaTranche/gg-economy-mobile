/**
 * TrendChart Component
 *
 * Displays income vs expenses trends over time using a bar chart,
 * with a period selector for 3, 6, or 12 months view.
 *
 * **Validates: Requirements 22, 30**
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BarChart, type BarChartDataPoint } from '../charts/BarChart';
import { getMonthName, getCurrentLocale } from '../../i18n';
import type { TrendDataPoint, TrendPeriod } from '../../hooks/useDashboardData';

/**
 * Props for the TrendChart component
 */
export interface TrendChartProps {
  /** Trend data points */
  data: TrendDataPoint[];
  /** Currently selected period */
  selectedPeriod: TrendPeriod;
  /** Callback when period is changed */
  onPeriodChange: (period: TrendPeriod) => void;
  /** Container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Available trend periods
 */
const TREND_PERIODS: TrendPeriod[] = [3, 6, 12];

/**
 * Formats a YYYY-MM string to a short month label
 */
function formatMonthLabel(monthStr: string, locale: 'pt-BR' | 'en'): string {
  const parts = monthStr.split('-').map(Number);
  const month = parts[1] ?? 1;
  return getMonthName(month - 1, locale, 'short');
}

/**
 * TrendChart component
 *
 * @example
 * ```tsx
 * <TrendChart
 *   data={trendData}
 *   selectedPeriod={3}
 *   onPeriodChange={(period) => setTrendPeriod(period)}
 * />
 * ```
 */
function TrendChartComponent({
  data,
  selectedPeriod,
  onPeriodChange,
  style,
  testID,
}: TrendChartProps): React.ReactElement {
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  // Transform data for the BarChart
  const chartData = useMemo<BarChartDataPoint[]>(() => {
    return data.map((item) => ({
      label: formatMonthLabel(item.month, locale),
      income: item.income,
      expense: item.expenses,
    }));
  }, [data, locale]);

  // Get period label
  const getPeriodLabel = useCallback(
    (period: TrendPeriod): string => {
      switch (period) {
        case 3:
          return t('dashboard.last3Months');
        case 6:
          return t('dashboard.last6Months');
        case 12:
          return t('dashboard.last12Months');
        default:
          return '';
      }
    },
    [t]
  );

  // Empty state
  if (data.length === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.trend')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('dashboard.noData')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header with title and period selector */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.trend')}</Text>
        <View style={styles.periodSelector}>
          {TREND_PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => onPeriodChange(period)}
              accessibilityRole="button"
              accessibilityLabel={getPeriodLabel(period)}
              accessibilityState={{ selected: selectedPeriod === period }}
              testID={`${testID}-period-${period}`}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bar Chart */}
      <BarChart
        data={chartData}
        height={220}
        showValues={selectedPeriod <= 6}
        showGrid
        testID={`${testID}-chart`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#1F2937',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

/**
 * Memoized TrendChart for performance optimization
 */
export const TrendChart = memo(TrendChartComponent);

export default TrendChart;
