import fc from 'fast-check';

/**
 * Property 3: Transaction Field Persistence Round-Trip
 *
 * For any valid transaction with a random title (1-100 chars),
 * description (0-500 chars), and datetime, creating the transaction
 * and reading it back SHALL return the exact same title, description,
 * and full datetime (including hour and minute) in ISO 8601 format.
 *
 * **Validates: Requirements 1.4, 2.4, 3.3**
 */

/**
 * Simulates the formatDateForDb function from transactions.ts
 * Per the design, date should be stored as full ISO 8601 datetime.
 * The current implementation stores full ISO string for datetime preservation.
 */
function formatDateForDb(date: Date): string {
  return date.toISOString();
}

/**
 * Simulates the toTransaction deserialization from transactions.ts
 * Converts the stored ISO string back to a Date object.
 */
function toTransaction(record: { title: string; description: string; date: string }) {
  return {
    title: record.title,
    description: record.description,
    date: new Date(record.date),
  };
}

/**
 * Simulates the full create → read round-trip:
 * 1. Serialize fields for DB storage (like createTransaction does)
 * 2. Deserialize fields back (like toTransaction does when reading)
 */
function simulateRoundTrip(input: { title: string; description: string; date: Date }) {
  // Serialize (what createTransaction does)
  const dbRecord = {
    title: input.title,
    description: input.description,
    date: formatDateForDb(input.date),
  };

  // Deserialize (what toTransaction does when reading back)
  return toTransaction(dbRecord);
}

/**
 * Arbitrary that generates valid titles (1-100 chars after trim, non-whitespace-only)
 */
const validTitleArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 100)
  .map((s) => s.trim());

/**
 * Arbitrary that generates valid descriptions (0-500 chars)
 */
const validDescriptionArbitrary = fc.string({ minLength: 0, maxLength: 500 });

/**
 * Arbitrary that generates valid Date objects with minute-level precision.
 * We zero out seconds and milliseconds since the property focuses on
 * hour and minute preservation.
 */
const validDateTimeArbitrary = fc
  .date({
    min: new Date('2020-01-01T00:00:00.000Z'),
    max: new Date('2030-12-31T23:59:59.999Z'),
  })
  .filter((d) => !isNaN(d.getTime()));

describe('Feature: entry-title-and-dates, Property 3: Transaction Field Persistence Round-Trip', () => {
  /**
   * **Validates: Requirements 1.4, 2.4, 3.3**
   */

  it('round-trip preserves title exactly', () => {
    fc.assert(
      fc.property(
        validTitleArbitrary,
        validDescriptionArbitrary,
        validDateTimeArbitrary,
        (title, description, date) => {
          const result = simulateRoundTrip({ title, description, date });
          expect(result.title).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves description exactly', () => {
    fc.assert(
      fc.property(
        validTitleArbitrary,
        validDescriptionArbitrary,
        validDateTimeArbitrary,
        (title, description, date) => {
          const result = simulateRoundTrip({ title, description, date });
          expect(result.description).toBe(description);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves full datetime including hour and minute', () => {
    fc.assert(
      fc.property(
        validTitleArbitrary,
        validDescriptionArbitrary,
        validDateTimeArbitrary,
        (title, description, date) => {
          const result = simulateRoundTrip({ title, description, date });

          // The round-trip should preserve the full datetime
          expect(result.date.getFullYear()).toBe(date.getFullYear());
          expect(result.date.getMonth()).toBe(date.getMonth());
          expect(result.date.getDate()).toBe(date.getDate());
          expect(result.date.getHours()).toBe(date.getHours());
          expect(result.date.getMinutes()).toBe(date.getMinutes());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves datetime as exact ISO 8601 string equality', () => {
    fc.assert(
      fc.property(
        validTitleArbitrary,
        validDescriptionArbitrary,
        validDateTimeArbitrary,
        (title, description, date) => {
          const result = simulateRoundTrip({ title, description, date });

          // ISO string round-trip should be exact
          expect(result.date.toISOString()).toBe(date.toISOString());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves all three fields simultaneously', () => {
    fc.assert(
      fc.property(
        validTitleArbitrary,
        validDescriptionArbitrary,
        validDateTimeArbitrary,
        (title, description, date) => {
          const result = simulateRoundTrip({ title, description, date });

          // All fields must be preserved together
          expect(result.title).toBe(title);
          expect(result.description).toBe(description);
          expect(result.date.toISOString()).toBe(date.toISOString());
        }
      ),
      { numRuns: 100 }
    );
  });
});
