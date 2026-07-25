'use strict';

/**
 * supabaseClient.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the Supabase client once using environment variables.
 * All routes import this singleton — never create more than one client.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Disable auto-refresh and session persistence —
    // we handle tokens manually in each request.
    autoRefreshToken: false,
    persistSession:   false,
    detectSessionInUrl: false,
  },
});

module.exports = supabase;
