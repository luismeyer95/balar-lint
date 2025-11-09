import { balar } from "balar";

const api = {
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
  post: async (url: string[], data: string[]) => {
    return new Map(url.map((u, i) => [u, data[i]]));
  },
};

const wrap = balar.wrap.object(api);

// ✅ PASS: Calling wrapped object methods inside balar.run()
async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    const data = await wrap.fetch(url); // ✅ PASS: Wrapped object method call in processor
    return data;
  });

  return results;
}
