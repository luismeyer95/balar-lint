import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ❌ FAIL: Conditional in ternary operator with function call
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    await (url.includes("google") ? helperD(url) : Promise.resolve());
    return url;
  });

  return results;
}

async function helperD(url: string) {
  await wrap.fetch(url); // ❌ FAIL (9002): Called conditionally via ternary
}
