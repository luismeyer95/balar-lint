import { balar } from "balar";
import { helperA } from "./helperA";

// ✅ PASS: Function call chain across multiple files
// Main → helperA → helperB → balar-wrapped call
// Tests that the plugin recognizes balar context across file boundaries
async function example() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        // Processor function calls helperA (in another file)
        await helperA(url);
        return url;
    });

    return results;
}
