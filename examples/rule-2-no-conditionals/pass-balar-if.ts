import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ✅ PASS: Using balar.if() for conditional logic
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    const data = await balar.if(
      url.includes("google"),
      () => wrap.fetch(url) // ✅ PASS: Inside balar.if() is allowed
    );

    return data;
  });

  return results;
}
