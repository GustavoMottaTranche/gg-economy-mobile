# Implementation Plan: Multiple Daily Notifications

## Overview

This plan implements the "Multiple times per day" notification frequency mode, extending the existing notification system to support up to 5 configurable time slots per day. The implementation follows an incremental approach: types and store first, then scheduler logic, then UI, and finally integration wiring.

## Tasks

- [x] 1. Extend types and store with time slot support
  - [x] 1.1 Extend NotificationFrequency type and add TimeSlot interface
    - Add `'multipleDaily'` to the `NotificationFrequency` union type in `src/stores/notificationStore.ts`
    - Create `TimeSlot` interface with `hour: number` and `minute: number`
    - Create `timeSlotKey(slot: TimeSlot): string` helper that returns `"HH:MM"` format
    - Add `timeSlots: TimeSlot[]` and `timeSlotNotificationIds: Record<string, string>` to `NotificationSettings`
    - Update `DEFAULT_NOTIFICATION_SETTINGS` with `timeSlots: []` and `timeSlotNotificationIds: {}`
    - _Requirements: 2.1, 4.1, 4.2, 7.2_

  - [x] 1.2 Implement store actions for time slot management
    - Implement `addTimeSlot(slot: TimeSlot): boolean` — validates uniqueness (via `timeSlotKey`), enforces max 5, inserts in sorted chronological order, returns false if rejected
    - Implement `removeTimeSlot(key: string): boolean` — validates min 1, removes matching slot, returns false if rejected
    - Implement `setTimeSlotNotificationId(key: string, id: string | null): void` — updates single entry in mapping
    - Implement `setTimeSlotNotificationIds(ids: Record<string, string>): void` — bulk replaces the mapping
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.3 Implement backward-compatible hydration logic
    - Extend `onRehydrateStorage` to initialize `timeSlots` from `preferredHour`/`preferredMinute` when field is missing
    - Initialize `timeSlotNotificationIds` to `{}` when field is missing
    - Validate frequency value against all valid options including `'multipleDaily'`; fallback to defaults if invalid
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 1.4 Write property tests for time slot store logic
    - **Property 1: Chronological Order Invariant**
    - **Property 2: Size Bounds Invariant**
    - **Property 3: Duplicate Rejection**
    - **Property 4: Removal Correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.6**

  - [x] 1.5 Write property test for frequency round-trip preservation
    - **Property 5: Time Slot Preservation Round-Trip**
    - **Validates: Requirements 2.3, 2.5**

  - [x] 1.6 Write property tests for hydration backward compatibility
    - **Property 11: Backward-Compatible Hydration**
    - **Property 12: Frequency Type Backward Compatibility**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Extend NotificationScheduler with multi-slot scheduling
  - [x] 3.1 Implement `scheduleAllSlots` method
    - Cancel all existing notifications before scheduling
    - For each time slot, calculate seconds until target time and schedule via `expo-notifications`
    - Include `slotHour` and `slotMinute` in notification data payload
    - Return `Record<string, string>` mapping slot keys to notification IDs
    - On per-slot failure: log warning, store no ID for that slot, continue with remaining
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [x] 3.2 Implement `calculateNextTimeMultiSlot` method
    - Accept `timeSlots: TimeSlot[]` and optional `fromTime: Date`
    - Find the earliest slot whose target time is strictly after `fromTime`
    - If all slots are at or before current time today, return earliest slot's time on next day
    - Return `null` if timeSlots is empty
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.3 Implement `restoreMultipleSlots` method
    - Query all scheduled notifications from expo-notifications
    - For each time slot, check if stored notification ID exists in scheduled list
    - Reschedule any missing slots and update the mapping
    - On per-slot failure: log warning, continue with remaining
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 3.4 Implement `handleSlotNotificationReceived` method
    - Extract `slotHour` and `slotMinute` from notification data payload
    - Calculate seconds until same time next day
    - Schedule new notification for that slot only
    - Update the notification ID mapping in the store
    - _Requirements: 3.2, 3.4_

  - [x] 3.5 Integrate multi-slot logic into existing `restore` method
    - In the existing `restore` method, add a branch for `frequency === 'multipleDaily'`
    - Call `restoreMultipleSlots` with current timeSlots and stored IDs
    - Update store with new mapping via `setTimeSlotNotificationIds`
    - _Requirements: 4.3, 4.4_

  - [x] 3.6 Write property tests for scheduler calculations
    - **Property 8: TIME_INTERVAL Seconds Calculation**
    - **Property 10: Next Notification Time Calculation**
    - **Validates: Requirements 3.3, 6.1, 6.2, 6.3**

  - [x] 3.7 Write property tests for scheduling mapping and error isolation
    - **Property 6: One-to-One Scheduling Mapping** (with mocked expo-notifications)
    - **Property 7: Next-Day Rescheduling After Delivery**
    - **Property 9: Error Isolation** (with injected failures)
    - **Validates: Requirements 3.1, 3.2, 3.5, 4.2, 4.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement UI components for time slot management
  - [x] 5.1 Create TimeSlotListItem component
    - Create `src/components/notifications/TimeSlotListItem.tsx`
    - Render formatted time in HH:MM 24-hour format
    - Show delete button conditionally based on `canDelete` prop
    - Style consistently with existing notification settings items
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Create TimeSlotSection component
    - Create `src/components/notifications/TimeSlotSection.tsx`
    - Render list of `TimeSlotListItem` components sorted chronologically
    - Show "add time slot" button when fewer than 5 slots
    - Hide "add time slot" button when at 5 slots
    - Show max-reached message when at 5 slots
    - Handle disabled state
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 1.6_

  - [x] 5.3 Add "Multiple times per day" frequency option to settings screen
    - Add `{ value: 'multipleDaily', labelKey: 'notifications.frequencyMultipleDaily' }` as first item in `FREQUENCY_OPTIONS` array
    - Add translation key for the new option
    - _Requirements: 2.1_

  - [x] 5.4 Integrate TimeSlotSection into notification settings screen
    - Conditionally render `TimeSlotSection` when frequency is `'multipleDaily'`
    - Hide single time picker when frequency is `'multipleDaily'`
    - Wire `onAddSlot` to store's `addTimeSlot` + scheduler's `scheduleAllSlots`
    - Wire `onRemoveSlot` to store's `removeTimeSlot` + scheduler's `scheduleAllSlots`
    - Show duplicate validation message when `addTimeSlot` returns false
    - Initialize time slots from preferredHour/preferredMinute when switching to multipleDaily with empty list
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 1.4, 3.1_

  - [x] 5.5 Update next notification preview for multiple slots
    - When frequency is `'multipleDaily'`, use `calculateNextTimeMultiSlot` instead of `calculateNextTime`
    - Display the result in the same format as existing preview
    - Recalculate on time slot add/remove
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.6 Write unit tests for UI components
    - Test TimeSlotListItem renders time correctly and delete button visibility
    - Test TimeSlotSection add button visibility at boundary (5 slots)
    - Test conditional rendering of slot list vs single time picker
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wire frequency change handlers and finalize integration
  - [x] 7.1 Handle frequency change to/from multipleDaily
    - When switching to `'multipleDaily'`: if timeSlots is empty, initialize with current preferredHour/preferredMinute; call `scheduleAllSlots`
    - When switching from `'multipleDaily'` to another frequency: cancel all notifications, schedule single notification using preferredHour/preferredMinute with new frequency
    - Preserve timeSlots data in store when switching away (do not clear)
    - _Requirements: 2.3, 2.4, 2.5, 3.1_

  - [x] 7.2 Wire notification received handler for multi-slot mode
    - In the existing notification received listener, detect `slotHour`/`slotMinute` in payload data
    - If present, call `handleSlotNotificationReceived` instead of `handleNotificationReceived`
    - If not present, use existing single-notification handler
    - _Requirements: 3.2, 3.4_

  - [x] 7.3 Wire app startup restoration for multi-slot mode
    - In app startup flow, after store hydration, check if frequency is `'multipleDaily'`
    - If so, call `restoreMultipleSlots` and update store with returned mapping
    - Otherwise, use existing `restore` logic
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 7.4 Write integration tests for full scheduling flow
    - Test: add slots → verify expo-notifications receives correct calls with slot data in payload
    - Test: simulate app restart with stale IDs → verify rescheduling occurs
    - Test: simulate notification received → verify correct slot rescheduled for next day
    - _Requirements: 3.1, 3.2, 4.3, 4.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `notificationStore.test.ts` and `notificationStore.property.test.ts` files should be extended rather than replaced
- All scheduling logic uses mocked `expo-notifications` in tests via the existing `NotificationsModuleLoader` pattern

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["3.6", "3.7"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 7, "tasks": ["5.4", "5.5"] },
    { "id": 8, "tasks": ["5.6"] },
    { "id": 9, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 10, "tasks": ["7.4"] }
  ]
}
```
