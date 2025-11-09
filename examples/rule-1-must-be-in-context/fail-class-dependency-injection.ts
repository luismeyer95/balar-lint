import { balar } from "balar";

// Top level: create balar wrapped functions
const wrap = balar.wrap.fns({
  fetch: async (url: string[]) => {
    return new Map(url.map((u) => [u, u + " data"]));
  },
});

// Interface for dependency injection
interface IDataFetcher {
  fetch(url: string): Promise<string | undefined>;
}

// Class B: Implements interface, uses balar-wrapped function
class DataFetcherImpl implements IDataFetcher {
  constructor(private dep: typeof wrap) {}

  async fetch(url: string) {
    const data = await this.dep.fetch(url); // ❌ FAIL: Called outside balar.run context
    return data;
  }
}

// ❌ FAIL: Dependency injection pattern, but called outside balar.run context
async function example() {
  const fetcher: IDataFetcher = new DataFetcherImpl(wrap);

  const data = await fetcher.fetch("https://google.com"); // ❌ FAIL: Must be inside balar.run()
  return data;
}
