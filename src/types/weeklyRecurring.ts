export interface WeeklyRecurringGroup {
  id: string;
  title: string;
  amount: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  categoryId: string;
  categoryType: 'income' | 'expense';
  description: string;
  originId: string | null;
  startDate: string; // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyOccurrence {
  id: string;
  weeklyGroupId: string;
  date: string; // YYYY-MM-DD
  referenceMonth: string; // YYYY-MM
  amount: number;
  description: string;
  isValueEdited: boolean;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyGroupDTO {
  title: string;
  amount: number;
  dayOfWeek: number;
  categoryId: string;
  categoryType?: 'income' | 'expense';
  description?: string;
  originId?: string;
  paymentStatusOption?: import('./paymentStatus').PaymentStatusCreationOption;
}

export interface UpdateWeeklyGroupDTO {
  title?: string;
  amount?: number;
  dayOfWeek?: number;
  categoryId?: string;
  description?: string;
  originId?: string | null;
}

export interface UpdateOccurrenceDTO {
  amount?: number;
  date?: string; // YYYY-MM-DD
}
