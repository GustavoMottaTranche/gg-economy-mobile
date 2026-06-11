# Implementation Plan: Cloud Sync Import

## Overview

Implement a one-way data migration feature from the local SQLite database to a Supabase-backed web platform. The implementation follows a sequential pipeline approach: authenticate → extract → build payload → upload. All modules are created under `src/services/cloud-sync/` following the functional module pattern, with a custom hook for UI state management and a dedicated screen for user interaction.

## Tasks

- [x] 1. Set up cloud sync module structure and shared types
  - [x] 1.1 Create CloudSyncError class and error types
    - Create `src/services/cloud-sync/CloudSyncError.ts`
    - Define `CloudSyncErrorCode` type union: `AUTH_FAILED | NETWORK_ERROR | EXTRACTION_FAILED | PAYLOAD_ERROR | IMPORT_FAILED | NOT_CONFIGURED | SERVER_ERROR | ALREADY_RUNNING`
    - Implement `CloudSyncError` class extending `Error` with `code` and optional `httpStatus` properties
    - _Requirements: 8.1, 8.2_

  - [x] 1.2 Create cloud sync configuration module
    - Create `src/services/cloud-sync/config.ts`
    - Implement `getCloudSyncConfig()` that reads base URL from app configuration (AsyncStorage or constants)
    - Implement `setCloudSyncBaseUrl(url: string)` for persisting custom URL
    - Implement URL validation (must match HTTP/HTTPS scheme + host, max 2048 chars)
    - Implement URL path construction utility that normalizes trailing slashes
    - Return `NOT_CONFIGURED` error if URL is empty or invalid
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.3 Create shared type definitions
    - Create `src/services/cloud-sync/types.ts`
    - Define `LoginCredentials`, `LoginResult`, `ExtractedData`, `ImportPayload`, `ImportResult`, `ImportResultTotals` interfaces
    - Define `SyncStep` type and `SyncProgressCallback` interface
    - Export barrel file `src/services/cloud-sync/index.ts`
    - _Requirements: 1.1, 2.6, 3.1, 4.3, 5.3_

- [x] 2. Implement SyncAuthClient
  - [x] 2.1 Implement authentication login function
    - Create `src/services/cloud-sync/SyncAuthClient.ts`
    - Implement `login(credentials, baseUrl)` function
    - Validate email and password are non-empty before sending request (return validation error if empty)
    - Send POST to `{baseUrl}/api/public/sync/login` with JSON body `{ email, password }`
    - Apply 30-second timeout using `AbortController`
    - On HTTP 200: extract `access_token` from response body, return as `LoginResult`
    - On HTTP 200 without valid `access_token`: throw `CloudSyncError` with `SERVER_ERROR`
    - On HTTP 401: throw `CloudSyncError` with `AUTH_FAILED`
    - On HTTP 400: throw `CloudSyncError` with `SERVER_ERROR`
    - On HTTP 500: throw `CloudSyncError` with `SERVER_ERROR`
    - On network error/timeout: throw `CloudSyncError` with `NETWORK_ERROR`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 2.2 Write unit tests for SyncAuthClient
    - Create `src/services/cloud-sync/__tests__/SyncAuthClient.test.ts`
    - Test successful login with valid credentials
    - Test validation error when email or password is empty
    - Test HTTP 401 → AUTH_FAILED error
    - Test HTTP 400 → SERVER_ERROR error
    - Test HTTP 500 → SERVER_ERROR error
    - Test network timeout → NETWORK_ERROR error
    - Test missing access_token in 200 response → SERVER_ERROR
    - Test request format (URL, headers, body)
    - _Requirements: 1.1–1.9_

- [x] 3. Implement SyncDataExtractor
  - [x] 3.1 Implement data extraction from local database
    - Create `src/services/cloud-sync/SyncDataExtractor.ts`
    - Implement `extractAll(db)` function that reads all 9 tables via Drizzle ORM: categories, funds, fundAllocations, transactions, recurringTransactions, weeklyRecurringGroups, weeklyOccurrences, recurringFundLinks, categoryGoals
    - Read all records regardless of active/inactive status
    - Preserve all field values exactly as stored (no type coercion)
    - Include empty array for tables with zero records
    - Apply 30-second overall timeout; abort and return EXTRACTION_FAILED if exceeded
    - On any table read failure: abort, discard partial data, throw `CloudSyncError` with `EXTRACTION_FAILED` identifying the failed table
    - Return structured `ExtractedData` object
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Write unit tests for SyncDataExtractor
    - Create `src/services/cloud-sync/__tests__/SyncDataExtractor.test.ts`
    - Test extraction of all 9 tables with mocked Drizzle db
    - Test empty tables return empty arrays
    - Test table read failure triggers EXTRACTION_FAILED with table name
    - Test partial data is discarded on failure
    - _Requirements: 2.1–2.7_

- [x] 4. Implement SyncPayloadBuilder
  - [x] 4.1 Implement camelCase to snake_case utility and payload builder
    - Create `src/services/cloud-sync/SyncPayloadBuilder.ts`
    - Implement `camelToSnake(key: string): string` utility function
    - Implement `buildPayload(data: ExtractedData): ImportPayload` function
    - Map `categoryGoals` → `budget_goals` key
    - Derive `installment_groups` from distinct non-null `installmentGroupId` values in transactions
    - Convert all camelCase field names to snake_case
    - Preserve `id` field for every record
    - Preserve monetary values in original format (no conversion)
    - Preserve date values in original format (no conversion)
    - Preserve boolean integers (0/1) without converting to true/false
    - Include empty arrays for tables with zero records
    - Produce JSON-serializable output
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 4.2 Write property test: Payload structure completeness (Property 1)
    - **Property 1: Payload structure completeness**
    - Create `src/services/cloud-sync/__tests__/SyncPayloadBuilder.property.test.ts`
    - Generate arbitrary `ExtractedData` with random records (including empty tables)
    - Assert `buildPayload` output always has exactly 10 keys in `tables`
    - Assert `budget_goals` array length equals input `categoryGoals` length
    - Minimum 100 iterations
    - **Validates: Requirements 3.1, 3.2, 3.8**

  - [x] 4.3 Write property test: Installment groups derivation (Property 2)
    - **Property 2: Installment groups derivation**
    - Add to `SyncPayloadBuilder.property.test.ts`
    - Generate transactions with varying `installmentGroupId` values (null, repeated, unique)
    - Assert `installment_groups` length equals count of distinct non-null installmentGroupId values
    - Assert each entry has `id` matching a distinct value
    - Minimum 100 iterations
    - **Validates: Requirements 3.3**

  - [x] 4.4 Write property test: CamelCase to snake_case conversion (Property 3)
    - **Property 3: CamelCase to snake_case key conversion**
    - Add to `SyncPayloadBuilder.property.test.ts`
    - Generate records with camelCase keys
    - Assert all output keys match regex `/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/`
    - Assert no camelCase keys from original record appear in output
    - Minimum 100 iterations
    - **Validates: Requirements 3.4**

  - [x] 4.5 Write property test: Value preservation (Property 4)
    - **Property 4: Value preservation through transformation**
    - Add to `SyncPayloadBuilder.property.test.ts`
    - Generate records with known id, numeric amounts, string dates, and integer booleans (0/1)
    - Assert id value unchanged, numeric values unchanged, string values unchanged
    - Assert integer booleans remain as numbers (not true/false)
    - Minimum 100 iterations
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.9**

  - [x] 4.6 Write property test: JSON serialization round-trip (Property 5)
    - **Property 5: JSON serialization round-trip**
    - Add to `SyncPayloadBuilder.property.test.ts`
    - Generate valid `ExtractedData` and build payload
    - Assert `JSON.parse(JSON.stringify(payload))` deep-equals original payload
    - Minimum 100 iterations
    - **Validates: Requirements 3.10**

- [x] 5. Checkpoint - Core transformation logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement SyncImportClient
  - [x] 6.1 Implement import upload function
    - Create `src/services/cloud-sync/SyncImportClient.ts`
    - Implement `uploadImport(payload, accessToken, baseUrl)` function
    - Send POST to `{baseUrl}/api/public/sync/import` with JSON body, Content-Type `application/json`
    - Include `Authorization: Bearer {accessToken}` header
    - Apply 120-second timeout using `AbortController`
    - On HTTP 200: parse response as `ImportResult` (totals + per-table results), return
    - On HTTP 200 with malformed body: throw `CloudSyncError` with `SERVER_ERROR`
    - On HTTP 401: throw `CloudSyncError` with `IMPORT_FAILED`
    - On HTTP 400: throw `CloudSyncError` with `IMPORT_FAILED` including server message
    - On HTTP 500: throw `CloudSyncError` with `IMPORT_FAILED` including server message
    - On unhandled HTTP status: throw `CloudSyncError` with `SERVER_ERROR` including status code
    - On network error/timeout: throw `CloudSyncError` with `NETWORK_ERROR`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 6.2 Write unit tests for SyncImportClient
    - Create `src/services/cloud-sync/__tests__/SyncImportClient.test.ts`
    - Test successful upload with valid payload and token
    - Test Authorization header is correctly set
    - Test Content-Type header is application/json
    - Test HTTP 401 → IMPORT_FAILED
    - Test HTTP 400 → IMPORT_FAILED with server message
    - Test HTTP 500 → IMPORT_FAILED with server message
    - Test unhandled status code → SERVER_ERROR with status
    - Test network timeout → NETWORK_ERROR
    - Test malformed 200 response → SERVER_ERROR
    - Test 120-second timeout is applied
    - _Requirements: 4.1–4.10_

- [x] 7. Implement CloudSyncService orchestrator
  - [x] 7.1 Implement sync orchestration pipeline
    - Create `src/services/cloud-sync/CloudSyncService.ts`
    - Implement `execute(params: SyncExecuteParams): Promise<ImportResult>`
    - Implement mutex via module-level `isRunning` flag; reject with `ALREADY_RUNNING` if sync in progress
    - Validate base URL configuration first (return `NOT_CONFIGURED` if invalid)
    - Execute steps in order: authenticate → extract → build payload → upload
    - Emit progress updates via `onProgress` callback at each step start
    - On any step failure: stop immediately, skip subsequent steps, return error with step name and error code
    - On success: return `ImportResult`
    - Token held in local variable only (no persistence)
    - Reset `isRunning` flag in finally block
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 8.4_

  - [x] 7.2 Write unit tests for CloudSyncService
    - Create `src/services/cloud-sync/__tests__/CloudSyncService.test.ts`
    - Test full pipeline success with mocked dependencies
    - Test progress callback receives steps in order: authenticating → extracting → building → uploading
    - Test fail-fast behavior: auth failure skips subsequent steps
    - Test fail-fast behavior: extraction failure skips payload and upload
    - Test mutex: concurrent sync rejected with ALREADY_RUNNING
    - Test NOT_CONFIGURED error when URL invalid
    - Test isRunning resets after failure
    - _Requirements: 5.1–5.5, 7.3, 8.4_

  - [x] 7.3 Write property test: URL path construction normalization (Property 6)
    - **Property 6: URL path construction normalization**
    - Add to `src/services/cloud-sync/__tests__/config.test.ts`
    - Generate base URLs with/without trailing slashes and various API paths
    - Assert constructed URL never contains double slashes (excluding `://`)
    - Assert base URL and path are joined with exactly one slash
    - Minimum 100 iterations
    - **Validates: Requirements 7.4**

- [x] 8. Checkpoint - Service layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement useCloudSync hook
  - [x] 9.1 Implement React hook for sync state management
    - Create `src/hooks/useCloudSync.ts`
    - Manage state: `isRunning`, `currentStep`, `result`, `error`
    - Implement `startSync(email, password)` that calls `CloudSyncService.execute` with progress callback
    - Update `currentStep` on each progress event
    - Set `result` on success, `error` on failure
    - Implement `clearResult()` and `clearError()` actions
    - Prevent double-submission via `isRunning` state
    - _Requirements: 5.3, 5.4, 5.5, 6.4, 6.5, 6.6, 6.7_

  - [x] 9.2 Write unit tests for useCloudSync hook
    - Create `src/hooks/__tests__/useCloudSync.test.ts`
    - Test initial state (isRunning false, no step, no result, no error)
    - Test state transitions during successful sync
    - Test error state on failure
    - Test clearResult and clearError actions
    - Test double-submission prevention
    - _Requirements: 5.3–5.5, 6.4–6.7_

- [x] 10. Implement CloudSyncScreen
  - [x] 10.1 Create the Cloud Sync screen UI
    - Create `src/screens/CloudSync/CloudSyncScreen.tsx`
    - Render email input (max 254 chars) and password input (max 128 chars, secure text entry)
    - Implement start button: disabled when email or password empty, disabled while sync running
    - Display current step name and progress indicator while sync is running
    - Display success summary (ok, failed, skipped counts) on completion
    - Display error message on failure
    - Retain email and password values on retry; clear previous error before restarting
    - Use `useCloudSync` hook for all state management
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 10.2 Write component tests for CloudSyncScreen
    - Create `src/screens/CloudSync/__tests__/CloudSyncScreen.test.tsx`
    - Test start button disabled when fields empty
    - Test start button enabled when both fields have content
    - Test password field uses secure text entry
    - Test progress indicator shown during sync
    - Test success summary displayed after completion
    - Test error message displayed on failure
    - Test credentials retained after error
    - _Requirements: 6.1–6.9_

- [x] 11. Integration and wiring
  - [x] 11.1 Wire CloudSyncScreen into navigation
    - Add CloudSync screen to the app's navigation stack
    - Add navigation entry point (e.g., from Settings screen)
    - Ensure screen is accessible from the app's navigation flow
    - _Requirements: 6.1_

- [x] 12. Final checkpoint - Feature complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript with functional module pattern (exported functions, not classes)
- All HTTP calls use `fetch` with `AbortController` for timeouts
- Token is never persisted — held in memory only during sync execution

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 3, "tasks": ["6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "7.2", "7.3"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1"] }
  ]
}
```
