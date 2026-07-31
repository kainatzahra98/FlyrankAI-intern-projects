'use strict';

/**
 * Central Express error handler.
 * Catches anything passed to next(err).
 */
function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.message);

  // Validation errors from our own code use err.status
  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error.';

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
