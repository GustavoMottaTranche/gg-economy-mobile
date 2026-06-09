/**
 * Unit tests for fundStore (Zustand)
 *
 * Tests all state transitions: CRUD operations, monthly income management,
 * allocation management, transaction linking/unlinking, and base balance.
 * Mocks repositories and user_preferences queries.
 *
 * **Validates: Requirements 2.2, 2.4, 5.1, 5.3, 5.4, 5.5, 6.2, 6.6, 6.7, 7.5, 8.2, 8.3, 8.6**
 */

import { act } from 'react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetPreference = jest.fn();
const mockSetPreference = jest.fn();
const mockDeletePreference = jest.fn();

jest.mock('../db/queries/preferences', () => ({
  getPreference: (...args: unknown[]) => mockGetPreference(...args),
  setPreference: (...args: unknown[]) => mockSetPreference(...args),
  deletePreference: (...args: unknown[]) => mockDeletePreference(...args),
}));

const mockFundRepoGetActive = jest.fn();
const mockFundRepoCreate = jest.fn();
const mockFundRepoUpdate = jest.fn();
const mockFundRepoDeactivate = jest.fn();

jest.mock('../repositories/FundRepository', () => ({
  fundRepository: {
    getActive: (...args: unknown[]) => mockFundRepoGetActive(...args),
    create: (...args: unknown[]) => mockFundRepoCreate(...args),
    update: (...args: unknown[]) => mockFundRepoUpdate(...args),
    deactivate: (...args: unknown[]) => mockFundRepoDeactivate(...args),
  },
}));

const mockAllocationGetAllForMonth = jest.fn();
const mockAllocationUpsert = jest.fn();
const mockAllocationDelete = jest.fn();

jest.mock('../repositories/FundAllocationRepository', () => ({
  fundAllocationRepository: {
    getAllForMonth: (...args: unknown[]) => mockAllocationGetAllForMonth(...args),
    upsert: (...args: unknown[]) => mockAllocationUpsert(...args),
    delete: (...args: unknown[]) => mockAllocationDelete(...args),
  },
}));

const mockBalanceGetAll = jest.fn();
const mockBalanceUpsert = jest.fn();

jest.mock('../repositories/FundBalanceRepository', () => ({
  fundBalanceRepository: {
    getAll: (...args: unknown[]) => mockBalanceGetAll(...args),
    upsert: (...args: unknown[]) => mockBalanceUpsert(...args),
  },
}));

const mockFundTxGetByFundIdWithDetails = jest.fn();
const mockFundTxLink = jest.fn();
const mockFundTxUnlink = jest.fn();
const mockFundTxGetByTransactionId = jest.fn();

jest.mock('../repositories/FundTransactionRepository', () => ({
  fundTransactionRepository: {
    getByFundIdWithDetails: (...args: unknown[]) => mockFundTxGetByFundIdWithDetails(...args),
    link: (...args: unknown[]) => mockFundTxLink(...args),
    unlink: (...args: unknown[]) => mockFundTxUnlink(...args),
    getByTransactionId: (...args: unknown[]) => mockFundTxGetByTransactionId(...args),
  },
}));

jest.mock('../services/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../services/funds/FundBalanceCalculationService', () => ({
  calculateFundBalance: jest.fn(
    (input: { baseAmount: number; totalAllocations: number; totalDeductions: number }) =>
      input.baseAmount + input.totalAllocations - input.totalDeductions
  ),
  filterDeductionsByMonth: jest.fn(
    (txs: { amount: number; referenceMonth: string }[], currentMonth: string) =>
      txs.filter((t) => t.referenceMonth <= currentMonth)
  ),
}));

jest.mock('../utils/formatDate', () => ({
  getReferenceMonth: jest.fn(() => '2025-01'),
}));

// ─── Import Store After Mocks ────────────────────────────────────────────────

import { useFundStore } from '../stores/fundStore';
import type { Fund, FundAllocation, FundBalance } from '../types/fund';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useFundStore.setState({
    funds: [],
    allocations: new Map<string, FundAllocation>(),
    balances: new Map<string, FundBalance>(),
    fundTransactions: new Map(),
    monthlyIncome: null,
    selectedMonth: '2025-01',
    isLoading: false,
  });
}

function makeFund(overrides: Partial<Fund> = {}): Fund {
  return {
    id: 'fund-1',
    name: 'Travel',
    icon: null,
    color: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAllocation(overrides: Partial<FundAllocation> = {}): FundAllocation {
  return {
    id: 'alloc-1',
    fundId: 'fund-1',
    referenceMonth: '2025-01',
    amount: 50000,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBalance(overrides: Partial<FundBalance> = {}): FundBalance {
  return {
    id: 'bal-1',
    fundId: 'fund-1',
    baseAmount: 100000,
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fundStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('should have empty funds array', () => {
      expect(useFundStore.getState().funds).toEqual([]);
    });

    it('should have empty allocations map', () => {
      expect(useFundStore.getState().allocations.size).toBe(0);
    });

    it('should have empty balances map', () => {
      expect(useFundStore.getState().balances.size).toBe(0);
    });

    it('should have null monthlyIncome', () => {
      expect(useFundStore.getState().monthlyIncome).toBeNull();
    });

    it('should have isLoading as false', () => {
      expect(useFundStore.getState().isLoading).toBe(false);
    });
  });

  describe('loadFunds', () => {
    it('should set isLoading to true then false after completion', async () => {
      mockFundRepoGetActive.mockResolvedValue([]);
      mockGetPreference.mockResolvedValue(null);
      mockBalanceGetAll.mockResolvedValue([]);
      mockAllocationGetAllForMonth.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      expect(useFundStore.getState().isLoading).toBe(false);
    });

    it('should load active funds into state', async () => {
      const funds = [makeFund(), makeFund({ id: 'fund-2', name: 'Retirement' })];
      mockFundRepoGetActive.mockResolvedValue(funds);
      mockGetPreference.mockResolvedValue(null);
      mockBalanceGetAll.mockResolvedValue([]);
      mockAllocationGetAllForMonth.mockResolvedValue([]);
      mockFundTxGetByFundIdWithDetails.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      expect(useFundStore.getState().funds).toEqual(funds);
    });

    it('should load monthly income from preferences', async () => {
      mockFundRepoGetActive.mockResolvedValue([]);
      mockGetPreference.mockResolvedValue('500000');
      mockBalanceGetAll.mockResolvedValue([]);
      mockAllocationGetAllForMonth.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      expect(useFundStore.getState().monthlyIncome).toBe(500000);
      expect(mockGetPreference).toHaveBeenCalledWith('monthly_income');
    });

    it('should set monthlyIncome to null when no preference exists', async () => {
      mockFundRepoGetActive.mockResolvedValue([]);
      mockGetPreference.mockResolvedValue(null);
      mockBalanceGetAll.mockResolvedValue([]);
      mockAllocationGetAllForMonth.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      expect(useFundStore.getState().monthlyIncome).toBeNull();
    });

    it('should load balances into the balances map', async () => {
      const balances = [
        makeBalance(),
        makeBalance({ id: 'bal-2', fundId: 'fund-2', baseAmount: 200000 }),
      ];
      mockFundRepoGetActive.mockResolvedValue([]);
      mockGetPreference.mockResolvedValue(null);
      mockBalanceGetAll.mockResolvedValue(balances);
      mockAllocationGetAllForMonth.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      const state = useFundStore.getState();
      expect(state.balances.get('fund-1')?.baseAmount).toBe(100000);
      expect(state.balances.get('fund-2')?.baseAmount).toBe(200000);
    });

    it('should handle errors gracefully and set isLoading to false', async () => {
      mockFundRepoGetActive.mockRejectedValue(new Error('DB error'));

      await act(async () => {
        await useFundStore.getState().loadFunds();
      });

      const state = useFundStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.funds).toEqual([]);
    });
  });

  describe('createFund', () => {
    it('should add a new fund to the state', async () => {
      const newFund = makeFund({ id: 'new-fund', name: 'Emergency' });
      mockFundRepoCreate.mockResolvedValue(newFund);

      await act(async () => {
        await useFundStore.getState().createFund('Emergency');
      });

      expect(useFundStore.getState().funds).toContainEqual(newFund);
    });

    it('should call repository with correct parameters', async () => {
      const newFund = makeFund();
      mockFundRepoCreate.mockResolvedValue(newFund);

      await act(async () => {
        await useFundStore.getState().createFund('Travel', 'plane', '#ff0000');
      });

      expect(mockFundRepoCreate).toHaveBeenCalledWith({
        name: 'Travel',
        icon: 'plane',
        color: '#ff0000',
      });
    });

    it('should return the created fund', async () => {
      const newFund = makeFund({ id: 'new-fund' });
      mockFundRepoCreate.mockResolvedValue(newFund);

      let result: Fund | undefined;
      await act(async () => {
        result = await useFundStore.getState().createFund('Travel');
      });

      expect(result).toEqual(newFund);
    });

    it('should not update state when creation fails', async () => {
      mockFundRepoCreate.mockRejectedValue(new Error('Create failed'));

      await act(async () => {
        try {
          await useFundStore.getState().createFund('Travel');
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().funds).toEqual([]);
    });
  });

  describe('updateFund', () => {
    it('should update the fund in the state', async () => {
      const originalFund = makeFund();
      useFundStore.setState({ funds: [originalFund] });

      const updatedFund = { ...originalFund, name: 'Updated Travel' };
      mockFundRepoUpdate.mockResolvedValue(updatedFund);

      await act(async () => {
        await useFundStore.getState().updateFund('fund-1', { name: 'Updated Travel' });
      });

      const fund = useFundStore.getState().funds.find((f) => f.id === 'fund-1');
      expect(fund?.name).toBe('Updated Travel');
    });

    it('should call repository with correct parameters', async () => {
      useFundStore.setState({ funds: [makeFund()] });
      mockFundRepoUpdate.mockResolvedValue(makeFund({ name: 'New Name' }));

      await act(async () => {
        await useFundStore.getState().updateFund('fund-1', { name: 'New Name' });
      });

      expect(mockFundRepoUpdate).toHaveBeenCalledWith('fund-1', { name: 'New Name' });
    });

    it('should not update state when repository returns null', async () => {
      const originalFund = makeFund();
      useFundStore.setState({ funds: [originalFund] });
      mockFundRepoUpdate.mockResolvedValue(null);

      await act(async () => {
        await useFundStore.getState().updateFund('fund-1', { name: 'New Name' });
      });

      expect(useFundStore.getState().funds[0].name).toBe('Travel');
    });

    it('should not update state when update fails', async () => {
      const originalFund = makeFund();
      useFundStore.setState({ funds: [originalFund] });
      mockFundRepoUpdate.mockRejectedValue(new Error('Update failed'));

      await act(async () => {
        try {
          await useFundStore.getState().updateFund('fund-1', { name: 'New Name' });
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().funds[0].name).toBe('Travel');
    });
  });

  describe('deactivateFund', () => {
    it('should remove the fund from the state', async () => {
      useFundStore.setState({
        funds: [makeFund(), makeFund({ id: 'fund-2', name: 'Retirement' })],
      });
      mockFundRepoDeactivate.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().deactivateFund('fund-1');
      });

      const state = useFundStore.getState();
      expect(state.funds).toHaveLength(1);
      expect(state.funds[0].id).toBe('fund-2');
    });

    it('should call repository deactivate with correct id', async () => {
      useFundStore.setState({ funds: [makeFund()] });
      mockFundRepoDeactivate.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().deactivateFund('fund-1');
      });

      expect(mockFundRepoDeactivate).toHaveBeenCalledWith('fund-1');
    });

    it('should not update state when deactivation fails', async () => {
      useFundStore.setState({ funds: [makeFund()] });
      mockFundRepoDeactivate.mockRejectedValue(new Error('Deactivate failed'));

      await act(async () => {
        try {
          await useFundStore.getState().deactivateFund('fund-1');
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().funds).toHaveLength(1);
    });
  });

  describe('setMonthlyIncome', () => {
    it('should persist and update state', async () => {
      mockSetPreference.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().setMonthlyIncome(600000);
      });

      expect(mockSetPreference).toHaveBeenCalledWith('monthly_income', '600000');
      expect(useFundStore.getState().monthlyIncome).toBe(600000);
    });

    it('should allow overwriting monthly income', async () => {
      mockSetPreference.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().setMonthlyIncome(500000);
      });
      await act(async () => {
        await useFundStore.getState().setMonthlyIncome(700000);
      });

      expect(useFundStore.getState().monthlyIncome).toBe(700000);
    });

    it('should not update state when persistence fails', async () => {
      mockSetPreference.mockRejectedValue(new Error('Write failed'));

      await act(async () => {
        try {
          await useFundStore.getState().setMonthlyIncome(600000);
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().monthlyIncome).toBeNull();
    });
  });

  describe('removeMonthlyIncome', () => {
    it('should clear the income from state', async () => {
      useFundStore.setState({ monthlyIncome: 500000 });
      mockDeletePreference.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().removeMonthlyIncome();
      });

      expect(mockDeletePreference).toHaveBeenCalledWith('monthly_income');
      expect(useFundStore.getState().monthlyIncome).toBeNull();
    });

    it('should not update state when deletion fails', async () => {
      useFundStore.setState({ monthlyIncome: 500000 });
      mockDeletePreference.mockRejectedValue(new Error('Delete failed'));

      await act(async () => {
        try {
          await useFundStore.getState().removeMonthlyIncome();
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().monthlyIncome).toBe(500000);
    });
  });

  describe('setAllocation', () => {
    it('should add/update allocation in the map for selected month', async () => {
      useFundStore.setState({ selectedMonth: '2025-01' });
      const allocation = makeAllocation();
      mockAllocationUpsert.mockResolvedValue(allocation);

      await act(async () => {
        await useFundStore.getState().setAllocation('fund-1', '2025-01', 50000);
      });

      expect(mockAllocationUpsert).toHaveBeenCalledWith('fund-1', '2025-01', 50000);
      expect(useFundStore.getState().allocations.get('fund-1')).toEqual(allocation);
    });

    it('should not update local state when month differs from selectedMonth', async () => {
      useFundStore.setState({ selectedMonth: '2025-01' });
      const allocation = makeAllocation({ referenceMonth: '2025-02' });
      mockAllocationUpsert.mockResolvedValue(allocation);

      await act(async () => {
        await useFundStore.getState().setAllocation('fund-1', '2025-02', 50000);
      });

      expect(useFundStore.getState().allocations.has('fund-1')).toBe(false);
    });

    it('should not update state when upsert fails', async () => {
      useFundStore.setState({ selectedMonth: '2025-01' });
      mockAllocationUpsert.mockRejectedValue(new Error('Upsert failed'));

      await act(async () => {
        try {
          await useFundStore.getState().setAllocation('fund-1', '2025-01', 50000);
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().allocations.has('fund-1')).toBe(false);
    });
  });

  describe('removeAllocation', () => {
    it('should remove allocation from the map for selected month', async () => {
      const allocations = new Map<string, FundAllocation>();
      allocations.set('fund-1', makeAllocation());
      useFundStore.setState({ allocations, selectedMonth: '2025-01' });
      mockAllocationDelete.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().removeAllocation('fund-1', '2025-01');
      });

      expect(mockAllocationDelete).toHaveBeenCalledWith('fund-1', '2025-01');
      expect(useFundStore.getState().allocations.has('fund-1')).toBe(false);
    });

    it('should not update local state when month differs from selectedMonth', async () => {
      const allocations = new Map<string, FundAllocation>();
      allocations.set('fund-1', makeAllocation());
      useFundStore.setState({ allocations, selectedMonth: '2025-01' });
      mockAllocationDelete.mockResolvedValue(undefined);

      await act(async () => {
        await useFundStore.getState().removeAllocation('fund-1', '2025-02');
      });

      // Allocation should still be in the map since selected month is different
      expect(useFundStore.getState().allocations.has('fund-1')).toBe(true);
    });

    it('should not update state when deletion fails', async () => {
      const allocations = new Map<string, FundAllocation>();
      allocations.set('fund-1', makeAllocation());
      useFundStore.setState({ allocations, selectedMonth: '2025-01' });
      mockAllocationDelete.mockRejectedValue(new Error('Delete failed'));

      await act(async () => {
        try {
          await useFundStore.getState().removeAllocation('fund-1', '2025-01');
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().allocations.has('fund-1')).toBe(true);
    });
  });

  describe('linkTransaction', () => {
    it('should call repo.link and reload fund transactions', async () => {
      const mockTxDetails = [
        {
          id: 'ft-1',
          fundId: 'fund-1',
          transactionId: 'tx-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          title: 'Flight',
          amount: -30000,
          referenceMonth: '2025-01',
          date: '2025-01-15',
          isPaid: true,
        },
      ];
      mockFundTxLink.mockResolvedValue({
        id: 'ft-1',
        fundId: 'fund-1',
        transactionId: 'tx-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      mockFundTxGetByFundIdWithDetails.mockResolvedValue(mockTxDetails);

      await act(async () => {
        await useFundStore.getState().linkTransaction('fund-1', 'tx-1');
      });

      expect(mockFundTxLink).toHaveBeenCalledWith('fund-1', 'tx-1');
      expect(mockFundTxGetByFundIdWithDetails).toHaveBeenCalledWith('fund-1');
      expect(useFundStore.getState().fundTransactions.get('fund-1')).toEqual(mockTxDetails);
    });

    it('should not update state when link fails', async () => {
      mockFundTxLink.mockRejectedValue(new Error('Link failed'));

      await act(async () => {
        try {
          await useFundStore.getState().linkTransaction('fund-1', 'tx-1');
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().fundTransactions.has('fund-1')).toBe(false);
    });
  });

  describe('unlinkTransaction', () => {
    it('should call repo unlink and reload fund transactions', async () => {
      mockFundTxGetByTransactionId.mockResolvedValue({
        id: 'ft-1',
        fundId: 'fund-1',
        transactionId: 'tx-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      mockFundTxUnlink.mockResolvedValue(undefined);
      mockFundTxGetByFundIdWithDetails.mockResolvedValue([]);

      await act(async () => {
        await useFundStore.getState().unlinkTransaction('tx-1');
      });

      expect(mockFundTxGetByTransactionId).toHaveBeenCalledWith('tx-1');
      expect(mockFundTxUnlink).toHaveBeenCalledWith('tx-1');
      expect(mockFundTxGetByFundIdWithDetails).toHaveBeenCalledWith('fund-1');
      expect(useFundStore.getState().fundTransactions.get('fund-1')).toEqual([]);
    });

    it('should do nothing when transaction is not linked to any fund', async () => {
      mockFundTxGetByTransactionId.mockResolvedValue(null);

      await act(async () => {
        await useFundStore.getState().unlinkTransaction('tx-nonexistent');
      });

      expect(mockFundTxUnlink).not.toHaveBeenCalled();
    });

    it('should not update state when unlink fails', async () => {
      const fundTxMap = new Map();
      fundTxMap.set('fund-1', [
        {
          id: 'ft-1',
          fundId: 'fund-1',
          transactionId: 'tx-1',
          createdAt: '2025-01-01T00:00:00.000Z',
          title: 'Flight',
          amount: -30000,
          referenceMonth: '2025-01',
          date: '2025-01-15',
          isPaid: true,
        },
      ]);
      useFundStore.setState({ fundTransactions: fundTxMap });
      mockFundTxGetByTransactionId.mockResolvedValue({
        id: 'ft-1',
        fundId: 'fund-1',
        transactionId: 'tx-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      mockFundTxUnlink.mockRejectedValue(new Error('Unlink failed'));

      await act(async () => {
        try {
          await useFundStore.getState().unlinkTransaction('tx-1');
        } catch (_e) {
          // expected
        }
      });

      // State should remain unchanged since unlink threw
      expect(useFundStore.getState().fundTransactions.get('fund-1')).toHaveLength(1);
    });
  });

  describe('setBaseBalance', () => {
    it('should update the balance map', async () => {
      const balance = makeBalance({ baseAmount: 250000 });
      mockBalanceUpsert.mockResolvedValue(balance);

      await act(async () => {
        await useFundStore.getState().setBaseBalance('fund-1', 250000);
      });

      expect(mockBalanceUpsert).toHaveBeenCalledWith('fund-1', 250000);
      expect(useFundStore.getState().balances.get('fund-1')).toEqual(balance);
    });

    it('should overwrite existing balance', async () => {
      const initialBalances = new Map<string, FundBalance>();
      initialBalances.set('fund-1', makeBalance({ baseAmount: 100000 }));
      useFundStore.setState({ balances: initialBalances });

      const updatedBalance = makeBalance({ baseAmount: 300000 });
      mockBalanceUpsert.mockResolvedValue(updatedBalance);

      await act(async () => {
        await useFundStore.getState().setBaseBalance('fund-1', 300000);
      });

      expect(useFundStore.getState().balances.get('fund-1')?.baseAmount).toBe(300000);
    });

    it('should not update state when upsert fails', async () => {
      mockBalanceUpsert.mockRejectedValue(new Error('Upsert failed'));

      await act(async () => {
        try {
          await useFundStore.getState().setBaseBalance('fund-1', 250000);
        } catch (_e) {
          // expected
        }
      });

      expect(useFundStore.getState().balances.has('fund-1')).toBe(false);
    });
  });
});
