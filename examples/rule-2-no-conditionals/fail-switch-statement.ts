import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
});

async function example() {
  const urls = ["https://google.com", "https://github.com"];

  const results = await balar.run(urls, async (url) => {
    const domain = url.includes("google") ? "google" : "other";

    switch (domain) {
      case "google":
        const data = await wrap.fetch(url);
        return data;
      case "other":
        return "skipped";
      default:
        return "unknown";
    }
  });

  return results;
}
