/**
 * Import Layout Redirect
 *
 * The import flow has been removed as part of the manual entry refactoring.
 * This layout redirects any navigation to /import/* routes to the Manual Entry tab.
 *
 * Previously imported data is preserved in the database — only the
 * navigation routes are removed.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
import { Redirect } from 'expo-router';

export default function ImportLayoutRedirect() {
  return <Redirect href="/(tabs)/manual" />;
}
