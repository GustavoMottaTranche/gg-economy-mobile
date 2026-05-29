/**
 * Unit tests for category query functions
 *
 * Tests the DEFAULT_CATEGORIES constant and function signatures.
 */
import { DEFAULT_CATEGORIES } from '../../../../src/db/queries/categories';

describe('Category Query Functions', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('should have 61 default categories (30 fixed + 31 variable)', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(61);
    });

    it('should have required properties for each category', () => {
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('type');
        expect(cat).toHaveProperty('icon');
        expect(cat).toHaveProperty('color');
        expect(cat).toHaveProperty('expenseGroup');
        expect(cat.type).toBe('expense');
        expect(['fixed', 'variable']).toContain(cat.expenseGroup);
      });
    });

    it('should have 30 fixed expense categories', () => {
      const fixedCategories = DEFAULT_CATEGORIES.filter((c) => c.expenseGroup === 'fixed');
      expect(fixedCategories).toHaveLength(30);
    });

    it('should have 31 variable expense categories', () => {
      const variableCategories = DEFAULT_CATEGORIES.filter((c) => c.expenseGroup === 'variable');
      expect(variableCategories).toHaveLength(31);
    });

    it('should have all categories as expense type', () => {
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.type).toBe('expense');
      });
    });

    it('should have "Outros" (fixed) with icon ➕ and color #9E9E9E', () => {
      const outrosFixed = DEFAULT_CATEGORIES.find(
        (c) => c.name === 'Outros' && c.expenseGroup === 'fixed'
      );
      expect(outrosFixed).toBeDefined();
      expect(outrosFixed?.icon).toBe('➕');
      expect(outrosFixed?.color).toBe('#9E9E9E');
    });

    it('should have "Outros" (variable) with icon 📋 and color #757575', () => {
      const outrosVariable = DEFAULT_CATEGORIES.find(
        (c) => c.name === 'Outros' && c.expenseGroup === 'variable'
      );
      expect(outrosVariable).toBeDefined();
      expect(outrosVariable?.icon).toBe('📋');
      expect(outrosVariable?.color).toBe('#757575');
    });

    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.color).toMatch(hexColorRegex);
      });
    });

    it('should have non-empty icon for each category', () => {
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.icon.length).toBeGreaterThan(0);
      });
    });

    it('should not contain old generic categories', () => {
      const oldNames = [
        'Food',
        'Transport',
        'Salary',
        'Bills',
        'Entertainment',
        'Health',
        'Shopping',
        'Other',
      ];
      const names = DEFAULT_CATEGORIES.map((c) => c.name);
      oldNames.forEach((oldName) => {
        expect(names).not.toContain(oldName);
      });
    });
  });
});
