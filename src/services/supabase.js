/**
 * Supabase client — loaded lazily so the app stays small and works fully offline
 * when cloud sync is not configured.
 *
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are PUBLIC values (safe in the frontend):
 * row-level security in supabase/schema.sql makes every user see only their own rows.
 */
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const syncConfigured = Boolean(URL && ANON_KEY);

let clientPromise = null;

export function getSupabase() {
  if (!syncConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL, ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lifeos:auth' },
      }),
    );
  }
  return clientPromise;
}
