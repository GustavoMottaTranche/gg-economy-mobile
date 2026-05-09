/**
 * Unit tests for category query functions
 *
 * Tests the DEFAULT_CATEGORIES constant and function signatures.
 */
import { DEFAULT_CATEGORIES } from '../../../../src/db/queries/categories';

describe('Category Query Functions', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('should have 8 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(8);
    });

    it('should have required properties for each category', () => {
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('type');
        expect(cat).toHaveProperty('icon');
        expect(cat).toHaveProperty('color');
        expect(['income', 'expense']).toContain(cat.type);
      });
    });

    it('should have Salary as the only income category', () => {
      const incomeCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'income');
      expect(incomeCategories).toHaveLength(1);
      expect(incomeCategories[0].name).toBe('Salary');
    });

    it('should have 7 expense categories', () => {
      const expenseCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense');
      expect(expenseCategories).toHaveLength(7);
    });

    it('should have Food category', () => {
      const food = DEFAULT_CATEGORIES.find((c) => c.name === 'Food');
      expect(food).toBeDefined();
      expect(food?.type).toBe('expense');
      expect(food?.icon).toBe('restaurant');
    });

    it('should have Transport category', () => {
      const transport = DEFAULT_CATEGORIES.find((c) => c.name === 'Transport');
      expect(transport).toBeDefined();
      expect(transport?.type).toBe('expense');
      expect(transport?.icon).toBe('car');
    });

    it('should have Bills category', () => {
      const bills = DEFAULT_CATEGORIES.find((c) => c.name === 'Bills');
      expect(bills).toBeDefined();
      expect(bills?.type).toBe('expense');
      expect(bills?.icon).toBe('receipt');
    });

    it('should have Entertainment category', () => {
      const entertainment = DEFAULT_CATEGORIES.find((c) => c.name === 'Entertainment');
      expect(entertainment).toBeDefined();
      expect(entertainment?.type).toBe('expense');
      expect(entertainment?.icon).toBe('film');
    });

    it('should have Health category', () => {
      const health = DEFAULT_CATEGORIES.find((c) => c.name === 'Health');
      expect(health).toBeDefined();
      expect(health?.type).toBe('expense');
      expect(health?.icon).toBe('heart');
    });

    it('should have Shopping category', () => {
      const shopping = DEFAULT_CATEGORIES.find((c) => c.name === 'Shopping');
      expect(shopping).toBeDefined();
      expect(shopping?.type).toBe('expense');
      expect(shopping?.icon).toBe('shopping-bag');
    });

    it('should have Other category', () => {
      const other = DEFAULT_CATEGORIES.find((c) => c.name === 'Other');
      expect(other).toBeDefined();
      expect(other?.type).toBe('expense');
      expect(other?.icon).toBe('more-horizontal');
    });

    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.color).toMatch(hexColorRegex);
      });
    });

    it('should have unique names', () => {
      const names = DEFAULT_CATEGORIES.map((c) => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have unique colors', () => {
      const colors = DEFAULT_CATEGORIES.map((c) => c.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });
});
