# Balar TypeScript Language Server Plugin

A TypeScript Language Server plugin that detects incorrect usage of balar-wrapped bulk functions and provides real-time diagnostics in your IDE.

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

3. Restart your TypeScript language server (in VS Code: `CMD+Shift+P` → "TypeScript: Restart TS Server")

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

## How It Works

The plugin uses TypeScript's Language Service API to:

1. **Detect balar imports**: Tracks all imports of `balar` from the 'balar' package (including aliased imports)

2. **Identify BalarFn types**: Analyzes function call expressions and their types to determine if they are balar-wrapped functions by checking for the characteristic `BalarFn` type signature (dual scalar/bulk overloads)

3. **Track balar.run() contexts**: Traverses the AST to determine if a call is within a `balar.run()` processor function

4. **Detect conditional calls**: Checks for `if` statements, `switch` statements, ternary operators, and short-circuit logical operators (`&&`, `||`) between the call and the `balar.run()` context

5. **Allow balar.if/switch**: Recognizes `balar.if()` and `balar.switch()` as valid conditional constructs

## Limitations

- **IDE-only diagnostics**: This plugin only provides diagnostics in your IDE. It does not block the TypeScript build process (`tsc`). This is a limitation of TypeScript Language Server plugins.

- **Type detection**: The plugin relies on TypeScript's type system to identify balar-wrapped functions. If type information is not available or accurate, the plugin may not detect all violations.

## Development

To build the plugin:

```bash
npm install
npx tsc
```

The compiled plugin will be in the `out/` directory.

To work on the plugin with live reloading:

```bash
# Watch mode for plugin development
npx tsc --watch

# In another terminal, open the examples project in VS Code
cd examples
code .

# Restart the TypeScript server after making changes:
# CMD+Shift+P → "TypeScript: Restart TS Server"
```

For debugging:

```bash
# Start VS Code with TSServer debugging enabled
TSS_DEBUG=9559 code examples

# Or to wait for debugger attachment:
TSS_DEBUG_BRK=9559 code examples
```

Check the logs via the VS Code command "TypeScript: Open TS Server Logs" (search for 'Balar linter plugin' to see if it loaded correctly).

## Testing

Run automated tests with snapshot validation:

```bash
npm test
```

The `examples/` directory contains test cases demonstrating both correct and incorrect usage. The `tests/` directory contains the test runner and snapshot files.

## License

MIT
