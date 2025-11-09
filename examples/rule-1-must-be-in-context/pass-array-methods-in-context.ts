import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
});

async function example() {
  const ids = [1, 2, 3];

  const results = await balar.run(ids, async (id) => {
    const urls = ["https://google.com", "https://github.com"];

    const allData = await Promise.all(
      urls.map(async (url) => {
        const data = await wrap.fetch(url);
        return data;
      })
    );

    return { id, allData };
  });

  return results;
}
