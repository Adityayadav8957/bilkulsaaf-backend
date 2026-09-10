const { body, param, query } = require('express-validator');

const MEDIA_TYPES = ['image', 'video', 'document'];

const createPostValidation = [
  body('personName').trim().notEmpty().withMessage('personName is required').isLength({ max: 200 }),
  body('designation').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('organization').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('state').trim().notEmpty().withMessage('state is required').isLength({ max: 100 }),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('personPhotoUrl').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('description is required')
    .isLength({ max: 5000 })
    .withMessage('description must be at most 5000 characters'),
  body('media').optional().isArray().withMessage('media must be an array'),
  body('media.*.url').optional().isString().notEmpty(),
  body('media.*.key').optional().isString().notEmpty(),
  body('media.*.type').optional().isIn(MEDIA_TYPES),
  body('media.*.size').optional().isNumeric(),
];

const updatePostValidation = [
  param('id').isMongoId().withMessage('Invalid post id'),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('media').optional().isArray(),
  body('media.*.url').optional().isString().notEmpty(),
  body('media.*.key').optional().isString().notEmpty(),
  body('media.*.type').optional().isIn(MEDIA_TYPES),
  body('media.*.size').optional().isNumeric(),
];

const postIdParamValidation = [param('id').isMongoId().withMessage('Invalid post id')];

// GET /:id is the only route that accepts either a Mongo ObjectId or the
// post's human-readable `slug` (SEO-friendly URLs); mutating routes above
// keep the stricter isMongoId check since callers always have the real _id.
const postIdOrSlugParamValidation = [
  param('id').isString().trim().notEmpty().isLength({ max: 200 }).withMessage('Invalid post id'),
];

const feedQueryValidation = [
  query('sort').optional().isIn(['latest', 'trending', 'popular', 'discussed']),
  query('state').optional().isString().trim(),
  query('city').optional().isString().trim(),
  query('personId').optional().isMongoId(),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

module.exports = {
  createPostValidation,
  updatePostValidation,
  postIdParamValidation,
  postIdOrSlugParamValidation,
  feedQueryValidation,
};
