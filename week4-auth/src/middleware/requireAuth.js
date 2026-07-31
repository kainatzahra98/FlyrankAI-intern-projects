'use strict';

/**
 * requireAuth — Middleware Guard (Stage 4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts the Bearer token from the Authorization header,
 * verifies it with Supabase, and attaches req.user for downstream handlers.
 *
 * Sends:
 *   401  — header missing, malformed, or token invalid/expired
 *
 * On success: calls next() with req.user populated.
 */

const supabase = require('../supabaseClient');

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  // Must be exactly: Authorization: Bearer <token>
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.slice(7).trim(); // strip "Bearer "

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify token with Supabase — this also checks expiry
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach the verified user to the request for route handlers
  req.user  = data.user;
  req.token = token; // needed for logout
  next();
}

module.exports = requireAuth;
