const { body, param, query } = require('express-validator');

const createCommentValidation = [
  body('postId').isMongoId().withMessage('Valid postId is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('content is required')
    .isLength({ max: 2000 })
    .withMessage('content must be at most 2000 characters'),
  body('parentCommentId').optional({ checkFalsy: true }).isMongoId(),
];

const listCommentsValidation = [
  query('postId').isMongoId().withMessage('Valid postId is required'),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

const commentIdParamValidation = [param('id').isMongoId().withMessage('Invalid comment id')];

const listRepliesValidation = [
  param('id').isMongoId().withMessage('Invalid comment id'),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

module.exports = {
  createCommentValidation,
  listCommentsValidation,
  commentIdParamValidation,
  listRepliesValidation,
};
