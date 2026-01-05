#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 *
 * Checks production bundle size after build and enforces limits.
 * Helps prevent performance regressions.
 *
 * Usage: node scripts/check-bundle-size.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../.output/public");
const MAX_BUNDLE_SIZE = 200 * 1024; // 200KB

async function checkBundleSize() {
  // Verify dist exists
  if (!fs.existsSync(distDir)) {
    console.error(`❌ Distribution directory not found: ${distDir}`);
    console.log("Run 'npm run build' first");
    process.exit(1);
  }

  // Find all JS files (exclude node_modules)
  const files = fs.readdirSync(distDir);
  const bundles = files.filter(
    (f) => f.endsWith(".js") && !f.includes("node_modules"),
  );

  if (!bundles.length) {
    console.error("❌ No JavaScript bundles found");
    process.exit(1);
  }

  // Analyze sizes
  let totalSize = 0;
  const bundleSizes: Record<string, number> = {};

  bundles.forEach((bundle) => {
    const filePath = path.join(distDir, bundle);
    if (fs.statSync(filePath).isFile()) {
      const size = fs.statSync(filePath).size;
      bundleSizes[bundle] = size;
      totalSize += size;
    }
  });

  // Display report
  console.log("\n📦 Bundle Size Report");
  console.log("═".repeat(60));
  console.log();

  // Sort by size (largest first)
  const sorted = Object.entries(bundleSizes).sort(([, a], [, b]) => b - a);
  const maxFileWidth = Math.max(...sorted.map(([name]) => name.length));

  sorted.forEach(([name, size]) => {
    const sizeKB = (size / 1024).toFixed(2);
    const percent = ((size / totalSize) * 1024).toFixed(1);
    const bar = "█".repeat(Math.ceil((size / totalSize) * 30));
    console.log(
      `${name.padEnd(maxFileWidth)} ${sizeKB.padStart(8)} KB (${percent.padStart(4)}%) ${bar}`,
    );
  });

  console.log("─".repeat(60));
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const maxKB = (MAX_BUNDLE_SIZE / 1024).toFixed(2);

  console.log(`${"TOTAL".padEnd(maxFileWidth)} ${totalSizeKB.padStart(8)} KB`);
  console.log(`Limit: ${maxKB} KB`);
  console.log();

  // Check if exceeded
  if (totalSize > MAX_BUNDLE_SIZE) {
    const exceedByKB = ((totalSize - MAX_BUNDLE_SIZE) / 1024).toFixed(2);
    console.error(
      `❌ Bundle size ${totalSizeKB}KB exceeds limit of ${maxKB}KB (over by ${exceedByKB}KB)`,
    );
    process.exit(1);
  }

  console.log(`✅ Bundle size ${totalSizeKB}KB is within ${maxKB}KB limit`);
  console.log();
}

checkBundleSize().catch((error) => {
  console.error("Error checking bundle size:", error);
  process.exit(1);
});
