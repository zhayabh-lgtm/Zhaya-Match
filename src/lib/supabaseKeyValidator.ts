import { createClient } from '@supabase/supabase-js';

export type KeyFormatType =
  | 'legacy_service_role'
  | 'secret_key'
  | 'invalid_anon'
  | 'invalid_publishable'
  | 'missing'
  | 'invalid_format';

export type KeyVerificationStatus =
  | 'legacy_service_role'
  | 'secret_key'
  | 'invalid_anon'
  | 'invalid_publishable'
  | 'missing'
  | 'invalid_format'
  | 'rejected'
  | 'unreachable';

export interface KeyValidationResult {
  detectedFormat: KeyFormatType;
  status: KeyVerificationStatus;
  isValid: boolean;
  message: string;
}

/**
 * Safely decodes base64 string in Node or Browser environments.
 */
function safeBase64Decode(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
  } catch {
    // Fallback to atob
  }
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return '';
  }
}

/**
 * Classifies a key purely based on format string without making network calls.
 */
export function classifyKeyFormat(key: string | undefined | null): KeyFormatType {
  if (!key || typeof key !== 'string' || !key.trim()) {
    return 'missing';
  }

  const cleanKey = key.trim();

  if (cleanKey.startsWith('sb_secret_')) {
    return 'secret_key';
  }

  if (cleanKey.startsWith('sb_publishable_')) {
    return 'invalid_publishable';
  }

  const parts = cleanKey.split('.');
  if (parts.length === 3) {
    try {
      const decodedPayload = safeBase64Decode(parts[1]);
      if (decodedPayload) {
        const payload = JSON.parse(decodedPayload);
        if (payload && typeof payload === 'object') {
          if (payload.role === 'service_role') {
            return 'legacy_service_role';
          }
          if (payload.role === 'anon') {
            return 'invalid_anon';
          }
        }
      }
    } catch {
      return 'invalid_format';
    }
  }

  return 'invalid_format';
}

/**
 * Checks if a service role key string passes structural requirements (legacy service_role or new sb_secret_).
 */
export function isValidServiceRoleKey(key: string | undefined | null): boolean {
  const format = classifyKeyFormat(key);
  return format === 'legacy_service_role' || format === 'secret_key';
}

/**
 * Performs a real server-side query check to Supabase using the key to verify DB permissions.
 */
export async function verifyServerSupabaseKey(
  supabaseUrl: string,
  key: string | undefined | null
): Promise<KeyValidationResult> {
  const detectedFormat = classifyKeyFormat(key);

  if (detectedFormat === 'missing') {
    return {
      detectedFormat: 'missing',
      status: 'missing',
      isValid: false,
      message: 'Chave SUPABASE_SERVICE_ROLE_KEY ausente nas variáveis de ambiente.',
    };
  }

  if (detectedFormat === 'invalid_anon') {
    return {
      detectedFormat: 'invalid_anon',
      status: 'invalid_anon',
      isValid: false,
      message: 'A chave fornecida é uma Anon Key (pública) e não possui privilégios de Service Role.',
    };
  }

  if (detectedFormat === 'invalid_publishable') {
    return {
      detectedFormat: 'invalid_publishable',
      status: 'invalid_publishable',
      isValid: false,
      message: 'A chave fornecida é uma Publishable Key e não pode ser usada no backend server-side.',
    };
  }

  if (detectedFormat === 'invalid_format') {
    return {
      detectedFormat: 'invalid_format',
      status: 'invalid_format',
      isValid: false,
      message: 'A chave fornecida possui formato inválido ou corrompido.',
    };
  }

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    return {
      detectedFormat,
      status: 'unreachable',
      isValid: false,
      message: 'URL do Supabase inválida ou ausente.',
    };
  }

  try {
    const supabase = createClient(supabaseUrl, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Real server-side query test to verify DB access
    const { data, error } = await supabase
      .from('app_settings')
      .select('version')
      .limit(1);

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (
        msg.includes('jwt') ||
        msg.includes('apikey') ||
        msg.includes('invalid') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        error.code === '42501' ||
        error.code === 'PGRST301'
      ) {
        return {
          detectedFormat,
          status: 'rejected',
          isValid: false,
          message: `Chave rejeitada pelo Supabase: ${error.message}`,
        };
      }

      return {
        detectedFormat,
        status: 'unreachable',
        isValid: false,
        message: `Falha na consulta ao banco Supabase: ${error.message}`,
      };
    }

    return {
      detectedFormat,
      status: detectedFormat,
      isValid: true,
      message:
        detectedFormat === 'legacy_service_role'
          ? 'Legacy Service Role JWT válida e com permissão server-side.'
          : 'Secret Key (sb_secret_) válida e com permissão server-side.',
    };
  } catch (err: any) {
    return {
      detectedFormat,
      status: 'unreachable',
      isValid: false,
      message: `Erro de conexão server-side com Supabase: ${err?.message || 'Falha desconhecida'}`,
    };
  }
}

/**
 * Validates Anon/Publishable key for client-side frontend access.
 */
export async function verifyFrontendSupabaseKey(
  supabaseUrl: string,
  anonKey: string | undefined | null
): Promise<{ isValid: boolean; format: string; message: string }> {
  if (!anonKey || !anonKey.trim()) {
    return { isValid: false, format: 'missing', message: 'Chave Anon/Publishable ausente no frontend.' };
  }

  const cleanKey = anonKey.trim();
  let format = 'unknown';

  if (cleanKey.startsWith('sb_publishable_')) {
    format = 'publishable_key';
  } else {
    const parts = cleanKey.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(safeBase64Decode(parts[1]));
        if (payload?.role === 'anon') format = 'legacy_anon';
        else if (payload?.role === 'service_role') format = 'service_role_misconfigured';
      } catch {
        format = 'invalid_jwt';
      }
    }
  }

  if (format === 'service_role_misconfigured') {
    return { isValid: false, format, message: 'ATENÇÃO: Service Role Key exposta no frontend como anon key!' };
  }

  if (!supabaseUrl) {
    return { isValid: false, format, message: 'URL do Supabase não configurada.' };
  }

  try {
    const client = createClient(supabaseUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await client.from('app_settings').select('id').limit(1);

    if (error && (error.code === 'PGRST301' || error.message.includes('apiKey'))) {
      return { isValid: false, format, message: `Chave pública rejeitada pelo Supabase: ${error.message}` };
    }

    return { isValid: true, format, message: 'Chave Anon/Publishable válida para leitura do frontend.' };
  } catch (err: any) {
    return { isValid: false, format, message: `Erro de comunicação com Supabase: ${err?.message || 'Erro'}` };
  }
}
