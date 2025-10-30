#!/usr/bin/env node
import { main } from '../src/build.js';

// Simple CLI wrapper
(async () => {
  try {
    await main(process.argv.slice(2));
  } catch (err) {
    console.error('[ob] Error:', err && err.stack || err);
    process.exit(1);
  }
})();
