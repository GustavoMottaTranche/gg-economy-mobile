/**
 * Property 1: Title Validation
 *
 * For any string, `validateTitle` SHALL accept it if and only if
 * `string.trim().length` is between 1 and 100 (inclusive). Strings composed
 * entirely of whitespace or exceeding 100 characters after trimming SHALL
 * be rejected.
 *
 * **Validates: Requirements 1.2, 1.3, 7.1**
 */

import fc from 'fast-check';
import { validateTitle, TITLE_MIN_LENGTH, TITLE_MAX_LENGTH } from '../../validation/entryValidation';

describe('Feature: entry-title-and-dates, Property 1: Title Validation', () => {
  /**
   * **Validates: Requirements 1.2, 1.3, 7.1**
   */

  it('should accept any string whose trim().length is between 1 and 100', () => {
    // Generate strings that, after trimming, have length in [1, 100]
    const validTitleArbitrary = fc
      .integer({ min: TITLE_MIN_LENGTH, max: TITLE_MAX_LENGTH })
      .chain((len) =>
        fc.tuple(
          // Core non-whitespace content of exact length
          fc.string({ minLength: len, maxLength: len }).filter((s) => s.trim().length === len),
          // Optional leading/trailing whitespace
          fc.string({ minLength: 0, maxLength: 10 }).map((s) => s.replace(/\S/g, ' '))
        ).map(([core, padding]) => padding + core + padding)
      )
      .filter((s) => {
        const trimLen = s.trim().length;
        return trimLen >= TITLE_MIN_LENGTH && trimLen <= TITLE_MAX_LENGTH;
      });

    fc.assert(
      fc.property(validTitleArbitrary, (title) => {
        const result = validateTitle(title);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should reject empty strings', () => {
    const result = validateTitle('');
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should reject whitespace-only strings', () => {
    const whitespaceArbitrary = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
        minLength: 1,
        maxLength: 50,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(whitespaceArbitrary, (title) => {
        const result = validateTitle(title);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject strings with trim().length > 100', () => {
    const longTitleArbitrary = fc
      .string({ minLength: 101, maxLength: 300 })
      .filter((s) => s.trim().length > TITLE_MAX_LENGTH);

    fc.assert(
      fc.property(longTitleArbitrary, (title) => {
        const result = validateTitle(title);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should satisfy the biconditional: valid iff trim().length ∈ [1, 100]', () => {
    // The core property: for ANY string, validateTitle accepts iff trim length is in [1, 100]
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 300 }), (title) => {
        const trimmedLength = title.trim().length;
        const expectedValid = trimmedLength >= TITLE_MIN_LENGTH && trimmedLength <= TITLE_MAX_LENGTH;
        const result = validateTitle(title);

        expect(result.valid).toBe(expectedValid);

        if (expectedValid) {
          expect(result.errors).toBeUndefined();
        } else {
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
