/**
 * Wraps an async express route/middleware handler so any rejected promise
 * or thrown error is forwarded to next(err) instead of crashing the process
 * or requiring a try/catch in every controller.
 * @param {Function} fn - (req, res, next) => Promise<any>
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
