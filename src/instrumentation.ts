/** Runs once per server instance. Node-specific hooks live in instrumentation-node.ts (not bundled for Edge). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
