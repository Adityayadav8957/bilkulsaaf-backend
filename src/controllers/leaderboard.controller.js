const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const leaderboardService = require('../services/leaderboard.service');
const postService = require('../services/post.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');

async function enrichAndShape(posts, viewerId) {
  const enriched = await postService.attachViewerContext(posts, viewerId);
  return enriched.map(shapeAuthorField);
}

const mostVoted = asyncHandler(async (req, res) => {
  const posts = await leaderboardService.mostVoted(req.query.limit);
  sendSuccess(res, await enrichAndShape(posts, req.user && req.user.id));
});

const mostDiscussed = asyncHandler(async (req, res) => {
  const posts = await leaderboardService.mostDiscussed(req.query.limit);
  sendSuccess(res, await enrichAndShape(posts, req.user && req.user.id));
});

const trending = asyncHandler(async (req, res) => {
  const posts = await leaderboardService.trending(req.query.limit);
  sendSuccess(res, await enrichAndShape(posts, req.user && req.user.id));
});

const mostReported = asyncHandler(async (req, res) => {
  const posts = await leaderboardService.mostReported(req.query.limit);
  sendSuccess(res, await enrichAndShape(posts, req.user && req.user.id));
});

const risingPeople = asyncHandler(async (req, res) => {
  const people = await leaderboardService.risingPeople(req.query.limit);
  sendSuccess(res, people);
});

module.exports = { mostVoted, mostDiscussed, trending, mostReported, risingPeople };
