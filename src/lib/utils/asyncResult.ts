import { AsyncResult } from "../../types";

export async function tryAsync<T>(fn: () => Promise<T>): Promise<AsyncResult<T>> {
    try {
        const data = await fn();
        return { state: "success", data };
    } catch (error) {
        return { state: "error", error: error instanceof Error ? error.message : String(error) };
    }
}
