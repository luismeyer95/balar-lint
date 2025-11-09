## Development

To build the plugin:

```bash
npm install
npm run build
```

The compiled plugin will be in the `dist/` directory.

## Testing

Run automated tests with snapshot validation:

```bash
npm test
```

The test suite includes 27 tests covering various usage patterns and edge cases. The `examples/` directory contains test cases demonstrating both correct and incorrect usage. The `tests/` directory contains the test runner and snapshot files.

### Test Development Workflow

When adding or modifying tests, always use the dry-run workflow to verify snapshot changes before committing:

```bash
# 1. Make changes to test files or plugin code
# 2. Build the plugin
npm run build

# 3. Preview what snapshots would change (DO NOT skip this step!)
npm run test:update:dry-run

# 4. Review the output carefully:
#    - "no changes" = snapshot is correct
#    - "would create" = new test, review the expected output
#    - "would update" = shows diff of current vs new snapshot
#
# 5. If the changes look correct, update snapshots:
npm run test:update

# 6. Verify all tests pass
npm test
```

**Important**: Never run `npm run test:update` without first checking `test:update:dry-run` output. This prevents accidentally committing incorrect snapshots when the plugin has a bug.
