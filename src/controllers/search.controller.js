const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const searchService = require('../services/search.service');
const postService = require('../services/post.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');

const search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  const results = await searchService.searchAll(q, { type });
  const posts = await postService.attachViewerContext(results.posts, req.user && req.user.id);
  sendSuccess(res, { ...results, posts: posts.map(shapeAuthorField) });
});

module.exports = { search };
