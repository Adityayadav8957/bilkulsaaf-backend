const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const postService = require('../services/post.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');

const create = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user.id, req.body);
  await post.populate('author', 'anonymousIdentity');
  sendSuccess(res, shapeAuthorField(post.toObject()), 201);
});

const getOne = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id, req.user && req.user.id);
  sendSuccess(res, shapeAuthorField(post));
});

const feed = asyncHandler(async (req, res) => {
  const { sort, state, city, personId, cursor, limit } = req.query;
  const { items, nextCursor } = await postService.listFeed(
    { sort, state, city, personId, cursor, limit },
    req.user && req.user.id
  );
  sendSuccess(res, { items: items.map(shapeAuthorField), nextCursor });
});

const update = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(req.params.id, req.user.id, req.body);
  await post.populate('author', 'anonymousIdentity');
  sendSuccess(res, shapeAuthorField(post.toObject()));
});

const remove = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user.id, req.user.role);
  sendSuccess(res, { deleted: true });
});

const save = asyncHandler(async (req, res) => {
  await postService.savePost(req.params.id, req.user.id);
  sendSuccess(res, { saved: true }, 201);
});

const unsave = asyncHandler(async (req, res) => {
  await postService.unsavePost(req.params.id, req.user.id);
  sendSuccess(res, { saved: false });
});

module.exports = { create, getOne, feed, update, remove, save, unsave };
