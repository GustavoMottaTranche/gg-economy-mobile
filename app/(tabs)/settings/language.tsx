/**
 * Language Settings Screen
 *
 * Language selection for the app:
 * - Portuguese (pt-BR)
 * - English (en)
 *
 * **Validates: Requirements 25, 27, 30, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
 */
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  SUPPORTED_LOCALES,
  LOCALE_DISPLAY_NAMES,
  getCurrentLocale,
  changeLanguage,
  SupportedLocale,
} from '../../../src/i18n';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../../src/constants/theme';

interface LanguageItemProps {
  locale: SupportedLocale;
  displayName: string;
  isSelected: boolean;
  onSelect: () => void;
}

function LanguageItem({ locale, displayName, isSelected, onSelect }: LanguageItemProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.languageItem,
        {
          backgroundColor: colors.surface.card,
          borderBottomColor: colors.border.subtle,
        },
      ]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={displayName}
    >
      <View style={styles.languageInfo}>
        <Text style={[styles.languageName, { color: colors.text.primary }]}>{displayName}</Text>
        <Text style={[styles.languageCode, { color: colors.text.tertiary }]}>{locale}</Text>
      </View>
      {isSelected && (
        <Text style={[styles.checkmark, { color: colors.interactive.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );
}

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentLocale = getCurrentLocale();

  const handleLanguageChange = async (locale: SupportedLocale) => {
    if (locale !== currentLocale) {
      try {
        await changeLanguage(locale);
      } catch (error) {
        console.error('[LanguageSettings] Failed to change language:', error);
      }
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
          {t('settings.languageDescription')}
        </Text>
        <View
          style={[
            styles.sectionContent,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.default,
            },
          ]}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <LanguageItem
              key={locale}
              locale={locale}
              displayName={LOCALE_DISPLAY_NAMES[locale]}
              isSelected={locale === currentLocale}
              onSelect={() => handleLanguageChange(locale)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionDescription: {
    fontSize: typography.caption.fontSize,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.base,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  languageCode: {
    fontSize: typography.caption.fontSize,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
});
