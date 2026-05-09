/**
 * Unit Tests for CategorizationEngine
 *
 * Tests rule matching (contains, starts_with, ends_with, exact, regex),
 * priority-based rule selection, and pattern learning from user categorizations.
 *
 * **Validates: Requirements 18, 29, 32**
 *
 * @module CategorizationEngine.test
 */

import {
  CategorizationEngine,
  CategorizationResult,
  BatchCategorizationResult,
  LearnedPattern,
  UserCategorization,
} from '../../../src/services/CategorizationEngine';
import type { CategorizationRule, MatchType } from '../../../src/types/categorizationRule';

describe('CategorizationEngine', () => {
  let engine: CategorizationEngine;

  beforeEach(() => {
    engine = new CategorizationEngine();
  });

  /**
   * Helper to create a CategorizationRule
   */
  function createRule(overrides: Partial<CategorizationRule> = {}): CategorizationRule {
    return {
      id: 'rule-001',
      pattern: 'test',
      categoryId: 'cat-001',
      matchType: 'contains',
      priority: 0,
      isActive: true,
      createdAt: new Date(),
      ...overrides,
    };
  }

  describe('categorize', () => {
    describe('match type: contains', () => {
      it('should match when description contains the pattern', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'contains' })];
        const result = engine.categorize('UBER TRIP TO AIRPORT', rules);

        expect(result.matched).toBe(true);
        expect(result.categoryId).toBe('cat-001');
        expect(result.matchedRule).toEqual(rules[0]);
      });

      it('should match case-insensitively', () => {
        const rules = [createRule({ pattern: 'UBER', matchType: 'contains' })];
        const result = engine.categorize('uber trip', rules);

        expect(result.matched).toBe(true);
      });

      it('should not match when pattern is not contained', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'contains' })];
        const result = engine.categorize('LYFT RIDE', rules);

        expect(result.matched).toBe(false);
        expect(result.categoryId).toBeNull();
        expect(result.matchedRule).toBeNull();
      });

      it('should match pattern anywhere in description', () => {
        const rules = [createRule({ pattern: 'market', matchType: 'contains' })];

        expect(engine.categorize('SUPERMARKET', rules).matched).toBe(true);
        expect(engine.categorize('MARKET PLACE', rules).matched).toBe(true);
        expect(engine.categorize('FISH MARKET STORE', rules).matched).toBe(true);
      });
    });

    describe('match type: starts_with', () => {
      it('should match when description starts with the pattern', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'starts_with' })];
        const result = engine.categorize('UBER TRIP', rules);

        expect(result.matched).toBe(true);
      });

      it('should not match when pattern is in the middle', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'starts_with' })];
        const result = engine.categorize('MY UBER TRIP', rules);

        expect(result.matched).toBe(false);
      });

      it('should match case-insensitively', () => {
        const rules = [createRule({ pattern: 'UBER', matchType: 'starts_with' })];
        const result = engine.categorize('uber trip', rules);

        expect(result.matched).toBe(true);
      });
    });

    describe('match type: ends_with', () => {
      it('should match when description ends with the pattern', () => {
        const rules = [createRule({ pattern: 'store', matchType: 'ends_with' })];
        const result = engine.categorize('GROCERY STORE', rules);

        expect(result.matched).toBe(true);
      });

      it('should not match when pattern is at the beginning', () => {
        const rules = [createRule({ pattern: 'store', matchType: 'ends_with' })];
        const result = engine.categorize('STORE PURCHASE', rules);

        expect(result.matched).toBe(false);
      });

      it('should match case-insensitively', () => {
        const rules = [createRule({ pattern: 'STORE', matchType: 'ends_with' })];
        const result = engine.categorize('grocery store', rules);

        expect(result.matched).toBe(true);
      });
    });

    describe('match type: exact', () => {
      it('should match when description exactly matches the pattern', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'exact' })];
        const result = engine.categorize('UBER', rules);

        expect(result.matched).toBe(true);
      });

      it('should not match when description has extra text', () => {
        const rules = [createRule({ pattern: 'uber', matchType: 'exact' })];
        const result = engine.categorize('UBER TRIP', rules);

        expect(result.matched).toBe(false);
      });

      it('should match case-insensitively', () => {
        const rules = [createRule({ pattern: 'UBER', matchType: 'exact' })];
        const result = engine.categorize('uber', rules);

        expect(result.matched).toBe(true);
      });
    });

    describe('match type: regex', () => {
      it('should match using regex pattern', () => {
        const rules = [createRule({ pattern: 'uber.*trip', matchType: 'regex' })];
        const result = engine.categorize('UBER AIRPORT TRIP', rules);

        expect(result.matched).toBe(true);
      });

      it('should match case-insensitively', () => {
        const rules = [createRule({ pattern: 'UBER', matchType: 'regex' })];
        const result = engine.categorize('uber trip', rules);

        expect(result.matched).toBe(true);
      });

      it('should support complex regex patterns', () => {
        const rules = [createRule({ pattern: '^(uber|lyft)\\s+', matchType: 'regex' })];

        expect(engine.categorize('UBER TRIP', rules).matched).toBe(true);
        expect(engine.categorize('LYFT RIDE', rules).matched).toBe(true);
        expect(engine.categorize('MY UBER', rules).matched).toBe(false);
      });

      it('should handle invalid regex gracefully', () => {
        const rules = [createRule({ pattern: '[invalid(regex', matchType: 'regex' })];
        const result = engine.categorize('test', rules);

        expect(result.matched).toBe(false);
      });

      it('should support digit matching', () => {
        const rules = [createRule({ pattern: '\\d{4}', matchType: 'regex' })];

        expect(engine.categorize('PAYMENT 1234', rules).matched).toBe(true);
        expect(engine.categorize('PAYMENT ABC', rules).matched).toBe(false);
      });
    });

    describe('priority-based rule selection', () => {
      it('should return the highest priority matching rule', () => {
        const rules = [
          createRule({ id: 'rule-1', pattern: 'uber', priority: 10, categoryId: 'transport' }),
          createRule({ id: 'rule-2', pattern: 'uber', priority: 20, categoryId: 'rideshare' }),
          createRule({ id: 'rule-3', pattern: 'uber', priority: 5, categoryId: 'other' }),
        ];

        // Sort by priority descending (as the engine expects)
        const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
        const result = engine.categorize('UBER TRIP', sortedRules);

        expect(result.matched).toBe(true);
        expect(result.categoryId).toBe('rideshare');
        expect(result.matchedRule?.id).toBe('rule-2');
      });

      it('should return first match when priorities are equal', () => {
        const rules = [
          createRule({ id: 'rule-1', pattern: 'uber', priority: 10, categoryId: 'cat-1' }),
          createRule({ id: 'rule-2', pattern: 'trip', priority: 10, categoryId: 'cat-2' }),
        ];

        const result = engine.categorize('UBER TRIP', rules);

        expect(result.matched).toBe(true);
        expect(result.matchedRule?.id).toBe('rule-1');
      });

      it('should skip inactive rules', () => {
        const rules = [
          createRule({
            id: 'rule-1',
            pattern: 'uber',
            priority: 20,
            isActive: false,
            categoryId: 'inactive',
          }),
          createRule({
            id: 'rule-2',
            pattern: 'uber',
            priority: 10,
            isActive: true,
            categoryId: 'active',
          }),
        ];

        const result = engine.categorize('UBER TRIP', rules);

        expect(result.matched).toBe(true);
        expect(result.categoryId).toBe('active');
      });

      it('should return no match when all matching rules are inactive', () => {
        const rules = [createRule({ pattern: 'uber', isActive: false })];

        const result = engine.categorize('UBER TRIP', rules);

        expect(result.matched).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return no match for empty rules array', () => {
        const result = engine.categorize('UBER TRIP', []);

        expect(result.matched).toBe(false);
        expect(result.categoryId).toBeNull();
      });

      it('should return no match for empty description', () => {
        const rules = [createRule({ pattern: 'uber' })];
        const result = engine.categorize('', rules);

        expect(result.matched).toBe(false);
      });

      it('should handle empty pattern', () => {
        const rules = [createRule({ pattern: '', matchType: 'contains' })];
        const result = engine.categorize('UBER TRIP', rules);

        // Empty pattern should match everything with 'contains'
        expect(result.matched).toBe(true);
      });

      it('should handle special characters in pattern for non-regex', () => {
        const rules = [createRule({ pattern: 'uber (trip)', matchType: 'contains' })];
        const result = engine.categorize('UBER (TRIP) TO AIRPORT', rules);

        expect(result.matched).toBe(true);
      });

      it('should handle unicode characters', () => {
        const rules = [createRule({ pattern: 'café', matchType: 'contains' })];
        const result = engine.categorize('CAFÉ PURCHASE', rules);

        expect(result.matched).toBe(true);
      });
    });
  });

  describe('categorizeBatch', () => {
    it('should categorize multiple descriptions', () => {
      const rules = [
        createRule({ pattern: 'uber', categoryId: 'transport' }),
        createRule({ pattern: 'grocery', categoryId: 'food' }),
      ];

      const descriptions = ['UBER TRIP', 'GROCERY STORE', 'UNKNOWN PURCHASE'];
      const result = engine.categorizeBatch(descriptions, rules);

      expect(result.matchedCount).toBe(2);
      expect(result.unmatchedCount).toBe(1);
      expect(result.results.get('UBER TRIP')?.categoryId).toBe('transport');
      expect(result.results.get('GROCERY STORE')?.categoryId).toBe('food');
      expect(result.results.get('UNKNOWN PURCHASE')?.matched).toBe(false);
    });

    it('should handle empty descriptions array', () => {
      const rules = [createRule()];
      const result = engine.categorizeBatch([], rules);

      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedCount).toBe(0);
      expect(result.results.size).toBe(0);
    });

    it('should handle duplicate descriptions', () => {
      const rules = [createRule({ pattern: 'uber', categoryId: 'transport' })];
      const descriptions = ['UBER TRIP', 'UBER TRIP', 'UBER RIDE'];
      const result = engine.categorizeBatch(descriptions, rules);

      // Map will have unique keys, so duplicates are merged
      expect(result.results.size).toBe(2);
      expect(result.matchedCount).toBe(3);
    });
  });

  describe('findAllMatchingRules', () => {
    it('should return all matching rules', () => {
      const rules = [
        createRule({ id: 'rule-1', pattern: 'uber', priority: 10 }),
        createRule({ id: 'rule-2', pattern: 'trip', priority: 5 }),
        createRule({ id: 'rule-3', pattern: 'airport', priority: 1 }),
      ];

      const matches = engine.findAllMatchingRules('UBER TRIP TO AIRPORT', rules);

      expect(matches).toHaveLength(3);
    });

    it('should exclude inactive rules', () => {
      const rules = [
        createRule({ id: 'rule-1', pattern: 'uber', isActive: true }),
        createRule({ id: 'rule-2', pattern: 'uber', isActive: false }),
      ];

      const matches = engine.findAllMatchingRules('UBER TRIP', rules);

      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('rule-1');
    });

    it('should return empty array when no rules match', () => {
      const rules = [createRule({ pattern: 'uber' })];
      const matches = engine.findAllMatchingRules('LYFT RIDE', rules);

      expect(matches).toHaveLength(0);
    });
  });

  describe('matchesPattern', () => {
    it('should correctly match contains pattern', () => {
      expect(engine.matchesPattern('UBER TRIP', 'uber', 'contains')).toBe(true);
      expect(engine.matchesPattern('LYFT RIDE', 'uber', 'contains')).toBe(false);
    });

    it('should correctly match starts_with pattern', () => {
      expect(engine.matchesPattern('UBER TRIP', 'uber', 'starts_with')).toBe(true);
      expect(engine.matchesPattern('MY UBER', 'uber', 'starts_with')).toBe(false);
    });

    it('should correctly match ends_with pattern', () => {
      expect(engine.matchesPattern('GROCERY STORE', 'store', 'ends_with')).toBe(true);
      expect(engine.matchesPattern('STORE PURCHASE', 'store', 'ends_with')).toBe(false);
    });

    it('should correctly match exact pattern', () => {
      expect(engine.matchesPattern('UBER', 'uber', 'exact')).toBe(true);
      expect(engine.matchesPattern('UBER TRIP', 'uber', 'exact')).toBe(false);
    });

    it('should correctly match regex pattern', () => {
      expect(engine.matchesPattern('UBER 123', 'uber\\s+\\d+', 'regex')).toBe(true);
      expect(engine.matchesPattern('UBER ABC', 'uber\\s+\\d+', 'regex')).toBe(false);
    });

    it('should return false for unknown match type', () => {
      expect(engine.matchesPattern('test', 'test', 'unknown' as MatchType)).toBe(false);
    });
  });

  describe('learnPatterns', () => {
    it('should learn common prefix patterns', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP TO AIRPORT', categoryId: 'transport' },
        { description: 'UBER RIDE DOWNTOWN', categoryId: 'transport' },
        { description: 'UBER EATS ORDER', categoryId: 'transport' },
      ];

      const patterns = engine.learnPatterns(categorizations);

      expect(patterns.length).toBeGreaterThan(0);
      const uberPattern = patterns.find((p) => p.pattern.toLowerCase().includes('uber'));
      expect(uberPattern).toBeDefined();
      expect(uberPattern?.categoryId).toBe('transport');
    });

    it('should learn common word patterns', () => {
      const categorizations: UserCategorization[] = [
        { description: 'GROCERY STORE PURCHASE', categoryId: 'food' },
        { description: 'LOCAL GROCERY MARKET', categoryId: 'food' },
        { description: 'GROCERY OUTLET', categoryId: 'food' },
      ];

      const patterns = engine.learnPatterns(categorizations);

      const groceryPattern = patterns.find((p) => p.pattern.toLowerCase() === 'grocery');
      expect(groceryPattern).toBeDefined();
      expect(groceryPattern?.matchType).toBe('contains');
    });

    it('should respect minimum occurrences', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP', categoryId: 'transport' },
      ];

      const patterns = engine.learnPatterns(categorizations, [], { minOccurrences: 2 });

      expect(patterns).toHaveLength(0);
    });

    it('should respect minimum confidence', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP', categoryId: 'transport' },
        { description: 'LYFT RIDE', categoryId: 'transport' },
        { description: 'TAXI FARE', categoryId: 'transport' },
      ];

      const patterns = engine.learnPatterns(categorizations, [], { minConfidence: 0.9 });

      // No common pattern matches 90% of descriptions
      expect(patterns.filter((p) => p.confidence >= 0.9)).toHaveLength(0);
    });

    it('should exclude patterns that already exist in rules', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP', categoryId: 'transport' },
        { description: 'UBER RIDE', categoryId: 'transport' },
      ];

      const existingRules = [createRule({ pattern: 'uber', matchType: 'starts_with' })];

      const patterns = engine.learnPatterns(categorizations, existingRules);

      const uberStartsWithPattern = patterns.find(
        (p) => p.pattern.toLowerCase() === 'uber' && p.matchType === 'starts_with'
      );
      expect(uberStartsWithPattern).toBeUndefined();
    });

    it('should group patterns by category', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP', categoryId: 'transport' },
        { description: 'UBER RIDE', categoryId: 'transport' },
        { description: 'GROCERY STORE', categoryId: 'food' },
        { description: 'GROCERY MARKET', categoryId: 'food' },
      ];

      const patterns = engine.learnPatterns(categorizations);

      const transportPatterns = patterns.filter((p) => p.categoryId === 'transport');
      const foodPatterns = patterns.filter((p) => p.categoryId === 'food');

      expect(transportPatterns.length).toBeGreaterThan(0);
      expect(foodPatterns.length).toBeGreaterThan(0);
    });

    it('should sort patterns by confidence descending', () => {
      const categorizations: UserCategorization[] = [
        { description: 'UBER TRIP', categoryId: 'transport' },
        { description: 'UBER RIDE', categoryId: 'transport' },
        { description: 'UBER EATS', categoryId: 'transport' },
        { description: 'LYFT RIDE', categoryId: 'transport' },
      ];

      const patterns = engine.learnPatterns(categorizations);

      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i - 1].confidence).toBeGreaterThanOrEqual(patterns[i].confidence);
      }
    });

    it('should handle empty categorizations', () => {
      const patterns = engine.learnPatterns([]);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('suggestCategory', () => {
    it('should suggest category based on similar past categorizations', () => {
      const pastCategorizations: UserCategorization[] = [
        { description: 'UBER TRIP TO AIRPORT', categoryId: 'transport' },
        { description: 'UBER RIDE DOWNTOWN', categoryId: 'transport' },
      ];

      const suggestion = engine.suggestCategory('UBER TRIP TO MALL', pastCategorizations);

      expect(suggestion).toBe('transport');
    });

    it('should return null when no similar categorizations found', () => {
      const pastCategorizations: UserCategorization[] = [
        { description: 'GROCERY STORE', categoryId: 'food' },
      ];

      const suggestion = engine.suggestCategory('UBER TRIP', pastCategorizations);

      expect(suggestion).toBeNull();
    });

    it('should return null for empty past categorizations', () => {
      const suggestion = engine.suggestCategory('UBER TRIP', []);
      expect(suggestion).toBeNull();
    });

    it('should find the most similar categorization', () => {
      const pastCategorizations: UserCategorization[] = [
        { description: 'UBER TRIP TO AIRPORT', categoryId: 'transport' },
        { description: 'UBER EATS ORDER', categoryId: 'food' },
      ];

      const suggestion = engine.suggestCategory('UBER TRIP TO MALL', pastCategorizations);

      expect(suggestion).toBe('transport');
    });
  });

  describe('matchesRule', () => {
    it('should delegate to matchesPattern with rule properties', () => {
      const rule = createRule({ pattern: 'uber', matchType: 'contains' });

      expect(engine.matchesRule('UBER TRIP', rule)).toBe(true);
      expect(engine.matchesRule('LYFT RIDE', rule)).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should categorize common bank transaction descriptions', () => {
      const rules = [
        createRule({
          pattern: 'uber',
          matchType: 'contains',
          categoryId: 'transport',
          priority: 10,
        }),
        createRule({
          pattern: 'lyft',
          matchType: 'contains',
          categoryId: 'transport',
          priority: 10,
        }),
        createRule({
          pattern: 'amazon',
          matchType: 'contains',
          categoryId: 'shopping',
          priority: 5,
        }),
        createRule({
          pattern: 'netflix',
          matchType: 'contains',
          categoryId: 'entertainment',
          priority: 5,
        }),
        createRule({
          pattern: 'spotify',
          matchType: 'contains',
          categoryId: 'entertainment',
          priority: 5,
        }),
        createRule({
          pattern: '^pix\\s+',
          matchType: 'regex',
          categoryId: 'transfer',
          priority: 1,
        }),
      ].sort((a, b) => b.priority - a.priority);

      expect(engine.categorize('UBER *TRIP 12345', rules).categoryId).toBe('transport');
      expect(engine.categorize('LYFT RIDE', rules).categoryId).toBe('transport');
      expect(engine.categorize('AMAZON.COM*123ABC', rules).categoryId).toBe('shopping');
      expect(engine.categorize('NETFLIX.COM', rules).categoryId).toBe('entertainment');
      expect(engine.categorize('SPOTIFY USA', rules).categoryId).toBe('entertainment');
      expect(engine.categorize('PIX RECEBIDO', rules).categoryId).toBe('transfer');
      expect(engine.categorize('UNKNOWN MERCHANT', rules).matched).toBe(false);
    });

    it('should handle Brazilian bank statement patterns', () => {
      const rules = [
        createRule({
          pattern: 'pag*',
          matchType: 'starts_with',
          categoryId: 'payment',
          priority: 10,
        }),
        createRule({
          pattern: 'mercado pago',
          matchType: 'contains',
          categoryId: 'payment',
          priority: 10,
        }),
        createRule({ pattern: 'ifood', matchType: 'contains', categoryId: 'food', priority: 5 }),
        createRule({ pattern: 'rappi', matchType: 'contains', categoryId: 'food', priority: 5 }),
        createRule({
          pattern: '99\\s*(pop|taxi)',
          matchType: 'regex',
          categoryId: 'transport',
          priority: 5,
        }),
      ].sort((a, b) => b.priority - a.priority);

      expect(engine.categorize('PAG*JOSELITO', rules).categoryId).toBe('payment');
      expect(engine.categorize('MERCADO PAGO *LOJA', rules).categoryId).toBe('payment');
      expect(engine.categorize('IFOOD *RESTAURANTE', rules).categoryId).toBe('food');
      expect(engine.categorize('RAPPI*DELIVERY', rules).categoryId).toBe('food');
      expect(engine.categorize('99 POP CORRIDA', rules).categoryId).toBe('transport');
      expect(engine.categorize('99 TAXI', rules).categoryId).toBe('transport');
    });
  });
});
