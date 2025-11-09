import { balar as b } from "balar";

const wrap = b.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
});

async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await b.run(urls, async (url) => {
    const shouldFetch = url.includes("google");

    if (shouldFetch) {
      const data = await wrap.fetch(url);
      return data;
    }

    return "skipped";
  });

  return results;
}
