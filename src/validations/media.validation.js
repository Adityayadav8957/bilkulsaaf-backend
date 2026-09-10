const { body } = require('express-validator');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

const uploadUrlValidation = [
  body('fileName').trim().notEmpty().withMessage('fileName is required').isLength({ max: 255 }),
  body('contentType')
    .trim()
    .notEmpty()
    .withMessage('contentType is required')
    .isIn(ALLOWED_CONTENT_TYPES)
    .withMessage(`contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`),
];

module.exports = { uploadUrlValidation, ALLOWED_CONTENT_TYPES };
