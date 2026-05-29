/**
 * Preservation Property Test: Runtime Behavior Unchanged
 *
 * This test runs the full Jest test suite (excluding the typescriptCompilation
 * bug condition test and itself) and asserts all tests pass. This establishes
 * the baseline that runtime behavior is correct on UNFIXED code — TypeScript
 * errors are compile-time only and do not affect runtime behavior.
 *
 * The preservation test confirms:
 * - Property-based tests pass (random input coverage)
 * - Component tests pass (CategoryBreakdown rendering)
 * - Hook tests pass (usePaginatedTransactions, useReviewQueue)
 * - Import service tests pass (CSV/Excel/OFX processing)
 * - InstallmentCalculator tests pass (payment schedule calculations)
 *
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (runtime behavior is correct)
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { execSync } from 'child_process';
import path from 'path';

describe('Preservation: Runtime Behavior Unchanged', () => {
  it('all runtime tests pass (full suite excluding typescriptCompilation test)', () => {
    const projectRoot = path.resolve(__dirname, '../../..');
    const scriptPath = path.join(projectRoot, 'scripts', 'run-preservation-tests.js');

    let stdout = '';

    try {
      // Run the preservation test script as a separate node process
      // This avoids nested jest worker conflicts
      stdout = execSync(`node "${scriptPath}"`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 300000, // 5 minutes for full suite
      });
    } catch (error: unknown) {
      const execError = error as { status: number; stdout: string; stderr: string };
      stdout = execError.stdout ?? '';
    }

    // Parse the JSON output from the script
    let result: {
      exitCode: number;
      suites: string;
      tests: string;
      failedSuites?: string[];
    } = { exitCode: 1, suites: 'unknown', tests: 'unknown' };

    try {
      result = JSON.parse(stdout);
    } catch {
      // If JSON parsing fails, the script crashed
      console.log('\n=== PRESERVATION TEST SCRIPT OUTPUT ===');
      console.log(stdout);
      console.log('=== END OUTPUT ===\n');
    }

    console.log('\n=== PRESERVATION BASELINE RESULTS ===');
    console.log(`Test Suites: ${result.suites}`);
    console.log(`Tests: ${result.tests}`);

    if (result.failedSuites && result.failedSuites.length > 0) {
      console.log('\nFailed test suites:');
      for (const suite of result.failedSuites) {
        console.log(`  ${suite}`);
      }
    }
    console.log('=== END PRESERVATION BASELINE ===\n');

    // Assert all runtime tests pass — this confirms baseline behavior to preserve
    expect(result.exitCode).toBe(0);
  });
});
