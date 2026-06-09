// Feature: future-plans-funds, Property 8: Fund persistence round-trip

/**
 * Property 8: Fund persistence round-trip
 *
 * For any valid fund name (1-50 chars), creating a fund via FundRepository and reading
 * it back SHALL return the same name. For any valid allocation amount (positive integer
 * cents) and valid month (YYYY-MM format), persisting via FundAllocationRepository and
 * reading back SHALL return the same values. For any valid base amount (non-negative
 * integer cents), persisting via FundBalanceRepository and reading back SHALL return
 * the same value.
 *
 * **Validates: Requirements 5.3, 6.2, 7.2**
 */

import * as fc from 'fast-check';
import { FundRepository } from '../repositories/FundRepository';
import { FundAllocationRepository } from '../repositories/FundAllocationRepository';
import { FundBalanceRepository } from '../repositories/FundBalanceRepository';
import type { Fund } from '../types/fund';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockValues = jest.fn();
const mockSet = jest.fn();

jest.mock('../db/client', () => ({
  getDb: () => ({
    select: () => ({
      from: (_table: unknown) => {
        mockFrom(_table);
        return {
          where: (_condition: unknown) => {
            mockWhere(_condition);
            return {
              limit: (_n: number) => {
                mockLimit(_n);
                return mockSelect();
              },
            };
          },
        };
      },
    }),
    insert: (_table: unknown) => {
      mockInsert(_table);
      return {
        values: (data: unknown) => {
          mockValues(data);
          return Promise.resolve();
        },
      };
    },
    update: (_table: unknown) => {
      mockUpdate(_table);
      return {
        set: (data: unknown) => {
          mockSet(data);
          return {
            where: (_condition: unknown) => {
              mockWhere(_condition);
              return Promise.resolve();
            },
          };
        },
      };
    },
  }),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
}));

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a valid fund name (1-50 printable characters, no control chars) */
const validFundNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !hasControlChars(s));

/** Helper to check for control characters without triggering lint rule */
function hasControlChars(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x20) return true;
  }
  return false;
}

/** Generates a valid allocation amount in cents (positive integer, 1 to 99999999999) */
const validAllocationAmountArb = fc.integer({ min: 1, max: 99999999999 });

/** Generates a valid reference month in YYYY-MM format */
const validMonthArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/** Generates a valid base amount in cents (non-negative integer, 0 to 99999999999) */
const validBaseAmountArb = fc.integer({ min: 0, max: 99999999999 });

/** Generates a valid fund ID (UUID-like string) */
const fundIdArb = fc.uuid();

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: future-plans-funds, Property 8: Fund persistence round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fund name round-trip', () => {
    let repository: FundRepository;

    beforeEach(() => {
      repository = new FundRepository();
    });

    it('creating a fund and reading it back returns the same name for any valid name (1-50 chars)', async () => {
      await fc.assert(
        fc.asyncProperty(validFundNameArb, async (name) => {
          const createdFund: Fund = {
            id: 'mock-uuid-test',
            name,
            icon: null,
            color: null,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Mock: after create, getById returns the persisted fund
          mockSelect.mockResolvedValue([
            {
              id: createdFund.id,
              name: createdFund.name,
              icon: createdFund.icon,
              color: createdFund.color,
              isActive: createdFund.isActive,
              createdAt: createdFund.createdAt,
              updatedAt: createdFund.updatedAt,
            },
          ]);

          // Act: create the fund
          const result = await repository.create({ name });

          // Assert: the returned fund has the same name
          expect(result.name).toBe(name);

          // Assert: values passed to insert contain the exact name
          expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ name }));
        }),
        { numRuns: 100 }
      );
    });

    it('getById returns the exact name stored for any valid fund name', async () => {
      await fc.assert(
        fc.asyncProperty(validFundNameArb, fundIdArb, async (name, fundId) => {
          const storedFund = {
            id: fundId,
            name,
            icon: null,
            color: null,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Mock the database to return the stored fund
          mockSelect.mockResolvedValue([storedFund]);

          // Act
          const result = await repository.getById(fundId);

          // Assert: returned fund has the exact same name
          expect(result).not.toBeNull();
          expect(result!.name).toBe(name);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Fund allocation round-trip', () => {
    let repository: FundAllocationRepository;

    beforeEach(() => {
      repository = new FundAllocationRepository();
    });

    it('upserting an allocation and reading it back returns the same amount and month', async () => {
      await fc.assert(
        fc.asyncProperty(
          fundIdArb,
          validMonthArb,
          validAllocationAmountArb,
          async (fundId, month, amount) => {
            // Mock: getByFundAndMonth returns null (no existing allocation) for upsert
            mockSelect.mockResolvedValueOnce([]);

            // Act: upsert the allocation
            const result = await repository.upsert(fundId, month, amount);

            // Assert: the returned allocation has the same amount and month
            expect(result.amount).toBe(amount);
            expect(result.referenceMonth).toBe(month);
            expect(result.fundId).toBe(fundId);

            // Assert: values passed to insert contain the exact amount and month
            expect(mockValues).toHaveBeenCalledWith(
              expect.objectContaining({
                fundId,
                referenceMonth: month,
                amount,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getByFundAndMonth returns the exact amount and month stored', async () => {
      await fc.assert(
        fc.asyncProperty(
          fundIdArb,
          validMonthArb,
          validAllocationAmountArb,
          async (fundId, month, amount) => {
            const storedAllocation = {
              id: 'mock-alloc-id',
              fundId,
              referenceMonth: month,
              amount,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

            // Mock the database to return the stored allocation
            mockSelect.mockResolvedValue([storedAllocation]);

            // Act
            const result = await repository.getByFundAndMonth(fundId, month);

            // Assert: returned allocation has the exact same amount and month
            expect(result).not.toBeNull();
            expect(result!.amount).toBe(amount);
            expect(result!.referenceMonth).toBe(month);
            expect(result!.fundId).toBe(fundId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fund balance round-trip', () => {
    let repository: FundBalanceRepository;

    beforeEach(() => {
      repository = new FundBalanceRepository();
    });

    it('upserting a base balance and reading it back returns the same amount', async () => {
      await fc.assert(
        fc.asyncProperty(fundIdArb, validBaseAmountArb, async (fundId, baseAmount) => {
          // Mock: getByFundId returns null (no existing balance) for upsert
          mockSelect.mockResolvedValueOnce([]);

          // Act: upsert the balance
          const result = await repository.upsert(fundId, baseAmount);

          // Assert: the returned balance has the same base amount
          expect(result.baseAmount).toBe(baseAmount);
          expect(result.fundId).toBe(fundId);

          // Assert: values passed to insert contain the exact base amount
          expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({
              fundId,
              baseAmount,
            })
          );
        }),
        { numRuns: 100 }
      );
    });

    it('getByFundId returns the exact base amount stored', async () => {
      await fc.assert(
        fc.asyncProperty(fundIdArb, validBaseAmountArb, async (fundId, baseAmount) => {
          const storedBalance = {
            id: 'mock-balance-id',
            fundId,
            baseAmount,
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Mock the database to return the stored balance
          mockSelect.mockResolvedValue([storedBalance]);

          // Act
          const result = await repository.getByFundId(fundId);

          // Assert: returned balance has the exact same base amount
          expect(result).not.toBeNull();
          expect(result!.baseAmount).toBe(baseAmount);
          expect(result!.fundId).toBe(fundId);
        }),
        { numRuns: 100 }
      );
    });
  });
});
