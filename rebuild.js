// This script is meant to be run ONCE by Plesk to fix dependencies.
// CommonJS version for maximum compatibility

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Helper to log to file
const logFile = path.resolve(__dirname, "../rebuild_log.txt");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
}

log("-----------------------------------------");
log("STARTING DEPENDENCY REBUILD (CJS)");
log("-----------------------------------------");

try {
  // Go to the server directory
  // Assuming this script is running from httpdocs/.output/rebuild.js
  // We want to go to httpdocs/.output/server
  const serverDir = path.join(__dirname, "server");

  if (!fs.existsSync(serverDir)) {
    log(`ERROR: Directory not found: ${serverDir}`);
    // Try resolving relative to CWD just in case
    const altDir = path.resolve("./.output/server");
    if (fs.existsSync(altDir)) {
      process.chdir(altDir);
      log(`Recovered: Changed directory to: ${process.cwd()}`);
    } else {
      process.exit(1);
    }
  } else {
    process.chdir(serverDir);
    log(`Changed directory to: ${process.cwd()}`);
  }

  // Determine npm path based on current node executable
  const nodePath = process.execPath; // e.g., /opt/plesk/node/20/bin/node
  const binDir = path.dirname(nodePath);
  let npmPath = path.join(binDir, "npm");

  log(`Node binary: ${nodePath}`);
  log(`Inferred npm path: ${npmPath}`);

  // Verify npm exists there
  if (!fs.existsSync(npmPath)) {
    log("Warning: npm not found at inferred path. Trying global 'npm'...");
    npmPath = "npm"; // Fallback
  }

  log(`Running '${npmPath} install --omit=dev'...`);

  // Use the absolute path to npm
  const output = execSync(`${npmPath} install --omit=dev`, {
    encoding: "utf8",
  });
  log(output);

  log("-----------------------------------------");
  log("✅ REBUILD COMPLETE SUCCESS");
  log("-----------------------------------------");
} catch (error) {
  log("-----------------------------------------");
  log("❌ REBUILD FAILED");
  log(error.message);
  if (error.stdout) log("STDOUT: " + error.stdout);
  if (error.stderr) log("STDERR: " + error.stderr);

  // Log env for debugging
  log("PATH env: " + process.env.PATH);
  log("-----------------------------------------");
}

// Keep process alive
setInterval(() => {}, 10000);
