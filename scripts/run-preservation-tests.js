/**
 * Preservation Test Runner Script
 *
 * Runs the full Jest test suite excluding bug condition tests and the
 * preservation test itself. Outputs JSON with results.
 * Exit code 0 = all tests pass, 1 = some tests failed.
 */

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Use node to run jest CLI directly (avoids .cmd/.sh issues on Windows)
const jestPath = path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js');

let combined = '';
let exitCode = 0;

try {
  combined = execSync(
    `"${process.execPath}" "${jestPath}" --passWithNoTests --testPathIgnorePatterns=typescriptCompilation --testPathIgnorePatterns=runtimePreservation --forceExit --no-coverage --json`,
    {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
  exitCode = 0;
} catch (error) {
  exitCode = error.status !== null && error.status !== undefined ? error.status : 1;
  combined = (error.stdout || '') + (error.stderr || '');
}

// Parse JSON output from jest --json
let jestResult = null;
try {
  // Jest --json outputs JSON to stdout, but there might be other output before it
  const jsonStart = combined.indexOf('{');
  if (jsonStart >= 0) {
    const jsonStr = combined.substring(jsonStart);
    jestResult = JSON.parse(jsonStr);
  }
} catch {
  // JSON parsing failed, fall back to regex
}

let output;

if (jestResult) {
  const numSuites = jestResult.numTotalTestSuites || 0;
  const numPassedSuites = jestResult.numPassedTestSuites || 0;
  const numFailedSuites = jestResult.numFailedTestSuites || 0;
  const numTests = jestResult.numTotalTests || 0;
  const numPassedTests = jestResult.numPassedTests || 0;
  const numFailedTests = jestResult.numFailedTests || 0;

  const failedSuites = (jestResult.testResults || [])
    .filter((r) => r.status === 'failed')
    .map((r) => r.name)
    .slice(0, 10);

  output = {
    exitCode: jestResult.success ? 0 : 1,
    suites: `${numFailedSuites > 0 ? numFailedSuites + ' failed, ' : ''}${numPassedSuites} passed, ${numSuites} total`,
    tests: `${numFailedTests > 0 ? numFailedTests + ' failed, ' : ''}${numPassedTests} passed, ${numTests} total`,
    failedSuites: failedSuites,
  };
} else {
  // Fallback: strip ANSI codes and try regex
  const stripped = combined.replace(/\x1b\[[0-9;]*m/g, '');
  const suiteMatch = stripped.match(/Test Suites:\s+(.+)/);
  const testMatch = stripped.match(/Tests:\s+(.+)/);

  output = {
    exitCode: exitCode,
    suites: suiteMatch ? suiteMatch[1].trim() : 'unknown',
    tests: testMatch ? testMatch[1].trim() : 'unknown',
    failedSuites: [],
  };
}

process.stdout.write(JSON.stringify(output));
process.exit(output.exitCode);
