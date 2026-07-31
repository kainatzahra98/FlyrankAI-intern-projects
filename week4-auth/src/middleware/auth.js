'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-not-for-production';

/**
 * authenticateToken – Express middleware that validates a Bearer JWT.
 *
 * Sends:
 *   401 – no token present (unauthenticated)
 *   403 – token present but invalid or expired (forbidden)
 *
 * On success, attaches `req.user` = { id, username, email, role }
 * and calls next().
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Authorization: Bearer <token>
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorised',
      message: 'No token provided. Please log in and include the Bearer token.',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach only safe fields — never expose the hash
    req.user = {
      id:       payload.id,
      username: payload.username,
      email:    payload.email,
      role:     payload.role,
    };
    next();
  } catch (err) {
    // TokenExpiredError vs JsonWebTokenError are both 403 here —
    // the token was presented but is not trustworthy.
    return res.status(403).json({
      error: 'Forbidden',
      message: err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid token. Please log in again.',
    });
  }
}

/**
 * requireRole – factory that returns middleware enforcing a minimum role.
 * Usage: router.get('/admin', authenticateToken, requireRole('admin'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorised', message: 'Not authenticated.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This route requires the "${role}" role. You have "${req.user.role}".`,
      });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };
