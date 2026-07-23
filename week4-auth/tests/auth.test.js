#!/usr/bin/env node
'use strict';

/**
 * Week 4 Auth – Automated Test Suite
 * ─────────────────────────────────────
 * Runs against the live server. Start the server first, then:
 *   node tests/auth.test.js
 *
 * Tests cover:
 *   ✓ Register: success, duplicate, weak password, bad email
 *   ✓ Login: success, wrong password, unknown user
 *   ✓ Protected /api/me: with valid token, no token (401), bad token (403)
 *   ✓ Protected /api/secret: same
 *   ✓ Role guard /api/admin: 403 for regular user
 */

require('dotenv').config();

const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 3000}`;

let passed = 0;
let failed = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...headers,
      },
    };
    const url = new URL(BASE + path);
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, name, got = '') {
  if (condition) {
    console.log(`  ✅  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL  ${name}${got ? `\n        Got: ${JSON.stringify(got)}` : ''}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  📋  ${name}`);
  console.log('─'.repeat(50));
}

// ── Test Runner ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🧪  Week 4 Auth – Test Suite');
  console.log(`    Target: ${BASE}\n`);

  let token = null; // will be filled after a successful login
  const unique = Date.now();
  const TEST_USER = {
    username: `testuser_${unique}`,
    email:    `testuser_${unique}@example.com`,
    password: 'Password123',
  };

  // ── Health check ────────────────────────────────────────────────────────────
  section('Health Check');
  {
    const res = await request('GET', '/health');
    assert(res.status === 200, 'GET /health returns 200', res);
    assert(res.body.status === 'ok', 'Health body has status: ok', res.body);
  }

  // ── Register ────────────────────────────────────────────────────────────────
  section('POST /auth/register');
  {
    // Happy path
    const res = await request('POST', '/auth/register', TEST_USER);
    assert(res.status === 201, 'Register valid user → 201', res);
    assert(res.body.user && res.body.user.username === TEST_USER.username,
      'Response contains username', res.body);
    assert(!res.body.user?.password, 'Response does NOT expose password hash', res.body);

    // Duplicate
    const dup = await request('POST', '/auth/register', TEST_USER);
    assert(dup.status === 409, 'Duplicate registration → 409', dup);

    // Weak password (no uppercase, no number)
    const weak = await request('POST', '/auth/register', {
      username: `weakpw_${unique}`,
      email:    `weakpw_${unique}@example.com`,
      password: 'password',
    });
    assert(weak.status === 400, 'Weak password → 400', weak);

    // Bad email
    const badEmail = await request('POST', '/auth/register', {
      username: `bademail_${unique}`,
      email:    'not-an-email',
      password: 'Password123',
    });
    assert(badEmail.status === 400, 'Invalid email → 400', badEmail);

    // Missing body
    const empty = await request('POST', '/auth/register', {});
    assert(empty.status === 400, 'Empty body → 400', empty);
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  section('POST /auth/login');
  {
    // Correct credentials
    const res = await request('POST', '/auth/login', {
      usernameOrEmail: TEST_USER.username,
      password:        TEST_USER.password,
    });
    assert(res.status === 200, 'Valid login → 200', res);
    assert(typeof res.body.token === 'string', 'Response includes JWT token', res.body);
    assert(res.body.user?.role === 'user', 'User role is "user"', res.body);
    token = res.body.token; // save for protected route tests

    // Also test login by email
    const byEmail = await request('POST', '/auth/login', {
      usernameOrEmail: TEST_USER.email,
      password:        TEST_USER.password,
    });
    assert(byEmail.status === 200, 'Login by email → 200', byEmail);

    // Wrong password
    const wrongPw = await request('POST', '/auth/login', {
      usernameOrEmail: TEST_USER.username,
      password:        'WrongPassword999',
    });
    assert(wrongPw.status === 401, 'Wrong password → 401', wrongPw);
    assert(wrongPw.body.error === 'Invalid credentials.',
      'Error message is vague (no enumeration hint)', wrongPw.body);

    // Non-existent user
    const noUser = await request('POST', '/auth/login', {
      usernameOrEmail: 'ghost_user_xyz',
      password:        'Password123',
    });
    assert(noUser.status === 401, 'Unknown user → 401', noUser);
    assert(noUser.body.error === 'Invalid credentials.',
      'Same vague error for unknown user', noUser.body);
  }

  // ── Protected /api/me ───────────────────────────────────────────────────────
  section('GET /api/me  (protected)');
  {
    // No token → 401
    const noToken = await request('GET', '/api/me');
    assert(noToken.status === 401, 'No token → 401', noToken);

    // Bad token → 403
    const badToken = await request('GET', '/api/me', null, {
      Authorization: 'Bearer this.is.not.valid',
    });
    assert(badToken.status === 403, 'Bad token → 403', badToken);

    // Valid token → 200
    const ok = await request('GET', '/api/me', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(ok.status === 200, 'Valid token → 200', ok);
    assert(ok.body.user?.username === TEST_USER.username, 'Returns correct user', ok.body);
    assert(!ok.body.user?.password, 'Password hash NOT in response', ok.body);
  }

  // ── Protected /api/secret ───────────────────────────────────────────────────
  section('GET /api/secret  (protected)');
  {
    const noToken = await request('GET', '/api/secret');
    assert(noToken.status === 401, 'No token → 401', noToken);

    const ok = await request('GET', '/api/secret', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(ok.status === 200, 'Valid token → 200', ok);
    assert(Array.isArray(ok.body.secret?.data), 'Secret data is an array', ok.body);
  }

  // ── Role guard /api/admin ───────────────────────────────────────────────────
  section('GET /api/admin  (role guard)');
  {
    // Regular user token → 403
    const forbidden = await request('GET', '/api/admin', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(forbidden.status === 403, 'Regular user → 403 on admin route', forbidden);
    assert(forbidden.body.error === 'Forbidden', 'Error is "Forbidden"', forbidden.body);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  const total = passed + failed;
  console.log(`  Results: ${passed}/${total} passed`);
  if (failed === 0) {
    console.log('  🎉  All tests passed!');
  } else {
    console.log(`  ⚠️   ${failed} test(s) failed — check output above.`);
  }
  console.log('═'.repeat(50) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('\n💥  Test runner crashed:', err.message);
  console.error('    Is the server running? Start it with: npm run dev\n');
  process.exit(1);
});
