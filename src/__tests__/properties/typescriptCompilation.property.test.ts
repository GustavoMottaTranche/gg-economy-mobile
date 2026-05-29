/**
 * Bug Condition Exploration Test: TypeScript Compilation Errors Exist
 *
 * This test runs `npx tsc --noEmit` and asserts zero compilation errors.
 * On UNFIXED code, this test MUST FAIL — failure confirms the 173 TypeScript
 * errors exist across 44 files.
 *
 * Error categories expected:
 * - TS2532/TS18048/TS2345: Unsafe array access in property test files
 * - TS6133: Unused variables in test files
 * - TS2741: Missing required fields in component tests (CategoryBreakdown)
 * - TS2739: Missing fields in hook return types (usePaginatedTransactions, useReviewQueue)
 * - TS2322: Type assignment mismatches in import services (ImportOrchestrator, ImportService)
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
 */

import { execSync } from 'child_process';
import path from 'path';

describe('Bug Condition: TypeScript Compilation Errors', () => {
  it('should have zero TypeScript compilation errors (tsc --noEmit exits with code 0)', () => {
    const projectRoot = path.resolve(__dirname, '../../..');

    let stdout = '';
    let exitCode = 0;

    try {
      stdout = execSync('npx tsc --noEmit 2>&1', {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 120000,
      });
      exitCode = 0;
    } catch (error: unknown) {
      const execError = error as { status: number; stdout: string; stderr: string };
      exitCode = execError.status ?? 1;
      stdout = execError.stdout ?? '';
    }

    // Parse error output for documentation
    if (exitCode !== 0) {
      const errorLines = stdout.split('\n').filter((line) => line.includes('error TS'));
      const errorCodes = new Map<string, number>();
      const affectedFiles = new Set<string>();

      for (const line of errorLines) {
        // Extract error code (e.g., TS2532)
        const codeMatch = line.match(/error (TS\d+)/);
        if (codeMatch) {
          const code = codeMatch[1]!;
          errorCodes.set(code, (errorCodes.get(code) ?? 0) + 1);
        }

        // Extract file path
        const fileMatch = line.match(/^(.+?)\(\d+,\d+\)/);
        if (fileMatch) {
          affectedFiles.add(fileMatch[1]!);
        }
      }

      // Log counterexamples for documentation
      console.log('\n=== BUG CONDITION COUNTEREXAMPLES ===');
      console.log(`Total errors: ${errorLines.length}`);
      console.log(`Affected files: ${affectedFiles.size}`);
      console.log('\nError codes breakdown:');
      for (const [code, count] of Array.from(errorCodes.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${code}: ${count} occurrences`);
      }
      console.log('\nAffected files:');
      for (const file of Array.from(affectedFiles).sort()) {
        console.log(`  ${file}`);
      }
      console.log('=== END COUNTEREXAMPLES ===\n');
    }

    // Assert zero errors — this WILL FAIL on unfixed code, confirming the bug
    expect(exitCode).toBe(0);
  });
});
