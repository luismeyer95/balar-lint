import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ❌ FAIL: Nested conditionals in function chain
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    await helperC(url);
    return url;
  });

  return results;
}

async function helperC(url: string) {
  if (url.includes("google")) {
    if (url.includes(".com")) {
      await wrap.fetch(url); // ❌ FAIL (9002): Nested conditional
    }
  }
}
