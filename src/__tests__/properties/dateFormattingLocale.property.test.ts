/**
 * Property 4: Date Formatting Matches Locale Pattern
 *
 * For any valid Date object, formatting it with locale "pt-BR" SHALL produce
 * a string matching the pattern `dd/MM/yyyy HH:mm`, and formatting with locale
 * "en" SHALL produce a string matching `MM/dd/yyyy hh:mm a`.
 *
 * **Validates: Requirements 3.4**
 */

import fc from 'fast-check';
import { formatDateTimeForLocale } from '../../components/ui/DateTimePicker';

describe('Feature: entry-title-and-dates, Property 4: Date Formatting Matches Locale Pattern', () => {
  /**
   * **Validates: Requirements 3.4**
   */

  // Arbitrary that generates valid Date objects within a reasonable range
  const validDateArbitrary = fc
    .date({
      min: new Date('1970-01-01T00:00:00.000Z'),
      max: new Date('2099-12-31T23:59:59.999Z'),
    })
    .filter((d) => !isNaN(d.getTime()));

  it('should format pt-BR dates matching pattern dd/MM/yyyy HH:mm', () => {
    const ptBrPattern = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

    fc.assert(
      fc.property(validDateArbitrary, (date) => {
        const result = formatDateTimeForLocale(date, 'pt-BR');
        expect(result).toMatch(ptBrPattern);
      }),
      { numRuns: 100 }
    );
  });

  it('should format en dates matching pattern MM/dd/yyyy hh:mm (AM|PM)', () => {
    const enPattern = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/;

    fc.assert(
      fc.property(validDateArbitrary, (date) => {
        const result = formatDateTimeForLocale(date, 'en');
        expect(result).toMatch(enPattern);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce correct day/month/year values for pt-BR format', () => {
    fc.assert(
      fc.property(validDateArbitrary, (date) => {
        const result = formatDateTimeForLocale(date, 'pt-BR');
        const [datePart, timePart] = result.split(' ') as [string, string];
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        expect(day).toBe(date.getDate());
        expect(month).toBe(date.getMonth() + 1);
        expect(year).toBe(date.getFullYear());
        expect(hours).toBe(date.getHours());
        expect(minutes).toBe(date.getMinutes());
      }),
      { numRuns: 100 }
    );
  });

  it('should produce correct month/day/year and 12h values for en format', () => {
    fc.assert(
      fc.property(validDateArbitrary, (date) => {
        const result = formatDateTimeForLocale(date, 'en');
        const parts = result.split(' ');
        const [datePart, timePart, period] = [parts[0]!, parts[1]!, parts[2]!];
        const [month, day, year] = datePart.split('/').map(Number);
        const [hours12, minutes] = timePart.split(':').map(Number);

        expect(day).toBe(date.getDate());
        expect(month).toBe(date.getMonth() + 1);
        expect(year).toBe(date.getFullYear());
        expect(minutes).toBe(date.getMinutes());

        // Verify 12-hour conversion
        const expectedHours = date.getHours() % 12 || 12;
        expect(hours12).toBe(expectedHours);

        // Verify AM/PM
        const expectedPeriod = date.getHours() >= 12 ? 'PM' : 'AM';
        expect(period).toBe(expectedPeriod);
      }),
      { numRuns: 100 }
    );
  });
});
