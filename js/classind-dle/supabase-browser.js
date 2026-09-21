/**
 * Cliente Supabase anon só para Realtime (postgres_changes).
 * Mutações continuam em /api/classind.
 */

'use strict';

let createClientPromise = null;

async function loadCreateClient() {
  if (!createClientPromise) {
    createClientPromise = import('https://esm.sh/@supabase/supabase-js@2.112.4').then(
      (mod) => mod.createClient
    );
  }
  return createClientPromise;
}

/**
 * @param {{ url: string, anonKey: string }} config
 */
export async function createBrowserSupabase({ url, anonKey }) {
  if (!url || !anonKey) {
    throw new Error('Realtime indisponível: url/anonKey ausentes.');
  }
  const createClient = await loadCreateClient();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 8 },
    },
  });
}
