# Balar Linter Test Examples

This directory contains test cases for the balar TypeScript linter plugin.

## Structure

Examples are organized by rule:

### Rule 1: Must Be In Context (`rule-1-must-be-in-context/`)

Balar-wrapped functions must be called inside a `balar.run()` context.

**Pass cases:**
- `pass-direct-in-processor.ts` - Direct call inside processor function
- `pass-through-call-chain-multifile/` - Call through function chain **across multiple files**
  - `index.ts` - Main file with balar.run()
  - `helperA.ts` - Calls helperB
  - `helperB.ts` - Contains balar-wrapped call ✅

**Fail cases:**
- `fail-outside-context.ts` - Call at module level, outside any balar context (Error 9001)

### Rule 2: No Conditionals (`rule-2-no-conditionals/`)

Balar-wrapped functions must not be called conditionally inside `balar.run()`. Use `balar.if()` or `balar.switch()` instead.

**Pass cases:**
- `pass-unconditional.ts` - Unconditional call in processor
- `pass-balar-if.ts` - Using `balar.if()` for conditional logic (allowed)

**Fail cases:**
- `fail-if-statement.ts` - Call inside `if` statement (Error 9002)
- `fail-ternary.ts` - Call inside ternary operator `? :` (Error 9002)
- `fail-call-chain-conditional/` - Call through conditionally invoked function chain **across multiple files** (Error 9002)
  - `index.ts` - Main file with balar.run()
  - `helperA.ts` - Conditionally calls helperB
  - `helperB.ts` - Contains balar-wrapped call
- `fail-nested-if.ts` - Call inside nested `if` statements (Error 9002)
- `fail-ternary-with-call-chain.ts` - Function called conditionally via ternary (Error 9002)
- `fail-logical-and.ts` - Call on right side of `&&` operator (Error 9002)

## Error Codes

- **9001**: Balar-wrapped function must be called inside a balar.run() context
- **9002**: Balar-wrapped function must not be called conditionally inside balar.run()

## Running Tests

Open any example file in VSCode with the TypeScript language service. The balar linter plugin will automatically detect violations and show diagnostics inline.

Look for comments marking expected behavior:
- `✅ PASS` - Should not show any errors
- `❌ FAIL (XXXX)` - Should show error with code XXXX
