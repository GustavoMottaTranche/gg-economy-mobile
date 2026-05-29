import { CategoryType } from './category';

/**
 * Detail of a single installment parcel
 */
export interface InstallmentDetail {
  /** 1-based parcel number */
  index: number;
  /** Total number of parcels */
  totalParcels: number;
  /** Value in cents for this parcel */
  amount: number;
  /** Reference month in YYYY-MM format */
  referenceMonth: string;
  /** Suffix appended to description, e.g. " (1/3)" */
  descriptionSuffix: string;
}

/**
 * Input for the installment calculator pure functions
 */
export interface InstallmentCalculatorInput {
  /** Total value in cents */
  totalAmount: number;
  /** Number of parcels (2–48) */
  parcelCount: number;
  /** Start month in YYYY-MM format */
  startMonth: string;
  /** Primary title for the transaction */
  title: string;
  /** Optional detail description */
  description?: string;
  /** Category identifier */
  categoryId: string;
  /** Origin identifier (optional) */
  originId?: string;
}

/**
 * DTO for creating an installment group
 */
export interface CreateInstallmentDTO {
  /** Total value in cents */
  totalAmount: number;
  /** Number of parcels (2–48) */
  parcelCount: number;
  /** Start month in YYYY-MM format */
  startMonth: string;
  /** Primary title for the transaction */
  title: string;
  /** Optional detail description */
  description?: string;
  /** Category identifier */
  categoryId: string;
  /** Category type - income or expense */
  categoryType: CategoryType;
  /** Origin identifier (optional) */
  originId?: string;
  /** Transaction date */
  date: Date;
}
