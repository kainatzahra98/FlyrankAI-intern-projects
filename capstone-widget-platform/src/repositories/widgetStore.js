'use strict';

/**
 * In-Memory / File-backed Storage for Widgets, Submissions, and Tenants
 * ─────────────────────────────────────────────────────────────────────────────
 * Encapsulates data isolation by tenant_id.
 */

const bcrypt = require('bcryptjs');

class WidgetStore {
  constructor() {
    this.users = new Map();       // email -> { id, email, passwordHash, company }
    this.widgets = new Map();     // widget_id -> widget object
    this.submissions = [];        // array of submission objects
    this.rateLimitMap = new Map(); // ip_widget -> array of timestamps
    this.geoProviderState = {
      primaryDown: false,
      secondaryDown: false,
    };
    this._seedDefaults();
  }

  async _seedDefaults() {
    // Default admin user (Customer)
    const hash = await bcrypt.hash('password123', 10);
    const demoUser = {
      id: 'tenant_demo_100',
      email: 'owner@flyrankai.com',
      passwordHash: hash,
      company: 'FlyRank AI Corp',
    };
    this.users.set(demoUser.email, demoUser);

    // Default Widget
    const demoWidget = {
      id: 'wgt_demo_newsletter',
      tenant_id: demoUser.id,
      title: 'Exit Intent Newsletter Popover',
      widget_type: 'popover', // 'popover' | 'signup_form' | 'cta'
      headline: '🚀 Get 20% Off Your First SEO Audit',
      copy: 'Join 10,000+ marketers getting weekly AI growth teardowns.',
      cta_text: 'Claim My Discount',
      fields: [
        { name: 'email', label: 'Work Email', type: 'email', required: true },
        { name: 'name', label: 'Full Name', type: 'text', required: false }
      ],
      theme: {
        primary_color: '#4F46E5',
        background_color: '#FFFFFF',
        text_color: '#1F2937',
        border_radius: '12px'
      },
      allowed_origins: ['*'], // '*' or specific origins
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.widgets.set(demoWidget.id, demoWidget);
  }

  // ── User / Tenant Methods ──────────────────────────────────────────────────

  async createUser({ email, password, company }) {
    if (this.users.has(email)) {
      const err = new Error('User already exists');
      err.status = 400;
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: `tenant_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      email,
      passwordHash,
      company: company || 'My Business'
    };
    this.users.set(email, user);
    return { id: user.id, email: user.email, company: user.company };
  }

  async validateUser(email, password) {
    const user = this.users.get(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;
    return { id: user.id, email: user.email, company: user.company };
  }

  // ── Widget CRUD ────────────────────────────────────────────────────────────

  async createWidget(tenant_id, data) {
    const id = `wgt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const widget = {
      id,
      tenant_id,
      title: data.title || 'Untitled Widget',
      widget_type: data.widget_type || 'signup_form',
      headline: data.headline || 'Subscribe to updates',
      copy: data.copy || 'Enter your details below',
      cta_text: data.cta_text || 'Submit',
      fields: data.fields || [{ name: 'email', label: 'Email Address', type: 'email', required: true }],
      theme: data.theme || { primary_color: '#3B82F6', background_color: '#FFFFFF', text_color: '#111827' },
      allowed_origins: data.allowed_origins || ['*'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.widgets.set(id, widget);
    return widget;
  }

  async getWidgetsByTenant(tenant_id) {
    const results = [];
    for (const widget of this.widgets.values()) {
      if (widget.tenant_id === tenant_id) {
        results.push(widget);
      }
    }
    return results;
  }

  async getWidgetById(id) {
    return this.widgets.get(id) || null;
  }

  async updateWidget(id, tenant_id, patch) {
    const widget = await this.getWidgetById(id);
    if (!widget || widget.tenant_id !== tenant_id) return null;

    const updated = {
      ...widget,
      ...patch,
      id: widget.id,
      tenant_id: widget.tenant_id,
      updated_at: new Date().toISOString()
    };
    this.widgets.set(id, updated);
    return updated;
  }

  async deleteWidget(id, tenant_id) {
    const widget = await this.getWidgetById(id);
    if (!widget || widget.tenant_id !== tenant_id) return false;
    this.widgets.delete(id);
    return true;
  }

  // ── Submissions ────────────────────────────────────────────────────────────

  async addSubmission(submissionData) {
    const submission = {
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      ...submissionData,
      created_at: new Date().toISOString()
    };
    this.submissions.push(submission);
    return submission;
  }

  async getSubmissions(tenant_id, { widget_id, is_spam } = {}) {
    // Get all widgets belonging to tenant to enforce isolation
    const tenantWidgets = new Set(
      (await this.getWidgetsByTenant(tenant_id)).map(w => w.id)
    );

    return this.submissions.filter(sub => {
      if (!tenantWidgets.has(sub.widget_id)) return false;
      if (widget_id && sub.widget_id !== widget_id) return false;
      if (is_spam !== undefined && sub.is_spam !== (is_spam === 'true')) return false;
      return true;
    }).reverse(); // newest first
  }

  async getWidgetStats(widget_id, tenant_id) {
    const widget = await this.getWidgetById(widget_id);
    if (!widget || widget.tenant_id !== tenant_id) return null;

    const widgetSubs = this.submissions.filter(s => s.widget_id === widget_id);
    const total = widgetSubs.length;
    const spam = widgetSubs.filter(s => s.is_spam).length;
    const clean = total - spam;

    const geoBreakdown = {};
    widgetSubs.forEach(s => {
      if (!s.is_spam && s.geo) {
        const country = s.geo.country_name || s.geo.country || 'Unknown';
        geoBreakdown[country] = (geoBreakdown[country] || 0) + 1;
      }
    });

    return {
      widget_id,
      title: widget.title,
      total_submissions: total,
      clean_submissions: clean,
      spam_submissions: spam,
      spam_rate: total > 0 ? `${((spam / total) * 100).toFixed(1)}%` : '0%',
      geo_breakdown: geoBreakdown
    };
  }

  // ── Rate Limiter Helpers ───────────────────────────────────────────────────

  checkRateLimit(key, limit = 5, windowMs = 60000) {
    const now = Date.now();
    const timestamps = (this.rateLimitMap.get(key) || []).filter(ts => now - ts < windowMs);
    
    if (timestamps.length >= limit) {
      return { allowed: false, count: timestamps.length };
    }

    timestamps.push(now);
    this.rateLimitMap.set(key, timestamps);
    return { allowed: true, count: timestamps.length };
  }

  resetRateLimits() {
    this.rateLimitMap.clear();
  }

  // ── Geo Provider Mock State Toggle ──────────────────────────────────────────

  setGeoProviderState({ primaryDown, secondaryDown }) {
    if (primaryDown !== undefined) this.geoProviderState.primaryDown = primaryDown;
    if (secondaryDown !== undefined) this.geoProviderState.secondaryDown = secondaryDown;
    return this.geoProviderState;
  }
}

module.exports = new WidgetStore();
