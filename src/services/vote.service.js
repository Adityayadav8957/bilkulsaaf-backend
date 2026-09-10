const Post = require('../models/Post');
const Vote = require('../models/Vote');
const ApiError = require('../utils/ApiError');
const { adjustPersonStats } = require('./person.service');
const { refreshTrendingScore } = require('./post.service');
const { getPostRawById } = require('./post.service');

/**
 * Casts or toggles-off an upvote on a post (downvoting doesn't exist here).
 *
 * - No prior vote -> creates it, increments upvoteCount and voteScore.
 * - Prior vote -> toggle off: deletes the vote, reverses the increment.
 *
 * After adjusting Post counters, recomputes trendingScore.
 * @returns {Promise<{upvoteCount:number, voteScore:number, myVote:number}>}
 */
async function castVote(postId, userId, value) {
  const post = await getPostRawById(postId);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }

  const existing = await Vote.findOne({ post: postId, user: userId });

  let inc;
  let myVote = value;
  let personVoteDelta;

  if (!existing) {
    await Vote.create({ post: postId, user: userId, value });
    inc = { upvoteCount: 1, voteScore: 1 };
    personVoteDelta = 1;
  } else {
    // Toggle off
    await Vote.deleteOne({ _id: existing._id });
    inc = { upvoteCount: -1, voteScore: -1 };
    myVote = 0;
    personVoteDelta = -1;
  }

  const updated = await Post.findByIdAndUpdate(
    postId,
    { $inc: inc },
    { new: true }
  ).select('upvoteCount voteScore person createdAt');

  await refreshTrendingScore(postId);

  if (personVoteDelta !== 0) {
    await adjustPersonStats(updated.person, { totalVotes: personVoteDelta });
  }

  return {
    upvoteCount: updated.upvoteCount,
    voteScore: updated.voteScore,
    myVote,
  };
}

module.exports = { castVote };
