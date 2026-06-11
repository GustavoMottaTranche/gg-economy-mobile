/**
 * CloudSyncService - Orchestrates the full cloud sync import pipeline.
 *
 * Pipeline: validate config → retrieve sync key → extract data → build payload → upload JSON.
 * Implements mutex to prevent concurrent executions, emits progress updates.
 *
 * @module services/cloud-sync/CloudSyncService
 */

import type { Database } from '@db/client';

import { CloudSyncError } from './CloudSyncError';
import { getCloudSyncConfig } from './config';
import { extractAll } from './SyncDataExtractor';
import { getSyncKey } from './SyncKeyStorage';
import { buildPayload } from './SyncPayloadBuilder';
import { uploadImport } from './SyncImportClient';
import type { ImportResult, SyncProgressCallback, SyncStep } from './types';

// ============================================================================
// Types
// ============================================================================

/** Parameters for executing the sync pipeline. */
export interface SyncExecuteParams {
  db: Database;
  onProgress?: SyncProgressCallback;
}

// ============================================================================
// Module State (Mutex)
// ============================================================================

let isRunning = false;

// ============================================================================
// Public API
// ============================================================================

/**
 * Executes the full cloud sync pipeline.
 *
 * Steps (in order):
 * 1. Validate configuration (base URL)
 * 2. Retrieve sync key from secure storage
 * 3. Extract data from local database
 * 4. Build import payload (camelCase → snake_case)
 * 5. Upload payload as JSON to server
 *
 * @param params - Execution parameters including db and progress callback
 * @returns ImportResult on success
 */
export async function execute(params: SyncExecuteParams): Promise<ImportResult> {
  if (isRunning) {
    throw new CloudSyncError('A sync is already in progress', 'ALREADY_RUNNING');
  }

  isRunning = true;

  try {
    const { db, onProgress } = params;

    // Step 0: Validate configuration
    const config = await getCloudSyncConfig();
    const { baseUrl } = config;

    // Step 1: Retrieve sync key
    const syncKey = await getSyncKey();
    if (!syncKey) {
      throw new CloudSyncError(
        'Chave de sincronização não configurada. Cole sua chave nas configurações.',
        'AUTH_FAILED'
      );
    }

    // Step 2: Extract data from local database
    emitProgress(onProgress, 'extracting');
    const extractedData = await extractAll(db);

    // Step 3: Build payload
    emitProgress(onProgress, 'building');
    const payload = buildPayload(extractedData);

    // Step 4: Upload
    emitProgress(onProgress, 'uploading');
    const result = await uploadImport(payload, syncKey, baseUrl);

    return result;
  } finally {
    isRunning = false;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function emitProgress(onProgress: SyncProgressCallback | undefined, step: SyncStep): void {
  if (onProgress) {
    onProgress(step);
  }
}
