import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface TabBarIconProps {
  name: 'dashboard' | 'transactions' | 'manual' | 'plans' | 'settings';
  focused: boolean;
  color: string;
  size?: number;
}

/**
 * SVG path data for filled (focused) icon variants.
 * Designed for a 24x24 viewBox, Material Design style.
 */
const FILLED_PATHS: Record<TabBarIconProps['name'], string> = {
  dashboard: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  transactions: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z',
  manual:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  plans: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
};

/**
 * SVG path data for outline (unfocused) icon variants.
 * Designed for a 24x24 viewBox, Material Design style.
 */
const OUTLINE_PATHS: Record<TabBarIconProps['name'], string> = {
  dashboard: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5zm2-14.5l6 5.4V18h-3v-6H9v6H6v-7.1l6-5.4z',
  transactions: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z',
  manual:
    'M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  plans: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6zM19 14h-5.6l-.4-2H7V6h5.6l.4 2H19v6z',
  settings:
    'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0014 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
};

/**
 * Tab bar icon component using react-native-svg.
 * Renders filled variant when focused, outline variant when unfocused.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */
export function TabBarIcon({ name, focused, color, size = 24 }: TabBarIconProps) {
  const iconPath = focused ? FILLED_PATHS[name] : OUTLINE_PATHS[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={iconPath} fill={color} />
    </Svg>
  );
}
