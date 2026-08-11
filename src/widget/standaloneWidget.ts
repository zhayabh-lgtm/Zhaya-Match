/**
 * Standalone Vanilla JS Widget Generator for Zhaya Match
 * Injected into store pages via GTM or direct script tag.
 * Fully resilient, cached, domain-secured, and compliant for Olist / Vercel.
 */

import {
  parseNumber,
  formatMeasurementDisplay,
  getProductCategoryAndFit,
  getCriticalMeasurements,
  getEffectiveRange,
  calculateRecommendation,
  MEASUREMENT_LABELS,
} from '../domain/recommendation';

export function generateWidgetScript(baseUrl: string): string {
  return `(function() {
  if (window.__zhayaMatchLoaded || window.__ZHAYA_MATCH_LOADED__) return;
  window.__zhayaMatchLoaded = true;
  window.__ZHAYA_MATCH_LOADED__ = true;

  var MEASUREMENT_LABELS = ${JSON.stringify(MEASUREMENT_LABELS)};
  ${parseNumber.toString()}
  ${formatMeasurementDisplay.toString()}
  ${getProductCategoryAndFit.toString()}
  ${getCriticalMeasurements.toString()}
  ${getEffectiveRange.toString()}
  ${calculateRecommendation.toString()}

  var API_BASE = (function() {
    var provided = '${baseUrl || ''}';
    if (provided) return provided;
    if (typeof document !== 'undefined') {
      var script = document.currentScript;
      if (!script) {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
          if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
            script = scripts[i];
            break;
          }
        }
      }
      if (script && script.src) {
        try {
          var u = new URL(script.src);
          return u.origin;
        } catch (e) {}
      }
    }
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return '';
  })();
  var CACHE_KEY = '__ZHAYA_MATCH_CONFIG_CACHE_V3__';
  var CACHE_TTL_MS = 1000 * 60; // 1 minuto
  var configData = null;
  var selectedType = null;
  var userMeasurements = {};
  var currentStep = 0; // 0: Welcome, 1: Choose Type, 2: Measurements, 3: Result
  var observer = null;
  var injectAttempts = 0;
  var MAX_INJECT_ATTEMPTS = 15;
  var hasTrackedLauncher = false;
  var hasTrackedMeasurementsInSession = false;
  var hasTrackedClosedInSession = false;
  var hasTrackedFlowStartedInSession = false;
  var hasTrackedProcessingStartedInSession = false;
  var hasTrackedResultViewedInSession = false;
  var hasTrackedFeedbackStartedInSession = false;
  var loadingTimerId = null;
  var isPreviewSessionActive = false;
  var lastAppliedRevision = 0;
  var lastAppliedSessionId = '';

  function getVisitorId() {
    try {
      var key = '__zhaya_visitor_id__';
      var id = localStorage.getItem(key);
      if (!id) {
        id = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return 'v_temp_' + Date.now();
    }
  }

  function getSessionId() {
    try {
      var key = '__zhaya_session_id__';
      var id = sessionStorage.getItem(key);
      if (!id) {
        id = 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return 's_temp_' + Date.now();
    }
  }

  function sendWidgetAnalyticsEvent(eventName, payload) {
    try {
      var search = window.location.search || '';
      var isPreviewParam = search.indexOf('zhaya-match-preview=1') !== -1 ||
                           search.indexOf('admin_preview=1') !== -1 ||
                           Boolean(window['__ZHAYA_MATCH_ADMIN_PREVIEW__']) ||
                           (window.parent && window.parent !== window);

      if (isPreviewParam) {
        return; // Don't send analytics events during admin preview
      }

      var eventData = {
        eventId: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        eventName: eventName,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        productTypeId: payload && payload.productTypeId ? payload.productTypeId : (selectedType ? selectedType.id : undefined),
        productTypeName: payload && payload.productTypeName ? payload.productTypeName : (selectedType ? selectedType.name : undefined),
        productCategory: payload && payload.productCategory ? payload.productCategory : (selectedType ? selectedType.category : undefined),
        recommendationStatus: payload && payload.recommendationStatus ? payload.recommendationStatus : undefined,
        sourceDomain: window.location.hostname || undefined,
        pagePath: (window.location.pathname || '/').split('?')[0],
        deviceType: window.innerWidth < 640 ? 'mobile' : 'desktop',
        configVersion: configData && configData.version ? configData.version : 1,
        metadata: {
          isPreview: isPreviewParam
        }
      };

var url = API_BASE + '/api/public/analytics';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(eventData),
  keepalive: true,
  credentials: 'omit',
  mode: 'cors'
}).catch(function(error) {
  var isDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.search.indexOf('debug=1') !== -1;

  if (isDevelopment) {
    console.warn(
      '[Zhaya Match] Falha ao enviar evento de Analytics:',
      error
    );
  }
});
    } catch (e) {
      var isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.search.indexOf('debug=1') !== -1;

      if (isDevelopment && window.console && console.warn) {
        console.warn(
          '[Zhaya Match] Falha ao preparar evento de Analytics:',
          e
        );
      }
    }
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCachedConfig() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.data && typeof parsed.timestamp === 'number') {
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function setCachedConfig(data) {
    if (isPreviewSessionActive) return; // Prevent draft preview from being saved into public cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function loadPreviewSessionSnapshot() {
    try {
      if (typeof window !== 'undefined' && window.__ZHAYA_MATCH_ADMIN_PREVIEW__ && window.__ZHAYA_MATCH_ADMIN_PREVIEW__.config) {
        var adminPrev = window.__ZHAYA_MATCH_ADMIN_PREVIEW__;
        configData = adminPrev.config;
        isPreviewSessionActive = true;
        if (typeof adminPrev.revision === 'number') lastAppliedRevision = adminPrev.revision;
        if (adminPrev.sessionId) lastAppliedSessionId = adminPrev.sessionId;
        return true;
      }

      var search = window.location.search || '';
      var isPreviewParam = search.indexOf('admin_preview=1') !== -1 || search.indexOf('zhaya-match-preview=1') !== -1;
      if (!isPreviewParam && !(window.parent && window.parent !== window)) {
        return false;
      }

      var sessionParam = '';
      var matches = search.match(/[?&]previewSession=([^&]+)/);
      if (matches && matches[1]) {
        sessionParam = decodeURIComponent(matches[1]);
      } else {
        sessionParam = localStorage.getItem('zhaya_preview_latest_session') || '';
      }

      if (sessionParam) {
        var rawSnap = localStorage.getItem('zhaya_preview_snapshot_' + sessionParam);
        if (rawSnap) {
          var snap = JSON.parse(rawSnap);
          if (snap && snap.timestamp && (Date.now() - snap.timestamp <= 30 * 60 * 1000)) {
            configData = snap;
            isPreviewSessionActive = true;
            if (typeof snap.revision === 'number') lastAppliedRevision = snap.revision;
            lastAppliedSessionId = snap.sessionId || sessionParam;
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  function sendPreviewReady() {
    try {
      if (window.parent && window.parent !== window) {
        var targetOrigin = (window.location && window.location.origin) ? window.location.origin : '*';
        window.parent.postMessage({ type: 'ZHAYA_MATCH_PREVIEW_READY' }, targetOrigin);
      }
    } catch (e) {}
  }

  function isDomainAllowed() {
    try {
      var hostname = (window.location.hostname || '').toLowerCase();
      var search = window.location.search || '';
      var isPreviewParam = search.indexOf('zhaya-match-preview=1') !== -1 || search.indexOf('admin_preview=1') !== -1;

      if (isPreviewParam || (window.parent && window.parent !== window)) {
        return true;
      }

      // Ambientes de desenvolvimento / preview
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.indexOf('run.app') !== -1) {
        return true;
      }

      var allowed = (configData && configData.allowedDomains) || ['zhaya.com.br', 'www.zhaya.com.br'];
      var isTestMode = configData ? configData.testMode : false;

      // Validação de domínios cadastrados
      for (var i = 0; i < allowed.length; i++) {
        var dom = String(allowed[i]).toLowerCase().trim();
        if (!dom) continue;
        if (hostname === dom || hostname.indexOf('.' + dom) !== -1 || dom === '*') {
          return true;
        }
      }

      // Preview da Vercel permitido somente com test_mode ativo ou parâmetro de teste
      if ((isTestMode || isPreviewParam) && hostname.indexOf('.vercel.app') !== -1) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  function normalizeTag(tag) {
    if (!tag && tag !== 0) return '';
    return String(tag)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function getStoreProductTags() {
    if (typeof window !== 'undefined' && Array.isArray(window.ZHAYA_PRODUCT_TAGS)) {
      return window.ZHAYA_PRODUCT_TAGS;
    }
    if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      for (var i = window.dataLayer.length - 1; i >= 0; i--) {
        var item = window.dataLayer[i];
        if (item && Array.isArray(item.zhaya_product_tags)) {
          return item.zhaya_product_tags;
        }
        if (item && item.ecommerce && Array.isArray(item.ecommerce.zhaya_product_tags)) {
          return item.ecommerce.zhaya_product_tags;
        }
      }
    }
    return null;
  }

  function resolveProductTypeByTags() {
    var storeTags = getStoreProductTags();
    if (storeTags === null) {
      return { selectedType: null, hasTagConstraint: false, matchingCount: 0 };
    }

    var normStoreTags = storeTags.map(normalizeTag).filter(Boolean);
    var activeTypes = (configData && Array.isArray(configData.productTypes))
      ? configData.productTypes.filter(function(pt) { return pt.active !== false; })
      : [];

    var matches = [];
    for (var i = 0; i < activeTypes.length; i++) {
      var type = activeTypes[i];
      var typeTags = (type.storeTags || []).map(normalizeTag).filter(Boolean);
      var hasMatch = false;
      for (var j = 0; j < normStoreTags.length; j++) {
        if (typeTags.indexOf(normStoreTags[j]) !== -1) {
          hasMatch = true;
          break;
        }
      }
      if (hasMatch) {
        matches.push(type);
      }
    }

    if (matches.length === 1) {
      return { selectedType: matches[0], hasTagConstraint: true, matchingCount: 1 };
    } else if (matches.length > 1) {
      matches.sort(function(a, b) {
        var ordA = typeof a.order === 'number' ? a.order : 1;
        var ordB = typeof b.order === 'number' ? b.order : 1;
        return ordA - ordB;
      });
      if (window.console && console.warn) {
        console.warn('[Zhaya Match] Múltiplos tipos correspondem às tags do produto:', matches.map(function(t) { return t.name; }).join(', '), '. Selecionado o de menor ordem:', matches[0].name);
      }
      return { selectedType: matches[0], hasTagConstraint: true, matchingCount: matches.length };
    } else {
      return { selectedType: null, hasTagConstraint: true, matchingCount: 0 };
    }
  }

function initZhayaMatch() {
  sendPreviewReady();

  if (loadPreviewSessionSnapshot()) {
    startInjection();
    return;
  }

  try {
    var cached = getCachedConfig();
    var now = Date.now();

    if (cached && cached.data) {
      configData = cached.data;

      if (
        isDomainAllowed() &&
        configData.enabled !== false
      ) {
        startInjection();
      }

      if (
        now - cached.timestamp >
        CACHE_TTL_MS
      ) {
        fetchConfigFromNetwork(true);
      }
    } else {
      fetchConfigFromNetwork(false);
    }
  } catch (err) {
    fetchConfigFromNetwork(false);
  }
}

function fetchConfigFromNetwork(isBackground) {
  if (isPreviewSessionActive) return; // Never overwrite active administrative preview snapshot with public API response

  fetch(API_BASE + '/api/public/config', {
    cache: 'no-store'
  })
    .then(function(res) {
      if (!res.ok) {
        throw new Error(
          'Falha ao carregar configuração pública.'
        );
      }

      return res.json();
    })
    .then(function(data) {
      if (!data || isPreviewSessionActive) return;

      configData = data;
      setCachedConfig(data);

      if (
        !isDomainAllowed() ||
        data.enabled === false
      ) {
        removeTriggerButton();
        return;
      }

      startInjection();

      var overlay =
        document.getElementById(
          'zhaya-match-modal-overlay'
        );

      if (
        overlay &&
        overlay.style.display !== 'none'
      ) {
        renderModalContent();
      }
    })
    .catch(function(err) {
      // Mantém o cache existente caso a rede falhe.
    });
}

  function findProductTargetElement() {
    var selectors = [
      '.btn-medidas',
      '.option-Tamanho',
      '[data-attribute-name="Tamanho"]',
      '[data-attribute-name="tamanho"]',
      '.actions-wrapper',
      'form.add-to-cart',
      'form[action*="carrinho"]',
      '.product-buy-box',
      '.buy-box'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        // Evita inserção em vitrines de produtos relacionados ou carrosséis
        if (el.closest('.related-products, .product-grid, .shelf, .vitrine, .products-carousel, .recommendations')) {
          continue;
        }
        return el;
      }
    }
    return null;
  }

  function startInjection() {
    var resolved = resolveProductTypeByTags();
    if (resolved.hasTagConstraint && resolved.matchingCount === 0 && !isPreviewSessionActive) {
      removeTriggerButton();
      return;
    }

    if (tryInjectButton()) return;

    if (window.MutationObserver && !observer) {
      observer = new MutationObserver(function() {
        injectAttempts++;
        if (tryInjectButton() || injectAttempts >= MAX_INJECT_ATTEMPTS) {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
        }
      });
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  }

  function removeTriggerButton() {
    var existing = document.getElementById('zhaya-match-trigger');
    if (existing) existing.remove();
  }

  function tryInjectButton() {
    var target = findProductTargetElement();
    if (!target) return false;

    renderTriggerButton(target);
    return true;
  }

  function getEffectiveBackgroundColor(el) {
    try {
      var current = el;
      while (current && current !== document.documentElement && current !== document.body) {
        var style = window.getComputedStyle(current);
        var bg = style ? style.backgroundColor : '';
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          return bg;
        }
        current = current.parentElement;
      }
    } catch (e) {}
    return 'rgb(255, 255, 255)'; // Presumed white background if transparent
  }

  function parseRgbColor(str) {
    if (!str) return { r: 255, g: 255, b: 255 };
    str = String(str).trim();
    if (str.indexOf('rgb') === 0) {
      var matches = str.match(/\d+/g);
      if (matches && matches.length >= 3) {
        return { r: parseInt(matches[0], 10), g: parseInt(matches[1], 10), b: parseInt(matches[2], 10) };
      }
    }
    if (str.indexOf('#') === 0) {
      var hex = str.replace('#', '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16) || 0,
          g: parseInt(hex.substring(2, 4), 16) || 0,
          b: parseInt(hex.substring(4, 6), 16) || 0
        };
      }
    }
    return { r: 255, g: 255, b: 255 };
  }

  function getLuminance(r, g, b) {
    var a = [r, g, b].map(function(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(c1, c2) {
    var lum1 = getLuminance(c1.r, c1.g, c1.b);
    var lum2 = getLuminance(c2.r, c2.g, c2.b);
    var brightest = Math.max(lum1, lum2);
    var darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  function renderTriggerButton(target) {
    removeTriggerButton();

    var app = (configData && configData.appearance) ? configData.appearance : {};
    var txt = (configData && configData.texts) ? configData.texts : {};
    var btnText = txt.buttonText || app.buttonText || 'Encontrar meu tamanho';

    var button = document.createElement('button');
    button.id = 'zhaya-match-trigger';
    button.type = 'button';
    
    var btnFontSize = app.storeButtonFontSize || app.buttonFontSize || 13;
    var btnWeight = app.storeButtonFontWeight || '500';
    var btnTextColor = app.storeButtonTextColor || '#111111';

    // Automatic Contrast Protection
    var effectiveBgStr = getEffectiveBackgroundColor(target);
    var bgRgb = parseRgbColor(effectiveBgStr);
    var textRgb = parseRgbColor(btnTextColor);
    var contrastRatio = getContrastRatio(bgRgb, textRgb);

    if (contrastRatio < 4.5) {
      var whiteRatio = getContrastRatio(bgRgb, { r: 255, g: 255, b: 255 });
      var darkRatio = getContrastRatio(bgRgb, { r: 17, g: 17, b: 17 });
      var adjustedColor = whiteRatio > darkRatio ? '#FFFFFF' : '#111111';
      var isDev = window.location.hostname === 'localhost' || window.location.search.indexOf('debug=1') !== -1;
      if (isDev) {
        console.warn('[Zhaya Match] Ajuste automático de contraste do texto do launcher de ' + btnTextColor + ' para ' + adjustedColor + ' (fundo detectado: ' + effectiveBgStr + ', razão ' + contrastRatio.toFixed(2) + ':1)');
      }
      btnTextColor = adjustedColor;
    }

    var styleStr = 'display: inline-flex; align-items: center; justify-content: flex-start; background: transparent; color: ' + btnTextColor + '; border: none; padding: 4px 0; margin: 10px 0; font-size: ' + btnFontSize + 'px; font-weight: ' + btnWeight + '; cursor: pointer; transition: opacity 0.2s ease; font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif; text-decoration: underline; text-underline-offset: 4px; outline: none; box-sizing: border-box; font-style: normal;';
    
    button.style.cssText = styleStr;
    button.innerText = btnText;

    button.onmouseover = function() {
      button.style.opacity = '0.7';
    };
    button.onmouseout = function() {
      button.style.opacity = '1';
    };

    button.onclick = function(e) {
      e.preventDefault();
      sendWidgetAnalyticsEvent('launcher_clicked');
      openModal();
    };

    window.openZhayaMatchModal = openModal;

    if (target && target.parentNode) {
      target.parentNode.insertBefore(button, target.nextSibling);
      if (!hasTrackedLauncher) {
        hasTrackedLauncher = true;
        sendWidgetAnalyticsEvent('launcher_viewed');
      }
    }
  }

  function hexToRgba(hex, alpha) {
    hex = (hex || '#000000').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16) || 0;
    var g = parseInt(hex.substring(2, 4), 16) || 0;
    var b = parseInt(hex.substring(4, 6), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function openModal() {
    var resolved = resolveProductTypeByTags();
    if (resolved.selectedType) {
      selectedType = resolved.selectedType;
      currentStep = 2; // Auto-selected type by tags, jump directly to measurements
    } else {
      currentStep = 0;
      selectedType = null;
    }

    userMeasurements = {};
    hasTrackedMeasurementsInSession = false;
    hasTrackedClosedInSession = false;
    hasTrackedFlowStartedInSession = false;
    hasTrackedProcessingStartedInSession = false;
    hasTrackedResultViewedInSession = false;
    hasTrackedFeedbackStartedInSession = false;
    if (loadingTimerId) {
      clearTimeout(loadingTimerId);
      loadingTimerId = null;
    }

    sendWidgetAnalyticsEvent('widget_opened');

    var overlay = document.getElementById('zhaya-match-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'zhaya-match-modal-overlay';
      document.body.appendChild(overlay);
    }

    var app = (configData && configData.appearance) || {};
    var opacityOverlay = app.overlayOpacity !== undefined ? app.overlayOpacity : 0.75;
    var blurVal = app.enableBlur ? (app.blurAmount || 3) + 'px' : '0px';

    if (app.customFontUrl && !document.getElementById('zhaya-custom-font')) {
      var fontStyle = document.createElement('style');
      fontStyle.id = 'zhaya-custom-font';
      fontStyle.innerHTML = '@font-face { font-family: "Neue Einstellung"; src: url("' + app.customFontUrl + '"); font-display: swap; }';
      document.head.appendChild(fontStyle);
    }

    var bgOverlayStr = hexToRgba(app.overlayColor || '#000000', opacityOverlay);
    var isDesktop = window.innerWidth >= 640;

    try {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } catch (e) {}

    if (isDesktop) {
      overlay.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; background: ' + bgOverlayStr + '; z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; backdrop-filter: blur(' + blurVal + '); -webkit-backdrop-filter: blur(' + blurVal + '); font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif;';
    } else {
      overlay.style.cssText = 'position: fixed; inset: 0; width: 100%; height: 100dvh; max-height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; background: ' + bgOverlayStr + '; z-index: 999999; display: flex; align-items: flex-start; justify-content: center; padding: max(12px, env(safe-area-inset-top, 12px)) max(12px, env(safe-area-inset-right, 12px)) max(24px, env(safe-area-inset-bottom, 24px)) max(12px, env(safe-area-inset-left, 12px)); box-sizing: border-box; backdrop-filter: blur(' + blurVal + '); -webkit-backdrop-filter: blur(' + blurVal + '); font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif;';
    }

    if (app.closeOnClickOutside !== false) {
      overlay.onclick = function(e) {
        if (e.target === overlay) closeModal();
      };
    }

    document.addEventListener('keydown', handleKeyDown);
    renderModalContent();
  }

  function closeModal() {
    if (loadingTimerId) {
      clearTimeout(loadingTimerId);
      loadingTimerId = null;
    }
    if (!hasTrackedClosedInSession) {
      hasTrackedClosedInSession = true;
      sendWidgetAnalyticsEvent('widget_closed');
    }
    try {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    } catch (e) {}
    var overlay = document.getElementById('zhaya-match-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.remove();
    }
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function getFemaleSilhouetteSvg(selectedType) {
    var typeName = selectedType ? (selectedType.name || '') : '';
    var keys = selectedType ? (selectedType.measurements || []) : [];
    var isFootwear =
      typeName.toLowerCase().indexOf('sapato') !== -1 ||
      typeName.toLowerCase().indexOf('calçado') !== -1 ||
      typeName.toLowerCase().indexOf('tenis') !== -1 ||
      typeName.toLowerCase().indexOf('sapatilha') !== -1 ||
      typeName.toLowerCase().indexOf('sandália') !== -1 ||
      keys.indexOf('footLength') !== -1 ||
      keys.indexOf('footWidth') !== -1;

    if (isFootwear) {
      return '<svg viewBox="0 0 200 280" style="width: 100%; height: 210px; color: rgba(255,255,255,0.9);" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M80,240 C60,240 50,220 50,180 C50,130 65,90 75,60 C80,45 92,30 110,30 C130,30 145,45 145,70 C145,90 135,110 135,140 C135,180 140,210 120,240 C105,250 90,248 80,240 Z" opacity="0.3" fill="rgba(255,255,255,0.03)" />' +
        '<path d="M100,38 C105,38 112,42 112,50 C112,58 105,62 100,62 C95,62 90,58 90,50 C90,42 95,38 100,38 Z M118,48 C122,48 127,51 127,57 C127,63 122,66 118,66 C114,66 110,63 110,57 C110,51 114,48 118,48 Z" opacity="0.4" />' +
        '<g opacity="1">' +
          '<line x1="30" y1="30" x2="30" y2="245" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="3 3" />' +
          '<line x1="24" y1="30" x2="110" y2="30" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 2" />' +
          '<line x1="24" y1="245" x2="100" y2="245" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 2" />' +
          '<circle cx="30" cy="137" r="3" fill="#FFFFFF" />' +
          '<text x="10" y="140" fill="#FFFFFF" font-size="8" font-weight="700" text-anchor="end">COMPRIMENTO</text>' +
        '</g>' +
        '<g opacity="1">' +
          '<line x1="45" y1="130" x2="148" y2="130" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="3 3" />' +
          '<circle cx="96" cy="130" r="3" fill="#FFFFFF" />' +
          '<text x="96" y="146" fill="#FFFFFF" font-size="8" font-weight="700" text-anchor="middle">LARGURA DO PÉ</text>' +
        '</g>' +
      '</svg>';
    }

    return '<svg viewBox="0 0 200 300" style="width: 100%; height: 210px; color: rgba(255,255,255,0.9);" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M100,28 C108,28 114,35 114,44 C114,52 108,58 100,58 C92,58 86,52 86,44 C86,35 92,28 100,28 Z M90,62 L110,62 L128,74 C134,88 138,102 136,116 C132,112 124,106 118,106 L82,106 C76,106 68,112 64,116 C62,102 66,88 72,74 Z M82,106 C80,122 78,138 88,154 C92,160 92,166 90,172 C80,186 72,204 70,224 L130,224 C128,204 120,186 110,172 C108,166 108,160 112,154 C122,138 120,122 118,106 Z M80,224 L78,290 M120,224 L122,290" opacity="0.35" />' +
      '<g opacity="1">' +
        '<line x1="40" y1="116" x2="160" y2="116" stroke="#FFFFFF" stroke-dasharray="3 3" />' +
        '<circle cx="100" cy="116" r="3" fill="#FFFFFF" />' +
        '<text x="165" y="119" fill="#FFFFFF" font-size="9" font-weight="600">BUSTO</text>' +
      '</g>' +
      '<g opacity="1">' +
        '<line x1="45" y1="160" x2="155" y2="160" stroke="#FFFFFF" stroke-dasharray="3 3" />' +
        '<circle cx="100" cy="160" r="3" fill="#FFFFFF" />' +
        '<text x="160" y="163" fill="#FFFFFF" font-size="9" font-weight="600">CINTURA</text>' +
      '</g>' +
      '<g opacity="1">' +
        '<line x1="40" y1="198" x2="160" y2="198" stroke="#FFFFFF" stroke-dasharray="3 3" />' +
        '<circle cx="100" cy="198" r="3" fill="#FFFFFF" />' +
        '<text x="165" y="201" fill="#FFFFFF" font-size="9" font-weight="600">QUADRIL</text>' +
      '</g>' +
    '</svg>';
  }

  function renderModalContent() {
    var overlay = document.getElementById('zhaya-match-modal-overlay');
    if (!overlay) return;

    var app = (configData && configData.appearance) || {};
    var opacityOverlay = app.overlayOpacity !== undefined ? app.overlayOpacity : 0.75;
    var blurVal = app.enableBlur ? (app.blurAmount || 3) + 'px' : '0px';
    var bgOverlayStr = hexToRgba(app.overlayColor || '#000000', opacityOverlay);

    overlay.style.background = bgOverlayStr;
    overlay.style.backdropFilter = 'blur(' + blurVal + ')';
    overlay.style.webkitBackdropFilter = 'blur(' + blurVal + ')';

    var txt = (configData && configData.texts) || {};
    var helps = (configData && configData.measurementHelps) || {};
    var allTypes = (configData && configData.productTypes) || [];
    var types = [];
    for (var tIdx = 0; tIdx < allTypes.length; tIdx++) {
      if (allTypes[tIdx].active === true) {
        types.push(allTypes[tIdx]);
      }
    }

    var bg = app.backgroundColor || '#000000';
    var cardBgOpacity = app.backgroundOpacity !== undefined ? app.backgroundOpacity : 1;
    var finalCardBg = cardBgOpacity < 1 ? hexToRgba(bg, cardBgOpacity) : bg;
    var textColor = app.textColor || '#FFFFFF';
    var secTextColor = app.secondaryTextColor || '#A3A3A3';
    var btnColor = app.buttonColor || '#FFFFFF';
    var btnTextColor = app.buttonTextColor || '#000000';
    var borderRadius = (app.borderRadius !== undefined ? app.borderRadius : 8) + 'px';
    var desktopWidth = (app.desktopWidth || 820) + 'px';
    var isDesktop = window.innerWidth >= 640;

    var innerHtml = '';

    // Cabeçalho com Logotipo (Apenas o logo no topo, sem repetição de textos)
    var logoHtml = '';
    if (app.showLogo !== false) {
      if (app.logoWhiteUrl) {
        logoHtml = '<img src="' + escapeHtml(app.logoWhiteUrl) + '" alt="Logo Zhaya" style="height: ' + (app.logoSize || 28) + 'px; object-fit: contain; max-width: 200px;" decoding="async" />';
      } else {
        logoHtml = '<div style="height: ' + (app.logoSize || 28) + 'px; width: 120px; background: rgba(255,255,255,0.06); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #737373; font-size: 10px; font-family: monospace; letter-spacing: 0.1em;">ZHAYA</div>';
      }
    }

    innerHtml += '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; min-height: 36px;">' +
      '<div>' +
        (currentStep > 0 ? '<button id="zhaya-back-btn-step" style="background: transparent; border: none; color: ' + escapeHtml(secTextColor) + '; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 0; font-family: inherit;">← Voltar</button>' : '') +
      '</div>' +
      '<div style="display: flex; align-items: center; justify-content: center;">' +
        logoHtml +
      '</div>' +
      '<button id="zhaya-close-x" aria-label="Fechar" style="background: transparent; border: none; color: ' + escapeHtml(secTextColor) + '; font-size: 18px; cursor: pointer; padding: 6px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-family: inherit;">✕</button>' +
    '</div>';

    // STEP 0: Mensagem Inicial Limpa e Acolhedora
    if (currentStep === 0) {
      innerHtml += '<div style="text-align: center; padding: 28px 16px 16px; max-width: 460px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 16px;">' +
        '<h2 style="font-size: 22px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin: 0; letter-spacing: -0.02em; line-height: 1.2;">Descubra seu tamanho ideal.</h2>' +
        '<p style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; line-height: 1.6; margin: 0; max-width: 380px;">Informe suas medidas e encontre o caimento mais indicado para o seu corpo.</p>' +
        '<button id="zhaya-start-btn" style="width: 100%; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; height: 52px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: 8px; font-family: inherit;">' + escapeHtml(txt.welcomeButtonText || 'Encontrar meu tamanho') + '</button>' +
        '<p style="font-size: 11px; color: #525252; margin-top: 4px; line-height: 1.4;">Usamos suas medidas apenas para esta recomendação.</p>' +
      '</div>';
    }

    // STEP 1: Escolha da Categoria (Tipo de Produto)
    else if (currentStep === 1) {
      innerHtml += '<div style="text-align: center; margin-bottom: 24px;">' +
        '<h2 style="font-size: 18px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 6px; letter-spacing: -0.01em;">' + escapeHtml(txt.typeChoiceTitle || 'Qual peça você deseja escolher?') + '</h2>' +
        '<p style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin: 0;">Selecione a categoria para ajustarmos as medidas recomendadas.</p>' +
      '</div>';

      var activeTypesCount = types.length;
      var gridColsDesktop = 'repeat(2, 1fr)';
      var maxWDesktop = '640px';

      if (activeTypesCount === 1) {
        gridColsDesktop = '1fr';
        maxWDesktop = '320px';
      } else if (activeTypesCount === 2) {
        gridColsDesktop = 'repeat(2, 1fr)';
        maxWDesktop = '480px';
      } else if (activeTypesCount === 3) {
        gridColsDesktop = 'repeat(3, 1fr)';
        maxWDesktop = '640px';
      } else if (activeTypesCount === 4) {
        gridColsDesktop = 'repeat(4, 1fr)';
        maxWDesktop = '720px';
      } else {
        gridColsDesktop = 'repeat(auto-fill, minmax(130px, 1fr))';
        maxWDesktop = '760px';
      }

      var gridColsMobile = activeTypesCount === 1 ? '1fr' : 'repeat(2, 1fr)';
      var maxWMobile = activeTypesCount === 1 ? '280px' : '100%';

      var gridStyle = isDesktop
        ? 'display: grid; grid-template-columns: ' + gridColsDesktop + '; gap: 14px; width: 100%; max-width: ' + maxWDesktop + '; margin: 0 auto; padding: 4px; box-sizing: border-box;'
        : 'display: grid; grid-template-columns: ' + gridColsMobile + '; gap: 10px; width: ' + maxWMobile + '; margin: 0 auto; padding: 4px; box-sizing: border-box;';
      innerHtml += '<div style="' + gridStyle + '">';

      for (var i = 0; i < types.length; i++) {
        var pt = types[i];
        var isSel = selectedType && selectedType.id === pt.id;
        var useIcon = Boolean((pt.useIconInSelector || pt.use_icon_in_selector) && (pt.iconUrl || pt.icon_url));
        var iconSrc = pt.iconUrl || pt.icon_url;

        if (useIcon && iconSrc) {
          var iconCardStyle = 'background: transparent;' +
            ' border: none;' +
            ' padding: 6px;' +
            ' cursor: pointer;' +
            ' text-align: center;' +
            ' transition: transform 0.2s ease, opacity 0.2s ease;' +
            ' display: flex;' +
            ' flex-direction: column;' +
            ' align-items: center;' +
            ' justify-content: flex-start;' +
            ' font-family: inherit;' +
            ' opacity: ' + (isSel ? '1' : '0.8') + ';' +
            ' transform: ' + (isSel ? 'scale(1.04)' : 'scale(1)') + ';' +
            ' outline: none;' +
            ' border-radius: 12px;';

          var imgStyle = 'width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center; transition: filter 0.2s;' +
            (isSel ? ' filter: drop-shadow(0 0 10px rgba(255,255,255,0.45));' : '');

          var dotHtml = isSel ? '<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ' + escapeHtml(textColor) + '; margin-top: 4px;"></span>' : '';

          innerHtml += '<button class="zhaya-type-card zhaya-icon-card" data-type-id="' + escapeHtml(pt.id) + '" style="' + iconCardStyle + '">' +
            '<div class="zhaya-img-wrapper" style="width: 100%; max-width: clamp(110px, 22vh, 180px); height: clamp(110px, 22vh, 180px); display: flex; align-items: center; justify-content: center; margin: 0 auto; padding: 4px; box-sizing: border-box;">' +
              '<img class="zhaya-type-icon-img" src="' + escapeHtml(iconSrc) + '" alt="' + escapeHtml(pt.name) + '" style="' + imgStyle + '" loading="lazy" />' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; align-items: center; margin-top: 6px; width: 100%;">' +
              '<span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ' + escapeHtml(textColor) + '; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">' + escapeHtml(pt.name) + '</span>' +
              dotHtml +
            '</div>' +
          '</button>';
        } else {
          var cardStyle = 'background: ' + (isSel ? escapeHtml(textColor) : (app.inputBackgroundColor || 'rgba(255,255,255,0.04)')) + ';' +
            ' color: ' + (isSel ? escapeHtml(bgColor) : escapeHtml(textColor)) + ';' +
            ' border: 1px solid ' + (isSel ? escapeHtml(textColor) : (app.inputBorderColor || 'rgba(255,255,255,0.08)')) + ';' +
            ' border-radius: ' + (app.inputBorderRadius !== undefined ? app.inputBorderRadius : 8) + 'px;' +
            ' padding: 14px 10px;' +
            ' font-size: 12px;' +
            ' font-weight: 600;' +
            ' text-transform: uppercase;' +
            ' letter-spacing: 0.03em;' +
            ' cursor: pointer;' +
            ' text-align: center;' +
            ' transition: all 0.2s;' +
            ' display: flex;' +
            ' flex-direction: column;' +
            ' align-items: center;' +
            ' justify-content: center;' +
            ' font-family: inherit;' +
            ' min-height: 76px;';

          innerHtml += '<button class="zhaya-type-card" data-type-id="' + escapeHtml(pt.id) + '" style="' + cardStyle + '">' +
            '<span style="line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">' + escapeHtml(pt.name) + '</span>' +
          '</button>';
        }
      }

      innerHtml += '</div>';
    }

    // STEP 2: Formulário de Medidas
    else if (currentStep === 2 && selectedType) {
      var keys = selectedType.measurements || [];
     var typeNameLower = (selectedType.name || '').toLowerCase();

var hasFootMeasurements =
  keys.indexOf('footLength') !== -1 ||
  keys.indexOf('footWidth') !== -1;

var upperScore = 0;
var lowerScore = 0;

if (keys.indexOf('bust') !== -1) upperScore++;
if (keys.indexOf('shoulders') !== -1) upperScore++;
if (keys.indexOf('torsoLength') !== -1) upperScore++;

if (keys.indexOf('hip') !== -1) lowerScore++;
if (keys.indexOf('thigh') !== -1) lowerScore++;

var measurementGroup = 'unknown';

if (hasFootMeasurements) {
  measurementGroup = 'footwear';
} else if (upperScore > lowerScore) {
  measurementGroup = 'upper_body';
} else if (lowerScore > upperScore) {
  measurementGroup = 'lower_body';
} else if (
  /sapato|calcado|calçado|tenis|tênis|sapatilha|sandalia|sandália|mocassim|bota|rasteira|scarpin|mule/.test(typeNameLower)
) {
  measurementGroup = 'footwear';
} else if (
  /camisa|blusa|jaqueta|blazer|casaco|colete|top|cropped|body|vestido|macacao|macacão/.test(typeNameLower)
) {
  measurementGroup = 'upper_body';
} else if (
  /calca|calça|short|shorts|saia|bermuda|legging/.test(typeNameLower)
) {
  measurementGroup = 'lower_body';
}

var activeImgUrl = '';
var activeCaption = '';

if (selectedType && selectedType.measurementImageUrl && selectedType.measurementImageUrl.trim()) {
  activeImgUrl = selectedType.measurementImageUrl.trim();
  activeCaption = selectedType.measurementImageCaption || ('Referência de medidas para ' + (selectedType.name || 'este produto'));
} else if (measurementGroup === 'footwear') {
  activeImgUrl =
    app.footwearMeasurementImageUrl || '';

  activeCaption =
    app.footwearMeasurementImageCaption ||
    'Referência para comprimento e largura do pé.';
} else if (measurementGroup === 'lower_body') {
  activeImgUrl =
    app.lowerBodyMeasurementImageUrl || '';

  activeCaption =
    app.lowerBodyMeasurementImageCaption ||
    'Referência para cintura, quadril e coxa.';
} else if (measurementGroup === 'upper_body') {
  activeImgUrl =
    app.upperBodyMeasurementImageUrl ||
    app.apparelMeasurementImageUrl ||
    app.mainMeasurementImageUrl ||
    '';

  activeCaption =
    app.upperBodyMeasurementImageCaption ||
    app.apparelMeasurementImageCaption ||
    app.mainMeasurementImageCaption ||
    'Referência para busto, cintura, ombros e comprimento do tronco.';
}

   var imageDisplayHeight = isDesktop
  ? 320
  : Math.min(200, Math.max(150, Number(app.mobileImageHeight !== undefined ? app.mobileImageHeight : 180)));

var imageBlockMinHeight = isDesktop ? 360 : 'auto';

var imgBlockHtml =
  '<div style="' +
    'background: ' + escapeHtml(app.imageAreaBgColor || 'rgba(255,255,255,0.03)') + ';' +
    'border-radius: ' + (app.imageBorderRadius !== undefined ? app.imageBorderRadius : 12) + 'px;' +
    'padding: 10px 8px;' +
    'display: flex;' +
    'flex-direction: column;' +
    'align-items: center;' +
    'justify-content: center;' +
    'width: 100%;' +
    (imageBlockMinHeight !== 'auto' ? 'min-height: ' + imageBlockMinHeight + 'px;' : '') +
    'box-sizing: border-box;' +
  '">' +

    '<div style="' +
      'width: 100%;' +
      'max-height: ' + imageDisplayHeight + 'px;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'overflow: hidden;' +
    '">' +

      (
        activeImgUrl
          ? '<img ' +
              'src="' + escapeHtml(activeImgUrl) + '" ' +
              'alt="' + escapeHtml(activeCaption || 'Como tirar as medidas') + '" ' +
              'style="' +
                'display: block;' +
                'width: 100%;' +
                'height: auto;' +
                'max-width: 100%;' +
                'max-height: ' + imageDisplayHeight + 'px;' +
                'object-fit: contain;' +
                'object-position: center;' +
                'border-radius: 8px;' +
              '" ' +
              'loading="lazy" ' +
              'decoding="async" ' +
            '/>'
          : getFemaleSilhouetteSvg(selectedType)
      ) +

    '</div>' +

    '<div style="' +
      'width: 100%;' +
      'text-align: center;' +
      'padding-top: 8px;' +
      'display: flex;' +
      'flex-direction: column;' +
      'align-items: center;' +
      'gap: 4px;' +
    '">' +

      (
        app.showMeasurementCaption !== false && activeCaption
          ? '<div style="' +
              'font-size: 11px;' +
              'color: ' + escapeHtml(secTextColor) + ';' +
              'line-height: 1.4;' +
            '">' +
              escapeHtml(activeCaption) +
            '</div>'
          : ''
      ) +

      '<button ' +
        'id="zhaya-saber-mais-btn" ' +
        'type="button" ' +
        'style="' +
          'background: transparent;' +
          'color: ' + escapeHtml(textColor) + ';' +
          'border: none;' +
          'padding: 4px 8px;' +
          'font-size: 12px;' +
          'font-weight: 500;' +
          'cursor: pointer;' +
          'text-decoration: underline;' +
          'text-underline-offset: 4px;' +
          'font-family: inherit;' +
          'transition: opacity 0.2s;' +
        '"' +
      '>' +
        'Ver como medir' +
      '</button>' +

    '</div>' +

  '</div>';

      var inputFontSize = isDesktop ? '13px' : '16px'; // 16px on mobile prevents iOS Safari auto-zoom on focus

      var formBlockHtml = '<div style="display: flex; flex-direction: column; justify-content: space-between; gap: 16px; height: 100%;">' +
        '<div>' +
          '<h2 style="font-size: 18px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 4px; letter-spacing: -0.01em;">Informe suas medidas</h2>' +
          '<p style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 16px; line-height: 1.4;">Use centímetros e mantenha a fita rente ao corpo, sem apertar.</p>' +
          '<div style="display: flex; flex-direction: column; gap: 14px;">';

      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        var h = helps[k] || { label: k };
        var val = userMeasurements[k] || '';

        formBlockHtml += '<div style="display: flex; flex-direction: column; gap: 6px;">' +
          '<label style="font-size: 12px; font-weight: 500; color: ' + escapeHtml(textColor) + ';">' + escapeHtml(h.label) + ' <span style="color: ' + escapeHtml(secTextColor) + '; font-size: 11px; font-weight: 400;">(cm)</span></label>' +
          '<div style="position: relative; display: flex; align-items: center; gap: 8px;">' +
            '<input type="text" inputmode="decimal" class="zhaya-input" data-key="' + escapeHtml(k) + '" value="' + escapeHtml(val) + '" placeholder="Digite a medida em cm" style="flex: 1; min-width: 0; background: #0F0F0F; border: 1px solid rgba(255,255,255,0.12); color: #ffffff; padding: 12px 14px; border-radius: 8px; font-size: ' + inputFontSize + '; outline: none; transition: border-color 0.2s; font-family: inherit; box-sizing: border-box; max-width: 100%;" />' +
            (!isDesktop
              ? '<button type="button" class="zhaya-wheel-btn" data-key="' + escapeHtml(k) + '" aria-label="Selecionar medida" title="Selecionar medida" style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #ffffff; cursor: pointer; flex-shrink: 0; transition: background 0.2s; outline: none;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></button>'
              : '') +
          '</div>' +
          '<span class="zhaya-error-msg" data-error-for="' + escapeHtml(k) + '" style="color: #f87171; font-size: 11px; margin-top: 2px; display: none;"></span>' +
        '</div>';
      }

      formBlockHtml += '</div>' +
        '</div>' +
        '<button id="zhaya-calc-btn" style="width: 100%; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; height: 52px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 12px; transition: opacity 0.2s; font-family: inherit;">' + escapeHtml(txt.calculateButtonText || 'Encontrar meu tamanho') + '</button>' +
      '</div>';

      if (isDesktop) {
        innerHtml += '<div style="display: grid; grid-template-columns: 42% 54%; gap: 4%; min-height: 320px; align-items: stretch;">' +
          imgBlockHtml +
          formBlockHtml +
        '</div>';
      } else {
        innerHtml += '<div style="display: flex; flex-direction: column; gap: 16px;">' +
          imgBlockHtml +
          formBlockHtml +
        '</div>';
      }
    }

    // STEP 2.5: Loading do resultado
    else if (currentStep === 2.5) {
      var loadingLogoSrc = app.logoVariant === 'white'
        ? (app.logoWhiteUrl || app.logoBlackUrl)
        : app.logoVariant === 'black'
        ? (app.logoBlackUrl || app.logoWhiteUrl)
        : (app.logoWhiteUrl || app.logoBlackUrl);

      var loadingLogoHtml = '';
      if (loadingLogoSrc) {
        loadingLogoHtml = '<img src="' + escapeHtml(loadingLogoSrc) + '" alt="Zhaya" style="height: ' + Math.max(app.logoSize || 28, 36) + 'px; max-width: 200px; object-fit: contain; animation: zhayaPulse 1.8s ease-in-out infinite;" decoding="async" />';
      } else {
        loadingLogoHtml = '<span style="font-size: 22px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: ' + escapeHtml(textColor) + '; animation: zhayaPulse 1.8s ease-in-out infinite;">ZHAYA</span>';
      }

      innerHtml += '<div style="text-align: center; padding: 48px 16px 36px; max-width: 360px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 240px; box-sizing: border-box;">' +
        '<div style="min-height: 56px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">' +
          loadingLogoHtml +
        '</div>' +
        '<h3 style="font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ' + escapeHtml(textColor) + '; margin: 0 0 8px 0;">Analisando suas medidas</h3>' +
        '<p style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; margin: 0; letter-spacing: 0.02em;">Preparando sua recomendação</p>' +
      '</div>';
    }

    // STEP 3: Resultado
    else if (currentStep === 3) {
      innerHtml += '<div style="text-align: center; padding: 20px 8px 12px; max-width: 440px; margin: 0 auto;">';

      if (userMeasurements.__result) {
        var res = userMeasurements.__result;

        if (res.status === 'recommended' && res.size) {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">SEU TAMANHO SUGERIDO</div>';
          innerHtml += '<div style="font-size: clamp(32px, 8vw, 56px); font-weight: 700; color: ' + escapeHtml(textColor) + '; line-height: 1.1; margin-bottom: 16px; letter-spacing: -0.02em; word-break: break-word;">' + escapeHtml(res.size) + '</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.5;">' + escapeHtml(res.message || 'Este tamanho apresenta a melhor correspondência com as medidas informadas.') + '</div>';
        } else if (res.status === 'between_sizes' && res.size && res.alternateSize) {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">VOCÊ ESTÁ ENTRE DOIS TAMANHOS</div>';
          innerHtml += '<div style="font-size: clamp(24px, 6vw, 40px); font-weight: 700; color: ' + escapeHtml(textColor) + '; line-height: 1.1; margin-bottom: 16px; letter-spacing: -0.02em; word-break: break-word;">' + escapeHtml(res.size) + ' e ' + escapeHtml(res.alternateSize) + '</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.6;">' + escapeHtml(res.message || (escapeHtml(res.size) + ' pode oferecer um caimento mais ajustado.<br/>' + escapeHtml(res.alternateSize) + ' pode oferecer mais conforto.')) + '</div>';
        } else {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">NÃO ENCONTRADO</div>';
          innerHtml += '<div style="font-size: 16px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 10px;">Não encontramos um tamanho adequado.</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.5;">' + escapeHtml(res.message || 'Confira suas medidas ou consulte a equipe da Zhaya.') + '</div>';
        }
      }

      innerHtml += '<div style="display: flex; gap: 10px; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px;">';
      innerHtml += '<button id="zhaya-recalc-btn" style="flex: 1 1 120px; min-height: 48px; background: transparent; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit;">' + escapeHtml(txt.recalculateButtonText || 'Calcular novamente') + '</button>';
      innerHtml += '<button id="zhaya-close-btn" style="flex: 1 1 120px; min-height: 48px; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; font-family: inherit;">' + escapeHtml(txt.closeButtonText || 'Concluir') + '</button>';
      innerHtml += '</div>';

      innerHtml += '</div>';
    }

    // STEP 4: Pesquisa de Feedback Pós-Recomendação
    else if (currentStep === 4) {
      var feedbackFormState = window.__zhayaFeedbackState || { adequacy: null, ease: null, comment: '' };
      var isSuccess = Boolean(window.__zhayaFeedbackSubmitted);

      innerHtml += '<div style="text-align: left; padding: 12px 8px; max-width: 440px; margin: 0 auto; box-sizing: border-box;">';
      innerHtml += '<div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">' +
        '<h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ' + escapeHtml(textColor) + '; margin: 0 0 4px 0;">Sua opinião é importante</h3>' +
        '<p style="font-size: 11px; color: ' + escapeHtml(secTextColor) + '; margin: 0;">Responda 2 perguntas rápidas para melhorar nossas recomendações</p>' +
      '</div>';

      if (isSuccess) {
        innerHtml += '<div style="padding: 32px 16px; text-align: center;">' +
          '<div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; margin-bottom: 12px;">✓</div>' +
          '<p style="font-size: 13px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin: 0;">Obrigado pelo seu feedback!</p>' +
        '</div>';
      } else {
        // Q1: Adequação
        innerHtml += '<div style="margin-bottom: 16px;">' +
          '<label style="display: block; font-size: 11px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 8px;">1. A recomendação pareceu adequada para você? <span style="color: #ef4444;">*</span></label>' +
          '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">';

        var opts = ['Sim', 'Não', 'Ainda não sei'];
        for (var oIdx = 0; oIdx < opts.length; oIdx++) {
          var optVal = opts[oIdx];
          var isSelOpt = feedbackFormState.adequacy === optVal;
          var optBtnStyle = isSelOpt
            ? 'background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: 1px solid ' + escapeHtml(btnColor) + ';'
            : 'background: rgba(255,255,255,0.04); color: ' + escapeHtml(textColor) + '; border: 1px solid rgba(255,255,255,0.12);';
          innerHtml += '<button type="button" class="zhaya-fb-adequacy-btn" data-val="' + escapeHtml(optVal) + '" style="' + optBtnStyle + ' padding: 8px 4px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit;">' + escapeHtml(optVal) + '</button>';
        }
        innerHtml += '</div></div>';

        // Q2: Facilidade
        innerHtml += '<div style="margin-bottom: 16px;">' +
          '<label style="display: block; font-size: 11px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 8px;">2. Foi fácil informar suas medidas? (1 a 5) <span style="color: #ef4444;">*</span></label>' +
          '<div style="display: flex; gap: 6px; justify-content: space-between;">';
        for (var rVal = 1; rVal <= 5; rVal++) {
          var isSelRate = feedbackFormState.ease === rVal;
          var rateBtnStyle = isSelRate
            ? 'background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: 1px solid ' + escapeHtml(btnColor) + ';'
            : 'background: rgba(255,255,255,0.04); color: ' + escapeHtml(textColor) + '; border: 1px solid rgba(255,255,255,0.12);';
          innerHtml += '<button type="button" class="zhaya-fb-ease-btn" data-val="' + rVal + '" style="' + rateBtnStyle + ' flex: 1; padding: 8px 0; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; text-align: center;">' + rVal + '</button>';
        }
        innerHtml += '</div>' +
        '<div style="display: flex; justify-content: space-between; font-size: 9px; color: ' + escapeHtml(secTextColor) + '; margin-top: 4px;"><span>Muito difícil</span><span>Muito fácil</span></div>' +
        '</div>';

        // Q3: Comentário
        innerHtml += '<div style="margin-bottom: 20px;">' +
          '<label style="display: block; font-size: 11px; font-weight: 500; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 6px;">3. Quer contar algo para a gente? <span style="opacity: 0.6;">(Opcional)</span></label>' +
          '<textarea id="zhaya-fb-comment" rows="2" placeholder="Sua sugestão ou comentário..." style="width: 100%; background: rgba(255,255,255,0.04); color: ' + escapeHtml(textColor) + '; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px 10px; font-size: 11px; font-family: inherit; box-sizing: border-box; resize: none; outline: none;">' + escapeHtml(feedbackFormState.comment || '') + '</textarea>' +
        '</div>';

        // Actions
        var canSubmit = Boolean(feedbackFormState.adequacy && feedbackFormState.ease);
        var submitOpacity = canSubmit ? '1' : '0.4';
        var submitCursor = canSubmit ? 'pointer' : 'not-allowed';

        innerHtml += '<div style="display: flex; flex-direction: column; gap: 8px;">' +
          '<button id="zhaya-fb-submit-btn" style="width: 100%; min-height: 44px; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: ' + submitOpacity + '; cursor: ' + submitCursor + '; transition: all 0.2s; font-family: inherit;">Enviar</button>' +
          '<button id="zhaya-fb-skip-btn" style="width: 100%; padding: 8px 0; background: transparent; color: ' + escapeHtml(secTextColor) + '; border: none; font-size: 11px; cursor: pointer; font-family: inherit;">Pular</button>' +
        '</div>';
      }

      innerHtml += '</div>';
    }

    // Modal Outer Box Wrapper
    var maxW = isDesktop ? desktopWidth : '100%';
    var cardStyle = isDesktop
      ? 'position: relative; width: 100%; max-width: ' + maxW + '; max-height: 90vh; overflow-y: auto; background: ' + escapeHtml(finalCardBg) + '; border: 1px solid rgba(255,255,255,0.08); border-radius: ' + (app.borderRadius || 24) + 'px; padding: ' + (app.paddingInternal || 32) + 'px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); box-sizing: border-box; font-family: &quot;Neue Einstellung&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;'
      : 'position: relative; width: 100%; max-width: 100%; max-height: none; overflow: visible; height: auto; margin: 0 auto; background: ' + escapeHtml(finalCardBg) + '; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 18px 16px max(20px, env(safe-area-inset-bottom, 20px)) 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); box-sizing: border-box; font-family: &quot;Neue Einstellung&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;';

    var cardHtml = '<div style="' + cardStyle + '">' + innerHtml + '</div>';

    overlay.innerHTML = cardHtml;
    bindModalEvents();
  }

  function calculateRecommendationLocal(productType, measurements) {
    return calculateRecommendation(productType, measurements);
  }

  function getWheelPickerConfig(key, productType) {
    var helps = (configData && configData.measurementHelps) || {};
    var h = helps[key] || {};
    var label = h.label || MEASUREMENT_LABELS[key] || key;
    var step = 0.5;

    var defaults = {
      bust: { min: 60, max: 150, def: 90 },
      waist: { min: 50, max: 140, def: 72 },
      hip: { min: 60, max: 160, def: 98 },
      shoulders: { min: 30, max: 60, def: 38 },
      thigh: { min: 35, max: 90, def: 54 },
      torsoLength: { min: 40, max: 90, def: 60 },
      footLength: { min: 15, max: 35, def: 24 },
      footWidth: { min: 5, max: 15, def: 9 }
    };

    var cfg = defaults[key] || { min: 10, max: 200, def: 70 };
    var minVal = cfg.min;
    var maxVal = cfg.max;
    var defVal = cfg.def;

    if (productType && productType.sizes && productType.sizes.length > 0) {
      var tableMins = [];
      var tableMaxs = [];
      for (var i = 0; i < productType.sizes.length; i++) {
        var s = productType.sizes[i];
        if (s.ranges && s.ranges[key]) {
          var r = s.ranges[key];
          var mn = parseNumber(r.min !== undefined ? r.min : r.value);
          var mx = parseNumber(r.max !== undefined ? r.max : r.value);
          if (mn !== null && mn > 0) tableMins.push(mn);
          if (mx !== null && mx > 0) tableMaxs.push(mx);
        }
      }
      if (tableMins.length > 0 && tableMaxs.length > 0) {
        var minFound = Math.min.apply(null, tableMins);
        var maxFound = Math.max.apply(null, tableMaxs);
        if (minFound > 0 && maxFound >= minFound) {
          minVal = Math.max(5, Math.floor(minFound - 10));
          maxVal = Math.ceil(maxFound + 10);
          defVal = Math.round(((minFound + maxFound) / 2) * 2) / 2;
        }
      }
    }

    return {
      key: key,
      label: label,
      step: step,
      min: minVal,
      max: maxVal,
      def: defVal
    };
  }

  function openWheelPickerSheet(key, rawCurrentValue) {
    var cfg = getWheelPickerConfig(key, selectedType);
    var parsedCurrent = parseNumber(rawCurrentValue);
    var startVal = (parsedCurrent !== null && parsedCurrent > 0) ? parsedCurrent : cfg.def;

    var options = [];
    for (var v = cfg.min; v <= cfg.max + 0.001; v += cfg.step) {
      var roundV = Math.round(v * 10) / 10;
      options.push({
        val: roundV,
        display: formatMeasurementDisplay(roundV)
      });
    }

    var selectedIdx = 0;
    var minDiff = 999999;
    for (var i = 0; i < options.length; i++) {
      var diff = Math.abs(options[i].val - startVal);
      if (diff < minDiff) {
        minDiff = diff;
        selectedIdx = i;
      }
    }

    var existingSheet = document.getElementById('zhaya-wheel-sheet-backdrop');
    if (existingSheet) existingSheet.remove();

    var backdrop = document.createElement('div');
    backdrop.id = 'zhaya-wheel-sheet-backdrop';
    backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000000; display: flex; flex-direction: column; justify-content: flex-end; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif; box-sizing: border-box; touch-action: none;';

    var sheetHtml = '<div id="zhaya-wheel-sheet-container" role="dialog" aria-modal="true" aria-label="Seletor de medida" style="background: #171717; border-top-left-radius: 20px; border-top-right-radius: 20px; border-top: 1px solid rgba(255,255,255,0.15); padding: 20px 20px max(24px, env(safe-area-inset-bottom, 24px)) 20px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 -10px 40px rgba(0,0,0,0.85); touch-action: auto;">' +
      '<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">' +
        '<div>' +
          '<h3 style="font-size: 16px; font-weight: 600; color: #ffffff; margin: 0;">' + escapeHtml(cfg.label) + '</h3>' +
          '<p style="font-size: 12px; color: #a3a3a3; margin: 2px 0 0 0;">Unidade em centímetros (cm)</p>' +
        '</div>' +
        '<button id="zhaya-wheel-close-x" aria-label="Cancelar" style="background: transparent; border: none; color: #a3a3a3; font-size: 20px; cursor: pointer; padding: 4px; line-height: 1;">✕</button>' +
      '</div>' +

      '<div style="position: relative; height: 210px; overflow: hidden; user-select: none;">' +
        '<div style="position: absolute; top: 84px; left: 0; right: 0; height: 42px; border-top: 1px solid rgba(255,255,255,0.25); border-bottom: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.06); pointer-events: none; border-radius: 8px;"></div>' +
        '<div id="zhaya-wheel-scroll-box" style="height: 100%; overflow-y: auto; scroll-snap-type: y mandatory; -webkit-overflow-scrolling: touch; padding: 84px 0; box-sizing: border-box; scrollbar-width: none; -ms-overflow-style: none;">' +
          options.map(function(opt, idx) {
            var isSel = idx === selectedIdx;
            return '<div class="zhaya-wheel-opt" data-idx="' + idx + '" style="height: 42px; display: flex; align-items: center; justify-content: center; font-size: ' + (isSel ? '20px' : '14px') + '; font-weight: ' + (isSel ? '700' : '400') + '; color: ' + (isSel ? '#ffffff' : '#737373') + '; opacity: ' + (isSel ? '1' : '0.45') + '; scroll-snap-align: center; cursor: pointer; transition: font-size 0.1s, color 0.1s, opacity 0.1s;">' +
              escapeHtml(opt.display) + ' cm' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div style="display: flex; gap: 12px; margin-top: 4px;">' +
        '<button id="zhaya-wheel-btn-cancel" style="flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ffffff; height: 48px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;">Cancelar</button>' +
        '<button id="zhaya-wheel-btn-confirm" style="flex: 1; background: #ffffff; border: none; color: #000000; height: 48px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;">Confirmar</button>' +
      '</div>' +
    '</div>';

    backdrop.innerHTML = sheetHtml;
    document.body.appendChild(backdrop);

    var scrollBox = document.getElementById('zhaya-wheel-scroll-box');
    if (scrollBox) {
      scrollBox.scrollTop = selectedIdx * 42;
    }

    var lastVibratedIdx = selectedIdx;

    function updateVisual(activeIdx) {
      if (activeIdx === selectedIdx) return;
      selectedIdx = activeIdx;
      var opts = backdrop.querySelectorAll('.zhaya-wheel-opt');
      opts.forEach(function(el, i) {
        var isSel = i === activeIdx;
        el.style.fontSize = isSel ? '20px' : '14px';
        el.style.fontWeight = isSel ? '700' : '400';
        el.style.color = isSel ? '#ffffff' : '#737373';
        el.style.opacity = isSel ? '1' : '0.45';
      });

      if (activeIdx !== lastVibratedIdx) {
        lastVibratedIdx = activeIdx;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!prefersReduced) {
            try { navigator.vibrate(5); } catch(e){}
          }
        }
      }
    }

    if (scrollBox) {
      scrollBox.onscroll = function() {
        var idx = Math.round(scrollBox.scrollTop / 42);
        idx = Math.max(0, Math.min(options.length - 1, idx));
        updateVisual(idx);
      };

      var optElements = backdrop.querySelectorAll('.zhaya-wheel-opt');
      optElements.forEach(function(opt) {
        opt.onclick = function() {
          var idx = parseInt(opt.getAttribute('data-idx') || '0', 10);
          scrollBox.scrollTo({ top: idx * 42, behavior: 'smooth' });
        };
      });
    }

    backdrop.ontouchmove = function(e) {
      if (scrollBox && scrollBox.contains(e.target)) {
        return;
      }
      e.preventDefault();
    };

    function closeSheet() {
      backdrop.remove();
      document.removeEventListener('keydown', handleSheetKeyDown);
    }

    function handleSheetKeyDown(e) {
      if (e.key === 'Escape') {
        closeSheet();
      }
    }
    document.addEventListener('keydown', handleSheetKeyDown);

    var cancelX = document.getElementById('zhaya-wheel-close-x');
    if (cancelX) cancelX.onclick = closeSheet;

    var btnCancel = document.getElementById('zhaya-wheel-btn-cancel');
    if (btnCancel) btnCancel.onclick = closeSheet;

    backdrop.onclick = function(e) {
      if (e.target === backdrop) closeSheet();
    };

    var btnConfirm = document.getElementById('zhaya-wheel-btn-confirm');
    if (btnConfirm) {
      btnConfirm.onclick = function() {
        if (!hasTrackedMeasurementsInSession) {
          hasTrackedMeasurementsInSession = true;
          sendWidgetAnalyticsEvent('measurements_started');
        }
        var confirmedOpt = options[selectedIdx];
        if (confirmedOpt) {
          var formattedVal = confirmedOpt.display;
          userMeasurements[key] = formattedVal;
          var targetInput = document.querySelector('.zhaya-input[data-key="' + key + '"]');
          if (targetInput) {
            targetInput.value = formattedVal;
          }
          var errEl = document.querySelector('.zhaya-error-msg[data-error-for="' + key + '"]');
          if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
          }
        }
        closeSheet();
      };
    }
  }

  function bindModalEvents() {
    var wheelBtns = document.querySelectorAll('.zhaya-wheel-btn');
    wheelBtns.forEach(function(btn) {
      btn.onclick = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        var k = btn.getAttribute('data-key');
        if (!k) return;
        var inp = document.querySelector('.zhaya-input[data-key="' + k + '"]');
        var currentVal = inp ? inp.value : (userMeasurements[k] || '');
        openWheelPickerSheet(k, currentVal);
      };
    });
    var closeX = document.getElementById('zhaya-close-x');
    if (closeX) closeX.onclick = closeModal;

    var closeBtn = document.getElementById('zhaya-close-btn');
    if (closeBtn) {
      closeBtn.onclick = function() {
        var enableFeedback = configData && configData.enableFeedbackSurvey !== false;
        if (enableFeedback) {
          currentStep = 4;
          renderModalContent();
        } else {
          closeModal();
        }
      };
    }

    if (currentStep === 4) {
      if (!hasTrackedFeedbackStartedInSession) {
        hasTrackedFeedbackStartedInSession = true;
        sendWidgetAnalyticsEvent('feedback_started', {
          productTypeId: selectedType ? selectedType.id : null,
          productTypeName: selectedType ? selectedType.name : null,
          productCategory: selectedType ? selectedType.category : null,
          recommendationStatus: (userMeasurements.__result || {}).status || null
        });
      }

      if (!window.__zhayaFeedbackState) {
        window.__zhayaFeedbackState = { adequacy: null, ease: null, comment: '' };
      }

      var adBtns = document.querySelectorAll('.zhaya-fb-adequacy-btn');
      adBtns.forEach(function(b) {
        b.onclick = function() {
          window.__zhayaFeedbackState.adequacy = b.getAttribute('data-val');
          renderModalContent();
        };
      });

      var easeBtns = document.querySelectorAll('.zhaya-fb-ease-btn');
      easeBtns.forEach(function(b) {
        b.onclick = function() {
          window.__zhayaFeedbackState.ease = parseInt(b.getAttribute('data-val'), 10);
          renderModalContent();
        };
      });

      var commentTa = document.getElementById('zhaya-fb-comment');
      if (commentTa) {
        commentTa.oninput = function() {
          window.__zhayaFeedbackState.comment = commentTa.value;
        };
      }

      var skipBtn = document.getElementById('zhaya-fb-skip-btn');
      if (skipBtn) {
        skipBtn.onclick = function() {
          sendWidgetAnalyticsEvent('feedback_skipped', {
            productTypeId: selectedType ? selectedType.id : null,
            productTypeName: selectedType ? selectedType.name : null,
            productCategory: selectedType ? selectedType.category : null,
            recommendationStatus: (userMeasurements.__result || {}).status || null
          });
          window.__zhayaFeedbackState = null;
          window.__zhayaFeedbackSubmitted = false;
          closeModal();
        };
      }

      var submitBtn = document.getElementById('zhaya-fb-submit-btn');
      if (submitBtn) {
        submitBtn.onclick = function() {
          var st = window.__zhayaFeedbackState;
          if (!st || !st.adequacy || !st.ease) return;

          sendWidgetAnalyticsEvent('feedback_submitted', {
            productTypeId: selectedType ? selectedType.id : null,
            productTypeName: selectedType ? selectedType.name : null,
            productCategory: selectedType ? selectedType.category : null,
            recommendationStatus: (userMeasurements.__result || {}).status || null
          });

          submitBtn.disabled = true;
          submitBtn.textContent = 'Enviando...';

          var isPreview = window.location.search.indexOf('zhaya-match-preview=1') !== -1;
          var res = userMeasurements.__result || {};

          var payload = {
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
            productTypeId: selectedType ? selectedType.id : null,
            recommendationStatus: res.status || null,
            recommendedSize: res.size || null,
            alternateSize: res.alternateSize || null,
            adequacyResponse: st.adequacy,
            easeRating: st.ease,
            comment: st.comment || null,
            configVersion: configData && configData.version ? configData.version : 1
          };

          if (!isPreview && typeof fetch !== 'undefined') {
            var apiUrl = (configData && configData.apiBaseUrl) ? configData.apiBaseUrl : '';
            fetch(apiUrl + '/api/public/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(function(err) {
              console.warn('[Zhaya Match] Falha ao enviar feedback:', err);
            });
          } else {
            console.log('[Zhaya Match Preview] Feedback simulado:', payload);
          }

          window.__zhayaFeedbackSubmitted = true;
          renderModalContent();

          setTimeout(function() {
            window.__zhayaFeedbackState = null;
            window.__zhayaFeedbackSubmitted = false;
            closeModal();
          }, 1000);
        };
      }
    }

    var startBtn = document.getElementById('zhaya-start-btn');
    if (startBtn) {
      startBtn.onclick = function() {
        sendWidgetAnalyticsEvent('flow_started');
        currentStep = 1;
        renderModalContent();
      };
    }

    var backBtnStep = document.getElementById('zhaya-back-btn-step');
    if (backBtnStep) {
      backBtnStep.onclick = function() {
        if (currentStep > 0) {
          currentStep = currentStep - 1;
          renderModalContent();
        }
      };
    }

    var backBtn0 = document.getElementById('zhaya-back-btn-step0');
    if (backBtn0) {
      backBtn0.onclick = function() {
        currentStep = 0;
        renderModalContent();
      };
    }

    var backBtn = document.getElementById('zhaya-back-btn');
    if (backBtn) {
      backBtn.onclick = function() {
        currentStep = 1;
        renderModalContent();
      };
    }

    // Type selection buttons
    var iconImgs = document.querySelectorAll('.zhaya-type-icon-img');
    iconImgs.forEach(function(img) {
      img.onerror = function() {
        img.style.display = 'none';
        var card = img.closest('.zhaya-type-card');
        if (card) {
          card.classList.remove('zhaya-icon-card');
          card.classList.add('zhaya-icon-fallback');
          card.style.background = 'rgba(255,255,255,0.06)';
          card.style.border = '1px solid rgba(255,255,255,0.12)';
          card.style.borderRadius = '8px';
          card.style.padding = '14px 10px';
          card.style.minHeight = '76px';
          card.style.aspectRatio = 'auto';
        }
      };
    });

    var iconCards = document.querySelectorAll('.zhaya-icon-card');
    iconCards.forEach(function(card) {
      card.onmouseover = function() {
        card.style.opacity = '1';
        card.style.transform = 'scale(1.04)';
      };
      card.onmouseout = function() {
        var tid = card.getAttribute('data-type-id');
        var isSelectedCard = selectedType && selectedType.id === tid;
        card.style.opacity = isSelectedCard ? '1' : '0.75';
        card.style.transform = isSelectedCard ? 'scale(1.05)' : 'scale(1)';
      };
    });

    var typeBtns = document.querySelectorAll('.zhaya-type-card');
    typeBtns.forEach(function(btn) {
      btn.onclick = function() {
        var tid = btn.getAttribute('data-type-id');
        var types = (configData && configData.productTypes) || [];
        for (var i = 0; i < types.length; i++) {
          if (types[i].id === tid) {
            selectedType = types[i];
            break;
          }
        }
        if (selectedType) {
          sendWidgetAnalyticsEvent('product_type_selected', {
            productTypeId: selectedType.id,
            productTypeName: selectedType.name,
            productCategory: selectedType.category
          });
        }
        userMeasurements = {};
        currentStep = 2;
        renderModalContent();
      };
    });

    // Inputs value binding
    var inputs = document.querySelectorAll('.zhaya-input');
    inputs.forEach(function(inp) {
      inp.oninput = function() {
        if (!hasTrackedMeasurementsInSession) {
          hasTrackedMeasurementsInSession = true;
          sendWidgetAnalyticsEvent('measurements_started');
        }
        var k = inp.getAttribute('data-key');
        var errEl = document.querySelector('.zhaya-error-msg[data-error-for="' + k + '"]');
        if (errEl) {
          errEl.style.display = 'none';
          errEl.textContent = '';
        }
        var rawVal = inp.value;
        if (rawVal !== undefined && rawVal !== null && rawVal.trim() !== '') {
          userMeasurements[k] = rawVal;
        } else {
          delete userMeasurements[k];
        }
      };
    });

    // Calculate button
    var calcBtn = document.getElementById('zhaya-calc-btn');
    if (calcBtn) {
      calcBtn.onclick = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!selectedType) return;

        var reqKeys = (selectedType.measurements && selectedType.measurements.length > 0)
          ? selectedType.measurements
          : [];

        var hasError = false;
        var firstErrorInput = null;

        // Clear all errors first
        reqKeys.forEach(function(k) {
          var errEl = document.querySelector('.zhaya-error-msg[data-error-for="' + k + '"]');
          if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
          }
        });

        for (var i = 0; i < reqKeys.length; i++) {
          var k = reqKeys[i];
          var inp = document.querySelector('.zhaya-input[data-key="' + k + '"]');
          var errEl = document.querySelector('.zhaya-error-msg[data-error-for="' + k + '"]');

          var rawVal = inp ? inp.value.trim() : '';
          var parsedNum = parseNumber(rawVal);

          var errorMsg = '';
          if (!rawVal) {
            errorMsg = 'Informe esta medida em cm.';
          } else if (parsedNum === null) {
            errorMsg = 'Digite um número válido maior que 0 (ex: 22,5 ou 94,5).';
          }

          if (errorMsg) {
            hasError = true;
            if (errEl) {
              errEl.textContent = errorMsg;
              errEl.style.display = 'block';
            }
            if (!firstErrorInput && inp) {
              firstErrorInput = inp;
            }
          } else {
            userMeasurements[k] = rawVal;
          }
        }

        if (hasError) {
          if (firstErrorInput) firstErrorInput.focus();
          return;
        }

        try {
          var isPreview = window.location.search.indexOf('zhaya-match-preview=1') !== -1;
          if (isPreview) console.log('[Zhaya Match] validação concluída');
          if (isPreview) console.log('[Zhaya Match] medidas normalizadas');
          if (isPreview) console.log('[Zhaya Match] cálculo iniciado');

          if (!hasTrackedProcessingStartedInSession) {
            hasTrackedProcessingStartedInSession = true;
            sendWidgetAnalyticsEvent('recommendation_processing_started', {
              productTypeId: selectedType ? selectedType.id : null,
              productTypeName: selectedType ? selectedType.name : null,
              productCategory: selectedType ? selectedType.category : null
            });
          }

          var result = calculateRecommendationLocal(selectedType, userMeasurements);
          if (isPreview) console.log('[Zhaya Match] resultado: ' + result.status);

          userMeasurements.__result = result;

          if (result.status === 'none' || result.status === 'not_found') {
            sendWidgetAnalyticsEvent('recommendation_not_found', {
              productTypeId: selectedType ? selectedType.id : null,
              productTypeName: selectedType ? selectedType.name : null,
              productCategory: selectedType ? selectedType.category : null,
              recommendationStatus: 'not_found'
            });
          } else {
            sendWidgetAnalyticsEvent('recommendation_generated', {
              productTypeId: selectedType ? selectedType.id : null,
              productTypeName: selectedType ? selectedType.name : null,
              productCategory: selectedType ? selectedType.category : null,
              recommendationStatus: result.status
            });
          }

          currentStep = 2.5;
          renderModalContent();

          if (loadingTimerId) clearTimeout(loadingTimerId);

          loadingTimerId = setTimeout(function() {
            loadingTimerId = null;
            currentStep = 3;
            renderModalContent();

            if (!hasTrackedResultViewedInSession) {
              hasTrackedResultViewedInSession = true;
              sendWidgetAnalyticsEvent('recommendation_result_viewed', {
                productTypeId: selectedType ? selectedType.id : null,
                productTypeName: selectedType ? selectedType.name : null,
                productCategory: selectedType ? selectedType.category : null,
                recommendationStatus: result.status === 'none' ? 'not_found' : result.status
              });
            }

            if (isPreview) console.log('[Zhaya Match] etapa final renderizada');
          }, 2000);
        } catch (err) {
          console.error('[Zhaya Match] Falha no cálculo', err);
        }
      };
    }

    var saberMaisBtn = document.getElementById('zhaya-saber-mais-btn');
    if (saberMaisBtn && selectedType) {
      saberMaisBtn.onclick = function() {
        sendWidgetAnalyticsEvent('measurement_help_opened');
        var card = document.querySelector('#zhaya-match-modal-overlay > div');
        if (!card) return;
        var helps = (configData && configData.measurementHelps) || {};
        var keys = selectedType.measurements || [];
        
        var modalOverlay = document.createElement('div');
        modalOverlay.id = 'zhaya-saber-mais-overlay';
        modalOverlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 100; display: flex; flex-direction: column; padding: 20px; border-radius: inherit; box-sizing: border-box; text-align: left; overflow-y: auto;';
        
        var overlayContent = '<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 14px;">' +
          '<div>' +
            '<h3 style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0;">Como Medir (' + escapeHtml(selectedType.name) + ')</h3>' +
            '<p style="font-size: 10px; color: #a3a3a3; margin: 2px 0 0 0;">Instruções passo a passo para precisão ideal</p>' +
          '</div>' +
          '<button id="close-saber-mais-sub" style="background: #262626; color: #ffffff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">Fechar ✕</button>' +
        '</div>' +
        '<div style="display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto;">';

        if (selectedType.measurementGuideTips && Array.isArray(selectedType.measurementGuideTips) && selectedType.measurementGuideTips.length > 0) {
          for (var tipIdx = 0; tipIdx < selectedType.measurementGuideTips.length; tipIdx++) {
            var tipItem = selectedType.measurementGuideTips[tipIdx];
            if (tipItem && (tipItem.title || tipItem.text)) {
              overlayContent += '<div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 6px;">' +
                (tipItem.title ? '<div style="font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 4px;">' + escapeHtml(tipItem.title) + '</div>' : '') +
                '<div style="font-size: 11px; color: #a3a3a3; line-height: 1.4;">' + escapeHtml(tipItem.text || '') + '</div>' +
              '</div>';
            }
          }
        } else {
          for (var m = 0; m < keys.length; m++) {
            var mk = keys[m];
            var h = helps[mk] || {};

            var obsHtml = '';
            if (h.observations && Array.isArray(h.observations)) {
              var validObs = h.observations.filter(function(obs) {
                if (!obs || obs.active === false || !obs.text || !obs.text.trim()) return false;
                if (obs.condition && obs.condition.type === 'always') return true;
                if (obs.condition && obs.condition.type === 'measurement_active' && obs.condition.measurementKey) {
                  return keys.indexOf(obs.condition.measurementKey) !== -1;
                }
                return false;
              }).sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

              for (var o = 0; o < validObs.length; o++) {
                obsHtml += '<div style="font-size: 10px; color: #a3a3a3; margin-top: 6px; padding: 6px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; line-height: 1.3;">' +
                  '<strong style="color: #ffffff;">Obs:</strong> ' + escapeHtml(validObs[o].text) +
                '</div>';
              }
            }

            overlayContent += '<div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 6px;">' +
              '<div style="font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 2px;">' + escapeHtml(h.label || mk) + '</div>' +
              '<div style="font-size: 11px; font-weight: 600; color: #d4d4d4; margin-bottom: 4px;">' + escapeHtml(h.title || ('Como medir ' + (h.label || mk))) + '</div>' +
              '<div style="font-size: 11px; color: #a3a3a3; line-height: 1.4;">' + escapeHtml(h.description || 'Posicione a fita métrica confortavelmente ao redor da área sem apertar em demasia.') + '</div>' +
              obsHtml +
            '</div>';
          }
        }

        if (selectedType.measurementGuideObservation) {
          overlayContent += '<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); padding: 10px 12px; border-radius: 6px; text-align: center; margin-top: 4px;">' +
            '<div style="font-size: 10px; font-weight: 800; color: #a3a3a3; text-transform: uppercase; tracking-wider; margin-bottom: 2px;">Dica</div>' +
            '<div style="font-size: 11px; font-weight: 600; color: #ffffff; line-height: 1.4;">' + escapeHtml(selectedType.measurementGuideObservation) + '</div>' +
          '</div>';
        }

        overlayContent += '</div>' +
          '<button id="close-saber-mais-sub-btn" style="width: 100%; background: #ffffff; color: #000000; border: none; padding: 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; margin-top: 14px;">Entendi, voltar às medidas</button>';

        modalOverlay.innerHTML = overlayContent;
        card.appendChild(modalOverlay);

        var closeSub = document.getElementById('close-saber-mais-sub');
        var closeSubBtn = document.getElementById('close-saber-mais-sub-btn');
        var dismiss = function() { modalOverlay.remove(); };
        if (closeSub) closeSub.onclick = dismiss;
        if (closeSubBtn) closeSubBtn.onclick = dismiss;
      };
    }

    var recalcBtn = document.getElementById('zhaya-recalc-btn');
    if (recalcBtn) {
      recalcBtn.onclick = function() {
        currentStep = 2;
        renderModalContent();
      };
    }
  }

  function applyPreviewConfigUpdate(payload) {
    if (!payload || !payload.config) return;
    configData = payload.config;
    isPreviewSessionActive = true;

    // Re-sync selectedType if present
    if (selectedType && selectedType.id) {
      var allTypes = (configData && configData.productTypes) || [];
      for (var tIdx = 0; tIdx < allTypes.length; tIdx++) {
        if (allTypes[tIdx].id === selectedType.id) {
          selectedType = allTypes[tIdx];
          break;
        }
      }
    }

    var target = findProductTargetElement();
    if (target) {
      renderTriggerButton(target);
    }
    var overlay = document.getElementById('zhaya-match-modal-overlay');
    if (overlay && overlay.style.display !== 'none') {
      renderModalContent();
    }

    try {
      if (window.parent && window.parent !== window) {
        var targetOrigin = (window.location && window.location.origin) ? window.location.origin : '*';
        window.parent.postMessage({
          type: 'ZHAYA_MATCH_PREVIEW_APPLIED',
          revision: payload.revision,
          sessionId: payload.sessionId
        }, targetOrigin);
      }
    } catch (e) {}
  }

  // Escuta de mensagens para preview em tempo real (Secure Preview Bridge)
  window.addEventListener('message', function(event) {
    if (!event.data) return;

    if (event.data.type === 'ZHAYA_MATCH_PREVIEW_PING') {
      sendPreviewReady();
    }

    if (event.data.type === 'ZHAYA_MATCH_PREVIEW_CONFIG_UPDATE') {
      applyPreviewConfigUpdate(event.data);
    }
  });

  // Escuta BroadcastChannel para sincronização em tempo real em abas separadas
  try {
    if (typeof window.BroadcastChannel !== 'undefined') {
      var bcChannel = new window.BroadcastChannel('zhaya-match-preview');
      bcChannel.onmessage = function(ev) {
        if (ev && ev.data && ev.data.type === 'ZHAYA_MATCH_PREVIEW_CONFIG_UPDATE') {
          applyPreviewConfigUpdate(ev.data);
        }
      };
    }
  } catch (e) {}

  // Fallback via evento storage
  window.addEventListener('storage', function(ev) {
    if (ev.key && ev.key.indexOf('zhaya_preview_snapshot_') === 0 && ev.newValue) {
      try {
        var snap = JSON.parse(ev.newValue);
        if (snap && snap.appearance) {
          applyPreviewConfigUpdate({ config: snap, revision: snap.revision, sessionId: snap.sessionId });
        }
      } catch (err) {}
    }
  });

  // Desinstalação e limpeza graciosa
  window.__zhayaMatchDestroy = function() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    removeTriggerButton();
    closeModal();
    window.__zhayaMatchLoaded = false;
    window.__ZHAYA_MATCH_LOADED__ = false;
  };

  // Auto boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initZhayaMatch);
  } else {
    initZhayaMatch();
  }
})();`;
}
