// This script is meant to be run ONCE by Plesk to fix dependencies.
// 1. Upload this file as 'rebuild.js' to httpdocs
// 2. Set Plesk Startup File to: rebuild.js
// 3. Restart App
// 4. Check Logs
// 5. Change Startup File back to .output/server/index.mjs

import { execSync } from "child_process";
import fs from "fs";

console.log("-----------------------------------------");
console.log("STARTING DEPENDENCY REBUILD");
console.log("-----------------------------------------");

try {
  // Go to the server directory where package.json is
  const serverDir = ".output/server";
  if (!fs.existsSync(serverDir)) {
    console.error("ERROR: .output/server directory not found!");
    process.exit(1);
  }

  process.chdir(serverDir);
  console.log(`Changed directory to: ${process.cwd()}`);

  console.log("Running 'npm install --omit=dev'...");
  // Using --omit=dev to speed it up and avoid needing dev modules
  // Redirect stderr to stdout to see errors in main log
  const output = execSync("npm install --omit=dev", { encoding: "utf8" });
  console.log(output);

  console.log("-----------------------------------------");
  console.log("✅ REBUILD COMPLETE SUCCESS");
  console.log("-----------------------------------------");
  console.log("NOW: Change Startup File back to .output/server/index.mjs");
} catch (error) {
  console.error("-----------------------------------------");
  console.error("❌ REBUILD FAILED");
  console.error(error.message);
  if (error.stdout) console.log("STDOUT:", error.stdout);
  if (error.stderr) console.error("STDERR:", error.stderr);
  console.error("-----------------------------------------");
}

// Keep process alive so Plesk sees it as "running" long enough to read logs
setInterval(() => {}, 10000);
