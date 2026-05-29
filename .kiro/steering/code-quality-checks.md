---
inclusion: auto
---

# Code Quality Checks

Every code change in this project MUST pass all four quality gates before being considered complete:

## 1. TypeScript (`npx tsc --noEmit`)
- Zero errors allowed
- All files must compile cleanly under strict mode
- Array access must use null checks or non-null assertions where safe
- All required interface fields must be provided

## 2. ESLint (`npx eslint . --ext .ts,.tsx`)
- Zero errors allowed
- Warnings should be minimized (prefer-const, no-unused-vars with `_` prefix pattern)
- Prettier integration via `plugin:prettier/recommended` must pass

## 3. Prettier (`npx prettier --check "**/*.{ts,tsx}"`)
- All files must be formatted according to `.prettierrc`:
  - `singleQuote: true`
  - `trailingComma: "es5"`
  - `printWidth: 100`
  - `tabWidth: 2`
  - `semi: true`

## 4. Tests (`npx jest --passWithNoTests`)
- All test suites must pass
- No regressions introduced by changes
- Property-based tests use `fast-check` with `{ numRuns: 100 }`

## Workflow

After modifying any source file:
1. Run `npx prettier --write <files>` to auto-format
2. Run `npx eslint <files> --fix` to auto-fix lint issues
3. Run `npx tsc --noEmit` to verify type safety
4. Run `npx jest --passWithNoTests` (or targeted test run) to verify no regressions

## Unused Variables Convention

- Prefix intentionally unused parameters with `_` (e.g., `_locale`, `_event`)
- This satisfies the ESLint rule: `@typescript-eslint/no-unused-vars: ['warn', { argsIgnorePattern: '^_' }]`
