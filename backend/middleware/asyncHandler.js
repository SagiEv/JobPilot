/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to Express's error middleware via next(err).
 * Eliminates repetitive try/catch blocks in controllers.
 *
 * Usage:  router.get('/', authenticate, asyncHandler(controller.getAll));
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
