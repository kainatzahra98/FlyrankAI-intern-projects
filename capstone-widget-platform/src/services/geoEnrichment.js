'use strict';

/**
 * IP -> Geo Enrichment Provider Fallback Chain Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Modeled after FlyRank's 3-provider geo fallback chain.
 *
 * Chain:
 *   1. Primary Geo Provider   (e.g., GeoIP Primary API)
 *   2. Secondary Geo Provider (e.g., GeoIP Backup API)
 *   3. Fallback Geo Resolver   (Default/Unknown payload)
 *
 * Degrades gracefully — failure in any provider logged and skipped.
 */

const widgetStore = require('../repositories/widgetStore');

class GeoEnrichmentService {

  // Provider 1: Primary Geo Service
  async _fetchPrimary(ip) {
    if (widgetStore.geoProviderState.primaryDown || process.env.PRIMARY_GEO_DOWN === 'true') {
      throw new Error('Primary Geo Provider Unavailable (503 / Network Timeout)');
    }
    
    // Simulate primary provider lookup based on IP
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return {
        ip,
        city: 'San Francisco',
        region: 'California',
        country: 'United States',
        country_code: 'US',
        provider_used: 'Provider 1 (Primary - MaxMind/GeoIP)',
        status: 'enriched'
      };
    }

    if (ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        ip,
        city: 'Internal Network',
        region: 'Local',
        country: 'United States',
        country_code: 'US',
        provider_used: 'Provider 1 (Primary - MaxMind/GeoIP)',
        status: 'enriched'
      };
    }

    // Default IP simulation
    return {
      ip,
      city: 'London',
      region: 'England',
      country: 'United Kingdom',
      country_code: 'GB',
      provider_used: 'Provider 1 (Primary - MaxMind/GeoIP)',
      status: 'enriched'
    };
  }

  // Provider 2: Backup Geo Service
  async _fetchSecondary(ip) {
    if (widgetStore.geoProviderState.secondaryDown || process.env.SECONDARY_GEO_DOWN === 'true') {
      throw new Error('Secondary Geo Provider Unavailable (Connection Refused)');
    }

    return {
      ip,
      city: 'Toronto',
      region: 'Ontario',
      country: 'Canada',
      country_code: 'CA',
      provider_used: 'Provider 2 (Secondary - IpApi Backup)',
      status: 'enriched_fallback'
    };
  }

  // Provider 3: Safe Fallback Local Resolver
  _fetchFallback(ip) {
    return {
      ip: ip || '0.0.0.0',
      city: 'Unknown City',
      region: 'Unknown Region',
      country: 'Unknown Country',
      country_code: 'XX',
      provider_used: 'Provider 3 (Default Local Fallback)',
      status: 'degraded'
    };
  }

  /**
   * Main Enrich Method — executes fallback chain in sequence
   */
  async enrichIp(ip) {
    const cleanIp = (ip || '127.0.0.1').replace(/^.*:/, ''); // clean ipv6 prefix

    // 1. Try Primary Provider
    try {
      const geo = await this._fetchPrimary(cleanIp);
      return geo;
    } catch (err1) {
      console.warn(`[GeoEnrichment] Provider 1 Failed (${err1.message}). Trying Provider 2...`);
    }

    // 2. Try Secondary Provider
    try {
      const geo = await this._fetchSecondary(cleanIp);
      return geo;
    } catch (err2) {
      console.warn(`[GeoEnrichment] Provider 2 Failed (${err2.message}). Using Default Fallback...`);
    }

    // 3. Ultimate Fallback (Never Fails)
    return this._fetchFallback(cleanIp);
  }
}

module.exports = new GeoEnrichmentService();
