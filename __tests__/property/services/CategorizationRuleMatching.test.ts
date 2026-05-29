/**
 * Property-Based Test: Categorization Rule Matching (Property 12)
 *
 * For any transaction description and set of active categorization rules,
 * the CategorizationEngine SHALL return the highest-priority matching rule's category,
 * or null if no rules match. The matching SHALL be deterministic and consistent.
 *
 * **Validates: Requirements 18.2, 18.4**
 *
 * @module CategorizationRuleMatching.test
 */

import * as fc from 'fast-check';
import { CategorizationEngine } from '../../../src/services/CategorizationEngine';
import type { CategorizationRule, MatchType } from '../../../src/types/categorizationRule';

describe('Property 12: Categorization Rule Matching', () => {
  const engine = new CategorizationEngine();

  /**
   * Arbitrary for generating valid patterns
   * Excludes characters that would cause regex issues
   */
  const patternArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim() !== '')
    .map((s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '')); // Remove regex special chars for non-regex patterns

  /**
   * Arbitrary for generating valid regex patterns
   */
  const regexPatternArb = fc.constantFrom(
    'uber',
    'lyft',
    'amazon',
    'netflix',
    '\\d+',
    'pix\\s+',
    '^uber',
    'store$',
    '(uber|lyft)',
    'trip.*airport'
  );

  /**
   * Arbitrary for generating valid category IDs
   */
  const categoryIdArb = fc.uuid();

  /**
   * Arbitrary for generating valid rule IDs
   */
  const ruleIdArb = fc.uuid();

  /**
   * Arbitrary for generating valid priorities
   */
  const priorityArb = fc.integer({ min: 0, max: 1000 });

  /**
   * Arbitrary for generating valid descriptions
   */
  const descriptionArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim() !== '')
    .map((s) => s.trim());

  /**
   * Arbitrary for generating a single categorization rule
   */
  const ruleArb: fc.Arbitrary<CategorizationRule> = fc.record({
    id: ruleIdArb,
    pattern: patternArb,
    categoryId: categoryIdArb,
    matchType: fc.constantFrom(
      'contains',
      'starts_with',
      'ends_with',
      'exact'
    ) as fc.Arbitrary<MatchType>,
    priority: priorityArb,
    isActive: fc.boolean(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  });

  /**
   * Arbitrary for generating a rule with regex match type
   */
  const regexRuleArb: fc.Arbitrary<CategorizationRule> = fc.record({
    id: ruleIdArb,
    pattern: regexPatternArb,
    categoryId: categoryIdArb,
    matchType: fc.constant('regex' as MatchType),
    priority: priorityArb,
    isActive: fc.boolean(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  });

  /**
   * Arbitrary for generating an array of rules
   */
  const rulesArb = fc.array(fc.oneof(ruleArb, regexRuleArb), { minLength: 0, maxLength: 20 });

  /**
   * Helper to sort rules by priority (descending)
   */
  function sortByPriority(rules: CategorizationRule[]): CategorizationRule[] {
    return [...rules].sort((a, b) => b.priority - a.priority);
  }

  describe('Determinism Property', () => {
    it('categorization is deterministic: same input always produces same output', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);

          // Run categorization multiple times
          const result1 = engine.categorize(description, sortedRules);
          const result2 = engine.categorize(description, sortedRules);
          const result3 = engine.categorize(description, sortedRules);

          // All results should be identical
          expect(result1.matched).toBe(result2.matched);
          expect(result1.matched).toBe(result3.matched);
          expect(result1.categoryId).toBe(result2.categoryId);
          expect(result1.categoryId).toBe(result3.categoryId);
          expect(result1.matchedRule?.id).toBe(result2.matchedRule?.id);
          expect(result1.matchedRule?.id).toBe(result3.matchedRule?.id);
        }),
        { numRuns: 100 }
      );
    });

    it('categorization is consistent across engine instances', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);

          // Create multiple engine instances
          const engine1 = new CategorizationEngine();
          const engine2 = new CategorizationEngine();
          const engine3 = new CategorizationEngine();

          const result1 = engine1.categorize(description, sortedRules);
          const result2 = engine2.categorize(description, sortedRules);
          const result3 = engine3.categorize(description, sortedRules);

          // All results should be identical
          expect(result1.matched).toBe(result2.matched);
          expect(result1.matched).toBe(result3.matched);
          expect(result1.categoryId).toBe(result2.categoryId);
          expect(result1.categoryId).toBe(result3.categoryId);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Priority Selection Property', () => {
    it('highest priority matching rule is always selected', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);
          const result = engine.categorize(description, sortedRules);

          if (result.matched && result.matchedRule) {
            // Find all matching rules
            const allMatching = engine.findAllMatchingRules(description, sortedRules);

            if (allMatching.length > 0) {
              // The matched rule should have the highest priority among matching rules
              const highestPriority = Math.max(...allMatching.map((r) => r.priority));
              expect(result.matchedRule.priority).toBe(highestPriority);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('when multiple rules have same priority, first in sorted order is selected', () => {
      fc.assert(
        fc.property(
          descriptionArb,
          fc.array(ruleArb, { minLength: 2, maxLength: 10 }),
          (description, rules) => {
            // Set all rules to same priority and make them all match
            const samePriorityRules = rules.map((r, _i) => ({
              ...r,
              priority: 100,
              isActive: true,
              pattern: description.substring(0, 3) || 'a', // Ensure they all match
              matchType: 'contains' as MatchType,
            }));

            const sortedRules = sortByPriority(samePriorityRules);
            const result = engine.categorize(description, sortedRules);

            if (result.matched && sortedRules.length > 0) {
              // Should match the first rule in the sorted array
              expect(result.matchedRule?.id).toBe(sortedRules[0]!.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Active/Inactive Rule Property', () => {
    it('inactive rules are never matched', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          // Make all rules inactive
          const inactiveRules = rules.map((r) => ({ ...r, isActive: false }));
          const sortedRules = sortByPriority(inactiveRules);

          const result = engine.categorize(description, sortedRules);

          // Should never match
          expect(result.matched).toBe(false);
          expect(result.categoryId).toBeNull();
          expect(result.matchedRule).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('only active rules are considered for matching', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);
          const result = engine.categorize(description, sortedRules);

          if (result.matched && result.matchedRule) {
            // The matched rule must be active
            expect(result.matchedRule.isActive).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('No Match Property', () => {
    it('returns null category when no rules match', () => {
      fc.assert(
        fc.property(descriptionArb, (description) => {
          // Create rules that definitely won't match
          const nonMatchingRules: CategorizationRule[] = [
            {
              id: 'rule-1',
              pattern: 'ZZZZZZZZZZZ_UNIQUE_PATTERN_THAT_WONT_MATCH',
              categoryId: 'cat-1',
              matchType: 'exact',
              priority: 100,
              isActive: true,
              createdAt: new Date(),
            },
          ];

          const result = engine.categorize(description, nonMatchingRules);

          // Should not match unless description is exactly the pattern
          if (description.toLowerCase() !== nonMatchingRules[0]!.pattern.toLowerCase()) {
            expect(result.matched).toBe(false);
            expect(result.categoryId).toBeNull();
            expect(result.matchedRule).toBeNull();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('returns null category for empty rules array', () => {
      fc.assert(
        fc.property(descriptionArb, (description) => {
          const result = engine.categorize(description, []);

          expect(result.matched).toBe(false);
          expect(result.categoryId).toBeNull();
          expect(result.matchedRule).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Match Type Correctness Property', () => {
    it('contains match type works correctly', () => {
      fc.assert(
        fc.property(
          patternArb,
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          (pattern, prefix, suffix) => {
            const description = `${prefix}${pattern}${suffix}`;
            const rule: CategorizationRule = {
              id: 'rule-1',
              pattern,
              categoryId: 'cat-1',
              matchType: 'contains',
              priority: 100,
              isActive: true,
              createdAt: new Date(),
            };

            const result = engine.categorize(description, [rule]);

            // Should always match since description contains pattern
            expect(result.matched).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('starts_with match type works correctly', () => {
      fc.assert(
        fc.property(patternArb, fc.string({ minLength: 0, maxLength: 20 }), (pattern, suffix) => {
          const description = `${pattern}${suffix}`;
          const rule: CategorizationRule = {
            id: 'rule-1',
            pattern,
            categoryId: 'cat-1',
            matchType: 'starts_with',
            priority: 100,
            isActive: true,
            createdAt: new Date(),
          };

          const result = engine.categorize(description, [rule]);

          // Should always match since description starts with pattern
          expect(result.matched).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('ends_with match type works correctly', () => {
      fc.assert(
        fc.property(patternArb, fc.string({ minLength: 0, maxLength: 20 }), (pattern, prefix) => {
          const description = `${prefix}${pattern}`;
          const rule: CategorizationRule = {
            id: 'rule-1',
            pattern,
            categoryId: 'cat-1',
            matchType: 'ends_with',
            priority: 100,
            isActive: true,
            createdAt: new Date(),
          };

          const result = engine.categorize(description, [rule]);

          // Should always match since description ends with pattern
          expect(result.matched).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('exact match type works correctly', () => {
      fc.assert(
        fc.property(patternArb, (pattern) => {
          const rule: CategorizationRule = {
            id: 'rule-1',
            pattern,
            categoryId: 'cat-1',
            matchType: 'exact',
            priority: 100,
            isActive: true,
            createdAt: new Date(),
          };

          // Exact match
          const resultExact = engine.categorize(pattern, [rule]);
          expect(resultExact.matched).toBe(true);

          // Case-insensitive exact match
          const resultUpperCase = engine.categorize(pattern.toUpperCase(), [rule]);
          expect(resultUpperCase.matched).toBe(true);

          // Non-exact match (with extra text)
          if (pattern.length > 0) {
            const resultNonExact = engine.categorize(`${pattern} extra`, [rule]);
            expect(resultNonExact.matched).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Case Insensitivity Property', () => {
    it('matching is case-insensitive for non-regex patterns', () => {
      fc.assert(
        fc.property(
          patternArb,
          fc.constantFrom(
            'contains',
            'starts_with',
            'ends_with',
            'exact'
          ) as fc.Arbitrary<MatchType>,
          (pattern, matchType) => {
            const rule: CategorizationRule = {
              id: 'rule-1',
              pattern: pattern.toLowerCase(),
              categoryId: 'cat-1',
              matchType,
              priority: 100,
              isActive: true,
              createdAt: new Date(),
            };

            // Test with different cases
            const descriptions = [
              pattern.toLowerCase(),
              pattern.toUpperCase(),
              pattern.charAt(0).toUpperCase() + pattern.slice(1).toLowerCase(),
            ];

            for (const desc of descriptions) {
              const result = engine.categorize(desc, [rule]);
              // For exact match, the full description must match
              // For other types, the pattern must be found
              if (matchType === 'exact') {
                expect(result.matched).toBe(true);
              } else if (matchType === 'contains') {
                expect(result.matched).toBe(true);
              } else if (matchType === 'starts_with') {
                expect(result.matched).toBe(true);
              } else if (matchType === 'ends_with') {
                expect(result.matched).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Batch Categorization Property', () => {
    it('batch categorization produces same results as individual categorization', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArb, { minLength: 1, maxLength: 20 }),
          rulesArb,
          (descriptions, rules) => {
            const sortedRules = sortByPriority(rules);

            // Batch categorization
            const batchResult = engine.categorizeBatch(descriptions, sortedRules);

            // Individual categorization
            for (const description of descriptions) {
              const individualResult = engine.categorize(description, sortedRules);
              const batchResultForDesc = batchResult.results.get(description);

              expect(batchResultForDesc?.matched).toBe(individualResult.matched);
              expect(batchResultForDesc?.categoryId).toBe(individualResult.categoryId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('batch categorization counts are correct', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArb, { minLength: 1, maxLength: 20 }),
          rulesArb,
          (descriptions, rules) => {
            const sortedRules = sortByPriority(rules);
            const batchResult = engine.categorizeBatch(descriptions, sortedRules);

            // Count matched and unmatched
            let expectedMatched = 0;
            let expectedUnmatched = 0;

            for (const description of descriptions) {
              const result = engine.categorize(description, sortedRules);
              if (result.matched) {
                expectedMatched++;
              } else {
                expectedUnmatched++;
              }
            }

            expect(batchResult.matchedCount).toBe(expectedMatched);
            expect(batchResult.unmatchedCount).toBe(expectedUnmatched);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Find All Matching Rules Property', () => {
    it('findAllMatchingRules returns all rules that match', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);
          const allMatching = engine.findAllMatchingRules(description, sortedRules);

          // Verify each returned rule actually matches
          for (const rule of allMatching) {
            expect(engine.matchesRule(description, rule)).toBe(true);
            expect(rule.isActive).toBe(true);
          }

          // Verify no matching active rules were missed
          for (const rule of sortedRules) {
            if (rule.isActive && engine.matchesRule(description, rule)) {
              expect(allMatching).toContainEqual(rule);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Consistency with matchesPattern', () => {
    it('categorize result is consistent with matchesPattern', () => {
      fc.assert(
        fc.property(descriptionArb, rulesArb, (description, rules) => {
          const sortedRules = sortByPriority(rules);
          const result = engine.categorize(description, sortedRules);

          if (result.matched && result.matchedRule) {
            // The matched rule should pass matchesPattern
            expect(
              engine.matchesPattern(
                description,
                result.matchedRule.pattern,
                result.matchedRule.matchType
              )
            ).toBe(true);
          }

          // If no match, no active rule should match
          if (!result.matched) {
            for (const rule of sortedRules) {
              if (rule.isActive) {
                const matches = engine.matchesPattern(description, rule.pattern, rule.matchType);
                if (matches) {
                  // This should not happen - if a rule matches, categorize should have found it
                  fail(`Rule ${rule.id} matches but categorize returned no match`);
                }
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty description', () => {
      fc.assert(
        fc.property(rulesArb, (rules) => {
          const sortedRules = sortByPriority(rules);
          const result = engine.categorize('', sortedRules);

          // Empty description should only match rules with empty pattern or 'contains' with empty pattern
          if (result.matched && result.matchedRule) {
            expect(result.matchedRule.isActive).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('handles very long descriptions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 500, maxLength: 1000 }),
          rulesArb,
          (description, rules) => {
            const sortedRules = sortByPriority(rules);

            // Should not throw
            expect(() => engine.categorize(description, sortedRules)).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles special characters in descriptions', () => {
      fc.assert(
        fc.property(rulesArb, (rules) => {
          const specialDescriptions = [
            'UBER *TRIP 12345',
            'AMAZON.COM*123ABC',
            'PAG*JOSELITO',
            'PIX - RECEBIDO',
            'COMPRA (DÉBITO)',
            'TRANSFERÊNCIA R$ 100,00',
          ];

          const sortedRules = sortByPriority(rules);

          for (const description of specialDescriptions) {
            // Should not throw
            expect(() => engine.categorize(description, sortedRules)).not.toThrow();
          }
        }),
        { numRuns: 50 }
      );
    });
  });
});
