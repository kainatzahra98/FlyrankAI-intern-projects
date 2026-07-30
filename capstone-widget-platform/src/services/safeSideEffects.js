'use strict';

/**
 * Safe Side Effects Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles webhooks, confirmation emails, and third-party integrations asynchronously.
 * CRITICAL REQUIREMENT: A failure here MUST NOT fail the main submission HTTP response!
 */

class SafeSideEffectsService {
  async triggerWebhook(submission, widget) {
    // Run asynchronously in a non-blocking try/catch
    setImmediate(async () => {
      try {
        const webhookUrl = process.env.WEBHOOK_TEST_URL || 'http://localhost:4000/api/mock-webhook';
        
        // If simulation mode requests webhook failure, throw error
        if (submission.payload && submission.payload._trigger_webhook_fail === true) {
          throw new Error('Simulated Webhook Server 500 Failure');
        }

        // Execute background fetch if fetch is available
        if (typeof fetch !== 'undefined') {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'submission.created',
              widget_id: widget.id,
              submission_id: submission.id,
              data: submission.payload,
              geo: submission.geo,
              timestamp: new Date().toISOString()
            })
          }).catch(err => {
            console.warn(`[SafeSideEffect] Webhook HTTP post failed gracefully: ${err.message}`);
          });
        }
        console.log(`[SafeSideEffect] ✅ Notification side-effect triggered for submission ${submission.id}`);
      } catch (err) {
        // Safe isolation — exception is caught and logged, main request unaffected!
        console.warn(`[SafeSideEffect] ⚠️ Side effect failed gracefully: ${err.message}`);
      }
    });
  }
}

module.exports = new SafeSideEffectsService();
