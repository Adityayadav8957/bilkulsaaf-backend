const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const commentService = require('../services/comment.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');

const create = asyncHandler(async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  const comment = await commentService.createComment(req.user.id, {
    postId,
    content,
    parentCommentId,
  });
  await comment.populate('author', 'anonymousIdentity');
  sendSuccess(res, shapeAuthorField(comment.toObject()), 201);
});

const remove = asyncHandler(async (req, res) => {
  await commentService.softDeleteComment(req.params.id, req.user.id);
  sendSuccess(res, { deleted: true });
});

const list = asyncHandler(async (req, res) => {
  const { postId, cursor, limit } = req.query;
  const { items, nextCursor } = await commentService.listComments(
    postId,
    { cursor, limit },
    req.user && req.user.id
  );
  sendSuccess(res, { items: items.map(shapeAuthorField), nextCursor });
});

const listReplies = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const { items, nextCursor } = await commentService.listReplies(
    req.params.id,
    { cursor, limit },
    req.user && req.user.id
  );
  sendSuccess(res, { items: items.map(shapeAuthorField), nextCursor });
});

const vote = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const result = await commentService.castCommentVote(req.params.id, req.user.id, value);
  sendSuccess(res, result);
});

module.exports = { create, remove, list, listReplies, vote };
