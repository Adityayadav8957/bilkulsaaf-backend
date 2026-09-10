const sanitizeHtml = require('sanitize-html');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');

function sanitizeText(text) {
  return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Creates a report against a post or comment. Enforces one report per user
 * per target via the unique compound index — a duplicate attempt is caught
 * (Mongo error code 11000) and converted into a friendly 409 rather than
 * crashing.
 */
async function createReport(userId, { targetType, targetId, reason }) {
  if (!mongoose.isValidObjectId(targetId)) {
    throw ApiError.badRequest('Invalid targetId', 'INVALID_TARGET_ID');
  }

  if (targetType === 'post') {
    const post = await Post.findById(targetId);
    if (!post || post.status === 'removed') {
      throw ApiError.notFound('Post not found', 'POST_NOT_FOUND');
    }
  } else if (targetType === 'comment') {
    const comment = await Comment.findById(targetId);
    if (!comment || comment.status === 'deleted') {
      throw ApiError.notFound('Comment not found', 'COMMENT_NOT_FOUND');
    }
  } else {
    throw ApiError.badRequest('targetType must be post or comment', 'INVALID_TARGET_TYPE');
  }

  let report;
  try {
    report = await Report.create({
      targetType,
      targetId,
      reportedBy: userId,
      reason: sanitizeText(reason),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      throw ApiError.conflict('You have already reported this', 'ALREADY_REPORTED');
    }
    throw err;
  }

  if (targetType === 'post') {
    await Post.updateOne({ _id: targetId }, { $inc: { reportCount: 1 } });
  }

  return report;
}

module.exports = { createReport };
