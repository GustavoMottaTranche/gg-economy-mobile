import { distributeAmount, advanceMonth, calculateInstallments } from './InstallmentCalculator';
import { InstallmentCalculatorInput } from '../../types/installment';

describe('InstallmentCalculator', () => {
  describe('distributeAmount', () => {
    it('distributes evenly divisible amount', () => {
      const result = distributeAmount(900, 3);
      expect(result).toEqual([300, 300, 300]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(900);
    });

    it('puts remainder on first parcel', () => {
      const result = distributeAmount(1000, 3);
      // floor(1000/3) = 333, remainder = 1000 - 333*3 = 1
      expect(result).toEqual([334, 333, 333]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('handles 2 parcels with remainder', () => {
      const result = distributeAmount(101, 2);
      // floor(101/2) = 50, remainder = 1
      expect(result).toEqual([51, 50]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(101);
    });

    it('handles large remainder', () => {
      const result = distributeAmount(47, 48);
      // floor(47/48) = 0, remainder = 47
      // first parcel = 47, rest = 0
      expect(result[0]).toBe(47);
      expect(result.slice(1).every((v) => v === 0)).toBe(true);
      expect(result.reduce((a, b) => a + b, 0)).toBe(47);
    });
  });

  describe('advanceMonth', () => {
    it('returns same month for offset 0', () => {
      expect(advanceMonth('2025-06', 0)).toBe('2025-06');
    });

    it('advances within same year', () => {
      expect(advanceMonth('2025-01', 5)).toBe('2025-06');
    });

    it('handles year rollover', () => {
      expect(advanceMonth('2025-11', 2)).toBe('2026-01');
    });

    it('handles December to January', () => {
      expect(advanceMonth('2025-12', 1)).toBe('2026-01');
    });

    it('handles multiple year rollovers', () => {
      expect(advanceMonth('2025-01', 24)).toBe('2027-01');
    });

    it('pads month with leading zero', () => {
      expect(advanceMonth('2025-01', 0)).toBe('2025-01');
      expect(advanceMonth('2025-09', 0)).toBe('2025-09');
    });
  });

  describe('calculateInstallments', () => {
    it('generates correct installment details with title in descriptionSuffix', () => {
      const input: InstallmentCalculatorInput = {
        totalAmount: 1000,
        parcelCount: 3,
        startMonth: '2025-11',
        title: 'Compra',
        categoryId: 'cat-1',
      };

      const result = calculateInstallments(input);

      expect(result).toHaveLength(3);

      // First parcel gets remainder
      expect(result[0]).toEqual({
        index: 1,
        totalParcels: 3,
        amount: 334,
        referenceMonth: '2025-11',
        descriptionSuffix: 'Compra (1/3)',
      });

      expect(result[1]).toEqual({
        index: 2,
        totalParcels: 3,
        amount: 333,
        referenceMonth: '2025-12',
        descriptionSuffix: 'Compra (2/3)',
      });

      expect(result[2]).toEqual({
        index: 3,
        totalParcels: 3,
        amount: 333,
        referenceMonth: '2026-01',
        descriptionSuffix: 'Compra (3/3)',
      });
    });

    it('sum of all parcel amounts equals total', () => {
      const input: InstallmentCalculatorInput = {
        totalAmount: 9999,
        parcelCount: 7,
        startMonth: '2025-01',
        title: 'Test',
        categoryId: 'cat-1',
      };

      const result = calculateInstallments(input);
      const sum = result.reduce((acc, r) => acc + r.amount, 0);
      expect(sum).toBe(9999);
    });

    it('generates descriptionSuffix with title prepended', () => {
      const input: InstallmentCalculatorInput = {
        totalAmount: 500,
        parcelCount: 5,
        startMonth: '2025-01',
        title: 'Supermercado',
        categoryId: 'cat-1',
      };

      const result = calculateInstallments(input);
      expect(result.map((r) => r.descriptionSuffix)).toEqual([
        'Supermercado (1/5)',
        'Supermercado (2/5)',
        'Supermercado (3/5)',
        'Supermercado (4/5)',
        'Supermercado (5/5)',
      ]);
    });

    it('generates suffix-only descriptionSuffix when title is empty', () => {
      const input: InstallmentCalculatorInput = {
        totalAmount: 600,
        parcelCount: 3,
        startMonth: '2025-01',
        title: '',
        categoryId: 'cat-1',
      };

      const result = calculateInstallments(input);
      expect(result.map((r) => r.descriptionSuffix)).toEqual([' (1/3)', ' (2/3)', ' (3/3)']);
    });
  });
});
