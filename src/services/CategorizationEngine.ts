/**
 * Categorization Engine for automatic transaction categorization
 *
 * Features:
 * - Rule-based matching with multiple match types (contains, starts_with, ends_with, exact, regex)
 * - Priority-based rule selection (higher priority rules are checked first)
 * - Pattern learning from user categorizations
 * - Deterministic and consistent matching
 *
 * Match Types:
 * - exact: Description must match pattern exactly (case-insensitive)
 * - contains: Description must contain the pattern (case-insensitive)
 * - starts_with: Description must start with the pattern (case-insensitive)
 * - ends_with: Description must end with the pattern (case-insensitive)
 * - regex: Description must match the regex pattern (case-insensitive)
 *
 * @module CategorizationEngine
 */

import type { CategorizationRule, MatchType } from '../types/categorizationRule';

/**
 * Result of categorization for a single transaction
 */
export interface CategorizationResult {
  /** The category ID to assign (null if no match) */
  categoryId: string | null;
  /** The rule that matched (null if no match) */
  matchedRule: CategorizationRule | null;
  /** Whether a match was found */
  matched: boolean;
}

/**
 * Result of batch categorization
 */
export interface BatchCategorizationResult {
  /** Results for each description */
  results: Map<string, CategorizationResult>;
  /** Number of descriptions that matched a rule */
  matchedCount: number;
  /** Number of descriptions that did not match any rule */
  unmatchedCount: number;
}

/**
 * Pattern learning result
 */
export interface LearnedPattern {
  /** The pattern extracted from the description */
  pattern: string;
  /** Suggested match type */
  matchType: MatchType;
  /** The category ID to assign */
  categoryId: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Options for pattern learning
 */
export interface PatternLearningOptions {
  /** Minimum occurrences to consider a pattern (default: 2) */
  minOccurrences?: number;
  /** Minimum confidence threshold (default: 0.7) */
  minConfidence?: number;
  /** Whether to extract common prefixes (default: true) */
  extractPrefixes?: boolean;
  /** Whether to extract common words (default: true) */
  extractCommonWords?: boolean;
}

/**
 * User categorization for pattern learning
 */
export interface UserCategorization {
  /** Transaction description */
  description: string;
  /** Category ID assigned by user */
  categoryId: string;
}

/**
 * Categorization Engine class for automatic transaction categorization
 */
export class CategorizationEngine {
  /**
   * Categorizes a transaction description using the provided rules
   * Returns the highest-priority matching rule's category, or null if no rules match
   *
   * @param description - Transaction description to categorize
   * @param rules - Active categorization rules (should be sorted by priority descending)
   * @returns Categorization result with matched category and rule
   */
  categorize(description: string, rules: CategorizationRule[]): CategorizationResult {
    // Rules should already be sorted by priority (descending)
    // We iterate through and return the first match (highest priority)
    for (const rule of rules) {
      if (!rule.isActive) {
        continue;
      }

      if (this.matchesRule(description, rule)) {
        return {
          categoryId: rule.categoryId,
          matchedRule: rule,
          matched: true,
        };
      }
    }

    return {
      categoryId: null,
      matchedRule: null,
      matched: false,
    };
  }

  /**
   * Categorizes multiple transaction descriptions in batch
   *
   * @param descriptions - Array of transaction descriptions
   * @param rules - Active categorization rules (should be sorted by priority descending)
   * @returns Batch categorization result
   */
  categorizeBatch(descriptions: string[], rules: CategorizationRule[]): BatchCategorizationResult {
    const results = new Map<string, CategorizationResult>();
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const description of descriptions) {
      const result = this.categorize(description, rules);
      results.set(description, result);

      if (result.matched) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    return {
      results,
      matchedCount,
      unmatchedCount,
    };
  }

  /**
   * Finds all matching rules for a description (not just the highest priority)
   *
   * @param description - Transaction description
   * @param rules - Active categorization rules
   * @returns Array of matching rules sorted by priority (descending)
   */
  findAllMatchingRules(description: string, rules: CategorizationRule[]): CategorizationRule[] {
    return rules.filter((rule) => rule.isActive && this.matchesRule(description, rule));
  }

  /**
   * Checks if a description matches a rule's pattern
   *
   * @param description - Transaction description
   * @param rule - Categorization rule to check
   * @returns True if the description matches the rule
   */
  matchesRule(description: string, rule: CategorizationRule): boolean {
    return this.matchesPattern(description, rule.pattern, rule.matchType);
  }

  /**
   * Checks if a description matches a pattern with the given match type
   *
   * @param description - Transaction description
   * @param pattern - Pattern to match
   * @param matchType - Type of matching to perform
   * @returns True if the description matches the pattern
   */
  matchesPattern(description: string, pattern: string, matchType: MatchType): boolean {
    const normalizedDescription = description.toLowerCase();
    const normalizedPattern = pattern.toLowerCase();

    switch (matchType) {
      case 'exact':
        return normalizedDescription === normalizedPattern;

      case 'contains':
        return normalizedDescription.includes(normalizedPattern);

      case 'starts_with':
        return normalizedDescription.startsWith(normalizedPattern);

      case 'ends_with':
        return normalizedDescription.endsWith(normalizedPattern);

      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(description);
        } catch {
          // Invalid regex pattern - return false
          return false;
        }

      default:
        // Unknown match type - return false
        return false;
    }
  }

  /**
   * Learns patterns from user categorizations
   * Analyzes descriptions that users have categorized to suggest new rules
   *
   * @param categorizations - Array of user categorizations
   * @param existingRules - Existing rules to avoid duplicates
   * @param options - Pattern learning options
   * @returns Array of learned patterns that could become new rules
   */
  learnPatterns(
    categorizations: UserCategorization[],
    existingRules: CategorizationRule[] = [],
    options: PatternLearningOptions = {}
  ): LearnedPattern[] {
    const {
      minOccurrences = 2,
      minConfidence = 0.7,
      extractPrefixes = true,
      extractCommonWords = true,
    } = options;

    const learnedPatterns: LearnedPattern[] = [];

    // Group categorizations by category
    const byCategory = this.groupByCategory(categorizations);

    for (const [categoryId, descriptions] of byCategory.entries()) {
      // Skip if not enough samples
      if (descriptions.length < minOccurrences) {
        continue;
      }

      // Extract patterns from descriptions
      const patterns = this.extractPatterns(descriptions, {
        extractPrefixes,
        extractCommonWords,
      });

      for (const pattern of patterns) {
        // Skip if pattern already exists in rules
        if (this.patternExistsInRules(pattern.pattern, pattern.matchType, existingRules)) {
          continue;
        }

        // Calculate confidence based on how many descriptions match
        const matchCount = descriptions.filter((desc) =>
          this.matchesPattern(desc, pattern.pattern, pattern.matchType)
        ).length;

        const confidence = matchCount / descriptions.length;

        if (confidence >= minConfidence) {
          learnedPatterns.push({
            pattern: pattern.pattern,
            matchType: pattern.matchType,
            categoryId,
            confidence,
          });
        }
      }
    }

    // Sort by confidence (descending)
    return learnedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggests a category for a description based on similar past categorizations
   *
   * @param description - Description to suggest category for
   * @param pastCategorizations - Past user categorizations
   * @param similarityThreshold - Minimum similarity to consider (default: 0.6)
   * @returns Suggested category ID or null if no suggestion
   */
  suggestCategory(
    description: string,
    pastCategorizations: UserCategorization[],
    similarityThreshold: number = 0.6
  ): string | null {
    if (pastCategorizations.length === 0) {
      return null;
    }

    // Find similar descriptions
    const similarities = pastCategorizations.map((cat) => ({
      categorization: cat,
      similarity: this.calculateSimilarity(description, cat.description),
    }));

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return the category of the most similar description if similarity is high enough
    const topMatch = similarities[0];
    if (similarities.length > 0 && topMatch && topMatch.similarity >= similarityThreshold) {
      return topMatch.categorization.categoryId;
    }

    return null;
  }

  /**
   * Groups categorizations by category ID
   */
  private groupByCategory(categorizations: UserCategorization[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();

    for (const cat of categorizations) {
      const descriptions = grouped.get(cat.categoryId) || [];
      descriptions.push(cat.description);
      grouped.set(cat.categoryId, descriptions);
    }

    return grouped;
  }

  /**
   * Extracts potential patterns from a set of descriptions
   */
  private extractPatterns(
    descriptions: string[],
    options: { extractPrefixes: boolean; extractCommonWords: boolean }
  ): Array<{ pattern: string; matchType: MatchType }> {
    const patterns: Array<{ pattern: string; matchType: MatchType }> = [];

    // Extract common prefixes
    if (options.extractPrefixes) {
      const prefix = this.findCommonPrefix(descriptions);
      if (prefix && prefix.length >= 3) {
        patterns.push({ pattern: prefix, matchType: 'starts_with' });
      }
    }

    // Extract common words
    if (options.extractCommonWords) {
      const commonWords = this.findCommonWords(descriptions);
      for (const word of commonWords) {
        if (word.length >= 3) {
          patterns.push({ pattern: word, matchType: 'contains' });
        }
      }
    }

    return patterns;
  }

  /**
   * Finds the longest common prefix among descriptions
   */
  private findCommonPrefix(descriptions: string[]): string {
    if (descriptions.length === 0) {
      return '';
    }

    const normalized = descriptions.map((d) => d.toLowerCase());
    const firstNormalized = normalized[0];
    if (!firstNormalized) {
      return '';
    }
    let prefix = firstNormalized;

    for (let i = 1; i < normalized.length; i++) {
      const current = normalized[i];
      if (!current) continue;
      while (!current.startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
    }

    // Trim to word boundary
    const lastSpace = prefix.lastIndexOf(' ');
    if (lastSpace > 0 && prefix.length - lastSpace < 3) {
      prefix = prefix.slice(0, lastSpace);
    }

    return prefix.trim();
  }

  /**
   * Finds common words that appear in most descriptions
   */
  private findCommonWords(descriptions: string[]): string[] {
    if (descriptions.length === 0) {
      return [];
    }

    // Count word occurrences
    const wordCounts = new Map<string, number>();

    for (const desc of descriptions) {
      const words = new Set(
        desc
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 3)
      );

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Find words that appear in at least 70% of descriptions
    const threshold = Math.ceil(descriptions.length * 0.7);
    const commonWords: string[] = [];

    for (const [word, count] of wordCounts.entries()) {
      if (count >= threshold) {
        commonWords.push(word);
      }
    }

    return commonWords;
  }

  /**
   * Checks if a pattern already exists in the rules
   */
  private patternExistsInRules(
    pattern: string,
    matchType: MatchType,
    rules: CategorizationRule[]
  ): boolean {
    const normalizedPattern = pattern.toLowerCase();

    return rules.some(
      (rule) => rule.pattern.toLowerCase() === normalizedPattern && rule.matchType === matchType
    );
  }

  /**
   * Calculates similarity between two descriptions
   * Uses a combination of word overlap, prefix similarity, and character-level similarity
   */
  private calculateSimilarity(desc1: string, desc2: string): number {
    const normalized1 = desc1.toLowerCase().trim();
    const normalized2 = desc2.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Empty strings
    if (normalized1.length === 0 || normalized2.length === 0) {
      return 0;
    }

    // Word overlap similarity (Jaccard)
    const words1 = new Set(normalized1.split(/\s+/).filter((w) => w.length >= 2));
    const words2 = new Set(normalized2.split(/\s+/).filter((w) => w.length >= 2));

    let jaccardSimilarity = 0;
    if (words1.size > 0 && words2.size > 0) {
      const intersection = new Set([...words1].filter((w) => words2.has(w)));
      const union = new Set([...words1, ...words2]);
      jaccardSimilarity = intersection.size / union.size;
    }

    // Prefix similarity - important for transaction descriptions
    const prefixLength = this.commonPrefixLength(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const prefixSimilarity = prefixLength / maxLength;

    // Character-level similarity using longest common subsequence ratio
    const lcsLength = this.longestCommonSubsequenceLength(normalized1, normalized2);
    const lcsSimilarity = (2 * lcsLength) / (normalized1.length + normalized2.length);

    // Combine similarities with weights that favor prefix and word overlap
    // Prefix is very important for transaction descriptions (e.g., "UBER TRIP TO X")
    return jaccardSimilarity * 0.4 + prefixSimilarity * 0.35 + lcsSimilarity * 0.25;
  }

  /**
   * Calculates the length of the longest common subsequence
   */
  private longestCommonSubsequenceLength(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Use space-optimized DP
    const prev = new Array(n + 1).fill(0);
    const curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          curr[j] = prev[j - 1] + 1;
        } else {
          curr[j] = Math.max(prev[j], curr[j - 1]);
        }
      }
      // Swap arrays
      for (let j = 0; j <= n; j++) {
        prev[j] = curr[j];
      }
    }

    return prev[n];
  }

  /**
   * Calculates the length of the common prefix between two strings
   */
  private commonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    const minLength = Math.min(str1.length, str2.length);

    while (i < minLength && str1[i] === str2[i]) {
      i++;
    }

    return i;
  }
}

/**
 * Default CategorizationEngine instance
 */
export const categorizationEngine = new CategorizationEngine();
