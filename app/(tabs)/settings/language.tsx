/**
 * Language Settings Screen
 *
 * Language selection for the app:
 * - Portuguese (pt-BR)
 * - English (en)
 *
 * **Validates: Requirements 25, 27, 30**
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

interface LanguageItemProps {
  locale: SupportedLocale;
  displayName: string;
  isSelected: boolean;
  onSelect: () => void;
}

function LanguageItem({ locale, displayName, isSelected, onSelect }: LanguageItemProps) {
  return (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={displayName}
    >
      <View style={styles.languageInfo}>
        <Text style={styles.languageName}>{displayName}</Text>
        <Text style={styles.languageCode}>{locale}</Text>
      </View>
      {isSelected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionDescription}>{t('settings.languageDescription')}</Text>
        <View style={styles.sectionContent}>
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
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6D6D72',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  languageCode: {
    fontSize: 13,
    color: '#8E8E93',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
});
