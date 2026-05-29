/**
 * Review Screen Redirect
 *
 * The Review tab has been removed as part of the manual entry refactoring.
 * This file redirects any navigation to /review to the Manual Entry tab.
 *
 * Previously imported data is preserved in the database — only the
 * navigation route is removed.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
import { Redirect } from 'expo-router';

export default function ReviewRedirect() {
  return <Redirect href="/(tabs)/manual" />;
}
