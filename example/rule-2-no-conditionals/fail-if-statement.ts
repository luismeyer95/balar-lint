import { balar } from "balar";

const wrap = balar.wrap.fns({
    fetch: async (url: string[]) => {
        return new Map(url.map((u) => [u, u]));
    },
});

// ❌ FAIL: Conditional call inside balar.run() using if statement
async function example() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        let data;

        if (url.includes("google")) {
            data = await wrap.fetch(url); // ❌ FAIL (9002): Conditional call in if statement
        }

        return data;
    });

    return results;
}
