/**
 * Types for Excel Parser and Multi-File Import
 *
 * This module defines types for:
 * - Excel file parsing (ExcelParseOptions, ExcelParseResult, ExcelParseError)
 * - Sheet information (SheetInfo)
 * - Column mapping for Excel files (ColumnMapping)
 *
 * @module import/types
 */

import { RawTransaction } from '../../types/transaction';

/**
 * Options for parsing Excel files
 */
export interface ExcelParseOptions {
  /** Índice da planilha a ser parseada (0-indexed, default: 0) */
  sheetIndex?: number;
  /** Nome da planilha a ser parseada (tem precedência sobre sheetIndex) */
  sheetName?: string;
  /** Locale para parsing de datas e valores */
  locale?: 'pt-BR' | 'en';
  /** Mapeamento forçado de colunas */
  columnMapping?: Partial<ExcelColumnMapping>;
}

/**
 * Result of Excel parsing operation
 */
export interface ExcelParseResult {
  /** Transações parseadas com sucesso */
  transactions: RawTransaction[];
  /** Erros encontrados durante o parsing */
  errors: ExcelParseError[];
  /** Avisos (problemas não-fatais) */
  warnings: string[];
  /** Informações sobre as planilhas disponíveis */
  sheets: SheetInfo[];
  /** Planilha utilizada */
  usedSheet: string;
  /** Mapeamento de colunas detectado */
  columnMapping: ExcelColumnMapping;
  /** Total de linhas processadas */
  totalRows: number;
  /** Linhas parseadas com sucesso */
  successfulRows: number;
}

/**
 * Error information for a specific row during Excel parsing
 */
export interface ExcelParseError {
  /** Número da linha onde ocorreu o erro (1-indexed) */
  rowNumber: number;
  /** Mensagem de erro */
  message: string;
  /** Conteúdo da célula que causou o erro */
  cellContent?: string;
}

/**
 * Information about a worksheet in an Excel file
 */
export interface SheetInfo {
  /** Nome da planilha */
  name: string;
  /** Índice da planilha */
  index: number;
  /** Número de linhas com dados */
  rowCount: number;
  /** Preview das primeiras linhas (para seleção) */
  preview: string[][];
}

/**
 * Column mapping for Excel transaction fields
 *
 * Maps column indices to transaction fields (date, amount, description)
 */
export interface ExcelColumnMapping {
  /** Index of the date column (0-indexed) */
  dateColumn: number;
  /** Index of the amount column (0-indexed) */
  amountColumn: number;
  /** Index of the description column (0-indexed) */
  descriptionColumn: number;
}

// ============================================================================
// Multi-File Importer Types
// ============================================================================

import type { FileType, ImportBatch } from '../../types/importBatch';
import type { ImportError, ImportOptions } from './ImportService';

/**
 * Options for multi-file import operation
 */
export interface MultiFileImportOptions {
  /** Callback de progresso */
  onProgress?: (progress: ImportProgress) => void;
  /** Callback de erro por arquivo */
  onFileError?: (fileName: string, error: ImportError) => void;
  /** Opções de importação */
  importOptions?: ImportOptions;
  /** Token de cancelamento */
  abortSignal?: AbortSignal;
}

/**
 * Progress information during multi-file import
 */
export interface ImportProgress {
  /** Arquivo atual sendo processado */
  currentFile: string;
  /** Índice do arquivo atual (0-indexed) */
  currentIndex: number;
  /** Total de arquivos */
  totalFiles: number;
  /** Status do arquivo atual */
  status: 'parsing' | 'deduping' | 'saving' | 'completed' | 'failed';
  /** Porcentagem geral (0-100) */
  overallProgress: number;
}

/**
 * Result of multi-file import operation
 */
export interface MultiFileImportResult {
  /** Se a importação geral foi bem-sucedida */
  success: boolean;
  /** Resultados por arquivo */
  fileResults: FileImportResult[];
  /** Total de transações importadas */
  totalTransactionsImported: number;
  /** Total de duplicatas encontradas (intra-arquivo) */
  totalDuplicatesInFile: number;
  /** Total de duplicatas cross-file */
  totalCrossFileDuplicates: number;
  /** Total de duplicatas com banco de dados */
  totalDatabaseDuplicates: number;
  /** Arquivos que falharam */
  failedFiles: string[];
  /** Batch group ID para agrupar os batches */
  batchGroupId: string;
}

/**
 * Result of importing a single file within a multi-file import
 */
export interface FileImportResult {
  /** Nome do arquivo */
  fileName: string;
  /** Se a importação foi bem-sucedida */
  success: boolean;
  /** Batch criado (se sucesso) */
  batch?: ImportBatch;
  /** Transações importadas */
  transactionsImported: number;
  /** Duplicatas encontradas */
  duplicatesFound: number;
  /** Erro (se falhou) */
  error?: ImportError;
}

/**
 * Represents a file selected for import
 */
export interface SelectedFile {
  /** File URI */
  uri: string;
  /** File name */
  fileName: string;
  /** Detected file type */
  fileType: FileType;
  /** File size in bytes */
  size: number;
}
