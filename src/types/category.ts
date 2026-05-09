/**
 * Category type - income or expense
 */
export type CategoryType = 'income' | 'expense';

/**
 * Category entity for transaction classification
 */
export interface Category {
  /** Unique identifier (UUID) */
  id: string;
  /** Category name (e.g., "Food", "Transport", "Salary") */
  name: string;
  /** Category type - income or expense */
  type: CategoryType;
  /** Icon identifier for UI display */
  icon: string;
  /** Color hex code for UI display */
  color: string;
  /** Whether the category is active (soft delete) */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a new category
 */
export interface CreateCategoryDTO {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

/**
 * DTO for updating an existing category
 */
export interface UpdateCategoryDTO {
  name?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
  isActive?: boolean;
}
