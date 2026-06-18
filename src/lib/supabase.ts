import { createClient } from "@supabase/supabase-js";

/**
 * Supabase dipakai HANYA untuk autentikasi (bukan database).
 * Nilai env dibersihkan & divalidasi supaya URL yang malformed
 * (mis. ada spasi / tanda kutip nyasar) tidak membuat app crash saat startup.
 */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function validUrl(value: string): string {
  try {
    return new URL(value).origin ? value : PLACEHOLDER_URL;
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      `[Herbaspace] VITE_SUPABASE_URL tidak valid: "${value}". Pakai placeholder sementara.`,
    );
    return PLACEHOLDER_URL;
  }
}

const rawUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const rawKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const url = validUrl(rawUrl || PLACEHOLDER_URL);
const key = rawKey || "placeholder-anon-key";

export const supabaseConfigured =
  Boolean(rawUrl) && Boolean(rawKey) && url !== PLACEHOLDER_URL;

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Herbaspace] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi/valid di .env — " +
      "login belum bisa dipakai. Lihat docs/SETUP.md bagian 5.",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
