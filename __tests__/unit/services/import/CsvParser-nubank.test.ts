/**
 * Test CsvParser with real Nubank CSV format
 * Verifies that "title" header is correctly mapped as description
 */
import { CsvParser } from '../../../../src/services/import/CsvParser';

describe('CsvParser - Nubank CSV format', () => {
  const parser = new CsvParser();

  const nubankCsv = `date,title,amount
2026-05-08,Uber - NuPay,18.73
2026-05-08,COMEDIA INGRESSOS,76.12
2026-05-01,Pagamento recebido,-2361.82
2026-05-01,Uber - NuPay,26.43`;

  it('should map "title" column as description', () => {
    const result = parser.parse(nubankCsv);

    expect(result.columnMapping.descriptionIndex).toBe(1);
    expect(result.columnMapping.dateIndex).toBe(0);
    expect(result.columnMapping.amountIndex).toBe(2);
  });

  it('should parse descriptions correctly from title column', () => {
    const result = parser.parse(nubankCsv);

    expect(result.transactions[0]?.description).toBe('Uber - NuPay');
    expect(result.transactions[1]?.description).toBe('COMEDIA INGRESSOS');
    expect(result.transactions[2]?.description).toBe('Pagamento recebido');
    expect(result.transactions[3]?.description).toBe('Uber - NuPay');
  });

  it('should parse amounts correctly', () => {
    const result = parser.parse(nubankCsv);

    expect(result.transactions[0]?.amount).toBeCloseTo(18.73);
    expect(result.transactions[1]?.amount).toBeCloseTo(76.12);
    expect(result.transactions[2]?.amount).toBeCloseTo(-2361.82);
    expect(result.transactions[3]?.amount).toBeCloseTo(26.43);
  });
});
