import { balar } from "balar";

const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u]));
  },
});

// ❌ FAIL: Calling balar-wrapped function outside balar.run()
const result = wrap.fetch("https://google.com"); // ❌ FAIL (9001): Outside balar.run() context
