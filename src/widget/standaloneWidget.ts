/**
 * Standalone Vanilla JS Widget Generator for Zhaya Match
 * Injected into store pages via GTM or direct script tag.
 * Fully resilient, cached, domain-secured, and compliant for Olist / Vercel.
 */

export function generateWidgetScript(baseUrl: string): string {
  return `(function() {
  if (window.__zhayaMatchLoaded || window.__ZHAYA_MATCH_LOADED__) return;
  window.__zhayaMatchLoaded = true;
  window.__ZHAYA_MATCH_LOADED__ = true;

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
  var CACHE_KEY = '__ZHAYA_MATCH_CONFIG_CACHE_V2__';
  var CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos
  var configData = null;
  var selectedType = null;
  var userMeasurements = {};
  var currentStep = 0; // 0: Welcome, 1: Choose Type, 2: Measurements, 3: Result
  var observer = null;
  var injectAttempts = 0;
  var MAX_INJECT_ATTEMPTS = 15;

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
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e) {}
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

  function initZhayaMatch() {
    sendPreviewReady();
    try {
      var cached = getCachedConfig();
      var now = Date.now();

      if (cached && cached.data) {
        configData = cached.data;
        if (isDomainAllowed() && configData.enabled !== false) {
          startInjection();
        }
        // Atualização em segundo plano caso o cache tenha passado da TTL
        if (now - cached.timestamp > CACHE_TTL_MS) {
          fetchConfigFromNetwork(true);
        }
      } else {
        fetchConfigFromNetwork(false);
      }
    } catch (err) {
      // Falha silenciosa para não afetar o site
    }
  }

  function fetchConfigFromNetwork(isBackground) {
    fetch(API_BASE + '/api/public/config')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data) return;
        var prevVersion = configData ? configData.version : null;
        configData = data;
        setCachedConfig(data);

        if (!isDomainAllowed() || !data.enabled) {
          removeTriggerButton();
          return;
        }

        if (!isBackground || prevVersion !== data.version) {
          startInjection();
        }
      })
      .catch(function(err) {
        // Contingência: Se falhou a rede mas já havia config carregada do cache, mantemos
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
      openModal();
    };

    window.openZhayaMatchModal = openModal;

    if (target && target.parentNode) {
      target.parentNode.insertBefore(button, target.nextSibling);
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
    currentStep = 0;
    selectedType = null;
    userMeasurements = {};

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

    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: ' + bgOverlayStr + '; z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; backdrop-filter: blur(' + blurVal + '); -webkit-backdrop-filter: blur(' + blurVal + '); font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif;';

    if (app.closeOnClickOutside !== false) {
      overlay.onclick = function(e) {
        if (e.target === overlay) closeModal();
      };
    }

    document.addEventListener('keydown', handleKeyDown);
    renderModalContent();
  }

  function closeModal() {
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
      if (allTypes[tIdx].active !== false) {
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
        '<h2 style="font-size: 18px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 6px; letter-spacing: -0.01em;">' + escapeHtml(txt.typeChoiceTitle || 'O que você está escolhendo?') + '</h2>' +
        '<p style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin: 0;">Selecione a categoria da peça.</p>' +
      '</div>';

      var gridCols = isDesktop ? (types.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)') : 'repeat(2, 1fr)';
      innerHtml += '<div style="display: grid; grid-template-columns: ' + gridCols + '; gap: 12px; max-width: 640px; margin: 0 auto; max-height: 380px; overflow-y: auto; padding: 2px;">';

      for (var i = 0; i < types.length; i++) {
        var pt = types[i];
        var isSel = selectedType && selectedType.id === pt.id;
        var useIcon = (pt.useIconInSelector || pt.use_icon_in_selector) && (pt.iconUrl || pt.icon_url);
        var iconSrc = pt.iconUrl || pt.icon_url;
        var hasImg = pt.imageUrl || pt.image_url;

        var visualBlock = '';
        if (useIcon) {
          visualBlock = '<div style="width: 36px; height: 36px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center;"><img src="' + escapeHtml(iconSrc) + '" alt="' + escapeHtml(pt.name) + '" style="width: 100%; height: 100%; object-fit: contain;" loading="lazy" /></div>';
        } else if (hasImg) {
          visualBlock = '<img src="' + escapeHtml(hasImg) + '" style="width: 100%; height: 75px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;" loading="lazy" />';
        }

        innerHtml += '<button class="zhaya-type-card" data-type-id="' + escapeHtml(pt.id) + '" style="background: ' + (isSel ? '#ffffff' : 'rgba(255,255,255,0.04)') + '; color: ' + (isSel ? '#000000' : '#ffffff') + '; border: 1px solid ' + (isSel ? '#ffffff' : 'rgba(255,255,255,0.08)') + '; border-radius: 12px; padding: 16px; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: ' + (useIcon || hasImg ? '110px' : '84px') + '; font-family: inherit;">' +
          visualBlock +
          '<span>' + escapeHtml(pt.name) + '</span>' +
        '</button>';
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

if (measurementGroup === 'footwear') {
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
  : Math.max(
      240,
      Number(
        app.mobileImageHeight !== undefined
          ? app.mobileImageHeight
          : 260
      )
    );

var imageBlockMinHeight = isDesktop
  ? 400
  : imageDisplayHeight + 90;

var imgBlockHtml =
  '<div style="' +
    'background: ' + escapeHtml(app.imageAreaBgColor || 'rgba(255,255,255,0.03)') + ';' +
    'border-radius: ' + (app.imageBorderRadius !== undefined ? app.imageBorderRadius : 12) + 'px;' +
    'padding: 8px;' +
    'display: flex;' +
    'flex-direction: column;' +
    'align-items: center;' +
    'justify-content: space-between;' +
    'width: 100%;' +
    'min-height: ' + imageBlockMinHeight + 'px;' +
    'box-sizing: border-box;' +
  '">' +

    '<div style="' +
      'width: 100%;' +
      'height: ' + imageDisplayHeight + 'px;' +
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
                'height: 100%;' +
                'max-width: 100%;' +
                'max-height: none;' +
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
      'padding-top: 10px;' +
      'display: flex;' +
      'flex-direction: column;' +
      'align-items: center;' +
      'gap: 8px;' +
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
          'padding: 6px 12px;' +
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
          '<div style="position: relative; display: flex; align-items: center;">' +
            '<input type="text" inputmode="decimal" class="zhaya-input" data-key="' + escapeHtml(k) + '" value="' + escapeHtml(val) + '" placeholder="Digite a medida em cm" style="width: 100%; background: #0F0F0F; border: 1px solid rgba(255,255,255,0.12); color: #ffffff; padding: 12px 14px; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s; font-family: inherit; box-sizing: border-box;" />' +
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

    // STEP 3: Resultado
    else if (currentStep === 3) {
      innerHtml += '<div style="text-align: center; padding: 20px 8px 12px; max-width: 440px; margin: 0 auto;">';

      if (userMeasurements.__result) {
        var res = userMeasurements.__result;

        if (res.status === 'recommended' && res.size) {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">SEU TAMANHO SUGERIDO</div>';
          innerHtml += '<div style="font-size: 64px; font-weight: 700; color: ' + escapeHtml(textColor) + '; line-height: 1; margin-bottom: 16px; letter-spacing: -0.02em;">' + escapeHtml(res.size) + '</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.5;">Este tamanho apresenta a melhor correspondência com as medidas informadas.</div>';
        } else if (res.status === 'between_sizes' && res.size && res.alternateSize) {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">VOCÊ ESTÁ ENTRE</div>';
          innerHtml += '<div style="font-size: 48px; font-weight: 700; color: ' + escapeHtml(textColor) + '; line-height: 1; margin-bottom: 16px; letter-spacing: -0.02em;">' + escapeHtml(res.size) + ' e ' + escapeHtml(res.alternateSize) + '</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.6;">' + escapeHtml(res.size) + ' pode oferecer um caimento mais ajustado.<br/>' + escapeHtml(res.alternateSize) + ' pode oferecer mais conforto.</div>';
        } else {
          innerHtml += '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 12px; font-weight: 500;">NÃO ENCONTRADO</div>';
          innerHtml += '<div style="font-size: 16px; font-weight: 600; color: ' + escapeHtml(textColor) + '; margin-bottom: 10px;">Não encontramos um tamanho adequado.</div>';
          innerHtml += '<div style="font-size: 13px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 28px; line-height: 1.5;">Confira suas medidas ou consulte a equipe da Zhaya.</div>';
        }
      }

      innerHtml += '<div style="display: flex; gap: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">';
      innerHtml += '<button id="zhaya-recalc-btn" style="flex: 1; background: transparent; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); height: 48px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit;">' + escapeHtml(txt.recalculateButtonText || 'Calcular novamente') + '</button>';
      innerHtml += '<button id="zhaya-close-btn" style="flex: 1; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; height: 48px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; font-family: inherit;">' + escapeHtml(txt.closeButtonText || 'Fechar') + '</button>';
      innerHtml += '</div>';

      innerHtml += '</div>';
    }

    // Modal Outer Box Wrapper
    var maxW = isDesktop ? desktopWidth : 'calc(100vw - 24px)';
    var cardHtml = '<div style="position: relative; width: 100%; max-width: ' + maxW + '; max-height: 90vh; overflow-y: auto; background: ' + escapeHtml(finalCardBg) + '; border: 1px solid rgba(255,255,255,0.08); border-radius: ' + (isDesktop ? (app.borderRadius || 24) : 20) + 'px; padding: ' + (isDesktop ? (app.paddingInternal || 32) : 22) + 'px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); box-sizing: border-box; font-family: &quot;Neue Einstellung&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif;">' + innerHtml + '</div>';

    overlay.innerHTML = cardHtml;
    bindModalEvents();
  }

  function calculateRecommendationLocal(productType, measurements) {
    if (!productType || !productType.sizes || productType.sizes.length === 0) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.'
      };
    }

    var keys = (productType.measurements && productType.measurements.length > 0)
      ? productType.measurements
      : ['bust', 'waist', 'hip', 'shoulders', 'thigh', 'torsoLength', 'footLength', 'footWidth'];

    var activeMeasurements = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = measurements[k];
      if (val !== undefined && val !== null && !isNaN(val) && val > 0) {
        activeMeasurements.push({ key: k, val: Number(val) });
      }
    }

    if (activeMeasurements.length === 0) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.'
      };
    }

    var sortedSizes = productType.sizes.slice().sort(function(a, b) { return a.order - b.order; });

    function getRefValue(range) {
      if (!range) return null;
      if (range.value !== undefined && !isNaN(range.value) && range.value > 0) return range.value;
      if (range.min !== undefined && range.max !== undefined && !isNaN(range.min) && !isNaN(range.max)) {
        return (range.min + range.max) / 2;
      }
      if (range.min !== undefined && !isNaN(range.min) && range.min > 0) return range.min;
      if (range.max !== undefined && !isNaN(range.max) && range.max > 0) return range.max;
      return null;
    }

    var matchedSizeIndexes = [];

    for (var j = 0; j < activeMeasurements.length; j++) {
      var item = activeMeasurements[j];
      var mk = item.key;
      var val = item.val;

      var refValues = [];
      for (var sIdx = 0; sIdx < sortedSizes.length; sIdx++) {
        var sRow = sortedSizes[sIdx];
        var range = sRow.ranges ? sRow.ranges[mk] : undefined;
        var ref = getRefValue(range);
        if (ref !== null && !isNaN(ref)) {
          refValues.push({
            index: sIdx,
            ref: ref,
            min: range ? range.min : undefined,
            max: range ? range.max : undefined
          });
        }
      }

      if (refValues.length === 0) continue;

      var minRef = refValues[0].min !== undefined ? refValues[0].min : refValues[0].ref;
      var maxRef = refValues[refValues.length - 1].max !== undefined ? refValues[refValues.length - 1].max : refValues[refValues.length - 1].ref;

      if (val < minRef - 8 || val > maxRef + 10) {
        return {
          size: null,
          status: 'not_found',
          message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.'
        };
      }

      var directMatchIdx = -1;
      for (var rIdx = 0; rIdx < refValues.length; rIdx++) {
        var rv = refValues[rIdx];
        if (rv.min !== undefined && rv.max !== undefined && val >= rv.min && val <= rv.max) {
          directMatchIdx = rv.index;
          break;
        }
      }

      if (directMatchIdx !== -1) {
        matchedSizeIndexes.push(directMatchIdx);
        continue;
      }

      var closestIdx = refValues[0].index;
      var minDiff = Math.abs(val - refValues[0].ref);
      for (var cIdx = 1; cIdx < refValues.length; cIdx++) {
        var diff = Math.abs(val - refValues[cIdx].ref);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = refValues[cIdx].index;
        }
      }

      matchedSizeIndexes.push(closestIdx);
    }

    if (matchedSizeIndexes.length === 0) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.'
      };
    }

    var minIdx = Math.min.apply(null, matchedSizeIndexes);
    var maxIdx = Math.max.apply(null, matchedSizeIndexes);
    var indexDiff = maxIdx - minIdx;

    if (indexDiff === 0) {
      var sizeLabel = sortedSizes[minIdx].label || sortedSizes[minIdx].name || 'Padrão';
      return {
        size: sizeLabel,
        status: 'recommended',
        message: 'Este tamanho apresenta a melhor correspondência com as medidas informadas.'
      };
    }

    if (indexDiff === 1) {
      var lowerLabel = sortedSizes[minIdx].label || sortedSizes[minIdx].name;
      var upperLabel = sortedSizes[maxIdx].label || sortedSizes[maxIdx].name;
      return {
        size: lowerLabel,
        alternateSize: upperLabel,
        status: 'between_sizes',
        message: 'Você está entre ' + lowerLabel + ' e ' + upperLabel + '. ' + lowerLabel + ' pode ficar mais ajustado, enquanto ' + upperLabel + ' pode oferecer mais conforto.'
      };
    }

    return {
      size: null,
      status: 'not_found',
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.'
    };
  }

  function bindModalEvents() {
    var closeX = document.getElementById('zhaya-close-x');
    if (closeX) closeX.onclick = closeModal;

    var closeBtn = document.getElementById('zhaya-close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;

    var startBtn = document.getElementById('zhaya-start-btn');
    if (startBtn) {
      startBtn.onclick = function() {
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
        userMeasurements = {};
        currentStep = 2;
        renderModalContent();
      };
    });

    // Inputs value binding
    var inputs = document.querySelectorAll('.zhaya-input');
    inputs.forEach(function(inp) {
      inp.oninput = function() {
        var k = inp.getAttribute('data-key');
        var errEl = document.querySelector('.zhaya-error-msg[data-error-for="' + k + '"]');
        if (errEl) {
          errEl.style.display = 'none';
          errEl.textContent = '';
        }
        var rawVal = inp.value ? inp.value.trim().replace(',', '.') : '';
        var val = parseFloat(rawVal);
        if (!isNaN(val) && val > 0) {
          userMeasurements[k] = val;
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
          var numStr = rawVal.replace(',', '.');
          var num = parseFloat(numStr);

          var errorMsg = '';
          if (!rawVal) {
            errorMsg = 'Informe esta medida.';
          } else if (isNaN(num)) {
            errorMsg = 'Digite uma medida válida.';
          } else if (num <= 0) {
            errorMsg = 'A medida deve ser maior que zero.';
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
            userMeasurements[k] = num;
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

          var result = calculateRecommendationLocal(selectedType, userMeasurements);
          if (isPreview) console.log('[Zhaya Match] resultado: ' + result.status);

          userMeasurements.__result = result;
          currentStep = 3;
          renderModalContent();
          if (isPreview) console.log('[Zhaya Match] etapa final renderizada');
        } catch (err) {
          console.error('[Zhaya Match] Falha no cálculo', err);
        }
      };
    }

    var saberMaisBtn = document.getElementById('zhaya-saber-mais-btn');
    if (saberMaisBtn && selectedType) {
      saberMaisBtn.onclick = function() {
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

        for (var m = 0; m < keys.length; m++) {
          var mk = keys[m];
          var h = helps[mk] || {};
          overlayContent += '<div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 6px;">' +
            '<div style="font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 2px;">' + escapeHtml(h.label || mk) + '</div>' +
            '<div style="font-size: 11px; font-weight: 600; color: #d4d4d4; margin-bottom: 4px;">' + escapeHtml(h.title || ('Como medir ' + (h.label || mk))) + '</div>' +
            '<div style="font-size: 11px; color: #a3a3a3; line-height: 1.4;">' + escapeHtml(h.description || 'Posicione a fita métrica confortavelmente ao redor da área sem apertar em demasia.') + '</div>' +
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

  // Escuta de mensagens para preview em tempo real (Secure Preview Bridge)
  window.addEventListener('message', function(event) {
    if (!event.data) return;

    if (event.data.type === 'ZHAYA_MATCH_PREVIEW_PING') {
      sendPreviewReady();
    }

    if (event.data.type === 'ZHAYA_MATCH_PREVIEW_CONFIG_UPDATE') {
      if (event.data.config) {
        configData = event.data.config;

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
              revision: event.data.revision,
              sessionId: event.data.sessionId
            }, targetOrigin);
          }
        } catch (e) {}
      }
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
