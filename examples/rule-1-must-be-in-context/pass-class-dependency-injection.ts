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
    const data = await this.dep.fetch(url); // ✅ PASS: Called through balar.run context from DataProcessor
    return data;
  }
}

// Class A: Depends on interface (not concrete implementation), uses balar.run
class DataProcessor {
  constructor(private fetcher: IDataFetcher) {}

  async process(urls: string[]) {
    const results = await balar.run(urls, async (url) => {
      const data = await this.fetcher.fetch(url); // ✅ PASS: Inside balar.run, delegates to injected implementation
      return data;
    });

    return results;
  }
}

// ✅ PASS: Dependency injection pattern with balar-wrapped functions
async function example() {
  const fetcher = new DataFetcherImpl(wrap);
  const processor = new DataProcessor(fetcher);

  const urls = ["https://google.com", "https://github.com"];
  const results = await processor.process(urls);
  return results;
}
