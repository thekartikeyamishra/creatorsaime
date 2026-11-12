/**
 * Node-only process safety net (loaded by instrumentation.ts on the Node.js runtime only).
 * A stray rejected promise must never take the whole function instance down — log it instead.
 */
const g = globalThis as { __caiHandlers?: boolean };
if (!g.__caiHandlers) {
  g.__caiHandlers = true;
  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandledRejection:", reason);
  });
}
export {};
