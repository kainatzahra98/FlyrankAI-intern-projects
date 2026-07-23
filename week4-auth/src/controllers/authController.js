'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb } = require('../db/database');

const BCRYPT_ROUNDS  = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const JWT_SECRET     = process.env.JWT_SECRET     || 'fallback-secret-not-for-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Username is required.';
  if (u.length < 3 || u.length > 30) return 'Username must be 3–30 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Username may only contain letters, numbers and underscores.';
  return null;
}

function validateEmail(e) {
  if (!e || typeof e !== 'string') return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Invalid email address.';
  return null;
}

function validatePassword(p) {
  if (!p || typeof p !== 'string') return 'Password is required.';
  if (p.length < 8)       return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(p))   return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(p))   return 'Password must contain at least one number.';
  return null;
}

// ─── Register ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Body: { username, email, password }
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    const errors = [
      validateUsername(username),
      validateEmail(email),
      validatePassword(password),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed.', details: errors });
    }

    const db = getDb();
    const cleanUsername = username.trim();
    const cleanEmail    = email.trim().toLowerCase();

    // Check for duplicates
    const existing = db.findOne(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() ||
        u.email === cleanEmail
    );

    if (existing) {
      return res.status(409).json({ error: 'Username or email is already registered.' });
    }

    // Hash the password — bcrypt adds a random salt automatically
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = db.insert({ username: cleanUsername, email: cleanEmail, password: hash });

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Body: { usernameOrEmail, password }
 */
async function login(req, res, next) {
  try {
    const { usernameOrEmail, password } = req.body || {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'usernameOrEmail and password are required.' });
    }

    const db   = getDb();
    const term = usernameOrEmail.trim().toLowerCase();

    const user = db.findOne(
      (u) => u.username.toLowerCase() === term || u.email === term
    );

    // Constant-time comparison even for "user not found" — prevents timing attacks
    const dummyHash = '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const isValid   = await bcrypt.compare(password, user ? user.password : dummyHash);

    if (!user || !isValid) {
      // Deliberately vague: don't reveal which field was wrong
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      message:   'Login successful.',
      token,
      expiresIn: JWT_EXPIRES_IN,
      user:      payload,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
