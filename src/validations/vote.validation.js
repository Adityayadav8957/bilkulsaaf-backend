const { body, param } = require('express-validator');

const castVoteValidation = [
  param('id').isMongoId().withMessage('Invalid target id'),
  body('value').isIn([1]).withMessage('value must be 1'),
];

module.exports = { castVoteValidation };
