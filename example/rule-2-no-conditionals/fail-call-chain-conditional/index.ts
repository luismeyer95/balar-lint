import { balar } from "balar";
import { helperA } from "./helperA";

// ❌ FAIL: Function call chain with conditional across multiple files
// Main → helperA (conditional) → helperB → balar-wrapped call
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    // Processor function calls helperA
    await helperA(url);
    return url;
  });

  return results;
}
