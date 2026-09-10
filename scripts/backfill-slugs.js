/**
 * One-time (idempotent) backfill: assigns a human-readable `slug` to any
 * existing Person/Post documents that don't have one yet (i.e. every
 * document created before the slug field existed). Safe to re-run — docs
 * that already have a slug are skipped.
 *
 * Usage:
 *   node scripts/backfill-slugs.js
 */
const mongoose = require('mongoose');
const { config } = require('../src/config/env');
const Person = require('../src/models/Person');
const Post = require('../src/models/Post');
const { toUrlSlug, ensureUniqueSlug } = require('../src/utils/slug');

async function backfillPeople() {
  const cursor = Person.find({ slug: { $in: [null, undefined] } }).cursor();
  let count = 0;
  // eslint-disable-next-line no-restricted-syntax
  for await (const person of cursor) {
    const baseSlug =
      toUrlSlug(person.name, person.location && person.location.city, person.location && person.location.state) ||
      'citizen';
    // eslint-disable-next-line no-await-in-loop
    person.slug = await ensureUniqueSlug(Person, baseSlug);
    // eslint-disable-next-line no-await-in-loop
    await person.save();
    count += 1;
  }
  return count;
}

async function backfillPosts() {
  const cursor = Post.find({ slug: { $in: [null, undefined] } }).cursor();
  let count = 0;
  // eslint-disable-next-line no-restricted-syntax
  for await (const post of cursor) {
    const baseSlug = toUrlSlug(post.personSnapshot && post.personSnapshot.name) || 'report';
    // eslint-disable-next-line no-await-in-loop
    post.slug = await ensureUniqueSlug(Post, baseSlug, { randomSuffix: true });
    // eslint-disable-next-line no-await-in-loop
    await post.save();
    count += 1;
  }
  return count;
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  try {
    const peopleUpdated = await backfillPeople();
    const postsUpdated = await backfillPosts();
    // eslint-disable-next-line no-console
    console.log(`[backfill-slugs] done — people: ${peopleUpdated}, posts: ${postsUpdated}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backfill-slugs] failed:', err);
  process.exit(1);
});
