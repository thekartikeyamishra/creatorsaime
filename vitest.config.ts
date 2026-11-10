import { defineConfig } from "vitest/config";
import path from "node:path";

// Mirrors the tsconfig "@/*" -> "./*" alias so tests import like the app does.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd()) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["worker/**", "node_modules/**"],
  },
});
