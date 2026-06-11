/**
 * SyncImportClient - Uploads the constructed payload to the server.
 *
 * Sends the import payload as JSON to the sync/import endpoint with
 * X-Sync-Key header authentication. Applies a 120-second timeout.
 *
 * @module services/cloud-sync/SyncImportClient
 */

import { CloudSyncError } from './CloudSyncError';
import { buildEndpointUrl } from './config';
import type { ImportPayload, ImportResult } from './types';

/** API path for the JSON import endpoint. */
const IMPORT_PATH = '/api/public/sync/import';

/** Upload timeout in ms (2 minutes). */
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Uploads the import payload as JSON to the server.
 *
 * @param payload - The import payload containing all table data
 * @param syncKey - The sync key for X-Sync-Key authentication
 * @param baseUrl - The validated base URL of the sync server
 * @returns ImportResult with totals and per-table results
 */
export async function uploadImport(
  payload: ImportPayload,
  syncKey: string,
  baseUrl: string
): Promise<ImportResult> {
  const url = buildEndpointUrl(baseUrl, IMPORT_PATH);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    const body = safeParseJson(responseText);

    if (response.status === 401) {
      throw new CloudSyncError(
        'Chave inválida ou revogada — gere uma nova no web',
        'AUTH_FAILED',
        401
      );
    }

    if (response.status === 400) {
      const message = body?.message ?? body?.error ?? 'Requisição inválida';
      throw new CloudSyncError(`Servidor rejeitou o import: ${message}`, 'IMPORT_FAILED', 400);
    }

    if (response.status === 500) {
      const message = body?.message ?? body?.error ?? 'Erro interno do servidor';
      throw new CloudSyncError(`Erro no servidor: ${message}`, 'IMPORT_FAILED', 500);
    }

    if (response.status === 200) {
      if (!body) {
        throw new CloudSyncError(
          `Resposta inválida: ${responseText.substring(0, 200)}`,
          'SERVER_ERROR',
          200
        );
      }

      const result = extractImportResult(body);
      if (!result) {
        throw new CloudSyncError(
          `Formato inesperado (200): ${responseText.substring(0, 300)}`,
          'SERVER_ERROR',
          200
        );
      }

      return result;
    }

    throw new CloudSyncError(
      `Resposta inesperada (status: ${response.status}): ${responseText.substring(0, 200)}`,
      'SERVER_ERROR',
      response.status
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof CloudSyncError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudSyncError(
        'Tempo limite excedido. Verifique sua internet e tente novamente',
        'NETWORK_ERROR'
      );
    }

    throw new CloudSyncError(
      `Falha no upload: ${error instanceof Error ? error.message : String(error)}`,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Safely parses a JSON string, returning null on failure.
 */
function safeParseJson(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extracts ImportResult from the server response body.
 * Server format: { ok: true, totals: { ok, failed, skipped }, results: {...} }
 */
function extractImportResult(body: Record<string, unknown>): ImportResult | null {
  // Format: { totals: { ok, failed, skipped }, results/tables: {...} }
  if (body.totals && typeof body.totals === 'object') {
    const totals = body.totals as Record<string, unknown>;
    if (
      typeof totals.ok === 'number' &&
      typeof totals.failed === 'number' &&
      typeof totals.skipped === 'number'
    ) {
      return {
        totals: { ok: totals.ok, failed: totals.failed, skipped: totals.skipped },
        tables:
          (body.results as ImportResult['tables']) ?? (body.tables as ImportResult['tables']) ?? {},
      };
    }
  }

  // { ok: true } without totals — empty import success
  if (body.ok === true) {
    return { totals: { ok: 0, failed: 0, skipped: 0 }, tables: {} };
  }

  return null;
}
