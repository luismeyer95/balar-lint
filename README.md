# `balar-lint`

The `balar` TypeScript library allows developers to build network-efficient batch processing APIs with simpler code, by handling the burden of partitioning batch items depending on their data-fetching requirements.

When using this library, some rules need to be enforced to ensure efficient batching behavior. Recommended usage of certain DSL-like APIs of this library cannot be enforced directly at build/runtime, much like React hooks. The TypeScript Language Server plugin + CLI checker in this package fills the gap by enabling static analysis on your codebase to spot usage issues, displaying real-time diagnostics directly in your IDE with little configuration.

## Features

This plugin enforces two key rules for using balar:

1. **No calling of balar-wrapped functions outside of a balar context**: balar-wrapped functions (functions wrapped with `balar.wrap.fns()` or `balar.wrap.object()`) must be called inside a `balar.run()` context.

2. **No conditional calling of balar-wrapped functions inside of a balar context**: Inside `balar.run()`, balar-wrapped functions must not be called conditionally (e.g., inside `if` statements, `switch` statements, ternary operators, or short-circuit operators like `&&` or `||`). Use `balar.if()` or `balar.switch()` instead to ensure efficient partitioning of your batch.

## Installation

1. Install the plugin in your project:

   ```bash
   npm install --save-dev balar-lint
   ```

2. Configure your `tsconfig.json` to use the plugin:

   ```json
   {
     "compilerOptions": {
       "plugins": [
         {
           "name": "balar-lint"
         }
       ]
     }
   }
   ```

3. Restart your TypeScript language server if needed (VS Code command → "TypeScript: Restart TS Server")

## CLI Usage

In addition to IDE integration, `balar-lint` provides a CLI tool for CI build scripts:

```bash
# Run in current directory
npx balar-lint

# Run on specific project
npx balar-lint --project ./path/to/project

# Show help
npx balar-lint --help
```

The CLI will:
- Find and analyze relevant TypeScript files in your project
- Report balar usage errors with file locations and error codes

**Example output:**

```
balar-lint report 🔎
──────────────────────────────────────────────────

Files checked: 28
Files with errors: 2
Total errors: 3

✗ Found balar usage errors:

src/api/users.ts
  15:20 [90001] balar-wrapped function must be called inside a balar.run() context
  23:15 [90002] balar-wrapped function must not be called conditionally inside balar.run(), use balar.if() or balar.switch() instead to ensure efficient partitioning of your batch.
src/api/posts.ts
  42:18 [90001] balar-wrapped function must be called inside a balar.run() context
```

This complements the language server plugin by allowing you to integrate the same checks as part of your CI pipeline (TypeScript language server plugins are limited to editor diagnostics only).

## Examples

### ❌ Error: Calling outside balar.run()

```typescript
import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return url.map((u) => u + " fetched");
  },
});

// ERROR: balar-wrapped function must be called inside a balar.run() context
const fetch = wrap.fetch("https://google.com");
```

### ✅ Correct: Calling inside balar.run()

```typescript
const results = await balar.run(urls, async (url) => {
  const data = await wrap.fetch(url);
  return data;
});
```

### ❌ Error: Conditional call inside balar.run()

```typescript
const results = await balar.run(urls, async (url) => {
  let data;

  // ERROR: balar-wrapped function must not be called conditionally
  if (url.includes("google")) {
    data = await wrap.fetch(url);
  }

  return data;
});
```

### ✅ Correct: Using balar.if()

```typescript
const results = await balar.run(urls, async (url) => {
  const data = await balar.if(
    url.includes("google"),
    () => wrap.fetch(url)
  );

  return data;
});
```

## License

MIT
