// This script is meant to be run ONCE by Plesk to fix dependencies.
// 1. Upload this file as 'rebuild.js' to httpdocs
// 2. Set Plesk Startup File to: rebuild.js
// 3. Restart App
// 4. Check Logs
// 5. Change Startup File back to .output/server/index.mjs

import { execSync } from "child_process";
import fs from "fs";

// Helper to log to file
const logFile = "../rebuild_log.txt"; // in httpdocs root
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
}

log("-----------------------------------------");
log("STARTING DEPENDENCY REBUILD");
log("-----------------------------------------");

try {
  // Go to the server directory where package.json is
  const serverDir = ".output/server";
  if (!fs.existsSync(serverDir)) {
    log("ERROR: .output/server directory not found!");
    process.exit(1);
  }

  process.chdir(serverDir);
  log(`Changed directory to: ${process.cwd()}`);

  log("Running 'npm install --omit=dev'...");
  // Using --omit=dev to speed it up and avoid needing dev modules
  // Redirect stderr to stdout to see errors in main log
  const output = execSync("npm install --omit=dev", { encoding: "utf8" });
  log(output);

  log("-----------------------------------------");
  log("✅ REBUILD COMPLETE SUCCESS");
  log("-----------------------------------------");
  log("NOW: Change Startup File back to .output/server/index.mjs");
} catch (error) {
  log("-----------------------------------------");
  log("❌ REBUILD FAILED");
  log(error.message);
  if (error.stdout) log("STDOUT: " + error.stdout);
  if (error.stderr) log("STDERR: " + error.stderr);
  log("-----------------------------------------");
}

// Keep process alive so Plesk sees it as "running" long enough to read logs
setInterval(() => {}, 10000);
