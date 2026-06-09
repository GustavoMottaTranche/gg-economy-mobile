/**
 * Tab Layout for GG-Economy Mobile
 *
 * Configures the bottom tab navigation with 5 main sections:
 * - Dashboard (index) - Financial overview
 * - Transactions - View transactions by month
 * - Manual - Manual entry (with installment/batch modes)
 * - Future Plans - Savings and fund allocation
 * - Settings - App settings
 *
 * Uses theme tokens for all colors, SVG icons via TabBarIcon component,
 * and supports light/dark mode with proper accessibility labels.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useThemeStore } from '../../src/stores/themeStore';
import { TabBarIcon } from '../../src/components/ui/TabBarIcon';
import { typography } from '../../src/constants/theme';

/**
 * Tab layout component with theme-aware styling and SVG icons.
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const isDark = resolvedScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.interactive.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: StyleSheet.flatten([
          styles.tabBar,
          {
            backgroundColor: colors.background.secondary,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border.default,
            borderTopWidth: isDark ? 0.5 : 1,
            paddingBottom: insets.bottom,
          },
        ]),
        tabBarLabelStyle: StyleSheet.flatten([styles.tabBarLabel, { color: colors.text.tertiary }]),
        tabBarItemStyle: styles.tabBarItem,
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTitleStyle: StyleSheet.flatten([styles.headerTitle, { color: colors.text.primary }]),
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="dashboard" focused={focused} color={color} size={24} />
          ),
          tabBarAccessibilityLabel: t('navigation.dashboard'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('navigation.transactions'),
          tabBarLabel: t('navigation.transactions'),
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="transactions" focused={focused} color={color} size={24} />
          ),
          tabBarAccessibilityLabel: t('navigation.transactions'),
        }}
      />
      <Tabs.Screen
        name="manual"
        options={{
          title: t('navigation.manual'),
          tabBarLabel: t('navigation.manual'),
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="manual" focused={focused} color={color} size={24} />
          ),
          tabBarAccessibilityLabel: t('navigation.manual'),
        }}
      />
      <Tabs.Screen
        name="future-plans"
        options={{
          title: t('futurePlans.screenTitle'),
          tabBarLabel: t('futurePlans.tab'),
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="plans" focused={focused} color={color} size={24} />
          ),
          tabBarAccessibilityLabel: t('futurePlans.tab'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="settings" focused={focused} color={color} size={24} />
          ),
          headerShown: false, // Settings has its own stack navigation
          tabBarAccessibilityLabel: t('navigation.settings'),
        }}
      />
      {/* Hidden route: review tab redirects to manual entry */}
      <Tabs.Screen
        name="review"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 49,
    paddingTop: 4,
  },
  tabBarLabel: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
  },
  tabBarItem: {
    minHeight: 44,
    minWidth: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});
