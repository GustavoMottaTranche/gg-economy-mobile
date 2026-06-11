/**
 * SyncImportClient Tests
 */
import { uploadImport } from '../SyncImportClient';
import type { ImportPayload } from '../types';

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/com.gg-economy/files/',
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const SYNC_KEY = 'gge_testkey123456789';
const BASE_URL = 'https://gg-economy.lovable.app';

const VALID_PAYLOAD: ImportPayload = {
  tables: {
    categories: [],
    funds: [],
    installment_groups: [],
    recurring_transactions: [],
    weekly_recurring_groups: [],
    fund_allocations: [],
    transactions: [],
    recurring_fund_links: [],
    weekly_occurrences: [],
    budget_goals: [],
  },
};

function mockResponse(status: number, body: unknown): Partial<Response> {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    text: jest.fn().mockResolvedValue(text),
  };
}

describe('SyncImportClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful upload', () => {
    it('should return ImportResult on 200', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, {
          ok: true,
          totals: { ok: 42, failed: 0, skipped: 0 },
          results: { categories: { ok: 10, failed: 0, skipped: 0 } },
        })
      );

      const result = await uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL);

      expect(result.totals.ok).toBe(42);
      expect(result.tables.categories).toEqual({ ok: 10, failed: 0, skipped: 0 });
    });

    it('should call correct URL with X-Sync-Key', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { ok: true, totals: { ok: 0, failed: 0, skipped: 0 }, results: {} })
      );

      await uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gg-economy.lovable.app/api/public/sync/import',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-Sync-Key': SYNC_KEY }),
        })
      );
    });
  });

  describe('error responses', () => {
    it('should throw AUTH_FAILED on 401', async () => {
      mockFetch.mockResolvedValue(mockResponse(401, { error: 'Invalid key' }));
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'AUTH_FAILED',
        httpStatus: 401,
      });
    });

    it('should throw IMPORT_FAILED on 400', async () => {
      mockFetch.mockResolvedValue(mockResponse(400, { message: 'Bad request' }));
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'IMPORT_FAILED',
        httpStatus: 400,
      });
    });

    it('should throw IMPORT_FAILED on 500', async () => {
      mockFetch.mockResolvedValue(mockResponse(500, { message: 'Server error' }));
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'IMPORT_FAILED',
        httpStatus: 500,
      });
    });

    it('should throw SERVER_ERROR on unexpected status', async () => {
      mockFetch.mockResolvedValue(mockResponse(403, {}));
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        httpStatus: 403,
      });
    });
  });

  describe('network errors', () => {
    it('should throw NETWORK_ERROR on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network failed'));
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });

    it('should throw NETWORK_ERROR on timeout', async () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      mockFetch.mockRejectedValue(err);
      await expect(uploadImport(VALID_PAYLOAD, SYNC_KEY, BASE_URL)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });
});
