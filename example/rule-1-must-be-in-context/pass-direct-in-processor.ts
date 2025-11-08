import { balar } from "balar";

const wrap = balar.wrap.fns({
    fetch: async (url: string[]) => {
        return new Map(url.map((u) => [u, u]));
    },
});

// ✅ PASS: Calling inside balar.run()
async function example() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        const data = await wrap.fetch(url); // ✅ PASS: Direct call in processor function
        return data;
    });

    return results;
}
