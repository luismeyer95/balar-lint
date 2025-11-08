import { balar } from "../../balar/dist/index.js";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return url.map((u) => u + " fetched");
  },
});

const fetch = wrap.fetch("https://google.com");

