import { createClient } from '@supabase/supabase-js';

export interface VerifyAdminResult {
  authorized: boolean;
  error?: string;
  user?: any;
}

/**
 * Verifies if an incoming HTTP request has a valid Supabase authentication token
 * representing an authenticated admin user.
 */
export async function verifyAdminAuth(req: any): Promise<VerifyAdminResult> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const keyToUse = serviceKey || anonKey;

  // If Supabase credentials are not configured in the environment,
  // allow fallback in local development/mock mode.
  if (!url || !keyToUse) {
    return { authorized: true };
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: 'MISSING_AUTHORIZATION_HEADER',
    };
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return {
      authorized: false,
      error: 'INVALID_TOKEN',
    };
  }

  try {
    const authClient = createClient(url, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data.user) {
      return {
        authorized: false,
        error: 'UNAUTHORIZED',
      };
    }

    return {
      authorized: true,
      user: data.user,
    };
  } catch (err) {
    console.error('[Admin Auth Verification Exception]:', err);
    return {
      authorized: false,
      error: 'AUTHENTICATION_FAILED',
    };
  }
}
