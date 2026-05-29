export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  startMonth: string;
  description: string;
  originId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringDTO {
  title: string;
  amount: number;
  categoryId: string;
  categoryType: 'income' | 'expense';
  startMonth: string;
  description?: string;
  originId?: string;
  paymentStatusOption?: import('./paymentStatus').PaymentStatusCreationOption;
}
