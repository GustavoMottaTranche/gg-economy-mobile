/**
 * Unit tests for the entry validation module.
 *
 * Tests validateTitle, validateDescription, validateStandardEntry,
 * validateInstallmentEntry, and validateBatchEntry functions.
 */

import {
  validateTitle,
  validateDescription,
  validateStandardEntry,
  validateInstallmentEntry,
  validateBatchEntry,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from '../../../validation/entryValidation';

import type {
  StandardEntryValidationInput,
  InstallmentEntryValidationInput,
  BatchEntryValidationInput,
} from '../../../validation/entryValidation';

// ─── Constants ───────────────────────────────────────────────────────────────

describe('Exported constants', () => {
  it('should export correct constant values', () => {
    expect(TITLE_MIN_LENGTH).toBe(1);
    expect(TITLE_MAX_LENGTH).toBe(100);
    expect(DESCRIPTION_MAX_LENGTH).toBe(500);
  });
});

// ─── validateTitle ───────────────────────────────────────────────────────────

describe('validateTitle', () => {
  it('should accept a valid short title', () => {
    const result = validateTitle('Supermercado');
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should accept a title with exactly 1 character after trim', () => {
    const result = validateTitle('A');
    expect(result.valid).toBe(true);
  });

  it('should accept a title with exactly 100 characters after trim', () => {
    const result = validateTitle('a'.repeat(100));
    expect(result.valid).toBe(true);
  });

  it('should reject an empty string', () => {
    const result = validateTitle('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject a string with only whitespace', () => {
    const result = validateTitle('   \t\n  ');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject a title exceeding 100 characters after trim', () => {
    const result = validateTitle('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title must be at most 100 characters');
  });

  it('should trim leading/trailing whitespace before checking length', () => {
    // "  A  " trims to "A" which is 1 char — valid
    const result = validateTitle('  A  ');
    expect(result.valid).toBe(true);
  });

  it('should reject when trimmed length exceeds 100', () => {
    // Padding with spaces doesn't help — trimmed content is what matters
    const result = validateTitle('  ' + 'x'.repeat(101) + '  ');
    expect(result.valid).toBe(false);
  });
});

// ─── validateDescription ─────────────────────────────────────────────────────

describe('validateDescription', () => {
  it('should accept an empty description', () => {
    const result = validateDescription('');
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should accept a description with exactly 500 characters', () => {
    const result = validateDescription('d'.repeat(500));
    expect(result.valid).toBe(true);
  });

  it('should accept a short description', () => {
    const result = validateDescription('Some details about the purchase');
    expect(result.valid).toBe(true);
  });

  it('should reject a description exceeding 500 characters', () => {
    const result = validateDescription('d'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Description must be at most 500 characters');
  });
});

// ─── validateStandardEntry ───────────────────────────────────────────────────

describe('validateStandardEntry', () => {
  const validInput: StandardEntryValidationInput = {
    title: 'Supermercado',
    description: '',
    amount: 5000,
    date: new Date('2025-06-15T14:30:00.000Z'),
    categoryId: 'cat-1',
    referenceMonth: '2025-06',
  };

  it('should accept a valid standard entry', () => {
    const result = validateStandardEntry(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject when title is empty', () => {
    const result = validateStandardEntry({ ...validInput, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject when description exceeds 500 chars', () => {
    const result = validateStandardEntry({ ...validInput, description: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Description must be at most 500 characters');
  });

  it('should reject when amount is 0', () => {
    const result = validateStandardEntry({ ...validInput, amount: 0 });
    expect(result.valid).toBe(false);
  });

  it('should reject when date is invalid', () => {
    const result = validateStandardEntry({ ...validInput, date: new Date('invalid') });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Date must be a valid Date');
  });

  it('should reject when categoryId is null', () => {
    const result = validateStandardEntry({ ...validInput, categoryId: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Category is required');
  });

  it('should reject when referenceMonth is invalid format', () => {
    const result = validateStandardEntry({ ...validInput, referenceMonth: '2025-13' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Reference month must be in YYYY-MM format (e.g., 2025-01)');
  });

  it('should collect multiple errors', () => {
    const result = validateStandardEntry({
      ...validInput,
      title: '',
      amount: 0,
      categoryId: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── validateInstallmentEntry ────────────────────────────────────────────────

describe('validateInstallmentEntry', () => {
  const validFiniteInput: InstallmentEntryValidationInput = {
    title: 'Notebook Dell',
    description: 'Compra parcelada',
    totalAmount: 500000,
    parcelCount: 10,
    startMonth: '2025-07',
    categoryId: 'cat-2',
    isInfinite: false,
  };

  const validInfiniteInput: InstallmentEntryValidationInput = {
    title: 'Netflix',
    description: 'Assinatura mensal',
    totalAmount: 3990,
    parcelCount: Infinity,
    startMonth: '2025-06',
    categoryId: 'cat-3',
    isInfinite: true,
  };

  it('should accept a valid finite installment entry', () => {
    const result = validateInstallmentEntry(validFiniteInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should accept a valid infinite installment entry', () => {
    const result = validateInstallmentEntry(validInfiniteInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject when title is empty', () => {
    const result = validateInstallmentEntry({ ...validFiniteInput, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject when description exceeds 500 chars', () => {
    const result = validateInstallmentEntry({
      ...validFiniteInput,
      description: 'x'.repeat(501),
    });
    expect(result.valid).toBe(false);
  });

  it('should reject when parcelCount is below 2 for finite', () => {
    const result = validateInstallmentEntry({ ...validFiniteInput, parcelCount: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Parcel count must be between 2 and 48');
  });

  it('should reject when parcelCount exceeds 48 for finite', () => {
    const result = validateInstallmentEntry({ ...validFiniteInput, parcelCount: 49 });
    expect(result.valid).toBe(false);
  });

  it('should skip parcelCount validation for infinite installments', () => {
    // parcelCount can be anything when isInfinite is true
    const result = validateInstallmentEntry({
      ...validInfiniteInput,
      parcelCount: 999,
    });
    expect(result.valid).toBe(true);
  });

  it('should reject when startMonth is invalid', () => {
    const result = validateInstallmentEntry({ ...validFiniteInput, startMonth: 'invalid' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Start month must be in YYYY-MM format (e.g., 2025-01)');
  });

  it('should reject when categoryId is null', () => {
    const result = validateInstallmentEntry({ ...validFiniteInput, categoryId: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Category is required');
  });

  it('should reject when totalAmount is too small for parcel count', () => {
    const result = validateInstallmentEntry({
      ...validFiniteInput,
      totalAmount: 1, // 1 cent / 10 parcels = 0 cents per parcel
      parcelCount: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Total amount is too small for the number of parcels (each parcel must be at least R$ 0.01)'
    );
  });
});

// ─── validateBatchEntry ──────────────────────────────────────────────────────

describe('validateBatchEntry', () => {
  const validInput: BatchEntryValidationInput = {
    amount: 2500,
    description: '',
    date: new Date('2025-06-15T10:00:00.000Z'),
    referenceMonth: '2025-06',
  };

  it('should accept a valid batch entry', () => {
    const result = validateBatchEntry(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should accept batch entry with empty description', () => {
    const result = validateBatchEntry({ ...validInput, description: '' });
    expect(result.valid).toBe(true);
  });

  it('should accept batch entry with a description', () => {
    const result = validateBatchEntry({ ...validInput, description: 'Pão de queijo' });
    expect(result.valid).toBe(true);
  });

  it('should reject when description exceeds 500 chars', () => {
    const result = validateBatchEntry({ ...validInput, description: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
  });

  it('should reject when amount is 0', () => {
    const result = validateBatchEntry({ ...validInput, amount: 0 });
    expect(result.valid).toBe(false);
  });

  it('should reject when date is invalid', () => {
    const result = validateBatchEntry({ ...validInput, date: new Date('invalid') });
    expect(result.valid).toBe(false);
  });

  it('should reject when referenceMonth is invalid', () => {
    const result = validateBatchEntry({ ...validInput, referenceMonth: '13-2025' });
    expect(result.valid).toBe(false);
  });
});
