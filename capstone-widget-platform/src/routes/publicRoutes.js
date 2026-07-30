'use strict';

/**
 * Public Config Delivery & Submission Endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 * Serves:
 *   - GET  /api/widgets/:id/config (Cached CDN-style config)
 *   - POST /api/submissions (CORS + Validation + Rate Limit + Spam + Geo Fallback + Safe Side Effects)
 *   - POST /api/test/toggle-geo (Test helper for provider fallback test)
 */

const { Router } = require('express');
const widgetStore = require('../repositories/widgetStore');
const geoEnrichment = require('../services/geoEnrichment');
const safeSideEffects = require('../services/safeSideEffects');
const { handleWidgetCors, rateLimitSubmissions } = require('../middleware/corsAndAbuseMiddleware');

const router = Router();

// Handle CORS preflight globally for public routes
router.options('/widgets/:id/config', handleWidgetCors);
router.options('/submissions', handleWidgetCors);

// ── 1. Cached Widget Config Delivery ──────────────────────────────────────────

router.get('/widgets/:id/config', handleWidgetCors, async (req, res, next) => {
  try {
    const widget = await widgetStore.getWidgetById(req.params.id);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found.' });
    }

    // Set CDN cache control headers
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

    // Return minimal payload needed for script rendering
    return res.json({
      id: widget.id,
      widget_type: widget.widget_type,
      headline: widget.headline,
      copy: widget.copy,
      cta_text: widget.cta_text,
      fields: widget.fields,
      theme: widget.theme,
      honeypot_field: '_hp_trap',
      allowed_origins: widget.allowed_origins
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. Public Submission Endpoint ─────────────────────────────────────────────

router.post('/submissions', handleWidgetCors, rateLimitSubmissions, async (req, res, next) => {
  try {
    const { widget_id, payload, _hp_trap, submit_speed_ms } = req.body || {};

    // 1. Boundary Input Validation
    if (!widget_id) {
      return res.status(400).json({ error: 'Missing required field: widget_id' });
    }

    const widget = await widgetStore.getWidgetById(widget_id);
    if (!widget) {
      return res.status(400).json({ error: 'Invalid or non-existent widget_id' });
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid submission payload format.' });
    }

    // Check required fields defined by widget owner
    const missingFields = [];
    for (const field of widget.fields || []) {
      if (field.required && (!payload[field.name] || String(payload[field.name]).trim() === '')) {
        missingFields.push(field.name);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        missing_fields: missingFields
      });
    }

    // Payload size validation (max 50KB)
    const payloadSize = Buffer.byteLength(JSON.stringify(payload));
    if (payloadSize > 50 * 1024) {
      return res.status(400).json({ error: 'Payload size exceeds 50KB limit.' });
    }

    // 2. Spam & Abuse Detection
    let isSpam = false;
    let spamReason = null;

    // Honeypot check: If hidden field _hp_trap is filled -> SPAM!
    if (_hp_trap && String(_hp_trap).trim() !== '') {
      isSpam = true;
      spamReason = 'Honeypot field trap triggered (bot detection)';
    }

    // Instant bot submission speed check (< 300ms)
    if (submit_speed_ms && Number(submit_speed_ms) < 300) {
      isSpam = true;
      spamReason = 'Unnatural submission speed (<300ms)';
    }

    // Spam keyword heuristic
    const payloadStr = JSON.stringify(payload).toLowerCase();
    if (payloadStr.includes('casino') || payloadStr.includes('viagra') || payloadStr.includes('crypto-bot')) {
      isSpam = true;
      spamReason = 'Spam heuristic keyword detected';
    }

    // 3. IP -> Geo Enrichment (Provider Fallback Chain)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const geo = await geoEnrichment.enrichIp(clientIp);

    // 4. Save Submission
    const submission = await widgetStore.addSubmission({
      widget_id,
      tenant_id: widget.tenant_id,
      payload,
      ip: clientIp,
      geo,
      is_spam: isSpam,
      spam_reason: spamReason,
      origin: req.headers['origin'] || 'direct'
    });

    // 5. Safe Side Effect (Webhook/Email notification isolated)
    safeSideEffects.triggerWebhook(submission, widget);

    // 6. Return Honest 201 Created Response
    return res.status(201).json({
      status: 'success',
      message: isSpam ? 'Submission received' : 'Submission saved successfully',
      submission_id: submission.id,
      is_spam: isSpam,
      enriched_geo: {
        city: geo.city,
        country: geo.country,
        provider: geo.provider_used
      }
    });

  } catch (err) {
    next(err);
  }
});

// ── Test Toggle Endpoint (For Geo Fallback Testing) ─────────────────────────

router.post('/test/toggle-geo-provider', (req, res) => {
  const { primaryDown, secondaryDown } = req.body || {};
  const state = widgetStore.setGeoProviderState({ primaryDown, secondaryDown });
  return res.json({ message: 'Geo provider state updated', state });
});

module.exports = router;
