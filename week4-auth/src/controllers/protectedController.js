'use strict';

const { getDb } = require('../db/database');

/**
 * GET /api/me  – any authenticated user
 */
function getMe(req, res) {
  const user = getDb().findOne((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User no longer exists.' });
  }

  // Never return the password hash
  const { password: _pw, ...safeUser } = user;
  return res.json({ message: 'Here is your profile.', user: safeUser });
}

/**
 * GET /api/secret  – any authenticated user
 */
function getSecret(req, res) {
  return res.json({
    message: '🎉 You are authenticated! Here is the secret data.',
    secret: {
      accessedBy: req.user.username,
      accessedAt: new Date().toISOString(),
      data: [
        { id: 1, value: 'The JWT payload is Base64-encoded, NOT encrypted — never put secrets in it.' },
        { id: 2, value: 'Always store tokens in httpOnly cookies in real browser apps.' },
        { id: 3, value: 'Short expiry + refresh tokens is safer than long-lived tokens.' },
      ],
    },
  });
}

/**
 * GET /api/admin  – admin role only (role guard applied in route)
 */
function getAdmin(req, res) {
  const users = getDb().findAll().map(({ password: _pw, ...u }) => u); // strip hashes
  return res.json({
    message:    '👑 Welcome, admin. Here is the user list.',
    totalUsers: users.length,
    users,
  });
}

module.exports = { getMe, getSecret, getAdmin };
