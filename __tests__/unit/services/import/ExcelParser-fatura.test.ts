/**
 * Test ExcelParser with real fatura XLSX format
 * Verifies that "lançamento" header is correctly mapped as description
 */
import { ExcelParser } from '../../../../src/services/import/ExcelParser';
import * as XLSX from 'xlsx';

describe('ExcelParser - Fatura XLSX format', () => {
  const parser = new ExcelParser();

  function createFaturaExcel(): ArrayBuffer {
    const data = [
      ['data', 'lançamento', 'valor'],
      ['2026-05-07', 'LourdesRivarolliSOROCABABRA', '18.89'],
      ['2026-05-07', 'MERCADOLIVRE*MERCADOLOsascoBRA', '71.21'],
      ['2026-05-06', 'PAYGO*BEACH HOUSESOROCABABRA', '140'],
      ['2026-04-28', 'PAGAMENTO COM SALDO', '-5997'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return buffer;
  }

  it('should map "lançamento" column as description', () => {
    const excelData = createFaturaExcel();
    const result = parser.parse(excelData);

    expect(result.columnMapping.descriptionColumn).toBe(1);
    expect(result.columnMapping.dateColumn).toBe(0);
    expect(result.columnMapping.amountColumn).toBe(2);
  });

  it('should parse descriptions correctly from lançamento column', () => {
    const excelData = createFaturaExcel();
    const result = parser.parse(excelData);

    expect(result.transactions[0]?.description).toBe('LourdesRivarolliSOROCABABRA');
    expect(result.transactions[1]?.description).toBe('MERCADOLIVRE*MERCADOLOsascoBRA');
    expect(result.transactions[2]?.description).toBe('PAYGO*BEACH HOUSESOROCABABRA');
    expect(result.transactions[3]?.description).toBe('PAGAMENTO COM SALDO');
  });

  it('should parse amounts correctly', () => {
    const excelData = createFaturaExcel();
    const result = parser.parse(excelData);

    expect(result.transactions[0]?.amount).toBeCloseTo(18.89);
    expect(result.transactions[1]?.amount).toBeCloseTo(71.21);
    expect(result.transactions[2]?.amount).toBeCloseTo(140);
    expect(result.transactions[3]?.amount).toBeCloseTo(-5997);
  });
});
