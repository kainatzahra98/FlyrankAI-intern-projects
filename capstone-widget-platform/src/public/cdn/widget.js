(function () {
  'use strict';

  // Find all script tags with data-widget-id that haven't been initialized
  var scripts = document.querySelectorAll('script[data-widget-id]:not([data-fr-initialized="true"])');
  
  if (scripts.length === 0) {
    // Fallback to currentScript
    var currentScript = document.currentScript;
    if (currentScript && currentScript.getAttribute('data-widget-id') && !currentScript.getAttribute('data-fr-initialized')) {
      scripts = [currentScript];
    }
  }

  scripts.forEach(function (scriptEl) {
    var widgetId = scriptEl.getAttribute('data-widget-id');
    if (!widgetId) return;

    // Mark script element as initialized so it isn't rendered twice
    scriptEl.setAttribute('data-fr-initialized', 'true');

    // Derive API host from script source
    var scriptUrl = new URL(scriptEl.src, window.location.href);
    var apiBase = scriptUrl.origin;

    var renderTime = Date.now();

    // Fetch Config for this specific widget
    fetch(apiBase + '/api/widgets/' + widgetId + '/config')
      .then(function (res) {
        if (!res.ok) throw new Error('Widget config fetch failed: ' + res.status);
        return res.json();
      })
      .then(function (config) {
        renderWidget(config, apiBase, renderTime);
      })
      .catch(function (err) {
        console.warn('[FlyRank Widget] Unable to load widget (' + widgetId + '):', err.message);
      });
  });

  function renderWidget(config, apiBase, renderTime) {
    var theme = config.theme || {};
    var primaryColor = theme.primary_color || '#4F46E5';
    var bgColor = theme.background_color || '#FFFFFF';
    var textColor = theme.text_color || '#1F2937';
    var borderRadius = theme.border_radius || '12px';
    var layoutType = config.widget_type || 'popover';

    // Inject Base & Layout-Specific Styles
    var styleEl = document.createElement('style');
    
    var layoutStyles = '';
    if (layoutType === 'top_banner') {
      layoutStyles = `
        .fr-widget-overlay-${config.id} {
          position: fixed;
          top: 0; left: 0; right: 0;
          width: 100%;
          border-radius: 0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          z-index: 999999;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `;
    } else if (layoutType === 'bottom_slidein') {
      layoutStyles = `
        .fr-widget-overlay-${config.id} {
          position: fixed;
          bottom: 20px; left: 20px;
          width: 350px; max-width: 90vw;
          border-radius: ${borderRadius};
          z-index: 999999;
        }
      `;
    } else if (layoutType === 'fullscreen_modal') {
      layoutStyles = `
        .fr-widget-backdrop-${config.id} {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(17, 24, 39, 0.75);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999999;
        }
        .fr-widget-overlay-${config.id} {
          width: 460px; max-width: 90vw;
          border-radius: ${borderRadius};
          z-index: 1000000;
        }
      `;
    } else if (layoutType === 'floating_bubble') {
      layoutStyles = `
        .fr-bubble-btn-${config.id} {
          position: fixed; bottom: 24px; right: 24px;
          width: 60px; height: 60px; border-radius: 50%;
          background: ${primaryColor}; color: white;
          border: none; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
          font-size: 24px; cursor: pointer; z-index: 999999;
          display: flex; align-items: center; justify-content: center;
        }
        .fr-widget-overlay-${config.id} {
          position: fixed; bottom: 96px; right: 24px;
          width: 350px; max-width: 90vw;
          border-radius: ${borderRadius};
          z-index: 999999; display: none;
        }
      `;
    } else {
      layoutStyles = `
        .fr-widget-overlay-${config.id} {
          position: fixed; bottom: 24px; right: 24px;
          width: 360px; max-width: 90vw;
          border-radius: ${borderRadius};
          z-index: 999999;
        }
      `;
    }

    styleEl.innerHTML = `
      ${layoutStyles}
      .fr-widget-overlay-${config.id} {
        background: ${bgColor};
        color: ${textColor};
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        border: 1px solid #E5E7EB;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
      }
      .fr-widget-header-${config.id} {
        display: flex; justify-content: space-between; align-items: flex-start;
        margin-bottom: 10px;
      }
      .fr-widget-title-${config.id} {
        font-size: 17px; font-weight: 700; margin: 0; color: ${textColor}; line-height: 1.3;
      }
      .fr-widget-close-${config.id} {
        background: none; border: none; font-size: 20px; cursor: pointer; color: #9CA3AF; padding: 0 4px;
      }
      .fr-widget-close-${config.id}:hover { color: #4B5563; }
      .fr-widget-copy-${config.id} {
        font-size: 13px; color: #4B5563; margin-bottom: 14px; line-height: 1.4;
      }
      .fr-widget-form-${config.id} {
        display: flex; flex-direction: column; gap: 10px;
      }
      .fr-widget-input-${config.id} {
        width: 100%; padding: 9px 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 13px; box-sizing: border-box; outline: none;
      }
      .fr-widget-input-${config.id}:focus {
        border-color: ${primaryColor}; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }
      .fr-widget-hp { display: none !important; position: absolute; left: -9999px; }
      .fr-widget-btn-${config.id} {
        background: ${primaryColor}; color: #FFFFFF; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .fr-widget-btn-${config.id}:hover { opacity: 0.9; }
      .fr-widget-btn-${config.id}:disabled { opacity: 0.6; cursor: not-allowed; }
      .fr-widget-success-${config.id} {
        background: #DEF7EC; color: #03543F; padding: 10px; border-radius: 6px; font-size: 13px; text-align: center; font-weight: 500;
      }
      .fr-widget-badge {
        font-size: 10px; color: #9CA3AF; text-align: center; margin-top: 10px;
      }
    `;
    document.head.appendChild(styleEl);

    // Build DOM container
    var container = document.createElement('div');
    container.className = 'fr-widget-overlay fr-widget-overlay-' + config.id;
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
            class="fr-widget-input-${config.id}"
          />
        </div>
      `;
    });

    var honeypotHtml = `<input type="text" name="_hp_trap" value="" class="fr-widget-hp" tabindex="-1" autocomplete="off" />`;

    container.innerHTML = `
      <div class="fr-widget-header-${config.id}">
        <h3 class="fr-widget-title-${config.id}">${escapeHtml(config.headline)}</h3>
        <button class="fr-widget-close-${config.id}" onclick="closeWidget('${config.id}', '${layoutType}')">&times;</button>
      </div>
      <p class="fr-widget-copy-${config.id}">${escapeHtml(config.copy)}</p>
      <form class="fr-widget-form-${config.id}" id="fr-form-${config.id}">
        ${fieldsHtml}
        ${honeypotHtml}
        <button type="submit" class="fr-widget-btn-${config.id}" id="fr-btn-${config.id}">${escapeHtml(config.cta_text || 'Submit')}</button>
      </form>
      <div class="fr-widget-badge">Powered by FlyRank Engine</div>
    `;

    // Handle Fullscreen Backdrop or Bubble Wrapper
    if (layoutType === 'fullscreen_modal') {
      var backdrop = document.createElement('div');
      backdrop.className = 'fr-widget-backdrop fr-widget-backdrop-' + config.id;
      backdrop.id = 'fr-backdrop-' + config.id;
      backdrop.appendChild(container);
      document.body.appendChild(backdrop);
    } else if (layoutType === 'floating_bubble') {
      var bubbleBtn = document.createElement('button');
      bubbleBtn.className = 'fr-bubble-btn fr-bubble-btn-' + config.id;
      bubbleBtn.id = 'fr-bubble-' + config.id;
      bubbleBtn.innerHTML = '💬';
      bubbleBtn.onclick = function() {
        var card = document.getElementById('fr-widget-' + config.id);
        card.style.display = (card.style.display === 'block') ? 'none' : 'block';
      };
      document.body.appendChild(bubbleBtn);
      document.body.appendChild(container);
    } else {
      document.body.appendChild(container);
    }

    window.closeWidget = function(id, layout) {
      if (layout === 'fullscreen_modal') {
        var backdrop = document.getElementById('fr-backdrop-' + id);
        if (backdrop) backdrop.remove();
      } else {
        var card = document.getElementById('fr-widget-' + id);
        if (card) card.remove();
      }
    };

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
          <div class="fr-widget-success-${config.id}">
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
