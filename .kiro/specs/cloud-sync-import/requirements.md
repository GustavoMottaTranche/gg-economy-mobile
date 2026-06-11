# Requirements Document

## Introduction

Cloud Sync Import enables users of GG-Economy Mobile to authenticate with the GG-Economy Web platform and export all local SQLite data to a Supabase-backed server. This is a one-way data migration from the mobile app to the web platform. The feature authenticates via email/password, reads all relevant local tables, builds a JSON payload conforming to the server's import API, and sends the data in a single request. The import is idempotent — running it multiple times does not duplicate data on the server.

## Glossary

- **Sync_Service**: The module responsible for orchestrating the cloud sync import flow (authentication, data extraction, payload building, and upload)
- **Auth_Client**: The HTTP client component that handles authentication with the remote API and token management
- **Data_Extractor**: The component that reads all relevant tables from the local SQLite database via Drizzle ORM
- **Payload_Builder**: The component that transforms local database records into the JSON structure expected by the import API
- **Import_Client**: The HTTP client component that sends the built payload to the server's import endpoint
- **Access_Token**: A JWT token obtained from the login endpoint, used for authorization on import requests
- **Import_Payload**: The JSON object containing a "tables" key with arrays of records for each supported table
- **Import_Result**: The server response containing totals (ok, failed, skipped) and per-table results
- **Sync_Screen**: The UI screen where the user initiates and monitors the cloud sync import process

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to authenticate with my GG-Economy Web account, so that the server can associate my imported data with my web profile.

#### Acceptance Criteria

1. WHEN the user submits email and password credentials, THE Auth_Client SHALL send a POST request to `/api/public/sync/login` with the credentials as a JSON body
2. WHEN the server responds with HTTP 200 containing an access_token field, THE Auth_Client SHALL extract the access_token and hold it in memory for subsequent requests within the current sync session
3. IF the server responds with HTTP 401, THEN THE Auth_Client SHALL return an authentication failure error with a user-readable message indicating invalid credentials
4. IF the server responds with HTTP 400, THEN THE Auth_Client SHALL return an error indicating the request format is invalid
5. IF the server responds with HTTP 500, THEN THE Auth_Client SHALL return an error indicating the server is not configured or unavailable
6. IF a network error or timeout occurs during authentication, THEN THE Auth_Client SHALL return a network error with a message indicating the connection failed and suggesting the user verify their internet connectivity
7. THE Auth_Client SHALL apply a 30-second timeout to the authentication request
8. IF the email field or password field is empty, THEN THE Auth_Client SHALL return a validation error indicating that both email and password are required without sending a network request
9. IF the server responds with HTTP 200 but the response body does not contain a valid access_token field, THEN THE Auth_Client SHALL return an error indicating an unexpected server response

### Requirement 2: Local Data Extraction

**User Story:** As a user, I want all my local financial data to be included in the export, so that the web platform has a complete copy of my records.

#### Acceptance Criteria

1. WHEN the sync process starts data extraction, THE Data_Extractor SHALL read all records from the following tables: categories, funds, fundAllocations, transactions, recurringTransactions, weeklyRecurringGroups, weeklyOccurrences, recurringFundLinks, categoryGoals
2. THE Data_Extractor SHALL read all records regardless of active/inactive status
3. THE Data_Extractor SHALL preserve all field values exactly as stored in the local SQLite database without type coercion or truncation
4. IF a table read operation fails, THEN THE Data_Extractor SHALL abort the extraction, discard any partially collected data, and return an error identifying which table failed
5. IF a table contains zero records, THEN THE Data_Extractor SHALL include that table in the extraction result as an empty array
6. THE Data_Extractor SHALL return the extracted data as a structured object containing one key per table, where each key maps to an array of row objects
7. THE Data_Extractor SHALL complete extraction of all 9 tables within 30 seconds; IF extraction exceeds 30 seconds, THEN THE Data_Extractor SHALL abort and return a timeout error

### Requirement 3: Payload Construction

**User Story:** As a user, I want my local data to be correctly formatted for the server, so that the import succeeds without data loss.

#### Acceptance Criteria

1. THE Payload_Builder SHALL construct an Import_Payload with a "tables" object containing arrays for: categories, funds, installment_groups, recurring_transactions, weekly_recurring_groups, fund_allocations, transactions, recurring_fund_links, weekly_occurrences, budget_goals
2. THE Payload_Builder SHALL map the local `categoryGoals` table records to the `budget_goals` key in the payload
3. THE Payload_Builder SHALL derive `installment_groups` entries by extracting distinct non-null `installmentGroupId` values from the transactions table, producing one entry per distinct value with at minimum the `id` field set to the `installmentGroupId` value
4. THE Payload_Builder SHALL convert all local camelCase field names to snake_case for the server (e.g., `categoryId` → `category_id`, `fundId` → `fund_id`, `weeklyGroupId` → `weekly_group_id`, `referenceMonth` → `reference_month`, `isActive` → `is_active`, `createdAt` → `created_at`, `updatedAt` → `updated_at`)
5. THE Payload_Builder SHALL include the record `id` field for every row to enable server-side deduplication
6. THE Payload_Builder SHALL preserve monetary values in their original stored format without manual conversion (the server handles normalization)
7. THE Payload_Builder SHALL preserve date values in their original stored format without manual conversion (the server handles normalization)
8. IF a local table contains zero records, THEN THE Payload_Builder SHALL include an empty array for the corresponding key in the payload
9. THE Payload_Builder SHALL represent boolean fields (stored as integers 0 or 1 in SQLite) as their integer values in the payload without converting to JSON true/false
10. WHEN building the payload from valid local database records, THE Payload_Builder SHALL produce a JSON-serializable object such that serializing it to JSON and parsing it back yields an object with identical keys, value types, and array lengths as the original payload

### Requirement 4: Data Import Upload

**User Story:** As a user, I want my data to be sent to the server reliably, so that I can access it on the web platform.

#### Acceptance Criteria

1. WHEN the payload is ready, THE Import_Client SHALL send a POST request to `/api/public/sync/import` with the Import_Payload as the JSON body and a Content-Type header set to `application/json`
2. THE Import_Client SHALL include the Access_Token as a Bearer token in the Authorization header
3. WHEN the server responds with HTTP 200, THE Import_Client SHALL parse the response body as an Import_Result containing totals (ok, failed, skipped counts) and per-table result arrays, and return these to the caller
4. IF the server responds with HTTP 401, THEN THE Import_Client SHALL return an authentication error indicating the token is expired or invalid
5. IF the server responds with HTTP 400, THEN THE Import_Client SHALL return an error with the server-provided error message (invalid JSON or unknown tables)
6. IF the server responds with HTTP 500, THEN THE Import_Client SHALL return a server error including the server-provided error message when available in the response body
7. IF a network error or timeout occurs during import, THEN THE Import_Client SHALL return a network error with a descriptive message
8. THE Import_Client SHALL apply a 120-second timeout to the import request to accommodate large payloads
9. IF the server responds with an HTTP status code not explicitly handled (not 200, 400, 401, or 500), THEN THE Import_Client SHALL return an error indicating an unexpected server response and include the received status code
10. IF the server responds with HTTP 200 but the response body cannot be parsed as a valid Import_Result, THEN THE Import_Client SHALL return an error indicating the server returned a malformed response

### Requirement 5: Sync Orchestration

**User Story:** As a user, I want the sync process to be a single coordinated flow, so that I can trigger it once and have everything handled automatically.

#### Acceptance Criteria

1. WHEN the user triggers the sync process with email and password credentials, THE Sync_Service SHALL execute steps in the following order: authenticate (using the provided credentials), extract data (from local database), build payload (from extracted data), upload import (using the Access_Token obtained during authentication and the built Import_Payload)
2. IF any step fails, THEN THE Sync_Service SHALL stop execution immediately, skip all subsequent steps, and return the failure to the caller including the step name that failed and the typed error code as defined in Requirement 8
3. WHEN each step begins execution, THE Sync_Service SHALL emit a progress update to the caller indicating the current step name (authenticating, extracting data, building payload, uploading)
4. WHEN the import upload completes successfully, THE Sync_Service SHALL return the Import_Result to the caller
5. IF the sync process is triggered while a previous sync is already in progress, THEN THE Sync_Service SHALL reject the new request with an error indicating a sync is already running

### Requirement 6: Sync User Interface

**User Story:** As a user, I want a dedicated screen to manage the cloud sync import, so that I can enter credentials, trigger the process, and see results.

#### Acceptance Criteria

1. THE Sync_Screen SHALL display input fields for email (maximum 254 characters) and password (maximum 128 characters)
2. IF the email or password field is empty, THEN THE Sync_Screen SHALL disable the start button
3. WHEN both email and password fields contain at least one character, THE Sync_Screen SHALL enable the start button
4. WHILE the sync process is running, THE Sync_Screen SHALL display the current step name (authenticating, extracting data, building payload, uploading) and a progress indicator
5. WHILE the sync process is running, THE Sync_Screen SHALL disable the start button to prevent duplicate submissions
6. WHEN the sync completes successfully, THE Sync_Screen SHALL display a summary showing total records imported (ok), failed, and skipped
7. IF the sync process fails, THEN THE Sync_Screen SHALL display the error message provided by the Sync_Service and clear any previous progress indicator
8. WHEN the user triggers a retry after a failure, THE Sync_Screen SHALL retain both the email and password values and clear the previous error message before restarting the sync process
9. THE Sync_Screen SHALL mask the password input field using secure text entry

### Requirement 7: Configuration Management

**User Story:** As a user, I want the server URL to be configurable, so that I can point to the correct environment.

#### Acceptance Criteria

1. THE Sync_Service SHALL read the base URL from app configuration
2. IF no custom URL is configured, THEN THE Sync_Service SHALL use a default base URL
3. IF the base URL is empty or does not match a valid HTTP/HTTPS URL format (scheme + host at minimum), THEN THE Sync_Service SHALL return a NOT_CONFIGURED error before attempting any network request
4. THE Sync_Service SHALL construct endpoint URLs by appending the API path (e.g., `/api/public/sync/login`, `/api/public/sync/import`) to the base URL, normalizing any trailing slash on the base URL to avoid double slashes
5. THE Sync_Service SHALL accept base URLs with a maximum length of 2048 characters

### Requirement 8: Error Handling and Resilience

**User Story:** As a user, I want clear feedback when something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. THE Sync_Service SHALL define a typed error structure containing an error code and a user-facing message, where the error code is one of: AUTH_FAILED, NETWORK_ERROR, EXTRACTION_FAILED, PAYLOAD_ERROR, IMPORT_FAILED, NOT_CONFIGURED, SERVER_ERROR
2. WHEN an error occurs during any sync step, THE Sync_Service SHALL return an error object containing the corresponding error code and a non-empty localized message of at most 200 characters describing the failure cause
3. IF a network request fails due to no internet connectivity, DNS resolution failure, or connection timeout, THEN THE Sync_Service SHALL report a NETWORK_ERROR with a message indicating the nature of the connectivity issue
4. THE Sync_Service SHALL not persist the Access_Token beyond the current sync session (token is held in memory only)
5. IF an unexpected error occurs that does not match any defined failure category, THEN THE Sync_Service SHALL report a SERVER_ERROR with a generic message indicating an unexpected failure occurred
