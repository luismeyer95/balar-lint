import { balar } from "balar";

const wrap = balar.wrap.fns({
    fetch: async (url: string[]) => {
        return new Map(url.map((u) => [u, u]));
    },
});

// ✅ PASS: Lambda passed to helperA, which is called from balar.run()
async function example() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        // Pass a lambda to helperA that contains a balar-wrapped call
        await helperA(url, helperB);

        return url;
    });

    return results;
}

// Helper that just calls its function argument
async function helperA(url: string, fn: (url: string) => Promise<void>) {
    await fn(url);
}

async function helperB(url: string) {
    await wrap.fetch(url); // ✅ PASS: Lambda is in context via helperA call
}
