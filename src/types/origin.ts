/**
 * Origin type - source of transactions
 */
export type OriginType = 'bank' | 'credit_card' | 'investment' | 'other';

/**
 * Origin entity representing the source of transactions
 */
export interface Origin {
  /** Unique identifier (UUID) */
  id: string;
  /** Origin name (e.g., "Nubank", "Itaú", "XP Investimentos") */
  name: string;
  /** Origin type */
  type: OriginType;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a new origin
 */
export interface CreateOriginDTO {
  name: string;
  type: OriginType;
}

/**
 * DTO for updating an existing origin
 */
export interface UpdateOriginDTO {
  name?: string;
  type?: OriginType;
}
