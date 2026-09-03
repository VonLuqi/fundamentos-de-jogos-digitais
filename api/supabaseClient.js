import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (!isConfigured) {
  console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_KEY not set in env; running in local/offline mode.');
}

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { 'x-client-info': 'fundamentos-de-jogos-digitais/1.0' } },
    })
  : null;

export function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

export default supabase;
