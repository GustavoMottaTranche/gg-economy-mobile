/**
 * Unit tests for weekly recurring validation functions.
 *
 * **Validates: Requirements 1.2, 3.3, 3.5, 4.7**
 */

import {
  validateWeeklyGroup,
  validateOccurrenceValue,
  validateOccurrenceDate,
} from '../../validation/weeklyRecurringValidation';

describe('validateWeeklyGroup', () => {
  const validInput = {
    title: 'Grocery Shopping',
    amount: 150.5,
    dayOfWeek: 4,
    categoryId: 'cat-123',
  };

  it('should accept valid input', () => {
    const result = validateWeeklyGroup(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  // Title validation
  describe('title', () => {
    it('should reject empty title', () => {
      const result = validateWeeklyGroup({ ...validInput, title: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject whitespace-only title', () => {
      const result = validateWeeklyGroup({ ...validInput, title: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should accept title with 1 character after trim', () => {
      const result = validateWeeklyGroup({ ...validInput, title: ' A ' });
      expect(result.valid).toBe(true);
    });

    it('should accept title with exactly 100 characters', () => {
      const result = validateWeeklyGroup({ ...validInput, title: 'A'.repeat(100) });
      expect(result.valid).toBe(true);
    });

    it('should reject title with 101 characters', () => {
      const result = validateWeeklyGroup({ ...validInput, title: 'A'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be at most 100 characters');
    });
  });

  // Amount validation
  describe('amount', () => {
    it('should accept minimum amount 0.01', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 0.01 });
      expect(result.valid).toBe(true);
    });

    it('should accept maximum amount 999999999.99', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 999999999.99 });
      expect(result.valid).toBe(true);
    });

    it('should reject amount below 0.01', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 0 });
      expect(result.valid).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: -1 });
      expect(result.valid).toBe(false);
    });

    it('should reject amount above 999999999.99', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 1000000000 });
      expect(result.valid).toBe(false);
    });

    it('should reject amount with more than 2 decimal places', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 10.123 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must have at most 2 decimal places');
    });

    it('should accept amount with exactly 2 decimal places', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 10.12 });
      expect(result.valid).toBe(true);
    });

    it('should accept integer amount', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: 100 });
      expect(result.valid).toBe(true);
    });

    it('should reject NaN amount', () => {
      const result = validateWeeklyGroup({ ...validInput, amount: NaN });
      expect(result.valid).toBe(false);
    });
  });

  // Day of week validation
  describe('dayOfWeek', () => {
    it('should accept day 0 (Sunday)', () => {
      const result = validateWeeklyGroup({ ...validInput, dayOfWeek: 0 });
      expect(result.valid).toBe(true);
    });

    it('should accept day 6 (Saturday)', () => {
      const result = validateWeeklyGroup({ ...validInput, dayOfWeek: 6 });
      expect(result.valid).toBe(true);
    });

    it('should reject day -1', () => {
      const result = validateWeeklyGroup({ ...validInput, dayOfWeek: -1 });
      expect(result.valid).toBe(false);
    });

    it('should reject day 7', () => {
      const result = validateWeeklyGroup({ ...validInput, dayOfWeek: 7 });
      expect(result.valid).toBe(false);
    });

    it('should reject non-integer day', () => {
      const result = validateWeeklyGroup({ ...validInput, dayOfWeek: 3.5 });
      expect(result.valid).toBe(false);
    });
  });

  // Category validation
  describe('categoryId', () => {
    it('should reject null categoryId', () => {
      const result = validateWeeklyGroup({ ...validInput, categoryId: null });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });

    it('should reject empty string categoryId', () => {
      const result = validateWeeklyGroup({ ...validInput, categoryId: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });

    it('should reject whitespace-only categoryId', () => {
      const result = validateWeeklyGroup({ ...validInput, categoryId: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });
  });

  // Multiple errors
  it('should report multiple errors at once', () => {
    const result = validateWeeklyGroup({
      title: '',
      amount: -1,
      dayOfWeek: 10,
      categoryId: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(4);
  });
});

describe('validateOccurrenceValue', () => {
  it('should accept valid positive amount', () => {
    const result = validateOccurrenceValue({ amount: 50.25 });
    expect(result.valid).toBe(true);
  });

  it('should accept valid negative amount', () => {
    const result = validateOccurrenceValue({ amount: -50.25 });
    expect(result.valid).toBe(true);
  });

  it('should reject zero amount', () => {
    const result = validateOccurrenceValue({ amount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount cannot be zero');
  });

  it('should accept boundary -999999999', () => {
    const result = validateOccurrenceValue({ amount: -999999999 });
    expect(result.valid).toBe(true);
  });

  it('should accept boundary 999999999', () => {
    const result = validateOccurrenceValue({ amount: 999999999 });
    expect(result.valid).toBe(true);
  });

  it('should reject amount below -999999999', () => {
    const result = validateOccurrenceValue({ amount: -1000000000 });
    expect(result.valid).toBe(false);
  });

  it('should reject amount above 999999999', () => {
    const result = validateOccurrenceValue({ amount: 1000000000 });
    expect(result.valid).toBe(false);
  });

  it('should reject amount with more than 2 decimal places', () => {
    const result = validateOccurrenceValue({ amount: 10.123 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount must have at most 2 decimal places');
  });

  it('should accept amount with exactly 2 decimal places', () => {
    const result = validateOccurrenceValue({ amount: 10.12 });
    expect(result.valid).toBe(true);
  });

  it('should reject NaN amount', () => {
    const result = validateOccurrenceValue({ amount: NaN });
    expect(result.valid).toBe(false);
  });
});

describe('validateOccurrenceDate', () => {
  it('should accept a valid date', () => {
    const result = validateOccurrenceDate({ date: '2024-06-15' });
    expect(result.valid).toBe(true);
  });

  // Format validation
  describe('format', () => {
    it('should reject empty string', () => {
      const result = validateOccurrenceDate({ date: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date must be in YYYY-MM-DD format');
    });

    it('should reject DD-MM-YYYY format', () => {
      const result = validateOccurrenceDate({ date: '15-06-2024' });
      expect(result.valid).toBe(false);
    });

    it('should reject MM/DD/YYYY format', () => {
      const result = validateOccurrenceDate({ date: '06/15/2024' });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid month 13', () => {
      const result = validateOccurrenceDate({ date: '2024-13-01' });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid day 32', () => {
      const result = validateOccurrenceDate({ date: '2024-01-32' });
      expect(result.valid).toBe(false);
    });
  });

  // Calendar validity
  describe('calendar validity', () => {
    it('should reject Feb 30', () => {
      const result = validateOccurrenceDate({ date: '2024-02-30' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date must be a valid calendar date');
    });

    it('should accept Feb 29 on leap year', () => {
      const result = validateOccurrenceDate({ date: '2024-02-29' });
      expect(result.valid).toBe(true);
    });

    it('should reject Feb 29 on non-leap year', () => {
      const result = validateOccurrenceDate({ date: '2023-02-29' });
      expect(result.valid).toBe(false);
    });

    it('should reject Apr 31', () => {
      const result = validateOccurrenceDate({ date: '2024-04-31' });
      expect(result.valid).toBe(false);
    });

    it('should accept Dec 31', () => {
      const result = validateOccurrenceDate({ date: '2024-12-31' });
      expect(result.valid).toBe(true);
    });
  });

  // Range validation
  describe('date range', () => {
    it('should reject date more than 5 years in the past', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 6);
      const dateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
      const result = validateOccurrenceDate({ date: dateStr });
      expect(result.valid).toBe(false);
    });

    it('should reject date more than 1 year in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const dateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
      const result = validateOccurrenceDate({ date: dateStr });
      expect(result.valid).toBe(false);
    });

    it('should accept today', () => {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const result = validateOccurrenceDate({ date: dateStr });
      expect(result.valid).toBe(true);
    });
  });
});
