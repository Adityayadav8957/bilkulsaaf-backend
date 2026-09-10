/**
 * Seeds the dev database with realistic demo content (the same sample
 * people/posts used in the Design / prototypes) so the frontend has enough
 * real data to look like a populated product instead of an empty shell.
 *
 * Idempotent-ish: re-running adds a fresh copy of each post (Person dedup via
 * slugKey still applies, so the same six people are reused, not duplicated),
 * so prefer running it once against a fresh dev DB.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 */
const mongoose = require('mongoose');
const { config } = require('../src/config/env');
const User = require('../src/models/User');
const Post = require('../src/models/Post');
const Person = require('../src/models/Person');
const Comment = require('../src/models/Comment');
const authService = require('../src/services/auth.service');
const postService = require('../src/services/post.service');
const { computeTrendingScore } = require('../src/services/trending.service');

const DEMO_EMAIL = 'demo-seed@definitelynotcorrupt.local';
const DEMO_PASSWORD = 'seed-demo-password-not-real-123';

const SEED_POSTS = [
  {
    personName: 'R. Venkatraman',
    designation: 'Municipal Commissioner',
    organization: 'Chennai Corporation',
    state: 'Tamil Nadu',
    city: 'Chennai',
    description:
      'The man earns ₹68,000 a month and just built a house with a lift in it. A lift. For two floors. Truly a saver.',
    media: [
      { url: 'https://picsum.photos/seed/dnc-venkat/900/600', key: 'seed/venkat.jpg', type: 'image', size: 140000 },
    ],
    upvoteCount: 1284,
    commentCount: 412,
    comments: [
      'This tracks. My cousin works in that department.',
      'Definitely not corrupt, just... generously compensated in vibes.',
      'Source? Asking for factual, definitely-not-legal reasons.',
    ],
  },
  {
    personName: 'Sunita Deshmukh',
    designation: 'RTO Officer',
    organization: 'Transport Department',
    state: 'Maharashtra',
    city: 'Nagpur',
    description:
      'Asked for my documents twice, then asked what else I had. I said hope. She did not accept hope.',
    upvoteCount: 402,
    commentCount: 288,
  },
  {
    personName: 'Bhupendra Yadav',
    designation: 'Assistant Engineer',
    organization: 'PWD, Lucknow Division',
    state: 'Uttar Pradesh',
    city: 'Lucknow',
    description:
      "Absolutely one of the most definitely-not-corrupt people we've ever seen. The road he built lasted a full nine days.",
    media: [
      { url: 'https://picsum.photos/seed/dnc-road/900/600', key: 'seed/road.jpg', type: 'image', size: 130000 },
    ],
    upvoteCount: 96,
    commentCount: 903,
  },
  {
    personName: 'Dr. Meera Nair',
    designation: 'Medical Superintendent',
    organization: 'District General Hospital',
    state: 'Kerala',
    city: 'Kochi',
    description: 'The ward has one working fan and a brand new cabin AC. Priorities, clearly, are for patients.',
    upvoteCount: 610,
    commentCount: 176,
  },
  {
    personName: 'Karan Bhatia',
    designation: 'Tehsildar',
    organization: 'Revenue Department',
    state: 'Punjab',
    city: 'Ludhiana',
    description:
      "Mutation took eleven months. His cousin's took eleven minutes. Bureaucracy simply runs faster in the family.",
    media: [{ url: 'https://picsum.photos/seed/dnc-receipt/900/600', key: 'seed/receipt.jpg', type: 'document', size: 52000 }],
    upvoteCount: 233,
    commentCount: 341,
  },
  {
    personName: 'S. Ramakrishnan',
    designation: 'Building Inspector',
    organization: 'Greater Hyderabad MC',
    state: 'Telangana',
    city: 'Hyderabad',
    description: 'Approved a four-storey building on a two-storey plan. Structural engineering by vibes alone.',
    upvoteCount: 158,
    commentCount: 219,
  },
];

async function ensureDemoUser() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) return existing;
  return authService.register(DEMO_EMAIL, DEMO_PASSWORD);
}

async function seedPost(authorId, seed) {
  const { upvoteCount, commentCount, comments, ...payload } = seed;

  const post = await postService.createPost(authorId, payload);
  const voteScore = upvoteCount;
  const trendingScore = computeTrendingScore(voteScore, post.createdAt);

  await Post.updateOne(
    { _id: post._id },
    { $set: { upvoteCount, voteScore, commentCount, trendingScore } }
  );
  await Person.updateOne(
    { _id: post.person },
    { $inc: { 'stats.totalVotes': upvoteCount, 'stats.totalComments': commentCount } }
  );

  if (Array.isArray(comments)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const content of comments) {
      // eslint-disable-next-line no-await-in-loop
      await Comment.create({ post: post._id, author: authorId, content });
    }
  }

  return post;
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  try {
    const user = await ensureDemoUser();
    // eslint-disable-next-line no-restricted-syntax
    for (const seed of SEED_POSTS) {
      // eslint-disable-next-line no-await-in-loop
      const post = await seedPost(user._id, seed);
      // eslint-disable-next-line no-console
      console.log(`seeded: ${seed.personName} -> /posts/${post.slug}`);
    }
    // eslint-disable-next-line no-console
    console.log(`\ndone — seeded ${SEED_POSTS.length} posts as ${user.anonymousIdentity.displayName}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed-demo-data] failed:', err);
  process.exit(1);
});
