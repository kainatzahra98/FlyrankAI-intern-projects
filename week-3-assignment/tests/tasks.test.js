#!/usr/bin/env node
'use strict';

/**
 * W3·A1 — Automated Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero external dependencies — uses Node's built-in http module.
 * Start the server first, then: node tests/tasks.test.js
 *
 * Tests cover ALL six stages:
 *   Stage 0 — database created, seeded (3 tasks on first run)
 *   Stage 1 — GET /tasks, GET /tasks/:id, 404 for unknown id
 *   Stage 2 — POST /tasks (201), missing title (400)
 *   Stage 3 — PUT /tasks/:id, DELETE /tasks/:id
 *   Extras  — ?search=, ?done=, ?orderBy=, GET /stats
 */

const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 4000}`;
let passed = 0, failed = 0;

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
  else       { console.error(`  ❌  FAIL  ${name}${got ? '\n        Got: ' + JSON.stringify(got) : ''}`); failed++; }
}

function section(name) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  📋  ${name}`);
  console.log('─'.repeat(55));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🧪  W3·A1 Tasks API — Test Suite');
  console.log(`    Target: ${BASE}\n`);

  let createdId;

  // Stage 0 / health ──────────────────────────────────────────────────────────
  section('Stage 0 — Server up & database seeded');
  {
    const r = await req('GET', '/');
    assert(r.status === 200, 'GET / returns 200');
    assert(r.body.storage === 'SqliteRepository', 'Storage is SqliteRepository', r.body);

    const r2 = await req('GET', '/tasks');
    assert(r2.status === 200, 'GET /tasks returns 200');
    assert(Array.isArray(r2.body.data), 'Response has data array', r2.body);
    assert(r2.body.data.length >= 3, 'At least 3 seed tasks exist', r2.body);
    assert(r2.body.data[0].hasOwnProperty('done'), 'Task has done field');
    assert(r2.body.data[0].hasOwnProperty('created_at'), 'Task has created_at timestamp');
    assert(r2.body.data[0].hasOwnProperty('updated_at'), 'Task has updated_at timestamp');
  }

  // Stage 1: Read ─────────────────────────────────────────────────────────────
  section('Stage 1 — Read endpoints');
  {
    const all = await req('GET', '/tasks');
    const firstId = all.body.data[0].id;

    const one = await req('GET', `/tasks/${firstId}`);
    assert(one.status === 200, 'GET /tasks/:id → 200');
    assert(one.body.id === firstId, 'Returns correct task by id');

    const miss = await req('GET', '/tasks/999999');
    assert(miss.status === 404, 'GET /tasks/999999 → 404');
    assert(miss.body.error, 'Error message present on 404', miss.body);
  }

  // Stage 2: Create ───────────────────────────────────────────────────────────
  section('Stage 2 — Create tasks');
  {
    const r = await req('POST', '/tasks', { title: 'Test task from automated suite' });
    assert(r.status === 201, 'POST /tasks → 201');
    assert(r.body.title === 'Test task from automated suite', 'Title matches', r.body);
    assert(r.body.done === false, 'New task starts as not done', r.body);
    assert(r.body.id, 'Response has id', r.body);
    createdId = r.body.id;

    // Missing title
    const bad = await req('POST', '/tasks', {});
    assert(bad.status === 400, 'POST /tasks with no title → 400');

    // Empty title
    const empty = await req('POST', '/tasks', { title: '   ' });
    assert(empty.status === 400, 'POST /tasks with blank title → 400');
  }

  // Stage 3: Update ───────────────────────────────────────────────────────────
  section('Stage 3 — Update tasks');
  {
    const r = await req('PUT', `/tasks/${createdId}`, { done: true });
    assert(r.status === 200, 'PUT /tasks/:id → 200');
    assert(r.body.done === true, 'done is now true', r.body);

    const r2 = await req('PUT', `/tasks/${createdId}`, { title: 'Renamed task' });
    assert(r2.status === 200, 'PUT title update → 200');
    assert(r2.body.title === 'Renamed task', 'Title updated', r2.body);

    // Update non-existent
    const miss = await req('PUT', '/tasks/999999', { title: 'Ghost' });
    assert(miss.status === 404, 'PUT unknown id → 404');
  }

  // Stage 3: Delete ───────────────────────────────────────────────────────────
  section('Stage 3 — Delete tasks');
  {
    const r = await req('DELETE', `/tasks/${createdId}`);
    assert(r.status === 200, 'DELETE /tasks/:id → 200');
    assert(r.body.deleted === true, 'Response has deleted:true', r.body);

    const gone = await req('GET', `/tasks/${createdId}`);
    assert(gone.status === 404, 'Deleted task returns 404 on GET');

    const miss = await req('DELETE', '/tasks/999999');
    assert(miss.status === 404, 'DELETE unknown id → 404');
  }

  // Optional extras ───────────────────────────────────────────────────────────
  section('Optional Extras — search, filter, sort, stats');
  {
    // Seed a searchable task
    await req('POST', '/tasks', { title: 'Buy milk and eggs' });

    const search = await req('GET', '/tasks?search=milk');
    assert(search.status === 200, 'GET /tasks?search=milk → 200');
    assert(search.body.data.some((t) => t.title.includes('milk')), 'Search returns matching task', search.body);

    // Filter by done=false
    const undone = await req('GET', '/tasks?done=false');
    assert(undone.status === 200, 'GET /tasks?done=false → 200');
    assert(undone.body.data.every((t) => t.done === false), 'All results are not done', undone.body);

    // Sort by title
    const sorted = await req('GET', '/tasks?orderBy=title');
    assert(sorted.status === 200, 'GET /tasks?orderBy=title → 200');
    const titles = sorted.body.data.map((t) => t.title);
    const sortedCopy = [...titles].sort();
    assert(JSON.stringify(titles) === JSON.stringify(sortedCopy), 'Tasks sorted alphabetically', titles);

    // Stats
    const stats = await req('GET', '/stats');
    assert(stats.status === 200, 'GET /stats → 200');
    assert(stats.body.stats.total >= 3, 'Stats show total >= 3', stats.body);
    assert('completed' in stats.body.stats, 'Stats has completed', stats.body);
    assert('pending'   in stats.body.stats, 'Stats has pending', stats.body);
  }

  // Persistence ───────────────────────────────────────────────────────────────
  section('Persistence — data survives on disk');
  {
    const fs   = require('fs');
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../data/tasks.db');
    assert(fs.existsSync(dbPath), `tasks.db file exists at ${dbPath}`);
    const stat = fs.statSync(dbPath);
    assert(stat.size > 0, 'tasks.db is not empty (contains real SQLite data)');
  }

  // Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  Results: ${passed}/${passed + failed} passed`);
  if (failed === 0) console.log('  🎉  All tests passed!');
  else console.log(`  ⚠️   ${failed} test(s) failed — check output above.`);
  console.log('═'.repeat(55) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('\n💥  Test runner crashed:', err.message);
  console.error('    Is the server running? Start it with: npm start\n');
  process.exit(1);
});
