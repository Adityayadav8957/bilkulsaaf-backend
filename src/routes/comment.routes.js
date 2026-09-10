const express = require('express');
const commentController = require('../controllers/comment.controller');
const { requireAuth, attachUserIfPresent } = require('../middleware/auth.middleware');
const { writeLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  createCommentValidation,
  listCommentsValidation,
  commentIdParamValidation,
  listRepliesValidation,
} = require('../validations/comment.validation');
const { castVoteValidation } = require('../validations/vote.validation');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  writeLimiter,
  createCommentValidation,
  validate,
  commentController.create
);
router.get('/', listCommentsValidation, validate, attachUserIfPresent, commentController.list);
router.get(
  '/:id/replies',
  listRepliesValidation,
  validate,
  attachUserIfPresent,
  commentController.listReplies
);
router.delete(
  '/:id',
  requireAuth,
  commentIdParamValidation,
  validate,
  commentController.remove
);
router.post(
  '/:id/vote',
  requireAuth,
  writeLimiter,
  castVoteValidation,
  validate,
  commentController.vote
);

module.exports = router;
