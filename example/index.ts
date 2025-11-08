import { balar } from "balar";

const wrap = balar.wrap.fns({
    fetch: async (url: string[]) => {
        return new Map(url.map((u) => [u, u]));
    },
});

// ❌ ERROR: Calling balar-wrapped function outside balar.run()
const fetch = wrap.fetch("https://google.com");

// ✅ OK: Calling inside balar.run()
async function example1() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        const data = await wrap.fetch(url);
        return data;
    });

    return results;
}

// ❌ ERROR: Conditional call inside balar.run()
async function example2() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        let data;

        if (url.includes("google")) {
            data = await wrap.fetch(url); // This should error
        }

        return data;
    });

    return results;
}

// ✅ OK: Using balar.if() for conditional logic
async function example3() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        const data = await balar.if(
            url.includes("google"),
            async () => await wrap.fetch(url),
            async () => undefined
        );

        return data;
    });

    return results;
}

// ❌ ERROR: Ternary conditional
async function example4() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        const data = url.includes("google")
            ? await wrap.fetch(url) // This should error
            : undefined;

        return data;
    });

    return results;
}

// ❌ ERROR: Function call chain with conditional
// A calls B, B conditionally calls C, C has the balar-wrapped call
async function example5() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        // A: processor function
        await helperA(url);
        return url;
    });

    return results;
}

async function helperA(url: string) {
    // B: called from processor
    if (url.includes("google")) {
        await helperB(url); // Conditionally calls C
    }
}

async function helperB(url: string) {
    // C: has the balar-wrapped call
    await wrap.fetch(url); // This SHOULD error - called through conditional chain
}

// ❌ ERROR: Nested conditionals in function chain
async function example6() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        await helperC(url);
        return url;
    });

    return results;
}

async function helperC(url: string) {
    if (url.includes("google")) {
        if (url.includes(".com")) {
            await wrap.fetch(url); // This SHOULD error - nested conditional
        }
    }
}

// ❌ ERROR: Conditional in ternary operator with function call
async function example7() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        await (url.includes("google") ? helperD(url) : Promise.resolve());
        return url;
    });

    return results;
}

async function helperD(url: string) {
    await wrap.fetch(url); // This SHOULD error - called conditionally via ternary
}

// ❌ ERROR: Logical && operator
async function example8() {
    const urls = ["https://google.com", "https://github.com"];

    const results = await balar.run(urls, async (url) => {
        url.includes("google") && await wrap.fetch(url); // This should error
        return url;
    });

    return results;
}
