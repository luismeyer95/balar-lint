import { helperB } from "./helperB";

export async function helperA(url: string) {
    // helperA unconditionally calls helperB (in another file)
    await helperB(url);
}
