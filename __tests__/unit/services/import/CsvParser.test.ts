/**
 * Unit tests for CsvParser
 *
 * Tests CSV parsing functionality including:
 * - Delimiter auto-detection (comma, semicolon, tab)
 * - Header row detection and column mapping
 * - Date parsing for multiple formats
 * - Amount parsing with decimal separator detection
 * - Error handling with line number reporting
 *
 * @module CsvParser.test
 */

import { CsvParser } from '../../../../src/services/import/CsvParser';
import { RawTransaction } from '../../../../src/types/transaction';

describe('CsvParser', () => {
  let parser: CsvParser;

  beforeEach(() => {
    parser = new CsvParser();
  });

  describe('Delimiter Auto-Detection', () => {
    it('should detect comma delimiter', () => {
      const csv = `date,amount,description
2024-01-15,100.00,Test transaction
2024-01-16,200.00,Another transaction`;

      const result = parser.parse(csv);
      expect(result.delimiter).toBe(',');
      expect(result.transactions).toHaveLength(2);
    });

    it('should detect semicolon delimiter', () => {
      const csv = `date;amount;description
2024-01-15;100.00;Test transaction
2024-01-16;200.00;Another transaction`;

      const result = parser.parse(csv);
      expect(result.delimiter).toBe(';');
      expect(result.transactions).toHaveLength(2);
    });

    it('should detect tab delimiter', () => {
      const csv = `date\tamount\tdescription
2024-01-15\t100.00\tTest transaction
2024-01-16\t200.00\tAnother transaction`;

      const result = parser.parse(csv);
      expect(result.delimiter).toBe('\t');
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle mixed content and choose most consistent delimiter', () => {
      // Comma appears consistently, semicolon only in description
      const csv = `date,amount,description
2024-01-15,100.00,Test; with semicolon
2024-01-16,200.00,Another; test`;

      const result = parser.parse(csv);
      expect(result.delimiter).toBe(',');
      expect(result.transactions).toHaveLength(2);
    });

    it('should allow forcing a specific delimiter', () => {
      const csv = `date;amount;description
2024-01-15;100.00;Test transaction`;

      const result = parser.parse(csv, { delimiter: ';' });
      expect(result.delimiter).toBe(';');
      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('Header Row Detection', () => {
    it('should detect header row with standard column names', () => {
      const csv = `date,amount,description
2024-01-15,100.00,Test transaction`;

      const result = parser.parse(csv);
      expect(result.columnMapping.headers).toEqual(['date', 'amount', 'description']);
      expect(result.transactions).toHaveLength(1);
    });

    it('should detect Portuguese header names', () => {
      const csv = `data,valor,descrição
2024-01-15,100.00,Transação teste`;

      const result = parser.parse(csv);
      expect(result.columnMapping.dateIndex).toBe(0);
      expect(result.columnMapping.amountIndex).toBe(1);
      expect(result.columnMapping.descriptionIndex).toBe(2);
      expect(result.transactions).toHaveLength(1);
    });

    it('should detect headers in different order', () => {
      const csv = `description,date,amount
Test transaction,2024-01-15,100.00`;

      const result = parser.parse(csv);
      expect(result.columnMapping.descriptionIndex).toBe(0);
      expect(result.columnMapping.dateIndex).toBe(1);
      expect(result.columnMapping.amountIndex).toBe(2);
      expect(result.transactions).toHaveLength(1);
    });

    it('should handle CSV without headers by inferring from data', () => {
      const csv = `2024-01-15,100.00,Test transaction
2024-01-16,200.00,Another transaction`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
      expect(result.transactions[0]!.amount).toBe(100.0);
    });

    it('should allow forcing column mapping', () => {
      const csv = `col1,col2,col3,col4
2024-01-15,ignored,100.00,Test transaction`;

      const result = parser.parse(csv, {
        columnMapping: {
          dateIndex: 0,
          amountIndex: 2,
          descriptionIndex: 3,
        },
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.amount).toBe(100.0);
      expect(result.transactions[0]!.description).toBe('Test transaction');
    });
  });

  describe('Date Parsing', () => {
    it('should parse DD/MM/YYYY format', () => {
      const csv = `date,amount,description
15/01/2024,100.00,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse MM/DD/YYYY format', () => {
      const csv = `date,amount,description
01/15/2024,100.00,Test transaction`;

      const result = parser.parse(csv, { dateFormat: 'MM/DD/YYYY' });
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse YYYY-MM-DD format (ISO)', () => {
      const csv = `date,amount,description
2024-01-15,100.00,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
    });

    it('should auto-detect date format from data', () => {
      // Day > 12 indicates DD/MM/YYYY
      const csv = `date,amount,description
25/01/2024,100.00,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 25));
    });

    it('should report error for invalid dates', () => {
      const csv = `date,amount,description
invalid-date,100.00,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Invalid date');
    });

    it('should handle dates at month boundaries', () => {
      const csv = `date,amount,description
31/01/2024,100.00,End of January
29/02/2024,100.00,Leap year February`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 31));
      expect(result.transactions[1]!.date).toEqual(new Date(2024, 1, 29));
    });
  });

  describe('Amount Parsing', () => {
    it('should parse amounts with period decimal separator', () => {
      const csv = `date,amount,description
2024-01-15,1234.56,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.amount).toBe(1234.56);
    });

    it('should parse amounts with comma decimal separator (pt-BR)', () => {
      const csv = `date,amount,description
2024-01-15,"1234,56",Test transaction`;

      const result = parser.parse(csv, { locale: 'pt-BR' });
      expect(result.transactions[0]!.amount).toBe(1234.56);
    });

    it('should parse amounts with thousand separators (en style: 1,234.56)', () => {
      const csv = `date,amount,description
2024-01-15,"1,234.56",Test transaction`;

      const result = parser.parse(csv, { locale: 'en' });
      expect(result.transactions[0]!.amount).toBe(1234.56);
    });

    it('should parse amounts with thousand separators (pt-BR style: 1.234,56)', () => {
      const csv = `date,amount,description
2024-01-15,"1.234,56",Test transaction`;

      const result = parser.parse(csv, { locale: 'pt-BR' });
      expect(result.transactions[0]!.amount).toBe(1234.56);
    });

    it('should parse negative amounts with minus sign', () => {
      const csv = `date,amount,description
2024-01-15,-100.00,Expense`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.amount).toBe(-100.0);
    });

    it('should parse negative amounts in parentheses format', () => {
      const csv = `date,amount,description
2024-01-15,(100.00),Expense`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.amount).toBe(-100.0);
    });

    it('should parse amounts with currency symbols', () => {
      const csv = `date,amount,description
2024-01-15,R$ 100.00,Brazilian Real
2024-01-16,$200.00,US Dollar`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.amount).toBe(100.0);
      expect(result.transactions[1]!.amount).toBe(200.0);
    });

    it('should report error for invalid amounts', () => {
      const csv = `date,amount,description
2024-01-15,invalid,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Invalid amount');
    });

    it('should handle integer amounts', () => {
      const csv = `date,amount,description
2024-01-15,100,Test transaction`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.amount).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should report errors with line numbers', () => {
      const csv = `date,amount,description
2024-01-15,100.00,Valid transaction
invalid-date,200.00,Invalid date
2024-01-17,invalid,Invalid amount`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);

      // Line numbers are 1-indexed and account for header
      expect(result.errors[0]!.lineNumber).toBe(3);
      expect(result.errors[0]!.message).toContain('Invalid date');

      expect(result.errors[1]!.lineNumber).toBe(4);
      expect(result.errors[1]!.message).toContain('Invalid amount');
    });

    it('should include original line content in errors', () => {
      const csv = `date,amount,description
invalid-line-content`;

      const result = parser.parse(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.lineContent).toBe('invalid-line-content');
    });

    it('should handle empty CSV file', () => {
      const result = parser.parse('');
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Empty CSV file');
    });

    it('should handle CSV with only whitespace', () => {
      const result = parser.parse('   \n\n   ');
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle lines with insufficient fields', () => {
      const csv = `date,amount,description
2024-01-15,100.00
2024-01-16,200.00,Valid`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('fields');
    });

    it('should handle empty description', () => {
      const csv = `date,amount,description
2024-01-15,100.00,`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Empty description');
    });

    it('should skip initial lines when specified', () => {
      const csv = `Bank Statement Export
Account: 12345
date,amount,description
2024-01-15,100.00,Test transaction`;

      const result = parser.parse(csv, { skipLines: 2 });
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.amount).toBe(100.0);
    });
  });

  describe('Quoted Fields', () => {
    it('should handle quoted fields with delimiters', () => {
      const csv = `date,amount,description
2024-01-15,100.00,"Transaction, with comma"`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.description).toBe('Transaction, with comma');
    });

    it('should handle escaped quotes in fields', () => {
      const csv = `date,amount,description
2024-01-15,100.00,"Transaction with ""quotes"""`;

      const result = parser.parse(csv);
      expect(result.transactions[0]!.description).toBe('Transaction with "quotes"');
    });

    it('should handle multiline quoted fields (splits on newline)', () => {
      // Note: Current implementation splits on newlines even within quotes
      // This is acceptable for bank statement parsing where multiline fields are rare
      const csv = `date,amount,description
2024-01-15,100.00,"Line 1
Line 2"`;

      const result = parser.parse(csv);
      // The parser treats each line separately, so the quoted field is split
      // This is a known limitation - multiline quoted fields are not fully supported
      expect(result.transactions[0]!.description).toBe('Line 1');
    });
  });

  describe('Bank Statement Formats', () => {
    it('should parse Nubank CSV format', () => {
      const csv = `Data,Valor,Descrição
15/01/2024,-50.00,Uber *UBER *TRIP
16/01/2024,-25.50,IFOOD *IFOOD`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
      expect(result.transactions[0]!.amount).toBe(-50.0);
      expect(result.transactions[0]!.description).toBe('Uber *UBER *TRIP');
    });

    it('should parse Itaú CSV format', () => {
      const csv = `data;valor;historico
15/01/2024;-100,50;PIX ENVIADO
16/01/2024;500,00;SALARIO`;

      const result = parser.parse(csv, { locale: 'pt-BR' });
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.amount).toBe(-100.5);
      expect(result.transactions[1]!.amount).toBe(500.0);
    });

    it('should parse generic US bank format', () => {
      const csv = `Transaction Date,Amount,Description
01/15/2024,-50.00,AMAZON.COM
01/16/2024,1500.00,DIRECT DEPOSIT`;

      const result = parser.parse(csv, { dateFormat: 'MM/DD/YYYY' });
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
      expect(result.transactions[0]!.amount).toBe(-50.0);
    });

    it('should parse CSV with extra columns', () => {
      const csv = `date,category,amount,description,balance
2024-01-15,Shopping,100.00,Amazon Purchase,5000.00
2024-01-16,Food,25.00,Restaurant,4975.00`;

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.amount).toBe(100.0);
      expect(result.transactions[0]!.description).toBe('Amazon Purchase');
    });
  });

  describe('Line Ending Handling', () => {
    it('should handle Windows line endings (CRLF)', () => {
      const csv = 'date,amount,description\r\n2024-01-15,100.00,Test\r\n2024-01-16,200.00,Test2';

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle Mac line endings (CR)', () => {
      const csv = 'date,amount,description\r2024-01-15,100.00,Test\r2024-01-16,200.00,Test2';

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle Unix line endings (LF)', () => {
      const csv = 'date,amount,description\n2024-01-15,100.00,Test\n2024-01-16,200.00,Test2';

      const result = parser.parse(csv);
      expect(result.transactions).toHaveLength(2);
    });
  });

  describe('formatToCsv (Round-Trip Support)', () => {
    it('should format transactions to CSV', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test transaction' },
        { date: new Date(2024, 0, 16), amount: -50.0, description: 'Another transaction' },
      ];

      const csv = parser.formatToCsv(transactions);
      expect(csv).toContain('date,amount,description');
      expect(csv).toContain('2024-01-15,100.00,Test transaction');
      expect(csv).toContain('2024-01-16,-50.00,Another transaction');
    });

    it('should escape fields with delimiters', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test, with comma' },
      ];

      const csv = parser.formatToCsv(transactions);
      expect(csv).toContain('"Test, with comma"');
    });

    it('should escape fields with quotes', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test "quoted" text' },
      ];

      const csv = parser.formatToCsv(transactions);
      expect(csv).toContain('"Test ""quoted"" text"');
    });

    it('should support different date formats', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test' },
      ];

      const csvIso = parser.formatToCsv(transactions, { dateFormat: 'YYYY-MM-DD' });
      expect(csvIso).toContain('2024-01-15');

      const csvDmy = parser.formatToCsv(transactions, { dateFormat: 'DD/MM/YYYY' });
      expect(csvDmy).toContain('15/01/2024');

      const csvMdy = parser.formatToCsv(transactions, { dateFormat: 'MM/DD/YYYY' });
      expect(csvMdy).toContain('01/15/2024');
    });

    it('should support different delimiters', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test' },
      ];

      const csvSemicolon = parser.formatToCsv(transactions, { delimiter: ';' });
      expect(csvSemicolon).toContain('date;amount;description');

      const csvTab = parser.formatToCsv(transactions, { delimiter: '\t' });
      expect(csvTab).toContain('date\tamount\tdescription');
    });

    it('should optionally exclude header', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test' },
      ];

      const csv = parser.formatToCsv(transactions, { includeHeader: false });
      expect(csv).not.toContain('date,amount,description');
      expect(csv).toBe('2024-01-15,100.00,Test');
    });
  });

  describe('parseAmount method', () => {
    it('should parse simple decimal amounts', () => {
      expect(parser.parseAmount('100.00')).toBe(100.0);
      expect(parser.parseAmount('100,00', 'pt-BR')).toBe(100.0);
    });

    it('should parse amounts with thousand separators', () => {
      expect(parser.parseAmount('1,234.56', 'en')).toBe(1234.56);
      expect(parser.parseAmount('1.234,56', 'pt-BR')).toBe(1234.56);
    });

    it('should parse negative amounts', () => {
      expect(parser.parseAmount('-100.00')).toBe(-100.0);
      expect(parser.parseAmount('(100.00)')).toBe(-100.0);
    });

    it('should handle currency symbols', () => {
      expect(parser.parseAmount('R$ 100,00', 'pt-BR')).toBe(100.0);
      expect(parser.parseAmount('$100.00', 'en')).toBe(100.0);
    });

    it('should return NaN for invalid amounts', () => {
      expect(parser.parseAmount('')).toBeNaN();
      expect(parser.parseAmount('abc')).toBeNaN();
      expect(parser.parseAmount('   ')).toBeNaN();
    });
  });

  describe('detectDelimiter method', () => {
    it('should detect comma delimiter', () => {
      const lines = ['a,b,c', '1,2,3', '4,5,6'];
      expect(parser.detectDelimiter(lines)).toBe(',');
    });

    it('should detect semicolon delimiter', () => {
      const lines = ['a;b;c', '1;2;3', '4;5;6'];
      expect(parser.detectDelimiter(lines)).toBe(';');
    });

    it('should detect tab delimiter', () => {
      const lines = ['a\tb\tc', '1\t2\t3', '4\t5\t6'];
      expect(parser.detectDelimiter(lines)).toBe('\t');
    });

    it('should prefer more consistent delimiter', () => {
      // Comma is consistent (2 per line), semicolon varies
      const lines = ['a,b,c', '1,2;3', '4,5,6'];
      expect(parser.detectDelimiter(lines)).toBe(',');
    });
  });

  describe('splitLine method', () => {
    it('should split simple line', () => {
      expect(parser.splitLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields', () => {
      expect(parser.splitLine('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd']);
    });

    it('should handle escaped quotes', () => {
      expect(parser.splitLine('a,"b""c",d', ',')).toEqual(['a', 'b"c', 'd']);
    });

    it('should handle empty fields', () => {
      expect(parser.splitLine('a,,c', ',')).toEqual(['a', '', 'c']);
    });

    it('should handle different delimiters', () => {
      expect(parser.splitLine('a;b;c', ';')).toEqual(['a', 'b', 'c']);
      expect(parser.splitLine('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
    });
  });
});
