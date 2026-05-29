/**
 * Unit tests for InstallmentGroupManager service
 *
 * Tests the group-level operations on installment parcels:
 * - deleteAllInGroup
 * - deleteSingleParcel
 * - recalculateGroup
 * - updateGroupField
 * - extractBaseDescription (helper)
 */

import {
  deleteAllInGroup,
  deleteSingleParcel,
  recalculateGroup,
  updateGroupField,
  extractBaseDescription,
} from './InstallmentGroupManager';

// Mock the database client
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockDelete = jest.fn();
const mockSet = jest.fn();

jest.mock('../../db/client', () => ({
  getDb: () => ({
    select: () => ({ from: mockFrom }),
    delete: () => ({ where: mockDelete }),
    update: () => ({ set: mockSet }),
  }),
  withTransaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../../db/schema', () => ({
  transactions: {
    installmentGroupId: 'installment_group_id',
    id: 'id',
    referenceMonth: 'reference_month',
    date: 'date',
    description: 'description',
    amount: 'amount',
    categoryId: 'category_id',
    updatedAt: 'updated_at',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, op: 'eq' })),
  asc: jest.fn((field) => ({ field, direction: 'asc' })),
}));

// Helper to create mock parcels
function createMockParcels(count: number, groupId: string, baseDescription = 'Compra') {
  return Array.from({ length: count }, (_, i) => ({
    id: `txn-${i + 1}`,
    date: '2025-01-15',
    amount: 333,
    description: `${baseDescription} (${i + 1}/${count})`,
    categoryId: 'cat-1',
    originId: 'origin-1',
    batchId: null,
    referenceMonth: `2025-${String(i + 1).padStart(2, '0')}`,
    needsReview: false,
    isExcludedFromTotals: false,
    duplicateOf: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    installmentGroupId: groupId,
  }));
}

describe('InstallmentGroupManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default chain: select().from().where().orderBy() returns parcels
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockDelete.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
  });

  describe('extractBaseDescription', () => {
    it('removes suffix from description with standard format', () => {
      expect(extractBaseDescription('Compra (1/3)')).toBe('Compra');
    });

    it('removes suffix with large numbers', () => {
      expect(extractBaseDescription('Netflix (12/48)')).toBe('Netflix');
    });

    it('returns original string if no suffix present', () => {
      expect(extractBaseDescription('Simple description')).toBe('Simple description');
    });

    it('only removes the last suffix occurrence', () => {
      expect(extractBaseDescription('Item (1/2) extra (3/5)')).toBe('Item (1/2) extra');
    });

    it('handles description that is just a suffix', () => {
      expect(extractBaseDescription(' (1/3)')).toBe('');
    });
  });

  describe('deleteAllInGroup', () => {
    it('deletes all parcels in the group', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      await deleteAllInGroup('group-1');

      // Should delete each parcel
      expect(mockDelete).toHaveBeenCalledTimes(3);
    });

    it('throws error when group has no parcels', async () => {
      mockOrderBy.mockResolvedValue([]);

      await expect(deleteAllInGroup('nonexistent-group')).rejects.toThrow(
        'No parcels found for installment group: nonexistent-group'
      );
    });
  });

  describe('deleteSingleParcel', () => {
    it('deletes the specified parcel and re-indexes remaining', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await deleteSingleParcel('txn-2', 'group-1');

      // Should delete the target parcel
      expect(mockDelete).toHaveBeenCalledTimes(1);

      // Should update remaining 2 parcels with new suffixes
      // txn-1 becomes "(1/2)", txn-3 becomes "(2/2)"
      expect(mockSet).toHaveBeenCalledTimes(2);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Compra (1/2)',
        })
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Compra (2/2)',
        })
      );
    });

    it('throws error when transaction not found in group', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      await expect(deleteSingleParcel('nonexistent-txn', 'group-1')).rejects.toThrow(
        'Transaction nonexistent-txn not found in installment group group-1'
      );
    });

    it('removes suffix entirely when only one parcel remains', async () => {
      const parcels = createMockParcels(2, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await deleteSingleParcel('txn-1', 'group-1');

      // Remaining parcel should have no suffix
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Compra',
        })
      );
    });
  });

  describe('recalculateGroup', () => {
    it('redistributes amounts using distributeAmount logic', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await recalculateGroup('group-1', 1000);

      // distributeAmount(1000, 3) = [334, 333, 333]
      expect(mockSet).toHaveBeenCalledTimes(3);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 334 })
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 333 })
      );
    });

    it('throws error when group has no parcels', async () => {
      mockOrderBy.mockResolvedValue([]);

      await expect(recalculateGroup('nonexistent-group', 1000)).rejects.toThrow(
        'No parcels found for installment group: nonexistent-group'
      );
    });

    it('handles even distribution', async () => {
      const parcels = createMockParcels(4, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await recalculateGroup('group-1', 1200);

      // distributeAmount(1200, 4) = [300, 300, 300, 300]
      expect(mockSet).toHaveBeenCalledTimes(4);
      // All should be 300
      for (const call of mockSet.mock.calls) {
        expect(call[0]).toEqual(expect.objectContaining({ amount: 300 }));
      }
    });
  });

  describe('updateGroupField', () => {
    it('updates categoryId for all parcels', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await updateGroupField('group-1', 'categoryId', 'new-cat-id');

      expect(mockSet).toHaveBeenCalledTimes(3);
      for (const call of mockSet.mock.calls) {
        expect(call[0]).toEqual(
          expect.objectContaining({ categoryId: 'new-cat-id' })
        );
      }
    });

    it('updates description preserving suffixes', async () => {
      const parcels = createMockParcels(3, 'group-1');
      mockOrderBy.mockResolvedValue(parcels);

      const mockWhereOnUpdate = jest.fn().mockResolvedValue(undefined);
      mockSet.mockReturnValue({ where: mockWhereOnUpdate });

      await updateGroupField('group-1', 'description', 'New Description');

      expect(mockSet).toHaveBeenCalledTimes(3);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New Description (1/3)' })
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New Description (2/3)' })
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New Description (3/3)' })
      );
    });

    it('throws error when group has no parcels', async () => {
      mockOrderBy.mockResolvedValue([]);

      await expect(
        updateGroupField('nonexistent-group', 'categoryId', 'cat-1')
      ).rejects.toThrow('No parcels found for installment group: nonexistent-group');
    });
  });
});
