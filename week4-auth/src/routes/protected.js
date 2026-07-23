'use strict';

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getMe, getSecret, getAdmin } = require('../controllers/protectedController');

const router = express.Router();

// All routes below require a valid JWT
router.use(authenticateToken);

// GET /api/me  – any authenticated user
router.get('/me', getMe);

// GET /api/secret  – any authenticated user
router.get('/secret', getSecret);

// GET /api/admin  – only users with role 'admin'
router.get('/admin', requireRole('admin'), getAdmin);

module.exports = router;
