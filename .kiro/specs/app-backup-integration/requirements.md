# Requirements Document

## Introduction

Integração do aplicativo mobile GG Economy com o backend de backup customizado (self-hosted). O backend já está implementado e oferece uma REST API para upload, listagem, download e exclusão de arquivos de backup SQLite (.db). Esta integração adiciona o servidor customizado como alternativa ao Google Drive para backup, permitindo que o usuário configure a URL do servidor e a chave de API, e realize operações de backup/restore diretamente pelo app.

## Glossary

- **Backup_Client**: Módulo de serviço no app mobile responsável por comunicar-se com a REST API do backend de backup
- **Backup_Server**: O backend Node.js/Express que armazena e gerencia os arquivos de backup
- **Settings_Store**: O armazenamento persistente (AsyncStorage/SecureStore) que guarda as configurações do servidor de backup (URL, API key)
- **Database_File**: O arquivo SQLite (.db) do app GG Economy contendo dados financeiros do usuário
- **API_Key**: Token secreto enviado no header `x-api-key` para autenticação com o Backup_Server
- **Device_ID**: Identificador único do dispositivo enviado no header `x-device-id` para associar backups ao dispositivo
- **Backup_Metadata**: Informações sobre um backup incluindo filename, timestamp de criação e tamanho em bytes
- **Server_Configuration**: Conjunto de configurações (URL do servidor, API key) necessárias para conectar ao Backup_Server
- **Backup_Settings_Screen**: Tela de configurações de backup existente no app (`app/(tabs)/settings/backup.tsx`)

## Requirements

### Requirement 1: Backup Client Service

**User Story:** As a mobile app user, I want the app to have a service module that communicates with the backup server, so that I can perform backup operations through the custom server.

#### Acceptance Criteria

1. THE Backup_Client SHALL expose methods for upload, list, download, and delete operations against the Backup_Server REST API
2. WHEN performing any request, THE Backup_Client SHALL include the API_Key in the `x-api-key` header
3. WHEN performing any request, THE Backup_Client SHALL include the Device_ID in the `x-device-id` header
4. THE Backup_Client SHALL use the base URL from the Server_Configuration to construct endpoint URLs, where Server_Configuration is a stored setting containing the server's scheme and host (e.g., `http://192.168.1.10:3000`)
5. WHEN uploading a file, THE Backup_Client SHALL send the Database_File as `multipart/form-data` to `POST /api/backups`
6. WHEN listing backups, THE Backup_Client SHALL send a GET request to `/api/backups` and return an array of Backup_Metadata objects, or an empty array if no backups exist
7. WHEN downloading a backup, THE Backup_Client SHALL send a GET request to `/api/backups/:filename` and save the response body to the application's cache directory
8. WHEN deleting a backup, THE Backup_Client SHALL send a DELETE request to `/api/backups/:filename` and return a success indicator upon receiving HTTP status 200
9. IF the Backup_Server responds with a non-2xx HTTP status code, THEN THE Backup_Client SHALL throw an error containing the HTTP status code and the error message from the response body
10. IF a network request does not receive a response within 30 seconds, THEN THE Backup_Client SHALL abort the request and throw a timeout error
11. IF the API_Key or Device_ID is not configured when a request is attempted, THEN THE Backup_Client SHALL throw a configuration error without making the network request

### Requirement 2: Server Configuration Storage

**User Story:** As a mobile app user, I want to configure the backup server URL and API key in the app settings, so that I can connect to my self-hosted backup server.

#### Acceptance Criteria

1. THE Settings_Store SHALL persist the Server_Configuration (server URL and API_Key) across app restarts
2. THE Settings_Store SHALL store the API_Key using expo-secure-store for secure storage
3. THE Settings_Store SHALL store the server URL using AsyncStorage
4. WHEN the user saves a Server_Configuration, THE Settings_Store SHALL validate that the server URL is a well-formed HTTP or HTTPS URL containing a scheme and host, and not exceeding 2048 characters in length
5. IF the server URL fails validation, THEN THE Settings_Store SHALL reject the save operation and provide an error indication specifying that the URL is invalid
6. WHEN the user saves a Server_Configuration, THE Settings_Store SHALL validate that the API_Key, after trimming leading and trailing whitespace, contains at least 1 character and does not exceed 256 characters in length
7. IF the API_Key fails validation, THEN THE Settings_Store SHALL reject the save operation and provide an error indication specifying that the API key is invalid
8. THE Settings_Store SHALL provide a method to clear all Server_Configuration data from both AsyncStorage and expo-secure-store

### Requirement 3: Device Identification

**User Story:** As a mobile app user, I want the app to automatically identify my device to the backup server, so that my backups are associated with my device.

#### Acceptance Criteria

1. WHEN the Backup_Client is launched for the first time and no Device_ID exists in persistent storage, THE Backup_Client SHALL generate a Device_ID as a 32-character hexadecimal string (16 random bytes) using expo-crypto and persist it using expo-secure-store
2. WHEN the Backup_Client is launched and a Device_ID already exists in persistent storage, THE Backup_Client SHALL retrieve and use the existing Device_ID without generating a new one
3. THE Backup_Client SHALL include the Device_ID in every request sent to the Backup_Server
4. IF the Backup_Client fails to read the Device_ID from persistent storage, THEN THE Backup_Client SHALL generate a new Device_ID, persist it, and display a message indicating that previous backups may not be accessible from this device
5. WHEN the app is reinstalled or app data is cleared, THE Backup_Client SHALL generate a new Device_ID, resulting in a new User_Directory on the Backup_Server

### Requirement 4: Upload Backup to Server

**User Story:** As a mobile app user, I want to upload my SQLite database to the backup server, so that I have a remote copy of my financial data.

#### Acceptance Criteria

1. WHEN the user triggers a backup, THE Backup_Client SHALL export the current Database_File to the application's cache directory as a temporary file
2. WHEN the export is complete, THE Backup_Client SHALL upload the temporary file to the Backup_Server via an HTTP POST request within a timeout of 60 seconds
3. WHEN the upload succeeds, THE Backup_Client SHALL return the filename (string), timestamp (ISO 8601 date), and file size in bytes (number) from the server response
4. WHEN the upload completes (success or failure), THE Backup_Client SHALL delete the temporary file from the cache directory
5. WHILE uploading, THE Backup_Client SHALL report progress to the caller via a callback function providing the current stage ("exporting" or "uploading"), a numeric progress value between 0 and 1, and a descriptive message string
6. IF the Database_File does not exist, THEN THE Backup_Client SHALL return an error with code "DATABASE_NOT_FOUND"
7. IF the export operation fails to copy the Database_File, THEN THE Backup_Client SHALL return an error with code "EXPORT_FAILED"
8. IF the upload fails due to a network error or the server responds with a non-success HTTP status, THEN THE Backup_Client SHALL return an error with code "UPLOAD_FAILED" and include the underlying error details

### Requirement 5: List Backups from Server

**User Story:** As a mobile app user, I want to see a list of my available backups on the server, so that I can choose which one to restore or delete.

#### Acceptance Criteria

1. WHEN the user requests the backup list, THE Backup_Client SHALL send a GET request to the Backup_Server and return an array of BackupMetadata objects sorted by creation date descending (newest first)
2. WHEN mapping each server response item to the app BackupMetadata interface, THE Backup_Client SHALL set the `id` field to the backup filename, set `fileName` to the backup filename, convert the `createdAt` ISO 8601 string to a Date object, copy `sizeBytes` as-is, and set `schemaVersion` to 0 to indicate unknown
3. WHEN the server returns an empty list, THE Backup_Client SHALL return an empty array
4. IF the Backup_Server returns an HTTP error status, THEN THE Backup_Client SHALL propagate the error using the error codes defined in Requirement 8

### Requirement 6: Download and Restore Backup

**User Story:** As a mobile app user, I want to download a backup from the server and restore it, so that I can recover my financial data.

#### Acceptance Criteria

1. WHEN the user selects a backup to restore by filename, THE Backup_Client SHALL send a GET request with the Device_ID and backup filename to the Backup_Server and save the downloaded file to the device cache directory with a unique temporary filename
2. WHILE downloading, THE Backup_Client SHALL report progress to the caller via a callback function providing the current stage, a numeric progress value between 0 and 1, and a descriptive message
3. WHEN the download completes successfully, THE Backup_Client SHALL return the local file path of the downloaded backup for the RestoreService to process
4. IF the requested backup does not exist on the server (HTTP 404 response), THEN THE Backup_Client SHALL return an error with code "NOT_FOUND" and a message indicating the backup was not found
5. IF the download fails due to a network error or the server responds with a non-success HTTP status, THEN THE Backup_Client SHALL return an error with code "DOWNLOAD_FAILED" and delete any partially downloaded temporary file
6. IF the download does not complete within 120 seconds, THEN THE Backup_Client SHALL abort the request, delete any partial temporary file, and return an error with code "DOWNLOAD_FAILED"

### Requirement 7: Delete Backup from Server

**User Story:** As a mobile app user, I want to delete old backups from the server, so that I can manage my storage space.

#### Acceptance Criteria

1. WHEN the user requests deletion of a backup, THE Backup_Client SHALL send a DELETE request to the Backup_Server with the backup filename and the Device_ID in the `x-device-id` header
2. WHEN the deletion succeeds (HTTP 200), THE Backup_Client SHALL return a success confirmation object
3. IF the backup does not exist on the server (HTTP 404), THEN THE Backup_Client SHALL return an error with code "NOT_FOUND"
4. IF the Backup_Server returns any other non-success HTTP status, THEN THE Backup_Client SHALL propagate the error using the error codes defined in Requirement 8

### Requirement 8: Error Handling

**User Story:** As a mobile app user, I want clear error messages when backup operations fail, so that I can understand what went wrong and take corrective action.

#### Acceptance Criteria

1. IF the Backup_Server returns HTTP status 401, THEN THE Backup_Client SHALL return an error with code "AUTH_FAILED" and a message indicating invalid API key
2. IF the Backup_Server returns HTTP status 413, THEN THE Backup_Client SHALL return an error with code "FILE_TOO_LARGE" and a message indicating the 50 MB limit
3. IF a network error occurs (no connection or DNS failure) or the Backup_Server does not respond within 30 seconds, THEN THE Backup_Client SHALL return an error with code "NETWORK_ERROR" and a message indicating the type of failure that occurred (timeout, no connection, or DNS resolution)
4. IF the Backup_Server returns HTTP status 400, THEN THE Backup_Client SHALL return an error with code "BAD_REQUEST" and include the error message from the server response body
5. IF the Backup_Server returns HTTP status 500, THEN THE Backup_Client SHALL return an error with code "SERVER_ERROR" and a message indicating a server-side issue
6. IF the Server_Configuration is not set (server URL is absent or API_Key is absent), THEN THE Backup_Client SHALL return an error with code "NOT_CONFIGURED" before attempting any network request
7. IF the Backup_Server returns an HTTP status code not explicitly handled (any status outside 2xx other than 400, 401, 413, 500), THEN THE Backup_Client SHALL return an error with code "UNKNOWN_ERROR" and a message including the HTTP status code received
8. THE Backup_Client SHALL return all errors as objects containing at minimum a `code` field (string) and a `message` field (string)

### Requirement 9: Connection Validation

**User Story:** As a mobile app user, I want to test the connection to the backup server, so that I can verify my configuration is correct before performing backups.

#### Acceptance Criteria

1. WHEN the user requests a connection test, THE Backup_Client SHALL send a GET request to the `/api/health` endpoint of the configured server with a timeout of 10 seconds
2. WHEN the health endpoint returns HTTP status 200 within the timeout period, THE Backup_Client SHALL display a success indication to the user
3. IF the health endpoint is unreachable due to a network error, THEN THE Backup_Client SHALL display an error message indicating the server could not be reached
4. IF the health endpoint returns a non-200 HTTP status, THEN THE Backup_Client SHALL display an error message indicating the server responded with an unexpected status
5. IF no server URL is configured when the user requests a connection test, THEN THE Backup_Client SHALL display an error message indicating that a server URL must be configured before testing

### Requirement 10: Settings UI Integration

**User Story:** As a mobile app user, I want to configure and use the custom backup server from the backup settings screen, so that I have a unified backup management experience.

#### Acceptance Criteria

1. THE Backup_Settings_Screen SHALL display input fields for the server URL (maximum 2048 characters) and API_Key (maximum 256 characters)
2. THE Backup_Settings_Screen SHALL persist the server URL and API_Key locally on the device so that the user does not need to re-enter them on subsequent visits
3. THE Backup_Settings_Screen SHALL display a "Test Connection" button that sends a request to the server health endpoint using the configured URL and validates the API_Key by performing an authenticated list backups request
4. WHEN the connection test succeeds, THE Backup_Settings_Screen SHALL display a visible success indicator (e.g., text label or icon) within 1 second of receiving the server response
5. IF the connection test fails, THEN THE Backup_Settings_Screen SHALL display an error message indicating the failure reason (unreachable server, invalid API_Key, or timeout after 15 seconds)
6. WHILE the Backup_Settings_Screen has a valid saved connection (last test succeeded), THE Backup_Settings_Screen SHALL display a list of up to 50 backups available on the custom server sorted by date descending
7. THE Backup_Settings_Screen SHALL allow the user to trigger a manual backup to the custom server and SHALL display a loading indicator during the upload
8. WHEN a manual backup upload completes successfully, THE Backup_Settings_Screen SHALL display a success indicator and refresh the backup list
9. THE Backup_Settings_Screen SHALL allow the user to restore a backup from the custom server after displaying a confirmation prompt warning that local data will be overwritten
10. THE Backup_Settings_Screen SHALL allow the user to delete a backup from the custom server after displaying a confirmation prompt
11. IF a backup, restore, or delete operation fails, THEN THE Backup_Settings_Screen SHALL display an error message indicating the failure reason and SHALL NOT modify the backup list until refreshed
