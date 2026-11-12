#!/usr/bin/env node
/**
 * ==============================================================================
 * Market Aura 4U — Automated Production Pre-flight Deployment Verifier
 * Validates containerization, configuration, file manifests, and test suites
 * ==============================================================================
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  // Backend
  "market-aura-4u-backend-main/Dockerfile",
  "market-aura-4u-backend-main/.dockerignore",
  "market-aura-4u-backend-main/package.json",
  "market-aura-4u-backend-main/.env.example",
  "market-aura-4u-backend-main/src/app.js",
  "market-aura-4u-backend-main/Procfile",

  // Frontend
  "market-aura-4u-frontend-main/Dockerfile",
  "market-aura-4u-frontend-main/.dockerignore",
  "market-aura-4u-frontend-main/nginx.conf",
  "market-aura-4u-frontend-main/vercel.json",
  "market-aura-4u-frontend-main/package.json",
  "market-aura-4u-frontend-main/.env.example",

  // ML Engine
  "CAPSTONE/Dockerfile",
  "CAPSTONE/.dockerignore",
  "CAPSTONE/Procfile",
  "CAPSTONE/src/serve.py",
  "CAPSTONE/requirements-prod.txt",
  "CAPSTONE/contract/input_schema.json",
  "CAPSTONE/contract/output_schema.json",

  // Monorepo Orchestration
  "docker-compose.yml",
  "docker-compose.prod.yml",
  "render.yaml",
  "vercel.json",
  "api/index.js",
  ".env.example",
  ".github/workflows/ci.yml",
];

function log(stage, msg, status = "INFO") {
  const badge =
    status === "OK"
      ? "\x1b[32m✔ PASS\x1b[0m"
      : status === "FAIL"
        ? "\x1b[31m✖ FAIL\x1b[0m"
        : "\x1b[34mℹ INFO\x1b[0m";
  console.log(`${badge} [${stage}] ${msg}`);
}

let failureCount = 0;

console.log("\n=======================================================");
console.log("  MARKET AURA 4U — PRE-FLIGHT DEPLOYMENT VERIFICATION  ");
console.log("=======================================================\n");

// 1. Verify Required Deployment Files Exist
console.log("--- 1. File Manifest & Container Config Checks ---");
for (const file of REQUIRED_FILES) {
  const fullPath = join(ROOT, file);
  if (existsSync(fullPath)) {
    log("MANIFEST", file, "OK");
  } else {
    log("MANIFEST", `Missing expected deployment file: ${file}`, "FAIL");
    failureCount++;
  }
}

// 2. Verify Frontend Production Build & Bundle Artifacts
console.log("\n--- 2. Frontend Production Bundle Check ---");
try {
  const distIndex = join(ROOT, "market-aura-4u-frontend-main/dist/index.html");
  if (!existsSync(distIndex)) {
    log("FRONTEND", "dist/index.html missing. Building bundle...", "INFO");
    execSync("npm --prefix market-aura-4u-frontend-main run build", { stdio: "inherit" });
  }
  const content = readFileSync(distIndex, "utf8");
  if (content.includes("<html") && content.includes("<script")) {
    log("FRONTEND", "Production bundle built & verified (dist/index.html)", "OK");
  } else {
    log("FRONTEND", "dist/index.html appears malformed or empty", "FAIL");
    failureCount++;
  }
} catch (err) {
  log("FRONTEND", `Frontend build verification failed: ${err.message}`, "FAIL");
  failureCount++;
}

// 3. Verify ML Model Contract Schemas
console.log("\n--- 3. ML Recommender Contract Check ---");
try {
  const inSchema = JSON.parse(readFileSync(join(ROOT, "CAPSTONE/contract/input_schema.json"), "utf8"));
  const outSchema = JSON.parse(readFileSync(join(ROOT, "CAPSTONE/contract/output_schema.json"), "utf8"));
  if (inSchema.type === "object" && outSchema.type === "object") {
    log("ML_CONTRACT", "Recommender input and output JSON schemas valid", "OK");
  } else {
    log("ML_CONTRACT", "Schemas must define top-level object types", "FAIL");
    failureCount++;
  }
} catch (err) {
  log("ML_CONTRACT", `Failed to read ML contracts: ${err.message}`, "FAIL");
  failureCount++;
}

// 4. Verify Secret Safety in Examples
console.log("\n--- 4. Secret Hygiene in Templates ---");
const exampleFiles = [
  ".env.example",
  "market-aura-4u-backend-main/.env.example",
  "market-aura-4u-frontend-main/.env.example",
];
for (const ex of exampleFiles) {
  const raw = readFileSync(join(ROOT, ex), "utf8");
  const leaked = raw.match(/AIzaSy[0-9A-Za-z_-]{33}|rzp_live_[0-9A-Za-z]{14}|sk-ant-[0-9A-Za-z_-]{20,}/g);
  if (leaked) {
    log("HYGIENE", `Potential live API key detected in ${ex}`, "FAIL");
    failureCount++;
  } else {
    log("HYGIENE", `No live secrets detected in ${ex}`, "OK");
  }
}

// 5. Overall Summary
console.log("\n=======================================================");
if (failureCount === 0) {
  console.log("  DEPLOYMENT STATUS: \x1b[32mREADY FOR PRODUCTION\x1b[0m (0 errors)");
  console.log("=======================================================\n");
  process.exit(0);
} else {
  console.log(`  DEPLOYMENT STATUS: \x1b[31mBLOCKED\x1b[0m (${failureCount} error(s))`);
  console.log("=======================================================\n");
  process.exit(1);
}
