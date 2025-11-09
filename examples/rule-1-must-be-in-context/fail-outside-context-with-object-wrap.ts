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

// ❌ FAIL: Calling wrapped object method outside balar.run()
async function example() {
  const data = await wrap.fetch("https://google.com"); // ❌ FAIL: Must be inside balar.run()
  return data;
}
