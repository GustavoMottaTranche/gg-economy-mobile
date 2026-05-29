/** Represents a pending item displayed in the Home Pending Section */
export interface PendingItem {
  id: string;
  type: 'weekly' | 'monthly';
  groupId: string;
  groupName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
}

/** Payment totals for a given month */
export interface PaymentTotals {
  predictedTotal: number;
  paidTotal: number;
  pendingTotal: number;
}

/** Payment status creation options */
export type PaymentStatusCreationOption = 'all_pending' | 'first_paid' | 'all_paid';

/** Result of a bulk mark operation */
export interface BulkMarkResult {
  markedCount: number;
  affectedMonths: string[];
}

/** Payment summary for a recurring group */
export interface GroupPaymentSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
}
