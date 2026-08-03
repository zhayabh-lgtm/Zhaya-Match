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

  var API_BASE = '${baseUrl}';
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

  function isDomainAllowed() {
    try {
      var hostname = (window.location.hostname || '').toLowerCase();
      var search = window.location.search || '';
      var isPreviewParam = search.indexOf('zhaya-match-preview=1') !== -1;

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
    try {
      var cached = getCachedConfig();
      var now = Date.now();

      if (cached && cached.data) {
        configData = cached.data;
        if (isDomainAllowed() && configData.enabled) {
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
    var btnText = app.buttonText || txt.buttonText || 'Descubra seu tamanho';

    var button = document.createElement('button');
    button.id = 'zhaya-match-trigger';
    button.type = 'button';
    
    var styleStr = 'display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s ease; margin: 12px 0; font-family: "Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif;';
    
    if (app.buttonStyle === 'text_only') {
      styleStr += ' background: transparent; color: #111111; border: none; text-decoration: underline; padding: 6px 0;';
      button.innerText = btnText;
    } else if (app.buttonStyle === 'icon_text') {
      styleStr += ' background: #111111; color: #ffffff; border: 1px solid #111111; border-radius: 4px; gap: 8px;';
      button.innerHTML = '✨ <span>' + escapeHtml(btnText) + '</span>';
    } else {
      styleStr += ' background: transparent; color: #111111; border: 1px solid #111111; border-radius: 4px;';
      button.innerText = btnText;
    }

    button.style.cssText = styleStr;

    if (app.buttonStyle !== 'text_only') {
      button.onmouseover = function() {
        button.style.background = '#111111';
        button.style.color = '#ffffff';
      };
      button.onmouseout = function() {
        button.style.background = 'transparent';
        button.style.color = '#111111';
      };
    }

    button.onclick = function(e) {
      e.preventDefault();
      openModal();
    };

    window.openZhayaMatchModal = openModal;

    if (target && target.parentNode) {
      target.parentNode.insertBefore(button, target.nextSibling);
    }
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

    function hexToRgba(hex, alpha) {
      hex = (hex || '#000000').replace('#', '');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      var r = parseInt(hex.substring(0,2), 16) || 0;
      var g = parseInt(hex.substring(2,4), 16) || 0;
      var b = parseInt(hex.substring(4,6), 16) || 0;
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
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
        logoHtml = '<img src="' + escapeHtml(app.logoWhiteUrl) + '" alt="Logo Zhaya" style="height: ' + (app.logoSize || 22) + 'px; object-fit: contain; max-width: 180px;" decoding="async" />';
      } else {
        logoHtml = '<div style="height: ' + (app.logoSize || 22) + 'px; width: 100px; background: rgba(255,255,255,0.08); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #737373; font-size: 9px; font-family: monospace;">LOGO ZHAYA</div>';
      }
    }

    innerHtml += '<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 16px; min-height: 32px;">' +
      '<div style="display: flex; align-items: center;">' +
        logoHtml +
      '</div>' +
      '<button id="zhaya-close-x" style="background: transparent; border: none; color: ' + escapeHtml(secTextColor) + '; font-size: 16px; cursor: pointer; padding: 4px; line-height: 1;">✕</button>' +
    '</div>';

    // STEP 0: Mensagem Inicial de Curadoria
    if (currentStep === 0) {
      innerHtml += '<div style="text-align: center; padding: 22px 12px; max-width: 440px; margin: 0 auto;">' +
        '<h2 style="font-size: 17px; font-weight: 800; color: ' + escapeHtml(textColor) + '; margin-bottom: 12px; letter-spacing: -0.01em;">' + escapeHtml(txt.initialTitle || 'Curadoria de Tamanho') + '</h2>' +
        '<p style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; line-height: 1.6; margin-bottom: 24px;">' + escapeHtml(txt.welcomeMessage || 'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.') + '</p>' +
        '<button id="zhaya-start-btn" style="width: 100%; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; padding: 13px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: opacity 0.2s;">' + escapeHtml(txt.welcomeButtonText || 'Iniciar Curadoria') + '</button>' +
      '</div>';
    }

    // STEP 1: Escolha da Categoria (Tipo de Produto)
    else if (currentStep === 1) {
      innerHtml += '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">' +
        '<button id="zhaya-back-btn-step0" style="background: transparent; border: none; color: ' + escapeHtml(secTextColor) + '; font-size: 11px; cursor: pointer;">← Voltar</button>' +
        '<span style="font-size: 10px; color: #525252; font-mono;">Etapa 1 de 2</span>' +
      '</div>';

      innerHtml += '<div style="text-align: center; margin-bottom: 18px;">' +
        '<h2 style="font-size: 14px; font-weight: 700; color: ' + escapeHtml(textColor) + '; margin-bottom: 4px;">' + escapeHtml(txt.typeChoiceTitle || 'Qual peça você deseja escolher?') + '</h2>' +
        '<p style="font-size: 11px; color: ' + escapeHtml(secTextColor) + ';">Selecione a categoria para avaliar o caimento exato.</p>' +
      '</div>';

      var gridCols = isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)';
      innerHtml += '<div style="display: grid; grid-template-columns: ' + gridCols + '; gap: 10px; max-height: 320px; overflow-y: auto; padding-right: 2px;">';

      for (var i = 0; i < types.length; i++) {
        var pt = types[i];
        var isSel = selectedType && selectedType.id === pt.id;
        innerHtml += '<button class="zhaya-type-card" data-type-id="' + escapeHtml(pt.id) + '" style="background: ' + (isSel ? '#ffffff' : '#0F0F0F') + '; color: ' + (isSel ? '#000000' : '#ffffff') + '; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 18px 12px; font-size: 13px; font-weight: 700; cursor: pointer; text-align: center; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 76px;">' +
          '<span style="letter-spacing: 0.02em;">' + escapeHtml(pt.name) + '</span>' +
        '</button>';
      }

      innerHtml += '</div>';
    }

    // STEP 2: Formulário de Medidas
    else if (currentStep === 2 && selectedType) {
      innerHtml += '<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 14px;">' +
        '<button id="zhaya-back-btn" style="background: transparent; border: none; color: ' + escapeHtml(secTextColor) + '; font-size: 11px; cursor: pointer;">← Alterar categoria</button>' +
        '<span style="font-size: 12px; font-weight: 700; color: ' + escapeHtml(textColor) + ';">' + escapeHtml(selectedType.name) + '</span>' +
      '</div>';

      var keys = selectedType.measurements || [];
      var typeNameLower = (selectedType.name || '').toLowerCase();
      var isFootwearType =
        typeNameLower.indexOf('sapato') !== -1 ||
        typeNameLower.indexOf('calçado') !== -1 ||
        typeNameLower.indexOf('calcado') !== -1 ||
        typeNameLower.indexOf('tenis') !== -1 ||
        typeNameLower.indexOf('tênis') !== -1 ||
        typeNameLower.indexOf('sapatilha') !== -1 ||
        typeNameLower.indexOf('sandalia') !== -1 ||
        typeNameLower.indexOf('sandália') !== -1 ||
        typeNameLower.indexOf('mocassim') !== -1 ||
        typeNameLower.indexOf('bota') !== -1 ||
        keys.indexOf('footLength') !== -1 ||
        keys.indexOf('footWidth') !== -1;

      var activeImgUrl = selectedType.measurementImageUrl ||
        (isFootwearType
          ? app.footwearMeasurementImageUrl
          : (app.apparelMeasurementImageUrl || app.mainMeasurementImageUrl));
      var activeCaption = selectedType.measurementImageCaption || app.mainMeasurementImageCaption || 'Guia explicativo das áreas corporais de medição.';

      var imgBlockHtml = '<div style="background: ' + escapeHtml(app.imageAreaBgColor || '#0A0A0A') + '; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; ' + (isDesktop ? 'height: 100%;' : 'min-height: 180px; max-height: 220px;') + '">' +
        '<div style="width: 100%; flex: 1; display: flex; align-items: center; justify-content: center; margin: 4px 0; overflow: hidden;">' +
          (activeImgUrl ? '<img src="' + escapeHtml(activeImgUrl) + '" style="max-height: 170px; width: 100%; object-fit: contain;" loading="lazy" />' : getFemaleSilhouetteSvg(selectedType)) +
        '</div>' +
        '<div style="width: 100%; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 6px;">' +
          (app.showMeasurementCaption !== false ? '<div style="font-size: 10px; color: ' + escapeHtml(secTextColor) + '; max-width: 90%;">' + escapeHtml(activeCaption) + '</div>' : '') +
          '<button id="zhaya-saber-mais-btn" type="button" style="background: #1A1A1A; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); padding: 7px 16px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; min-height: 36px; transition: all 0.2s;">Saber Mais</button>' +
        '</div>' +
      '</div>';

      var formBlockHtml = '<div style="display: flex; flex-direction: column; justify-content: space-between; gap: 12px; height: 100%;">' +
        '<div>' +
          '<h2 style="font-size: 13px; font-weight: 700; color: ' + escapeHtml(textColor) + '; margin-bottom: 10px;">Informe suas medidas</h2>' +
          '<div style="display: flex; flex-direction: column; gap: 10px;">';

      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        var h = helps[k] || { label: k };
        var val = userMeasurements[k] || '';

        formBlockHtml += '<div style="display: flex; flex-direction: column; gap: 4px;">' +
          '<label style="font-size: 11px; font-weight: 500; color: ' + escapeHtml(textColor) + ';">' + escapeHtml(h.label) + ' (cm)</label>' +
          '<input type="number" class="zhaya-input" data-key="' + escapeHtml(k) + '" value="' + escapeHtml(val) + '" placeholder="Digite a medida em cm" style="background: #0F0F0F; border: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 8px 10px; border-radius: 4px; font-size: 12px; outline: none;" />' +
        '</div>';
      }

      formBlockHtml += '</div>' +
        '</div>' +
        '<button id="zhaya-calc-btn" style="width: 100%; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; padding: 12px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; margin-top: 8px;">' + escapeHtml(txt.calculateButtonText || 'Descobrir meu tamanho') + '</button>' +
      '</div>';

      if (isDesktop) {
        innerHtml += '<div style="display: grid; grid-template-columns: 42% 55%; gap: 3%; min-height: 270px;">' +
          imgBlockHtml +
          formBlockHtml +
        '</div>';
      } else {
        innerHtml += '<div style="display: flex; flex-direction: column; gap: 14px;">' +
          imgBlockHtml +
          formBlockHtml +
        '</div>';
      }
    }

    // STEP 3: Resultado Simplificado e Elegante
    else if (currentStep === 3) {
      innerHtml += '<div style="text-align: center; padding: 12px 0;">';

      if (userMeasurements.__result) {
        var res = userMeasurements.__result;

        if (res.status === 'recommended' && res.size) {
          innerHtml += '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; font-mono; margin-bottom: 8px;">SEU TAMANHO RECOMENDADO</div>';
          innerHtml += '<div style="font-size: 58px; font-weight: 800; color: ' + escapeHtml(textColor) + '; line-height: 1; margin-bottom: 12px; letter-spacing: -0.02em;">' + escapeHtml(res.size) + '</div>';
          innerHtml += '<div style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 20px; line-height: 1.5; max-width: 320px; margin-left: auto; margin-right: auto;">' + escapeHtml(res.message ? res.message.replace(/nesta tabela/g, '').replace(/tabela/g, '') : 'Com base nas suas medidas, o tamanho ' + res.size + ' oferece o melhor caimento e conforto.') + '</div>';
        } else if (res.status === 'between_sizes') {
          innerHtml += '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; font-mono; margin-bottom: 8px;">VOCÊ ESTÁ ENTRE DOIS TAMANHOS</div>';
          innerHtml += '<div style="font-size: 48px; font-weight: 800; color: ' + escapeHtml(textColor) + '; line-height: 1; margin-bottom: 12px; letter-spacing: -0.02em;">' + escapeHtml(res.size) + ' / ' + escapeHtml(res.alternateSize || '') + '</div>';
          innerHtml += '<div style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 20px; line-height: 1.5; max-width: 320px; margin-left: auto; margin-right: auto;">' + escapeHtml(res.message ? res.message.replace(/nesta tabela/g, '').replace(/tabela/g, '') : 'O tamanho ' + res.size + ' ficará mais ajustado, enquanto o ' + res.alternateSize + ' será mais solto.') + '</div>';
        } else {
          innerHtml += '<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: ' + escapeHtml(secTextColor) + '; font-mono; margin-bottom: 8px;">PROPORÇÃO EXCLUSIVA</div>';
          innerHtml += '<div style="font-size: 12px; color: ' + escapeHtml(secTextColor) + '; margin-bottom: 20px; line-height: 1.5; max-width: 320px; margin-left: auto; margin-right: auto;">' + escapeHtml(res.message ? res.message.replace(/nesta tabela/g, '').replace(/tabela/g, '') : txt.notFoundMessage || 'Não foi possível recomendar um tamanho automaticamente com base nestas medidas.') + '</div>';
        }
      }

      innerHtml += '<div style="display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">';
      innerHtml += '<button id="zhaya-recalc-btn" style="flex: 1; background: #0F0F0F; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); padding: 11px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">' + escapeHtml(txt.recalculateButtonText || 'Calcular novamente') + '</button>';
      innerHtml += '<button id="zhaya-close-btn" style="flex: 1; background: ' + escapeHtml(btnColor) + '; color: ' + escapeHtml(btnTextColor) + '; border: none; padding: 11px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer;">' + escapeHtml(txt.closeButtonText || 'Concluir') + '</button>';
      innerHtml += '</div>';

      innerHtml += '</div>';
    }

    // Aviso de Privacidade
    innerHtml += '<div style="font-size: 10px; color: #525252; text-align: center; margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">' + escapeHtml(txt.privacyNotice || 'Suas medidas são utilizadas estritamente para esta recomendação.') + '</div>';

    // Modal Outer Box Wrapper
    var maxW = isDesktop ? desktopWidth : '380px';
    var cardHtml = '<div style="position: relative; width: 100%; max-width: ' + maxW + '; background: ' + escapeHtml(bg) + '; border: 1px solid rgba(255,255,255,0.1); border-radius: ' + borderRadius + '; padding: ' + (app.paddingInternal || 22) + 'px; box-shadow: 0 24px 48px rgba(0,0,0,0.85); box-sizing: border-box; font-family: \'Neue Einstellung\', \'Helvetica Neue\', Helvetica, Arial, sans-serif;">' + innerHtml + '</div>';

    overlay.innerHTML = cardHtml;
    bindModalEvents();
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
        currentStep = 2;
        renderModalContent();
      };
    });

    // Inputs value binding
    var inputs = document.querySelectorAll('.zhaya-input');
    inputs.forEach(function(inp) {
      inp.oninput = function() {
        var k = inp.getAttribute('data-key');
        var val = parseFloat(inp.value);
        if (!isNaN(val)) {
          userMeasurements[k] = val;
        } else {
          delete userMeasurements[k];
        }
      };
    });

    // Calculate button
    var calcBtn = document.getElementById('zhaya-calc-btn');
    if (calcBtn) {
      calcBtn.onclick = function() {
        if (!selectedType) return;

        fetch(API_BASE + '/api/public/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productTypeId: selectedType.id,
            userMeasurements: userMeasurements
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
          userMeasurements.__result = result;
          currentStep = 3;
          renderModalContent();
        })
        .catch(function(err) {
          console.warn('Calculation error:', err);
        });
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
