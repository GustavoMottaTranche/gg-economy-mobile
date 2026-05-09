/**
 * OFX Parser for importing bank statement files
 *
 * Features:
 * - Parses SGML-style OFX (not XML) - tags may not be properly closed
 * - Extracts STMTTRN elements as individual transactions
 * - Maps DTPOSTED to transaction date
 * - Maps TRNAMT to transaction amount
 * - Maps NAME or MEMO to transaction description
 * - Maps FITID to unique transaction identifier for deduplication
 * - Error handling for malformed OFX files
 *
 * OFX Format Reference:
 * OFX (Open Financial Exchange) is an SGML-based format. Key elements:
 * - `<STMTTRN>` - Transaction element container
 * - `<DTPOSTED>` - Date in YYYYMMDD or YYYYMMDDHHMMSS format
 * - `<TRNAMT>` - Amount (positive for credit, negative for debit)
 * - `<NAME>` or `<MEMO>` - Transaction description
 * - `<FITID>` - Unique transaction ID from the bank
 *
 * @module OfxParser
 */

import { RawTransaction } from '../../types/transaction';

/**
 * Parse error with context information
 */
export interface OfxParseError {
  /** Error message */
  message: string;
  /** Transaction index where error occurred (if applicable) */
  transactionIndex?: number;
  /** Element name that caused the error */
  element?: string;
  /** Raw content that caused the error */
  rawContent?: string;
}

/**
 * Result of OFX parsing operation
 */
export interface OfxParseResult {
  /** Successfully parsed transactions */
  transactions: RawTransaction[];
  /** Errors encountered during parsing */
  errors: OfxParseError[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Total STMTTRN elements found */
  totalTransactions: number;
  /** Successfully parsed transactions count */
  successfulTransactions: number;
  /** Account information if found */
  accountInfo?: OfxAccountInfo;
}

/**
 * Account information extracted from OFX
 */
export interface OfxAccountInfo {
  /** Bank ID */
  bankId?: string;
  /** Account ID */
  accountId?: string;
  /** Account type */
  accountType?: string;
}

/**
 * Raw STMTTRN element data before conversion
 */
interface RawStmtTrn {
  /** Transaction type (DEBIT, CREDIT, etc.) */
  trnType?: string;
  /** Date posted in OFX format */
  dtPosted?: string;
  /** Transaction amount */
  trnAmt?: string;
  /** Financial institution transaction ID */
  fitId?: string;
  /** Transaction name/payee */
  name?: string;
  /** Transaction memo */
  memo?: string;
  /** Check number */
  checkNum?: string;
  /** Reference number */
  refNum?: string;
}

/**
 * OFX Parser class for importing bank statements
 */
export class OfxParser {
  /**
   * Parses OFX content and extracts transactions
   *
   * @param content - Raw OFX content as string
   * @returns Parse result with transactions and errors
   */
  parse(content: string): OfxParseResult {
    const errors: OfxParseError[] = [];
    const warnings: string[] = [];
    const transactions: RawTransaction[] = [];

    if (!content || typeof content !== 'string') {
      return {
        transactions: [],
        errors: [{ message: 'Empty or invalid OFX content' }],
        warnings: [],
        totalTransactions: 0,
        successfulTransactions: 0,
      };
    }

    // Normalize line endings and remove BOM if present
    let normalizedContent = content
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Check if this looks like an OFX file
    if (!this.isValidOfxContent(normalizedContent)) {
      return {
        transactions: [],
        errors: [{ message: 'Content does not appear to be a valid OFX file' }],
        warnings: [],
        totalTransactions: 0,
        successfulTransactions: 0,
      };
    }

    // Extract account information
    const accountInfo = this.extractAccountInfo(normalizedContent);

    // Extract all STMTTRN elements
    const stmtTrnElements = this.extractStmtTrnElements(normalizedContent);

    if (stmtTrnElements.length === 0) {
      warnings.push('No STMTTRN elements found in OFX file');
      return {
        transactions: [],
        errors: [],
        warnings,
        totalTransactions: 0,
        successfulTransactions: 0,
        accountInfo,
      };
    }

    // Parse each STMTTRN element
    for (let i = 0; i < stmtTrnElements.length; i++) {
      try {
        const rawTrn = this.parseStmtTrnElement(stmtTrnElements[i]);
        const transaction = this.convertToRawTransaction(rawTrn, i);

        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        errors.push({
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          transactionIndex: i,
          rawContent: stmtTrnElements[i].substring(0, 200),
        });
      }
    }

    return {
      transactions,
      errors,
      warnings,
      totalTransactions: stmtTrnElements.length,
      successfulTransactions: transactions.length,
      accountInfo,
    };
  }

  /**
   * Checks if content appears to be valid OFX
   */
  private isValidOfxContent(content: string): boolean {
    // Check for OFX header or common OFX elements
    const hasOfxHeader = /OFXHEADER:/i.test(content) || /<OFX>/i.test(content);
    const hasStmtTrn = /<STMTTRN>/i.test(content);
    const hasBankMsgRs = /<BANKMSGSRSV1>/i.test(content) || /<CREDITCARDMSGSRSV1>/i.test(content);

    return hasOfxHeader || hasStmtTrn || hasBankMsgRs;
  }

  /**
   * Extracts account information from OFX content
   */
  private extractAccountInfo(content: string): OfxAccountInfo | undefined {
    const info: OfxAccountInfo = {};

    // Extract BANKID
    const bankIdMatch = content.match(/<BANKID>([^<\n]+)/i);
    if (bankIdMatch) {
      info.bankId = bankIdMatch[1].trim();
    }

    // Extract ACCTID
    const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/i);
    if (acctIdMatch) {
      info.accountId = acctIdMatch[1].trim();
    }

    // Extract ACCTTYPE
    const acctTypeMatch = content.match(/<ACCTTYPE>([^<\n]+)/i);
    if (acctTypeMatch) {
      info.accountType = acctTypeMatch[1].trim();
    }

    return Object.keys(info).length > 0 ? info : undefined;
  }

  /**
   * Extracts all STMTTRN elements from OFX content
   *
   * Handles both properly closed tags and SGML-style unclosed tags
   */
  extractStmtTrnElements(content: string): string[] {
    const elements: string[] = [];

    // Pattern to match STMTTRN elements
    // Handles both <STMTTRN>...</STMTTRN> and unclosed SGML style
    const stmtTrnRegex =
      /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|$))/gi;

    let match;
    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const element = match[1].trim();
      if (element) {
        elements.push(element);
      }
    }

    return elements;
  }

  /**
   * Parses a single STMTTRN element into raw data
   */
  private parseStmtTrnElement(element: string): RawStmtTrn {
    const raw: RawStmtTrn = {};

    // Extract TRNTYPE
    const trnTypeMatch = element.match(/<TRNTYPE>([^<\n]+)/i);
    if (trnTypeMatch) {
      raw.trnType = trnTypeMatch[1].trim();
    }

    // Extract DTPOSTED
    const dtPostedMatch = element.match(/<DTPOSTED>([^<\n]+)/i);
    if (dtPostedMatch) {
      raw.dtPosted = dtPostedMatch[1].trim();
    }

    // Extract TRNAMT
    const trnAmtMatch = element.match(/<TRNAMT>([^<\n]+)/i);
    if (trnAmtMatch) {
      raw.trnAmt = trnAmtMatch[1].trim();
    }

    // Extract FITID
    const fitIdMatch = element.match(/<FITID>([^<\n]+)/i);
    if (fitIdMatch) {
      raw.fitId = fitIdMatch[1].trim();
    }

    // Extract NAME
    const nameMatch = element.match(/<NAME>([^<\n]+)/i);
    if (nameMatch) {
      raw.name = this.unescapeOfxValue(nameMatch[1].trim());
    }

    // Extract MEMO
    const memoMatch = element.match(/<MEMO>([^<\n]+)/i);
    if (memoMatch) {
      raw.memo = this.unescapeOfxValue(memoMatch[1].trim());
    }

    // Extract CHECKNUM
    const checkNumMatch = element.match(/<CHECKNUM>([^<\n]+)/i);
    if (checkNumMatch) {
      raw.checkNum = checkNumMatch[1].trim();
    }

    // Extract REFNUM
    const refNumMatch = element.match(/<REFNUM>([^<\n]+)/i);
    if (refNumMatch) {
      raw.refNum = refNumMatch[1].trim();
    }

    return raw;
  }

  /**
   * Converts raw STMTTRN data to a RawTransaction
   */
  private convertToRawTransaction(raw: RawStmtTrn, index: number): RawTransaction | null {
    // Validate required fields
    if (!raw.dtPosted) {
      throw new Error('Missing required field: DTPOSTED');
    }

    if (!raw.trnAmt) {
      throw new Error('Missing required field: TRNAMT');
    }

    // Parse date
    const date = this.parseOfxDate(raw.dtPosted);
    if (!date) {
      throw new Error(`Invalid date format: ${raw.dtPosted}`);
    }

    // Parse amount
    const amount = this.parseOfxAmount(raw.trnAmt);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${raw.trnAmt}`);
    }

    // Get description from NAME or MEMO
    const description = this.getDescription(raw);
    if (!description) {
      throw new Error('Missing description: neither NAME nor MEMO found');
    }

    return {
      date,
      amount,
      description,
      fitId: raw.fitId,
      sourceLineNumber: index + 1,
    };
  }

  /**
   * Gets the description from NAME or MEMO fields
   * Prefers NAME, falls back to MEMO, or combines both if available
   */
  private getDescription(raw: RawStmtTrn): string {
    if (raw.name && raw.memo) {
      // If both exist and are different, combine them
      if (raw.name !== raw.memo) {
        return `${raw.name} - ${raw.memo}`;
      }
      return raw.name;
    }

    return raw.name || raw.memo || '';
  }

  /**
   * Parses OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
   *
   * OFX dates can be in the following formats:
   * - YYYYMMDD (basic date)
   * - YYYYMMDDHHMMSS (date with time)
   * - YYYYMMDDHHMMSS.XXX (date with time and milliseconds)
   * - YYYYMMDDHHMMSS.XXX[TZ] (date with time, milliseconds, and timezone)
   *
   * @param dateStr - OFX date string
   * @returns Parsed Date object or null if invalid
   */
  parseOfxDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }

    // Remove any timezone info and milliseconds for parsing
    // Format: YYYYMMDDHHMMSS.XXX[TZ:OFFSET]
    const cleanDate = dateStr
      .replace(/\[.*\]$/, '')
      .replace(/\.\d+$/, '')
      .trim();

    // Validate minimum length (YYYYMMDD = 8 characters)
    if (cleanDate.length < 8) {
      return null;
    }

    // Extract date components
    const year = parseInt(cleanDate.substring(0, 4), 10);
    const month = parseInt(cleanDate.substring(4, 6), 10);
    const day = parseInt(cleanDate.substring(6, 8), 10);

    // Validate components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    // Validate ranges
    if (year < 1900 || year > 2100) {
      return null;
    }

    if (month < 1 || month > 12) {
      return null;
    }

    if (day < 1 || day > 31) {
      return null;
    }

    // Create date (month is 0-indexed in JavaScript)
    const date = new Date(year, month - 1, day);

    // Validate the date is real (e.g., not Feb 30)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  /**
   * Parses OFX amount string
   *
   * OFX amounts are typically in decimal format with period as decimal separator
   * Positive values are credits, negative values are debits
   *
   * @param amountStr - OFX amount string
   * @returns Parsed number or NaN if invalid
   */
  parseOfxAmount(amountStr: string): number {
    if (!amountStr || typeof amountStr !== 'string') {
      return NaN;
    }

    // Clean the amount string
    let cleaned = amountStr.trim();

    // Remove any currency symbols or whitespace
    cleaned = cleaned.replace(/[^\d.+-]/g, '');

    // Handle multiple signs (shouldn't happen but be safe)
    const isNegative =
      cleaned.startsWith('-') || (cleaned.startsWith('+') && cleaned.includes('-'));
    cleaned = cleaned.replace(/^[+-]+/, '');

    // Parse the number
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return NaN;
    }

    // Apply sign
    return isNegative ? -Math.abs(parsed) : parsed;
  }

  /**
   * Formats a date to OFX format (YYYYMMDD)
   *
   * @param date - Date to format
   * @returns OFX formatted date string
   */
  formatOfxDate(date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * Serializes transactions back to OFX format (for round-trip testing)
   *
   * @param transactions - Transactions to serialize
   * @returns OFX formatted string
   */
  serializeToOfx(transactions: RawTransaction[]): string {
    const lines: string[] = [];

    // OFX Header
    lines.push('OFXHEADER:100');
    lines.push('DATA:OFXSGML');
    lines.push('VERSION:102');
    lines.push('SECURITY:NONE');
    lines.push('ENCODING:USASCII');
    lines.push('CHARSET:1252');
    lines.push('COMPRESSION:NONE');
    lines.push('OLDFILEUID:NONE');
    lines.push('NEWFILEUID:NONE');
    lines.push('');
    lines.push('<OFX>');
    lines.push('<BANKMSGSRSV1>');
    lines.push('<STMTTRNRS>');
    lines.push('<STMTRS>');
    lines.push('<BANKTRANLIST>');

    // Add transactions
    for (const transaction of transactions) {
      lines.push('<STMTTRN>');
      lines.push(`<TRNTYPE>${transaction.amount >= 0 ? 'CREDIT' : 'DEBIT'}`);
      lines.push(`<DTPOSTED>${this.formatOfxDate(transaction.date)}`);
      lines.push(`<TRNAMT>${transaction.amount.toFixed(2)}`);
      lines.push(`<FITID>${transaction.fitId || this.generateFitId(transaction)}`);
      lines.push(`<NAME>${this.escapeOfxValue(transaction.description)}`);
      lines.push('</STMTTRN>');
    }

    lines.push('</BANKTRANLIST>');
    lines.push('</STMTRS>');
    lines.push('</STMTTRNRS>');
    lines.push('</BANKMSGSRSV1>');
    lines.push('</OFX>');

    return lines.join('\n');
  }

  /**
   * Generates a FITID for a transaction (for serialization)
   */
  private generateFitId(transaction: RawTransaction): string {
    const dateStr = this.formatOfxDate(transaction.date);
    const amountStr = Math.abs(transaction.amount).toFixed(2).replace('.', '');
    return `${dateStr}${amountStr}`;
  }

  /**
   * Escapes special characters for OFX output
   */
  private escapeOfxValue(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Unescapes SGML/XML entities in OFX values
   */
  private unescapeOfxValue(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

/**
 * Default OfxParser instance
 */
export const ofxParser = new OfxParser();
