#!/usr/bin/env node
/**
 * Convenience runner for monorepo deployment verification.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

const result = spawnSync("node", ["scripts/verify-deployment.js"], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 0);
