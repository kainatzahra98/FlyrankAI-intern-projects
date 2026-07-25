'use strict';

/**
 * Protected Routes — Stage 2, 3, 4
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes here use the requireAuth middleware — they auto-reject
 * missing, malformed, or expired tokens with 401.
 *
 * GET /protected/profile    — return verified user's profile data
 * GET /protected/dashboard  — bonus route (Stage 4 checkpoint)
 */

const { Router }    = require('express');
const requireAuth   = require('../middleware/requireAuth');

const router = Router();

// Apply auth middleware to ALL routes in this router
router.use(requireAuth);

// ── GET /protected/profile ────────────────────────────────────────────────────
/**
 * @openapi
 * /protected/profile:
 *   get:
 *     tags: [Protected]
 *     summary: Get authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User profile returned }
 *       401: { description: Missing or invalid token }
 */
router.get('/profile', (req, res) => {
  const { id, email, created_at, email_confirmed_at, last_sign_in_at } = req.user;

  return res.status(200).json({
    message: 'Access granted. Here is your profile.',
    user: {
      id,
      email,
      created_at,
      email_confirmed_at,
      last_sign_in_at,
    },
  });
});

// ── GET /protected/dashboard ──────────────────────────────────────────────────
/**
 * @openapi
 * /protected/dashboard:
 *   get:
 *     tags: [Protected]
 *     summary: Bonus protected dashboard (Stage 4 checkpoint)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Dashboard data }
 *       401: { description: Missing or invalid token }
 */
router.get('/dashboard', (req, res) => {
  return res.status(200).json({
    message:   `Welcome to your dashboard, ${req.user.email}!`,
    user_id:   req.user.id,
    timestamp: new Date().toISOString(),
    stats: {
      routes_protected: 2,
      auth_method:      'Supabase JWT',
    },
  });
});

module.exports = router;
