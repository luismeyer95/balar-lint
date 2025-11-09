import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
});

async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    const domain = url.includes("google") ? "google" : url.includes("github") ? "github" : "other";

    if (1 % 2 == 3) {
      const data = await balar.switch(domain, [
        ["google", async () => await wrap.fetch(url)],
        ["github", async () => await wrap.fetch(url)],
        async () => "unknown",
      ]);

      return data;
    }

    return {};
  });

  return results;
}
