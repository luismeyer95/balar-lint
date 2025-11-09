# `balar-lint` examples

This directory contains 27 test cases for the balar TypeScript linter plugin.

## Structure

Examples are organized by rule:

### Rule 1: Must be in context (`rule-1-must-be-in-context/`)

Balar-wrapped functions must be called inside a `balar.run()` context.

### Rule 2: No conditionals (`rule-2-no-conditionals/`)

Balar-wrapped functions must not be called conditionally inside `balar.run()`. Use `balar.if()` or `balar.switch()` instead.

## Error codes

- **90001**: Balar-wrapped function must be called inside a balar.run() context
- **90002**: Balar-wrapped function must not be called conditionally inside balar.run()

## Running tests

### In IDE

Open any example file in VSCode with the TypeScript language service. The balar linter plugin will automatically detect violations and show diagnostics inline.

Look for comments marking expected behavior:

- `✅ PASS` - Should not show any errors
- `❌ FAIL (XXXX)` - Should show error with code XXXX

### Automated snapshot tests

From the project root:

```bash
# Run all tests with snapshot validation
npm test

# Preview snapshot changes
npm run test:update:dry-run

# Update snapshots after reviewing dry-run output
npm run test:update
```
