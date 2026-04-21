// Supabase client — single shared instance for the app.
//
// The URL + anon/publishable key are expected on import.meta.env at build
// time (Vite inlines VITE_* variables). They are safe to ship in the client
// bundle: row-level security policies on the Postgres side are what
// actually protect the data.
//
// If the env vars are missing we log a warning and export `null` so the rest
// of the app can fall back to pure-localStorage mode (useful in dev before
// credentials are wired up, and as a graceful degradation in production).

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: false, // no user auth yet — public workspace model
          autoRefreshToken: false,
        },
      })
    : null;

export const isSupabaseEnabled = Boolean(supabase);

if (!isSupabaseEnabled) {
  // eslint-disable-next-line no-console
  console.warn(
    '[solispark] Supabase env vars not set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Falling back to localStorage-only mode.'
  );
}
