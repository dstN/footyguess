// This file is the entry point for Plesk.
// It imports the actual Nitro server built by Nuxt.
const fs = require("fs");
const path = require("path");

const logFile = path.resolve(__dirname, "../startup_log.txt");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
}

log("Attempting to start app.js...");

import("./server/index.mjs")
  .then(() => {
    log("Server imported successfully.");
  })
  .catch((err) => {
    log("CRITICAL ERROR: Failed to load Nuxt server:");
    log(err.stack || err);
    process.exit(1);
  });
