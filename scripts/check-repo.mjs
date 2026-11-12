#!/usr/bin/env node
/**
 * Pre-build guard. CreatorsAI lives entirely in src/. Files from another project left at the
 * repository root can silently replace the app (root app/ or pages/ beat src/app) or its config
 * (next.config.js/.mjs beat next.config.ts). Fail fast with a clear fix instead of a confusing build.
 */
import { existsSync, readdirSync } from "node:fs";

const fatal = [
  ["app", "a root app/ folder replaces src/app — every CreatorsAI page would disappear"],
  ["pages", "a root pages/ folder adds another project's routes"],
  ["src/pages", "src/pages/ adds another project's routes"],
  ["next.config.js", "overrides next.config.ts (security headers, images)"],
  ["next.config.mjs", "overrides next.config.ts (security headers, images)"],
  ["next.config.cjs", "overrides next.config.ts (security headers, images)"],
  ["middleware.ts", "a root middleware from another project would run on every request"],
  ["middleware.js", "a root middleware from another project would run on every request"],
].filter(([p]) => existsSync(p));

const stray = ["components", "lib", "hooks", "styles", "utils", "types", "content", "data"].filter((p) => existsSync(p) && readdirSync(p).length > 0);
// Config files from another project: Tailwind v4 here needs no config file, and a stray vitest.config.ts
// takes priority over vitest.config.mts with the wrong "@/" alias.
const strayFiles = ["tailwind.config.ts", "tailwind.config.js", "vitest.config.ts", "vitest.config.js", "postcss.config.js"].filter((p) => existsSync(p));
if (strayFiles.length) {
  console.warn(`\n⚠  Leftover config files from another project: ${strayFiles.join(", ")}`);
  console.warn("   Delete them: git rm " + strayFiles.join(" ") + "\n");
}

if (stray.length) {
  console.warn(`\n⚠  Ignoring leftover root folders not used by CreatorsAI: ${stray.map((s) => s + "/").join(", ")}`);
  console.warn("   They are excluded from the build. Delete them from the repo when convenient.\n");
}
if (fatal.length) {
  console.error("\n✖  Build stopped: files from another project are in this repository.\n");
  for (const [p, why] of fatal) console.error(`   • ${p} — ${why}`);
  console.error("\n   Fix (run in the repo folder, then push):\n     git rm -r " + fatal.map(([p]) => p).join(" ") + "\n     git commit -m \"Remove leftover files\"\n     git push\n   CreatorsAI's code lives only in src/.\n");
  process.exit(1);
}
console.log("✓ Repository layout OK");
