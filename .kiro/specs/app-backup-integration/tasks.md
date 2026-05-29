# Implementation Plan: App Backup Integration

## Overview

Implement the custom backup server integration for the GG Economy mobile app. This adds a `CustomServerClient` HTTP transport module, a `CustomServerSettingsStore` for configuration persistence, and UI additions to the existing backup settings screen. The implementation reuses the existing `BackupService.exportDatabase()` and `RestoreService.restoreDatabase()` methods, only replacing the transport layer.

## Tasks

- [x] 1. Create core types and error classes
  - [x] 1.1 Create `CustomServerError` class and type definitions in `src/services/backup/CustomServerClient.ts`
    - Define `CustomServerErrorCode` union type with all error codes (AUTH_FAILED, FILE_TOO_LARGE, NETWORK_ERROR, BAD_REQUEST, SERVER_ERROR, NOT_CONFIGURED, NOT_FOUND, UNKNOWN_ERROR, DATABASE_NOT_FOUND, EXPORT_FAILED, UPLOAD_FAILED, DOWNLOAD_FAILED)
    - Implement `CustomServerError` class extending `Error` with `code`, `httpStatus`, and `originalError` fields
    - Define interfaces: `CustomServerConfig`, `ServerBackupMetadata`, `ServerBackupResponse`, `UploadProgressCallback`, `DownloadProgressCallback`
    - Define the `mapServerToAppMetadata` function that converts `ServerBackupMetadata` to the existing `BackupMetadata` interface
    - _Requirements: 1.9, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 5.2_

  - [x] 1.2 Write property test for server response mapping (Property 2)
    - **Property 2: Server Response Mapping**
    - Generate arbitrary `ServerBackupMetadata` objects with valid filename, ISO 8601 createdAt, and non-negative sizeBytes
    - Assert that `mapServerToAppMetadata` produces `id === filename`, `fileName === filename`, `createdAt` is correct Date, `sizeBytes` preserved, `schemaVersion === 0`
    - Test file: `__tests__/property/services/backup/customServerClient.property.test.ts`
    - **Validates: Requirements 1.6, 4.3, 5.2**

  - [x] 1.3 Write property test for HTTP error code mapping (Property 3)
    - **Property 3: HTTP Error Code Mapping**
    - Generate arbitrary non-2xx HTTP status codes and verify correct error code assignment: 401→AUTH_FAILED, 413→FILE_TOO_LARGE, 400→BAD_REQUEST, 404→NOT_FOUND, 500→SERVER_ERROR, others→UNKNOWN_ERROR
    - Assert every error has both `code` and `message` fields
    - Test file: `__tests__/property/services/backup/customServerClient.property.test.ts`
    - **Validates: Requirements 1.9, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8**

- [x] 2. Implement CustomServerSettingsStore
  - [x] 2.1 Create `src/services/backup/CustomServerSettingsStore.ts`
    - Implement `validateServerUrl(url)`: accept http/https URLs with host, ≤2048 chars
    - Implement `validateApiKey(apiKey)`: accept trimmed length 1-256
    - Implement `saveSettings(serverUrl, apiKey)`: validate inputs, store URL in AsyncStorage (`@gg-economy/custom-server-url`), store API key in SecureStore (`custom-server-api-key`)
    - Implement `getSettings()`: read from both stores, return `ServerSettings` with nullable fields
    - Implement `getOrCreateDeviceId()`: check SecureStore (`custom-server-device-id`), generate 32-char hex via `expo-crypto` if absent, persist and return
    - Implement `clearSettings()`: remove from both AsyncStorage and SecureStore
    - Implement `isConfigured()`: check all three values are present
    - Export singleton instance `customServerSettingsStore`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2_

  - [x] 2.2 Write property test for URL validation (Property 4)
    - **Property 4: URL Validation**
    - Generate arbitrary strings and verify: accepted iff starts with `http://` or `https://`, contains host after scheme, length ≤2048
    - Generate valid URLs and verify acceptance; generate invalid URLs (no scheme, ftp://, >2048 chars, no host) and verify rejection
    - Test file: `__tests__/property/services/backup/customServerSettings.property.test.ts`
    - **Validates: Requirements 2.4, 2.5**

  - [x] 2.3 Write property test for API key validation (Property 5)
    - **Property 5: API Key Validation**
    - Generate arbitrary strings and verify: accepted iff trimmed length is 1-256 inclusive
    - Generate whitespace-only strings and verify rejection; generate strings with leading/trailing spaces and verify trimmed length check
    - Test file: `__tests__/property/services/backup/customServerSettings.property.test.ts`
    - **Validates: Requirements 2.6, 2.7**

  - [x] 2.4 Write property test for device ID format (Property 6)
    - **Property 6: Device ID Format**
    - Mock `expo-crypto` to return arbitrary 16-byte buffers
    - Assert generated device ID is exactly 32 chars, all lowercase hex (0-9, a-f)
    - Test file: `__tests__/property/services/backup/customServerSettings.property.test.ts`
    - **Validates: Requirements 3.1**

  - [x] 2.5 Write unit tests for CustomServerSettingsStore
    - Test save/load round-trip for settings
    - Test validation edge cases (empty URL, URL exactly 2048 chars, API key with only spaces)
    - Test device ID generation and persistence (first call generates, second call retrieves)
    - Test clearSettings removes all keys
    - Test isConfigured returns false when any field is missing
    - Test file: `__tests__/unit/services/backup/CustomServerSettingsStore.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.4_

- [x] 3. Implement CustomServerClient
  - [x] 3.1 Implement `fetchWithTimeout` utility and HTTP error mapping in `src/services/backup/CustomServerClient.ts`
    - Implement `fetchWithTimeout(url, options, timeoutMs)` using `AbortController`
    - Implement `mapHttpError(status, responseBody)` that maps HTTP status codes to `CustomServerErrorCode`
    - Implement configuration guard that throws `NOT_CONFIGURED` if config is incomplete
    - _Requirements: 1.10, 1.11, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 3.2 Implement `testConnection` method
    - Send GET to `{serverUrl}/api/health` with `x-api-key` and `x-device-id` headers
    - Timeout: 10 seconds
    - Return void on success (HTTP 200), throw `CustomServerError` on failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 3.3 Implement `upload` method
    - Build `multipart/form-data` with the .db file using `expo-file-system` uploadAsync or FormData
    - Include `x-api-key` and `x-device-id` headers
    - Timeout: 60 seconds
    - Report progress via callback
    - Return `ServerBackupResponse` on success
    - _Requirements: 1.2, 1.3, 1.5, 4.2, 4.3, 4.5_

  - [x] 3.4 Implement `listBackups` method
    - Send GET to `{serverUrl}/api/backups` with auth headers
    - Timeout: 30 seconds
    - Sort results by `createdAt` descending
    - Return `ServerBackupMetadata[]`
    - _Requirements: 1.2, 1.3, 1.6, 5.1, 5.3_

  - [x] 3.5 Implement `download` method
    - Send GET to `{serverUrl}/api/backups/:filename` with auth headers
    - Timeout: 120 seconds
    - Save response to cache directory with unique temp filename
    - Report progress via callback
    - Delete partial file on failure
    - Return local file path on success
    - _Requirements: 1.2, 1.3, 1.7, 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 3.6 Implement `deleteBackup` method
    - Send DELETE to `{serverUrl}/api/backups/:filename` with auth headers
    - Timeout: 30 seconds
    - Return success object on HTTP 200
    - _Requirements: 1.2, 1.3, 1.8, 7.1, 7.2, 7.3, 7.4_

  - [x] 3.7 Export singleton instance `customServerClient`
    - Wire up the class instantiation and export
    - _Requirements: 1.1_

  - [x] 3.8 Write property test for required headers invariant (Property 1)
    - **Property 1: Required Headers Invariant**
    - Generate arbitrary valid `CustomServerConfig` objects
    - Mock fetch and verify that every request includes `x-api-key` and `x-device-id` headers with correct values
    - Test all operations: upload, list, download, delete, testConnection
    - Test file: `__tests__/property/services/backup/customServerClient.property.test.ts`
    - **Validates: Requirements 1.2, 1.3, 3.3**

  - [x] 3.9 Write property test for backup list sorting (Property 7)
    - **Property 7: Backup List Sorting**
    - Generate arbitrary arrays of `ServerBackupMetadata` with distinct `createdAt` timestamps
    - Mock fetch to return the unsorted array
    - Assert `listBackups` returns items sorted descending by `createdAt`
    - Test file: `__tests__/property/services/backup/customServerClient.property.test.ts`
    - **Validates: Requirements 5.1**

  - [x] 3.10 Write unit tests for CustomServerClient
    - Test upload success and failure paths (mock fetch)
    - Test download with temp file cleanup on failure
    - Test timeout behavior (mock AbortController)
    - Test configuration guard (NOT_CONFIGURED thrown when config incomplete)
    - Test progress callback invocation during upload/download
    - Test all HTTP error code mappings with specific examples
    - Test file: `__tests__/unit/services/backup/CustomServerClient.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.9, 1.10, 1.11, 4.4, 4.6, 4.7, 4.8, 6.4, 6.5_

- [x] 4. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate with BackupService and RestoreService
  - [x] 5.1 Add `createCustomServerBackup` function in `src/services/backup/CustomServerClient.ts` or as a helper
    - Reuse `BackupService.exportDatabase()` to produce temp .db file
    - Call `customServerClient.upload(tempPath, config, onProgress)`
    - Delete temp file in `finally` block
    - Return `BackupResult` matching existing interface
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 5.2 Add custom server restore flow helper
    - Call `customServerClient.download(filename, config, onProgress)` → local temp path
    - Call `RestoreService.validateBackup(tempPath)`
    - Call `RestoreService.restoreDatabase(tempPath)`
    - Delete temp file in `finally` block
    - Return `RestoreResult`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.3 Write unit tests for integration helpers
    - Test full backup flow: export → upload → cleanup
    - Test full restore flow: download → validate → restore → cleanup
    - Test temp file cleanup on failure
    - Test file: `__tests__/unit/services/backup/CustomServerIntegration.test.ts`
    - _Requirements: 4.1, 4.4, 6.5_

- [x] 6. Add i18n translations
  - [x] 6.1 Add translation keys to `src/i18n/locales/en.json` and `src/i18n/locales/pt-BR.json`
    - Add keys under `backup.customServer` namespace for: section title, server URL label/placeholder, API key label/placeholder, test connection button, save button, backup now button, restore button, delete button, confirmation prompts, success messages
    - Add keys under `backup.errors` namespace for: authFailed, fileTooLarge, networkError, notConfigured, notFound, serverError, badRequest, unknownError, downloadFailed, uploadFailed, exportFailed, databaseNotFound
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 10.4, 10.5, 10.11_

- [x] 7. Implement UI - Custom Server section in backup.tsx
  - [x] 7.1 Add custom server configuration inputs to `app/(tabs)/settings/backup.tsx`
    - Add collapsible "Custom Server" section below existing Google Drive section
    - Add TextInput for server URL (max 2048 chars)
    - Add TextInput for API key (max 256 chars, secureTextEntry)
    - Add "Save" button that validates and persists via `CustomServerSettingsStore`
    - Display validation errors inline
    - Load saved settings on mount
    - _Requirements: 10.1, 10.2_

  - [x] 7.2 Add "Test Connection" button and status indicator
    - Call `customServerClient.testConnection()` on press
    - Show loading spinner during test
    - Display success indicator (green text/icon) on success
    - Display error message with failure reason on failure
    - Timeout after 15 seconds with appropriate message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.3, 10.4, 10.5_

  - [x] 7.3 Add backup list display
    - When connection is valid, fetch and display up to 50 backups sorted by date descending
    - Show filename, date, and size for each item
    - Show empty state when no backups exist
    - Add pull-to-refresh or refresh button
    - _Requirements: 10.6_

  - [x] 7.4 Add backup, restore, and delete actions
    - "Backup Now" button: triggers `createCustomServerBackup`, shows loading indicator, refreshes list on success
    - "Restore" action per item: shows confirmation alert warning about data overwrite, calls restore flow
    - "Delete" action per item: shows confirmation alert, calls `customServerClient.deleteBackup`
    - Display error messages on failure without modifying the list
    - _Requirements: 10.7, 10.8, 10.9, 10.10, 10.11_

  - [x] 7.5 Write component tests for custom server UI
    - Test section renders with inputs and buttons
    - Test validation feedback on invalid URL/API key
    - Test connection test button loading and success/error states
    - Test backup list rendering with mock data
    - Test confirmation dialogs for restore and delete
    - Test error message display on operation failure
    - Test file: `__tests__/component/backup/CustomServerSection.test.tsx`
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9, 10.10, 10.11_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript
- Existing `BackupService.exportDatabase()` and `RestoreService.restoreDatabase()` are reused without modification
- The `fetch` API with `AbortController` is used instead of axios (per design decision)
- Translation keys support both English (`en.json`) and Brazilian Portuguese (`pt-BR.json`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "2.4", "2.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["3.7", "3.8", "3.9", "3.10"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "7.5"] }
  ]
}
```
