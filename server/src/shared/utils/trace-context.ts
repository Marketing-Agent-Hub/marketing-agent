import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
    traceId: string;
}

/**
 * AsyncLocalStorage store for propagating traceId across async boundaries.
 * Requirements: 11.1
 */
export const traceStore = new AsyncLocalStorage<TraceContext>();

/**
 * Get the current trace context. Returns an empty traceId if not in a traced context.
 */
export function getTraceContext(): TraceContext {
    return traceStore.getStore() ?? { traceId: '' };
}

/**
 * Run a function within a trace context.
 */
export function runWithTraceContext<T>(traceId: string, fn: () => T): T {
    return traceStore.run({ traceId }, fn);
}
