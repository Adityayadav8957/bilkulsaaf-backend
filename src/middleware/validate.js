const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after an express-validator chain array; if any validation failed,
 * throws a 400 ApiError with the collected field errors as `details`.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details));
  }
  next();
}

module.exports = validate;
