# Balar TypeScript Language Server Plugin

The `balar` TypeScript library allows developers to build network-efficient batch processing APIs without the headaches related to the partitioning logic you would need when your items have different processing/data-fetching requirements.

Using this library, some rules need to be enforced to ensure correct batching behavior in certain scenario. Correct usage of certain DSL-like APIs of this library cannot be enforced directly by the library at runtime, much like React hooks. This TypeScript Language Server plugin fills this gap by performing static analysis on your codebase to spot usage issues, displaying real-time diagnostics directly in your IDE with little configuration.

## Features

This plugin enforces two key rules for using balar:

1. **No balar-wrapped functions outside balar context**: Balar-wrapped functions (functions wrapped with `balar.wrap.fns()` or `balar.wrap.object()`) must be called inside a `balar.run()` context.

2. **No conditional calls inside balar context**: Inside `balar.run()`, balar-wrapped functions must not be called conditionally (e.g., inside `if` statements, `switch` statements, ternary operators, or short-circuit operators like `&&` or `||`). Use `balar.if()` or `balar.switch()` instead.

## Installation

1. Install the plugin in your project:

   ```bash
   npm install --save-dev tsserver-plugin
   ```

2. Configure your `tsconfig.json` to use the plugin:

   ```json
   {
     "compilerOptions": {
       "plugins": [
         {
           "name": "tsserver-plugin"
         }
       ]
     }
   }
   ```

3. Restart your TypeScript language server if needed (in VS Code: `CMD+Shift+P` → "TypeScript: Restart TS Server")

## Examples

### ❌ Error: Calling outside balar.run()

```typescript
import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return url.map((u) => u + " fetched");
  },
});

// ERROR: Balar-wrapped function must be called inside a balar.run() context
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

  // ERROR: Balar-wrapped function must not be called conditionally
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
    async () => await wrap.fetch(url),
    async () => undefined
  );

  return data;
});
```

## Limitations

- **IDE-only diagnostics**: This plugin only provides diagnostics in your IDE. It does not block the TypeScript build process (`tsc`). This is a limitation of TypeScript Language Server plugins.

## License

MIT
