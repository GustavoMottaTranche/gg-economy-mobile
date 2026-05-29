// Feature: statement-payment-integration, Property 8: Occurrence update persists amount and sets isValueEdited flag

/**
 * Property 8: Occurrence update persists amount and sets isValueEdited flag
 *
 * For any valid positive amount and any existing weekly occurrence, calling
 * updateOccurrence with that amount SHALL persist the new amount value and
 * set isValueEdited to true on the resulting record.
 *
 * **Validates: Requirements 2.2**
 */

import * as fc from 'fast-check';
import { useWeeklyRecurringStore } from '../stores/weeklyRecurringStore';
import type { WeeklyOccurrence } from '../types/weeklyRecurring';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdate = jest.fn();
const mockGetByMonth = jest.fn();
const mockGetMonthlyTotal = jest.fn();

jest.mock('../repositories/WeeklyOccurrenceRepository', () => ({
  weeklyOccurrenceRepository: {
    update: (...args: unknown[]) => mockUpdate(...args),
    getByMonth: (...args: unknown[]) => mockGetByMonth(...args),
    getMonthlyTotal: (...args: unknown[]) => mockGetMonthlyTotal(...args),
  },
}));

jest.mock('../services/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../services/weekly-recurring/WeeklyRecurringService', () => ({
  weeklyRecurringService: {
    getActiveGroups: jest.fn().mockResolvedValue([]),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
  },
}));

jest.mock('../services/weekly-recurring/OccurrenceGenerator', () => ({
  occurrenceGenerator: {
    generateForMonth: jest.fn(),
  },
}));

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a UUID-like string */
const uuidArb = fc.uuid();

/** Generates a valid positive amount (0.01 to 99999.99) */
const positiveAmountArb = fc.integer({ min: 1, max: 9999999 }).map((n) => n / 100);

/** Generates a reference month in YYYY-MM format */
const referenceMonthArb = fc
  .integer({ min: 2020, max: 2030 })
  .chain((year) =>
    fc
      .integer({ min: 1, max: 12 })
      .map((month) => `${year}-${String(month).padStart(2, '0')}`)
  );

/** Generates a valid date string (YYYY-MM-DD) within a given month */
const dateInMonthArb = (refMonth: string): fc.Arbitrary<string> => {
  const [yearStr, monthStr] = refMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  return fc
    .integer({ min: 1, max: daysInMonth })
    .map((day) => `${refMonth}-${String(day).padStart(2, '0')}`);
};

/** Generates a WeeklyOccurrence for a given id and month */
const weeklyOccurrenceArb = (
  occId: string,
  refMonth: string
): fc.Arbitrary<WeeklyOccurrence> =>
  fc.record({
    id: fc.constant(occId),
    weeklyGroupId: uuidArb,
    date: dateInMonthArb(refMonth),
    referenceMonth: fc.constant(refMonth),
    amount: positiveAmountArb,
    description: fc.string({ maxLength: 30 }),
    isValueEdited: fc.constant(false), // Start with false to verify it gets set to true
    isPaid: fc.boolean(),
    createdAt: fc.constant('2023-01-01T00:00:00Z'),
    updatedAt: fc.constant('2023-01-01T00:00:00Z'),
  });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: statement-payment-integration, Property 8: Occurrence update persists amount and sets isValueEdited flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Zustand store state
    useWeeklyRecurringStore.setState({
      groups: [],
      occurrences: {},
      monthlyTotals: {},
      isLoading: false,
      error: null,
      expandedGroupIds: new Set<string>(),
    });
  });

  it('updateOccurrence persists the new amount and sets isValueEdited to true for any valid positive amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb.chain((occId) =>
          referenceMonthArb.chain((refMonth) =>
            fc
              .tuple(
                weeklyOccurrenceArb(occId, refMonth),
                positiveAmountArb
              )
              .map(([occurrence, newAmount]) => ({ occurrence, newAmount, refMonth }))
          )
        ),
        async ({ occurrence, newAmount, refMonth }) => {
          // Setup mock: repository.update returns the updated occurrence
          const updatedOccurrence: WeeklyOccurrence = {
            ...occurrence,
            amount: newAmount,
            isValueEdited: true,
            updatedAt: new Date().toISOString(),
          };
          mockUpdate.mockResolvedValueOnce(updatedOccurrence);
          mockGetByMonth.mockResolvedValueOnce([updatedOccurrence]);
          mockGetMonthlyTotal.mockResolvedValueOnce(newAmount);

          // Act: call updateOccurrence with the new amount
          await useWeeklyRecurringStore.getState().updateOccurrence(occurrence.id, {
            amount: newAmount,
          });

          // Assert: repository.update was called with the correct id and fields
          expect(mockUpdate).toHaveBeenCalledWith(occurrence.id, {
            amount: newAmount,
            isValueEdited: true,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updateOccurrence sets isValueEdited to true regardless of the original isValueEdited state', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb.chain((occId) =>
          referenceMonthArb.chain((refMonth) =>
            fc
              .tuple(
                // Generate occurrence with isValueEdited as either true or false
                fc.record({
                  id: fc.constant(occId),
                  weeklyGroupId: uuidArb,
                  date: dateInMonthArb(refMonth),
                  referenceMonth: fc.constant(refMonth),
                  amount: positiveAmountArb,
                  description: fc.string({ maxLength: 30 }),
                  isValueEdited: fc.boolean(), // Can be true or false initially
                  isPaid: fc.boolean(),
                  createdAt: fc.constant('2023-01-01T00:00:00Z'),
                  updatedAt: fc.constant('2023-01-01T00:00:00Z'),
                }),
                positiveAmountArb
              )
              .map(([occurrence, newAmount]) => ({ occurrence, newAmount, refMonth }))
          )
        ),
        async ({ occurrence, newAmount, refMonth }) => {
          const updatedOccurrence: WeeklyOccurrence = {
            ...occurrence,
            amount: newAmount,
            isValueEdited: true,
            updatedAt: new Date().toISOString(),
          };
          mockUpdate.mockResolvedValueOnce(updatedOccurrence);
          mockGetByMonth.mockResolvedValueOnce([updatedOccurrence]);
          mockGetMonthlyTotal.mockResolvedValueOnce(newAmount);

          await useWeeklyRecurringStore.getState().updateOccurrence(occurrence.id, {
            amount: newAmount,
          });

          // The update call must always include isValueEdited: true
          expect(mockUpdate).toHaveBeenCalledWith(
            occurrence.id,
            expect.objectContaining({ isValueEdited: true })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updateOccurrence persists the exact amount value provided for any valid positive amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb.chain((occId) =>
          referenceMonthArb.chain((refMonth) =>
            fc
              .tuple(
                weeklyOccurrenceArb(occId, refMonth),
                positiveAmountArb
              )
              .map(([occurrence, newAmount]) => ({ occurrence, newAmount, refMonth }))
          )
        ),
        async ({ occurrence, newAmount, refMonth }) => {
          mockUpdate.mockReset();
          mockGetByMonth.mockReset();
          mockGetMonthlyTotal.mockReset();

          const updatedOccurrence: WeeklyOccurrence = {
            ...occurrence,
            amount: newAmount,
            isValueEdited: true,
            updatedAt: new Date().toISOString(),
          };
          mockUpdate.mockResolvedValueOnce(updatedOccurrence);
          mockGetByMonth.mockResolvedValueOnce([updatedOccurrence]);
          mockGetMonthlyTotal.mockResolvedValueOnce(newAmount);

          await useWeeklyRecurringStore.getState().updateOccurrence(occurrence.id, {
            amount: newAmount,
          });

          // Verify the exact amount is passed to the repository
          const updateCall = mockUpdate.mock.calls[0];
          expect(updateCall[1].amount).toBe(newAmount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
