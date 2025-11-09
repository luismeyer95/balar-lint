# Balar Linter Test Examples

This directory contains 27 test cases for the balar TypeScript linter plugin.

## Structure

Examples are organized by rule:

### Rule 1: Must Be In Context (`rule-1-must-be-in-context/`)

Balar-wrapped functions must be called inside a `balar.run()` context.

**Pass cases (8 tests):**

- `pass-direct-in-processor.ts` - Direct call inside processor function
- `pass-aliased-import.ts` - Using aliased balar import (`import { balar as b }`)
- `pass-array-methods-in-context.ts` - Array methods (`.map()`) with wrapped calls when inside `balar.run()`
- `pass-class-dependency-injection.ts` - Dependency injection with interface-based dependencies
- `pass-direct-with-object-wrap.ts` - Using `balar.wrap.object()` variant
- `pass-lambda-through-helper.ts` - Call through helper function
- `pass-through-call-chain-multifile/` - Call through function chain **across multiple files**
  - `index.ts` - Main file with balar.run()
  - `helperA.ts` - Calls helperB
  - `helperB.ts` - Contains balar-wrapped call ✅

**Fail cases (3 tests):**

- `fail-outside-context.ts` - Call at module level, outside any balar context (Error 9001)
- `fail-outside-context-with-object-wrap.ts` - Using `balar.wrap.object()` outside context (Error 9001)
- `fail-class-dependency-injection.ts` - DI pattern but called outside `balar.run()` (Error 9001)

### Rule 2: No Conditionals (`rule-2-no-conditionals/`)

Balar-wrapped functions must not be called conditionally inside `balar.run()`. Use `balar.if()` or `balar.switch()` instead.

**Pass cases (3 tests):**

- `pass-unconditional.ts` - Unconditional call in processor
- `pass-balar-if.ts` - Using `balar.if()` for conditional logic (allowed)
- `pass-balar-switch.ts` - Using `balar.switch()` for branching logic (allowed)

**Fail cases (13 tests):**

- `fail-if-statement.ts` - Call inside `if` statement (Error 9002)
- `fail-nested-if.ts` - Call inside nested `if` statements (Error 9002)
- `fail-switch-statement.ts` - Call inside JavaScript `switch` statement (Error 9002)
- `fail-ternary.ts` - Call inside ternary operator `? :` (Error 9002)
- `fail-ternary-with-call-chain.ts` - Function called conditionally via ternary (Error 9002)
- `fail-logical-and.ts` - Call on right side of `&&` operator (Error 9002)
- `fail-logical-or.ts` - Call on right side of `||` operator (Error 9002)
- `fail-aliased-import-conditional.ts` - Conditional with aliased balar import (Error 9002)
- `fail-balar-switch-inside-if.ts` - `balar.switch()` itself inside an `if` statement (Error 9002)
- `fail-call-chain-conditional/` - Call through conditionally invoked function chain **across multiple files** (Error 9002)
  - `index.ts` - Main file with balar.run()
  - `helperA.ts` - Conditionally calls helperB
  - `helperB.ts` - Contains balar-wrapped call

## Error Codes

- **9001**: Balar-wrapped function must be called inside a balar.run() context
- **9002**: Balar-wrapped function must not be called conditionally inside balar.run()

## Running Tests

### In IDE

Open any example file in VSCode with the TypeScript language service. The balar linter plugin will automatically detect violations and show diagnostics inline.

Look for comments marking expected behavior:

- `✅ PASS` - Should not show any errors
- `❌ FAIL (XXXX)` - Should show error with code XXXX

### Automated Tests

From the project root:

```bash
# Run all tests with snapshot validation
npm test

# Preview snapshot changes without committing (always do this first!)
npm run test:update:dry-run

# Update snapshots after reviewing dry-run output
npm run test:update
```

## Test Coverage

The test suite covers:

- ✅ Import aliasing (`import { balar as b }`)
- ✅ Both `balar.wrap.fns()` and `balar.wrap.object()` variants
- ✅ Cross-file call chain tracking
- ✅ Dependency injection with interfaces
- ✅ Method call tracking through class hierarchies
- ✅ Functions nested in data structures (arrays, tuples)
- ✅ All JavaScript conditional constructs (if, switch, ternary, &&, ||)
- ✅ Array methods like `.map()` when used in balar context
- ✅ `balar.if()` and `balar.switch()` as valid conditional APIs
- ✅ Edge case: balar APIs inside JavaScript conditionals
