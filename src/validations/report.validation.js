const { body } = require('express-validator');

const createReportValidation = [
  body('targetType').isIn(['post', 'comment']).withMessage('targetType must be post or comment'),
  body('targetId').isMongoId().withMessage('Valid targetId is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('reason is required')
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters'),
];

module.exports = { createReportValidation };
