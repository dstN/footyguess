// This file is the entry point for Plesk.
// It imports the actual Nitro server built by Nuxt.
// We name it 'plesk_entry.js' locally to avoid conflicts,
// but it will be deployed as 'app.js'.

import("./server/index.mjs").catch((err) => {
  console.error("Failed to load Nuxt server:", err);
  process.exit(1);
});
