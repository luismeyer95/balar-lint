import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ❌ FAIL: Logical && operator
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    url.includes("google") && (await wrap.fetch(url)); // ❌ FAIL (9002): Conditional via &&
    return url;
  });

  return results;
}
