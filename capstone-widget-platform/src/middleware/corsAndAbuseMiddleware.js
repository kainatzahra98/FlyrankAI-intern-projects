'use strict';

/**
 * Dynamic CORS & Abuse Control Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   1. Dynamic Origin CORS Validation against Widget's allowed_origins list.
 *   2. IP & Widget Rate Limiting (5 requests / min limit returning 429).
 */

const widgetStore = require('../repositories/widgetStore');

// Dynamic CORS Middleware for widget-specific endpoints
async function handleWidgetCors(req, res, next) {
  try {
    const origin = req.headers['origin'] || '*';
    const widgetId = req.params.id || req.body?.widget_id;

    let allowedOrigins = ['*'];
    if (widgetId) {
      const widget = await widgetStore.getWidgetById(widgetId);
      if (widget && widget.allowed_origins) {
        allowedOrigins = widget.allowed_origins;
      }
    }

    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // If origin is forbidden by widget owner configuration
      if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: `Origin ${origin} is not allowed by this widget configuration.` });
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Submission Rate Limiter Middleware
function rateLimitSubmissions(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const widgetId = req.body?.widget_id || 'global';
  const key = `ratelimit_${ip}_${widgetId}`;

  // Allow max 5 submissions per 60 seconds per IP/widget
  const limitResult = widgetStore.checkRateLimit(key, 5, 60000);

  if (!limitResult.allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Submission rate limit exceeded (max 5 per minute). Please wait before submitting again.',
      retry_after_seconds: 60
    });
  }

  next();
}

module.exports = {
  handleWidgetCors,
  rateLimitSubmissions
};
