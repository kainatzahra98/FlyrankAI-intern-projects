(function () {
  'use strict';

  // Find script tag and extract widget ID
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var widgetId = currentScript ? currentScript.getAttribute('data-widget-id') : null;
  if (!widgetId) {
    console.error('[FlyRank Widget] Missing data-widget-id attribute on script tag.');
    return;
  }

  // Derive API host from script source
  var scriptUrl = new URL(currentScript.src);
  var apiBase = scriptUrl.origin;

  var renderTime = Date.now();

  // Fetch Config
  fetch(apiBase + '/api/widgets/' + widgetId + '/config')
    .then(function (res) {
      if (!res.ok) throw new Error('Widget config fetch failed: ' + res.status);
      return res.json();
    })
    .then(function (config) {
      renderWidget(config);
    })
    .catch(function (err) {
      console.warn('[FlyRank Widget] Unable to load widget:', err.message);
    });

  function renderWidget(config) {
    var theme = config.theme || {};
    var primaryColor = theme.primary_color || '#4F46E5';
    var bgColor = theme.background_color || '#FFFFFF';
    var textColor = theme.text_color || '#1F2937';
    var borderRadius = theme.border_radius || '12px';

    // Inject Styles
    var styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .fr-widget-overlay {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 360px;
        max-width: 90vw;
        background: ${bgColor};
        color: ${textColor};
        border-radius: ${borderRadius};
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #E5E7EB;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        z-index: 999999;
        transition: all 0.3s ease;
      }
      .fr-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .fr-widget-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: ${textColor};
        line-height: 1.3;
      }
      .fr-widget-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #9CA3AF;
        padding: 0 4px;
        line-height: 1;
      }
      .fr-widget-close:hover { color: #4B5563; }
      .fr-widget-copy {
        font-size: 14px;
        color: #4B5563;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      .fr-widget-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .fr-widget-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #D1D5DB;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
      }
      .fr-widget-input:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }
      .fr-widget-hp {
        display: none !important;
        position: absolute;
        left: -9999px;
      }
      .fr-widget-btn {
        background: ${primaryColor};
        color: #FFFFFF;
        border: none;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .fr-widget-btn:hover { opacity: 0.9; }
      .fr-widget-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .fr-widget-success {
        background: #DEF7EC;
        color: #03543F;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
        text-align: center;
        font-weight: 500;
      }
      .fr-widget-badge {
        font-size: 10px;
        color: #9CA3AF;
        text-align: center;
        margin-top: 12px;
      }
    `;
    document.head.appendChild(styleEl);

    // Build DOM container
    var container = document.createElement('div');
    container.className = 'fr-widget-overlay';
    container.id = 'fr-widget-' + config.id;

    // Fields HTML
    var fieldsHtml = '';
    (config.fields || []).forEach(function (field) {
      fieldsHtml += `
        <div>
          <input 
            type="${field.type || 'text'}" 
            name="${field.name}" 
            placeholder="${field.label || field.name}" 
            ${field.required ? 'required' : ''} 
            class="fr-widget-input"
          />
        </div>
      `;
    });

    // Honeypot Trap Input
    var honeypotHtml = `<input type="text" name="_hp_trap" value="" class="fr-widget-hp" tabindex="-1" autocomplete="off" />`;

    container.innerHTML = `
      <div class="fr-widget-header">
        <h3 class="fr-widget-title">${escapeHtml(config.headline)}</h3>
        <button class="fr-widget-close" onclick="document.getElementById('fr-widget-${config.id}').remove()">&times;</button>
      </div>
      <p class="fr-widget-copy">${escapeHtml(config.copy)}</p>
      <form class="fr-widget-form" id="fr-form-${config.id}">
        ${fieldsHtml}
        ${honeypotHtml}
        <button type="submit" class="fr-widget-btn" id="fr-btn-${config.id}">${escapeHtml(config.cta_text || 'Submit')}</button>
      </form>
      <div class="fr-widget-badge">Powered by FlyRank Widget Engine</div>
    `;

    document.body.appendChild(container);

    // Attach Submission Handler
    var form = document.getElementById('fr-form-' + config.id);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('fr-btn-' + config.id);
      btn.disabled = true;
      btn.innerText = 'Sending...';

      var formData = new FormData(form);
      var payload = {};
      formData.forEach(function (value, key) {
        if (key !== '_hp_trap') {
          payload[key] = value;
        }
      });

      var hpTrap = formData.get('_hp_trap') || '';
      var submitSpeed = Date.now() - renderTime;

      fetch(apiBase + '/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_id: config.id,
          payload: payload,
          _hp_trap: hpTrap,
          submit_speed_ms: submitSpeed
        })
      })
      .then(function (res) {
        if (!res.ok && res.status !== 201) {
          return res.json().then(function (data) { throw new Error(data.message || data.error || 'Submission failed'); });
        }
        return res.json();
      })
      .then(function (data) {
        form.innerHTML = `
          <div class="fr-widget-success">
            🎉 Thank you! Your response has been captured.
          </div>
        `;
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerText = config.cta_text || 'Submit';
        alert('Notice: ' + err.message);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
