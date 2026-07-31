'use strict';

/**
 * Auth Routes — Stage 1 & 4
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /auth/signup   — register new user
 * POST /auth/login    — authenticate & return JWT
 * POST /auth/logout   — invalidate session (protected)
 */

const { Router } = require('express');
const supabase   = require('../supabaseClient');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// ── POST /auth/signup ─────────────────────────────────────────────────────────
/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "user@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Missing email or password }
 */
router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};

  // Stage 1: Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    message: 'Account created. Check your email to confirm.',
    user: {
      id:         data.user?.id,
      email:      data.user?.email,
      created_at: data.user?.created_at,
    },
  });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "user@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200: { description: JWT access token returned }
 *       400: { description: Missing fields }
 *       401: { description: Invalid credentials }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase returns 400 for bad credentials — we map to 401
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  return res.status(200).json({
    message:       'Login successful.',
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    user: {
      id:    data.user.id,
      email: data.user.email,
    },
  });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and terminate the session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204: { description: Logged out successfully }
 *       401: { description: Invalid or missing token }
 */
router.post('/logout', requireAuth, async (req, res) => {
  // Create a Supabase client with the user's own access token
  // so we sign out exactly that session (not the anon session).
  const { createClient } = require('@supabase/supabase-js');
  const userClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
      global: {
        headers: { Authorization: `Bearer ${req.token}` },
      },
    }
  );

  await userClient.auth.signOut();

  // 204 No Content — successful logout sends no body
  return res.status(204).send();
});

module.exports = router;
