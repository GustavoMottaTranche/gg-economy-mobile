/**
 * Match type for categorization rules
 */
export type MatchType = 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';

/**
 * Categorization rule entity for automatic category assignment
 */
export interface CategorizationRule {
  /** Unique identifier (UUID) */
  id: string;
  /** Pattern to match against transaction description */
  pattern: string;
  /** Category to assign when pattern matches */
  categoryId: string;
  /** Type of pattern matching */
  matchType: MatchType;
  /** Priority for rule ordering (higher = checked first) */
  priority: number;
  /** Whether the rule is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a new categorization rule
 */
export interface CreateCategorizationRuleDTO {
  pattern: string;
  categoryId: string;
  matchType: MatchType;
  priority?: number;
}

/**
 * DTO for updating an existing categorization rule
 */
export interface UpdateCategorizationRuleDTO {
  pattern?: string;
  categoryId?: string;
  matchType?: MatchType;
  priority?: number;
  isActive?: boolean;
}
