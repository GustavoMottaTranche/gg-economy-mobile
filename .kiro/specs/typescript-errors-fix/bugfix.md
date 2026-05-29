# Bugfix Requirements Document

## Introduction

The project has 173 TypeScript compilation errors across 44 files as reported by `npx tsc --noEmit`. These errors prevent clean builds and indicate type safety issues throughout the codebase. The errors fall into several categories: unsafe array access without null checks, unused variables, missing required fields in test data and DTOs, and type assignment mismatches. Fixing these errors will restore type safety and enable strict TypeScript checking to catch future regressions.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN accessing array elements by index (e.g., `array[0]`) in property test files THEN the system reports TS2532 "Object is possibly 'undefined'" because strict mode requires null checks on indexed access

1.2 WHEN destructuring array values from operations like `string.split()` in property test files THEN the system reports TS18048 "'variable' is possibly 'undefined'" because split results are typed as `(string | undefined)[]`

1.3 WHEN passing `string.split()` results directly to `parseInt()` or other functions expecting `string` THEN the system reports TS2345 "Argument of type 'string | undefined' is not assignable to parameter of type 'string'"

1.4 WHEN variables are declared but never used in test files THEN the system reports TS6133 "'variable' is declared but its value is never read"

1.5 WHEN constructing test data for CategoryBreakdown component without the `expenseGroup` field THEN the system reports TS2741 "Property 'expenseGroup' is missing in type" because the interface now requires this field

1.6 WHEN hooks `usePaginatedTransactions` and `useReviewQueue` return transaction objects without `title`, `installmentGroupId`, and `recurringId` fields THEN the system reports TS2739 "Type is missing the following properties: title, installmentGroupId, recurringId"

1.7 WHEN import services (ImportOrchestrator, ImportService) create transaction DTOs without the `title` field THEN the system reports TS2322 "Type is not assignable" because `CreateTransactionDTO` now requires a `title` property

1.8 WHEN InstallmentCalculator accesses array elements without null checks THEN the system reports TS2532 "Object is possibly 'undefined'" for array index access in calculation logic

### Expected Behavior (Correct)

2.1 WHEN accessing array elements by index in property test files THEN the system SHALL compile without errors by using proper null checks, non-null assertions where safe, or type narrowing before accessing the value

2.2 WHEN destructuring array values from `string.split()` operations THEN the system SHALL compile without errors by adding appropriate type guards or default values to handle the `undefined` case

2.3 WHEN passing split results to `parseInt()` or other string-expecting functions THEN the system SHALL compile without errors by providing a fallback value (e.g., `value ?? '0'`) or adding a type guard before the call

2.4 WHEN variables are declared in test files THEN the system SHALL either use the variables or remove/prefix them with underscore to indicate intentional non-use

2.5 WHEN constructing test data for CategoryBreakdown component THEN the system SHALL include the required `expenseGroup` field with an appropriate test value

2.6 WHEN hooks return transaction objects THEN the system SHALL include all required fields (`title`, `installmentGroupId`, `recurringId`) with appropriate default values (empty string or null as per the type definition)

2.7 WHEN import services create transaction DTOs THEN the system SHALL include the `title` field derived from the transaction description or an appropriate default value

2.8 WHEN InstallmentCalculator accesses array elements THEN the system SHALL use proper null checks or type narrowing before accessing array values to satisfy strict type checking

### Unchanged Behavior (Regression Prevention)

3.1 WHEN property-based tests run with valid generated inputs THEN the system SHALL CONTINUE TO execute test assertions correctly and pass all existing test cases

3.2 WHEN the CategoryBreakdown component receives complete valid data THEN the system SHALL CONTINUE TO render category breakdowns correctly

3.3 WHEN hooks fetch and return transaction data from the database THEN the system SHALL CONTINUE TO return correctly shaped transaction objects that satisfy all consumers

3.4 WHEN import services process CSV/bank statement files THEN the system SHALL CONTINUE TO create valid transactions in the database with all required fields

3.5 WHEN InstallmentCalculator computes installment schedules THEN the system SHALL CONTINUE TO produce correct payment amounts and dates

3.6 WHEN `npx tsc --noEmit` is run after the fix THEN the system SHALL report zero TypeScript errors

3.7 WHEN ESLint is run after the fix THEN the system SHALL CONTINUE TO pass without new lint errors

3.8 WHEN Prettier is run after the fix THEN the system SHALL CONTINUE TO report no formatting issues
