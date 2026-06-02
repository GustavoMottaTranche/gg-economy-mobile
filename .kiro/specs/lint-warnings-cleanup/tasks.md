# Lint Warnings Cleanup - Tasks

## Task 1: Fix unused variables in test files

- [ ] `__tests__/unit/services/backup/CustomServerIntegration.test.ts` - Remove `BackupError`, prefix `originalError` with `_`
- [ ] `app/__tests__/dashboard-integration.test.tsx` - Remove/prefix unused mock vars
- [ ] `app/__tests__/dashboard.test.tsx` - Remove/prefix unused mock vars
- [ ] `src/__tests__/occurrenceUpdate.property.test.ts` - Prefix `refMonth` with `_`
- [ ] `src/__tests__/properties/groupMutationsPreservePaymentStatus.property.test.ts` - Remove `UpdateWeeklyGroupDTO`
- [ ] `src/__tests__/services/paymentStatusPreservation.test.ts` - Prefix `isPaidValues` with `_`
- [ ] `src/__tests__/weekly-recurring/properties.test.ts` - Remove unused `today`
- [ ] `src/components/dashboard/__tests__/PaymentStatusSummary.test.tsx` - Remove unused `getAllByText`
- [ ] `src/components/notifications/__tests__/TimeSlotSection.test.tsx` - Remove `fireEvent`
- [ ] `src/services/notifications/__tests__/NotificationScheduler.property.test.ts` - Remove unused `scheduler`
- [ ] `src/stores/__tests__/notificationStore.test.ts` - Remove `timeSlotKey`

## Task 2: Fix unused variables in source files

- [ ] `app/(tabs)/index.tsx` - Remove `TouchableOpacity`, `Text`, unused `styles`
- [ ] `app/(tabs)/transactions.tsx` - Remove `WeeklyParcelRow`, `currentMonth`, `resetFilters`, `refresh`
- [ ] `app/(tabs)/settings/categories.tsx` - Replace `err` with `_err` (5 occurrences)
- [ ] `app/(tabs)/settings/rules.tsx` - Replace `err` with `_err` (2 occurrences)
- [ ] `app/transaction/[id].tsx` - Replace `err` with `_err` (13 occurrences)
- [ ] `app/weekly-recurring/[id].tsx` - Remove unused `OccurrenceStatusToggle`
- [ ] `app/weekly-recurring/parcel-detail.tsx` - Replace `error` with `_error` (2 occurrences)
- [ ] `src/components/import/ManualEntryForm.tsx` - Remove unused `_` assignments
- [ ] `src/components/import/MultiFileSelector.tsx` - Replace `error` with `_error`
- [ ] `src/hooks/useReviewCount.ts` - Replace `error` with `_error`
- [ ] `src/services/notifications/NotificationScheduler.ts` - Prefix `settings` with `_`
- [ ] `src/services/weekly-recurring/WeeklyRecurringService.ts` - Remove unused `logger`

## Task 3: Fix react-hooks/exhaustive-deps warnings

- [ ] `app/(tabs)/manual.tsx` - Fix 4 missing dependencies in hooks
- [ ] `src/components/import/ManualEntryForm.tsx` - Add `t` to useCallback deps
- [ ] `src/hooks/useAppStateCleanup.ts` - Wrap `mergedConfig` in useMemo
- [ ] `src/hooks/useImport.ts` - Add `state` to useCallback deps
- [ ] `app/__tests__/notification-navigation.test.tsx` - Fix 2 useEffect deps

## Task 4: Fix react-hooks/rules-of-hooks violations

- [ ] `src/components/dashboard/PaymentStatusSummary.tsx` - Move useMemo outside conditional
- [ ] `src/hooks/useReviewCount.ts` - Move useLiveQuery outside conditional

## Task 5: Final validation

- [ ] Run `npm run lint` — expect 0 errors, 0 warnings
- [ ] Run `npm run typecheck` — expect no errors
- [ ] Run `npm test -- --passWithNoTests` — all tests pass
