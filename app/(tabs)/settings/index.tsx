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
 * **Validates: Requirements 27, 30**
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
  return (
    <Link href={href as any} asChild>
      <TouchableOpacity
        style={styles.settingsItem}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={description}
        testID={testID}
      >
        <Text style={styles.settingsIcon}>{icon}</Text>
        <View style={styles.settingsContent}>
          <Text style={styles.settingsTitle}>{title}</Text>
          {description && <Text style={styles.settingsDescription}>{description}</Text>}
        </View>
        <View style={styles.rightContent}>
          {currentValue && <Text style={styles.currentValue}>{currentValue}</Text>}
          <Text style={styles.chevron}>›</Text>
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
  return (
    <View
      style={styles.infoItem}
      accessibilityRole="text"
      accessibilityLabel={`${title}: ${description}`}
      testID={testID}
    >
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {description && <Text style={styles.settingsDescription}>{description}</Text>}
      </View>
    </View>
  );
}

/**
 * Section header component
 */
function SectionHeader({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  return (
    <View style={styles.versionContainer} testID="version-container">
      <Text style={styles.versionLabel}>{versionLabel}</Text>
      <Text style={styles.versionText} testID="app-version">
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
    <View style={styles.container} testID="settings-screen">
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
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionFooter: {
    height: 24,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingsIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  settingsDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 15,
    color: '#8E8E93',
    marginRight: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  versionLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
