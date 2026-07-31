'use strict';

/**
 * Public Routes — Stage 2
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /public/info — no authentication required
 */

const { Router } = require('express');

const router = Router();

// ── GET /public/info ──────────────────────────────────────────────────────────
/**
 * @openapi
 * /public/info:
 *   get:
 *     tags: [Public]
 *     summary: Public endpoint — no authentication required
 *     responses:
 *       200:
 *         description: Public message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 */
router.get('/info', (req, res) => {
  return res.status(200).json({
    message: 'Welcome stranger! This info is public.',
  });
});

module.exports = router;
