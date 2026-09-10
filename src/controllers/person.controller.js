const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const personService = require('../services/person.service');
const postService = require('../services/post.service');
const { shapeAuthorField } = require('../utils/shapeAuthor');

const list = asyncHandler(async (req, res) => {
  const { q, state, city, cursor, limit } = req.query;
  const { items, nextCursor } = await personService.listPeople({ q, state, city, cursor, limit });
  sendSuccess(res, { items, nextCursor });
});

const getOne = asyncHandler(async (req, res) => {
  const person = await personService.getPersonById(req.params.id);
  if (!person) {
    throw ApiError.notFound('Person not found', 'PERSON_NOT_FOUND');
  }
  const { cursor, limit } = req.query;
  const { items, nextCursor } = await postService.listFeed(
    { sort: 'latest', personId: req.params.id, cursor, limit },
    req.user && req.user.id
  );
  sendSuccess(res, {
    person,
    posts: { items: items.map(shapeAuthorField), nextCursor },
  });
});

module.exports = { list, getOne };
