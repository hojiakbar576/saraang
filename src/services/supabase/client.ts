import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the app should use Supabase. Only the public URL and the
 * publishable (anon) key are ever in the browser — the service-role key is
 * never used by the frontend. Set VITE_DATA_SOURCE=mock to force demo data.
 */
export const supabaseEnabled = Boolean(url && anonKey) && import.meta.env.VITE_DATA_SOURCE !== 'mock';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'store.admin.auth' },
  });
  return client;
}

export const supabaseConfig = { url: url ?? '', anonKey: anonKey ?? '' };

/** Extracts the machine-readable code raised by our SQL functions (e.g. "validation:phone"). */
export function errorCode(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return '';
  const msg = err.message ?? '';
  const m = /^(validation:[a-zA-Z]+|[a-z_]+)$/.exec(msg.trim());
  return m ? m[1] : err.code ?? msg;
}
