// Feature: category-detail-screen, Property 5: Item rendering completeness

/**
 * Property 5: Item rendering completeness
 *
 * For any item in the displayed list, the rendered output SHALL contain:
 * - The item's title (non-empty string)
 * - A formatted date string (produced by formatDateLocale)
 * - A formatted currency amount (produced by formatCurrencyLocale)
 *
 * This test generates random valid CategoryDetailItem objects and verifies that
 * the formatting logic used by the screen component produces valid, non-empty
 * results for each field.
 *
 * **Validates: Requirements 3.2, 7.2, 7.3**
 */

import fc from 'fast-check';
import { formatDateLocale, formatCurrencyLocale } from '../../i18n';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryDetailItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number; // in cents (raw DB value)
  type: 'transaction' | 'weekly';
  weeklyGroupId?: string;
}

type SupportedLocale = 'pt-BR' | 'en';

// ─── Rendering Logic Under Test ──────────────────────────────────────────────

/**
 * Replicates the formatting logic from ItemRow in app/category/[id].tsx.
 * Given a CategoryDetailItem and a locale, produces the rendered text values.
 */
function formatItemForRendering(
  item: CategoryDetailItem,
  locale: SupportedLocale
): { title: string; formattedDate: string; formattedAmount: string } {
  const title = item.title;
  const formattedDate = formatDateLocale(new Date(item.date + 'T12:00:00'), locale);
  const formattedAmount = formatCurrencyLocale(Math.abs(item.amount) / 100, locale);

  return { title, formattedDate, formattedAmount };
}

// ─── Generators ──────────────────────────────────────────────────────────────

const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

const categoryDetailItemArb: fc.Arbitrary<CategoryDetailItem> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  date: dateArb,
  amount: fc.integer({ min: -9999999, max: 9999999 }).filter((a) => a !== 0),
  type: fc.oneof(fc.constant('transaction' as const), fc.constant('weekly' as const)),
  weeklyGroupId: fc.option(fc.uuid(), { nil: undefined }),
});

const localeArb: fc.Arbitrary<SupportedLocale> = fc.constantFrom('pt-BR' as const, 'en' as const);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: category-detail-screen, Property 5: Item rendering completeness', () => {
  it('every rendered item contains a non-empty title, formatted date, and formatted currency amount', () => {
    fc.assert(
      fc.property(categoryDetailItemArb, localeArb, (item, locale) => {
        const { title, formattedDate, formattedAmount } = formatItemForRendering(item, locale);

        // Title must be a non-empty string
        expect(typeof title).toBe('string');
        expect(title.length).toBeGreaterThan(0);

        // Formatted date must be a non-empty string
        expect(typeof formattedDate).toBe('string');
        expect(formattedDate.length).toBeGreaterThan(0);

        // Formatted amount must be a non-empty string containing currency symbols
        expect(typeof formattedAmount).toBe('string');
        expect(formattedAmount.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('formatted date is a valid date representation (contains digits)', () => {
    fc.assert(
      fc.property(categoryDetailItemArb, localeArb, (item, locale) => {
        const { formattedDate } = formatItemForRendering(item, locale);

        // A formatted date should contain numeric characters representing the day/month/year
        expect(formattedDate).toMatch(/\d/);
      }),
      { numRuns: 100 }
    );
  });

  it('formatted currency amount contains a currency symbol (R$ or $)', () => {
    fc.assert(
      fc.property(categoryDetailItemArb, localeArb, (item, locale) => {
        const { formattedAmount } = formatItemForRendering(item, locale);

        // Currency formatting should include the locale's currency symbol
        if (locale === 'pt-BR') {
          expect(formattedAmount).toContain('R$');
        } else {
          expect(formattedAmount).toContain('$');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('formatted currency amount contains numeric digits', () => {
    fc.assert(
      fc.property(categoryDetailItemArb, localeArb, (item, locale) => {
        const { formattedAmount } = formatItemForRendering(item, locale);

        // Currency amount must contain at least one digit
        expect(formattedAmount).toMatch(/\d/);
      }),
      { numRuns: 100 }
    );
  });
});
