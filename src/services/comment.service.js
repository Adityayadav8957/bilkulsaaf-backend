const sanitizeHtml = require('sanitize-html');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const CommentVote = require('../models/CommentVote');
const Post = require('../models/Post');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parseLimit, decodeCursor, encodeCursor } = require('../utils/pagination');
const { adjustPersonStats } = require('./person.service');
const { getPostRawById } = require('./post.service');

function sanitizeText(text) {
  return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Creates a top-level comment or a reply (when parentCommentId is given).
 * Keeps Post.commentCount, Person.stats.totalComments, parent's replyCount,
 * and User.commentsCount in sync.
 */
async function createComment(userId, { postId, content, parentCommentId }) {
  const post = await getPostRawById(postId);
  if (!post || post.status === 'removed') {
    throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
  }

  let parent = null;
  if (parentCommentId) {
    parent = await Comment.findById(parentCommentId);
    if (!parent || parent.status === 'deleted' || parent.post.toString() !== postId) {
      throw ApiError.notFound('Parent comment not found', 'PARENT_COMMENT_NOT_FOUND');
    }
  }

  const comment = await Comment.create({
    post: postId,
    author: userId,
    parentComment: parentCommentId || null,
    content: sanitizeText(content),
  });

  const ops = [
    Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }),
    User.updateOne({ _id: userId }, { $inc: { commentsCount: 1 } }),
    adjustPersonStats(post.person, { totalComments: 1 }),
  ];
  if (parent) {
    ops.push(Comment.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } }));
  }
  await Promise.all(ops);

  return comment;
}

/**
 * Soft-deletes a comment (status='deleted'). Author-only. Content is
 * cleared from the response by the controller/response-shaping layer.
 */
async function softDeleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.status === 'deleted') {
    throw ApiError.notFound('Comment not found', 'COMMENT_NOT_FOUND');
  }
  if (comment.author.toString() !== userId) {
    throw ApiError.forbidden('You can only delete your own comments', 'NOT_COMMENT_AUTHOR');
  }
  comment.status = 'deleted';
  await comment.save();
  await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });
  return comment;
}

/**
 * Paginated top-level comments (parentComment: null) for a post, newest
 * first, each carrying its own replyCount.
 */
async function listComments(postId, { cursor, limit }, viewerId) {
  const lim = parseLimit(limit);
  const filter = { post: postId, parentComment: null, status: 'active' };

  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = new Date(decoded.v);
    filter.$or = [
      { createdAt: { $lt: cursorValue } },
      { createdAt: cursorValue, _id: { $lt: decoded.id } },
    ];
  }

  const comments = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(lim + 1)
    .populate('author', 'anonymousIdentity')
    .lean();

  const hasMore = comments.length > lim;
  const page = hasMore ? comments.slice(0, lim) : comments;
  const enriched = await attachViewerVotes(page, viewerId);

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1]._id)
      : null;

  return { items: enriched, nextCursor };
}

/**
 * Paginated replies of a single comment, oldest first (conversational order).
 */
async function listReplies(parentCommentId, { cursor, limit }, viewerId) {
  const lim = parseLimit(limit);
  const filter = { parentComment: parentCommentId, status: 'active' };

  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = new Date(decoded.v);
    filter.$or = [
      { createdAt: { $gt: cursorValue } },
      { createdAt: cursorValue, _id: { $gt: decoded.id } },
    ];
  }

  const replies = await Comment.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(lim + 1)
    .populate('author', 'anonymousIdentity')
    .lean();

  const hasMore = replies.length > lim;
  const page = hasMore ? replies.slice(0, lim) : replies;
  const enriched = await attachViewerVotes(page, viewerId);

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1]._id)
      : null;

  return { items: enriched, nextCursor };
}

/** Cursor-paginated comments authored by an account, newest first. */
async function listCommentsByAuthor(userId, { cursor, limit }) {
  const lim = parseLimit(limit);
  const filter = { author: userId, status: 'active' };
  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorValue = new Date(decoded.v);
    filter.$or = [
      { createdAt: { $lt: cursorValue } },
      { createdAt: cursorValue, _id: { $lt: decoded.id } },
    ];
  }

  const comments = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(lim + 1)
    .populate('post', 'slug personSnapshot status')
    .lean();

  const hasMore = comments.length > lim;
  const page = (hasMore ? comments.slice(0, lim) : comments).filter(
    (comment) => comment.post && comment.post.status === 'active'
  );
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1]._id)
      : null;

  return { items: page, nextCursor };
}

async function attachViewerVotes(comments, viewerId) {
  if (!viewerId || comments.length === 0) return comments;
  const ids = comments.map((c) => c._id);
  const votes = await CommentVote.find({ comment: { $in: ids }, user: viewerId }).lean();
  const voteByComment = new Map(votes.map((v) => [v.comment.toString(), v.value]));
  return comments.map((c) => ({ ...c, myVote: voteByComment.get(c._id.toString()) || 0 }));
}

/**
 * Casts or toggles-off an upvote on a comment (downvoting doesn't exist here).
 */
async function castCommentVote(commentId, userId, value) {
  if (!mongoose.isValidObjectId(commentId)) {
    throw ApiError.notFound('Comment not found', 'COMMENT_NOT_FOUND');
  }
  const comment = await Comment.findById(commentId);
  if (!comment || comment.status === 'deleted') {
    throw ApiError.notFound('Comment not found', 'COMMENT_NOT_FOUND');
  }

  const existing = await CommentVote.findOne({ comment: commentId, user: userId });
  let delta;
  let myVote = value;

  if (!existing) {
    await CommentVote.create({ comment: commentId, user: userId, value });
    delta = value;
  } else {
    await CommentVote.deleteOne({ _id: existing._id });
    delta = -value;
    myVote = 0;
  }

  const updated = await Comment.findByIdAndUpdate(
    commentId,
    { $inc: { upvoteCount: delta } },
    { new: true }
  ).select('upvoteCount');

  return { upvoteCount: updated.upvoteCount, myVote };
}

module.exports = {
  createComment,
  softDeleteComment,
  listComments,
  listReplies,
  listCommentsByAuthor,
  castCommentVote,
};
