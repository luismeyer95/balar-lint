import { balar } from "balar";

const wrap = balar.wrap.fns({
    fetch: async (url: string[]) => {
        return new Map(url.map((u) => [u, u]));
    },
});

export async function helperB(url: string) {
    // helperB has the balar-wrapped call
    await wrap.fetch(url); // ❌ FAIL (9002): Called through conditional chain across files
}
