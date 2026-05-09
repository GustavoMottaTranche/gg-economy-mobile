/**
 * Import Layout
 *
 * Stack navigation for the import flow modal:
 * - index: File selection screen
 * - progress: Import progress screen
 *
 * **Validates: Requirements 11, 12, 30**
 */
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ImportLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#000000',
        },
        headerShadowVisible: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('fileImport.title'),
          headerLeft: () => null, // Modal has close button on right
        }}
      />
      <Stack.Screen
        name="progress"
        options={{
          title: t('fileImport.importing'),
          headerBackTitle: t('common.back'),
        }}
      />
    </Stack>
  );
}
