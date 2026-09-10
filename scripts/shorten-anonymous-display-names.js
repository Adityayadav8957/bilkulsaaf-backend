/**
 * One-time (idempotent) backfill: rewrites `anonymousIdentity.displayName`
 * from the old "Anonymous Citizen #N" form to the shorter "Genz #N",
 * matching what new signups now get (see anonymousIdentity.service.js).
 * Safe to re-run — users already on the short form are skipped.
 *
 * Usage:
 *   node scripts/shorten-anonymous-display-names.js
 */
const mongoose = require('mongoose');
const { config } = require('../src/config/env');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(config.mongodbUri);
  try {
    const cursor = User.find({
      'anonymousIdentity.displayName': /^Anonymous Citizen #/,
    }).cursor();

    let count = 0;
    // eslint-disable-next-line no-restricted-syntax
    for await (const user of cursor) {
      user.anonymousIdentity.displayName = `Genz #${user.anonymousIdentity.number}`;
      // eslint-disable-next-line no-await-in-loop
      await user.save();
      count += 1;
    }
    // eslint-disable-next-line no-console
    console.log(`[shorten-anonymous-display-names] done — users updated: ${count}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[shorten-anonymous-display-names] failed:', err);
  process.exit(1);
});
