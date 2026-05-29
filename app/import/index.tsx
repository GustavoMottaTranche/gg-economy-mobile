/**
 * Import Index Redirect
 *
 * The import screen has been removed as part of the manual entry refactoring.
 * Redirects to the Manual Entry tab.
 *
 * **Validates: Requirements 1.3**
 */
import { Redirect } from 'expo-router';

export default function ImportIndexRedirect() {
  return <Redirect href="/(tabs)/manual" />;
}
