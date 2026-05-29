/**
 * Unit tests for EntryValidationService
 *
 * Tests validateInstallmentEntry, validateStandardEntry, and validateBatchEntry
 * against the business rules defined in Requirements 8.1–8.6.
 */

import {
  validateInstallmentEntry,
  validateStandardEntry,
  validateBatchEntry,
} from '../../../validation/installmentValidation';
import type {
  InstallmentValidationInput,
  StandardValidationInput,
} from '../../../types/validation';

describe('validateInstallmentEntry', () => {
  const validInput: InstallmentValidationInput = {
    totalAmount: 10000, // R$ 100.00
    parcelCount: 4,
    description: 'Test purchase',
    startMonth: '2025-01',
    categoryId: 'cat-123',
  };

  it('should return valid for correct input', () => {
    const result = validateInstallmentEntry(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  // Amount validation
  it('should reject amount of 0', () => {
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject negative amount', () => {
    const result = validateInstallmentEntry({ ...validInput, totalAmount: -100 });
    expect(result.valid).toBe(false);
  });

  it('should reject amount exceeding max (99999999999)', () => {
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 100000000000 });
    expect(result.valid).toBe(false);
  });

  it('should accept minimum amount (1 cent)', () => {
    // 1 cent with 1 parcel won't work (min 2 parcels), but 2 cents with 2 parcels should
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 2, parcelCount: 2 });
    expect(result.valid).toBe(true);
  });

  it('should accept maximum amount (99999999999)', () => {
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 99999999999 });
    expect(result.valid).toBe(true);
  });

  // Parcel count validation
  it('should reject parcel count less than 2', () => {
    const result = validateInstallmentEntry({ ...validInput, parcelCount: 1 });
    expect(result.valid).toBe(false);
  });

  it('should reject parcel count greater than 48', () => {
    const result = validateInstallmentEntry({ ...validInput, parcelCount: 49 });
    expect(result.valid).toBe(false);
  });

  it('should accept parcel count of 2', () => {
    const result = validateInstallmentEntry({ ...validInput, parcelCount: 2 });
    expect(result.valid).toBe(true);
  });

  it('should accept parcel count of 48', () => {
    const result = validateInstallmentEntry({ ...validInput, parcelCount: 48 });
    expect(result.valid).toBe(true);
  });

  // Description validation
  it('should reject empty description', () => {
    const result = validateInstallmentEntry({ ...validInput, description: '' });
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only description', () => {
    const result = validateInstallmentEntry({ ...validInput, description: '   ' });
    expect(result.valid).toBe(false);
  });

  it('should reject description longer than 100 characters', () => {
    const result = validateInstallmentEntry({ ...validInput, description: 'a'.repeat(101) });
    expect(result.valid).toBe(false);
  });

  it('should accept description of exactly 100 characters', () => {
    const result = validateInstallmentEntry({ ...validInput, description: 'a'.repeat(100) });
    expect(result.valid).toBe(true);
  });

  // Minimum parcel value validation
  it('should reject when floor(total/count) < 1 cent', () => {
    // 3 cents / 4 parcels = floor(0.75) = 0 → invalid
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 3, parcelCount: 4 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Total amount is too small for the number of parcels (each parcel must be at least R$ 0.01)'
    );
  });

  it('should accept when floor(total/count) = 1 cent', () => {
    // 2 cents / 2 parcels = floor(1) = 1 → valid
    const result = validateInstallmentEntry({ ...validInput, totalAmount: 2, parcelCount: 2 });
    expect(result.valid).toBe(true);
  });

  // Required fields
  it('should reject null categoryId', () => {
    const result = validateInstallmentEntry({ ...validInput, categoryId: null });
    expect(result.valid).toBe(false);
  });

  it('should reject missing startMonth', () => {
    const result = validateInstallmentEntry({ ...validInput, startMonth: '' });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid startMonth format', () => {
    const result = validateInstallmentEntry({ ...validInput, startMonth: '2025/01' });
    expect(result.valid).toBe(false);
  });
});

describe('validateStandardEntry', () => {
  const validInput: StandardValidationInput = {
    amount: 5000,
    description: 'Grocery shopping',
    date: new Date('2025-01-15'),
    categoryId: 'cat-456',
    referenceMonth: '2025-01',
  };

  it('should return valid for correct input', () => {
    const result = validateStandardEntry(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject amount of 0', () => {
    const result = validateStandardEntry({ ...validInput, amount: 0 });
    expect(result.valid).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = validateStandardEntry({ ...validInput, amount: -500 });
    expect(result.valid).toBe(false);
  });

  it('should reject empty description', () => {
    const result = validateStandardEntry({ ...validInput, description: '' });
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only description', () => {
    const result = validateStandardEntry({ ...validInput, description: '\t\n  ' });
    expect(result.valid).toBe(false);
  });

  it('should reject null categoryId', () => {
    const result = validateStandardEntry({ ...validInput, categoryId: null });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid date', () => {
    const result = validateStandardEntry({ ...validInput, date: new Date('invalid') });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid referenceMonth format', () => {
    const result = validateStandardEntry({ ...validInput, referenceMonth: '01-2025' });
    expect(result.valid).toBe(false);
  });

  it('should reject empty referenceMonth', () => {
    const result = validateStandardEntry({ ...validInput, referenceMonth: '' });
    expect(result.valid).toBe(false);
  });

  it('should collect multiple errors', () => {
    const result = validateStandardEntry({
      amount: 0,
      description: '',
      date: new Date('invalid'),
      categoryId: null,
      referenceMonth: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(4);
  });
});

describe('validateBatchEntry', () => {
  const validInput: Omit<StandardValidationInput, 'categoryId'> = {
    amount: 3000,
    description: 'Batch item',
    date: new Date('2025-02-10'),
    referenceMonth: '2025-02',
  };

  it('should return valid for correct input', () => {
    const result = validateBatchEntry(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should not require categoryId', () => {
    // Batch entry does not validate categoryId since it comes from the session
    const result = validateBatchEntry(validInput);
    expect(result.valid).toBe(true);
  });

  it('should reject amount of 0', () => {
    const result = validateBatchEntry({ ...validInput, amount: 0 });
    expect(result.valid).toBe(false);
  });

  it('should reject empty description', () => {
    const result = validateBatchEntry({ ...validInput, description: '' });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid date', () => {
    const result = validateBatchEntry({ ...validInput, date: new Date('invalid') });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid referenceMonth', () => {
    const result = validateBatchEntry({ ...validInput, referenceMonth: 'invalid' });
    expect(result.valid).toBe(false);
  });
});
