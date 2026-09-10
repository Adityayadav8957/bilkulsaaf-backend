const Post = require('../models/Post');
const { parseLimit, decodeCursor, encodeCursor } = require('../utils/pagination');

/**
 * Aggregates active posts grouped by state: postCount, summed voteScore,
 * summed voteCount (both equal upvoteCount — there's no downvote), summed
 * commentCount. Powers the India map view (one bubble per state).
 */
async function aggregateByState() {
  return Post.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$personSnapshot.state',
        postCount: { $sum: 1 },
        voteScore: { $sum: '$voteScore' },
        voteCount: { $sum: '$upvoteCount' },
        commentCount: { $sum: '$commentCount' },
      },
    },
    { $sort: { postCount: -1 } },
    {
      $project: {
        _id: 0,
        state: '$_id',
        postCount: 1,
        voteScore: 1,
        voteCount: 1,
        commentCount: 1,
      },
    },
  ]);
}

/**
 * Drill-down for a single state: same aggregation but grouped by city.
 */
async function aggregateByStateDetail(state) {
  return Post.aggregate([
    { $match: { status: 'active', 'personSnapshot.state': new RegExp(`^${escapeRegex(state)}$`, 'i') } },
    {
      $group: {
        _id: '$personSnapshot.city',
        postCount: { $sum: 1 },
        voteScore: { $sum: '$voteScore' },
        voteCount: { $sum: '$upvoteCount' },
        commentCount: { $sum: '$commentCount' },
      },
    },
    { $sort: { postCount: -1 } },
    {
      $project: {
        _id: 0,
        city: '$_id',
        postCount: 1,
        voteScore: 1,
        voteCount: 1,
        commentCount: 1,
      },
    },
  ]);
}

/**
 * Aggregates active posts for a single city across all states (city names
 * can repeat across states, so this rolls them all up together).
 */
async function aggregateByCity(city) {
  const result = await Post.aggregate([
    { $match: { status: 'active', 'personSnapshot.city': new RegExp(`^${escapeRegex(city)}$`, 'i') } },
    {
      $group: {
        _id: null,
        postCount: { $sum: 1 },
        voteScore: { $sum: '$voteScore' },
        voteCount: { $sum: '$upvoteCount' },
        commentCount: { $sum: '$commentCount' },
      },
    },
    { $project: { _id: 0, postCount: 1, voteScore: 1, voteCount: 1, commentCount: 1 } },
  ]);
  return result[0] || { postCount: 0, voteScore: 0, voteCount: 0, commentCount: 0 };
}

/**
 * Cursor-paginated index of every distinct city with at least one active
 * post, aggregated across all states (mirrors aggregateByCity's rollup: city
 * names can repeat across states, so this is keyed by city name alone, not
 * state+city pairs). Powers the /cities SEO index page and its sitemap,
 * since there is otherwise no endpoint enumerating every city.
 */
async function aggregateCitiesIndex({ cursor, limit }) {
  const lim = parseLimit(limit);
  const decoded = decodeCursor(cursor);

  const pipeline = [
    { $match: { status: 'active', 'personSnapshot.city': { $nin: ['', null] } } },
    {
      $group: {
        _id: '$personSnapshot.city',
        postCount: { $sum: 1 },
        voteScore: { $sum: '$voteScore' },
        voteCount: { $sum: '$upvoteCount' },
        commentCount: { $sum: '$commentCount' },
      },
    },
  ];

  if (decoded) {
    pipeline.push({
      $match: {
        $or: [
          { postCount: { $lt: decoded.v } },
          { postCount: decoded.v, _id: { $lt: decoded.id } },
        ],
      },
    });
  }

  pipeline.push({ $sort: { postCount: -1, _id: -1 } }, { $limit: lim + 1 });

  const rows = await Post.aggregate(pipeline);
  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].postCount, page[page.length - 1]._id)
      : null;

  const items = page.map((r) => ({
    city: r._id,
    postCount: r.postCount,
    voteScore: r.voteScore,
    voteCount: r.voteCount,
    commentCount: r.commentCount,
  }));

  return { items, nextCursor };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  aggregateByState,
  aggregateByStateDetail,
  aggregateByCity,
  aggregateCitiesIndex,
};
