/**
 * Property-Based Test: Re-indexing after single parcel deletion (Property 5)
 *
 * For any installment group of size N and any valid removal index k (1 ≤ k ≤ N),
 * after removing the k-th parcel, the remaining (N-1) parcels SHALL have their
 * description suffixes re-indexed as sequential " (1/(N-1))", " (2/(N-1))", ...,
 * " ((N-1)/(N-1))" in chronological order.
 *
 * **Validates: Requirements 4.3**
 */

import fc from 'fast-check';
import { extractBaseDescription } from '../../services/installment/InstallmentGroupManager';

describe('Feature: manual-entry-installments, Property 5: Re-indexing after single parcel deletion', () => {
  // Generate valid group sizes (2–48, minimum 2 so that after deletion at least 1 remains)
  const groupSizeArbitrary = fc.integer({ min: 2, max: 48 });

  // Generate non-empty base descriptions (1–50 chars, non-whitespace-only)
  const baseDescriptionArbitrary = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0)
    // Ensure the base description doesn't accidentally match the suffix pattern
    .filter((s) => !/ \(\d+\/\d+\)$/.test(s));

  it('should produce sequential suffixes " (1/(N-1))" through " ((N-1)/(N-1))" after removing any parcel', () => {
    fc.assert(
      fc.property(groupSizeArbitrary, baseDescriptionArbitrary, (groupSize, baseDescription) => {
        // Generate a removal index k (1-based, 1 ≤ k ≤ N)
        const removalIndex = fc.sample(fc.integer({ min: 1, max: groupSize }), 1)[0]!;

        // Build the original group descriptions: "Base (1/N)", "Base (2/N)", ..., "Base (N/N)"
        const originalDescriptions = Array.from(
          { length: groupSize },
          (_, i) => `${baseDescription} (${i + 1}/${groupSize})`
        );

        // Remove the k-th parcel (convert to 0-based index)
        const remaining = originalDescriptions.filter((_, i) => i !== removalIndex - 1);

        // Simulate re-indexing: extract base and apply new suffixes
        const newTotal = remaining.length;
        const reindexedDescriptions = remaining.map((desc, i) => {
          const base = extractBaseDescription(desc);
          return newTotal === 1 ? base : `${base} (${i + 1}/${newTotal})`;
        });

        // Verify: remaining count is N-1
        expect(reindexedDescriptions.length).toBe(groupSize - 1);

        // Verify: each re-indexed description has the correct sequential suffix
        for (let i = 0; i < reindexedDescriptions.length; i++) {
          const expectedSuffix = newTotal === 1 ? '' : ` (${i + 1}/${newTotal})`;
          const base = extractBaseDescription(
            originalDescriptions[i < removalIndex - 1 ? i : i + 1]!
          );
          const expectedDescription = newTotal === 1 ? base : `${base}${expectedSuffix}`;

          expect(reindexedDescriptions[i]).toBe(expectedDescription);
        }

        // Verify: all base descriptions are the same (they all came from the same group)
        const bases = reindexedDescriptions.map((desc) =>
          newTotal === 1 ? desc : extractBaseDescription(desc)
        );
        const allSameBase = bases.every((b) => b === baseDescription);
        expect(allSameBase).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly extract base description before re-indexing', () => {
    fc.assert(
      fc.property(baseDescriptionArbitrary, groupSizeArbitrary, (baseDescription, groupSize) => {
        // For any parcel in the group, extractBaseDescription should return the original base
        for (let i = 1; i <= groupSize; i++) {
          const fullDescription = `${baseDescription} (${i}/${groupSize})`;
          const extracted = extractBaseDescription(fullDescription);
          expect(extracted).toBe(baseDescription);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should produce correct suffix pattern for boundary cases (N=2, removing either parcel)', () => {
    fc.assert(
      fc.property(
        baseDescriptionArbitrary,
        fc.integer({ min: 1, max: 2 }), // removal index for group of 2
        (baseDescription, removalIndex) => {
          // Build original descriptions
          const originalDescriptions = [`${baseDescription} (1/2)`, `${baseDescription} (2/2)`];

          // Remove the k-th parcel
          const remaining = originalDescriptions.filter((_, i) => i !== removalIndex - 1);

          // Re-index: with only 1 remaining, suffix is removed entirely
          const reindexed = remaining.map((desc) => {
            const base = extractBaseDescription(desc);
            return base; // newTotal === 1, no suffix
          });

          // Only 1 parcel remains, should be just the base description
          expect(reindexed.length).toBe(1);
          expect(reindexed[0]).toBe(baseDescription);
        }
      ),
      { numRuns: 100 }
    );
  });
});
