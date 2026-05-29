/**
 * AmountDisplay Component
 *
 * Displays a monetary amount with locale-aware formatting.
 * Supports positive/negative styling and currency symbol display.
 * Provides accessibility support.
 *
 * **Validates: Requirements 30**
 */

import React, { memo, useMemo } from 'react';
import { Text, StyleSheet, TextStyle, ViewStyle, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  formatCurrencyLocale,
  getCurrentLocale,
  getCurrencySymbol,
  type CurrencyFormatOptions,
} from '../../i18n';

/**
 * Size variants for the amount display
 */
export type AmountSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Color variants for the amount display
 */
export type AmountColorVariant = 'auto' | 'positive' | 'negative' | 'neutral';

/**
 * Props for the AmountDisplay component
 */
export interface AmountDisplayProps {
  /** Amount in cents (positive for income, negative for expense) */
  amount: number;
  /** Whether the amount is in cents (default: true) */
  inCents?: boolean;
  /** Size variant */
  size?: AmountSize;
  /** Color variant - 'auto' determines color based on amount sign */
  colorVariant?: AmountColorVariant;
  /** Whether to show the sign (+/-) */
  showSign?: boolean;
  /** Whether to show the currency symbol */
  showCurrency?: boolean;
  /** Currency code override */
  currency?: string;
  /** Whether to show strikethrough (for excluded amounts) */
  strikethrough?: boolean;
  /** Custom text style */
  style?: TextStyle;
  /** Custom container style */
  containerStyle?: ViewStyle;
  /** Number of lines (default: 1) */
  numberOfLines?: number;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Font sizes for different size variants
 */
const FONT_SIZES: Record<AmountSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
  xlarge: 28,
};

/**
 * Font weights for different size variants
 */
const FONT_WEIGHTS: Record<AmountSize, TextStyle['fontWeight']> = {
  small: '500',
  medium: '600',
  large: '600',
  xlarge: '700',
};

/**
 * AmountDisplay component
 *
 * @example
 * ```tsx
 * // Basic usage (amount in cents)
 * <AmountDisplay amount={-15000} />
 *
 * // Large positive amount with sign
 * <AmountDisplay
 *   amount={250000}
 *   size="large"
 *   showSign
 *   colorVariant="auto"
 * />
 *
 * // Neutral color, no currency symbol
 * <AmountDisplay
 *   amount={-5000}
 *   colorVariant="neutral"
 *   showCurrency={false}
 * />
 *
 * // Strikethrough for excluded amounts
 * <AmountDisplay
 *   amount={-10000}
 *   strikethrough
 * />
 * ```
 */
function AmountDisplayComponent({
  amount,
  inCents = true,
  size = 'medium',
  colorVariant = 'auto',
  showSign = false,
  showCurrency = true,
  currency,
  strikethrough = false,
  style,
  containerStyle,
  numberOfLines = 1,
  testID,
}: AmountDisplayProps): React.JSX.Element {
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const themeColors = useThemeColors();

  // Convert from cents if needed
  const displayAmount = inCents ? amount / 100 : amount;

  // Determine the color based on variant
  const textColor = useMemo(() => {
    switch (colorVariant) {
      case 'positive':
        return themeColors.semantic.success.dark;
      case 'negative':
        return themeColors.semantic.danger.dark;
      case 'neutral':
        return themeColors.text.primary;
      case 'auto':
      default:
        if (amount > 0) return themeColors.semantic.success.dark;
        if (amount < 0) return themeColors.semantic.danger.dark;
        return themeColors.text.primary;
    }
  }, [colorVariant, amount, themeColors]);

  // Format the amount
  const formattedAmount = useMemo(() => {
    const options: CurrencyFormatOptions = {
      showPositiveSign: showSign && amount > 0,
    };

    if (currency) {
      options.currency = currency;
    }

    if (!showCurrency) {
      // Format as number without currency
      const absAmount = Math.abs(displayAmount);
      const formatted = new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absAmount);

      const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
      return `${sign}${formatted}`;
    }

    return formatCurrencyLocale(displayAmount, locale, options);
  }, [displayAmount, locale, showSign, showCurrency, currency, amount]);

  // Build accessibility label
  const accessibilityLabel = useMemo(() => {
    const currencySymbol = getCurrencySymbol(locale);
    const absAmount = Math.abs(displayAmount).toFixed(2);
    const type = amount > 0 ? t('dashboard.income') : amount < 0 ? t('dashboard.expenses') : '';

    return `${type} ${currencySymbol} ${absAmount}`.trim();
  }, [displayAmount, amount, locale, t]);

  // Combine styles
  const textStyles: TextStyle[] = [
    styles.text,
    {
      fontSize: FONT_SIZES[size],
      fontWeight: FONT_WEIGHTS[size],
      color: textColor,
    },
    strikethrough && styles.strikethrough,
    style,
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={containerStyle} testID={testID}>
      <Text
        style={textStyles}
        numberOfLines={numberOfLines}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        testID={testID ? `${testID}-text` : undefined}
      >
        {formattedAmount}
      </Text>
    </View>
  );
}

/**
 * Styles for AmountDisplay
 */
const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});

/**
 * Memoized AmountDisplay for performance optimization
 */
export const AmountDisplay = memo(AmountDisplayComponent);

/**
 * Convenience component for displaying income amounts
 */
export const IncomeAmount = memo(function IncomeAmount(
  props: Omit<AmountDisplayProps, 'colorVariant'>
): React.JSX.Element {
  return <AmountDisplay {...props} colorVariant="positive" />;
});

/**
 * Convenience component for displaying expense amounts
 */
export const ExpenseAmount = memo(function ExpenseAmount(
  props: Omit<AmountDisplayProps, 'colorVariant'>
): React.JSX.Element {
  return <AmountDisplay {...props} colorVariant="negative" />;
});

/**
 * Convenience component for displaying balance amounts
 */
export const BalanceAmount = memo(function BalanceAmount(
  props: Omit<AmountDisplayProps, 'colorVariant' | 'showSign'>
): React.JSX.Element {
  return <AmountDisplay {...props} colorVariant="auto" showSign />;
});

export default AmountDisplay;
