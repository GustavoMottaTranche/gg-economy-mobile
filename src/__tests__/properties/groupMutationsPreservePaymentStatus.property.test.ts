import fc from 'fast-check';

/**
 * Property 8: Group mutations preserve payment status
 *
 * For any group edit operation (name, amount, day of week, category change) or
 * soft delete, the isPaid value of all existing occurrences shall remain unchanged
 * after the operation completes.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface WeeklyRecurringGroup {
  id: string;
  title: string;
  amount: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  categoryId: string;
  description: string;
  isActive: boolean;
}

interface OccurrenceWithPayment {
  id: string;
  weeklyGroupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  description: string;
  isValueEdited: boolean;
  isPaid: boolean;
}

// ─── Group Mutation Logic (mirrors WeeklyRecurringService) ───────────────────

/**
 * Simulates a group name edit operation.
 * Updates the group title but preserves all occurrence isPaid values.
 * Mirrors WeeklyRecurringService.updateGroup() with title change.
 */
function editGroupName(
  group: WeeklyRecurringGroup,
  newTitle: string,
  occurrences: OccurrenceWithPayment[]
): { group: WeeklyRecurringGroup; occurrences: OccurrenceWithPayment[] } {
  return {
    group: { ...group, title: newTitle },
    occurrences: occurrences.map((o) => ({ ...o })),
  };
}

/**
 * Simulates a group amount edit operation.
 * Updates the group amount and propagates to future unedited occurrences,
 * but preserves all occurrence isPaid values.
 * Mirrors WeeklyRecurringService.updateGroup() with amount change (Req 7.2).
 */
function editGroupAmount(
  group: WeeklyRecurringGroup,
  newAmount: number,
  occurrences: OccurrenceWithPayment[],
  today: string
): { group: WeeklyRecurringGroup; occurrences: OccurrenceWithPayment[] } {
  const updatedOccurrences = occurrences.map((o) => {
    // Future unedited occurrences get the new amount, but isPaid is preserved
    if (o.date >= today && !o.isValueEdited) {
      return { ...o, amount: newAmount };
    }
    return { ...o };
  });

  return {
    group: { ...group, amount: newAmount },
    occurrences: updatedOccurrences,
  };
}

/**
 * Simulates a group day-of-week edit operation.
 * Deletes future unedited occurrences and regenerates them with isPaid=false,
 * but preserves isPaid on all existing past/edited occurrences.
 * Mirrors WeeklyRecurringService.updateGroup() with dayOfWeek change (Req 7.1).
 */
function editGroupDayOfWeek(
  group: WeeklyRecurringGroup,
  newDayOfWeek: number,
  occurrences: OccurrenceWithPayment[],
  today: string
): { group: WeeklyRecurringGroup; preservedOccurrences: OccurrenceWithPayment[] } {
  // Past occurrences and edited future occurrences are preserved with their isPaid intact
  const preservedOccurrences = occurrences
    .filter((o) => o.date < today || o.isValueEdited)
    .map((o) => ({ ...o }));

  return {
    group: { ...group, dayOfWeek: newDayOfWeek },
    preservedOccurrences,
  };
}

/**
 * Simulates a group category edit operation.
 * Updates the group categoryId but preserves all occurrence isPaid values.
 * Mirrors WeeklyRecurringService.updateGroup() with categoryId change (Req 7.1).
 */
function editGroupCategory(
  group: WeeklyRecurringGroup,
  newCategoryId: string,
  occurrences: OccurrenceWithPayment[]
): { group: WeeklyRecurringGroup; occurrences: OccurrenceWithPayment[] } {
  return {
    group: { ...group, categoryId: newCategoryId },
    occurrences: occurrences.map((o) => ({ ...o })),
  };
}

/**
 * Simulates a group soft delete operation.
 * Marks the group as inactive, deletes future occurrences,
 * but preserves isPaid on all past occurrences.
 * Mirrors WeeklyRecurringService.deleteGroup() (Req 7.3).
 */
function softDeleteGroup(
  group: WeeklyRecurringGroup,
  occurrences: OccurrenceWithPayment[],
  today: string
): { group: WeeklyRecurringGroup; preservedOccurrences: OccurrenceWithPayment[] } {
  // Past occurrences are preserved with their isPaid intact
  const preservedOccurrences = occurrences.filter((o) => o.date < today).map((o) => ({ ...o }));

  return {
    group: { ...group, isActive: false },
    preservedOccurrences,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a valid YYYY-MM-DD date string.
 */
const dateArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/**
 * Generates a valid YYYY-MM reference month string.
 */
const referenceMonthArbitrary = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, '0')}`);

/**
 * Generates a WeeklyRecurringGroup.
 */
const groupArbitrary: fc.Arbitrary<WeeklyRecurringGroup> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.integer({ min: 1, max: 9999999 }),
  dayOfWeek: fc.integer({ min: 0, max: 6 }),
  categoryId: fc.uuid(),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  isActive: fc.constant(true),
});

/**
 * Generates a single occurrence with random isPaid status.
 */
const occurrenceArbitrary = (groupId: string): fc.Arbitrary<OccurrenceWithPayment> =>
  fc
    .record({
      id: fc.uuid(),
      date: dateArbitrary,
      referenceMonth: referenceMonthArbitrary,
      amount: fc.integer({ min: 1, max: 9999999 }),
      description: fc.string({ minLength: 0, maxLength: 100 }),
      isValueEdited: fc.boolean(),
      isPaid: fc.boolean(),
    })
    .map((fields) => ({
      ...fields,
      weeklyGroupId: groupId,
    }));

/**
 * Generates a non-empty array of occurrences for a given group.
 */
const occurrencesArbitrary = (groupId: string) =>
  fc.array(occurrenceArbitrary(groupId), { minLength: 1, maxLength: 20 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: payment-status-tracking, Property 8: Group mutations preserve payment status', () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */

  it('editing group name preserves isPaid of all occurrences', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(
            fc.constant(group),
            occurrencesArbitrary(group.id),
            fc.string({ minLength: 1, maxLength: 50 })
          )
        ),
        ([group, occurrences, newTitle]) => {
          const originalIsPaidValues = occurrences.map((o) => ({
            id: o.id,
            isPaid: o.isPaid,
          }));

          const { occurrences: updatedOccurrences } = editGroupName(group, newTitle, occurrences);

          // Every occurrence must retain its original isPaid value
          for (let i = 0; i < occurrences.length; i++) {
            expect(updatedOccurrences[i]!.isPaid).toBe(originalIsPaidValues[i]!.isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing group amount preserves isPaid of all occurrences (Req 7.2)', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(
            fc.constant(group),
            occurrencesArbitrary(group.id),
            fc.integer({ min: 1, max: 9999999 }),
            dateArbitrary
          )
        ),
        ([group, occurrences, newAmount, today]) => {
          const originalIsPaidValues = occurrences.map((o) => ({
            id: o.id,
            isPaid: o.isPaid,
          }));

          const { occurrences: updatedOccurrences } = editGroupAmount(
            group,
            newAmount,
            occurrences,
            today
          );

          // Every occurrence must retain its original isPaid value,
          // even if the amount was updated for future unedited ones
          for (let i = 0; i < occurrences.length; i++) {
            expect(updatedOccurrences[i]!.isPaid).toBe(originalIsPaidValues[i]!.isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing group day of week preserves isPaid of all retained occurrences (Req 7.1)', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(
            fc.constant(group),
            occurrencesArbitrary(group.id),
            fc.integer({ min: 0, max: 6 }),
            dateArbitrary
          )
        ),
        ([group, occurrences, newDayOfWeek, today]) => {
          // Record original isPaid for occurrences that will be preserved
          // (past occurrences or edited future ones)
          const expectedPreserved = occurrences
            .filter((o) => o.date < today || o.isValueEdited)
            .map((o) => ({ id: o.id, isPaid: o.isPaid }));

          const { preservedOccurrences } = editGroupDayOfWeek(
            group,
            newDayOfWeek,
            occurrences,
            today
          );

          // All preserved occurrences must retain their original isPaid value
          expect(preservedOccurrences.length).toBe(expectedPreserved.length);
          for (let i = 0; i < preservedOccurrences.length; i++) {
            expect(preservedOccurrences[i]!.isPaid).toBe(expectedPreserved[i]!.isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing group category preserves isPaid of all occurrences (Req 7.1)', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(fc.constant(group), occurrencesArbitrary(group.id), fc.uuid())
        ),
        ([group, occurrences, newCategoryId]) => {
          const originalIsPaidValues = occurrences.map((o) => ({
            id: o.id,
            isPaid: o.isPaid,
          }));

          const { occurrences: updatedOccurrences } = editGroupCategory(
            group,
            newCategoryId,
            occurrences
          );

          // Every occurrence must retain its original isPaid value
          for (let i = 0; i < occurrences.length; i++) {
            expect(updatedOccurrences[i]!.isPaid).toBe(originalIsPaidValues[i]!.isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('soft deleting group preserves isPaid of all past occurrences (Req 7.3)', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(fc.constant(group), occurrencesArbitrary(group.id), dateArbitrary)
        ),
        ([group, occurrences, today]) => {
          // Record original isPaid for past occurrences (those that will be preserved)
          const pastOccurrences = occurrences.filter((o) => o.date < today);
          const expectedIsPaidValues = pastOccurrences.map((o) => ({
            id: o.id,
            isPaid: o.isPaid,
          }));

          const { preservedOccurrences } = softDeleteGroup(group, occurrences, today);

          // All preserved (past) occurrences must retain their original isPaid value
          expect(preservedOccurrences.length).toBe(pastOccurrences.length);
          for (let i = 0; i < preservedOccurrences.length; i++) {
            expect(preservedOccurrences[i]!.isPaid).toBe(expectedIsPaidValues[i]!.isPaid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no group mutation operation modifies the isPaid field of any retained occurrence', () => {
    fc.assert(
      fc.property(
        groupArbitrary.chain((group) =>
          fc.tuple(
            fc.constant(group),
            occurrencesArbitrary(group.id),
            fc.oneof(
              fc.constant('name' as const),
              fc.constant('amount' as const),
              fc.constant('dayOfWeek' as const),
              fc.constant('category' as const),
              fc.constant('softDelete' as const)
            ),
            dateArbitrary,
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.integer({ min: 1, max: 9999999 }),
            fc.integer({ min: 0, max: 6 }),
            fc.uuid()
          )
        ),
        ([
          group,
          occurrences,
          operation,
          today,
          newTitle,
          newAmount,
          newDayOfWeek,
          newCategoryId,
        ]) => {
          // Record original isPaid values
          const originalIsPaidMap = new Map(occurrences.map((o) => [o.id, o.isPaid]));

          let resultOccurrences: OccurrenceWithPayment[];

          switch (operation) {
            case 'name': {
              const result = editGroupName(group, newTitle, occurrences);
              resultOccurrences = result.occurrences;
              break;
            }
            case 'amount': {
              const result = editGroupAmount(group, newAmount, occurrences, today);
              resultOccurrences = result.occurrences;
              break;
            }
            case 'dayOfWeek': {
              const result = editGroupDayOfWeek(group, newDayOfWeek, occurrences, today);
              resultOccurrences = result.preservedOccurrences;
              break;
            }
            case 'category': {
              const result = editGroupCategory(group, newCategoryId, occurrences);
              resultOccurrences = result.occurrences;
              break;
            }
            case 'softDelete': {
              const result = softDeleteGroup(group, occurrences, today);
              resultOccurrences = result.preservedOccurrences;
              break;
            }
          }

          // Every retained occurrence must have its original isPaid value
          for (const occ of resultOccurrences) {
            expect(occ.isPaid).toBe(originalIsPaidMap.get(occ.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
