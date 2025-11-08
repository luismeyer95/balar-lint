import { helperB } from "./helperB";

export async function helperA(url: string) {
    // helperA conditionally calls helperB
    if (url.includes("google")) {
        await helperB(url); // Conditional call to helperB
    }
}
