/**
 * Property 2: Description Validation
 *
 * For any string, `validateDescription` SHALL accept it if and only if
 * `string.length` is at most 500. An empty string SHALL also be accepted
 * (description is optional).
 *
 * **Validates: Requirements 2.3, 7.2**
 */

import * as fc from 'fast-check';
import { validateDescription, DESCRIPTION_MAX_LENGTH } from '../../validation/entryValidation';

describe('Feature: entry-title-and-dates, Property 2: Description Validation', () => {
  /**
   * **Validates: Requirements 2.3, 7.2**
   */

  it('should accept any string with length <= 500', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: DESCRIPTION_MAX_LENGTH }), (description) => {
        const result = validateDescription(description);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should accept empty string (description is optional)', () => {
    fc.assert(
      fc.property(fc.constant(''), (description) => {
        const result = validateDescription(description);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should accept strings of exactly 500 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: DESCRIPTION_MAX_LENGTH, maxLength: DESCRIPTION_MAX_LENGTH }),
        (description) => {
          // Ensure we have exactly 500 chars (fast-check string may use unicode)
          const padded = description
            .padEnd(DESCRIPTION_MAX_LENGTH, 'x')
            .slice(0, DESCRIPTION_MAX_LENGTH);
          expect(padded.length).toBe(DESCRIPTION_MAX_LENGTH);
          const result = validateDescription(padded);
          expect(result.valid).toBe(true);
          expect(result.errors).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any string with length > 500', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: DESCRIPTION_MAX_LENGTH + 1, maxLength: 1000 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should satisfy the biconditional: valid iff length <= 500', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (description) => {
        const result = validateDescription(description);
        const expectedValid = description.length <= DESCRIPTION_MAX_LENGTH;
        expect(result.valid).toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });
});
