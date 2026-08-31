import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_KEY not set in env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // Use the server-side client defaults
  global: { headers: { 'x-client-info': 'fundamentos-de-jogos-digitais/1.0' } },
});

export default supabase;
