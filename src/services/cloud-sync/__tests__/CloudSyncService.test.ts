import { CloudSyncError } from '../CloudSyncError';
import { execute } from '../CloudSyncService';
import type { ExtractedData, ImportPayload, ImportResult } from '../types';

// Mock dependencies
jest.mock('../config', () => ({
  getCloudSyncConfig: jest.fn(),
}));

jest.mock('../SyncKeyStorage', () => ({
  getSyncKey: jest.fn(),
}));

jest.mock('../SyncDataExtractor', () => ({
  extractAll: jest.fn(),
}));

jest.mock('../SyncPayloadBuilder', () => ({
  buildPayload: jest.fn(),
}));

jest.mock('../SyncImportClient', () => ({
  uploadImport: jest.fn(),
}));

import { getCloudSyncConfig } from '../config';
import { getSyncKey } from '../SyncKeyStorage';
import { extractAll } from '../SyncDataExtractor';
import { buildPayload } from '../SyncPayloadBuilder';
import { uploadImport } from '../SyncImportClient';

const mockGetCloudSyncConfig = getCloudSyncConfig as jest.MockedFunction<typeof getCloudSyncConfig>;
const mockGetSyncKey = getSyncKey as jest.MockedFunction<typeof getSyncKey>;
const mockExtractAll = extractAll as jest.MockedFunction<typeof extractAll>;
const mockBuildPayload = buildPayload as jest.MockedFunction<typeof buildPayload>;
const mockUploadImport = uploadImport as jest.MockedFunction<typeof uploadImport>;

const mockDb = {} as never;
const BASE_URL = 'https://gg-economy.lovable.app';
const SYNC_KEY = 'gge_testkey123456789';

const mockExtractedData: ExtractedData = {
  categories: [],
  funds: [],
  fundAllocations: [],
  transactions: [],
  recurringTransactions: [],
  weeklyRecurringGroups: [],
  weeklyOccurrences: [],
  recurringFundLinks: [],
  categoryGoals: [],
};

const mockPayload: ImportPayload = {
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

const mockImportResult: ImportResult = {
  totals: { ok: 10, failed: 0, skipped: 0 },
  tables: { categories: { ok: 10, failed: 0, skipped: 0 } },
};

describe('CloudSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCloudSyncConfig.mockResolvedValue({ baseUrl: BASE_URL });
    mockGetSyncKey.mockResolvedValue(SYNC_KEY);
    mockExtractAll.mockResolvedValue(mockExtractedData);
    mockBuildPayload.mockReturnValue(mockPayload);
    mockUploadImport.mockResolvedValue(mockImportResult);
  });

  it('should execute full pipeline and return result', async () => {
    const result = await execute({ db: mockDb });

    expect(result).toEqual(mockImportResult);
    expect(mockGetCloudSyncConfig).toHaveBeenCalled();
    expect(mockGetSyncKey).toHaveBeenCalled();
    expect(mockExtractAll).toHaveBeenCalledWith(mockDb);
    expect(mockBuildPayload).toHaveBeenCalledWith(mockExtractedData);
    expect(mockUploadImport).toHaveBeenCalledWith(mockPayload, SYNC_KEY, BASE_URL);
  });

  it('should emit progress steps in order', async () => {
    const onProgress = jest.fn();
    await execute({ db: mockDb, onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[0][0]).toBe('extracting');
    expect(onProgress.mock.calls[1][0]).toBe('building');
    expect(onProgress.mock.calls[2][0]).toBe('uploading');
  });

  it('should throw AUTH_FAILED when no sync key stored', async () => {
    mockGetSyncKey.mockResolvedValue(null);
    await expect(execute({ db: mockDb })).rejects.toMatchObject({ code: 'AUTH_FAILED' });
  });

  it('should throw NOT_CONFIGURED when config fails', async () => {
    mockGetCloudSyncConfig.mockRejectedValue(
      new CloudSyncError('Not configured', 'NOT_CONFIGURED')
    );
    await expect(execute({ db: mockDb })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('should prevent concurrent execution', async () => {
    let resolve: ((v: ExtractedData) => void) | undefined;
    mockExtractAll.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );

    const first = execute({ db: mockDb });
    await expect(execute({ db: mockDb })).rejects.toMatchObject({ code: 'ALREADY_RUNNING' });

    resolve!(mockExtractedData);
    await first;
  });

  it('should reset mutex after failure', async () => {
    mockExtractAll.mockRejectedValueOnce(new CloudSyncError('Failed', 'EXTRACTION_FAILED'));
    await expect(execute({ db: mockDb })).rejects.toMatchObject({ code: 'EXTRACTION_FAILED' });

    mockExtractAll.mockResolvedValueOnce(mockExtractedData);
    const result = await execute({ db: mockDb });
    expect(result).toEqual(mockImportResult);
  });
});
