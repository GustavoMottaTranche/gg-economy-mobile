/**
 * Import Services Module
 *
 * Exports all import-related services for file parsing and transaction import.
 */

// Main Import Service
export {
  ImportService,
  importService,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  type ImportError,
  type FileSelectionResult,
  type ImportResult,
  type ImportOptions,
  type SupportedExtension,
} from './ImportService';

// CSV Parser
export {
  CsvParser,
  csvParser,
  type CsvDelimiter,
  type CsvParseError,
  type CsvParseResult,
  type ColumnMapping,
  type CsvParseOptions,
} from './CsvParser';

// OFX Parser
export {
  OfxParser,
  ofxParser,
  type OfxParseError,
  type OfxParseResult,
  type OfxAccountInfo,
} from './OfxParser';

// Dedupe Engine
export {
  DedupeEngine,
  dedupeEngine,
  type DuplicateResult,
  type DedupeResult,
  type DedupeOptions,
  type FileTransactions,
  type CrossFileDedupeResult,
  type CrossFileDuplicateResult,
  type DatabaseVerificationResult,
} from './DedupeEngine';

// Excel Parser
export { ExcelParser, excelParser } from './ExcelParser';

// Excel Parser Types
export {
  type ExcelParseOptions,
  type ExcelParseResult,
  type ExcelParseError,
  type SheetInfo,
  type ExcelColumnMapping,
} from './types';

// Multi-File Importer Types
export {
  type MultiFileImportOptions,
  type ImportProgress,
  type MultiFileImportResult,
  type FileImportResult,
  type SelectedFile,
} from './types';

// Multi-File Importer
export { MultiFileImporter, multiFileImporter } from './MultiFileImporter';

// Import Orchestrator
export {
  ImportOrchestrator,
  type ImportStage,
  type ImportProgress as OrchestratorProgress,
  type ProgressCallback,
  type ImportError as OrchestratorError,
  type ImportResult as OrchestratorResult,
  type ImportOptions as OrchestratorOptions,
} from './ImportOrchestrator';
