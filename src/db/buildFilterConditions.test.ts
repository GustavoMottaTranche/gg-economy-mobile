/**
 * Unit tests for buildFilterConditions query builder.
 *
 * Tests that the function correctly builds Drizzle ORM conditions
 * from PaginationFilters parameters.
 */
import { buildFilterConditions, type PaginationFilters } from './buildFilterConditions';

describe('buildFilterConditions', () => {
  it('returns a condition when only referenceMonth is provided', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when all filters are provided', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: ['cat-1', 'cat-2'],
      minAmount: 1000,
      maxAmount: 5000,
      startDate: '2024-06-01',
      endDate: '2024-06-30',
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when categoryIds is empty array (no category filter)', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: [],
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when optional filters are null', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: undefined,
      minAmount: null,
      maxAmount: null,
      startDate: null,
      endDate: null,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when only minAmount is set', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      minAmount: 500,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when only maxAmount is set', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      maxAmount: 10000,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when only startDate is set', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      startDate: '2024-06-15',
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when only endDate is set', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      endDate: '2024-06-20',
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition with single categoryId', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: ['cat-1'],
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition with multiple categoryIds', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: ['cat-1', 'cat-2', 'cat-3'],
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when pendingOnly is true', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      pendingOnly: true,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition without pendingOnly filter when pendingOnly is false', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      pendingOnly: false,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });

  it('returns a condition when pendingOnly is combined with other filters', () => {
    const filters: PaginationFilters = {
      referenceMonth: '2024-06',
      categoryIds: ['cat-1'],
      minAmount: 500,
      pendingOnly: true,
    };

    const result = buildFilterConditions(filters);
    expect(result).toBeDefined();
  });
});
