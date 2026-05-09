/**
 * Tab Layout for GG-Economy Mobile
 *
 * Configures the bottom tab navigation with 5 main sections:
 * - Dashboard (index) - Financial overview
 * - Transactions - View transactions by month
 * - Review - Review imported transactions (with badge)
 * - Manual - Manual entry
 * - Settings - App settings
 *
 * **Validates: Requirements 28, 30**
 */
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { useReviewCount } from '../../src/hooks/useReviewCount';

/**
 * Tab bar icon component
 */
function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>{icon}</Text>;
}

/**
 * Badge component for review tab
 */
function ReviewBadge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={styles.badge} accessibilityLabel={`${count} pending reviews`}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

/**
 * Tab layout component
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const reviewCount = useReviewCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.dashboard'),
          tabBarLabel: t('navigation.dashboard'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📊" focused={focused} />,
          tabBarAccessibilityLabel: t('navigation.dashboard'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('navigation.transactions'),
          tabBarLabel: t('navigation.transactions'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="💳" focused={focused} />,
          tabBarAccessibilityLabel: t('navigation.transactions'),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: t('navigation.review'),
          tabBarLabel: t('navigation.review'),
          tabBarIcon: ({ focused }) => (
            <View>
              <TabBarIcon icon="✅" focused={focused} />
              <ReviewBadge count={reviewCount} />
            </View>
          ),
          tabBarAccessibilityLabel: `${t('navigation.review')}${reviewCount > 0 ? `, ${reviewCount} pending` : ''}`,
        }}
      />
      <Tabs.Screen
        name="manual"
        options={{
          title: t('navigation.manual'),
          tabBarLabel: t('navigation.manual'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="✏️" focused={focused} />,
          tabBarAccessibilityLabel: t('navigation.manual'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ focused }) => <TabBarIcon icon="⚙️" focused={focused} />,
          headerShown: false, // Settings has its own stack navigation
          tabBarAccessibilityLabel: t('navigation.settings'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    height: Platform.OS === 'ios' ? 84 : 60,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
