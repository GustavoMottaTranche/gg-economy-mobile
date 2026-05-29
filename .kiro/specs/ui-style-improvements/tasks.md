# Implementation Plan: UI Style Improvements

## Overview

Modernizar o sistema visual do GG-Economy Mobile substituindo estilos inline e cores hardcoded por um sistema de design centralizado com suporte a dark mode, tipografia hierárquica, espaçamentos consistentes e componentes refinados. A implementação segue uma abordagem bottom-up: tokens → store → hooks → componentes → telas.

## Tasks

- [x] 1. Theme foundation — tokens, types, and color palette
  - [x] 1.1 Create theme type definitions and color palette
    - Expand `src/constants/theme.ts` with TypeScript interfaces: `ModeColors`, `ThemeColors`, `ColorVariant`, `PrimaryScale`, `SemanticColors`, `NeutralScale`
    - Implement `lightColors` and `darkColors` objects with all semantic colors (primary, secondary, success, danger, warning, info, neutral) and surface/background/text/border/interactive groups
    - Export the `colors` object as `{ light: lightColors, dark: darkColors }` typed as `ThemeColors`
    - Preserve existing `TRANSACTION_COLORS` export for backward compatibility
    - _Requirements: 1.1, 1.6, 3.1, 3.2, 3.3, 10.7_

  - [x] 1.2 Create typography, spacing, shadows, and borderRadius tokens
    - Add `TypographyScale` interface and `typography` constant with 6 levels (display, heading, title, body, caption, overline) to `src/constants/theme.ts`
    - Add `SpacingScale` interface and `spacing` constant (xs:4, sm:8, md:12, base:16, lg:20, xl:24, 2xl:32, 3xl:48)
    - Add `ShadowSystem` interface and `shadows` constant with light/dark variants for sm, md, lg levels
    - Add `borderRadius` constant (sm:8, md:12, lg:16, xl:24)
    - Export unified `theme` object containing all tokens
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.3 Write property tests for theme tokens (Properties 1, 6, 7, 8)
    - **Property 1: Color palette completeness** — For any semantic color, variant, and mode, verify valid hex string
    - **Property 6: Primary color progressive luminosity** — Verify monotonic luminance decrease across primary scale
    - **Property 7: Typography scale validity** — Verify fontSize range, fontWeight values, lineHeight ratio, and adjacent level differences
    - **Property 8: Spacing scale multiples** — Verify all spacing values are positive multiples of 4
    - Create test file at `src/constants/__tests__/theme.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.1**

- [x] 2. Theme store and hooks
  - [x] 2.1 Create theme store with Zustand
    - Create `src/stores/themeStore.ts` with `ThemeState` interface (preference, resolvedScheme, setPreference)
    - Implement Appearance API listener for system theme changes
    - Default to 'system' preference and resolve based on `Appearance.getColorScheme()`
    - Handle `null` return from Appearance API by defaulting to 'light'
    - _Requirements: 2.1, 2.4, 2.6_

  - [x] 2.2 Create useThemeColors and useThemeStyles hooks
    - Create `src/hooks/useThemeColors.ts` that reads `resolvedScheme` from themeStore and returns the correct color palette
    - Create `src/hooks/useThemeStyles.ts` that combines colors, typography, spacing, shadows, and borderRadius into a unified style helper
    - Include shadow selection based on current mode (light shadows vs dark shadows)
    - _Requirements: 2.1, 2.3, 10.5_

  - [x] 2.3 Write property tests for dark mode behavior (Properties 2, 3, 4)
    - **Property 2: Dark mode color selection** — Verify useThemeColors returns correct palette for each resolved scheme
    - **Property 3: Dark mode luminance constraints** — Verify dark backgrounds luminance ≤ 0.05 and text luminance ≥ 0.8
    - **Property 4: Shadow opacity reduction** — Verify dark shadowOpacity ≤ 50% of light shadowOpacity for each level
    - Add tests to `src/constants/__tests__/theme.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 2.4 Write property test for WCAG contrast compliance (Property 5)
    - **Property 5: WCAG contrast compliance** — Verify text/background pairs have ≥ 4.5:1 ratio and interactive elements ≥ 3:1
    - Implement relative luminance and contrast ratio calculation helpers in test file
    - Add tests to `src/constants/__tests__/theme.test.ts`
    - **Validates: Requirements 2.5, 3.3**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Tab bar modernization with SVG icons
  - [x] 4.1 Create TabBarIcon component with SVG paths
    - Create `src/components/ui/TabBarIcon.tsx` using `react-native-svg`
    - Define SVG path data for 4 tabs: dashboard, transactions, manual, settings
    - Implement filled (focused) and outline (unfocused) variants for each icon
    - Accept props: `name`, `focused`, `color`, `size` (default 24)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Refactor tab layout to use theme and SVG icons
    - Update `app/(tabs)/_layout.tsx` to use `useThemeColors()` for all colors
    - Replace emoji `TabBarIcon` with the new SVG `TabBarIcon` component
    - Apply theme tokens for tab bar background, border, label styles
    - Apply dark mode styles: dark background (#1C1C1E), border rgba(255,255,255,0.15)
    - Ensure `tabBarAccessibilityLabel` is set on all tabs
    - Set minimum tab bar height 49px and touch target 44x44px
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.3 Write unit tests for TabBarIcon component
    - Test that correct SVG path is rendered for each tab name
    - Test filled variant when focused=true, outline when focused=false
    - Test color and size props are applied correctly
    - Create test at `src/components/ui/__tests__/TabBarIcon.test.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 5. Component library refactoring
  - [x] 5.1 Refactor SummaryCard to use theme tokens
    - Update `src/components/dashboard/SummaryCard.tsx` to use `useThemeColors()` and `useThemeStyles()`
    - Apply elevated shadow (lg level) and primary-tinted background (opacity 0.05-0.12)
    - Apply borderRadius lg (16px), padding lg-xl (20-24px)
    - Remove all hardcoded color values, fontSize, spacing, and borderRadius
    - _Requirements: 6.1, 6.2, 6.5, 8.1, 8.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.2 Refactor TransactionCard to use theme tokens
    - Update transaction card component to use semantic success/danger colors from theme
    - Apply income: success.light background + success.dark text; expense: danger.light background + danger.dark text
    - Apply borderRadius md (12px), appropriate spacing tokens
    - Implement press state with activeOpacity 0.7-0.85
    - Ensure at least 2 visual differentiators for income vs expense (color + border/icon)
    - Remove all hardcoded values
    - _Requirements: 3.4, 3.5, 6.1, 6.4, 8.2, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.3 Refactor form inputs to use theme tokens and visual states
    - Update input components in `src/components/` to use theme colors
    - Implement focus state: primary color border, border width 1px → 2px
    - Implement error state: danger color border, error text below with 4px spacing, max 120 chars
    - Implement disabled state: opacity 0.5, no touch interaction
    - Implement error correction: remove error styling when input is corrected
    - Remove all hardcoded values
    - _Requirements: 9.2, 9.3, 9.4, 9.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.4 Create/refactor pressable card wrapper with theme support
    - Create or update a reusable pressable card component that applies theme tokens
    - Implement press feedback: opacity reduction to 0.7 during touch
    - Apply light mode shadows (sm/md) and dark mode borders (1px, 10-15% opacity neutral)
    - Apply appropriate borderRadius from theme (md: 12px for list items, lg: 16px for main cards)
    - _Requirements: 6.2, 6.3, 6.4, 9.1, 9.5_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Screen-level migration
  - [x] 7.1 Migrate Dashboard screen to theme system
    - Update `app/(tabs)/index.tsx` to use `useThemeColors()` for background and text colors
    - Ensure SummaryCard has higher elevation than CategoryBreakdown and TrendChart
    - Apply screen horizontal margins of 16px (spacing.base)
    - Apply section gaps of 12-16px (spacing.md to spacing.base)
    - Configure status bar style based on theme mode
    - Remove all hardcoded color, fontSize, spacing, and borderRadius values
    - _Requirements: 5.4, 8.1, 8.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 7.2 Migrate Transactions screen to theme system
    - Update `app/(tabs)/transactions.tsx` to use theme hooks
    - Apply typographic hierarchy: title > value > category > date (each level ≥ 2px smaller)
    - Apply monetary values with fontWeight 600+ and fontSize ≥ 16px
    - Apply secondary labels with weight 400-500, attenuated neutral color, size 11-13px
    - Apply text truncation with numberOfLines where needed
    - Remove all hardcoded values
    - _Requirements: 4.4, 4.5, 4.6, 8.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 7.3 Migrate Manual Entry screen to theme system
    - Update `app/(tabs)/manual.tsx` to use theme hooks
    - Apply form grouping: internal spacing ≤ 50% of between-group spacing
    - Apply primary color only to submit/save buttons, not to labels or static text
    - Remove all hardcoded values
    - _Requirements: 8.4, 8.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 7.4 Migrate Settings screens to theme system
    - Update `app/(tabs)/settings/index.tsx`, `_layout.tsx`, and sub-screens to use theme hooks
    - Apply card styling with md borderRadius (12px) for settings items
    - Apply section separators with 24px spacing or subtle dividers (10-15% opacity)
    - Remove all hardcoded values
    - _Requirements: 5.5, 6.1, 10.1, 10.2, 10.3, 10.4_

- [x] 8. Integration, status bar, and token fallback
  - [x] 8.1 Implement status bar theming and token fallback utility
    - Add status bar style configuration in root layout or theme hook (light-content for dark mode, dark-content for light mode)
    - Implement `getToken()` fallback utility function with `__DEV__` warning for missing tokens
    - Ensure theme changes propagate to status bar within 500ms
    - _Requirements: 2.4, 2.6, 10.5, 10.6_

  - [x] 8.2 Wire remaining components and verify no hardcoded values remain
    - Audit `src/components/` and `app/` directories for remaining hardcoded hex colors, fontSize, spacing, and borderRadius values
    - Migrate any remaining components (charts, import screens, etc.) to theme tokens
    - Ensure all components re-render correctly on theme change
    - Verify `TRANSACTION_COLORS` backward compatibility is maintained
    - _Requirements: 3.6, 10.1, 10.2, 10.3, 10.4, 10.7_

  - [x] 8.3 Write unit tests for theme store and hooks
    - Test themeStore state transitions: system → light → dark → system
    - Test useThemeColors returns correct palette for each mode
    - Test Appearance change listener updates resolvedScheme
    - Test fallback behavior for missing tokens (getToken utility)
    - Test TRANSACTION_COLORS backward compatibility
    - Create test at `src/stores/__tests__/themeStore.test.ts` and `src/hooks/__tests__/useThemeColors.test.ts`
    - _Requirements: 2.1, 2.4, 10.6, 10.7_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `TRANSACTION_COLORS` export must be preserved for backward compatibility
- All code examples use TypeScript, consistent with the project's existing codebase
- `fast-check` is already installed as a devDependency — no additional setup needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1", "5.4"] },
    { "id": 6, "tasks": ["4.3", "5.2", "5.3"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["8.1", "8.2"] },
    { "id": 9, "tasks": ["8.3"] }
  ]
}
```
