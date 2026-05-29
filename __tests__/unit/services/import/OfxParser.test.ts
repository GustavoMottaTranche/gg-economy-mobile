/**
 * Unit tests for OfxParser
 *
 * Tests OFX parsing functionality including:
 * - STMTTRN element extraction
 * - OFX field mapping (DTPOSTED, TRNAMT, NAME/MEMO, FITID)
 * - OFX date format parsing
 * - Error handling for malformed OFX files
 *
 * @module OfxParser.test
 */

import { OfxParser } from '../../../../src/services/import/OfxParser';
import { RawTransaction } from '../../../../src/types/transaction';

describe('OfxParser', () => {
  let parser: OfxParser;

  beforeEach(() => {
    parser = new OfxParser();
  });

  describe('STMTTRN Element Extraction', () => {
    it('should extract single STMTTRN element', () => {
      const ofx = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-100.00
<FITID>202401150001
<NAME>Test Transaction
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
      expect(result.totalTransactions).toBe(1);
      expect(result.successfulTransactions).toBe(1);
    });

    it('should extract multiple STMTTRN elements', () => {
      const ofx = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-100.00
<FITID>202401150001
<NAME>First Transaction
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>500.00
<FITID>202401160001
<NAME>Second Transaction
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240117
<TRNAMT>-25.50
<FITID>202401170001
<NAME>Third Transaction
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(3);
      expect(result.totalTransactions).toBe(3);
      expect(result.successfulTransactions).toBe(3);
    });

    it('should handle SGML-style unclosed tags', () => {
      // OFX is SGML-based, tags may not be properly closed
      const ofx = `
OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>12345
<NAME>SGML Style Transaction
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>100.00
<FITID>12346
<NAME>Another Transaction
</BANKTRANLIST>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle properly closed STMTTRN tags', () => {
      const ofx = `
<OFX>
<BANKMSGSRSV1>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240115</DTPOSTED>
<TRNAMT>-50.00</TRNAMT>
<FITID>12345</FITID>
<NAME>Closed Tags Transaction</NAME>
</STMTTRN>
</BANKTRANLIST>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.description).toBe('Closed Tags Transaction');
    });

    it('should return empty array when no STMTTRN elements found', () => {
      const ofx = `
OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<BANKTRANLIST>
</BANKTRANLIST>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.warnings).toContain('No STMTTRN elements found in OFX file');
    });
  });

  describe('OFX Field Mapping', () => {
    it('should map DTPOSTED to transaction date', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Test
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.date).toEqual(new Date(2024, 0, 15));
    });

    it('should map TRNAMT to transaction amount', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>-123.45
<FITID>12345
<NAME>Test
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.amount).toBe(-123.45);
    });

    it('should map NAME to transaction description', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Transaction Name
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.description).toBe('Transaction Name');
    });

    it('should map MEMO to transaction description when NAME is absent', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<MEMO>Transaction Memo
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.description).toBe('Transaction Memo');
    });

    it('should combine NAME and MEMO when both present and different', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Payee Name
<MEMO>Additional Details
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.description).toBe('Payee Name - Additional Details');
    });

    it('should use NAME only when NAME and MEMO are identical', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Same Text
<MEMO>Same Text
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.description).toBe('Same Text');
    });

    it('should map FITID to transaction fitId', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>UNIQUE123456
<NAME>Test
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions[0]!.fitId).toBe('UNIQUE123456');
    });

    it('should handle transaction without FITID', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<NAME>No FITID Transaction
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.fitId).toBeUndefined();
    });
  });

  describe('OFX Date Format Parsing', () => {
    it('should parse YYYYMMDD format', () => {
      const date = parser.parseOfxDate('20240115');
      expect(date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse YYYYMMDDHHMMSS format', () => {
      const date = parser.parseOfxDate('20240115120000');
      expect(date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse date with milliseconds', () => {
      const date = parser.parseOfxDate('20240115120000.123');
      expect(date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse date with timezone', () => {
      const date = parser.parseOfxDate('20240115120000[-3:BRT]');
      expect(date).toEqual(new Date(2024, 0, 15));
    });

    it('should parse date with milliseconds and timezone', () => {
      const date = parser.parseOfxDate('20240115120000.123[-3:BRT]');
      expect(date).toEqual(new Date(2024, 0, 15));
    });

    it('should return null for invalid date string', () => {
      expect(parser.parseOfxDate('')).toBeNull();
      expect(parser.parseOfxDate('invalid')).toBeNull();
      expect(parser.parseOfxDate('2024')).toBeNull();
      expect(parser.parseOfxDate('202401')).toBeNull();
    });

    it('should return null for invalid date values', () => {
      expect(parser.parseOfxDate('20241301')).toBeNull(); // Invalid month
      expect(parser.parseOfxDate('20240132')).toBeNull(); // Invalid day
      expect(parser.parseOfxDate('20240230')).toBeNull(); // Feb 30 doesn't exist
    });

    it('should handle leap year dates', () => {
      const leapDate = parser.parseOfxDate('20240229');
      expect(leapDate).toEqual(new Date(2024, 1, 29));

      const nonLeapDate = parser.parseOfxDate('20230229');
      expect(nonLeapDate).toBeNull(); // 2023 is not a leap year
    });

    it('should handle dates at year boundaries', () => {
      const newYear = parser.parseOfxDate('20240101');
      expect(newYear).toEqual(new Date(2024, 0, 1));

      const endYear = parser.parseOfxDate('20231231');
      expect(endYear).toEqual(new Date(2023, 11, 31));
    });
  });

  describe('OFX Amount Parsing', () => {
    it('should parse positive amounts', () => {
      expect(parser.parseOfxAmount('100.00')).toBe(100.0);
      expect(parser.parseOfxAmount('1234.56')).toBe(1234.56);
      expect(parser.parseOfxAmount('+500.00')).toBe(500.0);
    });

    it('should parse negative amounts', () => {
      expect(parser.parseOfxAmount('-100.00')).toBe(-100.0);
      expect(parser.parseOfxAmount('-1234.56')).toBe(-1234.56);
    });

    it('should parse integer amounts', () => {
      expect(parser.parseOfxAmount('100')).toBe(100);
      expect(parser.parseOfxAmount('-50')).toBe(-50);
    });

    it('should handle whitespace', () => {
      expect(parser.parseOfxAmount('  100.00  ')).toBe(100.0);
      expect(parser.parseOfxAmount('\t-50.00\n')).toBe(-50.0);
    });

    it('should return NaN for invalid amounts', () => {
      expect(parser.parseOfxAmount('')).toBeNaN();
      expect(parser.parseOfxAmount('abc')).toBeNaN();
      expect(parser.parseOfxAmount('   ')).toBeNaN();
    });
  });

  describe('Error Handling for Malformed OFX Files', () => {
    it('should return error for empty content', () => {
      const result = parser.parse('');
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Empty or invalid OFX content');
    });

    it('should return error for non-OFX content', () => {
      const result = parser.parse('This is not an OFX file');
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('not appear to be a valid OFX file');
    });

    it('should return error for missing DTPOSTED', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNAMT>100.00
<FITID>12345
<NAME>Missing Date
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('DTPOSTED');
    });

    it('should return error for missing TRNAMT', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<FITID>12345
<NAME>Missing Amount
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('TRNAMT');
    });

    it('should return error for missing description (no NAME or MEMO)', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('description');
    });

    it('should return error for invalid date format', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>invalid-date
<TRNAMT>100.00
<FITID>12345
<NAME>Invalid Date
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Invalid date');
    });

    it('should return error for invalid amount', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>not-a-number
<FITID>12345
<NAME>Invalid Amount
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('Invalid amount');
    });

    it('should continue parsing after encountering errors', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>invalid
<TRNAMT>100.00
<FITID>12345
<NAME>Invalid Transaction
</STMTTRN>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>200.00
<FITID>12346
<NAME>Valid Transaction
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.transactions[0]!.description).toBe('Valid Transaction');
    });

    it('should include transaction index in error', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Valid
</STMTTRN>
<STMTTRN>
<DTPOSTED>invalid
<TRNAMT>200.00
<FITID>12346
<NAME>Invalid
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.errors[0]!.transactionIndex).toBe(1);
    });

    it('should handle BOM character at start of file', () => {
      const ofx = `\uFEFFOFXHEADER:100
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>BOM Test
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('Account Information Extraction', () => {
    it('should extract bank account information', () => {
      const ofx = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Test
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.accountInfo).toBeDefined();
      expect(result.accountInfo?.bankId).toBe('123456789');
      expect(result.accountInfo?.accountId).toBe('987654321');
      expect(result.accountInfo?.accountType).toBe('CHECKING');
    });

    it('should handle missing account information', () => {
      const ofx = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<FITID>12345
<NAME>Test
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.accountInfo).toBeUndefined();
    });
  });

  describe('Credit Card Statement Support', () => {
    it('should parse credit card OFX format', () => {
      const ofx = `
OFXHEADER:100
<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>CC12345
<NAME>Credit Card Purchase
</STMTTRN>
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.amount).toBe(-50.0);
    });
  });

  describe('Real-World OFX Samples', () => {
    it('should parse typical Brazilian bank OFX', () => {
      const ofx = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240115120000[-3:BRT]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240115
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240110
<TRNAMT>-150.00
<FITID>20240110001
<NAME>PIX ENVIADO
<MEMO>JOAO DA SILVA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>3500.00
<FITID>20240115001
<NAME>SALARIO
<MEMO>EMPRESA XYZ LTDA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>5000.00
<DTASOF>20240115
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      const result = parser.parse(ofx);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.amount).toBe(-150.0);
      expect(result.transactions[0]!.description).toBe('PIX ENVIADO - JOAO DA SILVA');
      expect(result.transactions[1]!.amount).toBe(3500.0);
      expect(result.transactions[1]!.description).toBe('SALARIO - EMPRESA XYZ LTDA');
      expect(result.accountInfo?.bankId).toBe('001');
      expect(result.accountInfo?.accountId).toBe('12345-6');
    });
  });

  describe('serializeToOfx (Round-Trip Support)', () => {
    it('should serialize transactions to OFX format', () => {
      const transactions: RawTransaction[] = [
        {
          date: new Date(2024, 0, 15),
          amount: -100.0,
          description: 'Test Transaction',
          fitId: '12345',
        },
        {
          date: new Date(2024, 0, 16),
          amount: 500.0,
          description: 'Another Transaction',
          fitId: '12346',
        },
      ];

      const ofx = parser.serializeToOfx(transactions);

      expect(ofx).toContain('OFXHEADER:100');
      expect(ofx).toContain('<OFX>');
      expect(ofx).toContain('<STMTTRN>');
      expect(ofx).toContain('<DTPOSTED>20240115');
      expect(ofx).toContain('<TRNAMT>-100.00');
      expect(ofx).toContain('<FITID>12345');
      expect(ofx).toContain('<NAME>Test Transaction');
    });

    it('should generate FITID when not provided', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'No FITID' },
      ];

      const ofx = parser.serializeToOfx(transactions);
      expect(ofx).toContain('<FITID>');
    });

    it('should set TRNTYPE based on amount sign', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Credit' },
        { date: new Date(2024, 0, 16), amount: -50.0, description: 'Debit' },
      ];

      const ofx = parser.serializeToOfx(transactions);
      expect(ofx).toContain('<TRNTYPE>CREDIT');
      expect(ofx).toContain('<TRNTYPE>DEBIT');
    });

    it('should escape special characters in description', () => {
      const transactions: RawTransaction[] = [
        { date: new Date(2024, 0, 15), amount: 100.0, description: 'Test & <special> "chars"' },
      ];

      const ofx = parser.serializeToOfx(transactions);
      expect(ofx).toContain('&amp;');
      expect(ofx).toContain('&lt;');
      expect(ofx).toContain('&gt;');
    });
  });

  describe('formatOfxDate', () => {
    it('should format date to YYYYMMDD', () => {
      expect(parser.formatOfxDate(new Date(2024, 0, 15))).toBe('20240115');
      expect(parser.formatOfxDate(new Date(2024, 11, 31))).toBe('20241231');
      expect(parser.formatOfxDate(new Date(2024, 0, 1))).toBe('20240101');
    });

    it('should pad single digit months and days', () => {
      expect(parser.formatOfxDate(new Date(2024, 0, 5))).toBe('20240105');
      expect(parser.formatOfxDate(new Date(2024, 8, 9))).toBe('20240909');
    });
  });

  describe('extractStmtTrnElements', () => {
    it('should extract elements with closing tags', () => {
      const content = `
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
</STMTTRN>
<STMTTRN>
<DTPOSTED>20240116
<TRNAMT>200.00
</STMTTRN>`;

      const elements = parser.extractStmtTrnElements(content);
      expect(elements).toHaveLength(2);
    });

    it('should extract elements without closing tags (SGML style)', () => {
      const content = `
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
<STMTTRN>
<DTPOSTED>20240116
<TRNAMT>200.00
</BANKTRANLIST>`;

      const elements = parser.extractStmtTrnElements(content);
      expect(elements).toHaveLength(2);
    });

    it('should handle mixed closed and unclosed tags', () => {
      const content = `
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>100.00
</STMTTRN>
<STMTTRN>
<DTPOSTED>20240116
<TRNAMT>200.00
<STMTTRN>
<DTPOSTED>20240117
<TRNAMT>300.00
</STMTTRN>`;

      const elements = parser.extractStmtTrnElements(content);
      expect(elements).toHaveLength(3);
    });
  });
});
