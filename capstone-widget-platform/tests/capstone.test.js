#!/usr/bin/env node
'use strict';

/**
 * Automated Test Suite — Capstone Cross-Origin Widget Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero external runner dependencies — uses Node's built-in http module.
 *
 * Verifies:
 *   1. Admin Auth & Tenant Isolation (CRUD widgets)
 *   2. CDN Config Delivery & Cache Headers
 *   3. CORS Preflight & Allowed Origins
 *   4. Boundary Validation (Missing fields, invalid widget ID, oversized body)
 *   5. Abuse Controls (Honeypot Bot Defense & 429 Rate Limiter)
 *   6. IP-Geo Provider Fallback Chain (Provider 1 -> Provider 2 -> Fallback)
 *   7. Safe Side-Effects (Webhook failure isolation)
 *   8. Dashboard & Analytics Stats Endpoint
 */

const http = require('http');
const app = require('../src/server');
const widgetStore = require('../src/repositories/widgetStore');

const PORT = 4001; // Separate port for testing
let server;
let adminToken = null;
let testWidgetId = null;

let passed = 0;
let failed = 0;

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...headers
      }
    };
    const r = http.request(`http://localhost:${PORT}${path}`, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function assert(cond, name, got = '') {
  if (cond) {
    console.log(`  ✅ PASS  ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${name}${got ? '\n        Got: ' + JSON.stringify(got) : ''}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📋 ${name}`);
  console.log('─'.repeat(60));
}

async function runTests() {
  console.log('\n🧪 Running Capstone Widget Platform Test Suite...');

  // Start test server
  await new Promise((res) => {
    server = app.listen(PORT, res);
  });

  try {
    // ── 1. Admin Authentication & Widget CRUD ─────────────────────────────
    section('1. Admin Authentication & Tenant Isolation');
    {
      const login = await req('POST', '/api/auth/login', {
        email: 'owner@flyrankai.com',
        password: 'password123'
      });
      assert(login.status === 200, 'Admin login returns 200', login.body);
      assert(login.body?.token, 'JWT token returned', login.body);
      adminToken = login.body.token;

      // Create new Widget
      const createWgt = await req('POST', '/api/widgets', {
        title: 'Test CTA Popover',
        widget_type: 'popover',
        headline: 'Get Exclusive Access',
        copy: 'Enter your email below',
        cta_text: 'Join Now',
        fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
        allowed_origins: ['http://localhost:5000', '*']
      }, { Authorization: `Bearer ${adminToken}` });

      assert(createWgt.status === 201, 'POST /api/widgets creates widget (201)', createWgt.body);
      assert(createWgt.body?.embed_snippet?.includes('<script'), 'Embed snippet returned', createWgt.body);
      testWidgetId = createWgt.body.widget.id;

      // List Widgets
      const listWgt = await req('GET', '/api/widgets', null, { Authorization: `Bearer ${adminToken}` });
      assert(listWgt.status === 200, 'GET /api/widgets returns 200', listWgt.body);
      assert(listWgt.body?.data?.length >= 2, 'Tenant widget list populated');
    }

    // ── 2. Config Delivery & Cache Headers ──────────────────────────────────
    section('2. Config Delivery & Cache Headers');
    {
      const config = await req('GET', `/api/widgets/${testWidgetId}/config`);
      assert(config.status === 200, 'GET /api/widgets/:id/config returns 200', config.body);
      assert(config.headers['cache-control']?.includes('max-age=60'), 'Cache-Control header configured', config.headers);
      assert(config.body?.headline === 'Get Exclusive Access', 'Returns matching widget config payload');
    }

    // ── 3. CORS Preflight & Headers ─────────────────────────────────────────
    section('3. CORS Preflight & Header Support');
    {
      const preflight = await req('OPTIONS', '/api/submissions', null, {
        Origin: 'http://localhost:5000',
        'Access-Control-Request-Method': 'POST'
      });
      assert(preflight.status === 204, 'CORS Preflight OPTIONS /api/submissions → 204', preflight.body);
      assert(preflight.headers['access-control-allow-origin'] === 'http://localhost:5000', 'Access-Control-Allow-Origin header set');
    }

    // ── 4. Boundary Input Validation ───────────────────────────────────────
    section('4. Boundary Input Validation');
    {
      // Missing widget_id
      const noWidget = await req('POST', '/api/submissions', { payload: { email: 'test@example.com' } });
      assert(noWidget.status === 400, 'Missing widget_id → 400 Bad Request', noWidget.body);

      // Invalid widget_id
      const invalidWgt = await req('POST', '/api/submissions', { widget_id: 'wgt_nonexistent', payload: { email: 'a@b.com' } });
      assert(invalidWgt.status === 400, 'Invalid widget_id → 400 Bad Request', invalidWgt.body);

      // Missing required field
      const missingField = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: {} });
      assert(missingField.status === 400, 'Missing required field → 400 Bad Request', missingField.body);
      assert(missingField.body?.missing_fields?.includes('email'), 'Specifies missing field name');

      // Oversized payload (> 50KB)
      const hugeString = 'A'.repeat(60 * 1024);
      const oversized = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: 'a@b.com', data: hugeString } });
      assert(oversized.status === 400, 'Oversized payload (>50KB) → 400 Bad Request', oversized.body);
    }

    // ── 5. Abuse Resistance & Spam Controls ────────────────────────────────
    section('5. Abuse Resistance & Spam Controls');
    {
      // Honeypot Bot Trap
      const honeypot = await req('POST', '/api/submissions', {
        widget_id: testWidgetId,
        payload: { email: 'spambot@example.com' },
        _hp_trap: 'bot_filled_value'
      });
      assert(honeypot.status === 201, 'Honeypot trap submission returned 201 (silent acceptance)');
      assert(honeypot.body?.is_spam === true, 'Submission flagged as is_spam: true', honeypot.body);

      // Rate Limiting (Burst 6 Submissions)
      widgetStore.resetRateLimits();
      for (let i = 1; i <= 5; i++) {
        await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: `burst_${i}@example.com` } });
      }
      const rateLimited = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: 'burst_6@example.com' } });
      assert(rateLimited.status === 429, '6th rapid submission triggers 429 Too Many Requests', rateLimited.body);
      assert(rateLimited.body?.error === 'Too Many Requests', 'Error message matches 429 spec', rateLimited.body);
      widgetStore.resetRateLimits();
    }

    // ── 6. IP -> Geo Provider Fallback Chain ────────────────────────────────
    section('6. IP -> Geo Provider Fallback Chain');
    {
      // Provider 1 (Primary Active)
      widgetStore.setGeoProviderState({ primaryDown: false, secondaryDown: false });
      const prov1 = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: 'p1@example.com' } });
      assert(prov1.body?.enriched_geo?.provider?.includes('Provider 1'), 'Uses Provider 1 when healthy', prov1.body);

      // Provider 1 DOWN -> Fallback to Provider 2
      widgetStore.setGeoProviderState({ primaryDown: true, secondaryDown: false });
      const prov2 = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: 'p2@example.com' } });
      assert(prov2.body?.enriched_geo?.provider?.includes('Provider 2'), 'Falls back to Provider 2 when Provider 1 is down', prov2.body);

      // Provider 1 & 2 DOWN -> Fallback to Provider 3 Local Resolver
      widgetStore.setGeoProviderState({ primaryDown: true, secondaryDown: true });
      const prov3 = await req('POST', '/api/submissions', { widget_id: testWidgetId, payload: { email: 'p3@example.com' } });
      assert(prov3.body?.enriched_geo?.provider?.includes('Provider 3'), 'Falls back to Provider 3 when Provider 1 & 2 are down', prov3.body);

      // Reset Geo State
      widgetStore.setGeoProviderState({ primaryDown: false, secondaryDown: false });
    }

    // ── 7. Safe Side-Effects Isolation ──────────────────────────────────────
    section('7. Safe Side-Effects Isolation');
    {
      const sideEffectFail = await req('POST', '/api/submissions', {
        widget_id: testWidgetId,
        payload: { email: 'sideeffect@example.com', _trigger_webhook_fail: true }
      });
      assert(sideEffectFail.status === 201, 'Submission succeeds (201) even if webhook side-effect fails', sideEffectFail.body);
    }

    // ── 8. Dashboard & Analytics Stats ──────────────────────────────────────
    section('8. Dashboard & Analytics Stats');
    {
      const subs = await req('GET', '/api/submissions', null, { Authorization: `Bearer ${adminToken}` });
      assert(subs.status === 200, 'GET /api/submissions returns 200', subs.body);
      assert(subs.body?.data?.length > 0, 'Returns submissions array for tenant');

      const stats = await req('GET', `/api/widgets/${testWidgetId}/stats`, null, { Authorization: `Bearer ${adminToken}` });
      assert(stats.status === 200, 'GET /api/widgets/:id/stats returns 200', stats.body);
      assert(stats.body?.stats?.total_submissions > 0, 'Analytics stats calculates total submissions');
      assert('spam_rate' in stats.body.stats, 'Calculates spam rate percentage');
    }

  } finally {
    server.close();
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results: ${passed}/${passed + failed} passed`);
  if (failed === 0) {
    console.log('  🎉 All Capstone Tests Passed!');
  } else {
    console.error(`  ⚠️ ${failed} test(s) failed.`);
  }
  console.log('═'.repeat(60) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('💥 Test suite crashed:', err);
  process.exit(1);
});
