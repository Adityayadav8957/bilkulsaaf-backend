const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Comment = require('../models/Comment');
const SavedPost = require('../models/SavedPost');
const Vote = require('../models/Vote');
const postService = require('../services/post.service');
const commentService = require('../services/comment.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');
const { parseLimit } = require('../utils/pagination');

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+email');
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }
  sendSuccess(res, user.toPrivateJSON());
});

const getMySavedPosts = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const { items, nextCursor } = await postService.listSavedPosts(req.user.id, { cursor, limit });
  const shaped = items.map((s) => ({ savedAt: s.savedAt, post: shapeAuthorField(s.post) }));
  sendSuccess(res, { items: shaped, nextCursor });
});

const getMyPosts = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await postService.listPostsByAuthor(req.user.id, { cursor, limit }, req.user.id);
  sendSuccess(res, { ...result, items: result.items.map(shapeAuthorField) });
});

const getMyComments = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const { items, nextCursor } = await commentService.listCommentsByAuthor(req.user.id, { cursor, limit });
  sendSuccess(res, {
    items: items.map((comment) => ({
      _id: comment._id,
      post: comment.post,
      parentComment: comment.parentComment,
      content: comment.content,
      upvoteCount: comment.upvoteCount,
      replyCount: comment.replyCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })),
    nextCursor,
  });
});

/** A single chronological feed of the signed-in user's own actions. */
const getMyActivity = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const userId = req.user.id;
  const [posts, comments, saves, votes] = await Promise.all([
    postService.listPostsByAuthor(userId, { limit }, userId),
    commentService.listCommentsByAuthor(userId, { limit }),
    SavedPost.find({ user: userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({ path: 'post', match: { status: 'active' }, populate: { path: 'author', select: 'anonymousIdentity' } })
      .lean(),
    Vote.find({ user: userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({ path: 'post', match: { status: 'active' }, populate: { path: 'author', select: 'anonymousIdentity' } })
      .lean(),
  ]);

  const events = [
    ...posts.items.map((post) => ({ type: 'post', createdAt: post.createdAt, post: shapeAuthorField(post) })),
    ...comments.items.map((comment) => ({ type: 'comment', createdAt: comment.createdAt, post: comment.post, content: comment.content })),
    ...saves
      .filter((save) => save.post)
      .map((save) => ({ type: 'saved', createdAt: save.createdAt, post: shapeAuthorField(save.post) })),
    ...votes
      .filter((vote) => vote.post)
      .map((vote) => ({ type: 'vote', createdAt: vote.createdAt, post: shapeAuthorField(vote.post) })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  sendSuccess(res, { items: events });
});

/**
 * Optional public profile lookup by anonymous citizen number, e.g. 48291.
 * Exposes only aggregate counters — never email/id.
 */
const getPublicAnonymousProfile = asyncHandler(async (req, res) => {
  const number = parseInt(req.params.number, 10);
  if (Number.isNaN(number)) {
    throw ApiError.badRequest('Invalid anonymous citizen number', 'INVALID_NUMBER');
  }
  const user = await User.findOne({ 'anonymousIdentity.number': number });
  if (!user) {
    throw ApiError.notFound('Anonymous citizen not found', 'CITIZEN_NOT_FOUND');
  }
  sendSuccess(res, {
    displayName: user.anonymousIdentity.displayName,
    number: user.anonymousIdentity.number,
    postsCount: user.postsCount,
    commentsCount: user.commentsCount,
    memberSince: user.createdAt,
  });
});

module.exports = {
  getMyProfile,
  getMyPosts,
  getMyComments,
  getMySavedPosts,
  getMyActivity,
  getPublicAnonymousProfile,
};
