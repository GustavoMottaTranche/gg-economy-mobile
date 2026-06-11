/**
 * useCloudSync Hook
 *
 * Custom hook for managing the cloud sync import state.
 * Handles sync key management, triggering the sync pipeline,
 * tracking progress, and managing success/error results.
 *
 * @module hooks/useCloudSync
 */
import { useState, useCallback, useEffect } from 'react';

import { getDb } from '../db/client';
import { CloudSyncError } from '../services/cloud-sync/CloudSyncError';
import { execute } from '../services/cloud-sync/CloudSyncService';
import { getCloudSyncConfig } from '../services/cloud-sync/config';
import {
  getSyncKey,
  setSyncKey,
  removeSyncKey,
  validateSyncKey,
  isValidSyncKeyFormat,
} from '../services/cloud-sync/SyncKeyStorage';
import type { ImportResult, SyncStep } from '../services/cloud-sync/types';

// ============================================================================
// Types
// ============================================================================

/** Return type for the useCloudSync hook. */
export interface UseCloudSyncReturn {
  /** Whether a sync operation is currently in progress. */
  isRunning: boolean;
  /** The current pipeline step being executed, or null if idle. */
  currentStep: SyncStep | null;
  /** The import result on successful completion, or null. */
  result: ImportResult | null;
  /** The error from the last failed sync, or null. */
  error: CloudSyncError | null;
  /** Whether a sync key is currently stored. */
  hasKey: boolean;
  /** Whether the sync key is being validated. */
  isValidating: boolean;
  /** Whether the stored key has been validated successfully. */
  isKeyValid: boolean | null;

  /** Saves and validates a sync key. */
  saveSyncKey: (key: string) => Promise<void>;
  /** Removes the stored sync key. */
  removeSyncKeyAction: () => Promise<void>;
  /** Starts the sync pipeline (uses stored sync key). */
  startSync: () => Promise<void>;
  /** Clears the stored result. */
  clearResult: () => void;
  /** Clears the stored error. */
  clearError: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing cloud sync import state.
 *
 * Provides state for sync key management and sync pipeline progress,
 * along with actions to save/remove keys and trigger sync.
 *
 * @returns UseCloudSyncReturn - sync state and actions
 */
export function useCloudSync(): UseCloudSyncReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<SyncStep | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<CloudSyncError | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  // Load stored key status on mount
  useEffect(() => {
    getSyncKey().then((key) => {
      setHasKey(!!key);
    });
  }, []);

  const saveSyncKey = useCallback(async (key: string): Promise<void> => {
    const trimmed = key.trim();

    if (!isValidSyncKeyFormat(trimmed)) {
      throw new CloudSyncError(
        'Formato de chave inválido. A chave deve começar com "gge_"',
        'AUTH_FAILED'
      );
    }

    setIsValidating(true);
    setError(null);
    setIsKeyValid(null);

    try {
      // Get base URL for validation
      const config = await getCloudSyncConfig();

      // Validate against server
      await validateSyncKey(trimmed, config.baseUrl);

      // Store on success
      await setSyncKey(trimmed);
      setHasKey(true);
      setIsKeyValid(true);
    } catch (err: unknown) {
      setIsKeyValid(false);
      if (err instanceof CloudSyncError) {
        setError(err);
        throw err;
      }
      const wrapped = new CloudSyncError(
        err instanceof Error ? err.message : 'Erro ao validar chave',
        'SERVER_ERROR'
      );
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const removeSyncKeyAction = useCallback(async (): Promise<void> => {
    await removeSyncKey();
    setHasKey(false);
    setIsKeyValid(null);
  }, []);

  const startSync = useCallback(async (): Promise<void> => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentStep(null);
    setResult(null);
    setError(null);

    try {
      const db = getDb();

      const importResult = await execute({
        db,
        onProgress: (step: SyncStep) => {
          setCurrentStep(step);
        },
      });

      setResult(importResult);
    } catch (err: unknown) {
      if (err instanceof CloudSyncError) {
        setError(err);
      } else {
        setError(
          new CloudSyncError(
            err instanceof Error ? err.message : 'Unexpected error occurred',
            'SERVER_ERROR'
          )
        );
      }
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRunning,
    currentStep,
    result,
    error,
    hasKey,
    isValidating,
    isKeyValid,
    saveSyncKey,
    removeSyncKeyAction,
    startSync,
    clearResult,
    clearError,
  };
}

export default useCloudSync;
