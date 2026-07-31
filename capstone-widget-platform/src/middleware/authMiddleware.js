'use strict';

/**
 * Authentication Middleware (Admin / Tenant Isolation)
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies JWT token in `Authorization: Bearer <token>` header.
 * Attaches `req.user = { id, email, company }` for downstream handlers.
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-capstone-jwt-key-2026';

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing or malformed Bearer token.' });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, company }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
