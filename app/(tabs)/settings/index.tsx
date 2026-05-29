/**
 * Settings Main Screen
 *
 * Main settings screen with SectionList navigation to sub-settings:
 * - Language selection section with current language display
 * - Backup configuration
 * - Category management
 * - Categorization rules
 * - Data storage info
 * - App version info (from expo-constants)
 *
 * Uses SectionList for organizing settings into logical sections.
 * Navigation to sub-settings uses Expo Router Link.
 *
 * **Validates: Requirements 27, 30, 5.5, 6.1, 10.1, 10.2, 10.3, 10.4**
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';
import Constants from 'expo-constants';

import { getCurrentLocale, LOCALE_DISPLAY_NAMES, SupportedLocale } from '../../../src/i18n';
import { useNotificationSettings } from '../../../src/stores/notificationStore';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { spacing, typography } from '../../../src/constants/theme';

/**
 * Types for settings items
 */
type SettingsItemType = 'navigation' | 'info' | 'language' | 'notification';

interface BaseSettingsItem {
  id: string;
  icon: string;
  title: string;
  description?: string;
  type: SettingsItemType;
}

interface NavigationSettingsItem extends BaseSettingsItem {
  type: 'navigation';
  href: string;
}

interface InfoSettingsItem extends BaseSettingsItem {
  type: 'info';
}

interface LanguageSettingsItem extends BaseSettingsItem {
  type: 'language';
  href: string;
  currentValue: string;
}

interface NotificationSettingsItem extends BaseSettingsItem {
  type: 'notification';
  href: string;
  currentValue: string;
}

type SettingsItem =
  | NavigationSettingsItem
  | InfoSettingsItem
  | LanguageSettingsItem
  | NotificationSettingsItem;

interface SettingsSection {
  title?: string;
  data: SettingsItem[];
}

/**
 * Props for SettingsNavigationItem component
 */
interface SettingsNavigationItemProps {
  icon: string;
  title: string;
  description?: string;
  href: string;
  currentValue?: string;
  testID?: string;
}

/**
 * Navigation item that links to a sub-settings screen
 */
function SettingsNavigationItem({
  icon,
  title,
  description,
  href,
  currentValue,
  testID,
}: SettingsNavigationItemProps) {
  const colors = useThemeColors();

  return (
    <Link href={href as any} asChild>
      <TouchableOpacity
        style={StyleSheet.flatten([
          styles.settingsItem,
          {
            backgroundColor: colors.surface.card,
            borderBottomColor: colors.border.subtle,
          },
        ])}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={description}
        testID={testID}
      >
        <Text style={styles.settingsIcon}>{icon}</Text>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsTitle, { color: colors.text.primary }]}>{title}</Text>
          {description && (
            <Text style={[styles.settingsDescription, { color: colors.text.tertiary }]}>
              {description}
            </Text>
          )}
        </View>
        <View style={styles.rightContent}>
          {currentValue && (
            <Text style={[styles.currentValue, { color: colors.text.tertiary }]}>
              {currentValue}
            </Text>
          )}
          <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

/**
 * Props for SettingsInfoItem component
 */
interface SettingsInfoItemProps {
  icon: string;
  title: string;
  description?: string;
  testID?: string;
}

/**
 * Info item that displays information without navigation
 */
function SettingsInfoItem({ icon, title, description, testID }: SettingsInfoItemProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.infoItem, { backgroundColor: colors.surface.card }]}
      accessibilityRole="text"
      accessibilityLabel={`${title}: ${description}`}
      testID={testID}
    >
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsTitle, { color: colors.text.primary }]}>{title}</Text>
        {description && (
          <Text style={[styles.settingsDescription, { color: colors.text.tertiary }]}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Section header component
 */
function SectionHeader({ title }: { title?: string }) {
  const colors = useThemeColors();

  if (!title) return null;
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background.secondary }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
    </View>
  );
}

/**
 * Section footer component (separator)
 */
function SectionFooter() {
  return <View style={styles.sectionFooter} />;
}

/**
 * App version footer component
 */
function VersionFooter({ versionLabel, version }: { versionLabel: string; version: string }) {
  const colors = useThemeColors();

  return (
    <View style={styles.versionContainer} testID="version-container">
      <Text style={[styles.versionLabel, { color: colors.text.tertiary }]}>{versionLabel}</Text>
      <Text style={[styles.versionText, { color: colors.text.tertiary }]} testID="app-version">
        {version}
      </Text>
    </View>
  );
}

/**
 * Main Settings Screen Component
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentLocale = getCurrentLocale();
  const currentLanguageName =
    LOCALE_DISPLAY_NAMES[currentLocale as SupportedLocale] || currentLocale;
  const { isEnabled: notificationsEnabled } = useNotificationSettings();

  // Get app version from expo-constants
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '';

  // Build sections data for SectionList
  const sections: SettingsSection[] = useMemo(
    () => [
      {
        title: t('settings.preferences', 'Preferences'),
        data: [
          {
            id: 'language',
            icon: '🌐',
            title: t('settings.language'),
            description: t('settings.languageDescription'),
            type: 'language' as const,
            href: '/(tabs)/settings/language',
            currentValue: currentLanguageName,
          },
          {
            id: 'notifications',
            icon: '🔔',
            title: t('settings.notifications'),
            description: t('settings.notificationsDescription'),
            type: 'notification' as const,
            href: '/(tabs)/settings/notifications',
            currentValue: notificationsEnabled
              ? t('notifications.enabled')
              : t('notifications.disabled'),
          },
          {
            id: 'backup',
            icon: '☁️',
            title: t('settings.backup'),
            description: t('settings.backupDescription'),
            type: 'navigation' as const,
            href: '/(tabs)/settings/backup',
          },
        ],
      },
      {
        title: t('settings.dataManagement', 'Data Management'),
        data: [
          {
            id: 'categories',
            icon: '🏷️',
            title: t('settings.categories'),
            description: t('settings.categoriesDescription'),
            type: 'navigation' as const,
            href: '/(tabs)/settings/categories',
          },
          {
            id: 'rules',
            icon: '📋',
            title: t('settings.rules'),
            description: t('settings.rulesDescription'),
            type: 'navigation' as const,
            href: '/(tabs)/settings/rules',
          },
        ],
      },
      {
        title: t('settings.about', 'About'),
        data: [
          {
            id: 'dataStorage',
            icon: '🔒',
            title: t('settings.dataStorage'),
            description: t('settings.dataStorageDescription'),
            type: 'info' as const,
          },
        ],
      },
    ],
    [t, currentLanguageName, notificationsEnabled]
  );

  // Render individual settings item based on type
  const renderItem = useCallback(
    ({ item, index, section }: SectionListRenderItemInfo<SettingsItem, SettingsSection>) => {
      const isLastItem = index === section.data.length - 1;
      const itemStyle = isLastItem ? styles.lastItem : undefined;

      switch (item.type) {
        case 'navigation':
          return (
            <View style={itemStyle}>
              <SettingsNavigationItem
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
                testID={`settings-item-${item.id}`}
              />
            </View>
          );
        case 'language':
          return (
            <View style={itemStyle}>
              <SettingsNavigationItem
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
                currentValue={item.currentValue}
                testID={`settings-item-${item.id}`}
              />
            </View>
          );
        case 'notification':
          return (
            <View style={itemStyle}>
              <SettingsNavigationItem
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
                currentValue={item.currentValue}
                testID={`settings-item-${item.id}`}
              />
            </View>
          );
        case 'info':
          return (
            <View style={itemStyle}>
              <SettingsInfoItem
                icon={item.icon}
                title={item.title}
                description={item.description}
                testID={`settings-item-${item.id}`}
              />
            </View>
          );
        default:
          return null;
      }
    },
    []
  );

  // Render section header
  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<SettingsItem, SettingsSection> }) => (
      <SectionHeader title={section.title} />
    ),
    []
  );

  // Render section footer
  const renderSectionFooter = useCallback(() => <SectionFooter />, []);

  // Render list footer with version info
  const renderListFooter = useCallback(
    () => (
      <VersionFooter
        versionLabel={t('settings.version')}
        version={buildNumber ? `${appVersion} (${buildNumber})` : appVersion}
      />
    ),
    [t, appVersion, buildNumber]
  );

  // Key extractor for SectionList
  const keyExtractor = useCallback((item: SettingsItem) => item.id, []);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      testID="settings-screen"
    >
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        ListFooterComponent={renderListFooter}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        testID="settings-section-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'] + spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionFooter: {
    height: spacing.xl,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingsIcon: {
    fontSize: spacing.xl,
    marginRight: spacing.md,
    width: spacing['2xl'],
    textAlign: 'center',
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsDescription: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: typography.caption.fontSize + 2,
    marginRight: spacing.sm,
  },
  chevron: {
    fontSize: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  versionLabel: {
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.xs,
  },
  versionText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
});
