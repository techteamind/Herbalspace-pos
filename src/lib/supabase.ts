import { createClient } from "@supabase/supabase-js";

/**
 * Supabase dipakai HANYA untuk autentikasi (bukan database).
 * Database utama ada di Vercel Postgres dan diakses lewat /api.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
