import { AnalyticsSummary, PeriodType } from '../types/zhaya';
import { normalizeAnalyticsSummary } from './analyticsNormalizer';
import { supabase } from './supabase';

export type AnalyticsErrorState = 'API_ERROR' | 'AUTH_ERROR' | 'CONFIG_ERROR' | null;

export interface FetchAnalyticsResult {
  summary: AnalyticsSummary | null;
  errorType: AnalyticsErrorState;
  errorMessage: string | null;
}

export async function fetchAdminAnalyticsApi(
  period: PeriodType = '7days',
  customStart?: string,
  customEnd?: string
): Promise<FetchAnalyticsResult> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('period', period);
    if (customStart) queryParams.set('from', customStart);
    if (customEnd) queryParams.set('to', customEnd);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (typeof window !== 'undefined') {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            headers['Authorization'] = `Bearer ${data.session.access_token}`;
          }
        }
      } catch {
        // Continue sem token do cliente supabase se falhar
      }

      if (!headers['Authorization']) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('auth-token') || key.startsWith('sb-'))) {
              const val = localStorage.getItem(key);
              if (val) {
                const parsed = JSON.parse(val);
                const token = parsed?.access_token || parsed?.currentSession?.access_token;
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
                  break;
                }
              }
            }
          }
        } catch {
          // Continue sem token de cabeçalho local se a leitura do localStorage falhar
        }
      }
    }

    const endpointUrl = `/api/admin/analytics?${queryParams.toString()}`;
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        summary: null,
        errorType: 'AUTH_ERROR',
        errorMessage: 'Acesso não autorizado. Você precisa de privilégios administrativos para visualizar o Analytics.',
      };
    }

    if (response.status === 503 || response.status === 400) {
      const errJson = await response.json().catch(() => ({}));
      if (errJson.error === 'CONFIG_ERROR' || errJson.error === 'MISSING_CONFIGURATION') {
        return {
          summary: null,
          errorType: 'CONFIG_ERROR',
          errorMessage: 'Erro de Configuração: O banco de dados do Analytics ou as chaves de acesso não estão configurados.',
        };
      }
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (errJson.error === 'CONFIG_ERROR') {
        return {
          summary: null,
          errorType: 'CONFIG_ERROR',
          errorMessage: 'Backend de Analytics não configurado corretamente.',
        };
      }

      return {
        summary: null,
        errorType: 'API_ERROR',
        errorMessage: `Erro ${response.status}: Não foi possível obter as métricas do servidor (${response.statusText || 'Falha na requisição'}).`,
      };
    }

    const json = await response.json();

    if (json && json.error === 'CONFIG_ERROR') {
      return {
        summary: null,
        errorType: 'CONFIG_ERROR',
        errorMessage: 'Erro de Configuração: Serviço de Analytics não inicializado no servidor.',
      };
    }

    if (json && json.error && json.error !== 'CONFIG_ERROR') {
      return {
        summary: null,
        errorType: 'API_ERROR',
        errorMessage: `Erro do servidor: ${json.error}`,
      };
    }

    const normalized = normalizeAnalyticsSummary(json, period);
    return {
      summary: normalized,
      errorType: null,
      errorMessage: null,
    };
  } catch (err: any) {
    console.error('[Admin Analytics Fetch Exception]:', err);
    return {
      summary: null,
      errorType: 'API_ERROR',
      errorMessage: 'Falha de conexão com o servidor de Analytics. Verifique sua rede e tente novamente.',
    };
  }
}
