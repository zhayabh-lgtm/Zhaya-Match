/**
 * Módulo de Analytics para o Zhaya Match
 * Gerencia identificadores anônimos, deduplicação no lado do cliente
 * e envio não-bloqueante de eventos respeitando a privacidade.
 */

export type AnalyticsEventName =
  | 'launcher_viewed'
  | 'launcher_clicked'
  | 'widget_opened'
  | 'flow_started'
  | 'product_type_selected'
  | 'measurements_started'
  | 'recommendation_generated'
  | 'recommendation_not_found'
  | 'measurement_help_opened'
  | 'widget_closed';

export interface AnalyticsEventPayload {
  eventId: string;
  eventName: AnalyticsEventName;
  visitorId?: string;
  sessionId: string;
  productTypeId?: string;
  productTypeName?: string;
  productCategory?: string;
  recommendationStatus?: 'recommended' | 'between_sizes' | 'not_found';
  sourceDomain?: string;
  pagePath?: string;
  deviceType?: 'mobile' | 'desktop';
  configVersion?: number;
  metadata?: Record<string, any>;
}

// Chaves de armazenamento anônimo
const VISITOR_ID_KEY = 'zhaya_match_visitor_id';
const SESSION_ID_KEY = 'zhaya_match_session_id';

// Identificadores em memória caso o armazenamento do navegador esteja desabilitado
let memoryVisitorId: string | null = null;
let memorySessionId: string | null = null;

/**
 * Gera um UUID v4 anônimo compatível
 */

/**
 * Gera um UUID v4 anônimo
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Obtém ou cria um Visitor ID anônimo persistente no localStorage
 */
export function getVisitorId(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      let vid = localStorage.getItem(VISITOR_ID_KEY);
      if (!vid || !/^[0-9a-fA-F-]{36}$/.test(vid)) {
        vid = generateUUID();
        localStorage.setItem(VISITOR_ID_KEY, vid);
      }
      return vid;
    }
  } catch (e) {
    // LocalStorage indisponível (modo privado ou restrito)
  }
  if (!memoryVisitorId) {
    memoryVisitorId = generateUUID();
  }
  return memoryVisitorId;
}

/**
 * Obtém ou cria um Session ID anônimo por sessão no sessionStorage
 */
export function getSessionId(): string {
  try {
    if (typeof sessionStorage !== 'undefined') {
      let sid = sessionStorage.getItem(SESSION_ID_KEY);
      if (!sid || !/^[0-9a-fA-F-]{36}$/.test(sid)) {
        sid = generateUUID();
        sessionStorage.setItem(SESSION_ID_KEY, sid);
      }
      return sid;
    }
  } catch (e) {
    // SessionStorage indisponível
  }
  if (!memorySessionId) {
    memorySessionId = generateUUID();
  }
  return memorySessionId;
}

/**
 * Detecta o tipo de dispositivo (mobile ou desktop)
 */
export function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth || 1024;
  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUa = /mobile|iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua);
  return width < 768 || isMobileUa ? 'mobile' : 'desktop';
}

/**
 * Sanitiza e extrai o caminho da página sem parâmetros de URL (query strings privados)
 */
export function getCleanPagePath(): string {
  if (typeof window === 'undefined' || !window.location) return '/';
  return window.location.pathname || '/';
}

/**
 * Extrai o domínio de origem limpo sem protocolo ou porta
 */
export function getCleanSourceDomain(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  return window.location.hostname || '';
}

export interface TrackOptions {
  productTypeId?: string;
  productTypeName?: string;
  productCategory?: string;
  recommendationStatus?: 'recommended' | 'between_sizes' | 'not_found';
  configVersion?: number;
  isPreview?: boolean;
  apiBase?: string;
}

/**
 * Envia um evento de Analytics de forma assíncrona e não-bloqueante
 */
export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  options: TrackOptions = {}
): void {
  try {
    const isPreviewEnv =
      options.isPreview ||
      (typeof window !== 'undefined' &&
        (Boolean((window as any).__ZHAYA_MATCH_ADMIN_PREVIEW__) ||
          window.location.search.includes('admin_preview=1') ||
          window.location.search.includes('zhaya-match-preview=1')));

    if (isPreviewEnv) {
      return; // Skip sending events during admin preview
    }

    const payload: AnalyticsEventPayload = {
      eventId: generateUUID(),
      eventName,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      productTypeId: options.productTypeId,
      productTypeName: options.productTypeName,
      productCategory: options.productCategory,
      recommendationStatus: options.recommendationStatus,
      sourceDomain: getCleanSourceDomain(),
      pagePath: getCleanPagePath(),
      deviceType: getDeviceType(),
      configVersion: options.configVersion || 1,
      metadata: options.isPreview ? { preview: true } : {},
    };

    const baseUrl = options.apiBase || '';
    const endpoint = `${baseUrl}/api/public/analytics`;
    const bodyStr = JSON.stringify(payload);

    // Tenta enviar via sendBeacon se disponível (não-bloqueante)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([bodyStr], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (sent) return;
      } catch (e) {
        // Fallback para fetch em caso de erro no sendBeacon
      }
    }

    // Fallback com fetch não-bloqueante
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        keepalive: true,
      }).catch(() => {
        // Silencia erros no envio para não afetar o usuário
      });
    }
  } catch (err) {
    // Erros de analytics não devem interromper o fluxo do aplicativo
  }
}
