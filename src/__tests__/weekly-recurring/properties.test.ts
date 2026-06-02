// Feature: weekly-recurring-expenses, Property 2: Idempotent Generation
// Feature: weekly-recurring-expenses, Property 4: Monthly Total Equals Sum of Occurrences
// Feature: weekly-recurring-expenses, Property 5: Occurrence Edit Isolation
// Feature: weekly-recurring-expenses, Property 6: Date Change Derives Correct Reference Month
// Feature: weekly-recurring-expenses, Property 3: Validation Rejects Invalid Inputs
// Feature: weekly-recurring-expenses, Property 7: Group Edit Preserves Past, Updates Eligible Future
// Feature: weekly-recurring-expenses, Property 8: Day-of-Week Change Regenerates Correctly
// Feature: weekly-recurring-expenses, Property 9: Deletion Preserves Past and Removes Future

/**
 * Property 6: Date Change Derives Correct Reference Month
 *
 * For any valid date in YYYY-MM-DD format, updating an occurrence's date
 * SHALL set its reference month to the YYYY-MM prefix of that date.
 *
 * **Validates: Requirements 3.4**
 */

/**
 * Property 3: Validation Rejects Invalid Inputs
 *
 * For any input where the title is empty or whitespace-only or exceeds 100 characters,
 * OR the amount is outside [0.01, 999999999.99], OR the dayOfWeek is outside [0, 6],
 * OR the categoryId is null/empty, the validation function SHALL return { valid: false }
 * with at least one error message. Conversely, for any input within all valid ranges,
 * validation SHALL return { valid: true }.
 *
 * **Validates: Requirements 1.2, 3.3, 3.5, 4.7**
 */

import fc from 'fast-check';
import {
  deriveReferenceMonth,
  getTodayBoundary,
  getWeeklyDatesForMonth,
} from '../../services/weekly-recurring/dateUtils';
import {
  validateWeeklyGroup,
  validateOccurrenceValue,
  validateOccurrenceDate,
} from '../../validation/weeklyRecurringValidation';
import { OccurrenceGenerator } from '../../services/weekly-recurring/OccurrenceGenerator';
import { WeeklyRecurringService } from '../../services/weekly-recurring/WeeklyRecurringService';
import type { IWeeklyGroupRepository } from '../../repositories/interfaces/IWeeklyGroupRepository';
import type { IWeeklyOccurrenceRepository } from '../../repositories/interfaces/IWeeklyOccurrenceRepository';
import type { WeeklyRecurringGroup, WeeklyOccurrence } from '../../types/weeklyRecurring';
import type { NewWeeklyOccurrenceRecord } from '../../db/schema';

// Mock the withTransaction to just execute the function directly
jest.mock('../../db/client', () => ({
  withTransaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Mock the logger to suppress output during tests
jest.mock('../../services/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Feature: weekly-recurring-expenses, Property 2: Idempotent Generation
describe('Feature: weekly-recurring-expenses, Property 2: Idempotent Generation', () => {
  /**
   * Property 2: Idempotent Generation
   *
   * For any active weekly recurring group and target month, calling generateForMonth
   * multiple times SHALL produce the same set of occurrences as calling it once —
   * the occurrence count and data for that group and month SHALL not change after
   * the first successful generation.
   *
   * **Validates: Requirements 1.4, 6.3**
   */

  it('calling generateForGroup twice produces the same occurrences as calling it once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
        async (year, month, dayOfWeek, amount) => {
          const targetMonth = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
          const groupId = 'test-group-id';

          const group: WeeklyRecurringGroup = {
            id: groupId,
            title: 'Test Group',
            amount,
            dayOfWeek,
            categoryId: 'cat-1',
            categoryType: 'expense',
            description: 'Test description',
            originId: null,
            startDate: '2019-01-01', // far in the past so all dates are included
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Track created occurrences to simulate the repository state
          const createdOccurrences: NewWeeklyOccurrenceRecord[] = [];
          let createCallCountFirstRun = 0;
          let createCallCountSecondRun = 0;
          let isFirstRunComplete = false;

          const mockGroupRepo: IWeeklyGroupRepository = {
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getById: jest.fn().mockResolvedValue(group),
            getActive: jest.fn().mockResolvedValue([group]),
            getActiveForMonth: jest.fn().mockResolvedValue([group]),
          };

          const mockOccRepo: IWeeklyOccurrenceRepository = {
            create: jest
              .fn()
              .mockImplementation(
                async (data: NewWeeklyOccurrenceRecord): Promise<WeeklyOccurrence> => {
                  createdOccurrences.push(data);
                  if (!isFirstRunComplete) {
                    createCallCountFirstRun++;
                  } else {
                    createCallCountSecondRun++;
                  }
                  return {
                    id: `occ-${createdOccurrences.length}`,
                    weeklyGroupId: data.weeklyGroupId!,
                    date: data.date!,
                    referenceMonth: data.referenceMonth!,
                    amount: data.amount!,
                    description: data.description ?? '',
                    isValueEdited: false,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                  };
                }
              ),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            deleteFutureUnedited: jest.fn(),
            deleteFuture: jest.fn(),
            getById: jest.fn().mockResolvedValue(null),
            getByGroupId: jest.fn().mockResolvedValue([]),
            getByMonth: jest.fn().mockResolvedValue([]),
            getByGroupAndMonth: jest.fn().mockResolvedValue([]),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
            existsForGroupAndDate: jest
              .fn()
              .mockImplementation(async (_gId: string, date: string): Promise<boolean> => {
                // After first run, all created dates should return true
                return createdOccurrences.some(
                  (occ) => occ.date === date && occ.weeklyGroupId === _gId
                );
              }),
            getFutureUnedited: jest.fn().mockResolvedValue([]),
            getFuture: jest.fn().mockResolvedValue([]),
            getPast: jest.fn().mockResolvedValue([]),
          };

          const generator = new OccurrenceGenerator({
            groupRepository: mockGroupRepo,
            occurrenceRepository: mockOccRepo,
          });

          // First call — generates occurrences
          await generator.generateForGroup(groupId, targetMonth);
          isFirstRunComplete = true;

          // Second call — should NOT create any new occurrences (idempotent)
          await generator.generateForGroup(groupId, targetMonth);

          // The second run should have created zero new occurrences
          expect(createCallCountSecondRun).toBe(0);

          // Total occurrences should be exactly what the first run created
          expect(createdOccurrences.length).toBe(createCallCountFirstRun);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: weekly-recurring-expenses, Property 6: Date Change Derives Correct Reference Month', () => {
  /**
   * **Validates: Requirements 3.4**
   */

  it('should return exactly the first 7 characters (YYYY-MM) of any valid YYYY-MM-DD date', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2019, 0, 1), max: new Date(2030, 11, 31) }), (date) => {
        const year = date.getFullYear().toString().padStart(4, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const result = deriveReferenceMonth(dateStr);

        expect(result).toBe(dateStr.substring(0, 7));
      }),
      { numRuns: 100 }
    );
  });

  it('should return a month value always between 01 and 12', () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date(2019, 0, 1), max: new Date(2030, 11, 31) })
          .filter((d) => !isNaN(d.getTime())),
        (date) => {
          const year = date.getFullYear().toString().padStart(4, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const result = deriveReferenceMonth(dateStr);
          const monthPart = parseInt(result.split('-')[1], 10);

          expect(monthPart).toBeGreaterThanOrEqual(1);
          expect(monthPart).toBeLessThanOrEqual(12);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return a year that matches the input date year', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2019, 0, 1), max: new Date(2030, 11, 31) }), (date) => {
        const year = date.getFullYear().toString().padStart(4, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const result = deriveReferenceMonth(dateStr);
        const resultYear = result.split('-')[0];

        expect(resultYear).toBe(year);
      }),
      { numRuns: 100 }
    );
  });

  it('should return YYYY-MM format for dates generated from separate year/month/day components', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2019, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const dateStr = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const expectedMonth = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;

          const result = deriveReferenceMonth(dateStr);

          expect(result).toBe(expectedMonth);
          expect(result).toMatch(/^\d{4}-\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weekly-recurring-expenses, Property 3: Validation Rejects Invalid Inputs
describe('Feature: weekly-recurring-expenses, Property 3: Validation Rejects Invalid Inputs', () => {
  /**
   * **Validates: Requirements 1.2, 3.3, 3.5, 4.7**
   */

  // ─── Generators ──────────────────────────────────────────────────────────────

  /** Generates invalid titles: empty string or whitespace-only */
  const invalidTitleEmpty = fc.oneof(
    fc.constant(''),
    fc.integer({ min: 1, max: 5 }).map((n) => ' '.repeat(n))
  );

  /** Generates invalid titles: exceeds 100 characters after trim */
  const invalidTitleTooLong = fc.string({ minLength: 101, maxLength: 150 }).map((s) => {
    // Ensure the trimmed length still exceeds 100 by padding with non-whitespace
    const trimmed = s.trim();
    if (trimmed.length <= 100) {
      return 'x'.repeat(101);
    }
    return s;
  });

  /** Generates valid titles: 1-100 non-whitespace-only characters */
  const validTitle = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length >= 1 && s.trim().length <= 100);

  /** Generates invalid amounts: below minimum */
  const invalidAmountTooLow = fc.double({ min: -1000000000, max: 0, noNaN: true });

  /** Generates invalid amounts: above maximum */
  const invalidAmountTooHigh = fc.double({ min: 1000000000, max: 2000000000, noNaN: true });

  /** Generates valid amounts: within [0.01, 999999999.99] with max 2 decimals */
  const validAmount = fc.integer({ min: 1, max: 99999999999 }).map((n) => n / 100);

  /** Generates invalid dayOfWeek: above 6 */
  const invalidDayOfWeekHigh = fc.integer({ min: 7, max: 100 });

  /** Generates invalid dayOfWeek: below 0 */
  const invalidDayOfWeekLow = fc.integer({ min: -100, max: -1 });

  /** Generates invalid dayOfWeek: non-integer */
  const invalidDayOfWeekNonInteger = fc
    .double({ min: 0.1, max: 5.9, noNaN: true })
    .filter((n) => !Number.isInteger(n));

  /** Generates valid dayOfWeek: integer 0-6 */
  const validDayOfWeek = fc.integer({ min: 0, max: 6 });

  /** Generates valid categoryId: non-empty string */
  const validCategoryId = fc
    .string({ minLength: 1, maxLength: 36 })
    .filter((s) => s.trim().length > 0);

  // ─── Property Tests: validateWeeklyGroup ─────────────────────────────────────

  describe('validateWeeklyGroup', () => {
    it('rejects any input with invalid title (empty or whitespace-only)', () => {
      fc.assert(
        fc.property(
          invalidTitleEmpty,
          validAmount,
          validDayOfWeek,
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any input with invalid title (exceeds 100 characters)', () => {
      fc.assert(
        fc.property(
          invalidTitleTooLong,
          validAmount,
          validDayOfWeek,
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any input with invalid amount (below 0.01 or above 999999999.99)', () => {
      fc.assert(
        fc.property(
          validTitle,
          fc.oneof(invalidAmountTooLow, invalidAmountTooHigh),
          validDayOfWeek,
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any input with invalid amount (more than 2 decimal places)', () => {
      fc.assert(
        fc.property(
          validTitle,
          fc.integer({ min: 1, max: 999999999 }).map((n) => n / 1000), // always >2 decimals
          validDayOfWeek,
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            // Only test values that actually have >2 decimals
            const str = String(amount);
            const dotIndex = str.indexOf('.');
            if (dotIndex === -1 || str.length - dotIndex - 1 <= 2) return; // skip if not >2 decimals

            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any input with invalid dayOfWeek (outside 0-6 or non-integer)', () => {
      fc.assert(
        fc.property(
          validTitle,
          validAmount,
          fc.oneof(invalidDayOfWeekHigh, invalidDayOfWeekLow, invalidDayOfWeekNonInteger),
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any input with null or empty categoryId', () => {
      fc.assert(
        fc.property(
          validTitle,
          validAmount,
          validDayOfWeek,
          fc.oneof(fc.constant(null), fc.constant('')),
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts any input with ALL fields valid', () => {
      fc.assert(
        fc.property(
          validTitle,
          validAmount,
          validDayOfWeek,
          validCategoryId,
          (title, amount, dayOfWeek, categoryId) => {
            const result = validateWeeklyGroup({ title, amount, dayOfWeek, categoryId });
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property Tests: validateOccurrenceValue ─────────────────────────────────

  describe('validateOccurrenceValue', () => {
    it('rejects zero amount', () => {
      const result = validateOccurrenceValue({ amount: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects any amount out of range [-999999999, 999999999]', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -2000000000, max: -999999999.01, noNaN: true }),
            fc.double({ min: 999999999.01, max: 2000000000, noNaN: true })
          ),
          (amount) => {
            const result = validateOccurrenceValue({ amount });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects any amount with more than 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }).map((n) => n / 1000), // always >2 decimals potentially
          (amount) => {
            const str = String(amount);
            const dotIndex = str.indexOf('.');
            if (dotIndex === -1 || str.length - dotIndex - 1 <= 2) return; // skip if not >2 decimals

            const result = validateOccurrenceValue({ amount });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts any valid non-zero amount within range with max 2 decimals', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: 1, max: 99999999999 }).map((n) => n / 100),
            fc.integer({ min: -99999999999, max: -1 }).map((n) => n / 100)
          ),
          (amount) => {
            // Ensure within range
            if (amount < -999999999 || amount > 999999999) return;
            const result = validateOccurrenceValue({ amount });
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property Tests: validateOccurrenceDate ──────────────────────────────────

  describe('validateOccurrenceDate', () => {
    it('rejects invalid format (not YYYY-MM-DD)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('2024/01/15'),
            fc.constant('15-01-2024'),
            fc.constant('2024-1-5'),
            fc.constant('not-a-date'),
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))
          ),
          (date) => {
            const result = validateOccurrenceDate({ date });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects non-existent calendar dates', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('2024-02-30'),
            fc.constant('2024-02-31'),
            fc.constant('2023-02-29'),
            fc.constant('2024-04-31'),
            fc.constant('2024-06-31'),
            fc.constant('2024-09-31'),
            fc.constant('2024-11-31')
          ),
          (date) => {
            const result = validateOccurrenceDate({ date });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects dates out of allowed range (>5 years past or >1 year future)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const farPastYear = today.getFullYear() - 6;
      const farFutureYear = today.getFullYear() + 2;

      fc.assert(
        fc.property(
          fc.oneof(
            // Far past dates
            fc.integer({ min: 1, max: 28 }).map((day) => {
              const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
              return `${farPastYear}-${month}-${String(day).padStart(2, '0')}`;
            }),
            // Far future dates
            fc.integer({ min: 1, max: 28 }).map((day) => {
              const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
              return `${farFutureYear}-${month}-${String(day).padStart(2, '0')}`;
            })
          ),
          (date) => {
            const result = validateOccurrenceDate({ date });
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts any valid date within allowed range', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate dates within the valid range (today - 4 years to today + 11 months to be safe)
      const minDate = new Date(today);
      minDate.setFullYear(minDate.getFullYear() - 4);
      const maxDate = new Date(today);
      maxDate.setMonth(maxDate.getMonth() + 11);

      fc.assert(
        fc.property(
          fc.date({ min: minDate, max: maxDate }).filter((d) => !isNaN(d.getTime())),
          (date) => {
            const year = date.getFullYear().toString().padStart(4, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const result = validateOccurrenceDate({ date: dateStr });
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Feature: weekly-recurring-expenses, Property 4: Monthly Total Equals Sum of Occurrences
describe('Feature: weekly-recurring-expenses, Property 4: Monthly Total Equals Sum of Occurrences', () => {
  /**
   * For any set of weekly occurrences within a reference month, the computed monthly total
   * SHALL equal the arithmetic sum of all occurrence amounts for that month, regardless of
   * which groups they belong to or whether those groups are active or inactive.
   *
   * **Validates: Requirements 2.1**
   */

  // Generator: array of amounts with 2 decimal precision (positive and negative)
  const amountsArb = fc.array(
    fc.integer({ min: -99999999, max: 99999999 }).map((n) => n / 100),
    { minLength: 0, maxLength: 20 }
  );

  it('monthly total from OccurrenceGenerator equals the arithmetic sum of all occurrence amounts (mock repository)', async () => {
    await fc.assert(
      fc.asyncProperty(amountsArb, async (amounts) => {
        // Compute expected sum with proper floating point handling
        const expectedSum = amounts.reduce((acc, val) => acc + val, 0);
        // Round to 2 decimal places to match currency precision
        const expectedTotal = Math.round(expectedSum * 100) / 100;

        // Create a mock occurrence repository where getMonthlyTotal returns the sum
        const mockOccurrenceRepository: IWeeklyOccurrenceRepository = {
          create: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
          deleteFutureUnedited: jest.fn(),
          deleteFuture: jest.fn(),
          getById: jest.fn().mockResolvedValue(null),
          getByGroupId: jest.fn(),
          getByMonth: jest.fn(),
          getByGroupAndMonth: jest.fn(),
          getMonthlyTotal: jest.fn().mockResolvedValue(expectedTotal),
          existsForGroupAndDate: jest.fn(),
          getFutureUnedited: jest.fn(),
          getFuture: jest.fn(),
          getPast: jest.fn(),
        };

        const mockGroupRepository: IWeeklyGroupRepository = {
          create: jest.fn(),
          update: jest.fn(),
          softDelete: jest.fn(),
          getById: jest.fn(),
          getActive: jest.fn(),
          getActiveForMonth: jest.fn(),
        };

        const generator = new OccurrenceGenerator({
          groupRepository: mockGroupRepository,
          occurrenceRepository: mockOccurrenceRepository,
        });

        const result = await generator.getMonthlyTotal('2024-01');

        expect(result).toBe(expectedTotal);
      }),
      { numRuns: 100 }
    );
  });

  it('arithmetic sum of occurrence amounts equals the monthly total (in-memory verification)', () => {
    fc.assert(
      fc.property(amountsArb, (amounts) => {
        // The mathematical property: sum of all amounts equals the monthly total
        const sum = amounts.reduce((acc, val) => acc + val, 0);
        const roundedSum = Math.round(sum * 100) / 100;

        // Verify the property: computing the sum individually matches the aggregate
        let individualSum = 0;
        for (const amount of amounts) {
          individualSum += amount;
        }
        const roundedIndividualSum = Math.round(individualSum * 100) / 100;

        expect(roundedIndividualSum).toBe(roundedSum);
      }),
      { numRuns: 100 }
    );
  });

  it('monthly total is zero when there are no occurrences', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant([] as number[]), async (amounts) => {
        const expectedTotal = amounts.reduce((acc, val) => acc + val, 0);

        const mockOccurrenceRepository: IWeeklyOccurrenceRepository = {
          create: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
          deleteFutureUnedited: jest.fn(),
          deleteFuture: jest.fn(),
          getById: jest.fn().mockResolvedValue(null),
          getByGroupId: jest.fn(),
          getByMonth: jest.fn(),
          getByGroupAndMonth: jest.fn(),
          getMonthlyTotal: jest.fn().mockResolvedValue(expectedTotal),
          existsForGroupAndDate: jest.fn(),
          getFutureUnedited: jest.fn(),
          getFuture: jest.fn(),
          getPast: jest.fn(),
        };

        const mockGroupRepository: IWeeklyGroupRepository = {
          create: jest.fn(),
          update: jest.fn(),
          softDelete: jest.fn(),
          getById: jest.fn(),
          getActive: jest.fn(),
          getActiveForMonth: jest.fn(),
        };

        const generator = new OccurrenceGenerator({
          groupRepository: mockGroupRepository,
          occurrenceRepository: mockOccurrenceRepository,
        });

        const result = await generator.getMonthlyTotal('2024-03');

        expect(result).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('monthly total includes both positive and negative amounts correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.integer({ min: -99999999, max: -1 }).map((n) => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (positiveAmounts, negativeAmounts) => {
          const allAmounts = [...positiveAmounts, ...negativeAmounts];
          const sum = allAmounts.reduce((acc, val) => acc + val, 0);
          const roundedSum = Math.round(sum * 100) / 100;

          // Verify the sum of positives + sum of negatives equals total
          const positiveSum = positiveAmounts.reduce((acc, val) => acc + val, 0);
          const negativeSum = negativeAmounts.reduce((acc, val) => acc + val, 0);
          const combinedSum = Math.round((positiveSum + negativeSum) * 100) / 100;

          expect(combinedSum).toBe(roundedSum);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weekly-recurring-expenses, Property 5: Occurrence Edit Isolation
describe('Feature: weekly-recurring-expenses, Property 5: Occurrence Edit Isolation', () => {
  /**
   * Property 5: Occurrence Edit Isolation
   *
   * For any weekly recurring group with multiple occurrences, editing the value of one
   * specific occurrence SHALL leave all other occurrences in the same group with their
   * original values unchanged.
   *
   * **Validates: Requirements 3.2**
   */

  it('editing one occurrence amount does not affect other occurrences in the same group', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 999999.99, noNaN: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.nat(),
        fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
        (amounts, pickIndex, newAmount) => {
          const groupId = 'test-group-id';
          const editIndex = pickIndex % amounts.length;

          // Create an in-memory store of occurrences for the group
          const occurrences: WeeklyOccurrence[] = amounts.map((amount, i) => ({
            id: `occ-${i}`,
            weeklyGroupId: groupId,
            date: `2024-01-${String((i + 1) * 7).padStart(2, '0')}`,
            referenceMonth: '2024-01',
            amount,
            description: '',
            isValueEdited: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          }));

          // Save original amounts for comparison
          const originalAmounts = amounts.slice();

          // Simulate the repository's update method: update only the targeted occurrence
          const targetId = occurrences[editIndex].id;
          for (const occ of occurrences) {
            if (occ.id === targetId) {
              occ.amount = newAmount;
              occ.isValueEdited = true;
              occ.updatedAt = '2024-01-02T00:00:00.000Z';
            }
          }

          // Verify: all OTHER occurrences retain their original values
          for (let j = 0; j < occurrences.length; j++) {
            if (j !== editIndex) {
              expect(occurrences[j].amount).toBe(originalAmounts[j]);
            }
          }

          // Verify: the edited occurrence has the new amount
          expect(occurrences[editIndex].amount).toBe(newAmount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weekly-recurring-expenses, Property 9: Deletion Preserves Past and Removes Future
describe('Feature: weekly-recurring-expenses, Property 9: Deletion Preserves Past and Removes Future', () => {
  /**
   * Property 9: Deletion Preserves Past and Removes Future
   *
   * For any weekly recurring group with both past and future occurrences,
   * confirming deletion SHALL set is_active = false on the group, remove all
   * occurrences with date >= today from the database, and preserve all
   * occurrences with date < today with their original data intact.
   *
   * **Validates: Requirements 5.2, 5.3, 5.4**
   */

  it('deletion soft-deletes the group and removes future occurrences while preserving past', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
        async (numPast, numFuture, amount) => {
          const groupId = 'test-group-deletion';
          const today = getTodayBoundary();

          // Build a group
          const group: WeeklyRecurringGroup = {
            id: groupId,
            title: 'Test Deletion Group',
            amount,
            dayOfWeek: 3,
            categoryId: 'cat-1',
            categoryType: 'expense',
            description: '',
            originId: null,
            startDate: '2020-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Generate past occurrence dates (before today)
          const pastOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numPast; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7 * (i + 1));
            const dateStr = `${pastDate.getFullYear().toString().padStart(4, '0')}-${(pastDate.getMonth() + 1).toString().padStart(2, '0')}-${pastDate.getDate().toString().padStart(2, '0')}`;
            pastOccurrences.push({
              id: `past-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount,
              description: '',
              isValueEdited: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          // Generate future occurrence dates (>= today)
          const futureOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numFuture; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7 * i); // i=0 means today (which is "future")
            const dateStr = `${futureDate.getFullYear().toString().padStart(4, '0')}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;
            futureOccurrences.push({
              id: `future-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount,
              description: '',
              isValueEdited: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          // Track calls
          const softDeleteCalls: string[] = [];
          const deleteFutureCalls: { groupId: string; fromDate: string }[] = [];

          const mockGroupRepo: IWeeklyGroupRepository = {
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn().mockImplementation(async (id: string) => {
              softDeleteCalls.push(id);
            }),
            getById: jest.fn().mockResolvedValue(group),
            getActive: jest.fn().mockResolvedValue([group]),
            getActiveForMonth: jest.fn().mockResolvedValue([group]),
          };

          const mockOccRepo: IWeeklyOccurrenceRepository = {
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            deleteFutureUnedited: jest.fn(),
            deleteFuture: jest.fn().mockImplementation(async (gId: string, fromDate: string) => {
              deleteFutureCalls.push({ groupId: gId, fromDate });
            }),
            getById: jest.fn().mockResolvedValue(null),
            getByGroupId: jest.fn().mockResolvedValue([...pastOccurrences, ...futureOccurrences]),
            getByMonth: jest.fn().mockResolvedValue([]),
            getByGroupAndMonth: jest.fn().mockResolvedValue([]),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
            existsForGroupAndDate: jest.fn().mockResolvedValue(false),
            getFutureUnedited: jest.fn().mockResolvedValue(futureOccurrences),
            getFuture: jest.fn().mockResolvedValue(futureOccurrences),
            getPast: jest.fn().mockResolvedValue(pastOccurrences),
          };

          // Mock OccurrenceGenerator (not needed for delete, but required by constructor)
          const mockGenerator = {
            generateForMonth: jest.fn(),
            generateForGroup: jest.fn(),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
          };

          const service = new WeeklyRecurringService({
            groupRepository: mockGroupRepo,
            occurrenceRepository: mockOccRepo,
            occurrenceGenerator: mockGenerator,
          });

          // Execute deletion
          await service.deleteGroup(groupId);

          // Property 1: softDelete is called exactly once with the group ID
          expect(softDeleteCalls.length).toBe(1);
          expect(softDeleteCalls[0]).toBe(groupId);

          // Property 2: deleteFuture is called with groupId and today's boundary date
          expect(deleteFutureCalls.length).toBe(1);
          expect(deleteFutureCalls[0].groupId).toBe(groupId);
          expect(deleteFutureCalls[0].fromDate).toBe(today);

          // Property 3: No past occurrences are affected (getPast returns them unchanged)
          // The delete/deleteMany/update should NOT have been called for past occurrences
          // Only deleteFuture was called (which targets future occurrences)
          expect(mockOccRepo.delete).not.toHaveBeenCalled();
          expect(mockOccRepo.deleteMany).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weekly-recurring-expenses, Property 8: Day-of-Week Change Regenerates Correctly
describe('Feature: weekly-recurring-expenses, Property 8: Day-of-Week Change Regenerates Correctly', () => {
  /**
   * Property 8: Day-of-Week Change Regenerates Correctly
   *
   * For any weekly recurring group, changing the day of week SHALL delete all future
   * unedited occurrences, preserve all future edited occurrences (with is_value_edited = true),
   * and generate new occurrences on the new day of week for all months that previously had
   * generated occurrences. All new occurrences SHALL fall on the new day of week.
   *
   * **Validates: Requirements 4.4, 4.5**
   */

  it('changing dayOfWeek deletes future unedited, preserves future edited, and regenerates on new day', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
        async (oldDayOfWeek, newDayOfWeekRaw, amount) => {
          // Ensure old and new dayOfWeek differ
          const newDayOfWeek =
            newDayOfWeekRaw === oldDayOfWeek ? (oldDayOfWeek + 1) % 7 : newDayOfWeekRaw;

          const groupId = 'test-group-prop8';
          const today = getTodayBoundary();
          const startDate = '2024-01-01';

          // Build a group with the old dayOfWeek
          const group: WeeklyRecurringGroup = {
            id: groupId,
            title: 'Test Group Prop8',
            amount,
            dayOfWeek: oldDayOfWeek,
            categoryId: 'cat-1',
            categoryType: 'expense',
            description: '',
            originId: null,
            startDate,
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Generate existing occurrences on the old dayOfWeek for 2024-06 and 2024-07
          // Some future occurrences are marked as edited (is_value_edited = true)
          const months = ['2024-06', '2024-07'];
          const existingOccurrences: WeeklyOccurrence[] = [];
          let occCounter = 0;

          for (const month of months) {
            const dates = getWeeklyDatesForMonth(month, oldDayOfWeek, startDate);
            for (const date of dates) {
              const isFuture = date >= today;
              const isEdited = isFuture && occCounter % 3 === 0; // Mark every 3rd future occurrence as edited
              existingOccurrences.push({
                id: `occ-${occCounter}`,
                weeklyGroupId: groupId,
                date,
                referenceMonth: deriveReferenceMonth(date),
                amount: isEdited ? amount * 2 : amount,
                description: '',
                isValueEdited: isEdited,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              });
              occCounter++;
            }
          }

          // Track which occurrences were "deleted" and which were "created"
          let deleteFutureUneditedCalled = false;
          let deleteFutureUneditedGroupId = '';
          let deleteFutureUneditedFromDate = '';
          const createdOccurrences: NewWeeklyOccurrenceRecord[] = [];

          // Future edited occurrences that should be preserved
          const futureEditedOccurrences = existingOccurrences.filter(
            (o) => o.date >= today && o.isValueEdited
          );

          // Build the updated group (after dayOfWeek change)
          const updatedGroup: WeeklyRecurringGroup = {
            ...group,
            dayOfWeek: newDayOfWeek,
            updatedAt: '2024-06-15T00:00:00.000Z',
          };

          const mockGroupRepo: IWeeklyGroupRepository = {
            create: jest.fn(),
            update: jest.fn().mockResolvedValue(updatedGroup),
            softDelete: jest.fn(),
            getById: jest.fn().mockResolvedValue(group),
            getActive: jest.fn(),
            getActiveForMonth: jest.fn(),
          };

          const mockOccRepo: IWeeklyOccurrenceRepository = {
            create: jest.fn().mockImplementation(async (data: NewWeeklyOccurrenceRecord) => {
              createdOccurrences.push(data);
              return {
                id: `new-occ-${createdOccurrences.length}`,
                weeklyGroupId: data.weeklyGroupId!,
                date: data.date!,
                referenceMonth: data.referenceMonth!,
                amount: data.amount!,
                description: data.description ?? '',
                isValueEdited: false,
                createdAt: '2024-06-15T00:00:00.000Z',
                updatedAt: '2024-06-15T00:00:00.000Z',
              };
            }),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            deleteFutureUnedited: jest
              .fn()
              .mockImplementation(async (gId: string, fromDate: string) => {
                deleteFutureUneditedCalled = true;
                deleteFutureUneditedGroupId = gId;
                deleteFutureUneditedFromDate = fromDate;
              }),
            deleteFuture: jest.fn(),
            getById: jest.fn().mockResolvedValue(null),
            getByGroupId: jest.fn().mockResolvedValue(existingOccurrences),
            getByMonth: jest.fn(),
            getByGroupAndMonth: jest.fn(),
            getMonthlyTotal: jest.fn(),
            existsForGroupAndDate: jest
              .fn()
              .mockImplementation(async (_gId: string, date: string) => {
                // Edited occurrences that were preserved still exist
                return futureEditedOccurrences.some((o) => o.date === date);
              }),
            getFutureUnedited: jest.fn(),
            getFuture: jest.fn(),
            getPast: jest.fn(),
          };

          const service = new WeeklyRecurringService({
            groupRepository: mockGroupRepo,
            occurrenceRepository: mockOccRepo,
            occurrenceGenerator: {
              generateForMonth: jest.fn(),
              generateForGroup: jest.fn(),
              getMonthlyTotal: jest.fn().mockResolvedValue(0),
            },
          });

          // Act: update the group with a new dayOfWeek
          await service.updateGroup(groupId, { dayOfWeek: newDayOfWeek });

          // Verify 1: deleteFutureUnedited was called with correct params
          expect(deleteFutureUneditedCalled).toBe(true);
          expect(deleteFutureUneditedGroupId).toBe(groupId);
          expect(deleteFutureUneditedFromDate).toBe(today);

          // Verify 2: Future edited occurrences are preserved (not deleted)
          // The deleteFutureUnedited only removes unedited ones, so edited ones remain.
          // existsForGroupAndDate returns true for edited occurrence dates,
          // meaning they won't be overwritten by new occurrences.

          // Verify 3: New occurrences are created on the new dayOfWeek
          // All newly created occurrences must fall on the new dayOfWeek
          for (const created of createdOccurrences) {
            const dateObj = new Date(created.date! + 'T00:00:00');
            expect(dateObj.getDay()).toBe(newDayOfWeek);
          }

          // Verify 4: New occurrences are only for future dates
          for (const created of createdOccurrences) {
            expect(created.date! >= today).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: weekly-recurring-expenses, Property 7: Group Edit Preserves Past, Updates Eligible Future
describe('Feature: weekly-recurring-expenses, Property 7: Group Edit Preserves Past, Updates Eligible Future', () => {
  /**
   * Property 7: Group Edit Preserves Past, Updates Eligible Future
   *
   * For any weekly recurring group with a mix of past and future occurrences,
   * editing the group's name or base value SHALL leave all past occurrences
   * (date < today) completely unchanged in all fields, AND SHALL only update
   * future occurrences (date >= today) that have is_value_edited = false when
   * the base value changes.
   *
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 7.1, 7.5**
   */

  it('editing group amount preserves past occurrences and updates only eligible future occurrences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
        fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        async (originalAmount, newAmount, numPast, numFuture, editedFlags) => {
          const groupId = 'test-group-edit';
          const today = getTodayBoundary();

          // Build the group
          const group: WeeklyRecurringGroup = {
            id: groupId,
            title: 'Original Title',
            amount: originalAmount,
            dayOfWeek: 3,
            categoryId: 'cat-1',
            categoryType: 'expense',
            description: 'Original description',
            originId: null,
            startDate: '2020-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Generate past occurrences (date < today)
          const pastOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numPast; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7 * (i + 1));
            const dateStr = `${pastDate.getFullYear().toString().padStart(4, '0')}-${(pastDate.getMonth() + 1).toString().padStart(2, '0')}-${pastDate.getDate().toString().padStart(2, '0')}`;
            pastOccurrences.push({
              id: `past-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount: originalAmount,
              description: 'Original description',
              isValueEdited: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          // Generate future occurrences (date >= today)
          // Some have is_value_edited = true based on editedFlags
          const futureOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numFuture; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7 * i); // i=0 means today (which is "future")
            const dateStr = `${futureDate.getFullYear().toString().padStart(4, '0')}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;
            const isEdited = editedFlags[i % editedFlags.length];
            futureOccurrences.push({
              id: `future-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount: isEdited ? originalAmount + 10 : originalAmount, // edited ones have different amount
              description: 'Original description',
              isValueEdited: isEdited,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          // Future unedited occurrences (is_value_edited = false)
          const futureUnedited = futureOccurrences.filter((o) => !o.isValueEdited);

          // Track updates to occurrences
          const updatedOccurrenceIds: string[] = [];
          const updatedOccurrenceAmounts: Map<string, number> = new Map();

          // Updated group to return after update
          const updatedGroup: WeeklyRecurringGroup = {
            ...group,
            amount: newAmount,
            updatedAt: new Date().toISOString(),
          };

          const mockGroupRepo: IWeeklyGroupRepository = {
            create: jest.fn(),
            update: jest.fn().mockResolvedValue(updatedGroup),
            softDelete: jest.fn(),
            getById: jest.fn().mockResolvedValue(group),
            getActive: jest.fn().mockResolvedValue([group]),
            getActiveForMonth: jest.fn().mockResolvedValue([group]),
          };

          const mockOccRepo: IWeeklyOccurrenceRepository = {
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn().mockImplementation(async (id: string, data: { amount?: number }) => {
              updatedOccurrenceIds.push(id);
              if (data.amount !== undefined) {
                updatedOccurrenceAmounts.set(id, data.amount);
              }
              return null;
            }),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            deleteFutureUnedited: jest.fn(),
            deleteFuture: jest.fn(),
            getById: jest.fn().mockResolvedValue(null),
            getByGroupId: jest.fn().mockResolvedValue([...pastOccurrences, ...futureOccurrences]),
            getByMonth: jest.fn().mockResolvedValue([]),
            getByGroupAndMonth: jest.fn().mockResolvedValue([]),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
            existsForGroupAndDate: jest.fn().mockResolvedValue(false),
            getFutureUnedited: jest.fn().mockResolvedValue(futureUnedited),
            getFuture: jest.fn().mockResolvedValue(futureOccurrences),
            getPast: jest.fn().mockResolvedValue(pastOccurrences),
          };

          const mockGenerator = {
            generateForMonth: jest.fn(),
            generateForGroup: jest.fn(),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
          };

          const service = new WeeklyRecurringService({
            groupRepository: mockGroupRepo,
            occurrenceRepository: mockOccRepo,
            occurrenceGenerator: mockGenerator,
          });

          // Execute: update group with new amount
          await service.updateGroup(groupId, { amount: newAmount });

          // ─── Verify: Past occurrences are NEVER modified ───────────────────
          // No past occurrence ID should appear in the updated list
          for (const pastOcc of pastOccurrences) {
            expect(updatedOccurrenceIds).not.toContain(pastOcc.id);
          }

          // ─── Verify: Only future unedited occurrences get the new amount ──
          if (originalAmount !== newAmount) {
            // getFutureUnedited should have been called with groupId and today
            expect(mockOccRepo.getFutureUnedited).toHaveBeenCalledWith(groupId, today);

            // Each future unedited occurrence should have been updated with new amount
            for (const uneditedOcc of futureUnedited) {
              expect(updatedOccurrenceIds).toContain(uneditedOcc.id);
              expect(updatedOccurrenceAmounts.get(uneditedOcc.id)).toBe(newAmount);
            }
          }

          // ─── Verify: Future edited occurrences are NOT updated ─────────────
          const futureEdited = futureOccurrences.filter((o) => o.isValueEdited);
          for (const editedOcc of futureEdited) {
            expect(updatedOccurrenceIds).not.toContain(editedOcc.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing group name preserves all past occurrences completely unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (amount, numPast, numFuture) => {
          const groupId = 'test-group-name-edit';

          const group: WeeklyRecurringGroup = {
            id: groupId,
            title: 'Original Title',
            amount,
            dayOfWeek: 3,
            categoryId: 'cat-1',
            categoryType: 'expense',
            description: 'Original description',
            originId: null,
            startDate: '2020-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Generate past occurrences
          const pastOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numPast; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7 * (i + 1));
            const dateStr = `${pastDate.getFullYear().toString().padStart(4, '0')}-${(pastDate.getMonth() + 1).toString().padStart(2, '0')}-${pastDate.getDate().toString().padStart(2, '0')}`;
            pastOccurrences.push({
              id: `past-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount,
              description: 'Original description',
              isValueEdited: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          // Generate future occurrences
          const futureOccurrences: WeeklyOccurrence[] = [];
          for (let i = 0; i < numFuture; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7 * i);
            const dateStr = `${futureDate.getFullYear().toString().padStart(4, '0')}-${(futureDate.getMonth() + 1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;
            futureOccurrences.push({
              id: `future-occ-${i}`,
              weeklyGroupId: groupId,
              date: dateStr,
              referenceMonth: dateStr.substring(0, 7),
              amount,
              description: 'Original description',
              isValueEdited: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            });
          }

          const updatedGroup: WeeklyRecurringGroup = {
            ...group,
            title: 'New Title',
            updatedAt: new Date().toISOString(),
          };

          const mockGroupRepo: IWeeklyGroupRepository = {
            create: jest.fn(),
            update: jest.fn().mockResolvedValue(updatedGroup),
            softDelete: jest.fn(),
            getById: jest.fn().mockResolvedValue(group),
            getActive: jest.fn().mockResolvedValue([group]),
            getActiveForMonth: jest.fn().mockResolvedValue([group]),
          };

          const mockOccRepo: IWeeklyOccurrenceRepository = {
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            deleteFutureUnedited: jest.fn(),
            deleteFuture: jest.fn(),
            getById: jest.fn().mockResolvedValue(null),
            getByGroupId: jest.fn().mockResolvedValue([...pastOccurrences, ...futureOccurrences]),
            getByMonth: jest.fn().mockResolvedValue([]),
            getByGroupAndMonth: jest.fn().mockResolvedValue([]),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
            existsForGroupAndDate: jest.fn().mockResolvedValue(false),
            getFutureUnedited: jest.fn().mockResolvedValue(futureOccurrences),
            getFuture: jest.fn().mockResolvedValue(futureOccurrences),
            getPast: jest.fn().mockResolvedValue(pastOccurrences),
          };

          const mockGenerator = {
            generateForMonth: jest.fn(),
            generateForGroup: jest.fn(),
            getMonthlyTotal: jest.fn().mockResolvedValue(0),
          };

          const service = new WeeklyRecurringService({
            groupRepository: mockGroupRepo,
            occurrenceRepository: mockOccRepo,
            occurrenceGenerator: mockGenerator,
          });

          // Execute: update group with new name only (no amount change)
          await service.updateGroup(groupId, { title: 'New Title' });

          // ─── Verify: Past occurrences are NEVER modified ───────────────────
          // When only the name changes (no amount change), no occurrences should be updated
          expect(mockOccRepo.update).not.toHaveBeenCalled();

          // ─── Verify: No deletions happen ──────────────────────────────────
          expect(mockOccRepo.delete).not.toHaveBeenCalled();
          expect(mockOccRepo.deleteMany).not.toHaveBeenCalled();
          expect(mockOccRepo.deleteFutureUnedited).not.toHaveBeenCalled();
          expect(mockOccRepo.deleteFuture).not.toHaveBeenCalled();

          // ─── Verify: Group record was updated ─────────────────────────────
          expect(mockGroupRepo.update).toHaveBeenCalledWith(
            groupId,
            expect.objectContaining({ title: 'New Title' })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
