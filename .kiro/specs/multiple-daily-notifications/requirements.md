# Requirements Document

## Introduction

This feature extends the existing notification system to support multiple notifications within a single day. Currently, the app only supports notification frequencies of daily, every 2 days, every 3 days, weekly, or disabled — all limited to a single notification per day at a configured time. This enhancement allows users to configure multiple time slots (e.g., morning and evening reminders) for intra-day notifications, providing more flexible reminder scheduling.

## Glossary

- **Notification_Scheduler**: The service responsible for scheduling, canceling, and restoring local notifications using expo-notifications
- **Notification_Store**: The Zustand store that manages notification settings state with AsyncStorage persistence
- **Time_Slot**: A specific hour and minute combination representing a scheduled notification time within a day
- **Time_Slot_List**: An ordered collection of Time_Slot entries configured by the user for intra-day notifications
- **Notification_Settings_Screen**: The UI screen where users configure notification preferences
- **Frequency**: The interval between notification cycles (daily, every 2 days, every 3 days, weekly, or disabled)

## Requirements

### Requirement 1: Time Slot Management

**User Story:** As a user, I want to add multiple notification time slots within a day, so that I can receive reminders at different times (e.g., morning and evening).

#### Acceptance Criteria

1. WHEN the user selects the "add time slot" action, THE Notification_Settings_Screen SHALL display a time picker allowing selection of hour (0-23) and minute (0, 15, 30, 45)
2. WHEN the user confirms a new time slot, THE Notification_Store SHALL add the Time_Slot to the Time_Slot_List in chronological order
3. THE Notification_Store SHALL support a minimum of 1 and a maximum of 5 Time_Slot entries in the Time_Slot_List
4. IF the user confirms a Time_Slot with the same hour and minute as an existing entry in the Time_Slot_List, THEN THE Notification_Settings_Screen SHALL display a validation message indicating the selected time already exists and SHALL NOT add the duplicate to the Time_Slot_List
5. WHEN the user removes a Time_Slot from the Time_Slot_List, THE Notification_Store SHALL remove the entry and THE Notification_Scheduler SHALL cancel the corresponding scheduled notification
6. IF the Time_Slot_List already contains 5 entries, THEN THE Notification_Settings_Screen SHALL disable the "add time slot" action and SHALL display a message indicating the maximum number of time slots has been reached
7. IF the Time_Slot_List contains exactly 1 entry, THEN THE Notification_Settings_Screen SHALL disable the remove action for that entry

### Requirement 2: Intra-Day Frequency Option

**User Story:** As a user, I want a new frequency option for multiple daily notifications, so that I can distinguish between single-daily and multi-daily reminder modes.

#### Acceptance Criteria

1. THE Notification_Settings_Screen SHALL include a "Multiple times per day" frequency option positioned as the first item in the frequency list, before the existing frequency options (daily, every 2 days, every 3 days, weekly, disabled)
2. WHEN the user selects the "Multiple times per day" frequency, THE Notification_Settings_Screen SHALL hide the single time picker and display the Time_Slot_List management UI in its place
3. WHEN the user switches from "Multiple times per day" to another frequency, THE Notification_Store SHALL preserve the Time_Slot_List data in persistent storage, and THE Notification_Scheduler SHALL schedule notifications using only the single preferred hour and minute values
4. WHEN the user switches to "Multiple times per day" frequency and the Time_Slot_List is empty, THE Notification_Store SHALL initialize the Time_Slot_List with exactly one entry using the current preferred hour and minute values
5. WHEN the user switches back to "Multiple times per day" from another frequency and the Time_Slot_List contains previously preserved entries, THE Notification_Settings_Screen SHALL display the previously preserved Time_Slot_List entries without modification

### Requirement 3: Multi-Slot Notification Scheduling

**User Story:** As a user, I want all my configured time slots to trigger notifications, so that I receive reminders at each specified time.

#### Acceptance Criteria

1. WHILE the frequency is set to "Multiple times per day", WHEN the user confirms the frequency selection or modifies the Time_Slot_List, THE Notification_Scheduler SHALL cancel all previously scheduled notifications and schedule one new notification for each Time_Slot in the Time_Slot_List
2. WHEN a notification is delivered for a Time_Slot, THE Notification_Scheduler SHALL reschedule the next notification for that same Time_Slot at the same hour and minute on the next calendar day
3. THE Notification_Scheduler SHALL use TIME_INTERVAL triggers to schedule each Time_Slot notification independently, with each trigger's seconds value calculated as the difference between the target Time_Slot time and the current time
4. THE Notification_Scheduler SHALL include the Time_Slot hour and minute in the notification data payload so that delivered notifications can be associated with their originating Time_Slot
5. IF a scheduled notification fails to be created for a Time_Slot, THEN THE Notification_Scheduler SHALL log the error, store no notification identifier for that Time_Slot, and continue scheduling remaining Time_Slot entries

### Requirement 4: Store Persistence for Multiple Time Slots

**User Story:** As a user, I want my multiple time slot configuration to persist across app restarts, so that I do not lose my notification schedule.

#### Acceptance Criteria

1. THE Notification_Store SHALL persist the Time_Slot_List to AsyncStorage as part of the existing notification settings partialize configuration
2. THE Notification_Store SHALL store a mapping of each Time_Slot (keyed by hour and minute) to its corresponding scheduled notification identifier
3. WHEN the app starts, IF the stored frequency is "Multiple times per day", THEN THE Notification_Scheduler SHALL verify each stored notification identifier still exists in the system by querying the scheduled notifications list
4. WHEN the app starts, IF a previously stored notification identifier is not found in the scheduled notifications list, THEN THE Notification_Scheduler SHALL reschedule the notification for that Time_Slot and update the stored mapping with the new identifier
5. IF rescheduling a notification fails during app start restoration, THEN THE Notification_Scheduler SHALL log the error and continue restoring remaining Time_Slot entries without blocking app startup

### Requirement 5: Time Slot List UI Display

**User Story:** As a user, I want to see all my configured notification times in a clear list, so that I can manage my reminder schedule.

#### Acceptance Criteria

1. WHILE the frequency is "Multiple times per day", THE Notification_Settings_Screen SHALL display each Time_Slot as a list item showing the formatted time in HH:MM 24-hour format
2. IF the Time_Slot_List contains more than 1 entry, THEN THE Notification_Settings_Screen SHALL display a delete action for each Time_Slot item
3. IF the Time_Slot_List contains 1 entry or fewer, THEN THE Notification_Settings_Screen SHALL hide the delete action for Time_Slot items
4. WHILE the Time_Slot_List contains fewer than 5 entries, THE Notification_Settings_Screen SHALL display an "add time slot" button
5. WHILE the Time_Slot_List contains exactly 5 entries, THE Notification_Settings_Screen SHALL hide the "add time slot" button
6. THE Notification_Settings_Screen SHALL display the Time_Slot_List items sorted in ascending chronological order (earliest time first)
7. WHILE the frequency is "Multiple times per day" AND the Time_Slot_List is empty, THE Notification_Settings_Screen SHALL display the "add time slot" button and no Time_Slot list items

### Requirement 6: Next Notification Preview for Multiple Slots

**User Story:** As a user, I want to see when my next notification will arrive even when I have multiple time slots configured, so that I can verify my schedule is correct.

#### Acceptance Criteria

1. WHILE the frequency is "Multiple times per day" and notifications are enabled, THE Notification_Settings_Screen SHALL display the next upcoming notification time from all configured Time_Slot entries, formatted as weekday, date, and time (HH:MM)
2. WHEN calculating the next notification time, THE Notification_Scheduler SHALL select the earliest Time_Slot from the Time_Slot_List whose scheduled time is strictly after the current time
3. IF all Time_Slot entries in the Time_Slot_List have times earlier than or equal to the current time for today, THEN THE Notification_Scheduler SHALL select the earliest Time_Slot scheduled for the next day in the daily cycle
4. WHEN the user adds or removes a Time_Slot from the Time_Slot_List, THE Notification_Settings_Screen SHALL immediately recalculate and update the displayed next notification time

### Requirement 7: Backward Compatibility

**User Story:** As a user, I want my existing notification settings to continue working after the update, so that I do not lose my current configuration.

#### Acceptance Criteria

1. WHEN the Notification_Store hydrates with settings that do not contain a Time_Slot_List, THE Notification_Store SHALL initialize the Time_Slot_List with a single entry using the existing preferredHour and preferredMinute values, and SHALL preserve the existing preferredHour and preferredMinute fields unchanged
2. THE Notification_Store SHALL accept all previously valid NotificationFrequency values ('daily', 'every2days', 'every3days', 'weekly', 'disabled') without modification, and SHALL extend the type with the new "multipleDaily" value
3. WHILE the frequency is set to any value other than "multipleDaily", THE Notification_Scheduler SHALL schedule notifications using only the single preferredHour and preferredMinute values with the existing FREQUENCY_DAYS interval mapping
4. IF the Notification_Store hydrates with settings that contain an invalid or missing frequency value, THEN THE Notification_Store SHALL fall back to the default notification settings
