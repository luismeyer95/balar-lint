import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ❌ FAIL: Ternary conditional
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    const data = url.includes("google")
      ? await wrap.fetch(url) // ❌ FAIL (9002): Conditional call in ternary
      : undefined;

    return data;
  });

  return results;
}
