const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');

/**
 * 404 handler — mounted after all routes.
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

/**
 * Centralized error handler. Normalizes any thrown/forwarded error into the
 * consistent { success:false, error:{ message, code } } envelope and never
 * leaks stack traces or raw Mongo internals in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details;

  if (err && err.isApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err && err.code === 11000) {
    // Mongo duplicate key error that slipped through without being
    // pre-handled by a service — convert to a friendly 409.
    statusCode = 409;
    message = 'A resource with these unique attributes already exists';
    code = 'DUPLICATE_KEY';
  } else if (err && err.name === 'ValidationError') {
    // Mongoose schema validation error
    statusCode = 400;
    message = err.message;
    code = 'VALIDATION_ERROR';
  } else if (err && err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
    code = 'INVALID_ID';
  } else if (err && err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (err && err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err && err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
    code = 'PAYLOAD_TOO_LARGE';
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    code = 'MALFORMED_JSON';
  } else if (err && typeof err.message === 'string' && err.message) {
    message = err.message;
  }

  if (config.nodeEnv !== 'production' && statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const errorBody = { message, code };
  if (details !== undefined) errorBody.details = details;

  res.status(statusCode).json({
    success: false,
    error: errorBody,
  });
}

module.exports = { notFoundHandler, errorHandler };
