const Post = require('../models/Post');
const Person = require('../models/Person');

const DEFAULT_LEADERBOARD_LIMIT = 20;
const MAX_LEADERBOARD_LIMIT = 50;

function clampLimit(rawLimit) {
  const n = parseInt(rawLimit, 10);
  if (Number.isNaN(n) || n <= 0) return DEFAULT_LEADERBOARD_LIMIT;
  return Math.min(n, MAX_LEADERBOARD_LIMIT);
}

/**
 * All leaderboards read from existing denormalized counters/indexes on Post
 * and Person — no on-the-fly aggregation over raw Vote/Comment collections.
 */

async function mostVoted(limit) {
  return Post.find({ status: 'active' })
    .sort({ voteScore: -1, _id: -1 })
    .limit(clampLimit(limit))
    .populate('author', 'anonymousIdentity')
    .lean();
}

async function mostDiscussed(limit) {
  return Post.find({ status: 'active' })
    .sort({ commentCount: -1, _id: -1 })
    .limit(clampLimit(limit))
    .populate('author', 'anonymousIdentity')
    .lean();
}

async function trending(limit) {
  return Post.find({ status: 'active' })
    .sort({ trendingScore: -1, _id: -1 })
    .limit(clampLimit(limit))
    .populate('author', 'anonymousIdentity')
    .lean();
}

async function mostReported(limit) {
  return Post.find({ status: 'active', reportCount: { $gt: 0 } })
    .sort({ reportCount: -1, _id: -1 })
    .limit(clampLimit(limit))
    .populate('author', 'anonymousIdentity')
    .lean();
}

async function risingPeople(limit) {
  return Person.find({})
    .sort({ 'stats.totalVotes': -1, 'stats.postsCount': -1, _id: -1 })
    .limit(clampLimit(limit))
    .lean();
}

module.exports = { mostVoted, mostDiscussed, trending, mostReported, risingPeople };
