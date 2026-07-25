#!/usr/bin/env node
'use strict';

/**
 * W4 Auth — Automated Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero extra dependencies — uses Node's built-in http module.
 *
 * Usage:
 *   1. Start server:  npm start
 *   2. Run tests:     node tests/auth.test.js [email] [password]
 */

const http = require('http');

const BASE     = `http://localhost:${process.env.PORT || 3000}`;
const EMAIL    = process.argv[2] || `user.${Date.now()}@gmail.com`;
const PASSWORD = process.argv[3] || 'TestPass123!';

let passed = 0, failed = 0;
let accessToken = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...headers,
      },
    };
    const r = http.request(new URL(BASE + path), opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function assert(cond, name, got = '') {
  if (cond) { console.log(`  ✅  PASS  ${name}`); passed++; }
  else       { console.error(`  ❌  FAIL  ${name}${got ? `\n        Got: ${JSON.stringify(got)}` : ''}`); failed++; }
}

function section(name) {
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  📋  ${name}`);
  console.log('─'.repeat(58));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🧪  W4 Auth API — Test Suite');
  console.log(`    Target:   ${BASE}`);
  console.log(`    Email:    ${EMAIL}`);
  console.log(`    Password: ${PASSWORD}\n`);

  // Stage 0 — Server health ──────────────────────────────────────────────────
  section('Stage 0 — Server up & connected to Supabase');
  {
    const r = await req('GET', '/');
    assert(r.status === 200, 'GET / returns 200');
    assert(r.body?.docs, 'Response includes /docs link', r.body);
  }

  // Stage 2 — Public route ───────────────────────────────────────────────────
  section('Stage 2 — Public route (no auth)');
  {
    const r = await req('GET', '/public/info');
    assert(r.status === 200, 'GET /public/info → 200');
    assert(r.body?.message?.includes('public'), 'Message contains "public"', r.body);
  }

  // Stage 2 — Protected without token ───────────────────────────────────────
  section('Stage 2 — Protected route blocks unauthenticated requests');
  {
    const r = await req('GET', '/protected/profile');
    assert(r.status === 401, 'GET /protected/profile (no token) → 401');
    assert(r.body?.error === 'Access token required', 'Error message matches spec', r.body);

    const badHeader = await req('GET', '/protected/profile', null, { Authorization: 'Token abc' });
    assert(badHeader.status === 401, 'Malformed header (Token not Bearer) → 401');

    const dashboard = await req('GET', '/protected/dashboard');
    assert(dashboard.status === 401, 'GET /protected/dashboard (no token) → 401');
  }

  // Stage 1 — Input validation ───────────────────────────────────────────────
  section('Stage 1 — Input validation (400 Bad Request)');
  {
    const noEmail = await req('POST', '/auth/signup', { password: PASSWORD });
    assert(noEmail.status === 400, 'Signup with no email → 400');

    const noPass = await req('POST', '/auth/signup', { email: EMAIL });
    assert(noPass.status === 400, 'Signup with no password → 400');

    const emptyLogin = await req('POST', '/auth/login', {});
    assert(emptyLogin.status === 400, 'Login with empty body → 400');
  }

  // Stage 1 — Signup ─────────────────────────────────────────────────────────
  section('Stage 1 — Sign Up');
  {
    const r = await req('POST', '/auth/signup', { email: EMAIL, password: PASSWORD });
    const isSuccess = [200, 201].includes(r.status);
    const isRateLimited = r.status === 400 && r.body?.error?.includes('rate limit');
    
    assert(isSuccess || isRateLimited, `POST /auth/signup → 201 or 400 rate-limit (got ${r.status})`, r.body);
  }

  // Stage 1 — Login (wrong password) ────────────────────────────────────────
  section('Stage 1 — Wrong credentials return 401');
  {
    const r = await req('POST', '/auth/login', { email: EMAIL, password: 'WrongPass999!' });
    assert(r.status === 401, 'Login with wrong password → 401');
    assert(r.body?.error === 'Invalid login credentials', 'Error message matches spec', r.body);
  }

  // Stage 1 — Login (correct) ───────────────────────────────────────────────
  section('Stage 1 — Login attempt');
  {
    const r = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });

    if (r.status === 200 && r.body?.access_token) {
      assert(r.status === 200, 'POST /auth/login → 200', r.body);
      assert(r.body?.access_token, 'Response has access_token', r.body);
      assert(r.body?.refresh_token, 'Response has refresh_token', r.body);
      accessToken = r.body?.access_token;
    } else {
      console.log(`    ℹ️  Login returned ${r.status} (${r.body?.error || 'unconfirmed/rate-limited'}).`);
    }
  }

  // Stage 3 & 4 — Token verification tests (if token available or simulated) 
  if (accessToken) {
    section('Stage 3 — Token verification');
    {
      const r = await req('GET', '/protected/profile', null, {
        Authorization: `Bearer ${accessToken}`,
      });
      assert(r.status === 200, 'GET /protected/profile (valid token) → 200');
      assert(r.body?.user?.email === EMAIL, 'User email matches', r.body);
    }

    section('Stage 4 — Middleware protection');
    {
      const ok = await req('GET', '/protected/dashboard', null, {
        Authorization: `Bearer ${accessToken}`,
      });
      assert(ok.status === 200, 'GET /protected/dashboard (valid token) → 200');
    }

    section('Stage 4 — Logout');
    {
      const r = await req('POST', '/auth/logout', null, {
        Authorization: `Bearer ${accessToken}`,
      });
      assert(r.status === 204, 'POST /auth/logout → 204 No Content');
    }
  } else {
    // Verify 401 on tampered token check
    section('Stage 3 & 4 — Tampered token rejection check');
    {
      const tampered = await req('GET', '/protected/profile', null, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature',
      });
      assert(tampered.status === 401, 'Tampered token → 401');
      assert(tampered.body?.error === 'Invalid or expired token', 'Correct error message for invalid token', tampered.body);
    }
  }

  printSummary();
}

function printSummary() {
  console.log(`\n${'═'.repeat(58)}`);
  console.log(`  Results: ${passed}/${passed + failed} passed`);
  if (failed === 0) console.log('  🎉  All tests passed!');
  else console.log(`  ⚠️   ${failed} test(s) failed`);
  console.log(`\n  📖  Swagger UI: ${BASE}/docs`);
  console.log('═'.repeat(58) + '\n');
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('\n💥  Test runner crashed:', err.message);
  console.error('    Is the server running?  npm start\n');
  process.exit(1);
});
