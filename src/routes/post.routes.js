const express = require('express');
const postController = require('../controllers/post.controller');
const { requireAuth, attachUserIfPresent } = require('../middleware/auth.middleware');
const { writeLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  createPostValidation,
  updatePostValidation,
  postIdParamValidation,
  postIdOrSlugParamValidation,
  feedQueryValidation,
} = require('../validations/post.validation');

const router = express.Router();

router.post('/', requireAuth, writeLimiter, createPostValidation, validate, postController.create);
router.get('/', feedQueryValidation, validate, attachUserIfPresent, postController.feed);
router.get(
  '/:id',
  postIdOrSlugParamValidation,
  validate,
  attachUserIfPresent,
  postController.getOne
);
router.patch(
  '/:id',
  requireAuth,
  writeLimiter,
  updatePostValidation,
  validate,
  postController.update
);
router.delete('/:id', requireAuth, postIdParamValidation, validate, postController.remove);
router.post(
  '/:id/save',
  requireAuth,
  writeLimiter,
  postIdParamValidation,
  validate,
  postController.save
);
router.delete('/:id/save', requireAuth, postIdParamValidation, validate, postController.unsave);

module.exports = router;
